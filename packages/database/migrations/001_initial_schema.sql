-- ============================================================
-- ASHA Platform — Initial Schema Migration
-- 001_initial_schema.sql
--
-- Creates all enums and all 24 core tables.
-- All PKs are UUID, all timestamps are TIMESTAMPTZ,
-- all money columns are NUMERIC(12,2).
-- Soft-delete (deleted_at) is on member and order tables.
--
-- Requirements: 16.7
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'leader',
  'member',
  'approver',
  'checker',
  'buyer',
  'federation_staff'
);

CREATE TYPE preferred_language AS ENUM (
  'en',
  'kn',
  'hi'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'partially_available',
  'unavailable'
);

CREATE TYPE skill_catalogue AS ENUM (
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

CREATE TYPE task_type AS ENUM (
  'PIECE_BASED',
  'STAGE_BASED'
);

CREATE TYPE member_response_type AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED'
);

CREATE TYPE media_type AS ENUM (
  'PHOTO',
  'VIDEO',
  'VOICE_NOTE'
);

CREATE TYPE proof_status_type AS ENUM (
  'UPLOADING',
  'READY',
  'FAILED'
);

CREATE TYPE quality_decision_type AS ENUM (
  'ACCEPTED',
  'REWORK',
  'REJECTED'
);

CREATE TYPE payout_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE payment_basis_type AS ENUM (
  'PER_PIECE',
  'HOURLY'
);

CREATE TYPE payout_approval_action AS ENUM (
  'APPROVED',
  'REJECTED',
  'CHANGES_REQUESTED'
);

CREATE TYPE margin_type AS ENUM (
  'PERCENTAGE',
  'FIXED_PER_UNIT',
  'MANUAL'
);

CREATE TYPE calculation_basis AS ENUM (
  'PER_UNIT',
  'PER_BATCH',
  'PER_HOUR',
  'PERCENTAGE',
  'FIXED'
);

CREATE TYPE cost_component_type AS ENUM (
  'MATERIAL',
  'LABOUR',
  'PACKAGING',
  'TRANSPORT',
  'UTILITIES',
  'OTHER_OVERHEAD'
);

CREATE TYPE ai_draft_status AS ENUM (
  'PENDING',
  'VALID',
  'INVALID',
  'REVIEWED',
  'DISCARDED'
);

CREATE TYPE ai_provider_type AS ENUM (
  'openai',
  'gemini',
  'anthropic',
  'groq',
  'ollama'
);

CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED',
  'TASK_REJECTED',
  'REWORK_REQUIRED',
  'PAYOUT_SUBMITTED',
  'PAYOUT_APPROVED',
  'PAYOUT_REJECTED',
  'DELAY_ALERT',
  'QUALITY_DECISION'
);


-- ============================================================
-- TABLE 1: profiles
-- One row per Supabase Auth user. PK mirrors auth.users.id.
-- ============================================================

