import { Injectable, Logger } from "@nestjs/common";
import { Client, type ClientChannel, type SFTPWrapper } from "ssh2";

export type SshExecResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export type SshConnectionOptions = {
  host: string;
  port?: number;
  username: string;
  password: string;
};

const RETRYABLE_SSH_ERRORS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "Unable to exec",
  "Channel open failure",
];

const SSH_TRANSPORT_AUTH_ERRORS = [
  "All configured authentication methods failed",
  "Authentication failure",
  "Permission denied (password)",
  "Permission denied (publickey,password)",
];

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function formatSshTarget(options: SshConnectionOptions): string {
  return `${options.username}@${options.host}:${options.port ?? 22}`;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  if (code && RETRYABLE_SSH_ERRORS.includes(code)) return true;
  return RETRYABLE_SSH_ERRORS.some((token) => error.message.includes(token));
}

/** True only for ssh2 connect/transport failures — not remote command stderr (git/docker). */
function isSshTransportError(error: Error): boolean {
  const msg = error.message;
  const code = (error as NodeJS.ErrnoException).code;
  if (code && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ENOTFOUND"].includes(code)) {
    return true;
  }
  if (SSH_TRANSPORT_AUTH_ERRORS.some((token) => msg.includes(token))) return true;
  return [
    "Timed out while waiting for handshake",
    "ECONNRESET",
    "ECONNREFUSED",
    "Channel open failure",
    "Unable to exec",
    "No response from server",
    "SSH session timed out",
  ].some((token) => msg.includes(token));
}

function wrapSshError(error: unknown, options: SshConnectionOptions, action: string): Error {
  const target = formatSshTarget(options);
  const base = error instanceof Error ? error.message : String(error);
  const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;

  if (code === "ECONNRESET" || base.includes("ECONNRESET")) {
    return new Error(
      `SSH ${action} failed for ${target}: connection reset. Verify the server IP/SSH port, firewall, and SSH credentials in admin hosting server settings.`,
    );
  }
  if (code === "ECONNREFUSED" || base.includes("ECONNREFUSED")) {
    return new Error(
      `SSH ${action} failed for ${target}: connection refused. Is SSH running on port ${options.port ?? 22}?`,
    );
  }
  if (code === "ENOTFOUND" || base.includes("ENOTFOUND")) {
    return new Error(`SSH ${action} failed: host "${options.host}" could not be resolved.`);
  }
  if (SSH_TRANSPORT_AUTH_ERRORS.some((token) => base.includes(token))) {
    return new Error(
      `SSH ${action} failed for ${target}: authentication failed. Check SSH username/password in admin.`,
    );
  }
  if (base.includes("Unable to exec") || base.includes("Channel open failure")) {
    return new Error(
      `SSH ${action} failed for ${target}: server rejected the command channel (${base}). Retrying usually helps; if it persists, check OpenSSH MaxSessions on the server.`,
    );
  }

  return new Error(`SSH ${action} failed for ${target}: ${base}`);
}

function assertSshCredentials(options: SshConnectionOptions): void {
  if (!options.host?.trim()) {
    throw new Error("Hosting server IP/hostname is missing — set it in admin hosting servers.");
  }
  if (!options.username?.trim()) {
    throw new Error(
      "SSH username is missing — set SSH or panel username in admin hosting servers.",
    );
  }
  if (!options.password?.trim()) {
    throw new Error(
      "SSH password is missing — set SSH password or panel password in admin hosting servers.",
    );
  }
}

function buildConnectConfig(options: SshConnectionOptions) {
  return {
    host: options.host,
    port: options.port ?? 22,
    username: options.username,
    password: options.password,
    readyTimeout: 30_000,
    keepaliveInterval: 10_000,
    keepaliveCountMax: 5,
    tryKeyboard: false,
  };
}

function connectClient(options: SshConnectionOptions): Promise<Client> {
  assertSshCredentials(options);
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(wrapSshError(error, options, "connect"));
      else resolve(conn);
    };

    conn
      .on("ready", () => finish())
      .on("error", (error) => finish(error))
      .connect(buildConnectConfig(options));
  });
}

function execOnClient(conn: Client, command: string, timeoutMs: number): Promise<SshExecResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stream: ClientChannel | undefined;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      stream?.close();
      reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const finish = (result: SshExecResult | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    conn.exec(command, (err, execStream) => {
      if (err) {
        finish(err);
        return;
      }

      stream = execStream;
      bindStream(stream, finish);
    });
  });
}

