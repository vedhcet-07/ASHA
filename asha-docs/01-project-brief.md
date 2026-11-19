# ASHA — Allocation, Shares & Honest Accounts

**Tagline:** Fair work. Clear costs. Trusted payouts.

ASHA is a voice-first, multilingual operations platform for women’s self-help groups (SHGs). It helps an SHG turn a bulk order into a fair work plan, track production with proof, calculate honest costs, and approve a transparent member-wise payout.

ASHA focuses on **internal SHG fulfilment operations**, not on becoming another product marketplace.

## Problem

Women’s self-help groups lose orders and member trust because fulfilment and payment are chaotic.

A bulk order may need to be split across 10–15 members. The leader coordinates work informally, members report progress manually, quality is checked late, costs are poorly recorded, and payments are estimated or split manually.

This creates:

- Delivery delays and uneven progress.
- Late discovery of defects and expensive rework.
- Underpricing because material, labour, overhead, and margin are not calculated consistently.
- Low trust because members cannot clearly verify what they earned.
- Excessive workload for the SHG leader.

## Product promise

Every member can see and hear her own record, and the group approves every payout.

ASHA makes the fulfilment process visible, fair, and explainable:

1. The leader creates a bulk order.
2. ASHA proposes a fair work allocation.
3. Members receive clear voice-first task instructions.
4. Members log progress and submit photo or voice-note proof.
5. Quality is reviewed and rework is recorded.
6. ASHA calculates material, labour, overhead, margin, and member-wise payout.
7. The group reviews and explicitly approves the payout.

## Core principle

**AI proposes. Rules calculate. Humans approve.**

LLMs may draft plans, explanations, reminders, and quality-review notes. However, allocation, costing, and payout calculations are deterministic code. AI never silently changes a task, quantity, price, or payout.

Every AI output is a draft. Every payout requires explicit group approval.

## Users

| Role | Purpose |
|---|---|
| SHG Leader | Primary user. Creates orders, reviews proposed plans, confirms work allocation, monitors progress, checks quality, and initiates payout. |
| SHG Member | Views or hears her own task, updates progress, submits proof, and sees her accepted quantity and expected share. |
| Group Approver / Treasurer | Reviews the payout sheet and gives the group’s explicit approval. May also be the leader in a small SHG. |
| Quality Checker | Optional role. Reviews submitted proof and accepts work or requests rework. |
| Buyer | Has a read-only order-status and delivery-record view. Cannot see internal member earnings. |
| Federation / NGO Staff | Optional oversight role. Views aggregate SHG performance without exposing private member financial details unless authorized. |

## MVP scope

The hackathon MVP supports:

- One SHG workspace.
- One active bulk order at a time.
- 10–15 members in the demo dataset.
- One complete order-to-payout cycle.
- English, Kannada, and Hindi language support.
- Voice-first member experience.
- Leader order intake by typing or speech.
- Member progress updates through large tap actions and optional voice notes.
- Photo proof for quality-sensitive work; video proof is optional.
- Buyer order-status and delivery-record view.
- Simulated payments only.

Completed orders remain viewable in order history, but the MVP optimizes for one active production cycle at a time.

## Voice-first approach

ASHA uses voice to reduce literacy and language barriers:

- **Leader:** Can type or speak order details. Speech input is converted into a structured draft for review.
- **Member:** Hears task details, progress prompts, and payout explanations through text-to-speech. Progress can be confirmed with large tap actions; a voice note is optional.
- **Approver:** Hears a plain-language payout summary and approves through an explicit action.
- **Languages:** English, Kannada, and Hindi are supported for UI labels, voice output, and member-facing explanations.

Speech recognition is not a hard dependency for every member action. Listening, simple visuals, and tap-based confirmation remain primary fallbacks.

## Demo outcomes

A successful 3-minute demo must show:

1. **Fair allocation:** ASHA proposes a work split using skill, availability, workload, and past performance. The leader can adjust and confirm the plan.
2. **Transparent costing:** The system shows material, labour, overhead, margin, and the resulting price.
3. **Quality and proof trail:** Members submit evidence; the checker reviews it; acceptance and rework decisions are recorded.
4. **Group-approved payout:** ASHA calculates each member’s share from accepted work and requires explicit approval before finalizing the payout.

## Non-goals

The following are intentionally out of scope for the MVP:

- Real payment-gateway integration or bank transfers.
- Marketplace listings, buyer discovery, or public product pages.
- Inventory and raw-material procurement management.
- Government-API integrations.
- Multi-SHG federation administration.
- Advanced analytics beyond basic operational reports.

These may be considered after the hackathon MVP, but they are not required for the core demo.

## Success criteria

ASHA is successful if a judge can follow one continuous flow:

- A bulk order becomes a fair and explainable work plan.
- A member understands her task without needing to read complex text.
- Proof and quality decisions create an auditable production record.
- A transparent cost breakdown and member-wise payout sheet are visible.
- A visible group approval action finalizes the payout.

## Guiding principles

- Design for low literacy first.
- Make every member’s record visible and audible to that member.
- Keep money calculations deterministic and auditable.
- Make AI assistance transparent, reviewable, and reversible.
- Require explicit human approval for payouts.
- Keep the interface simple, local-language friendly, and mobile-first.
- Use synthetic data for the hackathon demo and label all payments as simulated.
