# Phase 1 — Foundation, Auth & SHG Setup

**Status:** ✅ Complete  
**Branch:** `feat/phase-1-foundation`  
**Date:** November 15, 2026

---

## What was built

### Monorepo & Tooling

- **Turborepo + pnpm** workspace with 4 packages: `apps/web`, `apps/api`, `packages/shared-types`, `packages/config`, `packages/database`
- **TypeScript strict mode** throughout — zero type errors on `tsc --noEmit`
- **Tailwind CSS** with custom ASHA design tokens (primary teal `#0F766E`, status colours, minimum 48×48px touch targets)
- **Chakra UI** with a custom ASHA theme extending buttons, inputs, and colour palette
- **GitHub Actions CI** with jobs for frontend typecheck + build and backend install + tests
- Root `README.md` with full setup instructions
- `BUILD_PLAN.md` with the 5-phase breakdown

---

### Shared Types (`packages/shared-types`)

TypeScript interfaces and Zod validation schemas shared by frontend and backend:

- `enums.ts` — All business enumerations (UserRole, OrderStatus, TaskStatus, MemberSkill, etc.)
- `member.ts` — `Profile`, `SHG`, `SHGMember`, `MemberSkillRecord`, `MemberAvailability`, plus `AddMemberSchema` and `CreateSHGSchema` for form validation
- `order.ts` — `Order`, `OrderItem`, `Buyer`, plus `CreateOrderSchema`
- `task.ts` — `Task`, `TaskAssignment`, `ProgressUpdate`, `QualityReview`
- `costing.ts` — `CostSheet`, `CostComponent`
- `payout.ts` — `PayoutSheet`, `PayoutLine`, `PayoutApproval`
- `api.ts` — `ApiSuccess`, `ApiError`, `ApiResponse` envelope types

---

### Database (`packages/database`)

SQL migrations ready to apply to Supabase:

| File | Contents |
|---|---|
| `001_enums.sql` | All PostgreSQL enums (user_role, order_status, task_status, member_skill, payout_status, etc.) |
| `002_profiles_and_shg.sql` | `profiles`, `shgs`, `shg_members`, `member_skills`, `member_availability` tables with indexes and auto-updated_at triggers |
| `003_rls_policies.sql` | Row-Level Security on all 5 tables with helper functions `current_user_role()` and `current_user_shg_id()` |
| `seeds/01-demo-seed.sql` | 1 SHG (Mahila Shakti SHG), 12 members with realistic names, skills, capacities, and one unavailable member |

**RLS policies implemented:**
- Members can only read their own SHG
- Leaders can manage members within their own SHG
- Cross-SHG access is blocked at the database level

---

### Backend API (`apps/api`)

**FastAPI with Pydantic v2, Python 3.11, uv dependency management.**

#### `GET /health`
Returns `{"status": "ok", "version": "0.1.0", "env": "development"}` — ✅

#### Auth routes (`/api/v1/auth/`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Create account + profile |
| POST | `/login` | Email/password login, returns JWT |
| POST | `/logout` | End session |
| GET | `/me` | Current profile + SHG membership |
| PATCH | `/me` | Update profile |
| POST | `/select-role` | Switch active role |

#### SHG routes (`/api/v1/shgs/`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/shgs/current` | Get current user's SHG |
| POST | `/shgs` | Leader creates SHG |
| PATCH | `/shgs/current` | Leader updates SHG settings |
| GET | `/shgs/current/members` | List all members with skills |
| POST | `/shgs/current/members` | Leader adds a member |
| GET | `/shgs/current/members/{id}` | Member detail with skills + availability |
| PATCH | `/shgs/current/members/{id}` | Update member |
| DELETE | `/shgs/current/members/{id}` | Soft-delete member |
| POST | `/shgs/current/members/{id}/skills` | Add/update skill (upsert) |
| DELETE | `/shgs/current/members/{id}/skills/{skill_id}` | Remove skill |
| POST | `/shgs/current/members/{id}/availability` | Add availability window |

