# Requirements Document

## Introduction

ASHA (Allocation, Shares & Honest Accounts) is a voice-first, multilingual operations platform for women's self-help groups (SHGs). It replaces informal WhatsApp coordination and manual notebooks with a transparent, end-to-end workflow that takes a bulk order from intake to group-approved, member-wise payout.

The platform is built as a Turborepo monorepo (React 18 + Vite frontend, FastAPI backend, Supabase PostgreSQL) and must demonstrate four outcomes for the Tech4Bharat 2026 hackathon: fair allocation, transparent costing, a quality-and-proof trail, and a group-approved payout.

ASHA operates on the principle: **AI proposes. Rules calculate. Humans approve.**

---

## Glossary

- **ASHA**: The platform itself — Allocation, Shares & Honest Accounts.
- **SHG**: A women's self-help group, the primary organisational unit.
- **Leader**: The SHG Leader role; primary operator of the platform.
- **Member**: An SHG Member; performs production tasks.
- **Approver**: The Group Approver / Treasurer role; explicitly approves payouts.
- **Checker**: The Quality Checker role; reviews submitted proof.
- **Buyer**: An external customer who places an order.
- **Federation_Staff**: Optional NGO/federation oversight role.
- **Auth_Service**: The module handling authentication, JWT validation, and role resolution.
- **SHG_Service**: The module managing SHG records, members, skills, and availability.
- **Order_Service**: The module managing buyer order requests, order items, and status transitions.
- **Planning_Service**: The module coordinating AI-assisted production-plan generation.
- **Allocation_Engine**: The deterministic module that scores and proposes fair member-wise work distribution.
- **Task_Service**: The module managing member tasks, acceptance, progress, and proof.
- **Quality_Service**: The module managing proof review, quality decisions, and rework.
- **Costing_Engine**: The deterministic module that calculates material, labour, overhead, margin, unit cost, and selling price.
- **Payout_Engine**: The deterministic module that calculates member-wise earnings from accepted work.
- **Audit_Service**: The module that records immutable business events.
- **AI_Service**: The provider-agnostic module that calls LLM providers and validates structured outputs.
- **Notification_Service**: The module that creates in-app notifications and voice reminders.
- **Voice_Interface**: The browser-native Web Speech API layer for speech input and text-to-speech output.
- **Proof**: Photo, video, or voice-note evidence submitted by a Member for quality review.
- **Allocation Score**: A weighted numeric score (0–1) used by the Allocation_Engine to rank members.
- **Rework**: A corrective task created when submitted work is found to need improvement.
- **Payout Sheet**: The document listing each Member's calculated earnings for an order.
- **Cost Sheet**: The document listing material, labour, overhead, margin, unit cost, and selling price for an order item.
- **Audit Event**: An immutable, append-only record of a critical business action.

---

## Requirements

### Requirement 1: Role-Based Authentication and Access Control

**User Story:** As a user of the ASHA platform, I want to sign up, log in, and operate within my assigned role, so that each person sees only the views and actions appropriate to their responsibility.

#### Acceptance Criteria

1. THE Auth_Service SHALL support email-and-password signup and login via Supabase Auth.
2. WHEN a user completes signup, THE Auth_Service SHALL create a profile record linking the Supabase Auth user to a role.
3. WHEN a user logs in, THE Auth_Service SHALL issue a JWT and resolve the user's active role and SHG membership.
4. THE Auth_Service SHALL enforce role-based access control for every API endpoint, returning HTTP 403 when a request does not match the required role.
5. WHEN a user's JWT is missing or invalid, THE Auth_Service SHALL return HTTP 401.
6. THE Auth_Service SHALL support the roles: `leader`, `member`, `approver`, `checker`, `buyer`, and `federation_staff`.
7. WHERE a user holds multiple roles, THE Auth_Service SHALL require the user to explicitly select an active role before accessing role-specific features.
8. THE SHG_Service SHALL enforce Supabase Row-Level Security so that a Member's queries return only records belonging to that Member's SHG.
9. THE Auth_Service SHALL store role and SHG-membership resolution server-side; the frontend SHALL use role data only for navigation and display, not for authorization.

---

### Requirement 2: SHG Setup and Member Profile Management

**User Story:** As a Leader, I want to create an SHG and manage member profiles with skills, capacity, and availability, so that the allocation engine has accurate data to propose fair work distribution.

#### Acceptance Criteria

