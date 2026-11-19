# ASHA — Product Specification

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Tagline:** Fair work. Clear costs. Trusted payouts.  
**Version:** v2.0  
**Status:** MVP specification for Tech4Bharat 2026  

## 1. Purpose

ASHA helps a women’s self-help group (SHG) manage a bulk order from intake to group-approved payout.

It replaces informal WhatsApp coordination, manual notebooks, and unclear payment splits with a transparent workflow:

1. Buyer or leader creates an order.
2. ASHA drafts a production plan.
3. The system proposes a fair allocation across members.
4. Members track progress and submit proof.
5. Quality is reviewed and rework is recorded.
6. ASHA calculates costs, selling price, and member-wise payout.
7. The group reviews and approves the payout.

ASHA is an internal SHG fulfilment and fair-pay platform. It is not a marketplace.

## 2. MVP goals

ASHA’s MVP must demonstrate four outcomes:

1. **Fair allocation** — work is distributed using transparent rules, not informal judgement.
2. **Transparent costing** — material, labour, overhead, margin, and selling price are visible.
3. **Quality and proof trail** — production evidence, quality decisions, and rework are auditable.
4. **Group-approved payout** — member earnings are calculated transparently and approved before finalization.

## 3. Non-goals

The MVP does not include:

- Real payment transfers or bank integrations.
- Public marketplace listings or buyer discovery.
- Inventory and raw-material procurement management.
- Government-API integrations.
- Multi-SHG federation administration.
- Advanced business intelligence or predictive analytics.

These may be added after the hackathon.

## 4. Users and permissions

ASHA uses one application with role-based access control.

| Role | Core permissions |
|---|---|
| SHG Leader | Create/edit orders, review production plans, confirm allocation, monitor progress, review quality, manage costing, initiate payout |
| SHG Member | View/hear own task, accept/reject assignment, update progress, upload proof, view own earnings |
| Group Approver / Treasurer | Review payout sheet, request changes, approve or reject payout |
| Quality Checker | Review proof, accept work, request rework; cannot change allocation or payout |
| Buyer | Create order request, view own order status and delivery record; cannot see member earnings |
| Federation / NGO Staff | Optional aggregate monitoring; no access to private member earnings unless explicitly authorized |

For the hackathon demo, the same person may hold both Leader and Approver roles, but the approval action must still be explicit.

## 5. Core entities

| Entity | Description |
|---|---|
| SHG | A self-help group with members, settings, and order history |
| Member | A person belonging to an SHG, with skills, capacity, availability, and performance data |
| Buyer | A customer or organization placing an order |
| Order | A buyer request containing one or more products, quantities, deadline, and delivery details |
| Order Item | A product line within an order, with quantity, specifications, and unit price |
| Production Plan | The proposed stages, tasks, timeline, and allocation for an order |
| Task | A unit of work assigned to one member, with quantity, stage, deadline, and status |
| Progress Update | A member-reported status, quantity completed, note, voice note, or photo proof |
| Quality Review | A checker/leader decision on submitted work: accepted, rework, or rejected |
| Cost Sheet | Material, labour, overhead, margin, unit cost, and selling-price calculation |
| Payout Sheet | Member-wise earnings based on accepted work and applicable rates |
| Payout Approval | The group’s explicit decision to approve, reject, or request changes |
| Audit Event | An immutable record of important actions and decisions |

## 6. Feature scope

### P0 — Must build for demo

