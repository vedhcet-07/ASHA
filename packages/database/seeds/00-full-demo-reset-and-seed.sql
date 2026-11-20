-- ==============================================================================
-- ASHA: Full Reset & Demo Seed Script
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ==============================================================================

-- 1. Enable pgcrypto if not already enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Clean up existing data in public and auth tables safely
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'audit_events', 'payout_approvals', 'payout_lines', 'payout_sheets',
    'cost_components', 'cost_sheets', 'quality_reviews', 'proof_media',
    'task_progress', 'task_assignments', 'tasks', 'plan_drafts',
    'order_items', 'orders', 'buyers', 'member_availability',
    'member_skills', 'shg_members', 'shgs', 'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DELETE FROM public.%I', t);
    END IF;
  END LOOP;

  -- Delete all users from auth.users (removes all existing login accounts)
  DELETE FROM auth.users;
END $$;

-- 3. Create Demo Auth Users in auth.users
-- Password for all demo accounts is: AshaDemo123!
-- You can change the passwords below if desired.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES
  -- Leader
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'leader@asha.demo',
    crypt('AshaDemo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Lakshmi Devi"}',
    now(),
    now(),
    '',
    ''
  ),
  -- Member
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'member@asha.demo',
    crypt('AshaDemo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Meena Kumari"}',
    now(),
    now(),
    '',
    ''
  ),
  -- Approver
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'approver@asha.demo',
    crypt('AshaDemo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ananya Sharma"}',
    now(),
    now(),
    '',
    ''
  ),
  -- Buyer
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'buyer@asha.demo',
    crypt('AshaDemo123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ramesh Kumar"}',
    now(),
    now(),
    '',
    ''
  );

-- 3b. Create matching identities in auth.identities (required by Supabase GoTrue)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'leader@asha.demo')::jsonb,
    'email',
    '11111111-1111-1111-1111-111111111111',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'member@asha.demo')::jsonb,
    'email',
    '22222222-2222-2222-2222-222222222222',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    format('{"sub":"%s","email":"%s"}', '33333333-3333-3333-3333-333333333333', 'approver@asha.demo')::jsonb,
    'email',
    '33333333-3333-3333-3333-333333333333',
    now(),
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    format('{"sub":"%s","email":"%s"}', '44444444-4444-4444-4444-444444444444', 'buyer@asha.demo')::jsonb,
    'email',
    '44444444-4444-4444-4444-444444444444',
    now(),
    now(),
    now()
  )
ON CONFLICT DO NOTHING;

-- 4. Create Profiles linked to the Auth Users
INSERT INTO profiles (id, full_name, role, preferred_language, phone_number)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lakshmi Devi',  'leader',   'en', '9876543201'),
  ('22222222-2222-2222-2222-222222222222', 'Meena Kumari',  'member',   'en', '9876543202'),
  ('33333333-3333-3333-3333-333333333333', 'Ananya Sharma', 'approver', 'en', '9876543203'),
  ('44444444-4444-4444-4444-444444444444', 'Ramesh Kumar',  'buyer',    'en', '9988776655');

-- 5. Create Demo SHG
INSERT INTO shgs (id, name, registration_number, district, state, minimum_margin_percent, created_by)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Mahila Shakti SHG',
  'KA/SHG/2019/00142',
  'Mysuru',
  'Karnataka',
  15.00,
  '11111111-1111-1111-1111-111111111111'
);

