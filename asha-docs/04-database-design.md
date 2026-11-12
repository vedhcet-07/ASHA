# ASHA — Database Design

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**Database:** Supabase PostgreSQL  
**Version:** v2.0  
**Status:** MVP database design  

## 1. Design principles

- Use UUID primary keys for all core tables.
- Use `created_at` and `updated_at` timestamps.
- Use PostgreSQL enums for stable business statuses.
- Use `NUMERIC(12,2)` for all INR monetary values.
- Use foreign keys with explicit delete behaviour.
- Use Row-Level Security (RLS) on every user-facing table.
- Use append-only audit events for critical business actions.
- Use JSONB only for AI output, metadata, and flexible settings—not for core financial values.
- Use soft deletion through `deleted_at` for core business records.
- Retain proof media permanently for auditability.

## 2. Entity relationship overview

```text
profiles ──< shg_members >── shgs
shgs ──< orders >── buyers
orders ──< order_items
orders ──< production_plans
production_plans ──< plan_stages
orders ──< tasks >── shg_members
tasks ──< task_assignments >── shg_members
tasks ──< progress_updates
tasks ──< proof_media
tasks ──< quality_reviews
tasks ──< rework_tasks
orders ──< cost_sheets
cost_sheets ──< cost_components
orders ──< payout_sheets
payout_sheets ──< payout_lines >── shg_members
payout_sheets ──< payout_approvals
orders ──< notifications
orders ──< audit_events
orders ──< ai_drafts
```

## 3. Enums

```sql
CREATE TYPE user_role AS ENUM (
  'leader',
  'member',
  'approver',
  'checker',
  'buyer',
  'federation_staff',
  'admin'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'partially_available',
  'unavailable'
);

CREATE ORDER order_status AS ENUM (
  'REQUESTED',
  'REVIEWED',
  'PLANNING',
  'ALLOCATION_PENDING',
  'IN_PROGRESS',
  'QUALITY_REVIEW',
  'REWORK',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE task_status AS ENUM (
  'PROPOSED',
  'ASSIGNED',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'QUALITY_REVIEW',
  'REWORK',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE quality_decision AS ENUM (
  'ACCEPTED',
  'REWORK',
  'REJECTED'
);

CREATE TYPE cost_component_type AS ENUM (
  'MATERIAL',
  'LABOUR',
  'PACKAGING',
  'TRANSPORT',
  'UTILITIES',
  'OTHER_OVERHEAD',
  'MARGIN'
);

CREATE TYPE payout_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED',
  'TASK_REMINDER',
  'DELAY_WARNING',
  'QUALITY_REVIEW_REQUIRED',
  'REWORK_REQUIRED',
  'PAYOUT_READY',
  'PAYOUT_APPROVED',
  'PAYOUT_CHANGES_REQUESTED'
);

CREATE TYPE ai_draft_status AS ENUM (
  'PENDING',
  'VALID',
  'INVALID',
  'REVIEWED',
  'DISCARDED'
);
```

## 4. Core tables

### 4.1 profiles

Stores application users linked to Supabase Auth.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.2 shgs

```sql
CREATE TABLE shgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  district TEXT,
  state TEXT,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  minimum_margin_percent NUMERIC(5,2) DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.3 shg_members

```sql
CREATE TABLE shg_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  member_name TEXT NOT NULL,
  phone_number TEXT,
  daily_capacity INTEGER NOT NULL DEFAULT 0,
  weekly_capacity INTEGER NOT NULL DEFAULT 0,
  availability_status availability_status NOT NULL DEFAULT 'available',
  past_acceptance_rate NUMERIC(5,2) DEFAULT 0,
  past_rework_rate NUMERIC(5,2) DEFAULT 0,
  past_on_time_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.4 member_skills

Uses a fixed skill catalogue.

```sql
CREATE TYPE member_skill AS ENUM (
  'CUTTING',
  'STITCHING',
  'TAILORING',
  'EMBROIDERY',
  'PACKING',
  'QUALITY_CHECK',
  'DELIVERY',
  'ACCOUNTING',
  'OTHER'
);

CREATE TABLE member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  skill member_skill NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shg_member_id, skill)
);
```

