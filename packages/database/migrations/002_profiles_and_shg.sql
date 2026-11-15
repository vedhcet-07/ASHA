-- Migration 002: Profiles, SHGs, and Members
-- Requires: 001_enums.sql

-- ─────────────────────────────────────
-- profiles
-- ─────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role user_role NOT NULL DEFAULT 'member',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- shgs
-- ─────────────────────────────────────
CREATE TABLE shgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  district TEXT,
  state TEXT,
  default_currency TEXT NOT NULL DEFAULT 'INR',
  minimum_margin_percent NUMERIC(5,2) DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER shgs_updated_at
  BEFORE UPDATE ON shgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- shg_members
-- ─────────────────────────────────────
CREATE TABLE shg_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  member_name TEXT NOT NULL,
  phone_number TEXT,
  daily_capacity INTEGER NOT NULL DEFAULT 0,
  weekly_capacity INTEGER NOT NULL DEFAULT 0,
  availability_status availability_status NOT NULL DEFAULT 'available',
  past_acceptance_rate NUMERIC(5,2) DEFAULT 0,
  past_rework_rate NUMERIC(5,2) DEFAULT 0,
  past_on_time_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER shg_members_updated_at
  BEFORE UPDATE ON shg_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- member_skills
-- ─────────────────────────────────────
CREATE TABLE member_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  skill member_skill NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shg_member_id, skill)
);

-- ─────────────────────────────────────
-- member_availability
-- ─────────────────────────────────────
CREATE TABLE member_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_member_id UUID NOT NULL REFERENCES shg_members(id) ON DELETE CASCADE,
  available_from DATE,
  available_to DATE,
  status availability_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER member_availability_updated_at
  BEFORE UPDATE ON member_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_shg_members_shg ON shg_members(shg_id);
CREATE INDEX idx_shg_members_profile ON shg_members(profile_id);
CREATE INDEX idx_member_skills_member ON member_skills(shg_member_id);