| ID | Feature | Description |
|---|---|---|
| F01 | Role-based authentication | Members, leader, approver, checker, and buyer access role-appropriate views |
| F02 | SHG member profiles | Leader can add members with skills, daily capacity, availability, and past-performance rating |
| F03 | Buyer order request | Buyer can submit an order request with products, quantities, deadline, and instructions |
| F04 | Leader order intake | Leader can create or edit an order manually; speech input is optional |
| F05 | Multi-product orders | An order can contain one or more products, each with its own quantity and specification |
| F06 | AI-assisted production plan | ASHA drafts production stages, tasks, and a timeline from order details |
| F07 | Fair allocation engine | Deterministic rules propose allocation across members using skill, capacity, availability, workload, and quality history |
| F08 | Leader allocation review | Leader can adjust the proposed allocation; every material change is recorded with a reason |
| F09 | Member task acceptance | Member can accept or reject an assigned task with an optional reason |
| F10 | Member progress tracking | Member marks progress, enters completed quantity, and uploads photo proof |
| F11 | Voice-first member view | Member can listen to task details, deadline, progress prompt, and payout explanation |
| F12 | Quality review | Checker or leader reviews proof and marks work accepted, rework, or rejected |
| F13 | Rework tracking | Rejected work creates a rework task, preferably assigned to the same member unless unavailable |
| F14 | Costing engine | System calculates material, labour, overhead, margin, unit cost, and selling price |
| F15 | Pricing safeguards | System warns if selling price is below cost or below the selected minimum margin |
| F16 | Payout calculation | System calculates member-wise payout from accepted quantity and applicable rate |
| F17 | Payout approval | Approver reviews the payout sheet and explicitly approves, rejects, or requests changes |
| F18 | Buyer order tracking | Buyer sees order status, quantity, expected delivery date, and delivery record |
| F19 | Audit trail | Important allocation, quality, costing, and payout actions are logged |
| F20 | Demo seed data | Preloaded SHG, members, buyer, order, tasks, proofs, quality decisions, and payout data |

### P1 — Build if time permits

| ID | Feature | Description |
|---|---|---|
| F21 | Delay alerts | System flags tasks likely to miss deadline and suggests reallocation |
| F22 | Re-allocation suggestion | System proposes moving pending work from an overloaded or unavailable member |
| F23 | Basic reports | On-time rate, rejection rate, member earnings, group margin, and order status |
| F24 | Voice-note transcription | Converts member voice notes into text for the leader |
| F25 | Multi-order dashboard | Leader can manage multiple active orders |
| F26 | Federation dashboard | Aggregate performance across SHGs |
| F27 | Kannada and Hindi UI | Full localization beyond English |

### P2 — Post-hackathon

- Real payment gateway and bank transfer integration.
- Marketplace discovery and public buyer profiles.
- Inventory, raw-material procurement, and supplier management.
- Government-API integrations.
- Advanced analytics, forecasting, and credit-readiness insights.
- Offline-first mobile app.

## 7. Order model

An order may contain multiple products.

Example:

- 100 tote bags
- 50 jute pouches
- 25 table runners

Each product is an **order item** with:

- Product name
- Quantity
- Unit type, such as piece, dozen, or kg
- Specifications
- Deadline
- Buyer price, if known
- Production stages

Work can be divided in two ways:

- **By pieces:** A member is assigned a quantity, such as 20 bags.
- **By stages:** Work is divided into stages such as cutting, stitching, quality check, packing, and dispatch.

ASHA supports both models. A production plan may contain stage-based tasks, piece-based tasks, or both.

Example:

| Stage | Assigned to | Quantity | Deadline |
|---|---:|---:|---|
| Cutting | Member A | 40 pieces | Day 1 |
| Stitching | Member B | 30 pieces | Day 2 |
| Quality check | Checker | 100 pieces | Day 3 |
| Packing | Member C | 100 pieces | Day 3 |

## 8. Buyer order flow

1. Buyer creates an order request.
2. Buyer enters product details, quantity, deadline, delivery address, and special instructions.
3. ASHA creates the order with status `REQUESTED`.
4. Leader reviews the request.
5. Leader accepts, edits, or rejects the request.
6. Once accepted, ASHA creates a production plan draft.
7. Leader reviews and confirms the plan.
8. Members receive tasks.
9. Buyer can track order status but cannot see member-level earnings.

Order statuses:

| Status | Meaning |
|---|---|
| `REQUESTED` | Buyer has submitted an order |
| `REVIEWED` | Leader is reviewing the request |
| `PLANNING` | ASHA is drafting the production plan |
| `ALLOCATION_PENDING` | Allocation is proposed but not confirmed |
| `IN_PROGRESS` | Members have accepted tasks and production has started |
| `QUALITY_REVIEW` | Work is submitted for quality review |
| `REWORK` | Some work requires correction |
| `READY` | All accepted work is complete and ready for delivery |
| `DELIVERED` | Order has been marked delivered |
| `CANCELLED` | Order was cancelled |
| `COMPLETED` | Order is delivered and payout is approved |

