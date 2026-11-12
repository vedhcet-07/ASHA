# ASHA — Architecture

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Version:** v2.0  
**Status:** MVP architecture  

## 1. Architecture overview

ASHA uses a **Turborepo monorepo** with a React frontend and a FastAPI backend.

The frontend handles role-based experiences, voice interactions, and user-facing workflows. The backend owns authentication-aware business logic, deterministic allocation/costing/payout calculations, audit events, and AI orchestration.

Supabase provides PostgreSQL, authentication, row-level security, and file storage.

```text
+----------------------+       +----------------------+
|   React Web / PWA    | <---> |      FastAPI API      |
|  Leader / Member /   |       |  Business rules + AI  |
|  Approver / Buyer    |       |        services       |
+----------------------+       +----------+-----------+
                                          |
                     +--------------------+--------------------+
                     |                    |                    |
              +------v------+      +------v------+      +------v------+
              | Supabase    |      | Supabase    |      | LLM / Voice |
              | PostgreSQL  |      | Storage     |      | Provider    |
              +-------------+      +-------------+      +-------------+
```

## 2. Core principles

1. **AI proposes, rules calculate, humans approve.**
2. The frontend never performs authoritative money, allocation, or payout calculations.
3. The backend is the single source of truth for business state.
4. Supabase Row-Level Security protects member-level and financial data.
5. AI outputs are drafts and must be reviewable.
6. Every important action is recorded in an audit trail.
7. The system must work with seeded demo data and simulated payments.
8. The architecture must support English now and Kannada/Hindi later without a frontend rewrite.

## 3. Monorepo structure

ASHA uses **Turborepo + pnpm**.

