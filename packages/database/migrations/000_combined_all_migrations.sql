-- Migration 001: Create all enums
-- Run this first before creating any tables.

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

CREATE TYPE order_status AS ENUM (
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
-- Migration 002: Profiles, SHGs, and Members
-- Requires: 001_enums.sql

-- ─────────────────────────────────────
-- profiles
-- ─────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'member',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- shgs
-- ─────────────────────────────────────
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

CREATE TRIGGER shgs_updated_at
  BEFORE UPDATE ON shgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- shg_members
-- ─────────────────────────────────────
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

CREATE TRIGGER shg_members_updated_at
  BEFORE UPDATE ON shg_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- member_skills
-- ─────────────────────────────────────
CREATE TABLE member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  skill member_skill NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shg_member_id, skill)
);

-- ─────────────────────────────────────
-- member_availability
-- ─────────────────────────────────────
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

CREATE TRIGGER member_availability_updated_at
  BEFORE UPDATE ON member_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_shg_members_shg ON shg_members(shg_id);
CREATE INDEX idx_shg_members_profile ON shg_members(profile_id);
CREATE INDEX idx_member_skills_member ON member_skills(shg_member_id);
-- Migration 003: Row-Level Security policies for auth, SHG, and member tables

-- ─────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shg_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_shg_id()
RETURNS UUID AS $$
  SELECT shg_id
  FROM shg_members
  WHERE profile_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_shg_leader()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'leader';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─────────────────────────────────────
-- profiles policies
-- ─────────────────────────────────────

-- Users can read their own profile
CREATE POLICY profiles_select_own
ON profiles FOR SELECT
USING (id = auth.uid());

-- Leaders can read profiles of members in their SHG
CREATE POLICY profiles_select_shg_leader
ON profiles FOR SELECT
USING (
  current_user_role() = 'leader'
  AND id IN (
    SELECT profile_id FROM shg_members
    WHERE shg_id = current_user_shg_id()
      AND deleted_at IS NULL
  )
);

-- Users can update their own profile
CREATE POLICY profiles_update_own
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on first login)
CREATE POLICY profiles_insert_own
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────
-- shgs policies
-- ─────────────────────────────────────

-- Leaders can read their own SHG
CREATE POLICY shgs_select_member
ON shgs FOR SELECT
USING (id = current_user_shg_id());

-- Leaders can update their SHG
CREATE POLICY shgs_update_leader
ON shgs FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND id = current_user_shg_id()
);

-- Leaders can create an SHG
CREATE POLICY shgs_insert_leader
ON shgs FOR INSERT
WITH CHECK (current_user_role() = 'leader' OR current_user_role() = 'admin');

-- ─────────────────────────────────────
-- shg_members policies
-- ─────────────────────────────────────

-- Members can read all members in their SHG (for collaboration awareness)
CREATE POLICY shg_members_select_shg
ON shg_members FOR SELECT
USING (shg_id = current_user_shg_id());

-- Leaders can insert members
CREATE POLICY shg_members_insert_leader
ON shg_members FOR INSERT
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- Leaders can update members
CREATE POLICY shg_members_update_leader
ON shg_members FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- ─────────────────────────────────────
-- member_skills policies
-- ─────────────────────────────────────

