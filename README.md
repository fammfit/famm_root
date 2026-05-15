# FAMM — Multi-Tenant Marketplace Operating System

A production-grade, AI-native marketplace OS with full multi-tenancy, real-time capabilities, and white-label support.

## Architecture

```
famm_root/
├── apps/
│   ├── web/          # Next.js 14 App Router — tenant UI & customer-facing pages
│   └── api/          # Hono API server — high-throughput REST & WebSocket endpoints
├── packages/
│   ├── db/           # Prisma schema + generated client (PostgreSQL + pgvector)
│   ├── shared/       # Zod schemas, error classes, response utilities
│   ├── types/        # Pure TypeScript domain types (no runtime deps)
│   ├── config/       # Shared ESLint, TypeScript, and Prettier configurations
│   ├── ui/           # Tailwind component library (Button, Input, Card, Badge…)
│   ├── ai/           # OpenAI client, streaming chat, embeddings
│   ├── events/       # NATS-backed domain event bus
│   └── payments/     # Stripe client, Connect payouts, webhook router
└── docker/           # Postgres init scripts and Docker support files
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| API | Hono (Node adapter), JWT auth, rate limiting |
| Database | PostgreSQL 16 + pgvector, Prisma ORM |
| Cache | Redis 7 (ioredis) |
| Events | NATS JetStream |
| Payments | Stripe Connect |
| AI | OpenAI GPT-4o, streaming, embeddings |
| Infra | Docker, Turborepo, GitHub Actions |

## Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose
- npm ≥ 10

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd famm_root
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:

```bash
DATABASE_URL=postgresql://famm:famm_dev_password@localhost:5432/famm_dev
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
JWT_SECRET=<generate: openssl rand -hex 32>
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Start infrastructure

```bash
# Postgres (pgvector), Redis, NATS
docker compose up postgres redis nats -d

# Wait for health checks, then:
npm run db:generate
npm run db:push        # dev: push schema directly
# OR
npm run db:migrate     # prod: run migrations
```

### 4. Start development servers

```bash
# All apps in parallel (hot reload)
npm run dev

# Or individually:
npm run dev --workspace=@famm/web   # http://localhost:3000
npm run dev --workspace=@famm/api   # http://localhost:4000
```

### 5. Full Docker stack

```bash
# Bring up everything (Postgres, Redis, NATS, web, api)
docker compose up --build

# Production build
docker compose -f docker-compose.prod.yml up --build
```

## Development Workflow

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in watch mode |
| `npm run build` | Build all packages (Turbo-cached) |
| `npm run lint` | ESLint all workspaces |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check (CI) |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run test` | Run all unit tests |
| `npm run test:ci` | Tests with verbose reporter (CI) |
| `npm run clean` | Remove all build outputs + node_modules |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to DB (dev only) |
| `npm run db:migrate` | Deploy migrations (prod) |
| `npm run db:studio` | Open Prisma Studio |

### Commit convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add booking cancellation endpoint
fix: correct timezone offset calculation
docs: update local dev setup
chore: upgrade dependencies
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Adding a new package

```bash
mkdir -p packages/my-package/src
# Copy package.json from an existing package and update name/@famm/my-package
# Add tsconfig.json extending @famm/config/typescript/node (or react-library)
# Add to packages/my-package/src/index.ts
```

## Multi-Tenancy

Every request is scoped to a tenant. The flow:

1. JWT access token contains `tenantId + role`
2. `middleware.ts` (web) / `authMiddleware` (api) verifies JWT and injects headers
3. All Prisma queries include `where: { tenantId }` — no cross-tenant data access
4. Tenant config is Redis-cached for 5 minutes to avoid DB round-trips on every request

## Environment Variables

See [`.env.example`](.env.example) for the full reference. Never commit real credentials. Use `.env.local` locally (gitignored).

## CI Pipeline

GitHub Actions runs on every push/PR to `main` and `develop`:

1. **Lint & Format** — ESLint + Prettier check (parallel)
2. **Type Check** — tsc across all workspaces (parallel)
3. **Unit Tests** — Vitest (parallel)
4. **Integration Tests** — Real Postgres + Redis service containers
5. **Build** — Full Turbo build (after lint/types/tests pass)
6. **Docker Build** — Validates production images (main branch only)

Turbo remote caching is enabled via `TURBO_TOKEN` + `TURBO_TEAM` repository secrets.

## License

See [LICENSE](LICENSE).
