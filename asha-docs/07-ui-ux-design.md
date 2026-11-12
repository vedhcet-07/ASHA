# ASHA — UI/UX Design

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Version:** v2.0  
**Status:** MVP UI/UX specification  

## 1. Design direction

ASHA uses a **simple, WhatsApp-like interface** for members and a **clean dashboard interface** for leaders, approvers, checkers, and federation staff.

The member experience must feel familiar, calm, and easy to use. The leader experience must make pending actions, progress, quality issues, costs, and payout approval immediately visible.

### Design principles

- Mobile-first.
- Low-literacy friendly.
- One primary action per screen.
- Large tap targets.
- Clear visual status.
- Voice is always available through an explicit tap.
- Avoid dense forms and unnecessary text.
- Use illustrations for empty states.
- Make fairness, costing, and approval visible.
- Never expose one member’s earnings to another member.

## 2. Visual system

### Colour palette

| Token | Colour | Use |
|---|---|---|
| `primary.500` | `#0F766E` | Primary buttons, active states, brand accent |
| `primary.600` | `#115E59` | Hover and pressed states |
| `primary.50` | `#F0FDFA` | Light backgrounds and selected cards |
| `neutral.900` | `#111827` | Primary text |
| `neutral.600` | `#4B5563` | Secondary text |
| `neutral.100` | `#F3F4F6` | Cards, dividers, subtle backgrounds |
| `success.500` | `#16A34A` | Accepted work, completed tasks |
| `warning.500` | `#D97706` | Delay, rework, attention required |
| `danger.500` | `#DC2626` | Rejection, errors, critical alerts |
| `info.500` | `#2563EB` | Informational messages |

### Typography

| Usage | Font | Size |
|---|---|---|
| Page title | Inter | 24–28px |
| Section title | Inter | 18–20px |
| Body text | Inter | 16px |
| Member task text | Inter | 18–20px |
| Button text | Inter | 16–18px |
| Caption | Inter | 14px |
| Kannada | Noto Sans Kannada | Match surrounding scale |
| Hindi | Noto Sans Devanagari | Match surrounding scale |

### Shape and spacing

- Card radius: 16px.
- Button radius: 12px.
- Input radius: 12px.
- Base spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Minimum touch target: 48 x 48px.
- Minimum body font size: 16px.

## 3. Component system

Use **Chakra UI as the primary component and design-system layer**. Use shadcn/ui-style composable components for specialized product patterns.

| UI need | Component | Library |
|---|---|---|
| Buttons | `Button`, `IconButton` | Chakra UI |
| Forms | `FormControl`, `Input`, `Select`, `Textarea`, `NumberInput` | Chakra UI |
| Layout | `Stack`, `Grid`, `Container`, `SimpleGrid` | Chakra UI |
| Feedback | `Alert`, `Spinner`, `Toast`, `Skeleton` | Chakra UI |
| Navigation | `Tabs`, `Breadcrumb`, `Drawer`, `Menu` | Chakra UI |
| Cards | `OrderCard`, `TaskCard`, `MemberCard` | Custom shadcn-style |
| Status tracker | `OrderStatusTimeline` | Custom shadcn-style |
| Allocation table | `AllocationTable` | Custom shadcn-style |
| Payout sheet | `PayoutSheet` | Custom shadcn-style |
| Proof gallery | `ProofGallery` | Custom shadcn-style |
| Progress bar | `ProductionProgress` | Custom shadcn-style |
| Voice player | `VoicePlayer` | Custom |
| Empty state | `EmptyState` | Custom with illustration |
| Data table | `DataTable` | Custom shadcn-style with filters |

## 4. Navigation model

### Member navigation

Use a bottom navigation bar with four items:

1. My Task
2. My Orders
3. My Earnings
4. Profile

The member lands directly on **My Task**, with a large play button to hear the task.

### Leader navigation

Use a sidebar on desktop and a bottom navigation bar on mobile.

1. Dashboard
2. Orders
3. Members
4. Quality
5. Costing
6. Payouts
7. Reports
8. Settings

### Approver navigation

1. Payout Review
2. Approval History
3. Notifications

### Buyer navigation

1. Create Order
2. My Orders
3. Order Status
4. Profile

## 5. Screen inventory

### Shared screens

| Screen | Purpose |
|---|---|
| Login | Email/password login |
| Sign up | Create account |
| Role selection | Choose active role |
| Language selection | Choose English, Kannada, or Hindi |
| Notifications | View and mark notifications |
| Profile | View and edit profile |

### Leader screens

| Screen | Purpose |
|---|---|
| Leader dashboard | Pending actions, active order progress, delays, quality queue |
| Orders list | Filter and search orders |
| Order details | View order items, status, timeline, and actions |
| Create order | Manually create an order |
| AI plan review | Review AI-generated production plan |
| Allocation proposal | Review proposed member-wise allocation |
| Allocation confirmation | Confirm or adjust allocation |
| Progress dashboard | Track member progress and risks |
| Quality queue | Review submitted proof |
| Quality review | Accept, request rework, or reject work |
| Costing sheet | Enter and review costs, margin, and price |
| Payout sheet | Review member-wise payout |
| Audit trail | View critical order events |