1. THE SHG_Service SHALL allow a Leader to create an SHG with a name, district, state, and optional registration number.
2. THE SHG_Service SHALL allow a Leader to add up to 15 members per SHG for the MVP demo.
3. WHEN a Leader adds a member, THE SHG_Service SHALL require a member name and daily capacity value greater than zero.
4. THE SHG_Service SHALL allow a Leader to assign one or more skills to a member from the catalogue: `CUTTING`, `STITCHING`, `TAILORING`, `EMBROIDERY`, `PACKING`, `QUALITY_CHECK`, `DELIVERY`, `ACCOUNTING`, `OTHER`.
5. THE SHG_Service SHALL allow a Leader to set a proficiency level between 1 and 5 for each member skill.
6. THE SHG_Service SHALL allow a Leader to set a member's availability status to `available`, `partially_available`, or `unavailable`.
7. THE SHG_Service SHALL allow a Leader to record an availability window with a start date, end date, status, and optional reason.
8. THE SHG_Service SHALL maintain past performance metrics for each member: acceptance rate, rework rate, and on-time rate.
9. IF a Leader attempts to delete a member who has active tasks, THEN THE SHG_Service SHALL soft-delete the record and retain historical data.
10. THE SHG_Service SHALL enforce Row-Level Security so that only members of the same SHG can read member records.

---

### Requirement 3: Buyer Order Request

**User Story:** As a Buyer, I want to submit an order request with product details, quantities, and a deadline, so that the SHG can review and plan production.

#### Acceptance Criteria

1. THE Order_Service SHALL allow a Buyer to create an order request containing a title, required delivery date, delivery address, and at least one order item.
2. WHEN a Buyer creates an order request, THE Order_Service SHALL set the order status to `REQUESTED` and assign a unique order number.
3. THE Order_Service SHALL allow an order to contain one or more order items, each with a product name, quantity greater than zero, unit type, and optional specifications.
4. THE Order_Service SHALL allow a Buyer to view only orders associated with that Buyer's account.
5. THE Order_Service SHALL provide a Buyer with an order status page showing: order status, product list and quantities, expected delivery date, current production stage, completion percentage, and quality summary.
6. THE Order_Service SHALL prevent a Buyer from accessing individual member names, member earnings, internal cost breakdowns, or allocation details.

---

### Requirement 4: Leader Order Intake and Review

**User Story:** As a Leader, I want to review incoming buyer requests and create or edit orders manually with optional speech input, so that I can control what the SHG commits to producing.

#### Acceptance Criteria

1. THE Order_Service SHALL allow a Leader to list all orders for the SHG with their current status.
2. WHEN a Leader accepts a buyer order request, THE Order_Service SHALL transition the order status from `REQUESTED` to `REVIEWED`.
3. WHEN a Leader rejects a buyer order request, THE Order_Service SHALL transition the order status to `CANCELLED` and record the reason.
4. THE Order_Service SHALL allow a Leader to create an order directly without a prior buyer request.
5. THE Order_Service SHALL allow a Leader to edit order details — title, required date, delivery address, and order items — while the order is in `REQUESTED` or `REVIEWED` status.
6. WHERE the Voice_Interface is available in the browser, THE Order_Service SHALL accept speech input for order creation and present the transcribed result as an editable draft before submission.
7. THE Audit_Service SHALL record an audit event when an order is accepted, rejected, or cancelled, capturing the actor, timestamp, old status, new status, and reason.

---

### Requirement 5: AI-Assisted Production Plan

**User Story:** As a Leader, I want ASHA to draft a production plan with stages, tasks, and a timeline from order details, so that I have a structured starting point for work planning without building it from scratch.

#### Acceptance Criteria

1. WHEN a Leader triggers plan generation, THE Planning_Service SHALL call the AI_Service with a structured snapshot of the order, order items, and SHG member data.
2. THE AI_Service SHALL return a schema-validated JSON plan draft containing production stages, tasks, estimated durations, required skills per stage, and a proposed timeline.
3. IF the AI_Service returns an invalid or incomplete response, THEN THE Planning_Service SHALL mark the draft status as `INVALID` and return a descriptive error to the Leader.
4. THE Planning_Service SHALL store the AI draft with provider name, model identifier, prompt version, input snapshot, output, and status.
5. WHEN a valid plan draft is available, THE Leader SHALL be able to view, edit stages and tasks, and confirm the plan.
6. WHEN a Leader confirms a production plan, THE Planning_Service SHALL transition the order status to `ALLOCATION_PENDING` and record the confirming user and timestamp.
7. THE AI_Service SHALL NOT directly create task assignments, finalize allocation, or modify any financial record.
8. THE Audit_Service SHALL record an audit event when a production plan is confirmed.

