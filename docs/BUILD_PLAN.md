# ASHA — Build Plan (5 Phases)

**Project:** ASHA — Allocation, Shares & Honest Accounts  
**Stack:** Turborepo + pnpm | React 18 + Vite + TypeScript | FastAPI + Python 3.11 | Supabase  
**Goal:** A hackathon-ready SHG order management platform — fair work, clear costs, trusted payouts.

---

## Overview

The project is broken into 5 phases. Each phase ends with a working, reviewable checkpoint. At the end of every phase, a summary `.md` file is added and code is pushed to GitHub (after your approval).

---

## Phase 1 — Foundation, Auth, and SHG Setup

**Goal:** Working monorepo skeleton, role-based auth, SHG creation, and member management.

### What gets built

#### Monorepo & Tooling
- Turborepo + pnpm workspace with `apps/web`, `apps/api`, and `packages/shared-types`, `packages/ui`, `packages/config`, `packages/database`
- TypeScript strict mode, ESLint, Prettier, Tailwind CSS configured
- Chakra UI set up in the web app
- FastAPI with Pydantic v2, CORS, and `/health` endpoint
- `.env.example` files for both apps
- GitHub Actions CI (lint → typecheck → backend tests → build)
- Root `README.md`

#### Authentication & Profiles
- Supabase Auth email/password signup and login
- `profiles` table with `full_name`, `role`, `preferred_language`
- Profile created automatically on first login
- Role selection screen (Leader / Member / Approver / Checker / Buyer)
- JWT validation in FastAPI via `GET /auth/me`

#### SHG & Member Management
- `shgs`, `shg_members`, `member_skills`, `member_availability` tables + migrations
- Leader can create an SHG and add up to 15 members
- Member profiles: skills, daily/weekly capacity, availability status
- Leader members list and member detail screens
- Role-based route guards (React Router protected routes)
- Row-Level Security policies for SHG isolation

#### Seed Data
- 1 SHG (Mahila Shakti SHG)
- 12 active members with realistic Indian names, skills, capacities, and availability
- 1 leader account, 1 member account, 1 approver account, 1 buyer account

#### UI Screens
- Login, Sign-up, Role selection
- Leader: Dashboard skeleton, Members list, Add/Edit member
- Member: My workspace (placeholder)
- Shared: Navbar/sidebar, language selector (English/Kannada/Hindi structure)

**Definition of done:**
- `pnpm dev` starts frontend (port 5173) and backend (port 8000)
- `/health` returns 200
- Leader can create SHG and add members
- Member logs in and sees only their workspace
- Role-based navigation works
- RLS prevents cross-SHG access
- CI passes (lint + typecheck + test + build)

---

## Phase 2 — Orders and Buyer Request Flow

**Goal:** Buyer can create an order; leader can review, accept, or reject it. Full order status lifecycle.

### What gets built

#### Database
- `buyers`, `orders`, `order_items` tables + migrations
- `order_status` enum with all statuses (REQUESTED → COMPLETED)
- Indexes for common queries

#### Backend APIs
- `POST /buyers/orders` — Buyer creates multi-product order
- `GET /buyers/orders` and `GET /buyers/orders/{id}` — Buyer views own orders
- `GET /orders` and `GET /orders/{id}` — Leader views SHG orders
- `POST /orders` — Leader creates order manually
- `POST /orders/{id}/accept` — Leader accepts buyer request
- `POST /orders/{id}/reject` — Leader rejects request
- `POST /orders/{id}/cancel` — Leader cancels order
- `GET /orders/{id}/timeline` — Order event timeline
- Audit events on every status change

#### Frontend Screens
- Buyer: Create order form (multi-product), My orders list, Order status timeline
- Leader: Orders list with filters, Order details, Accept/Reject actions
- Shared: Order status badge component, Timeline component

**Definition of done:**
- Buyer submits a multi-product order
- Leader accepts it and status transitions correctly
- Order timeline shows all status changes
- Buyer cannot see internal SHG data

---

## Phase 3 — AI Production Planning and Fair Allocation Engine

**Goal:** ASHA proposes a production plan with fair member-wise allocation. Leader reviews, adjusts, and confirms.

### What gets built

#### Database
- `production_plans`, `plan_stages`, `tasks`, `task_assignments`, `ai_drafts` tables + migrations
- `task_status` enum

#### Backend — AI & Planning
- Provider-agnostic AI adapter (OpenAI / Gemini / Groq / Ollama configurable via env)
- `POST /orders/{id}/plan/generate` — Async AI plan generation
- `GET /orders/{id}/plan/drafts/{draft_id}` — Poll draft status
- `POST /orders/{id}/plan/confirm` — Leader confirms plan

#### Backend — Allocation Engine
- Deterministic scoring: Skill match (30%) + Capacity (25%) + Availability (20%) + Workload (15%) + Quality history (10%)
- `POST /orders/{id}/allocation/propose` — Generate allocation
- `GET /orders/{id}/allocation/proposal` — View proposal
- `PATCH /orders/{id}/allocation/proposal` — Leader adjusts with reason
- `POST /orders/{id}/allocation/confirm` — Confirm, creates tasks
- `GET /orders/{id}/allocation/explanation` — Human-readable explanation

#### Frontend Screens
- AI plan review screen (draft → editable stages)
- Allocation proposal table (member | skill | capacity | quantity | score | reason)
- Leader override flow with reason picker
- Allocation confirmation screen
- Warnings for overload and deadline risks

**Definition of done:**
- ASHA generates an editable plan draft via LLM
- Allocation engine scores all members and proposes quantities
- Leader can adjust with a reason
- Confirmed allocation creates tasks assigned to members
- Audit events record every change

---