CREATE TABLE profiles (
  id                UUID        PRIMARY KEY,  -- same UUID as auth.users.id
  full_name         TEXT        NOT NULL,
  phone_number      TEXT,
  role              user_role   NOT NULL,
  preferred_language preferred_language NOT NULL DEFAULT 'en',
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS
  'App user record linked 1-to-1 with a Supabase Auth user.';


-- ============================================================
-- TABLE 2: shgs
-- Self-help group entity.
-- ============================================================

CREATE TABLE shgs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        NOT NULL,
  registration_number     TEXT,
  address                 TEXT,
  district                TEXT,
  state                   TEXT,
  leader_id               UUID        NOT NULL REFERENCES profiles(id),
  minimum_margin_percent  NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE shgs IS
  'A registered self-help group that receives and fulfils orders.';


-- ============================================================
-- TABLE 3: shg_members
-- A profile enrolled as a worker in a specific SHG.
-- Soft-deleted via deleted_at.
-- ============================================================

CREATE TABLE shg_members (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id           UUID               NOT NULL REFERENCES shgs(id),
  profile_id       UUID               NOT NULL REFERENCES profiles(id),
  display_name     TEXT               NOT NULL,
  daily_capacity   INT                NOT NULL CHECK (daily_capacity > 0),
  availability     availability_status NOT NULL DEFAULT 'available',
  quality_score    NUMERIC(4,3)       NOT NULL DEFAULT 1.000
                                       CHECK (quality_score >= 0 AND quality_score <= 1),
  workload_score   NUMERIC(4,3)       NOT NULL DEFAULT 0.000
                                       CHECK (workload_score >= 0 AND workload_score <= 1),
  joined_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (shg_id, profile_id)
);

COMMENT ON TABLE shg_members IS
  'A profile enrolled as a working member within a specific SHG.';
COMMENT ON COLUMN shg_members.daily_capacity IS
  'Maximum units/hours a member can produce per day. Must be > 0.';


-- ============================================================
-- TABLE 4: member_skills
-- Skill–proficiency entries per SHG member.
-- ============================================================

CREATE TABLE member_skills (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id   UUID           NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  skill           skill_catalogue NOT NULL,
  proficiency     INT            NOT NULL CHECK (proficiency BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (shg_member_id, skill)
);

COMMENT ON TABLE member_skills IS
  'Each row records a skill a member holds and her self-reported proficiency (1–5).';


-- ============================================================
-- TABLE 5: member_availability
-- Date-ranged availability windows for a member.
-- ============================================================

CREATE TABLE member_availability (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id    UUID               NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  available_from   DATE               NOT NULL,
  available_to     DATE               NOT NULL,
  status           availability_status NOT NULL DEFAULT 'available',
  note             TEXT,
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CHECK (available_to >= available_from)
);

COMMENT ON TABLE member_availability IS
  'Explicit availability windows declared by or for a member.';


-- ============================================================
-- TABLE 6: buyers
-- External customer account linked to a profile.
-- ============================================================

CREATE TABLE buyers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID        NOT NULL REFERENCES profiles(id),
  organisation    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE buyers IS
  'External customer who places bulk orders with an SHG.';


-- ============================================================
-- TABLE 7: orders
-- Core order entity. Soft-deleted via deleted_at.
-- ============================================================

CREATE TABLE orders (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT         NOT NULL,
  shg_id            UUID         NOT NULL REFERENCES shgs(id),
  buyer_id          UUID         REFERENCES buyers(id),
  title             TEXT         NOT NULL,
  description       TEXT,
  status            order_status NOT NULL DEFAULT 'REQUESTED',
  required_by       DATE,
  delivery_address  TEXT,
  created_by        UUID         NOT NULL REFERENCES profiles(id),
  reviewed_by       UUID         REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (order_number)
);

COMMENT ON TABLE orders IS
  'The central entity representing one production order for an SHG.';


-- ============================================================
-- TABLE 8: order_items
-- Product lines within an order.
-- ============================================================

CREATE TABLE order_items (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name     TEXT         NOT NULL,
  product_sku      TEXT,
  quantity         INT          NOT NULL CHECK (quantity > 0),
  unit             TEXT         NOT NULL DEFAULT 'piece',
  unit_price       NUMERIC(12,2),
  specifications   TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE order_items IS
  'Individual product line within an order. quantity must be > 0.';


-- ============================================================
-- TABLE 9: production_plans
-- Versioned production plan for an order, drafted by AI and
-- confirmed by the Leader.
-- ============================================================

CREATE TABLE production_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders(id),
  version         INT         NOT NULL DEFAULT 1,
  ai_draft_id     UUID,                            -- FK added after ai_drafts is created
  confirmed_by    UUID        REFERENCES profiles(id),
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE production_plans IS
  'A versioned plan generated by AI and confirmed by the Leader.';


-- ============================================================
-- TABLE 10: plan_stages
-- Ordered stages within a production plan.
-- ============================================================

CREATE TABLE plan_stages (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  production_plan_id UUID         NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  stage_order      INT            NOT NULL,
  name             TEXT           NOT NULL,
  description      TEXT,
  requires_skill   skill_catalogue,
  estimated_days   INT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE plan_stages IS
  'An ordered step in a production plan, optionally requiring a specific skill.';


-- ============================================================
-- TABLE 11: tasks
-- A unit of work covering one member-stage-quantity combination.
-- ============================================================

CREATE TABLE tasks (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID         NOT NULL REFERENCES orders(id),
  plan_stage_id    UUID         REFERENCES plan_stages(id),
  order_item_id    UUID         REFERENCES order_items(id),
  title            TEXT         NOT NULL,
  description      TEXT,
  task_type        task_type    NOT NULL DEFAULT 'PIECE_BASED',
  required_skill   skill_catalogue,
  quantity         INT          NOT NULL CHECK (quantity > 0),
  status           task_status  NOT NULL DEFAULT 'PROPOSED',
  deadline         DATE,
  instructions     TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS
  'A discrete unit of work created from a confirmed allocation proposal.';


-- ============================================================
-- TABLE 12: task_assignments
-- Assignment of a task to a specific SHG member.
-- ============================================================

CREATE TABLE task_assignments (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID                 NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  shg_member_id   UUID                 NOT NULL REFERENCES shg_members(id),
  member_response member_response_type NOT NULL DEFAULT 'PENDING',
  response_reason TEXT,
  responded_at    TIMESTAMPTZ,
  allocated_quantity INT              NOT NULL CHECK (allocated_quantity > 0),
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, shg_member_id)
);

COMMENT ON TABLE task_assignments IS
  'Links a task to the member assigned to fulfil it.';


-- ============================================================
-- TABLE 13: progress_updates
-- Member-reported incremental progress on a task.
-- ============================================================

CREATE TABLE progress_updates (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  task_assignment_id  UUID        REFERENCES task_assignments(id),
  reported_by         UUID        NOT NULL REFERENCES profiles(id),
  quantity_completed  INT         NOT NULL DEFAULT 0,
  note                TEXT,
  voice_note_url      TEXT,
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE progress_updates IS
  'An incremental progress checkpoint submitted by a member for a task.';


-- ============================================================
-- TABLE 14: proof_media
-- Proof files (photos, videos, voice notes) attached to a task.
-- Retained permanently — never hard-deleted.
-- ============================================================

CREATE TABLE proof_media (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID             NOT NULL REFERENCES tasks(id),
  task_assignment_id UUID          REFERENCES task_assignments(id),
  uploaded_by     UUID             NOT NULL REFERENCES profiles(id),
  media_type      media_type       NOT NULL,
  file_path       TEXT,
  public_url      TEXT,
  mime_type       TEXT,
  file_size_bytes BIGINT,
  status          proof_status_type NOT NULL DEFAULT 'UPLOADING',
  upload_error    TEXT,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE proof_media IS
  'Proof evidence (photo/video/voice) uploaded by a member for quality review. Permanent.';


-- ============================================================
-- TABLE 15: quality_reviews
-- Quality decision on a task made by a Checker or Leader.
-- ============================================================

CREATE TABLE quality_reviews (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID                 NOT NULL REFERENCES tasks(id),
  reviewed_by       UUID                 NOT NULL REFERENCES profiles(id),
  decision          quality_decision_type NOT NULL,
  reviewed_quantity INT                  NOT NULL,
  accepted_quantity INT                  NOT NULL DEFAULT 0,
  rework_quantity   INT                  NOT NULL DEFAULT 0,
  rejected_quantity INT                  NOT NULL DEFAULT 0,
  reason            TEXT,
  ai_note           TEXT,
  ai_draft_id       UUID,                -- FK added after ai_drafts is created
  reviewed_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE quality_reviews IS
  'A quality decision (ACCEPTED/REWORK/REJECTED) made by a Checker after reviewing proof.';


-- ============================================================
-- TABLE 16: rework_tasks
-- Links an original task to its corrective rework task.
-- ============================================================

CREATE TABLE rework_tasks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_task_id UUID        NOT NULL REFERENCES tasks(id),
  rework_task_id   UUID        NOT NULL REFERENCES tasks(id),
  quality_review_id UUID       REFERENCES quality_reviews(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rework_tasks IS
  'Links the original task to the newly created rework task after a REWORK quality decision.';


-- ============================================================
-- TABLE 17: cost_sheets
-- Versioned cost calculation for an order item.
-- ============================================================

CREATE TABLE cost_sheets (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID         NOT NULL REFERENCES orders(id),
  order_item_id    UUID         REFERENCES order_items(id),
  version          INT          NOT NULL DEFAULT 1,
  margin_mode      margin_type  NOT NULL DEFAULT 'PERCENTAGE',
  margin_value     NUMERIC(12,2),
  total_cost       NUMERIC(12,2),
  unit_cost        NUMERIC(12,2),
  selling_price_per_unit NUMERIC(12,2),
  material_cost    NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_cost      NUMERIC(12,2) NOT NULL DEFAULT 0,
  overhead_cost    NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity         INT          NOT NULL CHECK (quantity > 0),
  has_pricing_warning BOOLEAN   NOT NULL DEFAULT FALSE,
  pricing_warnings JSONB        NOT NULL DEFAULT '[]',
  created_by       UUID         NOT NULL REFERENCES profiles(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cost_sheets IS
  'A versioned cost breakdown for an order. The deterministic engine owns all computed columns.';


-- ============================================================
-- TABLE 18: cost_components
-- Individual cost line items within a cost sheet.
-- ============================================================

CREATE TABLE cost_components (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_sheet_id    UUID                 NOT NULL REFERENCES cost_sheets(id) ON DELETE CASCADE,
  component_type   cost_component_type  NOT NULL,
  name             TEXT                 NOT NULL,
  basis            calculation_basis    NOT NULL DEFAULT 'PER_UNIT',
  quantity_input   NUMERIC(12,2),
  rate             NUMERIC(12,2)        NOT NULL,
  amount           NUMERIC(12,2)        NOT NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cost_components IS
  'A single cost line (material, labour, packaging, etc.) within a cost sheet.';


-- ============================================================
-- TABLE 19: payout_sheets
-- Versioned payout summary for an order.
-- ============================================================

CREATE TABLE payout_sheets (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID          NOT NULL REFERENCES orders(id),
  version          INT           NOT NULL DEFAULT 1,
  status           payout_status NOT NULL DEFAULT 'DRAFT',
  total_payout     NUMERIC(12,2) NOT NULL DEFAULT 0,
  submitted_by     UUID          REFERENCES profiles(id),
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payout_sheets IS
  'A versioned summary of all member earnings for a completed order.';


-- ============================================================
-- TABLE 20: payout_lines
-- Per-member earning within a payout sheet.
-- ============================================================

CREATE TABLE payout_lines (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_sheet_id   UUID               NOT NULL REFERENCES payout_sheets(id) ON DELETE CASCADE,
  shg_member_id     UUID               NOT NULL REFERENCES shg_members(id),
  task_id           UUID               REFERENCES tasks(id),
  task_assignment_id UUID              REFERENCES task_assignments(id),
  payment_basis     payment_basis_type NOT NULL DEFAULT 'PER_PIECE',
  rate              NUMERIC(12,2)      NOT NULL,
  allocated_quantity   INT             NOT NULL DEFAULT 0,
  accepted_quantity    INT             NOT NULL DEFAULT 0,
  rework_quantity      INT             NOT NULL DEFAULT 0,
  rejected_quantity    INT             NOT NULL DEFAULT 0,
  approved_hours       NUMERIC(8,2),
  payable_amount    NUMERIC(12,2)      NOT NULL DEFAULT 0,
  is_payable        BOOLEAN            NOT NULL DEFAULT TRUE,
  note              TEXT,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payout_lines IS
  'A single member earning line within a payout sheet. payable_amount is calculated by the payout engine.';


-- ============================================================
-- TABLE 21: payout_approvals
-- Explicit approval actions on a payout sheet.
-- ============================================================

CREATE TABLE payout_approvals (
  id               UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_sheet_id  UUID                  NOT NULL REFERENCES payout_sheets(id),
  actioned_by      UUID                  NOT NULL REFERENCES profiles(id),
  action           payout_approval_action NOT NULL,
  comment          TEXT,
  actioned_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payout_approvals IS
  'An explicit approval/rejection/change-request action on a payout sheet. Required for status=APPROVED.';


-- ============================================================
-- TABLE 22: notifications
-- In-app notifications per recipient.
-- ============================================================

CREATE TABLE notifications (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      UUID              NOT NULL REFERENCES profiles(id),
  notification_type notification_type NOT NULL,
  title             TEXT              NOT NULL,
  body              TEXT,
  entity_type       TEXT,
  entity_id         UUID,
  is_read           BOOLEAN           NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS
  'In-app notifications delivered to a specific user profile.';


-- ============================================================
-- TABLE 23: audit_events
-- Append-only immutable log of business events.
-- No FK to orders intentionally — can reference deleted orders.
-- ============================================================

CREATE TABLE audit_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT        NOT NULL,
  entity_type  TEXT        NOT NULL,
  entity_id    UUID        NOT NULL,
  actor_id     UUID        REFERENCES profiles(id),
  shg_id       UUID        REFERENCES shgs(id),
  order_id     UUID,                           -- intentionally no FK — survives order soft-delete
  old_values   JSONB,
  new_values   JSONB,
  reason       TEXT,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_events IS
  'Immutable, append-only business event log. order_id has no FK so events survive order soft-deletion.';

-- Prevent updates and deletes on audit_events via a rule
CREATE RULE audit_events_no_update AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE audit_events_no_delete AS ON DELETE TO audit_events DO INSTEAD NOTHING;


-- ============================================================
-- TABLE 24: ai_drafts
-- Stored input/output for every LLM call. Never drives
-- business state directly.
-- ============================================================

CREATE TABLE ai_drafts (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID            REFERENCES orders(id),
  draft_type        TEXT            NOT NULL,   -- e.g. 'production_plan', 'quality_note', 'payout_explanation'
  provider          ai_provider_type NOT NULL,
  model             TEXT            NOT NULL,
  status            ai_draft_status NOT NULL DEFAULT 'PENDING',
  input_snapshot    JSONB           NOT NULL DEFAULT '{}',
  raw_output        JSONB,
  validated_output  JSONB,
  validation_errors JSONB,
  generated_by      UUID            REFERENCES profiles(id),
  generated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  reviewed_by       UUID            REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_drafts IS
  'Full record of every LLM call: input snapshot, raw output, validation status. Never auto-committed to business tables.';


-- ============================================================
-- DEFERRED FOREIGN KEYS
-- Back-fill FKs that reference tables created later.
-- ============================================================

ALTER TABLE production_plans
  ADD CONSTRAINT fk_production_plans_ai_draft
  FOREIGN KEY (ai_draft_id) REFERENCES ai_drafts(id);

ALTER TABLE quality_reviews
  ADD CONSTRAINT fk_quality_reviews_ai_draft
  FOREIGN KEY (ai_draft_id) REFERENCES ai_drafts(id);


-- ============================================================
-- INDEXES
-- Core lookup and join indexes.
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- shg_members
CREATE INDEX idx_shg_members_shg_id    ON shg_members(shg_id);
CREATE INDEX idx_shg_members_profile_id ON shg_members(profile_id);
CREATE INDEX idx_shg_members_deleted_at ON shg_members(deleted_at) WHERE deleted_at IS NULL;

-- member_skills
CREATE INDEX idx_member_skills_shg_member_id ON member_skills(shg_member_id);
CREATE INDEX idx_member_skills_skill         ON member_skills(skill);

-- member_availability
CREATE INDEX idx_member_availability_shg_member_id ON member_availability(shg_member_id);
CREATE INDEX idx_member_availability_dates
  ON member_availability(shg_member_id, available_from, available_to);

-- orders
CREATE INDEX idx_orders_shg_id      ON orders(shg_id);
CREATE INDEX idx_orders_buyer_id    ON orders(buyer_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_deleted_at  ON orders(deleted_at) WHERE deleted_at IS NULL;

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- production_plans
CREATE INDEX idx_production_plans_order_id ON production_plans(order_id);

-- plan_stages
CREATE INDEX idx_plan_stages_plan_id    ON plan_stages(production_plan_id);
CREATE INDEX idx_plan_stages_order      ON plan_stages(production_plan_id, stage_order);

-- tasks
CREATE INDEX idx_tasks_order_id      ON tasks(order_id);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_plan_stage_id ON tasks(plan_stage_id);

-- task_assignments
CREATE INDEX idx_task_assignments_task_id       ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_shg_member_id ON task_assignments(shg_member_id);

-- progress_updates
CREATE INDEX idx_progress_updates_task_id ON progress_updates(task_id);

-- proof_media
CREATE INDEX idx_proof_media_task_id ON proof_media(task_id);
CREATE INDEX idx_proof_media_status  ON proof_media(status);

-- quality_reviews
CREATE INDEX idx_quality_reviews_task_id ON quality_reviews(task_id);

-- rework_tasks
CREATE INDEX idx_rework_tasks_original ON rework_tasks(original_task_id);
CREATE INDEX idx_rework_tasks_rework   ON rework_tasks(rework_task_id);

-- cost_sheets
CREATE INDEX idx_cost_sheets_order_id ON cost_sheets(order_id);

-- cost_components
CREATE INDEX idx_cost_components_cost_sheet_id ON cost_components(cost_sheet_id);

-- payout_sheets
CREATE INDEX idx_payout_sheets_order_id ON payout_sheets(order_id);
CREATE INDEX idx_payout_sheets_status   ON payout_sheets(status);

-- payout_lines
CREATE INDEX idx_payout_lines_payout_sheet_id ON payout_lines(payout_sheet_id);
CREATE INDEX idx_payout_lines_shg_member_id   ON payout_lines(shg_member_id);

-- payout_approvals
CREATE INDEX idx_payout_approvals_payout_sheet_id ON payout_approvals(payout_sheet_id);

-- notifications
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread
  ON notifications(recipient_id, is_read) WHERE is_read = FALSE;

-- audit_events
CREATE INDEX idx_audit_events_entity_id ON audit_events(entity_id);
CREATE INDEX idx_audit_events_order_id  ON audit_events(order_id);
CREATE INDEX idx_audit_events_shg_id    ON audit_events(shg_id);
CREATE INDEX idx_audit_events_actor_id  ON audit_events(actor_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- ai_drafts
CREATE INDEX idx_ai_drafts_order_id ON ai_drafts(order_id);
CREATE INDEX idx_ai_drafts_status   ON ai_drafts(status);


COMMIT;