```text
asha/
├── apps/
│   ├── web/                     # React frontend
│   └── api/                     # FastAPI backend
├── packages/
│   ├── shared-types/            # TypeScript types and Zod schemas
│   ├── ui/                      # Shared UI components and design tokens
│   ├── config/                  # ESLint, TypeScript, Tailwind, Prettier configs
│   └── database/                # SQL migrations, seed data, database types
├── docs/
│   └── v2/
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

### Why Turborepo

- Keeps frontend, backend, shared types, UI components, and database assets in one repository.
- Enables shared TypeScript types between frontend and backend contracts.
- Makes local development and cloud deployment simpler for a small team.
- Allows future addition of packages such as `voice`, `ai`, or `analytics` without restructuring.

## 4. Frontend architecture

### Stack

| Concern | Choice |
|---|---|
| Framework | React 18+ with Vite |
| Language | TypeScript |
| Routing | React Router |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| UI foundation | Hybrid: Chakra UI for layout, theming, and accessible primitives; shadcn/ui-style components for product-specific patterns |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Dates | date-fns |
| Voice | Web Speech API for MVP; provider-based voice optional |
| PWA | Vite PWA plugin |

### Frontend modules

```text
apps/web/src/
├── app/
│   ├── routes/
│   ├── layouts/
│   └── providers/
├── features/
│   ├── auth/
│   ├── shg/
│   ├── orders/
│   ├── allocation/
│   ├── tasks/
│   ├── quality/
│   ├── costing/
│   ├── payouts/
│   ├── buyer/
│   └── federation/
├── components/
│   ├── ui/
│   ├── layout/
│   └── voice/
├── lib/
│   ├── api/
│   ├── supabase/
│   ├── i18n/
│   ├── utils/
│   └── hooks/
└── types/
```

### Role-based views

| Role | Primary views |
|---|---|
| Leader | Dashboard, orders, allocation review, progress, quality queue, costing, payout initiation |
| Member | My tasks, task details, progress update, proof upload, my earnings |
| Approver / Treasurer | Payout review, approval history, requested changes |
| Quality Checker | Proof-review queue, accept/rework/reject actions |
| Buyer | Create order, order status, delivery record |
| Federation Staff | SHG overview and aggregate operational metrics |

## 5. Backend architecture

### Stack

| Concern | Choice |
|---|---|
| Framework | FastAPI |
| Language | Python 3.11+ |
| Validation | Pydantic v2 |
| Database access | Supabase Python client or SQLAlchemy/SQLModel |
| Auth | Supabase Auth JWT validation |
| Background jobs | Background tasks for MVP; Celery/Redis only if needed later |
| AI | Provider-agnostic LLM adapter |
| Voice | Browser Web Speech API first; server-side STT/TTS optional |
| Testing | Pytest |
| Observability | Sentry + structured logging |

### Backend modules

```text
apps/api/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── dependencies.py
│   │   ├── errors.py
│   │   └── logging.py
│   ├── modules/
│   │   ├── auth/
│   │   ├── shg/
│   │   ├── orders/
│   │   ├── planning/
│   │   ├── allocation/
│   │   ├── tasks/
│   │   ├── quality/
│   │   ├── costing/
│   │   ├── payouts/
│   │   ├── buyers/
│   │   ├── reports/
│   │   └── audit/
│   ├── ai/
│   │   ├── providers/
│   │   ├── prompts/
│   │   ├── schemas/
│   │   └── guardrails.py
│   ├── rules/
│   │   ├── allocation.py
│   │   ├── costing.py
│   │   ├── payout.py
│   │   └── validation.py
│   └── workers/
│       ├── reminders.py
│       ├── delay_detection.py
│       └── notifications.py
├── tests/
├── pyproject.toml
└── Dockerfile
```

## 6. Service boundaries

| Service | Responsibility |
|---|---|
| Auth Service | Validates Supabase JWT, resolves role, enforces access rules |
| SHG Service | Manages SHG, members, skills, capacity, availability |
| Order Service | Manages buyer requests, order items, status, delivery record |
| Planning Service | Coordinates LLM planning and task generation |
| Allocation Service | Runs deterministic fair-allocation rules and saves leader-approved allocation |
| Task Service | Manages member tasks, acceptance, progress, and proof |
| Quality Service | Manages proof review, acceptance, rework, and rejection |
| Costing Service | Calculates material, labour, overhead, margin, unit cost, and selling price |
| Payout Service | Calculates member payouts and manages approval workflow |
| Buyer Service | Provides buyer-safe order status and delivery record |
| Audit Service | Records immutable business events |
| AI Service | Calls LLM providers and validates structured outputs |
| Notification Service | Creates in-app notifications and future voice reminders |

## 7. Data flow

### Order-to-payout flow

1. Buyer creates an order request.
2. Leader reviews and accepts the order.
3. ASHA calls the LLM planner to draft production stages and tasks.
4. The allocation engine calculates a fair member-wise allocation.
5. Leader reviews, edits if needed, and confirms the allocation.
6. Members receive tasks and accept them.
7. Members submit progress and photo proof.
8. Checker or leader reviews proof and records quality decisions.
9. Leader enters or updates costing inputs.
10. Costing engine calculates unit cost, margin, and selling price.
11. Payout engine calculates member-wise earnings from accepted work.
12. Approver reviews and explicitly approves the payout.
13. Buyer sees the order status and delivery record.
14. Audit service records all critical events.

## 8. AI architecture

ASHA uses a provider-agnostic AI layer. The MVP must support multiple LLM options through configuration rather than hard-coding one vendor.

Supported provider options:

| Provider | Use case |
|---|---|
| OpenAI | High-quality planning, explanation, and structured output |
| Google Gemini | Alternative LLM provider; useful for multimodal future features |
| Anthropic Claude | Strong reasoning and explanation quality |
| Groq | Low-latency inference for demo-friendly responses |
| Ollama | Local/self-hosted model option for privacy-sensitive deployments |

The backend uses an adapter interface:

```text
AIProvider
├── generate_production_plan()
├── explain_allocation()
├── draft_quality_note()
├── explain_payout()
└── generate_member_message()
```

### AI guardrails

- The LLM receives structured order, member, capacity, and rule context.
- The LLM must return schema-validated JSON.
- Invalid or incomplete AI output is discarded or returned as a draft with errors.
- The LLM cannot directly update final allocation, cost, payout, or approval status.
- All AI-generated recommendations are stored with model, prompt version, input snapshot, and confidence/status.
- A human must confirm before an AI draft becomes operational.

## 9. Voice architecture

### MVP approach

Use the browser’s **Web Speech API** where available:

- `SpeechRecognition` for leader speech input.
- `SpeechSynthesis` for member task and payout audio playback.

### Cloud option

If browser support or quality is insufficient, use a provider-based service:

- Cloud STT for speech-to-text.
- Cloud TTS for text-to-speech.
- Voice files stored in Supabase Storage when needed.

### Language strategy

- English is the demo language.
- The i18n layer must support English, Kannada, and Hindi.
- Voice prompts must use the member’s selected language.
- Voice is an enhancement, not a hard dependency for every workflow.

## 10. Real-time updates

ASHA uses live updates for operational state.

| Event | Updated views |
|---|---|
| Member accepts/rejects task | Leader dashboard, order progress |
| Member submits progress/proof | Leader dashboard, quality queue |
| Quality decision | Member task view, order progress |
| Cost update | Leader costing view |
| Payout approval | Member earnings view, leader dashboard |
| Order status change | Buyer tracking view, leader dashboard |

Implementation options:

- **MVP:** Supabase Realtime subscriptions on key tables.
- **Fallback:** TanStack Query refetching on focus or interval.
- **Future:** WebSocket events from FastAPI for complex workflow events.

## 11. Background jobs

The MVP includes lightweight background processing.

| Job | Trigger | Action |
|---|---|---|
| Delay detection | Periodic schedule or task update | Identify tasks likely to miss deadline |
| Reminder generation | Task due date approaching | Create in-app reminder / notification |
| Re-allocation suggestion | Delay or member unavailability | Suggest alternative qualified member |
| Notification delivery | Business event | Create in-app notification |

For the hackathon, jobs can run as FastAPI background tasks or a simple scheduled worker. Celery + Redis is unnecessary unless the product scales beyond the MVP.

## 12. Security and access control

### Authentication

- Supabase Auth handles login and session management.
- FastAPI validates JWTs issued by Supabase.
- User role and SHG membership are resolved server-side.
- The frontend uses roles only for navigation and UI display; it never trusts the client for authorization.

### Row-Level Security

PostgreSQL RLS must enforce:

- A member can read only her own tasks, progress, proofs, and payout record.
- A leader can read/write records within her SHG.
- An approver can read payout sheets within her SHG.
- A buyer can read only orders belonging to that buyer.
- Federation staff can access only authorized aggregate data.
- Audit records are append-only.

### File access

- Photo and voice proof are stored in Supabase Storage.
- Files use private buckets with signed URLs.
- Access is limited to authorized SHG roles and assigned reviewers.
- Buyer-visible photos are explicitly marked as buyer-safe.

## 13. Deployment architecture

### Cloud environment

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Vercel serverless functions or a lightweight container host |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Configurable LLM provider |
| Monitoring | Sentry |
| CI/CD | GitHub Actions |

Recommended MVP deployment:

- Deploy the React app to **Vercel**.
- Deploy FastAPI as a Vercel serverless function if compatible, or use a lightweight container host if long-running background jobs are required.
- Use Supabase for database, auth, storage, and realtime.
- Keep all provider keys in server-side environment variables.

### Local development

- `pnpm dev` starts web and API through Turborepo.
- Supabase can run locally through Supabase CLI or use a cloud development project.
- Seed scripts create deterministic demo data.
- `.env.example` documents every required variable.

## 14. Environments

| Environment | Purpose | Data |
|---|---|---|
| Local | Development and testing | Local Supabase or development cloud project |
| Cloud demo | Hackathon demo and stakeholder review | Synthetic seed data only |
| Production | Future pilot | Real SHG data, strict access controls |

The MVP requires only local and one cloud demo environment.

## 15. Observability

- **Sentry:** Frontend and backend error tracking.
- **Structured logging:** Request ID, user ID, SHG ID, action, and outcome.
- **Audit trail:** Business-critical events stored in PostgreSQL.
- **Health endpoint:** `/health` for API and dependency checks.
- **GitHub Actions:** Lint, typecheck, backend tests, and build verification.

## 16. Architecture decision record

| Decision | Choice | Reason |
|---|---|---|
| Repository structure | Turborepo + pnpm | Clean separation with shared types and configs |
| Frontend | React + Vite + TypeScript | Fast, typed, mobile-first |
| UI approach | Hybrid Chakra UI + shadcn-style components | Accessible primitives plus customizable product UI |
| State | TanStack Query + Zustand | Server cache plus lightweight client state |
| Backend | FastAPI | Strong Python ecosystem for rules and AI |
| Database | Supabase PostgreSQL | Managed Postgres, auth, storage, RLS |
| AI | Provider-agnostic adapter | Avoid vendor lock-in |
| Voice | Web Speech API first | Zero extra infrastructure for MVP |
| Real-time | Supabase Realtime | Simple live operational updates |
| Jobs | FastAPI background tasks | Sufficient for MVP |
| Deployment | Vercel + Supabase | Low-cost, hackathon-friendly |
| Testing | Backend Pytest tests | Focus effort on business-critical rules |
| Monitoring | Sentry | Practical error tracking |
