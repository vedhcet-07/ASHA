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
