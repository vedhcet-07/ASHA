-- ============================================================
-- ASHA Platform — Row-Level Security Policies
-- 001_rls.sql
--
-- Enables RLS on every user-facing table and creates
-- per-table SELECT/INSERT/UPDATE/DELETE policies.
--
-- Identity resolution:
--   auth.uid()          → Supabase-issued UUID for the caller
--   get_user_shg_id()   → helper that resolves the caller's
--                         shg_id from shg_members
--
-- Requirements: 16.7, 1.8, 2.10
-- ============================================================

BEGIN;

-- ============================================================
-- HELPER FUNCTION: get_user_shg_id()
-- Returns the shg_id for the currently authenticated user by
-- looking up shg_members where profile_id = auth.uid().
-- Returns NULL when the caller has no SHG membership.
-- Marked STABLE + SECURITY DEFINER so it can query
-- shg_members without recursively triggering RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_shg_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shg_id
  FROM   shg_members
  WHERE  profile_id = auth.uid()
    AND  deleted_at IS NULL
  LIMIT  1;
$$;

COMMENT ON FUNCTION get_user_shg_id() IS
  'Returns the shg_id of the currently authenticated user. '
  'Uses SECURITY DEFINER so it bypasses RLS on shg_members '
  'during self-resolution. Returns NULL for users with no SHG membership.';


-- ============================================================
-- TABLE: profiles
-- Policy: a user may read and update only their own profile row.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: own row only
CREATE POLICY profiles_select_own
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- INSERT: own row only (profile creation at signup)
CREATE POLICY profiles_insert_own
  ON profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: own row only
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE is intentionally omitted — profiles are never hard-deleted.


-- ============================================================
-- TABLE: shg_members
-- Policy: restricted to members of the same SHG.
-- A user can read, insert, update, or delete rows only when
-- shg_id matches the caller's own SHG.
-- ============================================================

ALTER TABLE shg_members ENABLE ROW LEVEL SECURITY;

-- SELECT: same SHG
CREATE POLICY shg_members_select_same_shg
  ON shg_members
  FOR SELECT
  USING (shg_id = get_user_shg_id());

-- INSERT: same SHG (Leader adding a member to their own SHG)
CREATE POLICY shg_members_insert_same_shg
  ON shg_members
  FOR INSERT
  WITH CHECK (shg_id = get_user_shg_id());

-- UPDATE: same SHG
CREATE POLICY shg_members_update_same_shg
  ON shg_members
  FOR UPDATE
  USING (shg_id = get_user_shg_id())
  WITH CHECK (shg_id = get_user_shg_id());

-- DELETE: same SHG (soft-delete sets deleted_at; hard-delete is guarded at API level)
CREATE POLICY shg_members_delete_same_shg
  ON shg_members
  FOR DELETE
  USING (shg_id = get_user_shg_id());


-- ============================================================
-- TABLE: member_skills
-- Policy: restricted to same SHG via shg_member_id → shg_members.shg_id.
-- ============================================================

ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_skills_select_same_shg
  ON member_skills
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_skills.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_skills_insert_same_shg
  ON member_skills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_skills.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_skills_update_same_shg
  ON member_skills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_skills.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_skills.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_skills_delete_same_shg
  ON member_skills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_skills.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );


-- ============================================================
-- TABLE: member_availability
-- Policy: restricted to same SHG via shg_member_id → shg_members.shg_id.
-- ============================================================

ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_availability_select_same_shg
  ON member_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_availability.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_availability_insert_same_shg
  ON member_availability
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_availability.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_availability_update_same_shg
  ON member_availability
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_availability.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_availability.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY member_availability_delete_same_shg
  ON member_availability
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = member_availability.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );


-- ============================================================
-- TABLE: tasks
-- Policy: restricted to same SHG via order_id → orders.shg_id.
-- ============================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_same_shg
  ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   orders o
      WHERE  o.id     = tasks.order_id
        AND  o.shg_id = get_user_shg_id()
    )
  );

CREATE POLICY tasks_insert_same_shg
  ON tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   orders o
      WHERE  o.id     = tasks.order_id
        AND  o.shg_id = get_user_shg_id()
    )
  );

CREATE POLICY tasks_update_same_shg
  ON tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   orders o
      WHERE  o.id     = tasks.order_id
        AND  o.shg_id = get_user_shg_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   orders o
      WHERE  o.id     = tasks.order_id
        AND  o.shg_id = get_user_shg_id()
    )
  );

CREATE POLICY tasks_delete_same_shg
  ON tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   orders o
      WHERE  o.id     = tasks.order_id
        AND  o.shg_id = get_user_shg_id()
    )
  );


-- ============================================================
-- TABLE: task_assignments
-- Policy: restricted to same SHG via shg_member_id → shg_members.shg_id.
-- ============================================================

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_assignments_select_same_shg
  ON task_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = task_assignments.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY task_assignments_insert_same_shg
  ON task_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = task_assignments.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY task_assignments_update_same_shg
  ON task_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = task_assignments.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = task_assignments.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY task_assignments_delete_same_shg
  ON task_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = task_assignments.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );


-- ============================================================
-- TABLE: payout_lines
-- Policy: restricted to same SHG via shg_member_id → shg_members.shg_id.
-- ============================================================

ALTER TABLE payout_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY payout_lines_select_same_shg
  ON payout_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = payout_lines.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY payout_lines_insert_same_shg
  ON payout_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = payout_lines.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY payout_lines_update_same_shg
  ON payout_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = payout_lines.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = payout_lines.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );

CREATE POLICY payout_lines_delete_same_shg
  ON payout_lines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM   shg_members sm
      WHERE  sm.id      = payout_lines.shg_member_id
        AND  sm.shg_id  = get_user_shg_id()
    )
  );


-- ============================================================
-- TABLE: audit_events
-- Policy: restricted to same SHG (shg_id column direct match).
-- audit_events has no FK on order_id by design (survives soft-delete),
-- so we use the shg_id column directly.
-- INSERT is open to any authenticated caller so services can
-- write events (the API uses service-role for writes in
-- production; this policy guards direct client access).
-- DELETE and UPDATE are blocked at the table level via rules
-- defined in the initial schema migration.
-- ============================================================

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_select_same_shg
  ON audit_events
  FOR SELECT
  USING (shg_id = get_user_shg_id());

CREATE POLICY audit_events_insert_same_shg
  ON audit_events
  FOR INSERT
  WITH CHECK (shg_id = get_user_shg_id());

-- UPDATE and DELETE are already blocked by the rules created in
-- 001_initial_schema.sql (audit_events_no_update, audit_events_no_delete).
-- No RLS policies are needed for those operations.


COMMIT;