-- 6. Insert SHG Members (linking Leader and Member to their Auth Profiles)
-- Member 1: Lakshmi (SHG Leader)
INSERT INTO shg_members (id, shg_id, profile_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
VALUES ('a1b2c3d4-0002-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Lakshmi Devi', '9876543201', 25, 125, 'available', 95.0, 92.0);

INSERT INTO member_skills (shg_member_id, skill, proficiency)
VALUES
  ('a1b2c3d4-0002-0001-0001-000000000001', 'STITCHING', 5),
  ('a1b2c3d4-0002-0001-0001-000000000001', 'TAILORING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000001', 'QUALITY_CHECK', 3);

-- Member 2: Meena (SHG Member)
INSERT INTO shg_members (id, shg_id, profile_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
VALUES ('a1b2c3d4-0002-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'Meena Kumari', '9876543202', 20, 100, 'available', 88.0, 85.0);

INSERT INTO member_skills (shg_member_id, skill, proficiency)
VALUES
  ('a1b2c3d4-0002-0001-0001-000000000002', 'STITCHING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000002', 'CUTTING', 3);

-- Members 3 through 12 (SHG group members for allocation demo)
INSERT INTO shg_members (id, shg_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_on_time_rate)
VALUES
  ('a1b2c3d4-0002-0001-0001-000000000003', 'a1b2c3d4-0001-0001-0001-000000000001', 'Radha Bai', '9876543203', 30, 150, 'available', 92.0, 90.0),
  ('a1b2c3d4-0002-0001-0001-000000000004', 'a1b2c3d4-0001-0001-0001-000000000001', 'Sunita Rao', '9876543204', 15, 75, 'available', 80.0, 78.0),
  ('a1b2c3d4-0002-0001-0001-000000000005', 'a1b2c3d4-0001-0001-0001-000000000001', 'Kavitha M', '9876543205', 25, 125, 'available', 97.0, 95.0),
  ('a1b2c3d4-0002-0001-0001-000000000006', 'a1b2c3d4-0001-0001-0001-000000000001', 'Anusuya Gowda', '9876543206', 20, 100, 'available', 85.0, 82.0),
  ('a1b2c3d4-0002-0001-0001-000000000007', 'a1b2c3d4-0001-0001-0001-000000000001', 'Bharathi S', '9876543207', 35, 175, 'available', 90.0, 88.0),
  ('a1b2c3d4-0002-0001-0001-000000000008', 'a1b2c3d4-0001-0001-0001-000000000001', 'Deepa Patil', '9876543208', 20, 100, 'available', 82.0, 80.0),
  ('a1b2c3d4-0002-0001-0001-000000000009', 'a1b2c3d4-0001-0001-0001-000000000001', 'Geetha N', '9876543209', 25, 125, 'available', 94.0, 91.0),
  ('a1b2c3d4-0002-0001-0001-000000000010', 'a1b2c3d4-0001-0001-0001-000000000001', 'Hemalatha K', '9876543210', 15, 75, 'partially_available', 78.0, 75.0),
  ('a1b2c3d4-0002-0001-0001-000000000011', 'a1b2c3d4-0001-0001-0001-000000000001', 'Jayanthi R', '9876543211', 20, 100, 'available', 89.0, 87.0),
  ('a1b2c3d4-0002-0001-0001-000000000012', 'a1b2c3d4-0001-0001-0001-000000000001', 'Vimala Singh', '9876543212', 20, 100, 'unavailable', 87.0, 85.0);

INSERT INTO member_skills (shg_member_id, skill, proficiency)
VALUES
  ('a1b2c3d4-0002-0001-0001-000000000003', 'CUTTING', 5),
  ('a1b2c3d4-0002-0001-0001-000000000003', 'TAILORING', 3),
  ('a1b2c3d4-0002-0001-0001-000000000004', 'EMBROIDERY', 4),
  ('a1b2c3d4-0002-0001-0001-000000000005', 'QUALITY_CHECK', 5),
  ('a1b2c3d4-0002-0001-0001-000000000005', 'STITCHING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000006', 'PACKING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000007', 'CUTTING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000007', 'STITCHING', 5),
  ('a1b2c3d4-0002-0001-0001-000000000008', 'EMBROIDERY', 5),
  ('a1b2c3d4-0002-0001-0001-000000000009', 'STITCHING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000010', 'PACKING', 3),
  ('a1b2c3d4-0002-0001-0001-000000000011', 'CUTTING', 4),
  ('a1b2c3d4-0002-0001-0001-000000000012', 'STITCHING', 4);

-- 7. Insert Buyer
INSERT INTO buyers (id, profile_id, buyer_name, organization_name, phone_number, email)
VALUES (
  'a1b2c3d4-0003-0001-0001-000000000001',
  '44444444-4444-4444-4444-444444444444',
  'Ramesh Kumar',
  'FestiveMart Exports',
  '9988776655',
  'buyer@asha.demo'
);

-- 8. Insert Demo Order
INSERT INTO orders (
  id, shg_id, buyer_id, order_number, title, description,
  required_by_date, delivery_address, special_instructions, status, created_by
) VALUES (
  'a1b2c3d4-0004-0001-0001-000000000001',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0003-0001-0001-000000000001',
  'ORD-2026-001',
  'Festival Eco Tote Bags',
  'Bulk order of eco-friendly tote bags for the upcoming festival season.',
  CURRENT_DATE + INTERVAL '21 days',
  '14, MG Road, Bengaluru, Karnataka 560001',
  'Use natural dye only. Deliver in batches of 50.',
  'REQUESTED',
  '44444444-4444-4444-4444-444444444444'
);

-- 9. Insert Order Items
INSERT INTO order_items (order_id, product_name, quantity, unit_type, specifications, agreed_unit_price)
VALUES
  (
    'a1b2c3d4-0004-0001-0001-000000000001',
    'Canvas Tote Bag',
    100,
    'piece',
    '{"size": "14x16 inch", "colour": "natural", "material": "canvas"}'::jsonb,
    120.00
  ),
  (
    'a1b2c3d4-0004-0001-0001-000000000001',
    'Jute Pouch',
    50,
    'piece',
    '{"size": "8x10 inch", "colour": "natural", "material": "jute"}'::jsonb,
    80.00
  );

-- 10. Audit event
INSERT INTO audit_events (shg_id, order_id, actor_profile_id, event_type, entity_type, entity_id, new_values, metadata)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0004-0001-0001-000000000001',
  '44444444-4444-4444-4444-444444444444',
  'ORDER_CREATED',
  'order',
  'a1b2c3d4-0004-0001-0001-000000000001',
  '{"status": "REQUESTED", "title": "Festival Eco Tote Bags"}'::jsonb,
  '{"source": "demo_seed"}'::jsonb
);