function bindStream(stream: ClientChannel, finish: (result: SshExecResult | Error) => void): void {
  let stdout = "";
  let stderr = "";

  stream
    .on("close", (code: number) => {
      finish({ stdout, stderr, code: code ?? 0 });
    })
    .on("data", (data: Buffer) => {
      stdout += data.toString("utf8");
    })
    .on("error", (error: Error) => {
      finish(error);
    });

  stream.stderr.on("data", (data: Buffer) => {
    stderr += data.toString("utf8");
  });
}

function openSftp(conn: Client): Promise<SFTPWrapper> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });
}

function sftpWriteFile(
  sftp: SFTPWrapper,
  remotePath: string,
  content: string,
  mode: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = sftp.createWriteStream(remotePath, { mode });
    stream.on("error", reject);
    stream.on("close", () => resolve());
    stream.end(content, "utf8");
  });
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SshSession {
  private channelChain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly conn: Client,
    readonly target: string,
  ) {}

  /** Serialize exec/SFTP so only one SSH channel is open at a time (required on many Plesk/AlmaLinux hosts). */
  private withChannelLock<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.channelChain.then(operation, operation);
    this.channelChain = result.then(
      () => delay(50),
      () => delay(50),
    );
    return result;
  }

  async exec(command: string, timeoutMs = 600_000): Promise<SshExecResult> {
    return this.withChannelLock(() => execOnClient(this.conn, command, timeoutMs));
  }

  async execChecked(command: string, timeoutMs?: number): Promise<string> {
    const result = await this.exec(command, timeoutMs);
    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).trim();
      throw new Error(detail || `SSH command failed with exit code ${result.code}`);
    }
    return result.stdout;
  }

  async writeFile(remotePath: string, content: string, mode = "644"): Promise<void> {
    return this.withChannelLock(async () => {
      const dir = remotePath.replace(/\/[^/]+$/, "");
      if (dir && dir !== remotePath) {
        await execOnClient(this.conn, `mkdir -p ${shellQuote(dir)}`, 60_000);
      }

      const sftp = await openSftp(this.conn);
      try {
        const modeNum = parseInt(mode, 8);
        await sftpWriteFile(sftp, remotePath, content, modeNum);
      } finally {
        sftp.end();
      }
    });
  }

  close(): void {
    this.conn.end();
  }
}

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);
  private readonly maxAttempts = 3;

  async withSession<T>(
    options: SshConnectionOptions,
    fn: (session: SshSession) => Promise<T>,
    timeoutMs = 900_000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let conn: Client | undefined;
      let timeoutHandle: NodeJS.Timeout | undefined;
      try {
        conn = await connectClient(options);
        const session = new SshSession(conn, formatSshTarget(options));
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`SSH session timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });
        const result = await Promise.race([fn(session), timeoutPromise]);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        session.close();
        return result;
      } catch (error) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        conn?.end();
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxAttempts && isRetryableError(lastError)) {
          this.logger.warn(
            `SSH session attempt ${attempt}/${this.maxAttempts} failed for ${formatSshTarget(options)}: ${lastError.message}`,
          );
          await delay(1500 * attempt);
          continue;
        }
        // Keep git/docker command stderr intact — wrapping used to mislabel
        // "fatal: Authentication failed for 'https://github.com/...'" as server SSH auth.
        if (!isSshTransportError(lastError)) {
          throw lastError;
        }
        throw wrapSshError(lastError, options, "session");
      }
    }

    if (lastError && !isSshTransportError(lastError)) {
      throw lastError;
    }
    throw wrapSshError(lastError ?? new Error("SSH session failed"), options, "session");
  }

  async exec(
    options: SshConnectionOptions,
    command: string,
    timeoutMs = 600_000,
  ): Promise<SshExecResult> {
    return this.withSession(
      options,
      (session) => session.exec(command, timeoutMs),
      timeoutMs + 30_000,
    );
  }

  async execChecked(
    options: SshConnectionOptions,
    command: string,
    timeoutMs?: number,
  ): Promise<string> {
    return this.withSession(
      options,
      (session) => session.execChecked(command, timeoutMs),
      (timeoutMs ?? 600_000) + 30_000,
    );
  }

  async writeFile(
    options: SshConnectionOptions,
    remotePath: string,
    content: string,
    mode = "644",
  ): Promise<void> {
    return this.withSession(options, (session) => session.writeFile(remotePath, content, mode));
  }
}