---

### Requirement 6: Fair Allocation Engine

**User Story:** As a Leader, I want the system to propose a fair, transparent member-wise work allocation using a deterministic scoring model, so that work is distributed based on skill, capacity, and history — not informal judgement.

#### Acceptance Criteria

1. THE Allocation_Engine SHALL calculate an Allocation Score for each eligible member using the weighted formula: `(0.30 × Skill Score) + (0.25 × Capacity Score) + (0.20 × Availability Score) + (0.15 × Workload Score) + (0.10 × Quality Score)`.
2. THE Allocation_Engine SHALL assign a Skill Score of 0.0 to any member who does not possess the required skill for a task.
3. THE Allocation_Engine SHALL factor in a member's remaining daily capacity relative to the task's quantity when calculating the Capacity Score.
4. THE Allocation_Engine SHALL assign an Availability Score of 0.0 to any member whose availability status is `unavailable` during the task's planned window.
5. THE Allocation_Engine SHALL use the member's current pending workload across all active orders to calculate the Workload Score, penalising members with higher existing load.
6. THE Allocation_Engine SHALL use the member's past acceptance rate as the Quality Score input.
7. WHEN the Allocation_Engine produces a proposal, THE system SHALL return for each member: member name, task, allocated quantity, Allocation Score, and a human-readable list of reasons for the score.
8. WHEN no member has the required skill for a task, THE Allocation_Engine SHALL flag the skill gap and require the Leader to assign the task manually.
9. THE Allocation_Engine SHALL operate deterministically — the same inputs SHALL produce the same allocation proposal.

---

### Requirement 7: Leader Allocation Review and Override

**User Story:** As a Leader, I want to review the proposed allocation, adjust quantities, and confirm the plan — with every change recorded — so that I retain control while the system handles the fair-distribution logic.

#### Acceptance Criteria

1. THE Order_Service SHALL present the allocation proposal to the Leader with the proposed quantities, scores, and reasons for each member.
2. THE Order_Service SHALL allow a Leader to increase, decrease, or reassign allocated quantities before confirmation.
3. WHEN a Leader makes a material change to the proposed allocation, THE Order_Service SHALL require the Leader to provide a short reason for the change.
4. THE Order_Service SHALL store the original AI-proposed allocation, the final leader-confirmed allocation, the editor's identity, the timestamp, and the reason for every change.
5. IF a Leader's allocation change would create an overload or deadline risk for a member, THEN THE Order_Service SHALL display a warning but SHALL NOT block the confirmation.
6. WHEN a Leader confirms the allocation, THE Task_Service SHALL create individual task assignments for each member and transition the order status to `IN_PROGRESS`.
7. THE Audit_Service SHALL record an audit event for each allocation change, capturing old values, new values, actor, timestamp, and reason.
8. THE Audit_Service SHALL record an audit event when the allocation is confirmed.

---

### Requirement 8: Member Task Acceptance and Progress Tracking

**User Story:** As a Member, I want to view my assigned tasks, accept or reject them, and update my progress with photo proof, so that the Leader and quality team can track production in real time.

#### Acceptance Criteria

1. WHEN task assignments are created, THE Task_Service SHALL make each task visible only to the assigned Member.
2. THE Task_Service SHALL allow a Member to view task details including: product name, allocated quantity, required skill, deadline, instructions, and current status.
3. THE Task_Service SHALL allow a Member to accept or reject a task; a rejection SHALL require a reason.
4. WHEN a Member rejects a task, THE Notification_Service SHALL notify the Leader and THE Allocation_Engine SHALL suggest an alternative qualified member.
5. THE Task_Service SHALL allow a Member to submit progress updates containing a completed quantity and an optional text or voice note.
6. THE Task_Service SHALL allow a Member to upload photo proof for a task via a Supabase Storage signed URL flow.
7. WHEN a Member uploads proof, THE Task_Service SHALL store the file path, media type, file name, MIME type, file size, and uploader identity in the proof record.
8. THE Task_Service SHALL allow a Member to view her own completed quantity, accepted quantity, rework quantity, and expected payout for each task.
9. THE Task_Service SHALL prevent a Member from viewing another Member's task details or earnings.
10. WHILE a task is in `IN_PROGRESS` status, THE Task_Service SHALL accept progress updates from the assigned Member.

