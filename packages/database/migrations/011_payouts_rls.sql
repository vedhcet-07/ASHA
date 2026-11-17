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
