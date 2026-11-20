# Implementation Plan – Frontend‑Only Demo (Branch `demo/frontend‑only`)

## Goal
Create a self‑contained demo of the ASHA web app that runs entirely in the browser, **without any Supabase, FastAPI, or external credentials**. The demo must showcase the full buyer → leader → member → checker → approver → delivery flow using mock data and a deterministic mock API.

---

## 1. Repository Branch
```bash
# From the latest main
git checkout -b demo/frontend-only main
```
*All work for the demo stays on this branch; `main` remains unchanged.*

---

## 2. Directory Structure
```
apps/web/src/demo/
├── demoMock.ts          # Core mock data, state, and API surface
├── demoTypes.ts         # (optional) shared TypeScript types
├── DemoProvider.tsx     # React Context + state management
├── DemoModeBanner.tsx   # UI banner + role switcher + reset button
└── demoRouteGuard.tsx   # Route wrapper that forces demo mode
```
Only files inside `src/demo/` are added; all other directories are untouched.

---

## 3. Core Mock Implementation (`demoMock.ts`)
- **Seed data**: 1 SHG, 12 members (with skills, capacity, availability, quality), 1 buyer, 1 order (100 tote bags + 50 jute pouches).
- **State model** (`DemoState`):
  - `shg`, `members`, `buyer`, `orders`, `tasks`, `audit`, `notifications`.
  - Persisted to `localStorage` under key `asha-demo-state-v1` with a version field for migrations.
- **Deterministic helpers**:
  - Allocation scoring (skill 30 % + capacity 25 % + availability 20 % + workload 15 % + quality 10 %).
  - Costing and payout calculations (real formulas, warnings if price < cost).
- **Mock API surface** (`export const demoApi = { … }`):
  - `getDemoState`, `setRole`, `setActiveMember`
  - Order flow: `createOrder`, `generatePlanDraft`, `confirmPlan`
  - Allocation: `proposeAllocation`, `updateAllocation`, `confirmAllocation`
  - Task workflow: `acceptTask`, `rejectTask`, `addProgress`, `addProof`
  - Quality: `reviewQuality`, `createRework`
  - Financials: `calculateCostSheet`, `calculatePayout`, `submitPayout`, `approvePayout`, `rejectPayout`, `requestPayoutChanges`
  - Delivery: `markDelivered`
  - Utilities: `resetDemo`, `jumpToPayoutReview`, `getAuditTrail`, `getNotifications`
- **Reset & Checkpoint**:
  - `resetDemo()` restores the original seed.
  - `jumpToPayoutReview()` fast‑forwards the state to a mid‑flow checkpoint for demo presentations.
- **Audit helper**: `appendAudit(event: string)` called on every mutation.

---

## 4. Integration Points (Minimal Code Edits)
| File / Module | Change | Purpose |
|---|---|---|
| `apps/web/src/App.tsx` (or route entry) | Wrap the tree with `<DemoProvider>` and add `<DemoModeBanner/>`. | Provide global demo state and visual cue. |
| `apps/web/src/lib/api/*` | Add a guard: `if (import.meta.env.VITE_DEMO_MODE) return demoApi.<fn>();` otherwise use real fetch/Supabase client. | Switch between real and mock back‑ends. |
| `features/auth/*` | Bypass real login; expose a role selector UI (buyer, leader, member, checker, approver). | Enables demo users without Supabase. |
| Feature screens (`buyer`, `leader`, `member`, `checker`, `approver`, `payouts`, `delivery`, `audit`) | Replace direct HTTP calls with the corresponding `demoApi` functions. | Keeps UI identical while using mock data. |
| `vite.config.ts` | Add env flag `VITE_DEMO_MODE=true` for the demo branch (default `false` on main). | Simple activation via `.env` or branch config. |

---

## 5. Phased Development Timeline
| Phase | Scope | Estimated Effort |
|---|---|---|
| **A – Foundation** | Create branch, add `src/demo/` folder, scaffold `demoMock.ts` with types & seed, implement `DemoProvider` & `DemoModeBanner`. | 0.5 day |
| **B – Order Flow** | Wire buyer order creation → leader view → plan draft generation & confirmation. | 0.5 day |
| **C – Allocation Engine** | Implement deterministic scoring, `proposeAllocation` UI, confirm → task creation. | 0.5 day |
| **D – Member Tasks** | Accept task, add progress, upload (mock) proof, view own earnings. | 0.5 day |
| **E – Quality & Rework** | Review queue, accept/rework logic, audit trail updates. | 0.5 day |
| **F – Costing & Payout** | Cost sheet UI, payout calculation, submit/approve/reject flow. | 0.5 day |
| **G – Delivery & Polish** | Mark delivery, buyer delivery view, checkpoint (`jumpToPayoutReview`), final UI polish. | 0.5 day |
| **H – CI / Safeguards** | Add CI check that `VITE_DEMO_MODE` is *not* enabled on `main`, unit tests for `demoMock.ts`. | 0.25 day |

_Total ≈ 3.25 days (≈ 1 week including review)._

---

## 6. Testing Checklist (Manual + Automated)
- ✅ Build passes with `VITE_DEMO_MODE=true` and without any `.env` keys.
- ✅ Refresh preserves demo state; `resetDemo()` restores seed.
- ✅ Role switch persists across navigation.
- ✅ End‑to‑end buyer → leader → member → checker → approver → delivery flow works (under 3 min).
- ✅ All mock API functions return expected shapes and HTTP‑like status codes.
- ✅ Audit trail logs every significant action.
- ✅ UI shows `DemoModeBanner` with clear indication.
- ✅ CI fails if demo flag is present on `main`.

---

## 7. Deployment
- **Vercel preview**: connect the `demo/frontend-only` branch to a new Vercel project.
- **Env**: No Supabase keys required; only `VITE_DEMO_MODE=true`.
- **URL**: `<project>.vercel.app` (preview) – shareable for stakeholders.

---

## 8. Documentation Updates
- Add a **Demo section** to `README-DEMO-READY.md` with:
  - Branch name and checkout instructions.
  - How to start the dev server (`pnpm dev` automatically picks up demo mode).
  - Where the `.env` values live (still in the repo root; not used in demo). 
- Link to this implementation plan file for future contributors.

---

## 9. Acceptance Criteria
- A developer can **clone the repo, checkout the demo branch, run `pnpm dev`**, and explore the full ASHA workflow without any backend services.
- All **192 existing test cases** still pass (they run against the real backend; the demo branch does not affect them).
- The **demo mode flag** is clearly visible in the UI and **cannot be mistakenly enabled on production**.
- The **branch can be merged** back into `main` later (demo code stays isolated in `src/demo/`).

---

*Prepared by Antigravity on 2026‑11‑20.*

