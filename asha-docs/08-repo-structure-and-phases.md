# ASHA — Repo Structure & Implementation Phases

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Version:** v2.0  
**Status:** Final MVP implementation plan  

## 1. Repository strategy

ASHA uses a **Turborepo monorepo** managed with **pnpm**.

This keeps the React frontend, FastAPI backend, shared types, UI components, database migrations, and documentation in one repository while maintaining clear module boundaries.

## 2. Final repository structure

```text
asha/
├── apps/
│   ├── web/                                 # React frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── routes/
│   │   │   │   ├── layouts/
│   │   │   │   └── providers/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── shg/
│   │   │   │   ├── orders/
│   │   │   │   ├── allocation/
│   │   │   │   ├── tasks/
│   │   │   │   ├── quality/
│   │   │   │   ├── costing/
│   │   │   │   ├── payouts/
│   │   │   │   ├── buyer/
│   │   │   │   └── federation/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── layout/
│   │   │   │   └── voice/
│   │   │   ├── lib/
│   │   │   │   ├── api/
│   │   │   │   ├── supabase/
│   │   │   │   ├── i18n/
│   │   │   │   ├── utils/
│   │   │   │   └── hooks/
│   │   │   ├── types/
│   │   │   ├── main.tsx
│   │   │   └── App.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   └── api/                                 # FastAPI backend
│       ├── app/
│       │   ├── main.py
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   ├── security.py
│       │   │   ├── dependencies.py
│       │   │   ├── errors.py
│       │   │   └── logging.py
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── shg/
│       │   │   ├── orders/
│       │   │   ├── planning/
│       │   │   ├── allocation/
│       │   │   ├── tasks/
│       │   │   ├── quality/
│       │   │   ├── costing/
│       │   │   ├── payouts/
│       │   │   ├── buyers/
│       │   │   ├── reports/
│       │   │   └── audit/
│       │   ├── ai/
│       │   │   ├── providers/
│       │   │   ├── prompts/
│       │   │   ├── schemas/
│       │   │   └── guardrails.py
│       │   ├── rules/
│       │   │   ├── allocation.py
│       │   │   ├── costing.py
│       │   │   ├── payout.py
│       │   │   └── validation.py
│       │   └── workers/
│       │       ├── reminders.py
│       │       ├── delay_detection.py
│       │       └── notifications.py
│       ├── tests/
│       ├── pyproject.toml
│       ├── uv.lock
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/                        # TypeScript types and Zod schemas
│   │   ├── src/
│   │   │   ├── order.ts
│   │   │   ├── task.ts
│   │   │   ├── member.ts
│   │   │   ├── costing.ts
│   │   │   ├── payout.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                                  # Shared UI components and tokens
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── tokens/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── config/                              # Shared lint, TS, Tailwind configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   ├── tailwind/
│   │   └── package.json
│   │
│   └── database/                            # SQL migrations, seed data, types
│       ├── migrations/
│       ├── seeds/
│       ├── policies/
│       └── README.md
│
├── docs/
│   ├── v1/                                  # Original documentation
│   └── v2/                                  # Final ASHA documentation
│       ├── 01-project-brief.md
│       ├── 02-product-spec.md
│       ├── 03-architecture.md
│       ├── 04-database-design.md
│       ├── 05-api-spec.md
│       ├── 06-tech-stack.md
│       ├── 07-ui-ux-design.md
│       └── 08-repo-structure-and-phases.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 3. Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | `TaskCard.tsx` |
| React hooks | camelCase with `use` prefix | `useTaskProgress.ts` |
| Utility files | camelCase | `formatCurrency.ts` |
| API routes | kebab-case | `/allocation/propose` |
| Python modules | snake_case | `allocation_service.py` |
| Python classes | PascalCase | `AllocationService` |
| Database tables | snake_case plural | `task_assignments` |
| Database columns | snake_case | `allocated_quantity` |
| Environment variables | UPPER_SNAKE_CASE | `SUPABASE_URL` |
| Branches | kebab-case | `feat/allocation-engine` |
| Commits | Conventional commits | `feat(api): add payout approval` |

## 4. Branching strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, deployable code |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation updates |
| `chore/*` | Tooling, dependencies, configuration |

For the hackathon, use small feature branches and merge frequently into `main`.

## 5. Environment files

### Root

```env
# Shared
NODE_ENV=development
```

### Frontend: `apps/web/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=
```

### Backend: `apps/api/.env`

```env
APP_ENV=development
API_V1_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_STORAGE_BUCKET=proof-media

AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

VOICE_PROVIDER=browser
SENTRY_DSN=
LOG_LEVEL=INFO
```

## 6. Implementation phases

### Phase 0 — Repository and foundations

**Goal:** Working monorepo with CI, linting, typechecking, and cloud Supabase connection.

Tasks:

1. Initialize Turborepo + pnpm workspace.
2. Create `apps/web`, `apps/api`, and shared packages.
3. Configure TypeScript, ESLint, Prettier, Tailwind, and Chakra UI.
4. Configure FastAPI with Pydantic settings and CORS.
5. Connect Supabase cloud project.
6. Add `.env.example` files.
7. Add GitHub Actions CI.
8. Add Sentry SDK placeholders.
9. Create `/health` endpoint.
10. Create base README.

**Definition of done:**

- `pnpm dev` starts frontend and backend.
- `/health` returns 200.
- Lint, typecheck, and backend tests pass in CI.
- Supabase credentials load from environment variables.

### Phase 1 — Auth, roles, and SHG setup

**Goal:** Users can sign up, log in, select a role, and belong to an SHG.

Tasks:

1. Implement Supabase email/password auth.
2. Create profile creation on first login.
3. Implement role selection.
4. Implement SHG creation and member management.
5. Add member skills, capacity, availability.
6. Add role-based route guards.
7. Build login, role-selection, and profile screens.

**Definition of done:**

- Leader can create an SHG and add 12 members.
- Member can log in and see only her own workspace.
- Role-based navigation works.
- RLS prevents cross-SHG access.

### Phase 2 — Orders and buyer requests

**Goal:** Buyer can create an order; leader can review and accept it.

Tasks:

1. Implement buyer order-request API.
2. Implement order items.
3. Implement leader order review.
4. Implement order status transitions.
5. Build buyer create-order screen.
6. Build buyer order-status screen.
7. Build leader orders list and order details.
8. Add order timeline.

**Definition of done:**

- Buyer can submit a multi-product order.
- Leader can accept, reject, or cancel it.
- Order status timeline updates correctly.

### Phase 3 — Planning and fair allocation

**Goal:** ASHA can propose and confirm a fair work allocation.

Tasks:

1. Implement AI planning draft endpoint.
2. Add provider-agnostic AI adapter.
3. Implement deterministic allocation engine.
4. Implement allocation proposal API.
5. Implement leader override with reason.
6. Implement allocation confirmation.
7. Build plan-review and allocation screens.
8. Add audit events for allocation changes.

**Definition of done:**

- ASHA generates an editable plan draft.
- Allocation proposal uses skill, capacity, availability, workload, and quality.
- Leader can override with a reason.
- Confirmed allocation creates member tasks.

### Phase 4 — Member tasks, progress, and proof

**Goal:** Members can accept tasks, update progress, and submit proof.

Tasks:

1. Implement member task APIs.
2. Implement task acceptance/rejection.
3. Implement progress updates.
4. Implement proof upload with signed URLs.
5. Implement voice text/audio endpoint.
6. Build My Task, task details, progress, and proof screens.
7. Add Supabase Realtime subscriptions.
8. Add voice playback with explicit tap.

**Definition of done:**

- Member sees only her own task.
- Member can accept/reject with reason.
- Member can upload photo proof.
- Leader sees progress updates live.

### Phase 5 — Quality and rework

**Goal:** ASHA can review proof and manage rework.

Tasks:

1. Implement quality-review queue.
2. Implement accept/rework/reject decisions.
3. Implement rework-task creation.
4. Implement reassignment suggestion.
5. Build quality-review screens.
6. Add AI-drafted rework note.
7. Add audit events for quality decisions.

**Definition of done:**

- Checker/leader can review proof.
- Accepted work becomes payout-eligible.
- Rework creates a traceable corrective task.
- Rejected work is not payable.

### Phase 6 — Costing and pricing

**Goal:** ASHA can calculate transparent costs and selling price.

Tasks:

1. Implement cost-component APIs.
2. Implement deterministic costing engine.
3. Support per-unit, per-batch, hourly, and percentage inputs.
4. Implement margin calculation.
5. Implement pricing warnings.
6. Build costing sheet screen.
7. Add audit events for cost changes.

**Definition of done:**

- Leader can enter material, labour, overhead, and margin.
- System calculates unit cost, total cost, margin, and selling price.
- Warning appears if price is below cost or minimum margin.

### Phase 7 — Payout and approval

**Goal:** ASHA can calculate and approve member-wise payouts.

Tasks:

1. Implement payout calculation engine.
2. Implement payout sheet APIs.
3. Implement payout approval workflow.
4. Implement member payout privacy.
5. Build payout sheet and approval screens.
6. Add payout explanation.
7. Add audit events for approval.

**Definition of done:**

- Payout is based on accepted work.
- Rework/rejected work is not paid.
- Approver can approve, reject, or request changes.
- Member sees only her own payout.
- Approval is explicit and auditable.

### Phase 8 — Buyer delivery record

**Goal:** Buyer can track order and view delivery record.

Tasks:

1. Implement buyer-safe status API.
2. Implement delivery-record API.
3. Implement buyer-visible media.
4. Build buyer status and delivery-record screens.
5. Ensure buyer cannot access member earnings.

**Definition of done:**

- Buyer sees order status and delivery record.
- Buyer cannot see internal member data.

### Phase 9 — Notifications, audit, and reports

**Goal:** ASHA feels operationally alive and auditable.

Tasks:

1. Implement notification service.
2. Implement delay detection.
3. Implement reminder generation.
4. Implement re-allocation suggestions.
5. Implement audit-trail API.
6. Implement basic reports.
7. Build notification and report screens.

**Definition of done:**

- Delayed tasks generate alerts.
- Critical actions appear in audit trail.
- Basic reports show on-time rate, rejection rate, earnings, and margin.

### Phase 10 — Demo polish and submission

**Goal:** Hackathon-ready demo.

Tasks:

1. Seed full demo dataset.
2. Test complete order-to-payout flow.
3. Replace mock screens with real screenshots.
4. Record backup demo video.
5. Verify all figures and claims.
6. Fill team and submission details.
7. Check submission format and limits.
8. Final QA on mobile and desktop.

**Definition of done:**

- A judge can complete the full flow in under 3 minutes.
- All payments are marked simulated.
- Demo data is deterministic.
- No broken links, console errors, or placeholder text.

## 7. Build order priority

If time is limited, build in this order:

1. Auth + SHG + members.
2. Orders + buyer request.
3. Allocation engine + confirmation.
4. Member tasks + progress + photo proof.
5. Quality review + rework.
6. Costing engine.
7. Payout calculation + approval.
8. Buyer status + delivery record.
9. Notifications + audit.
10. Reports + polish.

## 8. Critical path

The demo cannot work without:

- Role-based auth.
- Order creation.
- Allocation proposal and confirmation.
- Member task acceptance.
- Progress and photo proof.
- Quality decision.
- Costing calculation.
- Payout calculation.
- Group approval.

Everything else is enhancement.

## 9. Definition of done

A feature is complete when:

- Backend API is implemented with validation and authorization.
- Database constraints and RLS are in place.
- Frontend screen is implemented with Chakra-based UI.
- TanStack Query handles loading, error, and success states.
- Audit event is recorded where required.
- Backend Pytest tests pass.
- Manual demo flow works with seed data.
- No console errors or unhandled promises.

## 10. Final demo checklist

- [ ] Buyer creates order.
- [ ] Leader accepts order.
- [ ] ASHA generates plan draft.
- [ ] Leader reviews and confirms allocation.
- [ ] Members accept tasks.
- [ ] Members submit progress and photo proof.
- [ ] Checker accepts one batch and requests rework for another.
- [ ] Leader completes rework review.
- [ ] Costing sheet shows transparent breakdown.
- [ ] Payout sheet calculates member-wise earnings.
- [ ] Approver approves payout.
- [ ] Buyer sees delivery record.
- [ ] Audit trail shows critical events.
- [ ] All payments marked SIMULATED.
