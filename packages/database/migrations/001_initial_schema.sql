-- ============================================================================
-- ASHA – 001_initial_schema.sql
-- Supabase PostgreSQL migration
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
CREATE TYPE user_role AS ENUM (
  'leader', 'member', 'approver', 'checker', 'buyer', 'federation_staff', 'admin'
);

CREATE TYPE availability_status AS ENUM (
  'available', 'partially_available', 'unavailable'
);

CREATE TYPE order_status AS ENUM (
  'REQUESTED', 'REVIEWED', 'PLANNING', 'ALLOCATION_PENDING',
  'IN_PROGRESS', 'QUALITY_REVIEW', 'REWORK', 'READY',
  'DELIVERED', 'CANCELLED', 'COMPLETED'
);

CREATE TYPE task_status AS ENUM (
  'PROPOSED', 'ASSIGNED', 'ACCEPTED', 'REJECTED_BY_MEMBER',
  'IN_PROGRESS', 'SUBMITTED', 'QUALITY_REVIEW', 'REWORK_NEEDED',
  'COMPLETED', 'CANCELLED'
);

CREATE TYPE quality_decision AS ENUM (
  'ACCEPTED', 'REWORK', 'REJECTED'
);

CREATE TYPE cost_component_type AS ENUM (
  'MATERIAL', 'LABOUR', 'PACKAGING', 'TRANSPORT',
  'UTILITIES', 'OTHER_OVERHEAD', 'MARGIN'
);

CREATE TYPE payout_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'
);

CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED', 'TASK_REMINDER', 'DELAY_WARNING',
  'QUALITY_REVIEW_REQUIRED', 'REWORK_REQUIRED',
  'PAYOUT_READY', 'PAYOUT_APPROVED', 'PAYOUT_CHANGES_REQUESTED'
);

CREATE TYPE ai_draft_status AS ENUM (
  'PENDING', 'VALID', 'INVALID', 'REVIEWED', 'DISCARDED'
);

