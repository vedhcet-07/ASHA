# ASHA — Allocation, Shares & Honest Accounts

> **Fair work. Clear costs. Trusted payouts.**

ASHA is a voice-first, multilingual operations platform for women's self-help groups (SHGs). It turns a bulk order into a fair work plan, tracks production with proof, calculates honest costs, and approves transparent member-wise payouts.

---

## Project status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Foundation, Auth & SHG Setup | 🟡 In progress |
| Phase 2 | Orders & Buyer Flow | ⬜ Upcoming |
| Phase 3 | Planning & Allocation Engine | ⬜ Upcoming |
| Phase 4 | Member Tasks, Proof & Costing | ⬜ Upcoming |
| Phase 5 | Payout, Delivery & Demo Polish | ⬜ Upcoming |

---

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | React 18 + Vite + TypeScript + Chakra UI |
| Backend | FastAPI + Python 3.11 + Pydantic v2 |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Provider-agnostic adapter |
| Voice | Web Speech API (browser-native) |
| Deployment | Vercel + Supabase |

---

## Repository structure

```
asha/
├── apps/
│   ├── web/          # React frontend (port 5173)
│   └── api/          # FastAPI backend (port 8000)
├── packages/
│   ├── shared-types/ # TypeScript types and Zod schemas
│   ├── ui/           # Shared UI components
│   ├── config/       # Shared configs (TS, ESLint, Tailwind)
│   └── database/     # SQL migrations and seed data
├── .github/workflows/ # CI/CD
├── BUILD_PLAN.md     # 5-phase build plan
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- uv (`pip install uv`)
- Supabase account

### Install

```bash
pnpm install
```

### Environment setup

```bash
# Copy and fill in env files
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

### Start development

```bash
# Start frontend (port 5173)
pnpm --filter @asha/web dev

# Start backend (port 8000) — in a separate terminal
cd apps/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Database setup

1. Create a Supabase project at https://supabase.com
2. Run migrations in order from `packages/database/migrations/`
3. Run seed data from `packages/database/seeds/01-demo-seed.sql`
4. Add your Supabase URL and keys to env files

### Backend tests

```bash
cd apps/api
uv run pytest
```

### Health check

```bash
GET http://localhost:8000/health
```

---

## Demo credentials

After running seed data:

| Role | Email | Password |
|---|---|---|
| Leader | `leader@asha.demo` | `AshaDemoLeader123!` |
| Member | `member@asha.demo` | `AshaDemoMember123!` |
| Approver | `approver@asha.demo` | `AshaDemoApprover123!` |
| Buyer | `buyer@asha.demo` | `AshaDemoBuyer123!` |

---

## Core principles

- **AI proposes. Rules calculate. Humans approve.**
- No business calculations in the frontend.
- Every important action is recorded in the audit trail.
- All payments are labelled SIMULATED.
- Design for low literacy first.

---

## Documentation

Full documentation is in `asha-docs/`:

- `01-project-brief.md` — Project overview and goals
- `02-product-spec.md` — Full product specification
- `03-architecture.md` — System architecture
- `04-database-design.md` — Database schema and RLS
- `05-api-spec.md` — API endpoint reference
- `06-tech-stack.md` — Technology decisions
- `07-ui-ux-design.md` — UI/UX design guide
- `08-repo-structure-and-phases.md` — Implementation phases

---

*Built for Tech4Bharat 2026 Hackathon.*
