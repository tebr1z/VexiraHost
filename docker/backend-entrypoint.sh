#!/bin/sh
set -e
cd /app/apps/backend

if ! pnpm exec prisma migrate deploy; then
  echo "prisma migrate deploy failed; marking known mid-transaction migrations rolled back and retrying"
  pnpm exec prisma migrate resolve --rolled-back "20260916120000_deploy_docker_image" || true
  pnpm exec prisma migrate resolve --rolled-back "20260916140000_hosting_cancel_purge" || true
  pnpm exec prisma migrate deploy
fi

exec node dist/main.js