### Member screens

| Screen | Purpose |
|---|---|
| My Task | Current assigned task with voice playback |
| Task details | Quantity, deadline, instructions, and status |
| Task acceptance | Accept or reject task |
| Progress update | Enter completed quantity and note |
| Proof upload | Upload photo or voice note |
| My earnings | View own accepted work and payout |
| Payout explanation | Hear/read payout calculation |

### Approver / checker screens

| Screen | Purpose |
|---|---|
| Payout review | Review member-wise payout sheet |
| Payout approval | Approve, reject, or request changes |
| Approval history | View past decisions |
| Proof-review queue | Review submitted proof |
| Proof review | Accept, rework, or reject work |

### Buyer screens

| Screen | Purpose |
|---|---|
| Create order | Submit order request |
| My orders | View buyer orders |
| Order status | Track production progress |
| Delivery record | View completed order details |

## 6. Member experience

### My Task screen

The member lands on **My Task**.

```text
┌──────────────────────────────┐
│  ASHA                         │
│  My Task                      │
├──────────────────────────────┤
│  Stitch 20 tote bags          │
│  Due: Friday                  │
│                               │
│  [ ▶ Listen to task ]         │
│                               │
│  Completed: 8 / 20            │
│  [██████░░░░░░░░]             │
│                               │
│  [ Update progress ]          │
│  [ Upload photo ]             │
└──────────────────────────────┘
```

Rules:

- Show one active task prominently.
- Use a large play button for voice.
- Show progress as a visual bar and simple fraction.
- Keep primary action above the fold.
- Require an explicit tap to play audio.
- Use simple labels: “My Task”, “Completed”, “Due”, “My Earnings”.

### Task acceptance

```text
┌──────────────────────────────┐
│  New task                     │
│  Stitch 20 tote bags          │
│  Due Friday                   │
│                               │
│  [ ▶ Listen ]                 │
│                               │
│  [ Accept task ]              │
│  [ Cannot do this task ]      │
└──────────────────────────────┘
```

If the member rejects the task, ask for a simple reason:

- Not available
- Do not have this skill
- Too much work
- Other

## 7. Leader dashboard

The leader dashboard has two priorities:

1. **Today’s pending actions**
2. **Active order progress**

```text
┌────────────────────────────────────────────┐
│  ASHA Dashboard                             │
├────────────────────────────────────────────┤
│  Pending actions        | Active order      │
│  • 3 proofs to review   | Festival bags      │
│  • 1 payout to approve  | 68 / 100 completed │
│  • 2 delay warnings     | [████████░░░░]     │
│                         | Due in 2 days      │
├────────────────────────────────────────────┤
│  [ Review quality ]  [ Review payout ]      │
└────────────────────────────────────────────┘
```

Dashboard widgets:

- Pending quality reviews.
- Pending payout approvals.
- Delayed tasks.
- Active order progress.
- Member workload.
- Rejection/rework rate.
- Group margin.

## 8. Allocation review

The allocation screen must make fairness visible.

```text
┌────────────────────────────────────────────┐
│  Proposed allocation                        │
├────────────────────────────────────────────┤
│  Member      Skill     Capacity   Quantity  │
│  Lakshmi     Stitching  High      25       │
│  Meena       Stitching  Medium    20       │
│  Radha       Packing    High      30       │
│  ...                                        │
├────────────────────────────────────────────┤
│  Total allocated: 100 / 100                 │
│  [ Edit allocation ]  [ Confirm ]           │
└────────────────────────────────────────────┘
```

Show:

- Member name.
- Skill match.
- Available capacity.
- Current workload.
- Proposed quantity.
- Allocation score.
- Simple reason for allocation.

If the leader changes allocation, require a short reason:

- Member is unavailable.
- Member has more experience.
- Member requested fewer units.
- Deadline risk.
- Other.

## 9. Quality review

The quality-review screen shows proof first, decision second.

```text
┌────────────────────────────────────────────┐
│  Review: Lakshmi’s stitching                │
├────────────────────────────────────────────┤
│  [Photo 1] [Photo 2] [Photo 3]              │
│                                             │
│  Completed: 10 / 20                         │
│  Submitted: 10                              │
│                                             │
│  [ Accept ]  [ Request rework ]  [ Reject ] │
└────────────────────────────────────────────┘
```

Rules:

- Photo proof is mandatory before acceptance.
- Show a short reason field for rework or rejection.
- AI may draft a rework note, but the checker/leader must confirm it.
- Rejected work creates a rework task.
- Rework is not payable until accepted.

## 10. Costing sheet

The costing sheet must show a clear breakdown.

