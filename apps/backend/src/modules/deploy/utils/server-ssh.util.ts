import type { HostingServer } from "@prisma/client";

import type { SshConnectionOptions } from "../service/ssh.service";

import { decryptSecret } from "@/utils/crypto.util";

function resolveSshHost(ipAddress: string): string {
  const trimmed = ipAddress.trim();
  const match = trimmed.match(/^(\[[\da-f:]+\]|[^:/]+)/);
  return match?.[1] ?? trimmed;
}

/** SSH credentials for auto-deploy — uses server SSH fields, else panel admin creds. */
export function resolveHostingServerSshOptions(
  server: Pick<
    HostingServer,
    "ipAddress" | "whmUsername" | "whmPasswordEnc" | "sshUsername" | "sshPasswordEnc" | "sshPort"
  >,
  globalPortFallback = 22,
): SshConnectionOptions {
  return {
    host: resolveSshHost(server.ipAddress),
    port: server.sshPort ?? globalPortFallback,
    username: server.sshUsername?.trim() || server.whmUsername,
    password: decryptSecret(server.sshPasswordEnc ?? server.whmPasswordEnc),
  };
}

export function hasDedicatedSshCredentials(
  server: Pick<HostingServer, "sshUsername" | "sshPasswordEnc">,
): boolean {
  return Boolean(server.sshUsername?.trim() || server.sshPasswordEnc);
}