---

### Requirement 9: Voice-First Member Experience

**User Story:** As a Member, I want to hear my task details, deadlines, and payout explanation in my preferred language, so that I can participate fully in the workflow without needing to read complex text.

#### Acceptance Criteria

1. WHERE the Voice_Interface is available in the browser, THE Task_Service SHALL provide a voice text string for each task containing: product name, allocated quantity, deadline, and instructions.
2. THE Voice_Interface SHALL use the browser's `SpeechSynthesis` API to play back task details when a Member taps the play button.
3. THE Voice_Interface SHALL use the Member's selected preferred language for all speech output.
4. THE Payout_Engine SHALL provide a plain-language payout explanation string for each Member, suitable for text-to-speech playback.
5. WHERE the Voice_Interface is available, THE Order_Service SHALL accept speech input from a Leader for order creation using the browser's `SpeechRecognition` API and present the transcript as an editable draft.
6. THE Voice_Interface SHALL treat voice input and voice output as enhancements; every voice action SHALL have a tap-based fallback that completes the same workflow step.
7. THE i18n layer SHALL support English, Kannada, and Hindi for all UI labels, voice strings, task instructions, and payout explanations.

---

### Requirement 10: Quality Review, Acceptance, and Rework

**User Story:** As a Checker or Leader, I want to review submitted proof and record quality decisions — accept, rework, or reject — so that only verified work contributes to costing and payout.

#### Acceptance Criteria

1. THE Quality_Service SHALL present a review queue to the Checker and Leader containing all tasks in `SUBMITTED` status with their proof media.
2. THE Quality_Service SHALL allow a Checker or Leader to record a quality decision of `ACCEPTED`, `REWORK`, or `REJECTED` with a reviewed quantity and a mandatory reason.
3. WHEN a quality decision of `ACCEPTED` is recorded, THE Quality_Service SHALL increment the task's accepted quantity by the reviewed quantity and mark the work as payout-eligible.
4. WHEN a quality decision of `REWORK` is recorded, THE Quality_Service SHALL create a rework task defaulting to the original Member, transition the original task to `REWORK` status, and mark the rework quantity as not payable until re-accepted.
5. WHEN a quality decision of `REJECTED` is recorded, THE Quality_Service SHALL increment the rejected quantity, mark the work as not payable, and record the reason.
6. IF the original Member is unavailable for a rework task, THEN THE Allocation_Engine SHALL suggest an alternative qualified member and the Leader SHALL confirm any reassignment.
7. THE Quality_Service SHALL prevent a task from being marked accepted without at least one proof media record.
8. THE AI_Service SHALL be able to generate a draft quality-review note for the Checker's consideration; the Checker SHALL be able to edit or discard the AI draft before recording the final decision.
9. THE Audit_Service SHALL record an audit event for every quality decision, capturing decision, reviewed quantity, reason, reviewer identity, and timestamp.

---

### Requirement 11: Costing Engine

**User Story:** As a Leader, I want to enter material, labour, overhead, and margin inputs and see the system calculate unit cost and selling price with a full breakdown, so that pricing is transparent and the SHG avoids selling below cost.

#### Acceptance Criteria

1. THE Costing_Engine SHALL accept cost components in the following types: `MATERIAL`, `LABOUR`, `PACKAGING`, `TRANSPORT`, `UTILITIES`, `OTHER_OVERHEAD`.
2. THE Costing_Engine SHALL accept each component with a calculation basis of: `PER_UNIT`, `PER_BATCH`, `PER_HOUR`, `PERCENTAGE`, or `FIXED`.
3. THE Costing_Engine SHALL calculate total cost as: `Material Cost + Labour Cost + Overhead Cost`, where Overhead Cost includes packaging, transport, utilities, and other overhead.
4. THE Costing_Engine SHALL calculate unit cost as: `Total Cost ÷ Quantity`.
5. THE Costing_Engine SHALL support margin entry as a percentage of total cost, a fixed amount per unit, or a manually chosen selling price.
6. THE Costing_Engine SHALL calculate selling price as: `Unit Cost + Margin per unit`.
7. IF the calculated selling price is less than the unit cost, THEN THE Costing_Engine SHALL return a pricing warning.
8. IF the calculated margin falls below the SHG's configured minimum margin percentage, THEN THE Costing_Engine SHALL return a pricing warning.
9. THE Costing_Engine SHALL store every version of the cost sheet with a version number, component breakdown, all calculated values, and any warnings.
10. THE Audit_Service SHALL record an audit event when a cost sheet is created or updated, capturing the old and new calculated values and the actor.

