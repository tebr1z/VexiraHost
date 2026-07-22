# Folder Structure

Complete directory reference for the Vexira Host monorepo.

```
vexira-host/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI pipeline (lint, test, build)
│       └── deploy.yml                # Deployment pipeline skeleton
│
├── .husky/
│   ├── pre-commit                    # lint-staged hook
│   └── commit-msg                    # commitlint hook
│
├── .vscode/
│   ├── extensions.json               # Recommended VS Code extensions
│   └── settings.json                 # Workspace settings
│
├── apps/
│   ├── frontend/                     # Next.js 15 customer portal
│   │   ├── messages/                 # i18n translation files
│   │   │   ├── en.json
│   │   │   └── tr.json
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages & layouts
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/           # Reusable UI components (no business logic)
│   │   │   │   └── layout/
│   │   │   ├── features/             # Feature-based modules
│   │   │   │   ├── auth/
│   │   │   │   ├── billing/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── domains/
│   │   │   │   ├── hosting/
│   │   │   │   └── orders/
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # Utilities & i18n config
│   │   │   ├── providers/            # React context providers
│   │   │   ├── services/             # API service layer
│   │   │   ├── stores/               # Zustand state stores
│   │   │   ├── styles/               # Global styles
│   │   │   ├── types/                # Frontend-specific types
│   │   │   └── middleware.ts         # Next.js middleware (i18n)
│   │   ├── tests/
│   │   │   ├── e2e/                  # Playwright E2E tests
│   │   │   └── unit/                 # Vitest unit tests
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── playwright.config.ts
│   │   └── vitest.config.ts
│   │
│   ├── backend/                      # NestJS REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (models TBD)
│   │   │   └── migrations/           # Prisma migrations
│   │   ├── src/
│   │   │   ├── common/               # Shared backend utilities
│   │   │   │   ├── app-core.module.ts
│   │   │   │   └── health/
│   │   │   ├── config/               # Environment configuration
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── graphql.config.ts
│   │   │   │   ├── jwt.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   └── storage.config.ts
│   │   │   ├── database/             # Prisma service & module
│   │   │   ├── decorators/           # Custom decorators
│   │   │   ├── events/               # Domain events
│   │   │   ├── filters/              # Exception filters
│   │   │   ├── guards/               # Auth guards (JWT, RBAC)
│   │   │   ├── interceptors/         # Response interceptors
│   │   │   ├── jobs/                 # Background job definitions
│   │   │   │   └── processors/
│   │   │   ├── middlewares/          # HTTP middlewares
│   │   │   ├── modules/              # Domain modules
│   │   │   │   ├── admin/
│   │   │   │   ├── audit/
│   │   │   │   ├── auth/
│   │   │   │   ├── billing/
│   │   │   │   ├── domains/
│   │   │   │   ├── hosting/
│   │   │   │   ├── licenses/
│   │   │   │   ├── notifications/
│   │   │   │   ├── orders/
│   │   │   │   ├── payments/
│   │   │   │   ├── servers/
│   │   │   │   ├── tickets/
│   │   │   │   └── users/
│   │   │   ├── queue/                # BullMQ queue module
│   │   │   ├── shared/               # Cross-module shared code
│   │   │   │   └── storage/          # Storage abstraction
│   │   │   │       └── providers/
│   │   │   │           ├── local.storage.ts
│   │   │   │           ├── s3.storage.ts
│   │   │   │           └── r2.storage.ts
│   │   │   ├── utils/                # Backend utilities
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/                     # E2E tests
│   │
│   └── mobile/                       # Mobile app scaffold
│       └── src/
│
├── packages/
│   ├── api-sdk/                      # Type-safe API client
│   │   └── src/
│   │       └── client.ts
│   ├── config/                       # Environment validation (Zod)
│   │   └── src/env/
│   │       ├── development.ts
│   │       ├── production.ts
│   │       ├── schema.ts
│   │       └── testing.ts
│   ├── types/                        # Shared TypeScript types
│   │   └── src/
│   │       ├── api/
│   │       └── auth/
│   ├── ui/                           # Shared UI library (shadcn/ui)
│   │   └── src/
│   │       ├── components/
│   │       ├── lib/
│   │       └── styles/
│   └── utils/                        # Shared utilities
│       └── src/
│
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── docker-compose.yml            # Production stack
│   └── docker-compose.dev.yml        # Dev infrastructure only
│
├── docs/
│   ├── Architecture.md
│   ├── API.md
│   ├── Contributing.md
│   └── FolderStructure.md
│
├── scripts/
│   ├── dev-setup.ps1                 # Windows dev setup
│   └── dev-setup.sh                  # Unix dev setup
│
├── .env.example
├── commitlint.config.mjs
├── eslint.config.mjs
├── lint-staged.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## Module Structure (Backend)

Every backend module follows this consistent structure:

```
modules/{name}/
├── controller/
│   └── {name}.controller.ts      # HTTP endpoints (thin layer)
├── service/
│   └── {name}.service.ts         # Business logic (future)
├── dto/
│   └── index.ts                  # Request/response DTOs
├── entity/
│   └── index.ts                  # Domain entities
├── repository/
│   └── {name}.repository.ts      # Data access (Prisma)
├── interfaces/
│   └── index.ts                  # Module contracts
├── types/
│   └── index.ts                  # Module-specific types
├── tests/
│   └── {name}.service.spec.ts    # Unit tests
└── {name}.module.ts              # NestJS module definition
```

## Feature Structure (Frontend)

Every frontend feature follows this pattern:

```
features/{name}/
├── components/                   # Feature-specific UI components
├── hooks/                        # Feature-specific hooks
├── services/                     # Feature API calls
├── stores/                       # Feature state
├── types/                        # Feature types
├── schemas/                      # Zod validation schemas
└── index.ts                      # Public API barrel export
```
