-- Migration 003: Row-Level Security policies for auth, SHG, and member tables

-- ─────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shg_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_availability ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_shg_id()
RETURNS UUID AS $$
  SELECT shg_id
  FROM shg_members
  WHERE profile_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_shg_leader()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() = 'leader';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─────────────────────────────────────
-- profiles policies
-- ─────────────────────────────────────

-- Users can read their own profile
CREATE POLICY profiles_select_own
ON profiles FOR SELECT
USING (id = auth.uid());

-- Leaders can read profiles of members in their SHG
CREATE POLICY profiles_select_shg_leader
ON profiles FOR SELECT
USING (
  current_user_role() = 'leader'
  AND id IN (
    SELECT profile_id FROM shg_members
    WHERE shg_id = current_user_shg_id()
      AND deleted_at IS NULL
  )
);

-- Users can update their own profile
CREATE POLICY profiles_update_own
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on first login)
CREATE POLICY profiles_insert_own
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────
-- shgs policies
-- ─────────────────────────────────────

-- Leaders can read their own SHG
CREATE POLICY shgs_select_member
ON shgs FOR SELECT
USING (id = current_user_shg_id());

-- Leaders can update their SHG
CREATE POLICY shgs_update_leader
ON shgs FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND id = current_user_shg_id()
);

-- Leaders can create an SHG
CREATE POLICY shgs_insert_leader
ON shgs FOR INSERT
WITH CHECK (current_user_role() = 'leader' OR current_user_role() = 'admin');

-- ─────────────────────────────────────
-- shg_members policies
-- ─────────────────────────────────────

-- Members can read all members in their SHG (for collaboration awareness)
CREATE POLICY shg_members_select_shg
ON shg_members FOR SELECT
USING (shg_id = current_user_shg_id());

-- Leaders can insert members
CREATE POLICY shg_members_insert_leader
ON shg_members FOR INSERT
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- Leaders can update members
CREATE POLICY shg_members_update_leader
ON shg_members FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- ─────────────────────────────────────
-- member_skills policies
-- ─────────────────────────────────────

-- SHG members can read skills for their SHG
CREATE POLICY member_skills_select_shg
ON member_skills FOR SELECT
USING (
  shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

-- Leaders can manage skills
CREATE POLICY member_skills_manage_leader
ON member_skills FOR ALL
USING (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

-- ─────────────────────────────────────
-- member_availability policies
-- ─────────────────────────────────────

CREATE POLICY member_availability_select_shg
ON member_availability FOR SELECT
USING (
  shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);

CREATE POLICY member_availability_manage_leader
ON member_availability FOR ALL
USING (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_member_id IN (
    SELECT id FROM shg_members WHERE shg_id = current_user_shg_id()
  )
);
