import { existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import QRCode from "qrcode";

import { WhatsappRepository } from "../repository/whatsapp.repository";
import { phoneFromJid } from "../utils/phone.util";

type BaileysModule = typeof import("@whiskeysockets/baileys");
type WASocket = import("@whiskeysockets/baileys").WASocket;

const AUTH_DIR = join(process.cwd(), ".whatsapp-auth");
const ACCOUNTS_DIR = join(AUTH_DIR, "accounts");
const INIT_RETRY_MS = 30_000;

interface GatewaySocket {
  sock: WASocket | null;
  qr: string | null;
  qrDataUrl: string | null;
  starting: boolean;
  intentionalStop: boolean;
}

@Injectable()
export class WhatsappSessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappSessionService.name);
  private baileys: BaileysModule | null = null;
  private readonly sockets = new Map<string, GatewaySocket>();
  private initRetryTimer: NodeJS.Timeout | null = null;

  constructor(private readonly repository: WhatsappRepository) {}

  onModuleInit(): void {
    void this.initialize().catch((error) =>
      this.logger.warn(`WhatsApp initialization deferred: ${this.errorSummary(error)}`),
    );
  }

  async onModuleDestroy() {
    if (this.initRetryTimer) clearTimeout(this.initRetryTimer);
    await Promise.all([...this.sockets.keys()].map((id) => this.closeSocket(id, true)));
  }

  private async initialize(): Promise<void> {
    try {
      await this.repository.ensureSession();
      await this.repository.ensurePrimaryGatewayAccount();
      await this.importLegacyPrimaryAuth();
      this.initRetryTimer = null;
      const accounts = await this.repository.listGatewayAccounts();
      for (const account of accounts) {
        if (account.isEnabled && existsSync(this.authDirectory(account.id))) {
          void this.connect(account.id).catch((error) =>
            this.logger.warn(
              `WhatsApp account ${account.id} reconnect failed: ${this.errorSummary(error)}`,
            ),
          );
        }
      }
    } catch (error) {
      this.logger.warn(`WhatsApp session initialization deferred: ${this.errorSummary(error)}`);
      this.initRetryTimer = setTimeout(() => void this.initialize(), INIT_RETRY_MS);
    }
  }

  private async importLegacyPrimaryAuth(): Promise<void> {
    const primaryDir = this.authDirectory("primary");
    if (existsSync(primaryDir) || !existsSync(AUTH_DIR)) return;
    // Only migrate known legacy Baileys files; never treat an arbitrary path as auth storage.
    const legacyCreds = join(AUTH_DIR, "creds.json");
    if (!existsSync(legacyCreds)) return;
    await mkdir(ACCOUNTS_DIR, { recursive: true });
    await rename(AUTH_DIR, `${AUTH_DIR}.migration-tmp`).catch(() => undefined);
    const temporary = `${AUTH_DIR}.migration-tmp`;
    if (!existsSync(temporary)) return;
    await mkdir(AUTH_DIR, { recursive: true });
    await mkdir(ACCOUNTS_DIR, { recursive: true });
    await rename(temporary, primaryDir).catch(async () => {
      await rm(temporary, { recursive: true, force: true });
    });
  }

  private async loadBaileys(): Promise<BaileysModule> {
    if (this.baileys) return this.baileys;
    // Baileys is ESM-only; Nest compiles to CommonJS.
    this.baileys = (await Function('return import("@whiskeysockets/baileys")')()) as BaileysModule;
    return this.baileys;
  }

  private state(id: string): GatewaySocket {
    let state = this.sockets.get(id);
    if (!state) {
      state = { sock: null, qr: null, qrDataUrl: null, starting: false, intentionalStop: false };
      this.sockets.set(id, state);
    }
    return state;
  }

  private authDirectory(id: string): string {
    if (id !== "primary" && !/^c[a-z0-9]{20,}$/i.test(id))
      throw new Error("INVALID_GATEWAY_ACCOUNT_ID");
    return join(ACCOUNTS_DIR, id);
  }

  getQrPayload(id = "primary") {
    const state = this.state(id);
    return {
      qr: state.qr,
      qrDataUrl: state.qrDataUrl,
    };
  }

  isConnected(id = "primary"): boolean {
    return Boolean(this.sockets.get(id)?.sock?.user);
  }

  hasConnectedAccount(): boolean {
    return [...this.sockets.values()].some((state) => Boolean(state.sock?.user));
  }

  getConnectedPhone(id = "primary"): string | null {
    const user = this.sockets.get(id)?.sock?.user;
    if (!user) return null;
    return phoneFromJid(user.phoneNumber) ?? phoneFromJid(user.id);
  }

  async connect(id = "primary"): Promise<void> {
    const account = await this.repository.getGatewayAccount(id);
    if (!account) throw new NotFoundException("WhatsApp gateway account not found");
    const state = this.state(id);
    if (state.starting || this.isConnected(id)) return;
    state.starting = true;
    state.intentionalStop = false;
    try {
      await mkdir(this.authDirectory(id), { recursive: true });
      await this.startSocket(id);
    } finally {
      state.starting = false;
    }
  }

  async disconnect(id = "primary"): Promise<void> {
    const state = this.state(id);
    state.intentionalStop = true;
    state.qr = null;
    state.qrDataUrl = null;
    try {
      if (state.sock) {
        await state.sock.logout().catch(() => undefined);
      }
    } finally {
      await this.closeSocket(id, true);
      await rm(this.authDirectory(id), { recursive: true, force: true }).catch(() => undefined);
      await this.repository.updateGatewayAccount(id, {
        status: "DISCONNECTED",
        phoneNumber: null,
        displayName: null,
        lastQrAt: null,
        lastError: null,
      });
    }
  }

  async sendText(id: string, jid: string, text: string): Promise<void> {
    const sock = this.sockets.get(id)?.sock;
    if (!sock || !this.isConnected(id)) {
      throw new Error("WHATSAPP_NOT_CONNECTED");
    }
    await sock.sendMessage(jid, { text });
  }

  private async closeSocket(id: string, intentional = false) {
    const state = this.state(id);
    if (intentional) state.intentionalStop = true;
    if (state.sock) {
      try {
        state.sock.ev.removeAllListeners("connection.update");
        state.sock.ev.removeAllListeners("creds.update");
        state.sock.end?.(undefined);
      } catch {
        /* ignore */
      }
      state.sock = null;
    }
  }

  private async startSocket(id: string) {
    const baileys = await this.loadBaileys();
    const { state: authState, saveCreds } = await baileys.useMultiFileAuthState(
      this.authDirectory(id),
    );
    const state = this.state(id);
    await this.closeSocket(id);
    await this.repository.updateGatewayAccount(id, {
      status: "CONNECTING",
      lastError: null,
    });

    const sock = baileys.makeWASocket({
      auth: authState,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });
    state.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        state.qr = qr;
        try {
          state.qrDataUrl = await QRCode.toDataURL(qr, {
            margin: 1,
            width: 320,
            errorCorrectionLevel: "M",
          });
        } catch (err) {
          this.logger.warn(`QR render failed: ${String(err)}`);
          state.qrDataUrl = null;
        }
        await this.repository.updateGatewayAccount(id, {
          status: "QR_READY",
          lastQrAt: new Date(),
          lastError: null,
        });
        return;
      }

      if (connection === "open") {
        state.qr = null;
        state.qrDataUrl = null;
        const phone = phoneFromJid(sock.user?.phoneNumber) ?? phoneFromJid(sock.user?.id);
        await this.repository.updateGatewayAccount(id, {
          status: "CONNECTED",
          phoneNumber: phone,
          displayName: sock.user?.notify ?? sock.user?.name ?? null,
          lastConnectedAt: new Date(),
          lastError: null,
        });
        this.logger.log(`WhatsApp gateway account ${id} connected`);
        return;
      }

      if (connection === "close") {
        const statusCode = (
          lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode;
        const loggedOut = statusCode === baileys.DisconnectReason.loggedOut;
        const restartRequired = statusCode === baileys.DisconnectReason.restartRequired;

        this.logger.warn(
          `WhatsApp account ${id} connection closed (code=${statusCode ?? "unknown"}, intentional=${state.intentionalStop})`,
        );

        if (state.intentionalStop || loggedOut) {
          state.qr = null;
          state.qrDataUrl = null;
          state.sock = null;
          if (loggedOut && !state.intentionalStop) {
            await rm(this.authDirectory(id), { recursive: true, force: true }).catch(
              () => undefined,
            );
          }
          await this.repository.updateGatewayAccount(id, {
            status: "DISCONNECTED",
            phoneNumber: null,
            displayName: null,
            lastError: loggedOut ? "Logged out from phone" : null,
          });
          return;
        }

        // Restart required after QR scan, or transient disconnect — reconnect.
        state.sock = null;
        if (restartRequired || !loggedOut) {
          setTimeout(
            () => {
              if (state.intentionalStop) return;
              void this.startSocket(id).catch((err) => {
                this.logger.error(
                  `WhatsApp account ${id} reconnect failed: ${this.errorSummary(err)}`,
                );
                void this.repository.updateGatewayAccount(id, {
                  status: "DISCONNECTED",
                  lastError: this.errorSummary(err),
                });
              });
            },
            restartRequired ? 500 : 2000,
          );
        }
      }
    });
  }

  private errorSummary(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/[\r\n]/g, " ").slice(0, 300);
  }
}