---

### Requirement 12: Payout Calculation and Approval Workflow

**User Story:** As a Leader and Approver, I want the system to calculate each Member's earnings from accepted work and require an explicit group approval before the payout is finalized, so that every Member's share is transparent and collectively endorsed.

#### Acceptance Criteria

1. THE Payout_Engine SHALL calculate each Member's payable amount as: `Accepted Quantity × Agreed Piece Rate` for piece-rate tasks, or `Approved Hours × Hourly Rate` for hourly tasks.
2. THE Payout_Engine SHALL set payable amount to zero for any rework quantity until the corrected work is accepted.
3. THE Payout_Engine SHALL set payable amount to zero for any rejected quantity.
4. THE Payout_Engine SHALL produce a payout sheet with one line per Member showing: allocated quantity, completed quantity, accepted quantity, rework quantity, rejected quantity, rate, payment basis, and payable amount.
5. THE Payout_Engine SHALL provide a plain-language payout explanation for each Member.
6. WHEN a Leader submits the payout sheet for approval, THE Payout_Engine SHALL transition the payout status from `DRAFT` to `SUBMITTED`.
7. THE Order_Service SHALL allow an Approver to approve, reject, or request changes on a submitted payout sheet; each action SHALL require an explicit note.
8. WHEN an Approver approves the payout sheet, THE Payout_Engine SHALL transition the payout status to `APPROVED` and record the approver identity, timestamp, and note.
9. WHEN an Approver requests changes, THE Payout_Engine SHALL transition the payout status to `CHANGES_REQUESTED` and return the sheet to the Leader for revision.
10. THE Payout_Engine SHALL NOT allow automatic approval; every payout SHALL require an explicit Approver action.
11. THE Order_Service SHALL prevent an Approver from silently editing calculated payout values; changes SHALL require the Leader to update inputs and trigger a recalculation.
12. THE Audit_Service SHALL record an audit event for payout submission, approval, rejection, and each change request, capturing action, actor, timestamp, and note.
13. WHILE a payout sheet is in `DRAFT` status, THE Payout_Engine SHALL prevent an Approver from approving it.
14. THE Order_Service SHALL ensure a Member can view only her own payout line; the Member SHALL NOT be able to view other Members' individual earnings.

---

### Requirement 13: Buyer Delivery Record

**User Story:** As a Buyer, I want to track my order's production status and view the delivery record after completion, so that I have confidence in the SHG's delivery without seeing any internal member data.

#### Acceptance Criteria

1. THE Order_Service SHALL provide a Buyer with a status timeline showing each order status transition with the timestamp.
2. THE Order_Service SHALL provide a Buyer with an order completion percentage calculated from accepted quantity divided by total ordered quantity.
3. WHEN an order status is `READY` or `DELIVERED`, THE Order_Service SHALL provide a Buyer with a delivery record containing: product names, quantities, quality summary (accepted count and total count), and delivery date.
4. WHERE a Leader has explicitly marked proof media as buyer-visible, THE Order_Service SHALL provide the Buyer with access via a signed Supabase Storage URL.
5. THE Order_Service SHALL ensure that a Buyer-facing response never includes individual member names, member earnings, internal cost breakdowns, or allocation details.

---

### Requirement 14: Audit Trail

**User Story:** As a Leader or Approver, I want every critical business action to be recorded in an immutable audit trail, so that the SHG can verify decisions, track changes, and resolve disputes.

#### Acceptance Criteria

1. THE Audit_Service SHALL record an audit event for each of the following actions: order accepted, order rejected, order cancelled, production plan confirmed, allocation changed, allocation confirmed, task created, quality decision recorded, cost sheet created or updated, payout submitted, payout approved, payout rejected, and payout changes requested.
2. WHEN recording an audit event, THE Audit_Service SHALL capture: event type, entity type, entity ID, actor profile ID, SHG ID, order ID, old values, new values, reason, and timestamp.
3. THE Audit_Service SHALL store audit events in an append-only table; no audit event SHALL be updated or deleted through normal application access.
4. THE Order_Service SHALL provide a Leader or Approver with the full audit trail for a given order.
5. THE Audit_Service SHALL enforce Row-Level Security so that audit events for one SHG are not accessible to another SHG.