## 9. Fair allocation rules

The allocation engine uses a transparent scoring model.

| Factor | Weight | Purpose |
|---|---:|---|
| Skill match | 30% | Prefer members with the required skill |
| Available capacity | 25% | Prefer members with enough remaining capacity |
| Availability | 20% | Avoid assigning work to unavailable members |
| Current workload | 15% | Avoid overloading members who already have pending work |
| Past quality | 10% | Favor members with consistently accepted work |

For each member:

\[
	ext{Allocation Score} =
(0.30 	imes 	ext{Skill Score}) +
(0.30 	imes 	ext{Capacity Score}) +
(0.20 	imes 	ext{Availability Score}) +
(0.15 	imes 	ext{Workload Score}) +
(0.10 	imes 	ext{Quality Score})
\]

The engine proposes an allocation, but the leader must confirm it.

### Leader override

The leader can change the proposed allocation.

- The leader may increase, decrease, or reassign quantity.
- The leader must provide a short reason for a material change.
- ASHA records the original proposal, final allocation, editor, timestamp, and reason.
- If the change creates an overload or deadline risk, ASHA shows a warning but does not block the leader.

## 10. Member task flow

1. Member receives a task.
2. Member listens to or reads the task.
3. Member accepts or rejects the task.
4. If accepted, member updates progress.
5. Member uploads photo proof.
6. Member may add an optional voice note.
7. Checker or leader reviews the work.
8. Accepted work moves to payout calculation.
9. Rejected work becomes rework.

A member can see:

- Her own allocated quantity.
- Deadline.
- Task instructions.
- Completed quantity.
- Accepted quantity.
- Rework quantity.
- Expected payout.
- Final approved payout, once approved.

A member cannot see another member’s individual earnings.

## 11. Quality rules

Quality review happens at two levels:

1. **Stage-level check:** Optional checkpoint after an important stage, such as cutting or stitching.
2. **Final batch check:** Required before an order can move to `READY`.

Photo proof is mandatory for quality-sensitive work. Video proof is optional.

Quality decisions:

| Decision | Meaning | Payout impact |
|---|---|---|
| Accepted | Work meets requirements | Eligible for payout |
| Rework | Work needs correction | Not payable until accepted |
| Rejected | Work cannot be corrected or does not meet requirements | Not payable |

The checker or leader records a short reason. The leader has the final authority in a disagreement.

For rework:

- Default assignee is the original member.
- If the original member is unavailable, ASHA suggests another qualified member.
- The leader confirms any reassignment.
- Rework quantity is not paid until it is accepted.

## 12. Costing rules

ASHA supports both internal costing and buyer pricing.

### Cost components

| Component | Input method |
|---|---|
| Material | Per unit or per batch |
| Labour | Per piece or per hour |
| Packaging | Per unit or per batch |
| Transport | Per order or per batch |
| Utilities | Per batch or percentage of direct cost |
| Other overhead | Fixed amount or percentage |
| Margin | Percentage or fixed amount per unit |

### Calculations

For each order item:

\[
	ext{Material Cost} = 	ext{Material Rate} 	imes 	ext{Quantity}
\]

\[
	ext{Labour Cost} =
(	ext{Piece Rate} 	imes 	ext{Quantity}) +
(	ext{Hourly Rate} 	imes 	ext{Hours})
\]

\[
	ext{Overhead Cost} =
	ext{Packaging} +
	ext{Transport} +
	ext{Utilities} +
	ext{Other Overhead}
\]

\[
	ext{Total Cost} =
	ext{Material Cost} +
	ext{Labour Cost} +
	ext{Overhead Cost}
\]

\[
	ext{Unit Cost} =
rac{	ext{Total Cost}}{	ext{Quantity}}
\]

\[
	ext{Selling Price} =
	ext{Unit Cost} +
	ext{Margin}
\]

Margin may be entered as:

- A percentage of total cost.
- A fixed amount per unit.
- A manually chosen final selling price.

ASHA shows a warning if:

\[
	ext{Selling Price} < 	ext{Unit Cost}
\]

or if the margin is below the SHG’s minimum acceptable margin.

## 13. Payout rules

The default payout basis is **accepted quantity**.

\[
	ext{Member Payout} =
	ext{Accepted Quantity} 	imes 	ext{Agreed Piece Rate}
\]