## Phase 4 — Member Tasks, Progress, Proof, Quality, and Costing

**Goal:** Members accept tasks, submit progress and photo proof. Quality is reviewed. Costs are calculated.

### What gets built

#### Database
- `progress_updates`, `proof_media`, `quality_reviews`, `rework_tasks` tables
- `cost_sheets`, `cost_components` tables
- `notifications` table

#### Backend — Tasks & Proof
- `GET /member/tasks` and `GET /member/tasks/{id}` — Member views tasks
- `POST /member/tasks/{id}/accept` and `reject` — Task acceptance
- `POST /member/tasks/{id}/progress` — Progress update
- `POST /member/tasks/{id}/proof/upload-url` and `/complete` — Photo proof via Supabase Storage signed URLs
- `GET /member/tasks/{id}/voice` — Voice text for TTS

#### Backend — Quality Review
- `GET /quality/review-queue` — Leader/checker review queue
- `POST /quality/tasks/{id}/review` — Accept / rework / reject decision
- `POST /quality/tasks/{id}/rework` — Create rework task
- AI-drafted rework notes (optional, leader confirms)

#### Backend — Costing Engine
- Deterministic calculation: material + labour + overhead + margin
- `POST /orders/{id}/cost-sheet` — Create cost sheet
- `PATCH /orders/{id}/cost-sheet/{id}` — Update inputs
- `POST /orders/{id}/cost-sheet/{id}/calculate` — Recalculate
- Pricing warnings if below cost or minimum margin

#### Frontend Screens
- Member: My Task (voice playback, progress bar), Task acceptance, Progress update, Photo upload
- Leader: Quality review queue, Review screen (photo gallery + decision + reason)
- Leader: Costing sheet (editable fields + calculated breakdown + warnings)
- Supabase Realtime subscriptions for live progress updates
- Web Speech API TTS for member task audio

**Definition of done:**
- Member accepts task, updates progress, uploads photo proof
- Leader/checker reviews proof and accepts or requests rework
- Rework creates a traceable task
- Costing sheet calculates unit cost, margin, and selling price with warnings
- Proof is permanently stored in Supabase Storage

---

## Phase 5 — Payout, Approval, Buyer Delivery, Reports, and Demo Polish

**Goal:** Member-wise payout calculated and group-approved. Buyer sees delivery record. Full demo flow works.

### What gets built

#### Database
- `payout_sheets`, `payout_lines`, `payout_approvals` tables
- `audit_events` finalized

#### Backend — Payout Engine
- Deterministic payout: accepted_quantity × rate (rework/rejected not paid)
- `POST /orders/{id}/payout/calculate` — Calculate payout sheet
- `GET /orders/{id}/payout` — Leader/approver view full sheet
- `GET /member/payouts/{id}` — Member sees only her own line
- `POST /orders/{id}/payout/submit` — Leader submits for approval
- `POST /orders/{id}/payout/approve` / `reject` / `request-changes` — Approver actions
- Payout explanation (voice text)

#### Backend — Buyer & Reports
- `GET /buyers/orders/{id}/status` — Buyer-safe order status
- `GET /buyers/orders/{id}/delivery-record` — Delivery record
- `GET /reports/summary` — On-time rate, rejection rate, earnings, margin
- `GET /orders/{id}/audit` — Full audit trail
- Notifications for key events (task assigned, payout ready, etc.)

#### Frontend Screens
- Payout sheet screen (leader + approver view)
- Approver payout approval flow (approve / reject / request changes)
- Member: My Earnings (own line only, voice explanation)
- Buyer: Order status timeline, Delivery record
- Leader: Audit trail, Basic reports dashboard
- Notification centre
- All payments labelled SIMULATED

#### Demo Polish
- Full seed dataset (1 SHG, 12 members, 1 buyer, 1 multi-product order, all stages completed)
- End-to-end demo flow walkthrough
- Mobile-responsive layout verified
- Empty states with illustrations
- Error states and loading skeletons throughout
- English fully implemented; i18n structure ready for Kannada/Hindi

**Definition of done:**
- Payout calculated from accepted work only
- Approver explicitly approves payout
- Member sees only her own earnings
- Buyer sees delivery record without internal data
- Full order-to-approved-payout flow works with seed data
- Audit trail shows every critical action
- CI passes; app deployable to Vercel + Supabase

---

## Tech Stack Summary

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm |
| Frontend | React 18 + Vite + TypeScript |
| UI | Chakra UI + custom shadcn-style components |
| Styling | Tailwind CSS |
| State | TanStack Query + Zustand |
| Forms | React Hook Form + Zod |
| Backend | FastAPI + Python 3.11 + Pydantic v2 |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Storage | Supabase Storage (private buckets) |
| Realtime | Supabase Realtime |
| AI | Provider-agnostic adapter (OpenAI / Gemini / Groq / Ollama) |
| Voice | Web Speech API (browser-native) |
| i18n | i18next + react-i18next |
| Deployment | Vercel + Supabase |
| CI/CD | GitHub Actions |

---

## Phase Completion Log

| Phase | Status | Branch | Completion Date |
|---|---|---|---|
| Phase 1 — Foundation, Auth & SHG | 🟡 In progress | `feat/phase-1-foundation` | — |
| Phase 2 — Orders & Buyer Flow | ⬜ Not started | `feat/phase-2-orders` | — |
| Phase 3 — Planning & Allocation | ⬜ Not started | `feat/phase-3-allocation` | — |
| Phase 4 — Tasks, Proof & Costing | ⬜ Not started | `feat/phase-4-tasks-costing` | — |
| Phase 5 — Payout, Delivery & Polish | ⬜ Not started | `feat/phase-5-payout-polish` | — |
