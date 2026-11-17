# Phase 5 — Payout, Approval, Buyer Delivery & Demo Polish

**Status:** ✅ Complete  
**Branch:** `feat/phase-5-payout-polish`  
**Tests:** 186/186 passed (39 new + 147 from Phases 1–4)

---

## What was built

### Database (2 new migrations)

| File | Contents |
|---|---|
| `010_payouts.sql` | `payout_sheets`, `payout_lines`, `payout_approvals` tables with indexes |
| `011_payouts_rls.sql` | RLS: **members see ONLY their own payout line** (privacy core rule), leaders/approvers see full sheet |

### Backend — Payout Engine (`app/rules/payout.py`)

Deterministic calculation — no AI:

| Basis | Formula |
|---|---|
| PER_PIECE | `accepted_quantity × rate` |
| PER_HOUR | `approved_hours × hourly_rate` |
| FIXED | `rate` (flat) |

Rules enforced in code:
- Rework units → ₹0 until re-accepted
- Rejected units → ₹0 always
- Zero-rate warning generated
- Rework pending warning generated
- Zero total warning generated

### Backend — 12 new endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/{id}/payout/calculate` | Calculate member-wise payout (deterministic) |
| GET | `/orders/{id}/payout` | Full payout sheet (leader/approver) |
| GET | `/member/payouts/{id}` | **Member's own line only** |
| GET | `/member/earnings` | Member earnings summary |
| POST | `/orders/{id}/payout/submit` | Leader submits for approval |
| POST | `/orders/{id}/payout/approve` | **Explicit group approval** |
| POST | `/orders/{id}/payout/reject` | Approver rejects |
| POST | `/orders/{id}/payout/request-changes` | Approver requests revision |
| GET | `/orders/{id}/payout/explanation` | Plain-language + voice text |
| GET | `/reports/summary` | On-time, rejection, earnings summary |
| GET | `/notifications` | User notifications |
| POST | `/notifications/{id}/read` | Mark notification read |

### Frontend — 5 new screens

| Screen | Role | Description |
|---|---|---|
| Payout Sheet | Leader | Full member breakdown, submit for approval, SIMULATED badge |
| Approver Payout Review | Approver | Explicit approve/request-changes actions |
| My Earnings | Member | Own approved + pending earnings with voice playback |
| Buyer Delivery Record | Buyer | Delivery status, products, order value (no internal data) |
| Reports | Leader | Orders, quality rates, total approved payouts |

### End-to-end demo flow — fully connected

The complete order-to-payout cycle now works:

1. ✅ Buyer creates order
2. ✅ Leader accepts order
3. ✅ AI generates production plan draft
4. ✅ Leader confirms plan
5. ✅ Allocation engine proposes fair member split
6. ✅ Leader confirms allocation → tasks created
7. ✅ Member accepts task, updates progress, uploads photo proof
8. ✅ Checker/leader accepts work or requests rework
9. ✅ Leader enters costs → deterministic costing engine calculates price
10. ✅ Leader calculates payout sheet
11. ✅ Leader submits for group approval
12. ✅ Approver explicitly approves → order COMPLETED
13. ✅ Member sees only their own earnings
14. ✅ Buyer sees delivery record (no internal data)
15. ✅ Audit trail records every critical action

---

## Migrations to run in Supabase SQL Editor

**Migration 10** — `packages/database/migrations/010_payouts.sql`  
**Migration 11** — `packages/database/migrations/011_payouts_rls.sql`

---

## Test results (Phase 5)

| Test group | Count |
|---|---|
| Payout line calculations (10 cases) | 10 |
| Payout sheet calculations (9 cases) | 9 |
| Payout schema validation | 5 |
| Payout route registration (12 routes) | 12 |
| Approval business rules | 4 |
| **Phase 5 subtotal** | **40** |
| Phases 1–4 carried forward | 147 |
| **Total** | **186/186 ✅** |

---

## All phases complete

| Phase | Branch | Tests |
|---|---|---|
| Phase 1 — Foundation, Auth, SHG | `feat/phase-1-foundation` | 29 ✅ |
| Phase 2 — Orders & Buyer Flow | `feat/phase-2-orders` | +44 ✅ |
| Phase 3 — Planning & Allocation | `feat/phase-3-allocation` | +33 ✅ |
| Phase 4 — Tasks, Proof, Quality, Costing | `feat/phase-4-tasks-costing` | +42 ✅ |
| Phase 5 — Payout, Approval, Polish | `feat/phase-5-payout-polish` | +39 ✅ |
| **Total** | | **186/186 ✅** |
