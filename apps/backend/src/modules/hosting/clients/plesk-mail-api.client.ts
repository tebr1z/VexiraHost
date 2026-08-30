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

async function resolvePleskSiteId(
  server: PleskServerCredentials,
  domain: string,
  pleskXmlRequest: PleskXmlRequest,
): Promise<string> {
  const endpoint = resolvePanelEndpoint(server);
  const packetBody = `  <site>
    <get>
      <filter>
        <name>${escapeXml(domain)}</name>
      </filter>
      <dataset>
        <gen_info/>
      </dataset>
    </get>
  </site>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk site lookup error: ${apiError}`);
  }

  const resultBlock = extractXmlBlock(response.body, "result");
  const siteId = extractXmlTag(resultBlock ?? response.body, "id");
  if (!siteId) {
    throw new BadRequestException(`Plesk site id not found for domain ${domain}`);
  }

  return siteId;
}

function parseMailboxBlock(block: string, domain: string): PleskMailbox | null {
  const name = extractXmlTag(block, "name");
  if (!name) return null;

  const mailboxBlock = extractXmlBlock(block, "mailbox") ?? block;
  const forwardingBlock = extractXmlBlock(block, "forwarding");
  const forwardingEnabled = extractXmlTag(forwardingBlock ?? "", "enabled") === "true";
  const forwardingAddress = extractXmlTag(forwardingBlock ?? "", "address");
  const autoresponderEnabled = extractXmlTag(block, "autoresponder") === "true";

  return {
    id: extractXmlId(block),
    name,
    address: `${name}@${domain}`,
    quotaBytes: parseXmlInt(extractXmlTag(mailboxBlock, "quota")),
    usedBytes: parseXmlInt(extractXmlTag(mailboxBlock, "usage")),
    enabled: extractXmlTag(mailboxBlock, "enabled") !== "false",
    forwarding: forwardingEnabled && forwardingAddress ? forwardingAddress : null,
    autoresponder: autoresponderEnabled,
  };
}

function parseMailboxResults(body: string, domain: string): PleskMailbox[] {
  const mailboxes: PleskMailbox[] = [];
  const seen = new Set<string>();

  for (const mailnameBlock of extractAllXmlBlocks(body, "mailname")) {
    const parsed = parseMailboxBlock(mailnameBlock, domain);
    if (parsed && !seen.has(parsed.name.toLowerCase())) {
      seen.add(parsed.name.toLowerCase());
      mailboxes.push(parsed);
    }
  }

  for (const resultBlock of extractAllXmlBlocks(body, "result")) {
    if (extractXmlTag(resultBlock, "status") === "error") continue;

    for (const mailnameBlock of extractAllXmlBlocks(resultBlock, "mailname")) {
      const parsed = parseMailboxBlock(mailnameBlock, domain);
      if (parsed && !seen.has(parsed.name.toLowerCase())) {
        seen.add(parsed.name.toLowerCase());
        mailboxes.push(parsed);
      }
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
  const siteId = await resolvePleskSiteId(server, domain, pleskXmlRequest);

  const packetBody = `  <mail>
    <get_info>
      <filter>
        <site-id>${escapeXml(siteId)}</site-id>
      </filter>
      <mailbox/>
      <mailbox-usage/>
    </get_info>
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
  const siteId = await resolvePleskSiteId(server, domain, pleskXmlRequest);

  const quotaNode =
    input.quotaMb && input.quotaMb > 0
      ? `<quota>${Math.round(input.quotaMb * 1024 * 1024)}</quota>`
      : "";

  const packetBody = `  <mail>
    <create>
      <filter>
        <site-id>${escapeXml(siteId)}</site-id>
        <mailname>
          <name>${escapeXml(input.name)}</name>
          <mailbox>
            <enabled>true</enabled>
            ${quotaNode}
          </mailbox>
          <password>
            <value>${escapeXml(input.password)}</value>
            <type>plain</type>
          </password>
        </mailname>
      </filter>
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
  const siteId = await resolvePleskSiteId(server, domain, pleskXmlRequest);

  const settings: string[] = [];
  if (input.enabled !== undefined) {
    settings.push(`<mailbox>
            <enabled>${input.enabled ? "true" : "false"}</enabled>
          </mailbox>`);
  }
  if (input.password) {
    settings.push(`<password>
            <value>${escapeXml(input.password)}</value>
            <type>plain</type>
          </password>`);
  }
  if (settings.length === 0) {
    throw new BadRequestException("Nothing to update");
  }

  const packetBody = `  <mail>
    <update>
      <set>
        <filter>
          <site-id>${escapeXml(siteId)}</site-id>
          <mailname>
            <name>${escapeXml(localPart)}</name>
            ${settings.join("\n            ")}
          </mailname>
        </filter>
      </set>
    </update>
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
  const siteId = await resolvePleskSiteId(server, domain, pleskXmlRequest);

  const packetBody = `  <mail>
    <remove>
      <filter>
        <site-id>${escapeXml(siteId)}</site-id>
        <name>${escapeXml(localPart)}</name>
      </filter>
    </remove>
  </mail>`;

  const response = await pleskXmlRequest(server, endpoint, packetBody);
  const apiError = extractXmlError(response.body);
  if (apiError) {
    throw new BadRequestException(`Plesk mail delete error: ${apiError}`);
  }
}
