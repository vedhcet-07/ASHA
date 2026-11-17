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
