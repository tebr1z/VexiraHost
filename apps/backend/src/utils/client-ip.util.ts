import type { Request } from "express";

function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed === "::1" || trimmed === "::ffff:127.0.0.1") return "127.0.0.1";
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  return trimmed;
}

export function isValidClientIp(ip: string): boolean {
  const v4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  const v6 = /^[\da-f:]+$/i;
  return v4.test(ip) || v6.test(ip);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeClientIp(first);
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return normalizeClientIp(realIp.trim());
  }

  return normalizeClientIp(req.ip ?? req.socket.remoteAddress ?? "127.0.0.1");
}
