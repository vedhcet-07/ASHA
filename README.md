# ASHA Platform

ASHA (Artisan Self-Help Alliance) is a monorepo containing a React + Vite web app (`apps/web`) and a FastAPI backend (`apps/api`), managed with Turborepo and pnpm workspaces.

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) v9 — `npm install -g pnpm@9`
- [uv](https://docs.astral.sh/uv/) (Python package manager) — `pip install uv` or see uv docs
- Python ≥ 3.11

---

## Getting started

### 1. Copy environment files

Each app ships an `.env.example`. Copy it to `.env` and fill in your values before running anything.

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

**`apps/web/.env` variables**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | URL of the running API, e.g. `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend error tracking (optional) |

**`apps/api/.env` variables**

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (keep secret) |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase project settings |
| `AI_PROVIDER` | AI provider name, e.g. `openai` |
| `AI_MODEL` | Model identifier, e.g. `gpt-4o` |
| `CORS_ORIGINS` | Comma-separated allowed origins, e.g. `http://localhost:5173` |
| `LOG_LEVEL` | Log level: `DEBUG`, `INFO`, `WARNING`, or `ERROR` |

### 2. Install JavaScript dependencies

From the monorepo root:

```bash
pnpm install
```

This installs dependencies for all packages and apps in one step via pnpm workspaces.

### 3. Install Python dependencies

The API uses `uv` to manage its virtual environment:

```bash
cd apps/api
uv sync
```

### 4. Start the development servers

From the monorepo root:

```bash
pnpm dev
```

Turborepo runs both apps concurrently:

| App | URL |
|---|---|
| Web (Vite) | http://localhost:5173 |
| API (Uvicorn) | http://localhost:8000 |
| API health check | http://localhost:8000/health |

The Vite dev server and Uvicorn both run with hot-reload enabled. Turborepo marks the `dev` task as `persistent` and `cache: false` so it never exits and never serves stale output.

---

## Project structure

```
.
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # FastAPI backend (Python)
├── packages/
│   ├── shared-types/ # Zod schemas and TypeScript types shared across apps
│   ├── ui/           # Chakra-wrapped design-system components
│   ├── config/       # Shared ESLint, TypeScript, and Tailwind configs
│   └── database/     # Supabase migrations and seed files
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

---

## Other scripts

Run these from the monorepo root:

| Script | What it does |
|---|---|
| `pnpm build` | Production build for all apps |
| `pnpm lint` | ESLint (web) + Ruff (api) across the monorepo |
| `pnpm typecheck` | TypeScript type-check for all TS packages |
| `pnpm test` | Run all test suites |
