import { registerAs } from "@nestjs/config";

export const deployConfig = registerAs("deploy", () => ({
  portMin: parseInt(process.env.DEPLOY_PORT_MIN ?? "3000", 10),
  portMax: parseInt(process.env.DEPLOY_PORT_MAX ?? "3999", 10),
  basePath: process.env.DEPLOY_BASE_PATH ?? "/var/www/vexira-deploy",
  sshPort: parseInt(process.env.DEPLOY_SSH_PORT ?? "22", 10),
  /** Override SSH user; defaults to hosting server whmUsername. */
  sshUser: process.env.DEPLOY_SSH_USER ?? undefined,
  /** When true, skip SSH/docker and simulate success (local dev). */
  mockRemote: process.env.DEPLOY_MOCK_REMOTE === "true",
}));

export type DeployConfig = ReturnType<typeof deployConfig>;
