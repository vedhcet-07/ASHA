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
