# Phase 2 — Orders & Buyer Request Flow

**Status:** ✅ Complete  
**Branch:** `feat/phase-2-orders`  
**Tests:** 72/72 passed (43 new + 29 from Phase 1)

---

## What was built

### Database (2 new migrations)

| File | Contents |
|---|---|
| `004_buyers_and_orders.sql` | `buyers`, `orders`, `order_items`, `audit_events` tables with indexes and triggers |
| `005_orders_rls.sql` | RLS policies: buyers see own orders, leaders see SHG orders, buyers cannot see internal data |
| `seeds/02-orders-seed.sql` | Demo buyer (Ramesh Kumar), 1 multi-product order (100 tote bags, 50 jute pouches, 25 table runners) |

### Backend API (13 new endpoints)

#### Buyer endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/buyers/register` | Create/update buyer profile |
| POST | `/buyers/orders` | Buyer submits multi-product order |
| GET | `/buyers/orders` | Buyer lists their own orders |
| GET | `/buyers/orders/{id}` | Buyer-safe order view (no internal data) |
| GET | `/buyers/orders/{id}/status` | Public-safe order status + timeline |

#### Leader endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | List all SHG orders |
| POST | `/orders` | Leader creates order manually |
| GET | `/orders/{id}` | Full order detail |
| PATCH | `/orders/{id}` | Update order details |
| POST | `/orders/{id}/accept` | Accept buyer request (REQUESTED → REVIEWED) |
| POST | `/orders/{id}/reject` | Reject order (→ CANCELLED) with reason |
| POST | `/orders/{id}/cancel` | Cancel order |
| POST | `/orders/{id}/deliver` | Mark as delivered (READY → DELIVERED) |
| GET | `/orders/{id}/timeline` | Audit-based status timeline |
| GET | `/orders/{id}/audit` | Full audit trail |

#### Business rules implemented
- Deterministic status transition map — invalid transitions return `409 CONFLICT`
- Order numbers auto-generated: `ORD-YYYY-XXXXXX`
- Every status change writes an immutable audit event
- Buyer view strips `rejection_reason` and internal fields
- Leader-created orders start at `REVIEWED` (skip buyer request step)

### Frontend (5 new screens)

| Screen | Role | Description |
|---|---|---|
| Orders list | Leader | Filterable list with status badges, search, quick create |
| Create order | Leader | Multi-product form with dynamic product rows |
| Order detail | Leader | Status timeline, product table, accept/reject/deliver actions |
| Buyer create order | Buyer | Mobile-friendly order request form with success state |
| Buyer orders list | Buyer | Card list of own orders with status labels |
| Buyer order status | Buyer | Visual status timeline, product summary (no internal data) |

**Buyer privacy enforced:** buyer screens never show member names, earnings, internal costs, or allocation details.

---

## Test results (Phase 2)

| Test group | Count |
|---|---|
| Order number generation (uniqueness, format) | 3 |
| Status transition rules (valid/invalid paths) | 10 |
| Order item schema (quantity, name, defaults) | 7 |
| Create order schema (title, items, date) | 8 |
| Route registration (all 11 routes) | 11 |
| Buyer visibility rules | 2 |
| Buyer order validation edge cases | 3 |
| **Phase 2 subtotal** | **44** |
| Phase 1 carried forward | 29 |
| **Total** | **72/72 ✅** |

---

## How to run migrations

Apply in order in Supabase SQL Editor:
1. `packages/database/migrations/004_buyers_and_orders.sql`
2. `packages/database/migrations/005_orders_rls.sql`
3. `packages/database/seeds/02-orders-seed.sql` (optional demo data)

---

## What's next — Phase 3

**AI Production Planning & Fair Allocation Engine**
- Provider-agnostic AI adapter (OpenAI / Gemini / Groq)
- AI-assisted production plan generation (async draft → confirm)
- Deterministic allocation engine (skill 30% + capacity 25% + availability 20% + workload 15% + quality 10%)
- Leader allocation review, override with reason, confirmation
- Task creation from confirmed allocation
- Audit events for every allocation change
