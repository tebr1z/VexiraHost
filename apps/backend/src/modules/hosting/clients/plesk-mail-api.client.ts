import { BadRequestException } from "@nestjs/common";

import type { PleskMailbox, PleskMailSummary } from "../types/plesk-mail.types";
import { resolvePanelEndpoint, type PanelEndpoint } from "../utils/panel-endpoint.util";
import {
  extractAllXmlBlocks,
  extractXmlBlock,
  extractXmlError,
  extractXmlId,
  extractXmlTag,
  parseXmlInt,
} from "../utils/plesk-xml.util";

import type { PleskServerCredentials } from "./plesk-api.client";

type PleskXmlRequest = (
  server: PleskServerCredentials,
  endpoint: PanelEndpoint,
  packetBody: string,
) => Promise<{ status: number; body: string }>;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSiteFilter(domain: string): string {
  return `<filter><site-name>${escapeXml(domain)}</site-name></filter>`;
}

function buildMailboxSiteFilter(domain: string, localPart: string): string {
  return `<filter>
      <site-name>${escapeXml(domain)}</site-name>
      <name>${escapeXml(localPart)}</name>
    </filter>`;
}

function parseMailboxBlock(block: string, domain: string): PleskMailbox | null {
  const name = extractXmlTag(block, "name");
  if (!name) return null;

  const forwardingEnabled = extractXmlTag(block, "forwarding") === "true";
  const forwardingAddress = extractXmlTag(block, "forwarding-address");
  const autoresponderEnabled = extractXmlTag(block, "autoresponder") === "true";

  return {
    id: extractXmlId(block),
    name,
    address: `${name}@${domain}`,
    quotaBytes: parseXmlInt(extractXmlTag(block, "quota")),
    usedBytes: parseXmlInt(extractXmlTag(block, "usage")),
    enabled: extractXmlTag(block, "enabled") !== "false",
    forwarding: forwardingEnabled && forwardingAddress ? forwardingAddress : null,
    autoresponder: autoresponderEnabled,
  };
}

function parseMailboxResults(body: string, domain: string): PleskMailbox[] {
  const mailboxes: PleskMailbox[] = [];
  const seen = new Set<string>();

  for (const resultBlock of extractAllXmlBlocks(body, "result")) {
    if (extractXmlTag(resultBlock, "status") === "error") continue;

    for (const mailboxBlock of extractAllXmlBlocks(resultBlock, "mailbox")) {
      const parsed = parseMailboxBlock(mailboxBlock, domain);
      if (parsed && !seen.has(parsed.name.toLowerCase())) {
        seen.add(parsed.name.toLowerCase());
        mailboxes.push(parsed);
      }
    }

    const direct = parseMailboxBlock(resultBlock, domain);
    if (direct && !seen.has(direct.name.toLowerCase())) {
      seen.add(direct.name.toLowerCase());
      mailboxes.push(direct);
    }
  }

  for (const mailboxBlock of extractAllXmlBlocks(body, "mailbox")) {
    const parsed = parseMailboxBlock(mailboxBlock, domain);
    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());
      mailboxes.push(parsed);
    }
  }

  return mailboxes.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listPleskMailboxes(
  server: PleskServerCredentials,
  domain: string,
  pleskXmlRequest: PleskXmlRequest,
  maxMailboxes?: number | null,
): Promise<PleskMailSummary> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <mail>
    <get>
      ${buildSiteFilter(domain)}
      <mailbox/>
    </get>
  </mail>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk mail list error: ${apiError}`);
  }

  const mailboxes = parseMailboxResults(response.body, domain);
  return {
    domain,
    count: mailboxes.length,
    maxMailboxes: maxMailboxes ?? null,
    mailboxes,
  };
}

export async function createPleskMailbox(
  server: PleskServerCredentials,
  domain: string,
  input: { name: string; password: string; quotaMb?: number },
  pleskXmlRequest: PleskXmlRequest,
): Promise<PleskMailbox> {
  const endpoint = resolvePanelEndpoint(server);
  const quotaNode =
    input.quotaMb && input.quotaMb > 0
      ? `<quota>${Math.round(input.quotaMb * 1024 * 1024)}</quota>`
      : "";

  const packetBody = `  <mail>
    <create>
      ${buildSiteFilter(domain)}
      <mailbox>
        <name>${escapeXml(input.name)}</name>
        <password>${escapeXml(input.password)}</password>
        ${quotaNode}
      </mailbox>
    </create>
  </mail>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk mail create error: ${apiError}`);
  }

  const resultBlock = extractXmlBlock(response.body, "result") ?? response.body;
  const parsed = parseMailboxBlock(resultBlock, domain);
  if (parsed) return parsed;

  return {
    id: extractXmlId(response.body),
    name: input.name,
    address: `${input.name}@${domain}`,
    quotaBytes: input.quotaMb ? input.quotaMb * 1024 * 1024 : null,
    usedBytes: null,
    enabled: true,
    forwarding: null,
    autoresponder: false,
  };
}

export async function updatePleskMailbox(
  server: PleskServerCredentials,
  domain: string,
  localPart: string,
  input: { password?: string; enabled?: boolean },
  pleskXmlRequest: PleskXmlRequest,
): Promise<void> {
  const endpoint = resolvePanelEndpoint(server);
  const values: string[] = [];
  if (input.password) {
    values.push(`<password>${escapeXml(input.password)}</password>`);
  }
  if (input.enabled !== undefined) {
    values.push(`<enabled>${input.enabled ? "true" : "false"}</enabled>`);
  }
  if (values.length === 0) {
    throw new BadRequestException("Nothing to update");
  }

  const packetBody = `  <mail>
    <set>
      ${buildMailboxSiteFilter(domain, localPart)}
      <values>
        ${values.join("\n        ")}
      </values>
    </set>
  </mail>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk mail update error: ${apiError}`);
  }
}

export async function deletePleskMailbox(
  server: PleskServerCredentials,
  domain: string,
  localPart: string,
  pleskXmlRequest: PleskXmlRequest,
): Promise<void> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <mail>
    <remove>
      ${buildMailboxSiteFilter(domain, localPart)}
    </remove>
  </mail>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk mail delete error: ${apiError}`);
  }
}
