#!/usr/bin/env bash
# Development environment bootstrap script
set -euo pipefail

echo "🚀 Starting Vexira Host development environment..."

if [ ! -f .env ]; then
  echo "📋 Creating root .env from .env.example..."
  cp .env.example .env
fi

if [ ! -f apps/backend/.env ]; then
  echo "📋 Creating apps/backend/.env from .env.example..."
  cp apps/backend/.env.example apps/backend/.env
fi

if [ ! -f apps/frontend/.env.local ]; then
  echo "📋 Creating apps/frontend/.env.local from .env.example..."
  cp apps/frontend/.env.example apps/frontend/.env.local
fi

echo "🐳 Starting infrastructure (PostgreSQL, Redis)..."
docker compose -f docker/docker-compose.dev.yml up -d

echo "📦 Installing dependencies..."
pnpm install

echo "🗄️  Generating Prisma client..."
pnpm --filter @vexira/backend prisma:generate

echo "✅ Development environment ready!"
echo ""
echo "  Frontend:  pnpm --filter @vexira/frontend dev"
echo "  Backend:   pnpm --filter @vexira/backend dev"
echo "  All apps:  pnpm dev"