CREATE TYPE member_skill AS ENUM (
  'CUTTING', 'STITCHING', 'TAILORING', 'EMBROIDERY',
  'PACKING', 'QUALITY_CHECK', 'DELIVERY', 'ACCOUNTING', 'OTHER'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone_number    TEXT,
  role            user_role NOT NULL DEFAULT 'member',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- shgs
-- ---------------------------------------------------------------------------
CREATE TABLE shgs (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  registration_number     TEXT,
  district                TEXT,
  state                   TEXT,
  default_currency        TEXT NOT NULL DEFAULT 'INR',
  minimum_margin_percent  NUMERIC(5,2),
  settings                JSONB DEFAULT '{}'::jsonb,
  created_by              UUID REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- shg_members
-- ---------------------------------------------------------------------------
CREATE TABLE shg_members (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_id                UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  profile_id            UUID REFERENCES profiles(id),
  member_name           TEXT NOT NULL,
  phone_number          TEXT,
  daily_capacity        INT NOT NULL DEFAULT 0,
  weekly_capacity       INT NOT NULL DEFAULT 0,
  availability_status   availability_status NOT NULL DEFAULT 'available',
  past_acceptance_rate  NUMERIC(5,2),
  past_rework_rate      NUMERIC(5,2),
  past_on_time_rate     NUMERIC(5,2),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- member_skills
-- ---------------------------------------------------------------------------
CREATE TABLE member_skills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_member_id   UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  skill           member_skill NOT NULL,
  proficiency     INT NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shg_member_id, skill)
);

-- ---------------------------------------------------------------------------
-- member_availability
-- ---------------------------------------------------------------------------
CREATE TABLE member_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_member_id   UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  available_from  DATE NOT NULL,
  available_to    DATE NOT NULL,
  status          availability_status NOT NULL DEFAULT 'available',
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- buyers
-- ---------------------------------------------------------------------------
CREATE TABLE buyers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID REFERENCES profiles(id),
  buyer_name        TEXT NOT NULL,
  organization_name TEXT,
  phone_number      TEXT,
  email             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_id                UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  buyer_id              UUID NOT NULL REFERENCES buyers(id),
  order_number          TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  description           TEXT,
  required_by_date      DATE,
  delivery_address      TEXT,
  special_instructions  TEXT,
  status                order_status NOT NULL DEFAULT 'REQUESTED',
  created_by            UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  quantity          INT NOT NULL CHECK (quantity > 0),
  unit_type         TEXT NOT NULL DEFAULT 'piece',
  specifications    JSONB DEFAULT '{}'::jsonb,
  agreed_unit_price NUMERIC(12,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- production_plans
-- ---------------------------------------------------------------------------
CREATE TABLE production_plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version           INT NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'DRAFT',
  planned_start_date DATE,
  planned_end_date   DATE,
  summary           TEXT,
  created_by_ai     BOOLEAN NOT NULL DEFAULT false,
  confirmed_by      UUID REFERENCES profiles(id),
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- plan_stages
-- ---------------------------------------------------------------------------
CREATE TABLE plan_stages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_plan_id    UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  stage_name            TEXT NOT NULL,
  stage_order           INT NOT NULL,
  requires_skill        member_skill,
  planned_start_date    DATE,
  planned_end_date      DATE,
  is_quality_checkpoint BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
CREATE TABLE tasks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id         UUID REFERENCES order_items(id),
  production_plan_id    UUID REFERENCES production_plans(id),
  plan_stage_id         UUID REFERENCES plan_stages(id),
  task_name             TEXT NOT NULL,
  task_type             TEXT NOT NULL CHECK (task_type IN ('PIECE_BASED', 'STAGE_BASED')),
  required_skill        member_skill,
  allocated_quantity    INT NOT NULL DEFAULT 0,
  completed_quantity    INT NOT NULL DEFAULT 0,
  accepted_quantity     INT NOT NULL DEFAULT 0,
  rework_quantity       INT NOT NULL DEFAULT 0,
  rejected_quantity     INT NOT NULL DEFAULT 0,
  due_date              DATE,
  status                task_status NOT NULL DEFAULT 'PROPOSED',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- task_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE task_assignments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id       UUID NOT NULL REFERENCES shg_members(id),
  allocated_quantity  INT NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
  accepted_quantity   INT NOT NULL DEFAULT 0,
  rework_quantity     INT NOT NULL DEFAULT 0,
  rejected_quantity   INT NOT NULL DEFAULT 0,
  member_response     TEXT CHECK (member_response IN ('ACCEPTED', 'REJECTED', 'PENDING')),
  response_reason     TEXT,
  responded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- progress_updates
-- ---------------------------------------------------------------------------
CREATE TABLE progress_updates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id       UUID NOT NULL REFERENCES shg_members(id),
  quantity_completed  INT NOT NULL DEFAULT 0,
  note                TEXT,
  voice_note_url      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- proof_media
-- ---------------------------------------------------------------------------
CREATE TABLE proof_media (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  progress_update_id  UUID REFERENCES progress_updates(id),
  media_type          TEXT NOT NULL CHECK (media_type IN ('PHOTO', 'VIDEO', 'VOICE_NOTE')),
  storage_path        TEXT NOT NULL,
  file_name           TEXT,
  mime_type           TEXT,
  file_size_bytes     BIGINT,
  uploaded_by         UUID NOT NULL REFERENCES profiles(id),
  is_buyer_visible    BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- quality_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE quality_reviews (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewed_by       UUID NOT NULL REFERENCES profiles(id),
  decision          quality_decision NOT NULL,
  reviewed_quantity INT NOT NULL DEFAULT 0,
  reason            TEXT,
  ai_draft_note     TEXT,
  ai_model          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- rework_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE rework_tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_task_id  UUID NOT NULL REFERENCES tasks(id),
  rework_task_id    UUID NOT NULL REFERENCES tasks(id),
  reason            TEXT,
  reassigned        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cost_sheets
-- ---------------------------------------------------------------------------
CREATE TABLE cost_sheets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id           UUID REFERENCES order_items(id),
  version                 INT NOT NULL DEFAULT 1,
  quantity                INT NOT NULL DEFAULT 0,
  material_cost           NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  overhead_cost           NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost              NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost               NUMERIC(12,2) NOT NULL DEFAULT 0,
  margin_type             TEXT CHECK (margin_type IN ('PERCENTAGE', 'FIXED')),
  margin_value            NUMERIC(12,2),
  margin_amount           NUMERIC(12,2),
  selling_price_per_unit  NUMERIC(12,2),
  total_selling_price     NUMERIC(12,2),
  pricing_warning         TEXT,
  created_by              UUID REFERENCES profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- cost_components
-- ---------------------------------------------------------------------------
CREATE TABLE cost_components (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cost_sheet_id     UUID NOT NULL REFERENCES cost_sheets(id) ON DELETE CASCADE,
  component_type    cost_component_type NOT NULL,
  label             TEXT NOT NULL,
  calculation_basis TEXT CHECK (calculation_basis IN ('PER_UNIT', 'LUMP_SUM', 'PER_HOUR', 'PER_DAY')),
  rate              NUMERIC(12,2),
  quantity          NUMERIC(12,2),
  amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- payout_sheets
-- ---------------------------------------------------------------------------
CREATE TABLE payout_sheets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version                 INT NOT NULL DEFAULT 1,
  status                  payout_status NOT NULL DEFAULT 'DRAFT',
  total_payable_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_accepted_quantity INT NOT NULL DEFAULT 0,
  submitted_by            UUID REFERENCES profiles(id),
  submitted_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- payout_lines
-- ---------------------------------------------------------------------------
CREATE TABLE payout_lines (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_sheet_id     UUID NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  shg_member_id       UUID NOT NULL REFERENCES shg_members(id),
  task_id             UUID NOT NULL REFERENCES tasks(id),
  allocated_quantity  INT NOT NULL DEFAULT 0,
  completed_quantity  INT NOT NULL DEFAULT 0,
  accepted_quantity   INT NOT NULL DEFAULT 0,
  rework_quantity     INT NOT NULL DEFAULT 0,
  rejected_quantity   INT NOT NULL DEFAULT 0,
  payment_basis       TEXT CHECK (payment_basis IN ('PER_PIECE', 'PER_HOUR', 'LUMP_SUM')),
  rate                NUMERIC(12,2),
  hours               NUMERIC(8,2),
  payable_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  explanation         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- payout_approvals
-- ---------------------------------------------------------------------------
CREATE TABLE payout_approvals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_sheet_id   UUID NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  approver_id       UUID NOT NULL REFERENCES profiles(id),
  action            TEXT NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_id                  UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  order_id                UUID REFERENCES orders(id),
  recipient_profile_id    UUID REFERENCES profiles(id),
  recipient_member_id     UUID REFERENCES shg_members(id),
  notification_type       notification_type NOT NULL,
  title                   TEXT NOT NULL,
  message                 TEXT,
  voice_text              TEXT,
  is_read                 BOOLEAN NOT NULL DEFAULT false,
  read_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shg_id            UUID REFERENCES shgs(id),
  order_id          UUID REFERENCES orders(id),
  actor_profile_id  UUID REFERENCES profiles(id),
  event_type        TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID,
  old_values        JSONB,
  new_values        JSONB,
  reason            TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ai_drafts
-- ---------------------------------------------------------------------------
CREATE TABLE ai_drafts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  draft_type        TEXT NOT NULL,
  provider          TEXT,
  model             TEXT,
  prompt_version    TEXT,
  input_snapshot    JSONB,
  output            JSONB,
  status            ai_draft_status NOT NULL DEFAULT 'PENDING',
  validation_errors JSONB,
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone_number ON profiles(phone_number);

-- shgs
CREATE INDEX idx_shgs_created_by ON shgs(created_by);
CREATE INDEX idx_shgs_district ON shgs(district);

-- shg_members
CREATE INDEX idx_shg_members_shg_id ON shg_members(shg_id);
CREATE INDEX idx_shg_members_profile_id ON shg_members(profile_id);
CREATE INDEX idx_shg_members_availability ON shg_members(availability_status);
CREATE INDEX idx_shg_members_active ON shg_members(is_active) WHERE is_active = true;

-- member_skills
CREATE INDEX idx_member_skills_shg_member_id ON member_skills(shg_member_id);
CREATE INDEX idx_member_skills_skill ON member_skills(skill);

-- member_availability
CREATE INDEX idx_member_availability_shg_member_id ON member_availability(shg_member_id);
CREATE INDEX idx_member_availability_dates ON member_availability(available_from, available_to);

-- buyers
CREATE INDEX idx_buyers_profile_id ON buyers(profile_id);
CREATE INDEX idx_buyers_email ON buyers(email);

-- orders
CREATE INDEX idx_orders_shg_id ON orders(shg_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_required_by_date ON orders(required_by_date);

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- production_plans
CREATE INDEX idx_production_plans_order_id ON production_plans(order_id);
CREATE INDEX idx_production_plans_confirmed_by ON production_plans(confirmed_by);
CREATE INDEX idx_production_plans_status ON production_plans(status);

-- plan_stages
CREATE INDEX idx_plan_stages_production_plan_id ON plan_stages(production_plan_id);
CREATE INDEX idx_plan_stages_requires_skill ON plan_stages(requires_skill);

-- tasks
CREATE INDEX idx_tasks_order_id ON tasks(order_id);
CREATE INDEX idx_tasks_order_item_id ON tasks(order_item_id);
CREATE INDEX idx_tasks_production_plan_id ON tasks(production_plan_id);
CREATE INDEX idx_tasks_plan_stage_id ON tasks(plan_stage_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_required_skill ON tasks(required_skill);

-- task_assignments
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_shg_member_id ON task_assignments(shg_member_id);
CREATE INDEX idx_task_assignments_response ON task_assignments(member_response);

-- progress_updates
CREATE INDEX idx_progress_updates_task_id ON progress_updates(task_id);
CREATE INDEX idx_progress_updates_shg_member_id ON progress_updates(shg_member_id);

-- proof_media
CREATE INDEX idx_proof_media_task_id ON proof_media(task_id);
CREATE INDEX idx_proof_media_progress_update_id ON proof_media(progress_update_id);
CREATE INDEX idx_proof_media_uploaded_by ON proof_media(uploaded_by);

-- quality_reviews
CREATE INDEX idx_quality_reviews_task_id ON quality_reviews(task_id);
CREATE INDEX idx_quality_reviews_reviewed_by ON quality_reviews(reviewed_by);
CREATE INDEX idx_quality_reviews_decision ON quality_reviews(decision);

-- rework_tasks
CREATE INDEX idx_rework_tasks_original_task_id ON rework_tasks(original_task_id);
CREATE INDEX idx_rework_tasks_rework_task_id ON rework_tasks(rework_task_id);

-- cost_sheets
CREATE INDEX idx_cost_sheets_order_id ON cost_sheets(order_id);
CREATE INDEX idx_cost_sheets_order_item_id ON cost_sheets(order_item_id);
CREATE INDEX idx_cost_sheets_created_by ON cost_sheets(created_by);

-- cost_components
CREATE INDEX idx_cost_components_cost_sheet_id ON cost_components(cost_sheet_id);
CREATE INDEX idx_cost_components_type ON cost_components(component_type);

-- payout_sheets
CREATE INDEX idx_payout_sheets_order_id ON payout_sheets(order_id);
CREATE INDEX idx_payout_sheets_status ON payout_sheets(status);
CREATE INDEX idx_payout_sheets_submitted_by ON payout_sheets(submitted_by);

-- payout_lines
CREATE INDEX idx_payout_lines_payout_sheet_id ON payout_lines(payout_sheet_id);
CREATE INDEX idx_payout_lines_shg_member_id ON payout_lines(shg_member_id);
CREATE INDEX idx_payout_lines_task_id ON payout_lines(task_id);

-- payout_approvals
CREATE INDEX idx_payout_approvals_payout_sheet_id ON payout_approvals(payout_sheet_id);
CREATE INDEX idx_payout_approvals_approver_id ON payout_approvals(approver_id);

-- notifications
CREATE INDEX idx_notifications_shg_id ON notifications(shg_id);
CREATE INDEX idx_notifications_order_id ON notifications(order_id);
CREATE INDEX idx_notifications_recipient_profile ON notifications(recipient_profile_id);
CREATE INDEX idx_notifications_recipient_member ON notifications(recipient_member_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

-- audit_events
CREATE INDEX idx_audit_events_shg_id ON audit_events(shg_id);
CREATE INDEX idx_audit_events_order_id ON audit_events(order_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_profile_id);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- ai_drafts
CREATE INDEX idx_ai_drafts_order_id ON ai_drafts(order_id);
CREATE INDEX idx_ai_drafts_status ON ai_drafts(status);
CREATE INDEX idx_ai_drafts_reviewed_by ON ai_drafts(reviewed_by);


-- ============================================================================
-- 4. updated_at TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to every table that has updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'updated_at'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
      t
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shgs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shg_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_skills      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rework_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_sheets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_components    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_sheets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_approvals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_drafts          ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 6. RLS HELPER FUNCTIONS
-- ============================================================================

-- Returns the user_role for the currently authenticated user.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns the SHG id the current user belongs to (via shg_members).
CREATE OR REPLACE FUNCTION current_user_shg_id()
RETURNS UUID AS $$
  SELECT shg_id
  FROM shg_members
  WHERE profile_id = auth.uid()
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================================
-- 7. KEY RLS POLICIES (core set – see policies/rls_policies.sql for full set)
-- ============================================================================

-- ---- profiles ----
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_select_same_shg ON profiles
  FOR SELECT USING (
    id IN (
      SELECT sm.profile_id FROM shg_members sm
      WHERE sm.shg_id = current_user_shg_id()
        AND sm.is_active = true
    )
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- orders ----
CREATE POLICY orders_select_shg ON orders
  FOR SELECT USING (shg_id = current_user_shg_id());

CREATE POLICY orders_insert_leader ON orders
  FOR INSERT WITH CHECK (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY orders_update_leader ON orders
  FOR UPDATE USING (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

-- ---- tasks ----
CREATE POLICY tasks_select_shg ON tasks
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
  );

CREATE POLICY tasks_select_assigned_member ON tasks
  FOR SELECT USING (
    id IN (
      SELECT ta.task_id FROM task_assignments ta
      JOIN shg_members sm ON sm.id = ta.shg_member_id
      WHERE sm.profile_id = auth.uid()
    )
  );

CREATE POLICY tasks_update_leader ON tasks
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

-- ---- payout_lines ----
CREATE POLICY payout_lines_select_own ON payout_lines
  FOR SELECT USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY payout_lines_select_leader ON payout_lines
  FOR SELECT USING (
    current_user_role() IN ('leader', 'approver', 'admin')
    AND payout_sheet_id IN (
      SELECT ps.id FROM payout_sheets ps
      JOIN orders o ON o.id = ps.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
