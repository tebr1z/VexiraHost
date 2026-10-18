import type { DeploySource, DeployStack } from "@prisma/client";

export type DeployRuntime = "docker" | "pm2";

export function resolveDeployRuntime(
  stack: DeployStack,
  source?: DeploySource | string | null,
): DeployRuntime {
  return source === "DOCKER_IMAGE" || stack === "DOTNET" || stack === "DOCKER" ? "docker" : "pm2";
}
