/**
 * Connectivity check against Kapital using .env (does not print secrets).
 * Run: node scripts/check-kapital-prod.js
 */
const fs = require("fs");
const path = require("path");

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

async function main() {
  const env = loadEnv(path.join(__dirname, "..", ".env"));
  const username = env.KAPITAL_USERNAME || "";
  const password = env.KAPITAL_PASSWORD || "";
  const baseUrl = (
    env.KAPITAL_BASE_URL ||
    (env.KAPITAL_IS_DEV === "false"
      ? "https://e-commerce.kapitalbank.az"
      : "https://txpgtst.kapitalbank.az")
  ).replace(/\/$/, "");
  const redirectUrl =
    env.KAPITAL_REDIRECT_URL ||
    "http://localhost:4000/api/v1/payments/kapital/callback";

  if (!username || !password) {
    console.error("FAIL: KAPITAL_USERNAME / KAPITAL_PASSWORD missing");
    process.exit(1);
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  const body = {
    order: {
      typeRid: "Order_SMS",
      amount: "0.10",
      currency: "AZN",
      description: "Vexira prod connectivity check",
      language: env.KAPITAL_LANGUAGE || "az",
      hppRedirectUrl: redirectUrl,
    },
  };

  const response = await fetch(`${baseUrl}/api/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch {
    payload = {};
  }
  const hppUrl = payload?.order?.hppUrl || "";
  const orderId = payload?.order?.id;
  const isProdHost =
    hppUrl.includes("e-commerce.kapitalbank.az") ||
    baseUrl.includes("e-commerce.kapitalbank.az");

  console.log(
    JSON.stringify(
      {
        httpStatus: response.status,
        ok: response.ok && Boolean(orderId),
        orderId: orderId ?? null,
        baseUrl,
        usernameSet: Boolean(username),
        passwordLength: password.length,
        hppHost: hppUrl ? new URL(hppUrl).host : null,
        usesProdHost: isProdHost,
        error: payload?.errorDescription || payload?.errorCode || null,
        bodyPreview: text.slice(0, 200).replace(/\s+/g, " "),
      },
      null,
      2,
    ),
  );

  if (!response.ok || !orderId) process.exit(1);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
