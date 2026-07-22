/**
 * Shows effective Kapital config (same logic as runtime).
 * Run: node scripts/check-kapital-settings.js && node scripts/resolve-kapital-config.js
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const PRESETS = {
  test: {
    username: "TerminalSys/kapital",
    password: "kapital123",
    baseUrl: "https://txpgtst.kapitalbank.az",
  },
  production: {
    username: "TerminalSys/E1210023",
    password: "",
    baseUrl: "https://e-commerce.kapitalbank.az",
  },
};

function loadEnv(filePath) {
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    let value = trimmed.slice(i + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, i)] = value;
  }
  return out;
}

function normalizeEnvironment(value) {
  const raw = value?.trim().toLowerCase();
  if (raw === "test" || raw === "dev" || raw === "sandbox") return "test";
  if (raw === "production" || raw === "prod" || raw === "live") return "production";
  return undefined;
}

async function main() {
  const env = loadEnv(path.join(__dirname, "..", ".env"));
  const prisma = new PrismaClient();
  const rows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ["kapital_environment", "kapital_username", "kapital_password"],
      },
    },
  });
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const isDev =
    env.KAPITAL_IS_DEV === "true"
      ? true
      : env.KAPITAL_IS_DEV === "false"
        ? false
        : env.NODE_ENV !== "production";

  const storedEnvironment = normalizeEnvironment(stored.kapital_environment);
  const environment = storedEnvironment ?? (isDev ? "test" : "production");
  const preset = PRESETS[environment];
  const username =
    stored.kapital_username?.trim() || env.KAPITAL_USERNAME || preset.username;
  const baseUrl = preset.baseUrl;

  console.log(
    JSON.stringify(
      {
        environment,
        baseUrl,
        username,
        passwordLength: (stored.kapital_password || env.KAPITAL_PASSWORD || preset.password)
          .length,
        storedEnvironment: storedEnvironment ?? null,
        envIsDev: isDev,
        oldEnvBaseUrl: env.KAPITAL_BASE_URL || null,
        note: "baseUrl now always follows selected environment preset",
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
