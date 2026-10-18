#!/usr/bin/env bash
set -euo pipefail

ROLE="${1:-}"
PEER_IP="${2:-}"
BACKEND_CIDR="${3:-}"

if [[ "$ROLE" != "primary" && "$ROLE" != "secondary" ]]; then
  echo "Usage: $0 primary SECONDARY_PUBLIC_IP BACKEND_PRIVATE_CIDR"
  echo "   or: $0 secondary PRIMARY_PUBLIC_IP"
  exit 2
fi
if [[ -z "$PEER_IP" ]]; then
  echo "Peer public IP is required"
  exit 2
fi
if [[ "$ROLE" == "primary" && -z "$BACKEND_CIDR" ]]; then
  echo "Backend private/VPN CIDR is required for the primary API"
  exit 2
fi

ufw allow 53/udp comment 'PowerDNS authoritative UDP'
ufw allow 53/tcp comment 'PowerDNS authoritative TCP'
ufw allow from "$PEER_IP" to any port 53 proto tcp comment 'PowerDNS AXFR/NOTIFY peer'

if [[ "$ROLE" == "primary" ]]; then
  ufw allow from "$BACKEND_CIDR" to any port 8081 proto tcp comment 'Vexira backend to PowerDNS API'
fi

ufw status numbered
echo "Review the output: port 8081 must not have a public Anywhere rule."
