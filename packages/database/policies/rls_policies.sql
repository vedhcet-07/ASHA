-- ============================================================================
-- ASHA – rls_policies.sql
-- Comprehensive Row Level Security policies for ALL tables
-- ============================================================================
-- Convention:
--   • Every table gets at least a SELECT policy.
--   • Write policies (INSERT / UPDATE / DELETE) are scoped by role.
--   • "same SHG" is resolved via current_user_shg_id().
--   • Admin / leader can see & manage everything within their SHG.
--   • Members see only what they are assigned to or what belongs to their SHG.
--   • Buyers see only their own orders.
-- ============================================================================

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Users can always read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can read profiles of members in the same SHG
CREATE POLICY profiles_select_same_shg ON profiles
  FOR SELECT USING (
    id IN (
      SELECT sm.profile_id
      FROM shg_members sm
      WHERE sm.shg_id = current_user_shg_id()
        AND sm.is_active = true
        AND sm.deleted_at IS NULL
    )
  );

-- Users can update only their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can insert profiles (service-role bypass usually handles sign-up)
CREATE POLICY profiles_insert_admin ON profiles
  FOR INSERT WITH CHECK (current_user_role() = 'admin');


-- ============================================================================
-- SHGS
-- ============================================================================
CREATE POLICY shgs_select_own ON shgs
  FOR SELECT USING (id = current_user_shg_id());

CREATE POLICY shgs_select_admin ON shgs
  FOR SELECT USING (current_user_role() = 'admin');

CREATE POLICY shgs_insert_admin ON shgs
  FOR INSERT WITH CHECK (current_user_role() = 'admin');