```text
┌────────────────────────────────────────────┐
│  Costing — Canvas tote bag                  │
├────────────────────────────────────────────┤
│  Material           ₹45.00 per unit         │
│  Labour             ₹20.00 per unit         │
│  Packaging          ₹5.00 per unit          │
│  Transport          ₹3.00 per unit          │
│  Overhead           ₹2.00 per unit          │
│--------------------------------------------│
│  Total cost per unit     ₹75.00             │
│  Margin                  20%                │
│  Selling price per unit ₹90.00              │
│  Total order value       ₹9,000.00          │
└────────────────────────────────────────────┘
```

Rules:

- Material can be per unit or per batch.
- Labour can be per piece or per hour.
- Overheads can be fixed or percentage-based.
- Margin can be percentage, fixed per unit, or manual final price.
- Show a warning if selling price is below cost or below minimum margin.

## 11. Payout sheet

The payout sheet is the trust centre of ASHA.

```text
┌────────────────────────────────────────────┐
│  Payout sheet — Festival tote bags          │
├────────────────────────────────────────────┤
│  Member     Accepted   Rate     Payout      │
│  Lakshmi    18         ₹20      ₹360        │
│  Meena      15         ₹20      ₹300        │
│  Radha      20         ₹20      ₹400        │
│--------------------------------------------│
│  Total payable             ₹1,060           │
│                                            │
│  [ Submit for approval ]                    │
└────────────────────────────────────────────┘
```

Rules:

- Show accepted quantity, rework quantity, rejected quantity, rate, and payout.
- Rework and rejected work are not payable.
- Member sees only her own line.
- Approver sees the full sheet.
- Approval must be explicit.
- Changes requested by approver return the sheet to the leader.

## 12. Buyer tracking

The buyer sees a simple status timeline.

```text
┌────────────────────────────────────────────┐
│  Order: Festival tote bags                  │
├────────────────────────────────────────────┤
│  ● Requested                                │
│  ● Accepted                                 │
│  ● In production                            │
│  ○ Quality review                           │
│  ○ Ready                                    │
│  ○ Delivered                                │
│                                             │
│  Completed: 68 / 100                        │
│  Expected delivery: 1 Dec                   │
└────────────────────────────────────────────┘
```

The buyer cannot see:

- Member names.
- Member earnings.
- Internal cost breakdown.
- Internal allocation details.

## 13. Voice interaction rules

Voice always requires an explicit tap.

| Screen | Voice action |
|---|---|
| My Task | Play task details, quantity, deadline |
| Progress update | Play instructions |
| My earnings | Play expected or approved payout |
| Payout explanation | Play member-wise payout explanation |
| Quality review | Optionally read AI-drafted rework note |
| Notifications | Play notification text |

Voice copy must be short and concrete.

Example:

> “You have 20 bags to stitch. Complete them by Friday. Your expected payment is ₹400 after quality approval.”

## 14. Empty states

Use friendly illustrations and one clear action.

| Screen | Empty state |
|---|---|
| My Task | “No task assigned right now.” + illustration of a person resting |
| Orders | “No orders yet.” + illustration of a package |
| Quality queue | “No work waiting for review.” + illustration of checklist |
| Payouts | “No payout ready yet.” + illustration of coins |
| Notifications | “No new updates.” + illustration of bell |
| Buyer orders | “You have not placed an order yet.” + illustration of shopping bag |

## 15. Error states

| Error | Message |
|---|---|
| Network failure | “You are offline. Please check your internet connection.” |
| Upload failure | “Photo could not be uploaded. Please try again.” |
| Permission denied | “You do not have permission to view this.” |
| Invalid input | Show field-level message in selected language |
| AI failure | “ASHA could not prepare a suggestion. You can continue manually.” |
| Payout conflict | “This payout has already been updated. Please refresh.” |

## 16. Accessibility

- Minimum contrast ratio: 4.5:1 for body text.
- Minimum touch target: 48 x 48px.
- All icons have accessible labels.
- All form fields have visible labels.
- Voice playback has a visible pause/stop control.
- Status is conveyed through colour, icon, and text—not colour alone.
- Support keyboard navigation for leader/admin views.
- Support screen-reader labels for critical actions.

## 17. Demo personas

Use realistic Indian names in seed data.

| Persona | Role |
|---|---|
| Lakshmi | SHG leader |
| Meena | Member — stitching |
| Radha | Member — packing |
| Saraswati | Member — tailoring |
| Devi | Member — embroidery |
| Anitha | Member — quality check |
| Ramesh | Buyer |
| Priya | Federation staff |

## 18. Demo-ready definition of done

The UI/UX is demo-ready when:

- Member lands directly on My Task.
- Voice playback requires an explicit tap.
- Leader dashboard shows pending actions and active order progress.
- Allocation, costing, quality, and payout flows are visually clear.
- All primary actions have large tap targets.
- Empty states use illustrations.
- English is fully implemented.
- Kannada and Hindi localization structure is ready.
- Buyer cannot see member earnings or internal costs.
