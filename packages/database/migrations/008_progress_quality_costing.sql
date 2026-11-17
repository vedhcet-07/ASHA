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