CREATE POLICY shgs_update_leader ON shgs
  FOR UPDATE USING (
    id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- SHG_MEMBERS
-- ============================================================================
CREATE POLICY shg_members_select_same_shg ON shg_members
  FOR SELECT USING (shg_id = current_user_shg_id());

CREATE POLICY shg_members_insert_leader ON shg_members
  FOR INSERT WITH CHECK (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY shg_members_update_leader ON shg_members
  FOR UPDATE USING (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

-- Members can update their own availability_status
CREATE POLICY shg_members_update_own ON shg_members
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY shg_members_delete_leader ON shg_members
  FOR DELETE USING (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- MEMBER_SKILLS
-- ============================================================================
CREATE POLICY member_skills_select_same_shg ON member_skills
  FOR SELECT USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
  );

CREATE POLICY member_skills_insert_leader ON member_skills
  FOR INSERT WITH CHECK (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY member_skills_update_leader ON member_skills
  FOR UPDATE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY member_skills_delete_leader ON member_skills
  FOR DELETE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- MEMBER_AVAILABILITY
-- ============================================================================
CREATE POLICY member_availability_select_same_shg ON member_availability
  FOR SELECT USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
  );

-- Members can manage their own availability
CREATE POLICY member_availability_insert_own ON member_availability
  FOR INSERT WITH CHECK (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY member_availability_update_own ON member_availability
  FOR UPDATE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

-- Leaders can manage any member's availability
CREATE POLICY member_availability_insert_leader ON member_availability
  FOR INSERT WITH CHECK (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY member_availability_update_leader ON member_availability
  FOR UPDATE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- BUYERS
-- ============================================================================
-- Leaders / admin can see all buyers for their SHG orders
CREATE POLICY buyers_select_leader ON buyers
  FOR SELECT USING (
    current_user_role() IN ('leader', 'admin', 'federation_staff')
    OR id IN (
      SELECT buyer_id FROM orders WHERE shg_id = current_user_shg_id()
    )
  );

-- Buyers can see their own record
CREATE POLICY buyers_select_own ON buyers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY buyers_insert_leader ON buyers
  FOR INSERT WITH CHECK (
    current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY buyers_update_leader ON buyers
  FOR UPDATE USING (
    current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY buyers_update_own ON buyers
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());


-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE POLICY orders_select_shg ON orders
  FOR SELECT USING (shg_id = current_user_shg_id());

-- Buyers can see their own orders
CREATE POLICY orders_select_buyer ON orders
  FOR SELECT USING (
    buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid())
  );

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

CREATE POLICY orders_delete_admin ON orders
  FOR DELETE USING (
    shg_id = current_user_shg_id()
    AND current_user_role() = 'admin'
  );


-- ============================================================================
-- ORDER_ITEMS
-- ============================================================================
CREATE POLICY order_items_select_shg ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
  );

CREATE POLICY order_items_select_buyer ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders
      WHERE buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY order_items_insert_leader ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY order_items_update_leader ON order_items
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- PRODUCTION_PLANS
-- ============================================================================
CREATE POLICY production_plans_select_shg ON production_plans
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
  );

CREATE POLICY production_plans_insert_leader ON production_plans
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY production_plans_update_leader ON production_plans
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- PLAN_STAGES
-- ============================================================================
CREATE POLICY plan_stages_select_shg ON plan_stages
  FOR SELECT USING (
    production_plan_id IN (
      SELECT pp.id FROM production_plans pp
      JOIN orders o ON o.id = pp.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

CREATE POLICY plan_stages_insert_leader ON plan_stages
  FOR INSERT WITH CHECK (
    production_plan_id IN (
      SELECT pp.id FROM production_plans pp
      JOIN orders o ON o.id = pp.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY plan_stages_update_leader ON plan_stages
  FOR UPDATE USING (
    production_plan_id IN (
      SELECT pp.id FROM production_plans pp
      JOIN orders o ON o.id = pp.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- TASKS
-- ============================================================================
-- SHG members can see all tasks for their SHG's orders
CREATE POLICY tasks_select_shg ON tasks
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
  );

-- Members can also see tasks assigned to them even if SHG lookup fails
CREATE POLICY tasks_select_assigned ON tasks
  FOR SELECT USING (
    id IN (
      SELECT ta.task_id FROM task_assignments ta
      JOIN shg_members sm ON sm.id = ta.shg_member_id
      WHERE sm.profile_id = auth.uid()
    )
  );

CREATE POLICY tasks_insert_leader ON tasks
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY tasks_update_leader ON tasks
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

-- Members can update task status for their assignments (e.g. IN_PROGRESS, SUBMITTED)
CREATE POLICY tasks_update_assigned_member ON tasks
  FOR UPDATE USING (
    id IN (
      SELECT ta.task_id FROM task_assignments ta
      JOIN shg_members sm ON sm.id = ta.shg_member_id
      WHERE sm.profile_id = auth.uid()
    )
  );


-- ============================================================================
-- TASK_ASSIGNMENTS
-- ============================================================================
CREATE POLICY task_assignments_select_shg ON task_assignments
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

-- Members can see their own assignments
CREATE POLICY task_assignments_select_own ON task_assignments
  FOR SELECT USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY task_assignments_insert_leader ON task_assignments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

-- Members can update their own assignment (accept/reject)
CREATE POLICY task_assignments_update_own ON task_assignments
  FOR UPDATE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY task_assignments_update_leader ON task_assignments
  FOR UPDATE USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- PROGRESS_UPDATES
-- ============================================================================
CREATE POLICY progress_updates_select_shg ON progress_updates
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

-- Members can insert their own progress
CREATE POLICY progress_updates_insert_own ON progress_updates
  FOR INSERT WITH CHECK (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY progress_updates_update_own ON progress_updates
  FOR UPDATE USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );


-- ============================================================================
-- PROOF_MEDIA
-- ============================================================================
CREATE POLICY proof_media_select_shg ON proof_media
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

-- Buyers can see media marked as buyer-visible
CREATE POLICY proof_media_select_buyer ON proof_media
  FOR SELECT USING (
    is_buyer_visible = true
    AND task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY proof_media_insert_own ON proof_media
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY proof_media_update_leader ON proof_media
  FOR UPDATE USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- QUALITY_REVIEWS
-- ============================================================================
CREATE POLICY quality_reviews_select_shg ON quality_reviews
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

CREATE POLICY quality_reviews_insert_checker ON quality_reviews
  FOR INSERT WITH CHECK (
    reviewed_by = auth.uid()
    AND current_user_role() IN ('checker', 'leader', 'admin')
  );

CREATE POLICY quality_reviews_update_checker ON quality_reviews
  FOR UPDATE USING (
    reviewed_by = auth.uid()
    AND current_user_role() IN ('checker', 'leader', 'admin')
  );


-- ============================================================================
-- REWORK_TASKS
-- ============================================================================
CREATE POLICY rework_tasks_select_shg ON rework_tasks
  FOR SELECT USING (
    original_task_id IN (
      SELECT t.id FROM tasks t
      JOIN orders o ON o.id = t.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

CREATE POLICY rework_tasks_insert_leader ON rework_tasks
  FOR INSERT WITH CHECK (
    current_user_role() IN ('checker', 'leader', 'admin')
  );

CREATE POLICY rework_tasks_update_leader ON rework_tasks
  FOR UPDATE USING (
    current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- COST_SHEETS
-- ============================================================================
CREATE POLICY cost_sheets_select_shg ON cost_sheets
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'approver', 'admin', 'federation_staff')
  );

CREATE POLICY cost_sheets_insert_leader ON cost_sheets
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY cost_sheets_update_leader ON cost_sheets
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- COST_COMPONENTS
-- ============================================================================
CREATE POLICY cost_components_select_shg ON cost_components
  FOR SELECT USING (
    cost_sheet_id IN (
      SELECT cs.id FROM cost_sheets cs
      JOIN orders o ON o.id = cs.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'approver', 'admin', 'federation_staff')
  );

CREATE POLICY cost_components_insert_leader ON cost_components
  FOR INSERT WITH CHECK (
    cost_sheet_id IN (
      SELECT cs.id FROM cost_sheets cs
      JOIN orders o ON o.id = cs.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY cost_components_update_leader ON cost_components
  FOR UPDATE USING (
    cost_sheet_id IN (
      SELECT cs.id FROM cost_sheets cs
      JOIN orders o ON o.id = cs.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY cost_components_delete_leader ON cost_components
  FOR DELETE USING (
    cost_sheet_id IN (
      SELECT cs.id FROM cost_sheets cs
      JOIN orders o ON o.id = cs.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- PAYOUT_SHEETS
-- ============================================================================
CREATE POLICY payout_sheets_select_shg ON payout_sheets
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'approver', 'admin', 'federation_staff')
  );

CREATE POLICY payout_sheets_insert_leader ON payout_sheets
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY payout_sheets_update_leader ON payout_sheets
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY payout_sheets_update_approver ON payout_sheets
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('approver', 'admin')
  );


-- ============================================================================
-- PAYOUT_LINES
-- ============================================================================
-- Members can see their own payout lines
CREATE POLICY payout_lines_select_own ON payout_lines
  FOR SELECT USING (
    shg_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

-- Leaders / approvers can see all payout lines for their SHG
CREATE POLICY payout_lines_select_leader ON payout_lines
  FOR SELECT USING (
    current_user_role() IN ('leader', 'approver', 'admin', 'federation_staff')
    AND payout_sheet_id IN (
      SELECT ps.id FROM payout_sheets ps
      JOIN orders o ON o.id = ps.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
  );

CREATE POLICY payout_lines_insert_leader ON payout_lines
  FOR INSERT WITH CHECK (
    payout_sheet_id IN (
      SELECT ps.id FROM payout_sheets ps
      JOIN orders o ON o.id = ps.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY payout_lines_update_leader ON payout_lines
  FOR UPDATE USING (
    payout_sheet_id IN (
      SELECT ps.id FROM payout_sheets ps
      JOIN orders o ON o.id = ps.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- PAYOUT_APPROVALS
-- ============================================================================
CREATE POLICY payout_approvals_select_shg ON payout_approvals
  FOR SELECT USING (
    payout_sheet_id IN (
      SELECT ps.id FROM payout_sheets ps
      JOIN orders o ON o.id = ps.order_id
      WHERE o.shg_id = current_user_shg_id()
    )
    AND current_user_role() IN ('leader', 'approver', 'admin', 'federation_staff')
  );

CREATE POLICY payout_approvals_insert_approver ON payout_approvals
  FOR INSERT WITH CHECK (
    approver_id = auth.uid()
    AND current_user_role() IN ('approver', 'admin')
  );

CREATE POLICY payout_approvals_update_approver ON payout_approvals
  FOR UPDATE USING (
    approver_id = auth.uid()
    AND current_user_role() IN ('approver', 'admin')
  );


-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
-- Users can see notifications addressed to them
CREATE POLICY notifications_select_own_profile ON notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());

CREATE POLICY notifications_select_own_member ON notifications
  FOR SELECT USING (
    recipient_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );

-- Leaders can see all notifications in their SHG
CREATE POLICY notifications_select_leader ON notifications
  FOR SELECT USING (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

-- System / leader can insert notifications
CREATE POLICY notifications_insert_leader ON notifications
  FOR INSERT WITH CHECK (
    shg_id = current_user_shg_id()
    AND current_user_role() IN ('leader', 'admin')
  );

-- Users can mark their own notifications as read
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (
    recipient_profile_id = auth.uid()
    OR recipient_member_id IN (
      SELECT id FROM shg_members WHERE profile_id = auth.uid()
    )
  );


-- ============================================================================
-- AUDIT_EVENTS
-- ============================================================================
-- Only leaders / admin / federation_staff can read audit logs
CREATE POLICY audit_events_select_leader ON audit_events
  FOR SELECT USING (
    (shg_id = current_user_shg_id() OR shg_id IS NULL)
    AND current_user_role() IN ('leader', 'admin', 'federation_staff')
  );

-- Insert is typically done via service role or triggers, but allow leaders
CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT WITH CHECK (
    current_user_role() IN ('leader', 'admin', 'federation_staff')
    OR actor_profile_id = auth.uid()
  );

-- Audit events are immutable – no UPDATE or DELETE policies


-- ============================================================================
-- AI_DRAFTS
-- ============================================================================
CREATE POLICY ai_drafts_select_shg ON ai_drafts
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY ai_drafts_insert_leader ON ai_drafts
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );

CREATE POLICY ai_drafts_update_leader ON ai_drafts
  FOR UPDATE USING (
    order_id IN (SELECT id FROM orders WHERE shg_id = current_user_shg_id())
    AND current_user_role() IN ('leader', 'admin')
  );


-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