### 4.5 member_availability

Supports both simple status and date-based availability.

```sql
CREATE TABLE member_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  available_from DATE,
  available_to DATE,
  status availability_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.6 buyers

```sql
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  buyer_name TEXT NOT NULL,
  organization_name TEXT,
  phone_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.7 orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  order_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  required_by_date DATE NOT NULL,
  delivery_address TEXT,
  special_instructions TEXT,
  status order_status NOT NULL DEFAULT 'REQUESTED',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.8 order_items

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_type TEXT NOT NULL DEFAULT 'piece',
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  agreed_unit_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.9 production_plans

```sql
CREATE TABLE production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  planned_start_date DATE,
  planned_end_date DATE,
  summary TEXT,
  created_by_ai BOOLEAN NOT NULL DEFAULT false,
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.10 plan_stages

```sql
CREATE TABLE plan_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  requires_skill member_skill,
  planned_start_date DATE,
  planned_end_date DATE,
  is_quality_checkpoint BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.11 tasks

A task represents one member-stage-quantity combination.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  production_plan_id UUID REFERENCES production_plans(id) ON DELETE CASCADE,
  plan_stage_id UUID REFERENCES plan_stages(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('PIECE_BASED', 'STAGE_BASED')),
  required_skill member_skill,
  allocated_quantity INTEGER NOT NULL DEFAULT 0,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rework_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  status task_status NOT NULL DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.12 task_assignments

```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id UUID NOT NULL REFERENCES shg_members(id),
  allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity >= 0),
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rework_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  member_response TEXT CHECK (member_response IN ('ACCEPTED', 'REJECTED', 'PENDING')),
  response_reason TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.13 progress_updates

```sql
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id UUID NOT NULL REFERENCES shg_members(id),
  quantity_completed INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.14 proof_media

Proof media is retained permanently.

```sql
CREATE TABLE proof_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  progress_update_id UUID REFERENCES progress_updates(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('PHOTO', 'VIDEO', 'VOICE_NOTE')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES profiles(id),
  is_buyer_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.15 quality_reviews

```sql
CREATE TABLE quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES profiles(id),
  decision quality_decision NOT NULL,
  reviewed_quantity INTEGER NOT NULL,
  reason TEXT,
  ai_draft_note TEXT,
  ai_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.16 rework_tasks

```sql
CREATE TABLE rework_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rework_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reason TEXT,
  reassigned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.17 cost_sheets

```sql
CREATE TABLE cost_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  quantity INTEGER NOT NULL,
  material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  overhead_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_type TEXT NOT NULL DEFAULT 'PERCENTAGE'
    CHECK (margin_type IN ('PERCENTAGE', 'FIXED_PER_UNIT', 'MANUAL')),
  margin_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price_per_unit NUMERIC(12,2),
  total_selling_price NUMERIC(12,2),
  pricing_warning TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.18 cost_components

```sql
CREATE TABLE cost_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id UUID NOT NULL REFERENCES cost_sheets(id) ON DELETE CASCADE,
  component_type cost_component_type NOT NULL,
  label TEXT NOT NULL,
  calculation_basis TEXT NOT NULL CHECK (
    calculation_basis IN ('PER_UNIT', 'PER_BATCH', 'PER_HOUR', 'PERCENTAGE', 'FIXED')
  ),
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.19 payout_sheets

```sql
CREATE TABLE payout_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status payout_status NOT NULL DEFAULT 'DRAFT',
  total_payable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_accepted_quantity INTEGER NOT NULL DEFAULT 0,
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### 4.20 payout_lines

