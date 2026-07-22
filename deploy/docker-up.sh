#!/usr/bin/env bash
# Deploy / update Vexira Host with Docker Compose
# Run from repo root:  bash deploy/docker-up.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/deploy/.env.docker"
COMPOSE_FILE="$ROOT/docker/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Run:  cp deploy/.env.docker.example deploy/.env.docker"
  echo "Then edit secrets and re-run."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo ""
echo "OK — proxy domains to:"
echo "  frontend  http://127.0.0.1:3000  (vexirahost.com)"
echo "  backend   http://127.0.0.1:4000  (api.vexirahost.com)"
echo "See deploy/DOCKER.md"