---

### Requirement 15: Demo Seed Data

**User Story:** As a hackathon judge, I want to view a fully pre-populated demo with realistic SHG data, so that I can follow the complete order-to-payout flow without manual data entry.

#### Acceptance Criteria

1. THE system SHALL provide a seed script that creates one SHG with 12 active members, varied skills, capacities, and availability statuses.
2. THE seed script SHALL create one Buyer and one multi-product order with at least three order items.
3. THE seed script SHALL create production stages, task assignments, progress updates, and photo proof records for all three order items.
4. THE seed script SHALL include at least one rework case where a quality decision of `REWORK` is recorded and a corrective task is created.
5. THE seed script SHALL create a completed cost sheet with component-level breakdown and calculated selling price.
6. THE seed script SHALL create a payout sheet with member-wise lines reflecting accepted work, with one approved payout.
7. THE seed script SHALL create audit events for every critical action in the seeded flow.
8. WHEN the seed script is executed, THE system SHALL produce deterministic data — the same seed SHALL produce the same records on every execution.
9. THE seed script SHALL label all payment amounts in the demo dataset as SIMULATED so that no record implies a real financial transfer.

---

### Requirement 16: Monorepo Setup and Infrastructure

**User Story:** As a developer, I want a fully configured Turborepo monorepo with CI, linting, typechecking, and a working Supabase connection, so that the team can build features quickly without infrastructure friction.

#### Acceptance Criteria

1. THE system SHALL use a Turborepo + pnpm workspace containing `apps/web` (React frontend), `apps/api` (FastAPI backend), and shared packages: `shared-types`, `ui`, `config`, and `database`.
2. THE system SHALL provide a `pnpm dev` command that starts both the frontend and backend concurrently.
3. THE FastAPI backend SHALL expose a `/health` endpoint that returns HTTP 200 and reports database connectivity status.
4. THE system SHALL configure GitHub Actions CI to run: pnpm install, frontend lint, TypeScript typecheck, backend Pytest tests, and frontend build — in that order.
5. THE system SHALL store all secrets (Supabase keys, AI provider keys, JWT secrets) in environment variables and SHALL NOT commit any secret value to source control.
6. THE system SHALL provide `.env.example` files for both `apps/web` and `apps/api` documenting every required variable.
7. THE system SHALL configure Supabase Row-Level Security for all user-facing tables before the first feature is deployed.
8. THE shared-types package SHALL export TypeScript types and Zod schemas for all core entities: Order, Task, Member, CostSheet, and PayoutSheet.

---

### Requirement 17: Real-Time Updates

**User Story:** As a Leader, I want the dashboard to update in real time when Members submit progress or when quality decisions are made, so that I can monitor production without refreshing the page.

#### Acceptance Criteria

1. THE system SHALL use Supabase Realtime subscriptions to push live updates to connected clients for the following events: member accepts or rejects a task, member submits a progress update or proof, a quality decision is recorded, a cost sheet is updated, a payout approval action is taken, and an order status changes.
2. WHEN a Supabase Realtime connection is unavailable, THE frontend SHALL fall back to TanStack Query refetching on window focus or a polling interval no shorter than 30 seconds.
3. THE Order_Service SHALL emit the minimum data necessary for the connected client's role in each realtime event, excluding fields that the recipient role is not authorized to view.

---

### Requirement 18: AI Provider Abstraction

**User Story:** As a developer, I want the AI layer to work with multiple LLM providers through a single adapter interface, so that the team can switch providers without rewriting business logic.

#### Acceptance Criteria

1. THE AI_Service SHALL implement a provider adapter interface with the following operations: `generate_production_plan`, `explain_allocation`, `draft_quality_note`, `explain_payout`, and `generate_member_message`.
2. THE AI_Service SHALL select the active provider from the `AI_PROVIDER` environment variable, supporting the values: `openai`, `gemini`, `anthropic`, `groq`, and `ollama`.
3. THE AI_Service SHALL validate all LLM responses against a predefined JSON schema before returning them to the calling module.
4. IF an LLM response fails schema validation, THEN THE AI_Service SHALL discard the output, log the error, and return a draft-with-errors response to the caller.
5. THE AI_Service SHALL store every AI draft with: provider, model, prompt version, input snapshot, raw output, validation status, and timestamp.
6. THE AI_Service SHALL NOT allow an LLM response to directly update allocation quantities, cost values, payout amounts, or approval status.
