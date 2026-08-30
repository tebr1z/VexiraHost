import * as https from "node:https";

import { BadRequestException } from "@nestjs/common";

import type { PleskServerInfo, PleskServicePlan, PleskWebspaceInfo } from "../types/plesk.types";
import {
  buildPleskSessionLoginUrl,
  resolvePanelEndpoint,
  type PanelEndpoint,
} from "../utils/panel-endpoint.util";
import {
  extractAllXmlBlocks,
  extractHostingProperty,
  extractLimitValue,
  extractWebspaceResultBlock,
  extractXmlBlock,
  extractXmlError,
  extractXmlId,
  extractXmlTag,
  parseDiskUsageBlock,
  parsePleskStatus,
  parseXmlInt,
  sumDiskUsage,
} from "../utils/plesk-xml.util";

import { decryptSecret } from "@/utils/crypto.util";

export const PLESK_SESSION_TTL_MS = 4 * 60 * 1000;

export type PleskServerCredentials = {
  hostname: string;
  ipAddress: string;
  panel: "PLESK";
  whmUsername: string;
  whmPasswordEnc: string;
  apiTokenEnc?: string | null;
};

function httpsPost(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "POST",
        headers: {
          "Content-Type": "text/xml",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
        rejectUnauthorized: false,
        timeout: 30000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Plesk API request timed out"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildAuthHeaders(server: PleskServerCredentials): Record<string, string> {
  if (server.apiTokenEnc) {
    return { KEY: decryptSecret(server.apiTokenEnc) };
  }

  const password = decryptSecret(server.whmPasswordEnc);
  return {
    HTTP_AUTH_LOGIN: server.whmUsername,
    HTTP_AUTH_PASSWD: password,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeUserIp(ip: string): string {
  const normalized = ip.includes(":") ? ip : ip.trim();
  return Buffer.from(normalized, "utf8").toString("base64");
}

function isBenignPleskError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already exists") ||
    lower.includes("already exist") ||
    lower.includes("duplicate") ||
    lower.includes("login name is already used") ||
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("doesn't exist") ||
    lower.includes("unknown object") ||
    lower.includes("no such") ||
    lower.includes("cannot find") ||
    lower.includes("object not found")
  );
}

export async function pleskXmlRequest(
  server: PleskServerCredentials,
  endpoint: PanelEndpoint,
  packetBody: string,
): Promise<{ status: number; body: string }> {
  const apiUrl = `${endpoint.apiOrigin}/enterprise/control/agent.php`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<packet version="1.6.9.0">
${packetBody}
</packet>`;

  try {
    return await httpsPost(apiUrl, buildAuthHeaders(server), xml);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plesk API request failed";
    throw new BadRequestException(`Plesk connection failed (${endpoint.apiOrigin}): ${message}`);
  }
}

function extractCreateSessionId(body: string): string | null {
  const createSession = extractXmlBlock(body, "create_session");
  if (createSession) {
    const result = extractXmlBlock(createSession, "result") ?? createSession;
    const id = extractXmlId(result);
    if (id) return id;
  }
  return extractXmlId(body);
}

export async function createPleskUserSession(
  server: PleskServerCredentials,
  login: string,
  clientIp = "127.0.0.1",
  sourceOrigin?: string,
  redirectPath = "/smb/web/view",
): Promise<{ sessionId: string; loginUrl: string; expiresAt: Date; endpoint: PanelEndpoint }> {
  const endpoint = resolvePanelEndpoint(server);
  const userIpB64 = encodeUserIp(clientIp);
  const sourceServerB64 = sourceOrigin ? Buffer.from(sourceOrigin, "utf8").toString("base64") : "";

  const packetBody = `  <server>
    <create_session>
      <login>${escapeXml(login)}</login>
      <data>
        <user_ip>${userIpB64}</user_ip>
        <source_server>${sourceServerB64}</source_server>
      </data>
    </create_session>
  </server>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);

  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk session error: ${apiError}`);
  }

  const sessionId = extractCreateSessionId(response.body);
  if (!sessionId) {
    throw new BadRequestException(
      `Plesk did not return a session id (HTTP ${response.status}). Check admin/API credentials and that login "${login}" exists on the server.`,
    );
  }

  const expiresAt = new Date(Date.now() + PLESK_SESSION_TTL_MS);

  return {
    sessionId,
    loginUrl: buildPleskSessionLoginUrl(endpoint, sessionId, redirectPath),
    expiresAt,
    endpoint,
  };
}

export async function provisionPleskAccount(
  server: PleskServerCredentials,
  input: {
    primaryDomain: string;
    username: string;
    password: string;
    email: string;
    serverIp: string;
    planName?: string;
  },
): Promise<{ panelRef: string; panelUsername: string; panelPassword: string }> {
  const endpoint = resolvePanelEndpoint(server);

  const customerBody = `  <customer>
    <add>
      <gen_info>
        <pname>${escapeXml(input.username)}</pname>
        <login>${escapeXml(input.username)}</login>
        <passwd>${escapeXml(input.password)}</passwd>
        <email>${escapeXml(input.email)}</email>
      </gen_info>
    </add>
  </customer>`;

  const customerRes = await pleskXmlRequest(server, endpoint, customerBody);
  const customerError = extractXmlError(customerRes.body);
  if (customerError && !isBenignPleskError(customerError)) {
    throw new BadRequestException(`Plesk customer error: ${customerError}`);
  }

  const planNode = input.planName ? `<plan-name>${escapeXml(input.planName)}</plan-name>` : "";

  const webspaceBody = `  <webspace>
    <add>
      <gen_setup>
        <name>${escapeXml(input.primaryDomain)}</name>
        <owner-login>${escapeXml(input.username)}</owner-login>
        <ip_address>${escapeXml(input.serverIp)}</ip_address>
        <htype>vrt_hst</htype>
        <status>0</status>
      </gen_setup>
      ${planNode}
      <hosting>
        <vrt_hst>
          <property>
            <name>ftp_login</name>
            <value>${escapeXml(input.username)}</value>
          </property>
          <property>
            <name>ftp_password</name>
            <value>${escapeXml(input.password)}</value>
          </property>
          <ip_address>${escapeXml(input.serverIp)}</ip_address>
        </vrt_hst>
      </hosting>
    </add>
  </webspace>`;

  const webspaceRes = await pleskXmlRequest(server, endpoint, webspaceBody);
  const webspaceError = extractXmlError(webspaceRes.body);
  if (webspaceError) {
    throw new BadRequestException(`Plesk webspace error: ${webspaceError}`);
  }

  const panelRef = extractXmlId(webspaceRes.body) ?? input.primaryDomain;

  let resolvedRef = panelRef;
  try {
    const info = await getPleskWebspaceInfo(server, { name: input.primaryDomain });
    if (info.subscriptionId) resolvedRef = info.subscriptionId;
  } catch {
    /* use add response id */
  }

  return {
    panelRef: resolvedRef,
    panelUsername: input.username,
    panelPassword: input.password,
  };
}

function buildWebspaceFilter(filter: { id?: string; name?: string }): string {
  if (filter.id) {
    return `<filter><id>${escapeXml(filter.id)}</id></filter>`;
  }
  if (filter.name) {
    return `<filter><name>${escapeXml(filter.name)}</name></filter>`;
  }
  throw new BadRequestException("Plesk webspace filter requires id or name");
}

function parseWebspaceInfo(body: string): PleskWebspaceInfo {
  const result = extractWebspaceResultBlock(body);
  if (!result) {
    throw new BadRequestException("Plesk webspace response missing result block");
  }

  const dataBlock = extractXmlBlock(result, "data") ?? "";
  const genInfo = extractXmlBlock(dataBlock, "gen_info");
  const limits = extractXmlBlock(dataBlock, "limits");
  const diskUsageBlock = extractXmlBlock(dataBlock, "disk_usage");
  const hostingBlock = extractXmlBlock(dataBlock, "hosting");
  const statBlock = extractXmlBlock(dataBlock, "stat");

  const diskUsage = parseDiskUsageBlock(diskUsageBlock);
  const realSize = parseXmlInt(extractXmlTag(genInfo ?? "", "real_size"));
  const diskUsedBytes =
    realSize ?? (Object.keys(diskUsage).length > 0 ? sumDiskUsage(diskUsage) : null);

  return {
    subscriptionId: extractXmlTag(result, "id"),
    domain: extractXmlTag(genInfo ?? "", "name"),
    status: parsePleskStatus(extractXmlTag(genInfo ?? "", "status")),
    ownerId: extractXmlTag(genInfo ?? "", "owner-id"),
    ipAddress:
      extractXmlTag(genInfo ?? "", "ip_address") ?? extractXmlTag(hostingBlock ?? "", "ip_address"),
    diskUsedBytes,
    diskLimitBytes: parseXmlInt(extractXmlTag(limits ?? "", "disk_space")),
    trafficUsedBytes: parseXmlInt(extractXmlTag(statBlock ?? "", "traffic")),
    trafficLimitBytes: parseXmlInt(extractXmlTag(limits ?? "", "max_traffic")),
    maxDomains: parseXmlInt(extractXmlTag(limits ?? "", "max_subdom")),
    maxMailboxes: parseXmlInt(extractXmlTag(limits ?? "", "max_box")),
    maxDatabases: parseXmlInt(extractXmlTag(limits ?? "", "max_db")),
    ftpLogin: extractHostingProperty(hostingBlock, "ftp_login"),
    hostingType: extractXmlTag(genInfo ?? "", "htype"),
    diskUsage,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Plesk XML API: webspace/get with dataset gen_info, limits, disk_usage, hosting, stat.
 * @see https://docs.plesk.com/en-US/obsidian/api-rpc/about-xml-api/reference/managing-subscriptions/getting-information-about-subscriptions.33899/
 */
/** Plesk webspace status: 0 = active, 16 = suspended. */
export async function setPleskWebspaceStatus(
  server: PleskServerCredentials,
  filter: { id?: string; name?: string },
  status: "active" | "suspended",
): Promise<void> {
  const endpoint = resolvePanelEndpoint(server);
  const statusCode = status === "suspended" ? "16" : "0";
  const packetBody = `  <webspace>
    <set>
      ${buildWebspaceFilter(filter)}
      <values>
        <gen_setup>
          <status>${statusCode}</status>
        </gen_setup>
      </values>
    </set>
  </webspace>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk webspace status error: ${apiError}`);
  }
}

export async function deletePleskWebspace(
  server: PleskServerCredentials,
  filter: { id?: string; name?: string },
): Promise<void> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <webspace>
    <del>
      ${buildWebspaceFilter(filter)}
    </del>
  </webspace>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError && !isBenignPleskError(apiError)) {
    throw new BadRequestException(`Plesk webspace delete error: ${apiError}`);
  }
}

export async function getPleskWebspaceInfo(
  server: PleskServerCredentials,
  filter: { id?: string; name?: string },
): Promise<PleskWebspaceInfo> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <webspace>
    <get>
      ${buildWebspaceFilter(filter)}
      <dataset>
        <gen_info/>
        <limits/>
        <disk_usage/>
        <hosting/>
        <stat/>
      </dataset>
    </get>
  </webspace>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk webspace get error: ${apiError}`);
  }

  return parseWebspaceInfo(response.body);
}

