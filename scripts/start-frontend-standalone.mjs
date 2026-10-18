import { cpSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = resolve(import.meta.dirname, "..");
const frontendRoot = join(repositoryRoot, "apps", "frontend");
const standaloneRoot = join(frontendRoot, ".next", "standalone", "apps", "frontend");
const serverPath = join(standaloneRoot, "server.js");

if (!existsSync(serverPath)) {
  throw new Error(
    "Standalone frontend is missing. Run `pnpm --filter @vexira/frontend build` first.",
  );
}

const publicSource = join(frontendRoot, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, join(standaloneRoot, "public"), { recursive: true, force: true });
}

cpSync(join(frontendRoot, ".next", "static"), join(standaloneRoot, ".next", "static"), {
  recursive: true,
  force: true,
});

process.env.PORT ??= "3000";
process.env.HOSTNAME ??= "0.0.0.0";

await import(pathToFileURL(serverPath).href);