If labour is hourly:

\[
	ext{Member Payout} =
	ext{Approved Hours} 	imes 	ext{Hourly Rate}
\]

Rules:

- Rework is not paid until the corrected work is accepted.
- Rejected work is not paid.
- Partially accepted work is paid only for the accepted quantity.
- The payout sheet shows allocated quantity, completed quantity, accepted quantity, rework quantity, rate, and final payout.
- The approver can request changes but cannot silently edit the calculated payout.
- If changes are needed, the leader updates the inputs and ASHA recalculates the sheet.
- The payout becomes final only after explicit approval.

## 14. Payout approval flow

1. ASHA calculates the draft payout sheet.
2. Leader reviews the sheet.
3. Leader submits it for approval.
4. Approver reviews the member-wise breakdown.
5. Approver can:
   - Approve the payout.
   - Reject the payout.
   - Request changes with a note.
6. If changes are requested, the leader updates inputs and resubmits.
7. Once approved, the payout status becomes `APPROVED`.
8. ASHA records the approver, timestamp, and final calculated values.

The approval action must be explicit. There is no automatic approval.

## 15. Buyer visibility

The buyer sees:

- Order request status.
- Product and quantity.
- Expected delivery date.
- Current production stage.
- Completion percentage.
- Quality summary, such as “85 of 100 units accepted.”
- Delivery record after completion.
- Optional photos of finished goods.

The buyer does **not** see:

- Individual member names.
- Individual member earnings.
- Internal cost breakdown.
- Internal allocation details.

## 16. Voice-first experience

### Member experience

- Large, high-contrast action buttons.
- Minimal text.
- Audio playback for task details and payout explanation.
- One primary action per screen.
- Simple progress indicators.
- Photo upload with clear visual feedback.
- Optional voice note.

### Leader experience

- Order creation through form or speech.
- Allocation review with clear before/after comparison.
- Quality-review queue.
- Costing sheet with editable fields.
- Payout approval dashboard.
- Delay and risk indicators.

### Buyer experience

- Simple order creation form.
- Clear status timeline.
- Delivery record.
- No exposure to internal SHG financial details.

## 17. Localization

The MVP demo will use **English**.

The frontend must be built with an internationalization-ready structure so Kannada and Hindi can be enabled without rewriting screens.

Required localization scope:

- UI labels.
- Member task instructions.
- Status labels.
- Payout explanation.
- Quality-review messages.
- Notifications and reminders.

## 18. Edge cases

| Case | Expected behaviour |
|---|---|
| Member rejects task | Leader is notified; ASHA suggests an alternative qualified member |
| Member misses deadline | ASHA flags delay and suggests reallocation |
| Proof is missing | Task cannot be marked accepted |
| Quality is rejected | Rework task is created; original payout remains unpaid |
| Buyer cancels order | Order becomes `CANCELLED`; completed member work remains recorded |
| Cost exceeds selling price | ASHA shows a pricing warning |
| No member has required skill | ASHA flags skill gap and asks leader to assign manually |
| Approver requests changes | Payout returns to leader for revision; audit trail records the request |
| Order has multiple products | Each product has its own tasks, costing, and payout calculation |
| Member has no smartphone | Leader can update progress on behalf of the member, with an audit record |

## 19. Acceptance criteria

The MVP is complete when:

- A buyer can create an order request.
- A leader can review and accept the order.
- ASHA can generate a production-plan draft.
- The allocation engine can propose a fair member-wise allocation.
- The leader can review and override the allocation.
- A member can accept a task, update progress, and upload proof.
- A checker or leader can accept work or request rework.
- ASHA can calculate material, labour, overhead, margin, unit cost, and selling price.
- ASHA can calculate member-wise payout from accepted work.
- The approver can explicitly approve the payout.
- The buyer can view order status and delivery record.
- Every critical action is recorded in the audit trail.
- All payments are marked as simulated.

## 20. Demo-ready definition of done

A feature is demo-ready when:

- It works using seeded demo data.
- It has a clear primary user action.
- It produces a visible outcome in the UI.
- It respects role-based access.
- It records an audit event where required.
- It does not expose another member’s private earnings.
- It supports the end-to-end order-to-approved-payout flow.
