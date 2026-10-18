#!/bin/sh
set -e
cd /app/apps/backend

mkdir -p .whatsapp-auth storage
chown -R node:node .whatsapp-auth storage

PRISMA_CLI="node_modules/prisma/build/index.js"

if ! node "$PRISMA_CLI" migrate deploy --schema prisma/schema.prisma; then
  echo "prisma migrate deploy failed; marking known mid-transaction migrations rolled back and retrying"
  node "$PRISMA_CLI" migrate resolve --schema prisma/schema.prisma --rolled-back "20260916120000_deploy_docker_image" || true
  node "$PRISMA_CLI" migrate resolve --schema prisma/schema.prisma --rolled-back "20260916140000_hosting_cancel_purge" || true
  node "$PRISMA_CLI" migrate deploy --schema prisma/schema.prisma
fi

exec su-exec node:node node dist/main.js
