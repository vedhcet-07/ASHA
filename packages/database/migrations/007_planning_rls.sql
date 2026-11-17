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
