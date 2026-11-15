-- Demo seed data for ASHA MVP
-- Creates: 1 SHG, 12 members with skills, 4 user accounts
-- NOTE: Run AFTER applying all migrations.
-- NOTE: User accounts must first be created via Supabase Auth.
--       Replace the UUIDs below with real auth.users UUIDs from your project.

-- ─────────────────────────────────────
-- Demo credentials (create these in Supabase Auth dashboard first)
--   leader@asha.demo     password: AshaDemoLeader123!
--   member@asha.demo     password: AshaDemoMember123!
--   approver@asha.demo   password: AshaDemoApprover123!
--   buyer@asha.demo      password: AshaDemoBuyer123!
-- ─────────────────────────────────────

-- Insert profiles (replace UUIDs with real auth.users UUIDs)
-- These are placeholder UUIDs — update with actual values after creating auth users

DO $$
DECLARE
  v_shg_id UUID;
  v_leader_id UUID;
  v_member_id UUID;
BEGIN

  -- ─────────────────────────────────────
  -- Create SHG
  -- ─────────────────────────────────────
  INSERT INTO shgs (id, name, registration_number, district, state, minimum_margin_percent)
  VALUES (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'Mahila Shakti SHG',
    'KA/SHG/2019/00142',
    'Mysuru',
    'Karnataka',
    15.00
  );

  v_shg_id := 'a1b2c3d4-0001-0001-0001-000000000001';

  -- ─────────────────────────────────────
  -- Insert members (no linked auth profiles for demo)
  -- ─────────────────────────────────────

  -- Member 1: Lakshmi — SHG Leader / high stitching skill
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000001', v_shg_id, 'Lakshmi Devi', '9876543201', 25, 125, 'available', 95.0, 92.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000001', 'STITCHING', 5),
    ('a1b2c3d4-0002-0001-0001-000000000001', 'TAILORING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000001', 'QUALITY_CHECK', 3);

  -- Member 2: Meena — stitching
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000002', v_shg_id, 'Meena Kumari', '9876543202', 20, 100, 'available', 88.0, 85.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000002', 'STITCHING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000002', 'CUTTING', 3);

  -- Member 3: Radha — packing
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000003', v_shg_id, 'Radha Bai', '9876543203', 30, 150, 'available', 92.0, 90.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000003', 'PACKING', 5),
    ('a1b2c3d4-0002-0001-0001-000000000003', 'DELIVERY', 3);

  -- Member 4: Saraswati — tailoring
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000004', v_shg_id, 'Saraswati Rao', '9876543204', 22, 110, 'available', 90.0, 88.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000004', 'TAILORING', 5),
    ('a1b2c3d4-0002-0001-0001-000000000004', 'STITCHING', 3);

  -- Member 5: Devi — embroidery
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000005', v_shg_id, 'Devi Nair', '9876543205', 15, 75, 'available', 97.0, 95.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000005', 'EMBROIDERY', 5),
    ('a1b2c3d4-0002-0001-0001-000000000005', 'STITCHING', 4);

  -- Member 6: Anitha — quality check
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000006', v_shg_id, 'Anitha Sharma', '9876543206', 20, 100, 'available', 94.0, 93.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000006', 'QUALITY_CHECK', 5),
    ('a1b2c3d4-0002-0001-0001-000000000006', 'PACKING', 3);

  -- Member 7: Kamala — cutting
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000007', v_shg_id, 'Kamala Reddy', '9876543207', 25, 125, 'available', 86.0, 84.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000007', 'CUTTING', 5),
    ('a1b2c3d4-0002-0001-0001-000000000007', 'PACKING', 2);

  -- Member 8: Sumitra — stitching
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_rework_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000008', v_shg_id, 'Sumitra Pillai', '9876543208', 18, 90, 'partially_available', 80.0, 12.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000008', 'STITCHING', 3),
    ('a1b2c3d4-0002-0001-0001-000000000008', 'CUTTING', 2);

  -- Member 9: Girija — tailoring
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000009', v_shg_id, 'Girija Menon', '9876543209', 20, 100, 'available', 91.0, 89.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000009', 'TAILORING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000009', 'EMBROIDERY', 3);

  -- Member 10: Bharathi — packing
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000010', v_shg_id, 'Bharathi Krishnan', '9876543210', 28, 140, 'available', 93.0, 91.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000010', 'PACKING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000010', 'DELIVERY', 4);

  -- Member 11: Usha — cutting + stitching
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000011', v_shg_id, 'Usha Iyer', '9876543211', 22, 110, 'available', 89.0, 87.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000011', 'CUTTING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000011', 'STITCHING', 3);

  -- Member 12: Vimala — unavailable (to demonstrate availability handling)
  INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
  VALUES ('a1b2c3d4-0002-0001-0001-000000000012', v_shg_id, 'Vimala Singh', '9876543212', 20, 100, 'unavailable', 87.0, 85.0);

  INSERT INTO member_skills (shg_member_id, skill, proficiency)
  VALUES
    ('a1b2c3d4-0002-0001-0001-000000000012', 'STITCHING', 4),
    ('a1b2c3d4-0002-0001-0001-000000000012', 'TAILORING', 3);

  INSERT INTO member_availability (shg_member_id, available_from, available_to, status, reason)
  VALUES (
    'a1b2c3d4-0002-0001-0001-000000000012',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    'unavailable',
    'Family obligations'
  );

END $$;
