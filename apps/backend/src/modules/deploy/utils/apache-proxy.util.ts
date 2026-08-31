/** Apache additional directives for reverse proxy to a local Docker port. */
export function buildApacheProxyDirectives(port: number): string {
  return `ProxyPreserveHost On
ProxyRequests Off
AllowEncodedSlashes NoDecode
RequestHeader set X-Forwarded-Proto "expr=%{REQUEST_SCHEME}"
RequestHeader set X-Real-IP "%{REMOTE_ADDR}s"
ProxyPass / http://127.0.0.1:${port}/
ProxyPassReverse / http://127.0.0.1:${port}/
`;
}

export function pleskVhostConfPath(domain: string): string {
  return `/var/www/vhosts/system/${domain}/conf/vhost.conf`;
}

export function pleskVhostSslConfPath(domain: string): string {
  return `/var/www/vhosts/system/${domain}/conf/vhost_ssl.conf`;
}
