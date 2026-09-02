/** Apache additional directives for reverse proxy to a local Docker port. */
export function buildApacheProxyDirectives(port: number): string {
  return `# BEGIN VEXIRA_PROXY
ProxyPreserveHost On
ProxyRequests Off
AllowEncodedSlashes NoDecode
RequestHeader set X-Forwarded-Proto "expr=%{REQUEST_SCHEME}"
RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
# END VEXIRA_PROXY
`;
}

export function pleskVhostConfPath(domain: string): string {
  return `/var/www/vhosts/system/${domain}/conf/vhost.conf`;
}

export function pleskVhostSslConfPath(domain: string): string {
  return `/var/www/vhosts/system/${domain}/conf/vhost_ssl.conf`;
}

/** Apply vhost.conf changes on Plesk 18+ (no `-domain` flag — use positional domain or httpdmng). */
export function buildPleskApacheReloadCommand(domain: string): string {
  const d = domain.replace(/'/g, `'\\''`);
  return [
    `if [ -x /usr/local/psa/admin/sbin/httpdmng ]; then`,
    `  /usr/local/psa/admin/sbin/httpdmng --reconfigure-domain '${d}';`,
    `elif [ -x /usr/local/psa/admin/bin/httpdmng ]; then`,
    `  /usr/local/psa/admin/bin/httpdmng --reconfigure-domain '${d}';`,
    `else`,
    `  plesk repair web -y '${d}';`,
    `fi`,
    `|| systemctl reload httpd`,
    `|| apachectl graceful`,
  ].join(" ");
}
