/** e.g. webmail.example.com — override with WEBMAIL_HOST_TEMPLATE=webmail.{domain} */
export function resolveWebmailHost(domain: string): string {
  const template = process.env.WEBMAIL_HOST_TEMPLATE?.trim() || "webmail.{domain}";
  return template.replace(/\{domain\}/gi, domain.trim().toLowerCase());
}

export function buildRoundcubeWebmailUrl(domain: string, emailAddress?: string | null): string {
  const host = resolveWebmailHost(domain);
  const base = `https://${host}/roundcube/index.php`;
  if (!emailAddress?.trim()) return base;

  const address = emailAddress.includes("@")
    ? emailAddress.trim().toLowerCase()
    : `${emailAddress.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;

  return `${base}?_user=${encodeURIComponent(address)}`;
}