**Tests:** 3 tests pass — `/health` 200, `/docs` available, unknown route 404.

**Standard error format** with `success: false`, `error.code`, `error.message`, `meta.request_id`.

---

### Frontend (`apps/web`)

**React 18 + Vite + TypeScript + Chakra UI + TanStack Query + Zustand + React Router.**

#### Auth flows
- **Login page** — Email/password with show/hide password, Zod validation, routes to role-based home after success
- **Sign-up page** — Full name, email, password, role selection, phone (optional), success state
- **Role selection page** — Card-based role picker (Leader / Member / Approver / Checker / Buyer)

#### Leader workspace
- **Leader layout** — Responsive sidebar on desktop, bottom drawer on mobile, all 8 nav items, logout
- **Leader dashboard** — Welcome header, stat cards (active members, active orders, quality queue, unavailable members), pending actions, quick actions
- **Members list** — Live search, member cards with availability badge + skill chips, links to detail
- **Add member** — Full form with name, phone, capacity, availability, skill builder with proficiency 1–5
- **Member detail** — Profile card, inline availability editor, capacity stats, performance history, proficiency visualisation

#### Member workspace
- **Member layout** — Fixed top bar with ASHA logo + avatar, bottom tab navigation (My Task / My Orders / My Earnings / Profile)
- **Member workspace** — Welcome screen with no-task empty state, task/earnings summary cards, SIMULATED payment badge

#### Supporting infrastructure
- `lib/api.ts` — Typed fetch wrapper with Bearer auth header, error extraction
- `lib/store.ts` — Zustand persistent store for userId, role, fullName, shgId, accessToken, language
- `lib/supabase.ts` — Supabase client for direct storage access
- `lib/i18n.ts` — i18next with English (full), Kannada (partial), Hindi (partial) — structure ready for full localisation
- `lib/queryClient.ts` — TanStack Query with 5-min stale time
- `lib/theme.ts` — Chakra UI theme with ASHA colour tokens, font stack (Inter + Noto Sans Kannada/Devanagari)
- `RequireAuth.tsx` — Route guard redirecting unauthenticated users to login
- `RequireRole.tsx` — Route guard redirecting users to their correct area

---

## Verification results

| Check | Result |
|---|---|
| `tsc --noEmit` on frontend | ✅ 0 errors |
| Backend `pytest tests/` | ✅ 3/3 passed |
| `GET /health` | ✅ 200 OK |
| `/docs` OpenAPI | ✅ available in development |
| Monorepo `pnpm install` | ✅ all dependencies resolved |
| All shared types imported | ✅ no missing exports |

---

## How to run Phase 1

```bash
# 1. Install dependencies
pnpm install

# 2. Apply Supabase migrations (paste into Supabase SQL editor in order):
#    packages/database/migrations/001_enums.sql
#    packages/database/migrations/002_profiles_and_shg.sql
#    packages/database/migrations/003_rls_policies.sql

# 3. Set up environment files
cp apps/web/.env.example apps/web/.env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
cp apps/api/.env.example apps/api/.env     # fill in SUPABASE_* vars

# 4. Start frontend
pnpm --filter @asha/web dev        # → http://localhost:5173

# 5. Start backend (new terminal)
cd apps/api
uv run uvicorn app.main:app --reload --port 8000   # → http://localhost:8000

# 6. Run backend tests
cd apps/api
uv run pytest tests/ -v
```

---

## What's next — Phase 2

**Orders & Buyer Request Flow**

- `buyers`, `orders`, `order_items` database tables + migrations
- Buyer order creation API (`POST /buyers/orders`)
- Leader order review and status transitions (`accept`, `reject`, `cancel`)
- Order timeline with all status changes
- Buyer create-order screen, order list, order status page
- Leader orders list + order detail + accept/reject actions
- Audit events on every status change

---

*Phase 1 complete. Awaiting your review and permission to push to GitHub.*
