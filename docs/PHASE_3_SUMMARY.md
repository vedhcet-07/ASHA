# Phase 3 — AI Production Planning & Fair Allocation Engine

**Status:** ✅ Complete  
**Branch:** `feat/phase-3-allocation`  
**Tests:** 105/105 passed (33 new + 72 from Phases 1–2)

---

## What was built

### Database (2 new migrations)

| File | Contents |
|---|---|
| `006_planning_and_tasks.sql` | `production_plans`, `plan_stages`, `tasks`, `task_assignments`, `ai_drafts` tables |
| `007_planning_rls.sql` | RLS: members see own tasks, leaders see all SHG tasks, AI drafts scoped to SHG |

### Backend — AI Adapter (provider-agnostic)

`app/ai/adapter.py` — single interface for all LLM providers:

| Provider | Config value |
|---|---|
| OpenAI | `AI_PROVIDER=openai` |
| Google Gemini | `AI_PROVIDER=gemini` |
| Groq | `AI_PROVIDER=groq` |
| Anthropic Claude | `AI_PROVIDER=anthropic` |
| Ollama (local) | `AI_PROVIDER=ollama` |

AI rules enforced:
- All AI output is a **DRAFT** — leader must confirm before anything becomes operational
- Invalid/empty AI output is discarded gracefully, never crashes the app
- AI never finalises allocation, cost, or payout

### Backend — Allocation Engine (`app/rules/allocation.py`)

Fully deterministic scoring (no AI):

| Factor | Weight | Rule |
|---|---|---|
| Skill match | 30% | Proficiency 1–5 scaled to 0–1 |
| Available capacity | 25% | Comfort ratio vs daily capacity |
| Availability | 20% | available=1.0, partial=0.5, unavailable=0.0 |
| Current workload | 15% | Inverse of workload/weekly_capacity ratio |
| Past quality | 10% | Composite of acceptance, rework, on-time rates |

**Bugs found and fixed by tests:**
1. Single-member capacity bypass — remainder logic now respects the capacity cap
2. Empty reason not validated — added `field_validator` to `AdjustAllocationRequest`

### Backend — 9 new API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/{id}/plan/generate` | Async AI plan generation (returns draft_id) |
| GET | `/orders/{id}/plan/drafts/{draft_id}` | Poll draft status |
| POST | `/orders/{id}/plan/confirm` | Leader confirms draft → creates plan + stages |
| GET | `/orders/{id}/plan` | Get confirmed production plan |
| POST | `/orders/{id}/allocation/propose` | Run deterministic allocation engine |
| POST | `/orders/{id}/allocation/confirm` | Leader confirms → creates task_assignments |
| PATCH | `/orders/{id}/allocation/adjust` | Adjust one member's quantity (reason required) |
| GET | `/orders/{id}/allocation/explanation` | AI-generated plain-language explanation |
| POST | `/orders/{id}/tasks/create-from-plan` | Create tasks from confirmed plan stages |

### Frontend — 2 new screens

| Screen | Description |
|---|---|
| Plan Review (`/leader/orders/:id/plan`) | Generate AI draft → review stages → confirm. Shows "AI proposes · You approve" badge. Polling until draft ready. |
| Allocation (`/leader/orders/:id/allocation`) | Select task → see scored member table → edit with reason → confirm |

Order detail now shows contextual action buttons:
- `REVIEWED` → "Generate production plan"
- `PLANNING` → "Propose allocation"

---

## Test results (Phase 3)

| Test group | Count |
|---|---|
| Allocation weights (sum, largest, keys) | 4 |
| Member scoring (skill, availability, workload, quality) | 6 |
| Allocation proposals (totals, edge cases, capacity) | 12 |
| Planning schema validation | 3 |
| Route registration (9 routes) | 9 |
| **Phase 3 subtotal** | **34** |
| Phase 1+2 carried forward | 72 |
| **Total** | **105/105 ✅** |

---

## Migrations to run in Supabase SQL Editor

Run in order after Phase 2 migrations:

**Migration 6:**
```sql
-- paste contents of packages/database/migrations/006_planning_and_tasks.sql
```

**Migration 7:**
```sql
-- paste contents of packages/database/migrations/007_planning_rls.sql
```