export async function getPleskServerInfo(server: PleskServerCredentials): Promise<PleskServerInfo> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <server>
    <get>
      <gen_info/>
    </get>
  </server>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk server get error: ${apiError}`);
  }

  const genInfo =
    extractXmlBlock(extractXmlBlock(response.body, "get") ?? "", "gen_info") ??
    extractXmlBlock(response.body, "gen_info");

  return {
    serverName: extractXmlTag(genInfo ?? "", "server_name"),
    version: extractXmlTag(genInfo ?? "", "version"),
    os: extractXmlTag(genInfo ?? "", "os"),
  };
}

const BYTES_PER_GB = 1024 ** 3;
const UNLIMITED_GB = 9999;
const UNLIMITED_COUNT = 999;

function bytesToGb(bytes: number | null): { gb: number; unlimited: boolean } {
  if (bytes == null || bytes < 0) return { gb: UNLIMITED_GB, unlimited: true };
  return { gb: Math.max(1, Math.round(bytes / BYTES_PER_GB)), unlimited: false };
}

function countOrUnlimited(value: number | null): number {
  if (value == null || value < 0) return UNLIMITED_COUNT;
  return value;
}

function parseServicePlanResult(result: string): PleskServicePlan | null {
  const name = extractXmlTag(result, "name");
  if (!name) return null;

  const limits = extractXmlBlock(result, "limits");
  const diskBytes = parseXmlInt(extractLimitValue(limits, "disk_space"));
  const trafficBytes = parseXmlInt(extractLimitValue(limits, "max_traffic"));
  const disk = bytesToGb(diskBytes);
  const bandwidth = bytesToGb(trafficBytes);

  // max_dom = domains; max_subdom often used as addon domains in older packs
  const maxDomains = countOrUnlimited(
    parseXmlInt(extractLimitValue(limits, "max_dom")) ??
      parseXmlInt(extractLimitValue(limits, "max_subdom")),
  );
  const maxEmails = countOrUnlimited(parseXmlInt(extractLimitValue(limits, "max_box")));
  const maxDatabases = countOrUnlimited(parseXmlInt(extractLimitValue(limits, "max_db")));

  return {
    id: extractXmlTag(result, "id"),
    name,
    diskGb: disk.gb,
    bandwidthGb: bandwidth.gb,
    maxDomains,
    maxEmails,
    maxDatabases,
    unlimitedDisk: disk.unlimited,
    unlimitedBandwidth: bandwidth.unlimited,
  };
}

/**
 * Plesk XML API: service-plan/get (all owner plans).
 * @see https://docs.plesk.com/en-US/obsidian/api-rpc/about-xml-api/reference/managing-service-plans/retrieving-the-list-of-service-plans.33882/
 */
export async function listPleskServicePlans(
  server: PleskServerCredentials,
): Promise<PleskServicePlan[]> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <service-plan>
    <get>
      <filter/>
      <owner-all/>
    </get>
  </service-plan>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk service-plan get error: ${apiError}`);
  }

  const getBlock = extractXmlBlock(response.body, "get") ?? response.body;
  const results = extractAllXmlBlocks(getBlock, "result");
  const plans: PleskServicePlan[] = [];

  for (const result of results) {
    const status = extractXmlTag(result, "status");
    if (status && status.toLowerCase() === "error") continue;
    const plan = parseServicePlanResult(result);
    if (plan) plans.push(plan);
  }

  return plans;
}

export async function testPleskApiAuth(
  server: PleskServerCredentials,
): Promise<{ ok: boolean; message: string }> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <server>
    <get>
      <gen_info/>
    </get>
  </server>`;

  try {
    const response = await pleskXmlRequest(server, endpoint, packetBody);
    const apiError = extractXmlError(response.body);
    if (apiError) {
      return { ok: false, message: `Plesk API auth failed: ${apiError}` };
    }
    if (response.status >= 400) {
      return { ok: false, message: `Plesk API returned HTTP ${response.status}` };
    }
    return {
      ok: true,
      message: `Plesk API authenticated on ${endpoint.apiOrigin} as ${server.whmUsername}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plesk API request failed";
    return { ok: false, message: `Plesk API unreachable on ${endpoint.apiOrigin}: ${message}` };
  }
}
