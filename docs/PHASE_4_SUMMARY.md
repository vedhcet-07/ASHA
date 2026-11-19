# Phase 4 — Member Tasks, Progress, Proof, Quality & Costing

**Status:** ✅ Complete  
**Branch:** `feat/phase-4-tasks-costing`  
**Tests:** 147/147 passed (42 new + 105 from Phases 1–3)

---

## What was built

### Database (2 new migrations)

| File | Contents |
|---|---|
| `008_progress_quality_costing.sql` | `progress_updates`, `proof_media`, `quality_reviews`, `rework_tasks`, `cost_sheets`, `cost_components`, `notifications` |
| `009_progress_quality_rls.sql` | RLS: members see own progress/proof, leaders/checkers see all in SHG, cost sheets leader-only |

### Backend — 3 new modules

**Tasks module** (9 endpoints):
- Member: list tasks, task detail, accept, reject (reason required), progress update, proof upload URL, proof complete, voice text
- Leader: list all tasks for an order

**Quality module** (4 endpoints):
- Review queue (tasks with SUBMITTED/QUALITY_REVIEW status)
- Task with proof + review context
- Submit quality decision (ACCEPTED / REWORK / REJECTED)
- Create rework task from rejected task

**Costing module** (4 endpoints) + deterministic engine:
- Get cost sheet, create cost sheet, recalculate, get pricing warnings
- Pure calculation: material + labour + overhead + margin = selling price
- Supports: PER_UNIT, PER_BATCH, PER_HOUR, PERCENTAGE, FIXED basis
- Automatic pricing warnings when below cost or below SHG minimum margin

### Costing engine (`app/rules/costing.py`)

| Input | Formula |
|---|---|
| Material (PER_UNIT) | rate × quantity |
| Labour (PER_UNIT) | rate × quantity |
| Overhead (PERCENTAGE) | rate% × direct cost |
| Margin (PERCENTAGE) | margin% × total cost |
| Selling price | unit_cost + margin_per_unit |

### Frontend — 3 new screens

| Screen | Description |
|---|---|
| My Task (`/member`) | Voice playback, accept/reject, progress update, photo upload |
| Quality Queue (`/leader/quality`) | Card list of pending reviews, modal with ACCEPT/REWORK/REJECT decision |
| Costing Sheet (`/leader/orders/:id/costing`) | Live cost calculator with breakdown, warnings, selling price |

---

## Migrations to run in Supabase SQL Editor

Run in order after Phase 3 migrations.

**Migration 8** — `packages/database/migrations/008_progress_quality_costing.sql`  
**Migration 9** — `packages/database/migrations/009_progress_quality_rls.sql`

---

## Test results (Phase 4)

| Test group | Count |
|---|---|
| Costing calculations (14 cases) | 14 |
| Costing schema validation | 4 |
| Quality schema validation | 5 |
| Task routes (9 routes) | 9 |
| Quality routes (4 routes) | 4 |
| Costing routes (4 routes) | 4 |
| File upload validation | 1 |
| **Phase 4 subtotal** | **42** |
| Phases 1–3 carried forward | 105 |
| **Total** | **147/147 ✅** |
