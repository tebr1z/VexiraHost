# Vexira Host

Enterprise-grade hosting platform monorepo — domains, shared hosting, VPS, dedicated servers, SSL, email, licenses, and backup services.

## Overview

Vexira Host is designed as a scalable, multi-tenant SaaS platform supporting millions of users. This repository contains the complete architecture scaffold — no business logic has been implemented yet.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ |
| Mobile | Scaffold (React Native / Expo ready) |
| Monorepo | pnpm workspaces + Turborepo |

## Project Structure

```
vexira-host/
├── apps/
│   ├── frontend/     # Next.js customer portal
│   ├── backend/      # NestJS REST API
│   └── mobile/       # Mobile app scaffold
├── packages/
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── config/       # Environment validation (Zod)
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   └── api-sdk/      # Type-safe API client
├── docker/           # Docker & docker-compose
├── docs/             # Documentation
├── scripts/          # Dev & deployment scripts
└── .github/          # CI/CD workflows
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** (for PostgreSQL & Redis)

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

| File | Purpose |
|------|---------|
| `.env` | Frontend public vars (optional, root) |
| `apps/backend/.env` | API, database, OAuth, SMTP, JWT |
| `apps/frontend/.env.local` | Next.js client env |

### 2. Start infrastructure

**Windows (PowerShell):**
```powershell
.\scripts\dev-setup.ps1
```

**macOS / Linux:**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

Or manually:
```bash
docker compose -f docker/docker-compose.dev.yml up -d
pnpm install
pnpm --filter @vexira/backend prisma:generate
```

### 3. Run development servers

```bash
# All apps
pnpm dev

# Individual apps
pnpm --filter @vexira/frontend dev   # http://localhost:3000
pnpm --filter @vexira/backend dev    # http://localhost:4000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests |
| `pnpm format` | Format code with Prettier |

## API

REST API is versioned at `/api/v1`. See [docs/API.md](./docs/API.md) for endpoint documentation.

Health check: `GET /api/v1/health`

### Global Error Handling

Backend responses are globally normalized and multilingual (`tr`, `en`, `ru`, `az` via `Accept-Language`).

Error response format:

```json
{
  "success": false,
  "error": {
    "status": 101,
    "code": "UNAUTHORIZED",
    "message": "Yetkilendirme gerekli.",
    "details": {}
  },
  "timestamp": "2026-01-01T10:00:00.000Z",
  "path": "/api/v1/example"
}
```

`error.status` meaning:

| status | Meaning |
|--------|---------|
| `101` | Invalid request or authorization issue (`400/401/403/422`) |
| `104` | Resource not found (`404`) |
| `109` | Conflict (`409`) |
| `129` | Rate limit (`429`) |
| `130` | Request timeout (`408/504`) |
| `1500` | Internal server error (`500+`) |
| `1503` | Service unavailable / gateway error (`502/503`) |

`error.code` values:

- `BAD_REQUEST`
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `REQUEST_TIMEOUT`
- `SERVICE_UNAVAILABLE`
- `INTERNAL_ERROR`

Notes:
- A global timeout interceptor returns `408` (`REQUEST_TIMEOUT`, status `130`) after `15s` if a request does not complete.
- Server-side failures are normalized to `500+` with multilingual fallback messages.

## Documentation

- [Architecture](./docs/Architecture.md) — System design and patterns
- [Folder Structure](./docs/FolderStructure.md) — Complete directory reference
- [Contributing](./docs/Contributing.md) — Development guidelines
- [API](./docs/API.md) — REST API reference

## Docker Production

```bash
docker compose -f docker/docker-compose.yml up --build
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## License

Proprietary — All rights reserved.