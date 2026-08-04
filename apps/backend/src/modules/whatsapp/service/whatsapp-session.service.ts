import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import QRCode from "qrcode";

import { WhatsappRepository } from "../repository/whatsapp.repository";
import { phoneFromJid } from "../utils/phone.util";

type BaileysModule = typeof import("@whiskeysockets/baileys");
type WASocket = import("@whiskeysockets/baileys").WASocket;

const AUTH_DIR = join(process.cwd(), ".whatsapp-auth");
const INIT_RETRY_MS = 30_000;

@Injectable()
export class WhatsappSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappSessionService.name);
  private sock: WASocket | null = null;
  private baileys: BaileysModule | null = null;
  private currentQr: string | null = null;
  private currentQrDataUrl: string | null = null;
  private starting = false;
  private intentionalStop = false;
  private initRetryTimer: NodeJS.Timeout | null = null;

  constructor(private readonly repository: WhatsappRepository) {}

  onModuleInit(): void {
    void this.initialize();
  }

  async onModuleDestroy() {
    this.intentionalStop = true;
    if (this.initRetryTimer) clearTimeout(this.initRetryTimer);
    await this.closeSocket();
  }

  private async initialize(): Promise<void> {
    try {
      await this.repository.ensureSession();
      this.initRetryTimer = null;
      if (existsSync(AUTH_DIR)) {
        this.logger.log("Existing WhatsApp auth found — attempting reconnect");
        void this.connect().catch((err) => {
          this.logger.warn(`Auto-reconnect failed: ${String(err)}`);
        });
      }
    } catch (error) {
      this.logger.warn(
        `WhatsApp session initialization deferred: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!this.intentionalStop) {
        this.initRetryTimer = setTimeout(() => void this.initialize(), INIT_RETRY_MS);
      }
    }
  }

  private async loadBaileys(): Promise<BaileysModule> {
    if (this.baileys) return this.baileys;
    // Baileys is ESM-only; Nest compiles to CommonJS.
    this.baileys = (await Function('return import("@whiskeysockets/baileys")')()) as BaileysModule;
    return this.baileys;
  }

  getQrPayload() {
    return {
      qr: this.currentQr,
      qrDataUrl: this.currentQrDataUrl,
    };
  }

  isConnected(): boolean {
    return Boolean(this.sock?.user);
  }

  getConnectedPhone(): string | null {
    const user = this.sock?.user;
    if (!user) return null;
    return phoneFromJid(user.phoneNumber) ?? phoneFromJid(user.id);
  }

  async connect(): Promise<void> {
    if (this.starting) return;
    if (this.isConnected()) return;

    this.starting = true;
    this.intentionalStop = false;
    try {
      await mkdir(AUTH_DIR, { recursive: true });
      await this.startSocket();
    } finally {
      this.starting = false;
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalStop = true;
    this.currentQr = null;
    this.currentQrDataUrl = null;

    try {
      if (this.sock) {
        await this.sock.logout().catch(() => undefined);
      }
    } finally {
      await this.closeSocket();
      await rm(AUTH_DIR, { recursive: true, force: true }).catch(() => undefined);
      await this.repository.updateSession({
        status: "DISCONNECTED",
        phoneNumber: null,
        displayName: null,
        lastQrAt: null,
        lastError: null,
      });
    }
  }

  async sendText(jid: string, text: string): Promise<void> {
    if (!this.sock || !this.isConnected()) {
      throw new Error("WHATSAPP_NOT_CONNECTED");
    }
    await this.sock.sendMessage(jid, { text });
  }

  private async closeSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners("connection.update");
        this.sock.ev.removeAllListeners("creds.update");
        this.sock.end?.(undefined);
      } catch {
        /* ignore */
      }
      this.sock = null;
    }
  }

  private async startSocket() {
    const baileys = await this.loadBaileys();
    const { state, saveCreds } = await baileys.useMultiFileAuthState(AUTH_DIR);

    await this.closeSocket();

    await this.repository.updateSession({
      status: "CONNECTING",
      lastError: null,
    });

    const sock = baileys.makeWASocket({
      auth: state,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });
    this.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.currentQr = qr;
        try {
          this.currentQrDataUrl = await QRCode.toDataURL(qr, {
            margin: 1,
            width: 320,
            errorCorrectionLevel: "M",
          });
        } catch (err) {
          this.logger.warn(`QR render failed: ${String(err)}`);
          this.currentQrDataUrl = null;
        }
        await this.repository.updateSession({
          status: "QR_READY",
          lastQrAt: new Date(),
          lastError: null,
        });
        return;
      }

      if (connection === "open") {
        this.currentQr = null;
        this.currentQrDataUrl = null;
        const phone = phoneFromJid(sock.user?.phoneNumber) ?? phoneFromJid(sock.user?.id);
        await this.repository.updateSession({
          status: "CONNECTED",
          phoneNumber: phone,
          displayName: sock.user?.notify ?? sock.user?.name ?? null,
          lastConnectedAt: new Date(),
          lastError: null,
        });
        this.logger.log(`WhatsApp connected as ${phone ?? "unknown"}`);
        return;
      }

      if (connection === "close") {
        const statusCode = (
          lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode;
        const loggedOut = statusCode === baileys.DisconnectReason.loggedOut;
        const restartRequired = statusCode === baileys.DisconnectReason.restartRequired;

        this.logger.warn(
          `WhatsApp connection closed (code=${statusCode ?? "unknown"}, intentional=${this.intentionalStop})`,
        );

        if (this.intentionalStop || loggedOut) {
          this.currentQr = null;
          this.currentQrDataUrl = null;
          this.sock = null;
          if (loggedOut && !this.intentionalStop) {
            await rm(AUTH_DIR, { recursive: true, force: true }).catch(() => undefined);
          }
          await this.repository.updateSession({
            status: "DISCONNECTED",
            phoneNumber: null,
            displayName: null,
            lastError: loggedOut ? "Logged out from phone" : null,
          });
          return;
        }

        // Restart required after QR scan, or transient disconnect — reconnect.
        this.sock = null;
        if (restartRequired || !loggedOut) {
          setTimeout(
            () => {
              if (this.intentionalStop) return;
              void this.startSocket().catch((err) => {
                this.logger.error(`Reconnect failed: ${String(err)}`);
                void this.repository.updateSession({
                  status: "DISCONNECTED",
                  lastError: String(err),
                });
              });
            },
            restartRequired ? 500 : 2000,
          );
        }
      }
    });
  }
}