```sql
CREATE TABLE payout_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_sheet_id UUID NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  shg_member_id UUID NOT NULL REFERENCES shg_members(id),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  allocated_quantity INTEGER NOT NULL DEFAULT 0,
  completed_quantity INTEGER NOT NULL DEFAULT 0,
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rework_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  payment_basis TEXT NOT NULL DEFAULT 'PER_PIECE'
    CHECK (payment_basis IN ('PER_PIECE', 'PER_HOUR', 'FIXED')),
  rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  payable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.21 payout_approvals

```sql
CREATE TABLE payout_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_sheet_id UUID NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (
    action IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')
  ),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.22 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID REFERENCES shgs(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  recipient_profile_id UUID REFERENCES profiles(id),
  recipient_member_id UUID REFERENCES shg_members(id),
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  voice_text TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
```

### 4.23 audit_events

Audit events are append-only.

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID REFERENCES shgs(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.24 ai_drafts

```sql
CREATE TABLE ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  prompt_version TEXT,
  input_snapshot JSONB NOT NULL,
  output JSONB,
  status ai_draft_status NOT NULL DEFAULT 'PENDING',
  validation_errors JSONB,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5. Indexes

```sql
CREATE INDEX idx_shg_members_shg ON shg_members(shg_id);
CREATE INDEX idx_orders_shg ON orders(shg_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_tasks_order ON tasks(order_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_member ON task_assignments(shg_member_id);
CREATE INDEX idx_progress_updates_task ON progress_updates(task_id);
CREATE INDEX idx_proof_media_task ON proof_media(task_id);
CREATE INDEX idx_quality_reviews_task ON quality_reviews(task_id);
CREATE INDEX idx_cost_sheets_order ON cost_sheets(order_id);
CREATE INDEX idx_payout_sheets_order ON payout_sheets(order_id);
CREATE INDEX idx_payout_lines_sheet ON payout_lines(payout_sheet_id);
CREATE INDEX idx_payout_lines_member ON payout_lines(shg_member_id);
CREATE INDEX idx_audit_events_order ON audit_events(order_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
```

## 6. Row-Level Security

### 6.1 Helper functions

```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_shg_id()
RETURNS UUID AS $$
  SELECT shg_id
  FROM shg_members
  WHERE profile_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 6.2 Member task access

```sql
CREATE POLICY member_can_view_own_tasks
ON tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM task_assignments ta
    JOIN shg_members sm ON sm.id = ta.shg_member_id
    WHERE ta.task_id = tasks.id
      AND sm.profile_id = auth.uid()
  )
);
```

### 6.3 Leader access

```sql
CREATE POLICY leader_can_manage_shg_orders
ON orders
FOR ALL
USING (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);
```

### 6.4 Buyer access

```sql
CREATE POLICY buyer_can_view_own_orders
ON orders
FOR SELECT
USING (
  current_user_role() = 'buyer'
  AND buyer_id IN (
    SELECT id FROM buyers WHERE profile_id = auth.uid()
  )
);
```

### 6.5 Payout privacy

```sql
CREATE POLICY member_can_view_own_payout_line
ON payout_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM shg_members sm
    WHERE sm.id = payout_lines.shg_member_id
      AND sm.profile_id = auth.uid()
  )
);
```

## 7. Seed-data model

The demo seed should create:

- 1 SHG.
- 12 active members.
- 1 buyer.
- 1 multi-product order.
- 3 order items.
- Production stages: cutting, stitching, quality check, packing.
- 10–15 tasks.
- Progress updates and photo proof.
- At least one rework case.
- One completed cost sheet.
- One payout sheet with member-wise lines.
- One approved payout.
- Audit events for every critical action.

## 8. Data integrity rules

- An order must have at least one order item.
- Task allocated quantity cannot exceed the order-item quantity without an explicit override.
- Accepted quantity cannot exceed completed quantity.
- A task cannot be marked accepted without required proof.
- A payout line cannot exceed the accepted quantity multiplied by its rate.
- A payout sheet cannot be approved while its status is `DRAFT`.
- A quality review must have a decision and reviewer.
- Audit events cannot be updated or deleted through normal application access.

## 9. Demo-ready definition of done

The database design is demo-ready when:

- All core tables and relationships are created.
- Enums and constraints prevent invalid business states.
- RLS prevents cross-SHG and unauthorized member access.
- Seed data supports the full order-to-payout journey.
- The audit trail records every critical action.
- The payout model supports accepted quantity, rework, rejection, and approval.
