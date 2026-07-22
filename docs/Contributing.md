# Contributing

Thank you for contributing to Vexira Host. This guide covers development standards and workflows.

## Getting Started

1. Fork and clone the repository
2. Copy `.env.example` to `.env`
3. Run the dev setup script (see [README](../README.md))
4. Create a feature branch from `develop`

## Branch Naming

```
feat/add-domain-search
fix/auth-token-refresh
docs/update-api-reference
chore/upgrade-dependencies
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add refresh token rotation
fix(billing): correct invoice total calculation
docs: update architecture diagram
chore(deps): upgrade nestjs to v10.4
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Commit messages are validated by commitlint via Husky hooks.

## Code Style

### General

- TypeScript strict mode everywhere
- ESLint + Prettier enforced via pre-commit hooks
- No `any` types without explicit justification
- Prefer `type` imports: `import type { Foo } from "..."`

### Frontend

- **No business logic in UI components** — use hooks, services, stores
- Feature-based organization under `features/`
- Reusable components in `components/`
- Form validation with Zod + React Hook Form
- Server state with TanStack Query
- Client state with Zustand

### Backend

- Thin controllers — delegate to services
- DTOs with `class-validator` decorators
- Repository pattern for data access
- No direct Prisma calls in controllers
- Use decorators for auth: `@Roles()`, `@Permissions()`, `@Public()`

### Shared Packages

- Pure functions in `@vexira/utils` (no side effects)
- Types only in `@vexira/types` (no runtime code)
- Environment schemas in `@vexira/config`

## Pull Request Process

1. Create a branch from `develop`
2. Make changes following code style guidelines
3. Ensure all checks pass locally:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
4. Open a PR against `develop`
5. Fill in the PR template (summary + test plan)
6. Request review from a team member
7. Squash merge after approval

## Testing

| What | How | Where |
|------|-----|-------|
| Utility functions | Vitest | `packages/utils/src/**/*.test.ts` |
| Backend services | Jest | `apps/backend/src/modules/*/tests/` |
| Frontend components | Vitest | `apps/frontend/src/**/*.test.tsx` |
| E2E flows | Playwright | `apps/frontend/tests/e2e/` |
| API integration | Jest | `apps/backend/test/` |

Write tests when implementing business logic. Architecture scaffold tests are placeholders.

## Adding a New Backend Module

1. Create module directory under `apps/backend/src/modules/{name}/`
2. Follow the standard module structure (controller, service, dto, entity, repository, interfaces, types, tests)
3. Register in `app.module.ts`
4. Add module documentation to `docs/API.md`

## Adding a New Frontend Feature

1. Create feature directory under `apps/frontend/src/features/{name}/`
2. Add components, hooks, services as needed
3. Create route in `app/` directory
4. Add i18n keys to `messages/en.json` and `messages/tr.json`

## Environment Variables

- Never commit `.env` files
- Add new variables to `.env.example` with descriptions
- Add validation to `@vexira/config` schemas
- Add backend config in `apps/backend/src/config/`

## Questions?

Open a GitHub issue or reach out to the team lead.
