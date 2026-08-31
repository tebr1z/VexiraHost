import { Injectable, Logger } from "@nestjs/common";
import { Client } from "ssh2";

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

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  async exec(
    options: SshConnectionOptions,
    command: string,
    timeoutMs = 600_000,
  ): Promise<SshExecResult> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = "";
      let stderr = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        conn.end();
        reject(new Error(`SSH command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const finish = (result: SshExecResult | Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        conn.end();
        if (result instanceof Error) reject(result);
        else resolve(result);
      };

      conn
        .on("ready", () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              finish(err);
              return;
            }

            stream
              .on("close", (code: number) => {
                finish({ stdout, stderr, code: code ?? 0 });
              })
              .on("data", (data: Buffer) => {
                stdout += data.toString("utf8");
              });

            stream.stderr.on("data", (data: Buffer) => {
              stderr += data.toString("utf8");
            });
          });
        })
        .on("error", (error) => {
          this.logger.debug(`SSH connection error: ${error.message}`);
          finish(error);
        })
        .connect({
          host: options.host,
          port: options.port ?? 22,
          username: options.username,
          password: options.password,
          readyTimeout: 20_000,
        });
    });
  }

  async execChecked(
    options: SshConnectionOptions,
    command: string,
    timeoutMs?: number,
  ): Promise<string> {
    const result = await this.exec(options, command, timeoutMs);
    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout).trim();
      throw new Error(detail || `SSH command failed with exit code ${result.code}`);
    }
    return result.stdout;
  }

  async writeFile(
    options: SshConnectionOptions,
    remotePath: string,
    content: string,
    mode = "644",
  ): Promise<void> {
    const encoded = Buffer.from(content, "utf8").toString("base64");
    const dir = remotePath.replace(/\/[^/]+$/, "");
    const script = [
      `mkdir -p ${shellQuote(dir)}`,
      `echo ${shellQuote(encoded)} | base64 -d > ${shellQuote(remotePath)}`,
      `chmod ${mode} ${shellQuote(remotePath)}`,
    ].join(" && ");

    await this.execChecked(options, script);
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
