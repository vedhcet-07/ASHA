# Implementation Plan: ASHA Platform

## Overview

This plan converts the ASHA design into discrete, incremental coding tasks organized by the ten implementation phases. Each task builds on the previous ones, ending with every component wired into a working demo flow. Property-based tests for the deterministic engines (Allocation, Costing, Payout) are placed close to the implementation they validate. All tasks target the monorepo at `c:\Users\priya\OneDrive\Desktop\hacks\hack4bharat\Implimentation\ASHA`.

---

## Tasks

- [x] 0. Phase 0 — Monorepo Setup and Infrastructure
  - Initialize Turborepo + pnpm workspace; create `apps/web`, `apps/api`, and all shared packages
  - _Requirements: 16.1, 16.2_

  - [x] 0.1 Initialize Turborepo + pnpm monorepo
    - Create root `package.json` with `"packageManager": "pnpm@9"`, `pnpm-workspace.yaml` listing `apps/*` and `packages/*`, and `turbo.json` with `dev`, `build`, `lint`, `typecheck`, and `test` pipelines
    - Create `.gitignore` covering `node_modules`, `.env`, `dist`, `__pycache__`, `.pytest_cache`, and `*.pyc`
    - _Requirements: 16.1_

  - [x] 0.2 Scaffold `apps/web` React + Vite project
    - Run `pnpm create vite apps/web --template react-ts`; install Chakra UI v2, `@tanstack/react-query`, `zustand`, `react-router-dom`, `react-hook-form`, `zod`, `i18next`, `react-i18next`
    - Create `apps/web/vite.config.ts`, `tsconfig.json` (strict mode), `tailwind.config.js`, and `index.html`
    - Create `apps/web/.env.example` with `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`
    - _Requirements: 16.1, 16.5, 16.6_

  - [x] 0.3 Scaffold `apps/api` FastAPI project
    - Create `apps/api/pyproject.toml` using `uv` with dependencies: `fastapi`, `uvicorn[standard]`, `pydantic-settings`, `pydantic[email]`, `python-jose[cryptography]`, `supabase`, `structlog`, `slowapi`, `httpx`, `hypothesis`, `pytest`, `pytest-asyncio`, `ruff`
    - Create `apps/api/app/main.py` app factory with CORS middleware, router registration stubs, and structlog configuration
    - Create `apps/api/app/core/config.py` using `pydantic-settings` for all env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AI_PROVIDER`, `AI_MODEL`, `CORS_ORIGINS`, `LOG_LEVEL`)
    - Create `apps/api/app/core/errors.py` with global exception handlers returning the standard `ErrorResponse` envelope
    - Create `apps/api/app/core/logging.py` with structlog JSON renderer for production and console renderer for development
    - Create `apps/api/.env.example` with all required variables
    - _Requirements: 16.1, 16.5, 16.6_

  - [x] 0.4 Create `packages/shared-types`
    - Create `packages/shared-types/package.json` and `src/index.ts`
    - Export Zod schemas and inferred TypeScript types for: `Order`, `OrderItem`, `Task`, `TaskAssignment`, `Member`, `MemberSkill`, `CostSheet`, `CostComponent`, `PayoutSheet`, `PayoutLine`, `AuditEvent`
    - Include all status enums matching the PostgreSQL enum definitions in the design (`order_status`, `task_status`, `payout_status`, `ai_draft_status`)
    - _Requirements: 16.8_

  - [x] 0.5 Create `packages/ui`, `packages/config`, and `packages/database`
    - `packages/ui`: export a barrel of Chakra-wrapped design-system components (`Button`, `Card`, `Badge`, `PageHeader`, `LoadingState`, `EmptyState`)
    - `packages/config`: export shared ESLint, TypeScript base, and Tailwind config files
    - `packages/database`: create `migrations/` and `seeds/` empty directories; add `README.md` describing migration workflow with Supabase CLI
    - _Requirements: 16.1_

  - [x] 0.6 Create Supabase schema migrations (all 24 tables)
    - Write `packages/database/migrations/001_initial_schema.sql` creating all enums and all 24 core tables as described in the design (`profiles`, `shgs`, `shg_members`, `member_skills`, `member_availability`, `buyers`, `orders`, `order_items`, `production_plans`, `plan_stages`, `tasks`, `task_assignments`, `progress_updates`, `proof_media`, `quality_reviews`, `rework_tasks`, `cost_sheets`, `cost_components`, `payout_sheets`, `payout_lines`, `payout_approvals`, `notifications`, `audit_events`, `ai_drafts`)
    - All UUID PKs, `TIMESTAMPTZ` timestamps, `NUMERIC(12,2)` for money columns, `deleted_at` on member/order tables
    - _Requirements: 16.7_

  - [x] 0.7 Add Supabase Row-Level Security policies
    - Write `packages/database/policies/001_rls.sql` enabling RLS on every user-facing table
    - Initial policies: `profiles` readable only by own user; `shg_members`, `member_skills`, `member_availability`, `tasks`, `task_assignments`, `payout_lines` restricted to same SHG; `audit_events` restricted to same SHG
    - _Requirements: 16.7, 1.8, 2.10_

  - [x] 0.8 Implement `GET /health` endpoint
    - Create `apps/api/app/modules/health/router.py` returning `{ "status": "ok", "db": "connected" }` (verify DB via a lightweight Supabase ping query)
    - Register in `main.py`
    - _Requirements: 16.3_

  - [x] 0.9 Configure `core/schemas.py` standard response envelope
    - Implement `SuccessResponse[T]` and `ErrorResponse` generics with `meta: ResponseMeta` (`request_id`, `timestamp`)
    - Add `request_id` middleware that injects a UUID into each request context and response header
    - _Requirements: 16.1_

  - [x] 0.10 Configure GitHub Actions CI pipeline
    - Create `.github/workflows/ci.yml` with jobs: `pnpm install` → `pnpm lint` (ESLint + Ruff) → `pnpm typecheck` → `uv run pytest apps/api/tests` → `pnpm --filter web build`
    - _Requirements: 16.4_

  - [x] 0.11 Wire `pnpm dev` to start both apps concurrently
    - Add `dev` scripts in root `turbo.json` and individual `package.json` / `pyproject.toml` so `pnpm dev` from root starts Vite dev server and Uvicorn simultaneously
    - _Requirements: 16.2_

- [ ] 1. Phase 1 — Auth, Roles, and SHG Setup
  - Implement Supabase auth, JWT validation, RBAC, and SHG management
  - _Requirements: 1, 2_

  - [x] 1.1 Implement `core/security.py` JWT validation
    - Write `verify_jwt(token: str) -> dict` using `python-jose` to decode and validate a Supabase JWT against `SUPABASE_JWT_SECRET`
    - Write `get_current_user` FastAPI dependency that extracts the user from the `Authorization: Bearer` header and returns a `CurrentUser` dataclass with `user_id`, `role`, `shg_id`
    - Return `HTTP 401 UNAUTHENTICATED` on missing or expired tokens
    - _Requirements: 1.3, 1.5_

  - [x] 1.2 Implement `require_role()` dependency and RBAC middleware
    - Write `require_role(*roles: str)` FastAPI dependency factory that checks `current_user.role` against the allowed set and raises `HTTP 403 FORBIDDEN` if not matched
    - _Requirements: 1.4_

  - [x] 1.3 Implement Auth module — signup, login, role selection
    - Create `modules/auth/router.py` with endpoints: `POST /auth/profile` (create profile on first login), `GET /auth/me` (resolve active role + SHG), `POST /auth/select-role` (set active role in session)
    - Create `modules/auth/service.py` with `create_or_get_profile()` and `resolve_active_role()` functions
    - Create `modules/auth/schemas.py` with `ProfileResponse`, `RoleSelectRequest`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.9_

  - [x] 1.4 Implement SHG module — SHG CRUD
    - Create `modules/shg/router.py` with: `POST /shg` (create SHG), `GET /shg/{shg_id}` (get SHG details)
    - Create `modules/shg/service.py` with `create_shg()` and `get_shg()`
    - Create `modules/shg/schemas.py` with `SHGCreate`, `SHGResponse`
    - _Requirements: 2.1_

  - [x] 1.5 Implement SHG module — member CRUD
    - Add endpoints: `POST /shg/{shg_id}/members`, `GET /shg/{shg_id}/members`, `GET /shg/{shg_id}/members/{member_id}`, `PATCH /shg/{shg_id}/members/{member_id}`, `DELETE /shg/{shg_id}/members/{member_id}`
    - `DELETE` performs soft-delete if member has active tasks (checks `task_assignments`); hard-delete otherwise
    - Enforce max 15 members per SHG
    - _Requirements: 2.2, 2.3, 2.9_

  - [x] 1.6 Implement member skills and availability
    - Add endpoints: `POST /members/{member_id}/skills`, `DELETE /members/{member_id}/skills/{skill_id}`, `POST /members/{member_id}/availability`, `GET /members/{member_id}/availability`
    - Validate skill values against the catalogue enum; validate proficiency 1–5; validate availability dates
    - _Requirements: 2.4, 2.5, 2.6, 2.7_

  - [x] 1.7 Build Login, Signup, Role-Select, and SHG-Setup screens
    - Create `apps/web/src/features/auth/`: `LoginScreen.tsx`, `SignupScreen.tsx`, `RoleSelectScreen.tsx`
    - Create `apps/web/src/features/shg/`: `SHGSetupScreen.tsx`, `MemberListScreen.tsx`, `MemberProfileScreen.tsx`, `AddMemberForm.tsx`, `SkillsAvailabilityForm.tsx`
    - Use Chakra UI forms + React Hook Form + Zod validation for all inputs
    - _Requirements: 1.1, 2.1, 2.3, 2.4_

  - [x] 1.8 Implement role-based route guards in React Router
    - Create `apps/web/src/app/routes/` with loader guards for each role group: `/leader/*`, `/member/*`, `/approver/*`, `/checker/*`, `/buyer/*`
    - Guards read `activeRole` from Zustand store; redirect to `/select-role` if role doesn't match
    - Create `apps/web/src/lib/hooks/useCurrentUser.ts` and `useActiveRole.ts`
    - _Requirements: 1.4, 1.7_

  - [x] 1.9 Implement Zustand auth store
    - Create `apps/web/src/lib/hooks/useAuthStore.ts` with state: `user`, `activeRole`, `shgId`, `selectedLanguage`
    - Persist `activeRole` and `selectedLanguage` to `localStorage`
    - _Requirements: 1.7, 1.9_

  - [ ] 1.10 Write unit tests for Auth and SHG services
    - Test JWT validation: valid token, expired token, wrong secret each return correct response
    - Test `require_role` dependency: authorized role passes, unauthorized role returns 403
    - Test SHG member soft-delete: member with active tasks is soft-deleted; member without active tasks is hard-deleted
    - Test member limit: 16th member creation returns a validation error
    - _Requirements: 1.4, 1.5, 2.9_

- [ ] 2. Phase 2 — Orders and Buyer Requests
  - Implement buyer order creation, leader intake, and order status transitions
  - _Requirements: 3, 4_

  - [ ] 2.1 Implement Order module — buyer order creation
    - Create `modules/orders/router.py` with `POST /orders` (Buyer role): validate `BuyerOrderCreate` schema (title, delivery date, delivery address, at least one `order_item`); set status `REQUESTED`; generate unique `order_number` (format: `ORD-{YYYYMMDD}-{4-digit-seq}`)
    - Create `modules/orders/schemas.py` with `BuyerOrderCreate`, `OrderItemCreate`, `OrderResponse`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Implement buyer order status page endpoint
    - Add `GET /orders/{order_id}/buyer-status` (Buyer role): return order status, product list, quantities, expected delivery date, current stage name, completion percentage (`accepted_qty / total_ordered_qty × 100`), quality summary (accepted count / total count)
    - Explicitly exclude member names, earnings, cost breakdown, allocation details
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ] 2.3 Implement leader order review endpoints
    - Add `GET /orders` (Leader role): list all SHG orders with status
    - Add `GET /orders/{order_id}` (Leader role): full order details including items and timeline
    - Add `POST /orders/{order_id}/accept` (Leader): transition `REQUESTED → REVIEWED`; emit audit event
    - Add `POST /orders/{order_id}/reject` (Leader): transition `REQUESTED → CANCELLED`; require reason; emit audit event
    - Add `POST /orders/{order_id}/cancel` (Leader): transition to `CANCELLED`; require reason; emit audit event
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 2.4 Implement leader direct order creation and edit
    - Add `POST /orders/leader` (Leader role): create order directly without prior buyer request; set status `REVIEWED`
    - Add `PATCH /orders/{order_id}` (Leader role): allow edit of title, required date, delivery address, and items while in `REQUESTED` or `REVIEWED`
    - Guard edits against other statuses with `CONFLICT` error
    - _Requirements: 4.4, 4.5_

  - [ ] 2.5 Implement Audit_Service core
    - Create `modules/audit/service.py` with `emit_audit_event(event_type, entity_type, entity_id, actor_id, shg_id, order_id, old_values, new_values, reason)` — inserts into `audit_events` and never updates or deletes
    - Add `GET /orders/{order_id}/audit` (Leader/Approver): return full audit trail for an order
    - _Requirements: 4.7, 14.1, 14.2, 14.3, 14.4_

  - [ ] 2.6 Build Buyer order screens
    - Create `apps/web/src/features/buyer/NewOrderScreen.tsx` with multi-item form (dynamic `order_items` rows via `useFieldArray`)
    - Create `apps/web/src/features/buyer/OrderStatusScreen.tsx` displaying status timeline and completion percentage
    - _Requirements: 3.1, 3.5_

  - [ ] 2.7 Build Leader orders screens
    - Create `apps/web/src/features/orders/OrderListScreen.tsx` with status badges and filter by status
    - Create `apps/web/src/features/orders/OrderDetailScreen.tsx` with accept/reject/cancel actions and order timeline
    - Create `apps/web/src/features/orders/OrderCreateScreen.tsx` for direct leader order creation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 2.8 Implement VoiceRecorder component for order creation
    - Create `apps/web/src/components/voice/VoiceRecorder.tsx` using `window.SpeechRecognition` / `webkitSpeechRecognition`
    - On transcript completion, call `onTranscript(text)` prop to populate the order form as an editable draft — never submit directly
    - Render a plain text input fallback if `SpeechRecognition` is unavailable
    - _Requirements: 4.6, 9.5, 9.6_

  - [ ] 2.9 Write unit tests for Order service state transitions
    - Test each valid transition: `REQUESTED → REVIEWED`, `REQUESTED → CANCELLED`
    - Test each invalid transition raises `CONFLICT` (e.g. accepting an already-`REVIEWED` order)
    - Test that `GET /orders/{order_id}/buyer-status` response never includes member fields
    - _Requirements: 3.2, 4.2, 4.3_

- [ ] 3. Checkpoint — Phases 0–2
  - Ensure `pnpm dev` starts cleanly, `/health` returns 200, a buyer can create an order, and a leader can accept it. Ask the user if anything needs adjustment before continuing.

- [ ] 4. Phase 3 — Planning and Allocation
  - Implement AI-assisted plan drafting, deterministic allocation engine, and leader override workflow
  - _Requirements: 5, 6, 7_

  - [ ] 4.1 Implement `rules/allocation.py` — pure allocation engine
    - Write `calculate_allocation_score(skill, capacity, availability, workload, quality) -> float` using the weighted formula: `(0.30×skill) + (0.25×capacity) + (0.20×availability) + (0.15×workload) + (0.10×quality)`; all inputs clamped to [0.0, 1.0]; result clamped to [0.0, 1.0]
    - Write `propose_allocation(members: list[MemberSnapshot], task_requirements: TaskRequirement) -> AllocationProposal`: assigns 0.0 skill score to members lacking the required skill; assigns 0.0 availability score to `unavailable` members; returns ranked list with score + human-readable reasons; flags skill-gap tasks
    - No database access in this module — pure functions only
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 4.2 Write property tests for allocation engine (Property 1 and Property 2)
    - In `apps/api/tests/rules/test_allocation_properties.py`:
    - **Property 1: Allocation score is correctly computed and bounded** — `@given(five floats in [0,1])` verify `score == weighted_sum` within 1e-9 and `0.0 ≤ score ≤ 1.0`; `@settings(max_examples=200)`
    - **Property 2: Allocation is deterministic** — `@given(list[MemberSnapshot], TaskRequirement)` run `propose_allocation` twice; assert rankings, quantities, and scores are identical
    - _Requirements: 6.1, 6.2, 6.4, 6.9_

  - [ ] 4.3 Implement AI Service adapter
    - Create `apps/api/app/ai/interface.py` with `AIProvider` ABC defining all five methods: `generate_production_plan`, `explain_allocation`, `draft_quality_note`, `explain_payout`, `generate_member_message`
    - Create `apps/api/app/ai/providers/openai_provider.py` as the default implementation
    - Create `apps/api/app/ai/schemas/plan.py` with `ProductionPlanDraft` Pydantic model (stages, tasks, durations, skills, timeline)
    - Wrap every provider call: validate output against Pydantic schema; store full record in `ai_drafts` (`status = VALID` or `INVALID`); return typed `AIDraftResult` — never raw LLM output
    - _Requirements: 5.2, 5.4, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ] 4.4 Implement Planning Service
    - Create `modules/planning/router.py` with: `POST /orders/{order_id}/plan/generate` (Leader): triggers async AI plan generation, returns `ai_draft_id`; `GET /orders/{order_id}/plan/draft` (Leader): returns current draft; `POST /orders/{order_id}/plan/confirm` (Leader): validates draft is `VALID`, transitions order to `ALLOCATION_PENDING`, emits audit event
    - Create `modules/planning/service.py` with `generate_plan_draft()` that builds `order_snapshot` + `member_snapshot` and calls `AI_Service`
    - On AI failure: set draft `status = INVALID`, return `AI_PROVIDER_ERROR` (502); never advance order status
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 4.5 Implement Allocation Service
    - Create `modules/allocation/router.py` with: `POST /orders/{order_id}/allocation/propose` (Leader): calls `rules/allocation.py` with current member snapshot, stores proposal; `GET /orders/{order_id}/allocation` (Leader): returns proposal with scores and reasons; `PATCH /orders/{order_id}/allocation` (Leader): apply leader overrides with reason (requires reason if change is material); `POST /orders/{order_id}/allocation/confirm` (Leader): creates task assignments via Task_Service, transitions order to `IN_PROGRESS`, emits audit events for each change and confirmation
    - Guard `confirm` against non-`ALLOCATION_PENDING` orders
    - Warn on overload/deadline risk but do not block
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 4.6 Implement Task_Service task creation
    - Create `modules/tasks/service.py` with `create_task_assignments(allocation_proposal)`: insert rows into `tasks` and `task_assignments` for each allocated member-task pair; initial task status `PROPOSED`
    - _Requirements: 7.6_

  - [ ] 4.7 Build Plan Review and Allocation screens
    - Create `apps/web/src/features/orders/PlanReviewScreen.tsx`: show AI draft stages/tasks; confirm or edit stages; call confirm endpoint
    - Create `apps/web/src/features/allocation/AllocationProposalScreen.tsx`: show each member's score, reasons, and allocated quantity in a sortable table; inline override form with reason field; warnings banner for overload/deadline risk
    - _Requirements: 5.5, 7.1, 7.2, 7.3, 7.5_

  - [ ] 4.8 Write unit tests for Planning and Allocation services
    - Test that confirming a plan with `INVALID` draft returns 409
    - Test skill-gap detection: `propose_allocation` with no matching member returns flag and empty proposals
    - Test that confirming allocation creates one `task_assignments` row per member-task pair
    - Test that audit events are emitted for each allocation change and for confirmation
    - _Requirements: 5.3, 6.8, 7.6, 7.7, 7.8_

  - [ ] 4.9 Write property test for AI schema validation (Property 9)
    - In `apps/api/tests/ai/test_ai_validation_properties.py`:
    - **Property 9: AI schema validation classifies responses correctly** — `@given(valid ProductionPlanDraft dict)` assert draft stored with `status=VALID`; `@given(dict with missing required fields or type mismatches)` assert draft stored with `status=INVALID`
    - _Requirements: 5.3, 18.3, 18.4_

- [ ] 5. Phase 4 — Member Tasks, Progress, and Proof
  - Implement member-facing task APIs, progress tracking, proof upload, voice playback, and i18n structure
  - _Requirements: 8, 9, 17_

  - [ ] 5.1 Implement member task list and detail endpoints
    - Add to `modules/tasks/router.py`: `GET /member/tasks` (Member): list tasks assigned to current member with status badges; `GET /member/tasks/{task_id}` (Member): full task detail (product name, quantity, skill, deadline, instructions, status)
    - RLS on `task_assignments` ensures only the assigned member can read her tasks
    - _Requirements: 8.1, 8.2, 8.9_

  - [ ] 5.2 Implement task accept/reject endpoints
    - Add `POST /member/tasks/{task_id}/accept` (Member): transition `PROPOSED → ACCEPTED`; create `task_assignments` member_response = `ACCEPTED`
    - Add `POST /member/tasks/{task_id}/reject` (Member): transition `PROPOSED → REJECTED`; require `reason`; notify Leader via Notification_Service; trigger Allocation_Engine suggestion for alternative member
    - _Requirements: 8.3, 8.4_

  - [ ] 5.3 Implement progress update endpoint
    - Add `POST /member/tasks/{task_id}/progress` (Member): insert `progress_updates` row with `quantity_completed` and optional voice/text note; only allowed while task is `IN_PROGRESS` or `ACCEPTED`
    - _Requirements: 8.5, 8.10_

  - [ ] 5.4 Implement proof upload flow
    - Add `POST /member/tasks/{task_id}/proof/request-url` (Member): generate Supabase Storage signed upload URL for `proof-media` bucket; return `{ upload_url, proof_id }`
    - Add `POST /member/tasks/{task_id}/proof/complete` (Member): mark `proof_media` row `status = READY` with file path, media type, MIME type, file size, uploader identity
    - _Requirements: 8.6, 8.7_

  - [ ] 5.5 Implement voice text endpoint for tasks
    - Add `GET /member/tasks/{task_id}/voice` (Member): return `{ voice_text: string }` containing a plain-language sentence with product name, quantity, deadline, and instructions; language selected from member's `preferred_language`
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 5.6 Implement VoicePlayer component
    - Create `apps/web/src/components/voice/VoicePlayer.tsx` implementing `VoicePlayerProps` interface from design
    - Use `window.speechSynthesis.speak()` with language codes `en-IN`, `kn-IN`, `hi-IN`; autoPlay defaults to false (requires explicit tap)
    - Fallback: if `SpeechSynthesis` is unavailable, display the `text` prop as a readable paragraph
    - _Requirements: 9.2, 9.6_

  - [ ] 5.7 Build My Tasks and Task Detail screens
    - Create `apps/web/src/features/tasks/MyTasksScreen.tsx`: list tasks with status badges, deadline, and voice play button
    - Create `apps/web/src/features/tasks/TaskDetailScreen.tsx`: show full task detail, accept/reject buttons (with reason modal for reject), progress update form, proof upload button, member earnings summary for the task
    - _Requirements: 8.2, 8.3, 8.8_

  - [ ] 5.8 Implement Supabase Realtime subscriptions
    - Create `apps/web/src/lib/supabase/useRealtimeSubscription.ts`: factory hook subscribing to `postgres_changes` for a given table+filter; on event calls `queryClient.invalidateQueries` for the matching TanStack Query key
    - Subscribe to `tasks` and `progress_updates` in the Leader dashboard; subscribe to `task_assignments` in the Member task list
    - Add polling fallback: `refetchInterval: 30_000` on queries when WebSocket is unavailable
    - _Requirements: 17.1, 17.2_

  - [ ] 5.9 Implement i18n structure
    - Create `apps/web/src/lib/i18n/index.ts` configuring i18next with language detection from Zustand store
    - Create translation files `en.json`, `kn.json`, `hi.json` under `src/lib/i18n/locales/` with keys for all UI labels, task instructions, and voice strings encountered so far (Kannada and Hindi may be placeholder strings for MVP)
    - _Requirements: 9.7_

  - [ ] 5.10 Write unit and component tests for tasks and voice
    - Test `GET /member/tasks/{task_id}/voice` returns `voice_text` containing product name and deadline
    - Test proof upload: `complete` without prior `request-url` returns 404; `complete` after `request-url` sets status to `READY`
    - Test `VoicePlayer` fallback: render component with `SpeechSynthesis` absent (mock `window.speechSynthesis = undefined`); assert voice text is displayed as paragraph
    - _Requirements: 8.6, 9.1, 9.6_

- [ ] 6. Phase 5 — Quality Review and Rework
  - Implement the quality review queue, accept/rework/reject decisions, and rework task creation
  - _Requirements: 10_

  - [ ] 6.1 Implement quality review queue endpoint
    - Create `modules/quality/router.py` with `GET /quality/queue` (Checker/Leader): return all tasks in `SUBMITTED` status with their proof media (signed read URLs)
    - _Requirements: 10.1_

  - [ ] 6.2 Implement quality decision endpoint
    - Add `POST /quality/{task_id}/decision` (Checker/Leader): accept `{ decision: ACCEPTED|REWORK|REJECTED, reviewed_quantity: int, reason: str }`
    - Guard: reject if no `proof_media` record with `status = READY` exists for the task
    - On `ACCEPTED`: increment `accepted_quantity`, mark work payout-eligible
    - On `REWORK`: create rework task defaulting to original member (see 6.3), transition original task to `REWORK`, mark rework quantity not payable
    - On `REJECTED`: increment `rejected_quantity`, mark not payable, record reason
    - Emit audit event for every decision
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.7, 10.9_

  - [ ] 6.3 Implement rework task creation
    - In `modules/quality/service.py`: `create_rework_task(original_task_id, reviewed_quantity)` inserts into `tasks` (new task with `task_type` and skill copied from original) and `rework_tasks` (linking `original_task_id → rework_task_id`)
    - If original member is `unavailable`, call Allocation_Engine to suggest alternative; require Leader to confirm any reassignment
    - _Requirements: 10.4, 10.6_

  - [ ] 6.4 Implement AI quality note draft
    - Add `GET /quality/{task_id}/ai-note` (Checker/Leader): call `AI_Service.draft_quality_note()` with task data and proof summary; return `{ draft_note: string, ai_draft_id }` for Checker to review/edit/discard — never auto-submitted
    - _Requirements: 10.8_

  - [ ] 6.5 Build Quality Review screens
    - Create `apps/web/src/features/quality/QualityQueueScreen.tsx`: list submitted tasks with proof thumbnails; link to review detail
    - Create `apps/web/src/features/quality/ProofViewerScreen.tsx`: display proof media, AI note draft (editable), decision form with quantity and reason fields
    - _Requirements: 10.1, 10.2, 10.8_

  - [ ] 6.6 Write unit tests for Quality service
    - Test `ACCEPTED` decision without a `READY` proof record returns 422
    - Test `REWORK` decision creates one `rework_tasks` row linking original to new task
    - Test `REJECTED` decision increments `rejected_quantity` and does not mark work payable
    - Test audit event is emitted for each of the three decision types
    - _Requirements: 10.3, 10.4, 10.5, 10.7, 10.9_

- [ ] 7. Phase 6 — Costing Engine
  - Implement the deterministic costing engine, cost sheet CRUD, margin calculation, and pricing warnings
  - _Requirements: 11_

  - [ ] 7.1 Implement `rules/costing.py` — pure costing engine
    - Write `calculate_cost_sheet(components: list[CostComponent], quantity: int, margin: MarginInput) -> CostSheetResult` where:
      - `total_cost = material_cost + labour_cost + overhead_cost` (overhead includes PACKAGING, TRANSPORT, UTILITIES, OTHER_OVERHEAD)
      - `unit_cost = total_cost / quantity`
      - `selling_price_per_unit = unit_cost + margin_per_unit` (margin derived from percentage, fixed-per-unit, or manual modes)
    - Support all calculation bases: `PER_UNIT`, `PER_BATCH`, `PER_HOUR`, `PERCENTAGE`, `FIXED`
    - Return `pricing_warnings: list[str]` — include warning if `selling_price_per_unit < unit_cost` or if margin falls below `shg.minimum_margin_percent`
    - No database access — pure function only
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ] 7.2 Write property tests for costing engine (Properties 3, 4, 5)
    - In `apps/api/tests/rules/test_costing_properties.py` with `@settings(max_examples=200)`:
    - **Property 3: Component totals are consistent** — `@given(valid list[CostComponent], quantity>0)` verify `total_cost == material + labour + overhead` and `|unit_cost × quantity - total_cost| ≤ 0.01`
    - **Property 4: Selling price formula holds for all margin modes** — `@given(cost_sheet_params, margin_mode in [percentage, fixed, manual])` verify `selling_price_per_unit == unit_cost + margin_per_unit`
    - **Property 5: Pricing warning when below cost** — `@given(any inputs where selling_price < unit_cost)` verify warning present; `@given(inputs where selling_price ≥ unit_cost and margin ≥ min_margin)` verify no warning
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ] 7.3 Implement Costing Service and endpoints
    - Create `modules/costing/router.py` with: `POST /orders/{order_id}/costing` (Leader): create cost sheet version 1; `POST /orders/{order_id}/costing/calculate` (Leader): run `rules/costing.py` and return result + warnings; `GET /orders/{order_id}/costing` (Leader): return latest cost sheet; `PATCH /orders/{order_id}/costing/{sheet_id}` (Leader): update and increment version number; emit audit event on create and update
    - _Requirements: 11.9, 11.10_

  - [ ] 7.4 Build Costing Sheet screen
    - Create `apps/web/src/features/costing/CostingSheetScreen.tsx`: dynamic `cost_components` table (add/remove rows), margin mode selector, calculated totals panel, warnings banner in amber when pricing is below cost or minimum margin
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 8. Phase 7 — Payout Calculation and Approval
  - Implement the deterministic payout engine, payout sheet lifecycle, approval workflow, and member privacy
  - _Requirements: 12_

  - [ ] 8.1 Implement `rules/payout.py` — pure payout engine
    - Write `calculate_payout_line(accepted_qty, rate, payment_basis: PER_PIECE|HOURLY, approved_hours=None) -> PayableAmount`:
      - `PER_PIECE`: `payable_amount = accepted_qty × rate`
      - `HOURLY`: `payable_amount = approved_hours × rate`
      - Any rework or rejected quantity contributes 0 to payable_amount
      - If `accepted_qty == 0`: `payable_amount = 0` regardless of other quantities
    - Write `calculate_payout_sheet(task_lines: list[TaskPayoutInput]) -> list[PayoutLine]` aggregating per-member
    - No database access — pure function only
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 8.2 Write property tests for payout engine (Properties 6 and 7)
    - In `apps/api/tests/rules/test_payout_properties.py` with `@settings(max_examples=200)`:
    - **Property 6: Payout correct for piece-rate** — `@given(accepted_qty ≥ 0, rate ≥ 0)` verify `payable_amount == accepted_qty × rate`; `@given(unit moved from accepted to rework)` verify `payable_amount` decreases proportionally
    - **Property 7: Non-accepted quantities never contribute** — `@given(accepted_qty=0, any rework_qty, any rejected_qty, any allocated_qty)` verify `payable_amount == 0`
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 8.3 Implement Payout Service — sheet creation and calculation
    - Create `modules/payouts/router.py` with: `POST /orders/{order_id}/payout/calculate` (Leader): run `rules/payout.py` over accepted tasks, persist `payout_sheet` (status `DRAFT`) and all `payout_lines`; `GET /orders/{order_id}/payout` (Leader): return full sheet; `GET /member/earnings` (Member): return only own `payout_lines` (RLS enforced)
    - Provide AI-generated plain-language explanation: `GET /orders/{order_id}/payout/explanation` calls `AI_Service.explain_payout()` per member line
    - _Requirements: 12.4, 12.5, 12.14_

  - [ ] 8.4 Implement payout approval workflow
    - Add `POST /orders/{order_id}/payout/submit` (Leader): transition `DRAFT → SUBMITTED`; emit audit event
    - Add `POST /orders/{order_id}/payout/{sheet_id}/approve` (Approver): transition `SUBMITTED → APPROVED`; require note; record `payout_approvals` row; emit audit event
    - Add `POST /orders/{order_id}/payout/{sheet_id}/reject` (Approver): transition `SUBMITTED → REJECTED`; require note; emit audit event
    - Add `POST /orders/{order_id}/payout/{sheet_id}/request-changes` (Approver): transition `SUBMITTED → CHANGES_REQUESTED`; require note; emit audit event
    - Guard: `DRAFT` status must never transition to `APPROVED` — return 409 if attempted
    - Guard: Approver cannot edit payout values directly — changes require Leader to recalculate
    - _Requirements: 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13_

  - [ ] 8.5 Write property test for payout approval (Property 8)
    - In `apps/api/tests/services/test_payout_service.py`:
    - **Property 8: Payout approval requires explicit action** — `@given(payout sheet in any status except APPROVED)` verify no `payout_approvals` row with `action=APPROVED` exists; `@given(approved payout sheet)` verify exactly one `payout_approvals` row with `action=APPROVED` exists
    - _Requirements: 12.10, 12.13_

  - [ ] 8.6 Build Payout screens
    - Create `apps/web/src/features/payouts/PayoutSheetScreen.tsx` (Leader view): member-wise table with quantity columns, rate, payable amount, voice explanation button per line, submit-for-approval button
    - Create `apps/web/src/features/payouts/ApprovalPanelScreen.tsx` (Approver view): payout summary, approve/reject/request-changes form with mandatory note field
    - Create `apps/web/src/features/payouts/MyEarningsScreen.tsx` (Member view): own payout line only, voice explanation, payment basis label
    - _Requirements: 12.4, 12.5, 12.7, 12.14_

  - [ ] 8.7 Write unit tests for Payout service
    - Test `submit` on `DRAFT` sheet transitions to `SUBMITTED`
    - Test `approve` on `DRAFT` sheet returns 409
    - Test Member `GET /member/earnings` returns only own payout line (not other members')
    - Test `request-changes` returns sheet to `CHANGES_REQUESTED` and emits audit event
    - _Requirements: 12.6, 12.9, 12.12, 12.13_

- [ ] 9. Checkpoint — Phases 3–7
  - Ensure allocation, costing, and payout property tests all pass (`uv run pytest apps/api/tests/rules`). Confirm complete order-to-payout flow works end-to-end. Ask the user if any adjustments are needed before the final phases.

- [ ] 10. Phase 8 — Buyer Delivery Record
  - Implement buyer-safe status timeline and delivery record endpoints
  - _Requirements: 13_

  - [ ] 10.1 Implement buyer-safe status timeline endpoint
    - Add `GET /buyer/orders/{order_id}/timeline` (Buyer): return array of `{ status, timestamp }` objects for every status transition; source from `audit_events` where `event_type IN (order_accepted, plan_confirmed, allocation_confirmed, ...)`
    - _Requirements: 13.1_

  - [ ] 10.2 Implement delivery record endpoint
    - Add `GET /buyer/orders/{order_id}/delivery` (Buyer): only available when order status is `READY` or `DELIVERED`; return product names, quantities, quality summary (`accepted_count / total_count`), delivery date
    - WHERE Leader has marked proof as buyer-visible (`proof_media.buyer_visible = true`): generate signed Supabase Storage read URL and include in response
    - Verify no member names, earnings, costs, or allocation data appear in response
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

  - [ ] 10.3 Build Buyer status and delivery screens
    - Create `apps/web/src/features/buyer/OrderTimelineScreen.tsx`: vertical timeline of status transitions with timestamps
    - Update `apps/web/src/features/buyer/OrderStatusScreen.tsx` to include delivery record panel when order is `READY`/`DELIVERED` and proof thumbnails where available
    - _Requirements: 13.1, 13.3, 13.4_

  - [ ] 10.4 Write unit tests for buyer delivery record
    - Test `GET /buyer/orders/{order_id}/delivery` returns 404 when status is `IN_PROGRESS`
    - Test response schema never includes `member_name`, `payable_amount`, `unit_cost`, or `allocation_score` fields
    - _Requirements: 13.3, 13.5_

- [ ] 11. Phase 9 — Notifications, Audit Trail Display, and Reports
  - Implement in-app notifications, delay detection, audit trail endpoint, and basic reports
  - _Requirements: 14, 17_

  - [ ] 11.1 Implement Notification_Service
    - Create `workers/notifications.py` with `create_notification(recipient_id, notification_type, title, body, entity_id)` inserting into `notifications` table
    - Call from: task rejection (notify Leader), quality decision (notify assigned Member), payout approval/rejection (notify Leader and each Member)
    - Add `GET /notifications` (all roles): return unread notifications for current user; `POST /notifications/{id}/read`: mark as read
    - _Requirements: 8.4, 14.1_

  - [ ] 11.2 Implement delay detection worker
    - Create `workers/delay_detection.py`: query tasks where `deadline < now()` and status not in `(SUBMITTED, REWORK, CANCELLED)`; call `create_notification` for each delayed task; run on a schedule (APScheduler or Celery beat — use APScheduler in-process for MVP)
    - _Requirements: 14.1_

  - [ ] 11.3 Implement audit trail endpoint
    - Add `GET /orders/{order_id}/audit` (Leader/Approver): return full `audit_events` for the order ordered by timestamp descending; RLS ensures cross-SHG isolation
    - Build `apps/web/src/features/orders/AuditTrailScreen.tsx`: timeline view of events with actor, timestamp, old/new values collapsible
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 11.4 Implement basic reports endpoint
    - Add `GET /reports/summary` (Leader): return JSON with `on_time_rate` (tasks completed before deadline / total tasks), `rejection_rate` (rejected_qty / total_qty), `total_earnings` (sum of approved payable amounts for SHG), `average_margin` (average margin % across completed cost sheets)
    - Build `apps/web/src/features/reports/ReportsScreen.tsx`: stat cards for each metric; Chakra UI `Stat` components
    - _Requirements: 14.1_

  - [ ] 11.5 Build Notifications panel
    - Create `apps/web/src/components/layout/NotificationPanel.tsx`: bell icon with unread badge in nav bar; dropdown list of notifications with mark-as-read on click
    - Subscribe to `notifications` table via Supabase Realtime for the current user
    - _Requirements: 17.1_

  - [ ] 11.6 Write unit tests for Notifications and Realtime fallback
    - Test task rejection creates a notification for the Leader
    - Test payout approval creates notifications for all payout line members
    - Test Realtime fallback: when `useRealtimeSubscription` receives an error event, verify `refetchInterval` polling is active on the linked TanStack Query
    - _Requirements: 8.4, 17.2_

  - [ ] 11.7 Write property test for RBAC (Property 10)
    - In `apps/api/tests/core/test_rbac_properties.py`:
    - **Property 10: RBAC rejects unauthorized roles** — `@given(endpoint from protected set, JWT with role not in authorized list)` assert response status == 403
    - _Requirements: 1.4_

- [ ] 12. Phase 10 — Demo Seed Data and Polish
  - Write deterministic seed script, run full end-to-end demo flow, and perform final QA
  - _Requirements: 15_

  - [ ] 12.1 Write deterministic seed script
    - Create `packages/database/seeds/demo_seed.py` using supabase-py with a fixed random seed for deterministic output
    - Seed: 1 SHG, 12 members with varied skills/capacities/availability; 1 Buyer; 1 order with 3 order items; production plan; task assignments; progress updates; photo proof records (use placeholder file paths)
    - Include: at least 1 rework case (quality decision `REWORK` + corrective task); 1 completed and approved cost sheet; 1 approved payout sheet with member-wise lines; audit events for every critical action
    - Label all `payable_amount` values with a `SIMULATED` marker in the notes field and render "SIMULATED" badge in all payout UIs
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

  - [ ] 12.2 Verify seed idempotency
    - Run `demo_seed.py` twice against the same database; assert row counts and primary key values are identical on both runs (use `ON CONFLICT DO NOTHING` with deterministic UUIDs derived from a namespace + fixed seed string)
    - _Requirements: 15.8_

  - [ ] 12.3 Run full order-to-payout smoke test
    - Write `apps/api/tests/integration/test_full_flow.py` using the seeded test Supabase project
    - Walk through: order creation → leader accept → plan confirm → allocation confirm → member accept task → progress update → proof upload → quality ACCEPTED → cost sheet calculate → payout calculate → payout submit → approver APPROVED
    - Assert order reaches `COMPLETED` status and payout sheet is `APPROVED`
    - _Requirements: 15.3, 15.6_

  - [ ] 12.4 Final QA on mobile and desktop viewports
    - Open each screen at 375px (mobile) and 1280px (desktop); fix any layout overflow, truncation, or tap-target issues using Chakra UI responsive props
    - Verify no console errors, unhandled promise rejections, or placeholder text in any seeded flow screen
    - _Requirements: 15.4_

  - [ ] 12.5 Add SIMULATED badge to all payout and earnings UIs
    - In `PayoutSheetScreen.tsx`, `ApprovalPanelScreen.tsx`, and `MyEarningsScreen.tsx`: render a yellow `SIMULATED` Chakra Badge next to every monetary amount when `is_demo = true` flag is present in the payout sheet
    - _Requirements: 15.9_

- [ ] 13. Final Checkpoint — Full Demo Flow
  - Ensure all tests pass (`pnpm lint && pnpm typecheck && uv run pytest && pnpm --filter web build`). Verify a judge can complete the full order-to-payout demo flow in under 3 minutes using seeded data. All payment amounts must display the SIMULATED badge.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they do not block functional completeness.
- The 10 Correctness Properties from the design map to PBT tasks 4.2, 4.9, 7.2, 8.2, 8.5, and 11.7 — run these after each deterministic engine is implemented.
- All secrets (Supabase keys, AI provider keys) must be stored in `.env` files only; `.env.example` files document required variables without values.
- Checkpoint tasks (3, 9, 13) are synchronization points — pause, verify tests pass, and confirm with the user before continuing to the next phase group.
- Phase 0 and Phase 1 are the critical path; every other phase depends on the monorepo and auth infrastructure being solid.
- The `rules/` package (allocation.py, costing.py, payout.py) must remain pure functions with no database access, making them independently testable and auditable.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1"] },
    { "id": 1, "tasks": ["0.2", "0.3"] },
    { "id": 2, "tasks": ["0.4", "0.5"] },
    { "id": 3, "tasks": ["0.6"] },
    { "id": 4, "tasks": ["0.7", "0.8", "0.9", "0.10", "0.11"] },
    { "id": 5, "tasks": ["1.1", "1.9"] },
    { "id": 6, "tasks": ["1.2"] },
    { "id": 7, "tasks": ["1.3", "1.4"] },
    { "id": 8, "tasks": ["1.5", "1.6"] },
    { "id": 9, "tasks": ["1.7", "1.8"] },
    { "id": 10, "tasks": ["1.10", "2.1"] },
    { "id": 11, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 12, "tasks": ["2.5"] },
    { "id": 13, "tasks": ["2.6", "2.7", "2.8"] },
    { "id": 14, "tasks": ["2.9"] },
    { "id": 15, "tasks": ["4.1"] },
    { "id": 16, "tasks": ["4.2", "4.3"] },
    { "id": 17, "tasks": ["4.4"] },
    { "id": 18, "tasks": ["4.5", "4.6"] },
    { "id": 19, "tasks": ["4.7", "4.9"] },
    { "id": 20, "tasks": ["4.8"] },
    { "id": 21, "tasks": ["5.1"] },
    { "id": 22, "tasks": ["5.2", "5.3"] },
    { "id": 23, "tasks": ["5.4", "5.5", "5.6", "5.8", "5.9"] },
    { "id": 24, "tasks": ["5.7"] },
    { "id": 25, "tasks": ["5.10"] },
    { "id": 26, "tasks": ["6.1"] },
    { "id": 27, "tasks": ["6.2"] },
    { "id": 28, "tasks": ["6.3", "6.4"] },
    { "id": 29, "tasks": ["6.5"] },
    { "id": 30, "tasks": ["6.6"] },
    { "id": 31, "tasks": ["7.1"] },
    { "id": 32, "tasks": ["7.2", "7.3"] },
    { "id": 33, "tasks": ["7.4"] },
    { "id": 34, "tasks": ["8.1"] },
    { "id": 35, "tasks": ["8.2", "8.3"] },
    { "id": 36, "tasks": ["8.4"] },
    { "id": 37, "tasks": ["8.5", "8.6"] },
    { "id": 38, "tasks": ["8.7"] },
    { "id": 39, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 40, "tasks": ["10.3", "10.4", "11.2", "11.3", "11.4"] },
    { "id": 41, "tasks": ["11.5"] },
    { "id": 42, "tasks": ["11.6", "11.7"] },
    { "id": 43, "tasks": ["12.1"] },
    { "id": 44, "tasks": ["12.2", "12.3"] },
    { "id": 45, "tasks": ["12.4", "12.5"] }
  ]
}
```
