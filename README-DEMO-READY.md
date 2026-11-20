# ASHA — Demo Submission Readiness

Team execution checklist for `vedhcet-07/ASHA`. Suggested repo location: `docs/README-DEMO-READY.md`. Keep the root README as the judge-facing entry point. This is a plan, not a claim that tests or deployment have passed.

P0 = release blocker. P1 = polish after the core flow passes. For each phase, record owner, commit SHA and verification evidence before checking it off.

## Phase 0 — Establish a reproducible baseline (P0)

- [ ] DevOps: start from a fresh clone and use the pnpm version pinned in root `package.json` (9.15.4). Run the gates below. Check the same commit in GitHub Actions. Diagnose lint/config failures before changing dependencies.
- [ ] DB: apply `packages/database/migrations/` in order to a disposable, synthetic-data-only Supabase project. Verify `01-demo-seed.sql` then `02-orders-seed.sql`; document exactly which accounts and checkpoints each creates. Rehearse reset twice; no duplicate orders/accounts. Never reset a real-data project.
- [ ] Backend: verify `/health`, then sign in and make a database-backed request; `/health` alone is not a database test.
- [ ] Frontend: confirm each seeded role lands on its own view. Confirm the Vercel frontend and API use the intended routes and environment variables. Keep service keys and provider secrets server-side.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
(cd apps/api && uv sync --locked && uv run pytest)
```

If the API does not have a usable committed lockfile, fix that before using the locked install as a release gate. Exit: another teammate can repeat setup and sign in.

## Phase 1 — Correct payout, authorization and delivery (P0)

Primary file: `apps/api/app/modules/payouts/router.py`. Check its migrations, order/delivery handlers, and `apps/api/tests/test_phase5.py` alongside it.

- [ ] Backend: replace unconditional `COMPLETED` on payout approval. Record delivery independently; only complete the order once both delivery and payout approval exist. Apply the same completion rule regardless of event order.
- [ ] Backend: require leader/approver access for the full payout sheet and explanation. Return only the member’s own breakdown through member endpoints. Scope report task and payout queries to the active SHG and permitted roles; verify database and storage policies as well as API responses.
- [ ] Backend/DB: use the same current-sheet, order/SHG and `SUBMITTED` checks for approve, reject and request changes. Commit the decision, status and audit record atomically. Make repeated requests safe; approved versions cannot be overwritten.
- [ ] Backend: reject missing rates for eligible work instead of silently omitting tasks. Use decimal arithmetic for INR. Aggregate one current pending version and one final approved version as applicable per order; do not count superseded drafts.
- [ ] Frontend: separate `Pending approval`, `Approved`, and `Delivered`. Keep `SIMULATED` beside money. Disable duplicate submits and show a refresh/retry message for stale decisions.
- [ ] Tests: approval before delivery does not produce a delivery record; delivery + approval completes the order; one decision per submitted sheet; approved rows cannot be modified; member sees only her own amounts; buyer sees only buyer-safe data; 18 accepted pieces × ₹20 = ₹360; recalculation does not double earnings.

Exit: backend tests and authorized role-account checks pass. Do not record before this phase passes.

## Phase 2 — Polish the judge-facing workflow (P0 first, P1 after)

Work under `apps/web`; locate the existing screens before editing. Avoid a UI rewrite.

| Screen | P0 change or check | P1 polish |
|---|---|---|
| Buyer order | Submit a seeded multi-item example; show success and an order link | Simplify form hints |
| Leader dashboard | Show active-order progress and the next pending action first; hide unfinished links | Add simple filters |
| Plan and allocation | Label AI output as draft; show item/stage, quantity and plain-language allocation reason; require override reason | Improve mobile card layout |
| My Task | Show quantity, due date, and tap-to-listen above the fold; keep readable text fallback; show proof upload success or retry | Polish illustrated empty state |
| Quality | Show proof first; show accepted/rework quantities and a reason the member can see | Improve proof preview |
| Costs and payout | Show material, labour, overhead and selling price; label percentage-on-cost as markup; show accepted quantity × rate and approval state | Improve table scanning |
| Buyer delivery | Show order milestones and the recorded delivery only; no internal earnings, costs or private proof | Add safe finished-goods imagery if already supported |

- [ ] Backend/integration: verify an AI-provider failure leaves manual planning usable; signed proof upload and review work end to end; verify one live cross-role progress update. If live sync is unreliable, expose Refresh and describe the limitation honestly.
- [ ] QA: test the actual phone/browser and presenter laptop. Check English audio starts only on tap, failed uploads can retry, dialogs close, and status/amounts are readable without horizontal scrolling on member screens.

Exit: complete the flow without database intervention; any seeded checkpoint used for the presentation is disclosed.

## Phase 3 — Deploy and write the judge-facing README (P0)

- [ ] Deploy the verified commit. In signed-out/private sessions, open the public URL, log in, refresh a nested route, upload/review proof, play voice and confirm buyer tracking. Verify `/docs` only if advertised.
- [ ] Use synthetic data and dedicated demo accounts for leader, member, checker, approver and buyer as needed. Share access instructions through the submission channel when possible; never publish non-demo credentials or secrets.
- [ ] Root `README.md`, in order: one-line ASHA pitch; live URL; backup video; judge access; four things to try (allocation, costing, proof/rework, payout approval); verified limitations; then local setup and troubleshooting.
- [ ] Replace the stale phase-status table with Implemented / Verified / Deferred. Link `docs/BUILD_PLAN.md`, document migration/seed order and exact tested commands, and remove unverified test counts. Fix `yourorg/asha` in root `package.json`.

Exit: a teammate who did not deploy the app can open the README and follow it without help.

## Phase 4 — Rehearse, record and submit (P0)

- [ ] 0:00–0:30: show the buyer order and leader opening it.
- [ ] 0:30–1:05: show the draft plan, rationale and leader-confirmed allocation.
- [ ] 1:05–1:45: show member audio, photo proof and a quality/rework decision.
- [ ] 1:45–2:30: show costing, member earning calculation and explicit approval by the approver.
- [ ] 2:30–3:00: show the member’s own earnings and the buyer’s recorded delivery. Close with “AI proposes. Rules calculate. Humans approve.”
- [ ] Use separate pre-signed-in browser profiles. Reset after rehearsal, record backup video and capture screenshots from the deployed build. Remove slide placeholders and duplicate slides. Verify portal slide/file/video limits and open every submitted link signed out.

## Final go/no-go

- [ ] Clean setup and CI pass for the deployed SHA.
- [ ] Four core outcomes work: allocation, costing, proof/rework, and explicit approval.
- [ ] No incorrect payout, premature delivery or cross-role disclosure.
- [ ] Live URL, access instructions, deck and backup video are ready.

Cut reports, federation views, full localization and cosmetic polish before cutting these gates.