-- SHG members can read skills for their SHG
CREATE POLICY member_skills_select_shg
ON member_skills FOR SELECT
USING (
  shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

-- Leaders can manage skills
CREATE POLICY member_skills_manage_leader
ON member_skills FOR ALL
USING (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

-- ─────────────────────────────────────
-- member_availability policies
-- ─────────────────────────────────────

CREATE POLICY member_availability_select_shg
ON member_availability FOR SELECT
USING (
  shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

CREATE POLICY member_availability_manage_leader
ON member_availability FOR ALL
USING (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);
-- Migration 004: Buyers, Orders, and Order Items
-- Requires: 001_enums.sql, 002_profiles_and_shg.sql

-- ─────────────────────────────────────
-- buyers
-- ─────────────────────────────────────
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

CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- orders
-- ─────────────────────────────────────
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
  rejection_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- order_items
-- ─────────────────────────────────────
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

CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- audit_events (needed for order actions)
-- ─────────────────────────────────────
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

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_orders_shg      ON orders(shg_id);
CREATE INDEX idx_orders_buyer    ON orders(buyer_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_audit_order     ON audit_events(order_id);
CREATE INDEX idx_audit_created   ON audit_events(created_at DESC);
-- Migration 005: RLS policies for buyers, orders, order_items, audit_events

ALTER TABLE buyers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────
-- buyers
-- ─────────────────────────────────────

-- Buyers can read their own record
CREATE POLICY buyers_select_own
ON buyers FOR SELECT
USING (profile_id = auth.uid());

-- Leaders can read all buyers who placed orders with their SHG
CREATE POLICY buyers_select_leader
ON buyers FOR SELECT
USING (
  current_user_role() = 'leader'
  AND id IN (
    SELECT buyer_id FROM orders WHERE shg_id = current_user_shg_id()
  )
);

-- Buyers can insert their own record
CREATE POLICY buyers_insert_own
ON buyers FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- ─────────────────────────────────────
-- orders
-- ─────────────────────────────────────

-- Buyers can read their own orders
CREATE POLICY orders_select_buyer
ON orders FOR SELECT
USING (
  current_user_role() = 'buyer'
  AND buyer_id IN (
    SELECT id FROM buyers WHERE profile_id = auth.uid()
  )
);

-- SHG members (all roles) can read orders belonging to their SHG
CREATE POLICY orders_select_shg
ON orders FOR SELECT
USING (shg_id = current_user_shg_id());

-- Buyers can insert orders
CREATE POLICY orders_insert_buyer
ON orders FOR INSERT
WITH CHECK (
  current_user_role() = 'buyer'
  AND buyer_id IN (
    SELECT id FROM buyers WHERE profile_id = auth.uid()
  )
);

-- Leaders can insert orders (manual creation)
CREATE POLICY orders_insert_leader
ON orders FOR INSERT
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- Leaders can update orders in their SHG
CREATE POLICY orders_update_leader
ON orders FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- ─────────────────────────────────────
-- order_items
-- ─────────────────────────────────────

-- Everyone who can see the order can see its items
CREATE POLICY order_items_select
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders
    WHERE shg_id = current_user_shg_id()
       OR buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid())
  )
);

-- Leaders can manage order items
CREATE POLICY order_items_manage_leader
ON order_items FOR ALL
USING (
  current_user_role() = 'leader'
  AND order_id IN (
    SELECT id FROM orders WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND order_id IN (
    SELECT id FROM orders WHERE shg_id = current_user_shg_id()
  )
);

-- ─────────────────────────────────────
-- audit_events (append-only, read by leader/approver)
-- ─────────────────────────────────────

CREATE POLICY audit_select_shg
ON audit_events FOR SELECT
USING (shg_id = current_user_shg_id());

CREATE POLICY audit_insert_all
ON audit_events FOR INSERT
WITH CHECK (shg_id = current_user_shg_id() OR shg_id IS NULL);
-- Migration 006: Production Plans, Plan Stages, Tasks, Task Assignments, AI Drafts
-- Requires: 001-005

-- ─────────────────────────────────────
-- production_plans
-- ─────────────────────────────────────
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

CREATE TRIGGER production_plans_updated_at
  BEFORE UPDATE ON production_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- plan_stages
-- ─────────────────────────────────────
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

CREATE TRIGGER plan_stages_updated_at
  BEFORE UPDATE ON plan_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- tasks
-- ─────────────────────────────────────
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

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- task_assignments
-- ─────────────────────────────────────
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id UUID NOT NULL REFERENCES shg_members(id),
  allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity >= 0),
  accepted_quantity INTEGER NOT NULL DEFAULT 0,
  rework_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0,
  member_response TEXT CHECK (member_response IN ('ACCEPTED', 'REJECTED', 'PENDING')) DEFAULT 'PENDING',
  response_reason TEXT,
  responded_at TIMESTAMPTZ,
  allocation_score NUMERIC(5,4),
  allocation_reasons JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER task_assignments_updated_at
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- ai_drafts
-- ─────────────────────────────────────
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

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_tasks_order      ON tasks(order_id);
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_task_assign_task ON task_assignments(task_id);
CREATE INDEX idx_task_assign_mem  ON task_assignments(shg_member_id);
CREATE INDEX idx_ai_drafts_order  ON ai_drafts(order_id);
CREATE INDEX idx_plan_order       ON production_plans(order_id);
-- Migration 007: RLS for production_plans, plan_stages, tasks, task_assignments, ai_drafts

ALTER TABLE production_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts         ENABLE ROW LEVEL SECURITY;

-- production_plans: SHG members can read, leaders can write
CREATE POLICY plans_select_shg ON production_plans FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

CREATE POLICY plans_manage_leader ON production_plans FOR ALL
  USING (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

-- plan_stages: same as production_plans
CREATE POLICY stages_select_shg ON plan_stages FOR SELECT
  USING (production_plan_id IN (
    SELECT id FROM production_plans
    WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
  ));

CREATE POLICY stages_manage_leader ON plan_stages FOR ALL
  USING (current_user_role() = 'leader'
    AND production_plan_id IN (
      SELECT id FROM production_plans
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ))
  WITH CHECK (current_user_role() = 'leader'
    AND production_plan_id IN (
      SELECT id FROM production_plans
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ));

-- tasks: members see tasks assigned to them; leaders see all in their SHG
CREATE POLICY tasks_select_shg ON tasks FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

CREATE POLICY tasks_select_member ON tasks FOR SELECT
  USING (id IN (
    SELECT task_id FROM task_assignments ta
    JOIN shg_members sm ON sm.id = ta.shg_member_id
    WHERE sm.profile_id = auth.uid()
  ));

CREATE POLICY tasks_manage_leader ON tasks FOR ALL
  USING (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

-- task_assignments: members see their own; leaders see all in SHG
CREATE POLICY assignments_select_own ON task_assignments FOR SELECT
  USING (shg_member_id IN (
    SELECT id FROM shg_members WHERE profile_id = auth.uid()
  ));

CREATE POLICY assignments_select_leader ON task_assignments FOR SELECT
  USING (current_user_role() = 'leader'
    AND shg_member_id IN (SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()));

CREATE POLICY assignments_manage_leader ON task_assignments FOR ALL
  USING (current_user_role() = 'leader'
    AND shg_member_id IN (SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND shg_member_id IN (SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()));

-- ai_drafts: leaders can read/write for their SHG's orders
CREATE POLICY ai_drafts_leader ON ai_drafts FOR ALL
  USING (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));
-- Migration 008: Progress Updates, Proof Media, Quality Reviews, Rework Tasks, Cost Sheets
-- Requires: 001-007

-- ─────────────────────────────────────
-- progress_updates
-- ─────────────────────────────────────
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id UUID NOT NULL REFERENCES shg_members(id),
  quantity_completed INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  voice_note_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────
-- proof_media  (retained permanently for audit)
-- ─────────────────────────────────────
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

-- ─────────────────────────────────────
-- quality_reviews
-- ─────────────────────────────────────
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

-- ─────────────────────────────────────
-- rework_tasks
-- ─────────────────────────────────────
CREATE TABLE rework_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  rework_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reason TEXT,
  reassigned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────
-- cost_sheets
-- ─────────────────────────────────────
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

CREATE TRIGGER cost_sheets_updated_at
  BEFORE UPDATE ON cost_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- cost_components
-- ─────────────────────────────────────
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

CREATE TRIGGER cost_components_updated_at
  BEFORE UPDATE ON cost_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- notifications
-- ─────────────────────────────────────
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

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_progress_task       ON progress_updates(task_id);
CREATE INDEX idx_proof_task          ON proof_media(task_id);
CREATE INDEX idx_quality_task        ON quality_reviews(task_id);
CREATE INDEX idx_cost_sheets_order   ON cost_sheets(order_id);
CREATE INDEX idx_cost_comp_sheet     ON cost_components(cost_sheet_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_profile_id);
-- Migration 009: RLS for progress, proof, quality, costing, notifications

ALTER TABLE progress_updates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rework_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_sheets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_components   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- progress_updates: members see own, leaders see all in SHG
CREATE POLICY progress_select_own ON progress_updates FOR SELECT
  USING (shg_member_id IN (SELECT id FROM shg_members WHERE profile_id = auth.uid()));

CREATE POLICY progress_select_leader ON progress_updates FOR SELECT
  USING (current_user_role() = 'leader'
    AND task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

CREATE POLICY progress_insert_member ON progress_updates FOR INSERT
  WITH CHECK (shg_member_id IN (SELECT id FROM shg_members WHERE profile_id = auth.uid()));

-- proof_media: members upload own, leaders/checkers see all in SHG
CREATE POLICY proof_select_shg ON proof_media FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

CREATE POLICY proof_select_own ON proof_media FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY proof_insert_member ON proof_media FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- quality_reviews: leaders and checkers can read/write in their SHG
CREATE POLICY quality_select_shg ON quality_reviews FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

CREATE POLICY quality_insert_leader_checker ON quality_reviews FOR INSERT
  WITH CHECK (
    current_user_role() IN ('leader', 'checker')
    AND task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  );

-- rework_tasks: leaders manage, members read own
CREATE POLICY rework_select_shg ON rework_tasks FOR SELECT
  USING (original_task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

CREATE POLICY rework_manage_leader ON rework_tasks FOR ALL
  USING (current_user_role() = 'leader'
    AND original_task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())))
  WITH CHECK (current_user_role() = 'leader'
    AND original_task_id IN (SELECT id FROM tasks WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

-- cost_sheets: leaders manage, approvers read
CREATE POLICY cost_select_shg ON cost_sheets FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

CREATE POLICY cost_manage_leader ON cost_sheets FOR ALL
  USING (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

-- cost_components: same as cost_sheets
CREATE POLICY cost_comp_select ON cost_components FOR SELECT
  USING (cost_sheet_id IN (SELECT id FROM cost_sheets WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

CREATE POLICY cost_comp_manage_leader ON cost_components FOR ALL
  USING (current_user_role() = 'leader'
    AND cost_sheet_id IN (SELECT id FROM cost_sheets WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())))
  WITH CHECK (current_user_role() = 'leader'
    AND cost_sheet_id IN (SELECT id FROM cost_sheets WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())));

-- notifications: recipients read own
CREATE POLICY notifications_select_own ON notifications FOR SELECT
  USING (recipient_profile_id = auth.uid());

CREATE POLICY notifications_insert_system ON notifications FOR INSERT
  WITH CHECK (shg_id = current_user_shg_id() OR shg_id IS NULL);
-- Migration 010: Payout Sheets, Payout Lines, Payout Approvals
-- Requires: 001-009

-- ─────────────────────────────────────
-- payout_sheets
-- ─────────────────────────────────────
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

CREATE TRIGGER payout_sheets_updated_at
  BEFORE UPDATE ON payout_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- payout_lines
-- ─────────────────────────────────────
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

CREATE TRIGGER payout_lines_updated_at
  BEFORE UPDATE ON payout_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- payout_approvals
-- ─────────────────────────────────────
CREATE TABLE payout_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_sheet_id UUID NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_payout_sheets_order  ON payout_sheets(order_id);
CREATE INDEX idx_payout_lines_sheet   ON payout_lines(payout_sheet_id);
CREATE INDEX idx_payout_lines_member  ON payout_lines(shg_member_id);
CREATE INDEX idx_payout_approvals     ON payout_approvals(payout_sheet_id);
-- Migration 011: RLS for payout_sheets, payout_lines, payout_approvals

ALTER TABLE payout_sheets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_approvals ENABLE ROW LEVEL SECURITY;

-- payout_sheets: leader and approver see full sheet; member sees nothing here (only their own line)
CREATE POLICY payout_sheets_select_shg ON payout_sheets FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

CREATE POLICY payout_sheets_manage_leader ON payout_sheets FOR ALL
  USING (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()))
  WITH CHECK (current_user_role() = 'leader'
    AND order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id()));

-- payout_lines: members see ONLY their own line (privacy core rule)
CREATE POLICY payout_lines_select_own ON payout_lines FOR SELECT
  USING (shg_member_id IN (SELECT id FROM shg_members WHERE profile_id = auth.uid()));

-- Leaders and approvers see all lines for their SHG
CREATE POLICY payout_lines_select_leader ON payout_lines FOR SELECT
  USING (current_user_role() IN ('leader', 'approver')
    AND payout_sheet_id IN (
      SELECT id FROM payout_sheets
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ));

CREATE POLICY payout_lines_manage_leader ON payout_lines FOR ALL
  USING (current_user_role() = 'leader'
    AND payout_sheet_id IN (
      SELECT id FROM payout_sheets
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ))
  WITH CHECK (current_user_role() = 'leader'
    AND payout_sheet_id IN (
      SELECT id FROM payout_sheets
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ));

-- payout_approvals: leader and approver can read; approver can insert
CREATE POLICY payout_approvals_select ON payout_approvals FOR SELECT
  USING (current_user_role() IN ('leader', 'approver')
    AND payout_sheet_id IN (
      SELECT id FROM payout_sheets
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ));

CREATE POLICY payout_approvals_insert_approver ON payout_approvals FOR INSERT
  WITH CHECK (current_user_role() IN ('approver', 'leader')
    AND payout_sheet_id IN (
      SELECT id FROM payout_sheets
      WHERE order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    ));
