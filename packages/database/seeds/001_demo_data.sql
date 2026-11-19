-- ============================================================================
-- ASHA – 001_demo_data.sql
-- Demo seed data for local / staging environments
-- ============================================================================

-- ============================================================================
-- 0. DETERMINISTIC UUIDs for cross-referencing
-- ============================================================================

-- SHG
-- shg_id  = 'a0000000-0000-4000-8000-000000000001'

-- Profiles (leader + 12 members + buyer)
-- leader  = 'b0000000-0000-4000-8000-000000000001'  (Priya – leader)
-- buyer   = 'b0000000-0000-4000-8000-000000000099'  (Ramesh)

-- Members  b0000000-0000-4000-8000-0000000000{02..13}
-- Member roster:
--  02 = Lakshmi   03 = Meena    04 = Radha    05 = Saraswati
--  06 = Devi      07 = Anitha   08 = Kavitha  09 = Suma
--  10 = Geetha    11 = Padma    12 = Nirmala  13 = Bharathi

-- SHG Member rows m0000000-...-{02..13}

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
INSERT INTO profiles (id, full_name, phone_number, role, preferred_language) VALUES
  -- Leader
  ('b0000000-0000-4000-8000-000000000001', 'Priya Sharma',     '+919900000001', 'leader',  'kn'),
  -- Members
  ('b0000000-0000-4000-8000-000000000002', 'Lakshmi Devi',     '+919900000002', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000003', 'Meena Kumari',     '+919900000003', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000004', 'Radha Krishnan',   '+919900000004', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000005', 'Saraswati Bai',    '+919900000005', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000006', 'Devi Prasad',      '+919900000006', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000007', 'Anitha Rao',       '+919900000007', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000008', 'Kavitha Murthy',   '+919900000008', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000009', 'Suma Hegde',       '+919900000009', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000010', 'Geetha Nair',      '+919900000010', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000011', 'Padma Reddy',      '+919900000011', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000012', 'Nirmala Joshi',    '+919900000012', 'member',  'kn'),
  ('b0000000-0000-4000-8000-000000000013', 'Bharathi Suresh',  '+919900000013', 'member',  'kn'),
  -- Approver
  ('b0000000-0000-4000-8000-000000000014', 'Sunita Verma',     '+919900000014', 'approver','en'),
  -- Buyer
  ('b0000000-0000-4000-8000-000000000099', 'Ramesh Kumar',     '+919900000099', 'buyer',   'en')
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 2. SHG
-- ============================================================================
INSERT INTO shgs (id, name, registration_number, district, state, minimum_margin_percent, settings, created_by) VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'Shakti Women''s Self-Help Group',
    'KA/BLR/SHG/2024/0042',
    'Bengaluru Urban',
    'Karnataka',
    15.00,
    '{"default_working_days": 6, "quality_threshold_percent": 90}'::jsonb,
    'b0000000-0000-4000-8000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 3. SHG MEMBERS
-- ============================================================================
INSERT INTO shg_members (id, shg_id, profile_id, member_name, phone_number, daily_capacity, weekly_capacity, availability_status, past_acceptance_rate, past_rework_rate, past_on_time_rate) VALUES
  -- Lakshmi – experienced tailor
  ('m0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   'Lakshmi Devi',    '+919900000002', 10, 55, 'available',            95.00, 3.00, 92.00),
  -- Meena – stitching specialist
  ('m0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
   'Meena Kumari',    '+919900000003', 12, 65, 'available',            90.00, 5.00, 88.00),
  -- Radha – embroidery expert
  ('m0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004',
   'Radha Krishnan',  '+919900000004',  6, 30, 'available',            88.00, 8.00, 85.00),
  -- Saraswati – cutting & stitching
  ('m0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000005',
   'Saraswati Bai',   '+919900000005',  8, 45, 'available',            92.00, 4.00, 90.00),
  -- Devi – packing & delivery
  ('m0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000006',
   'Devi Prasad',     '+919900000006', 15, 80, 'available',            97.00, 1.00, 95.00),
  -- Anitha – quality checker
  ('m0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007',
   'Anitha Rao',      '+919900000007',  8, 40, 'available',            94.00, 2.00, 93.00),
  -- Kavitha – tailor
  ('m0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000008',
   'Kavitha Murthy',  '+919900000008',  9, 50, 'partially_available',  85.00, 7.00, 82.00),
  -- Suma – embroidery
  ('m0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000009',
   'Suma Hegde',      '+919900000009',  7, 35, 'available',            91.00, 6.00, 87.00),
  -- Geetha – cutting
  ('m0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000010',
   'Geetha Nair',     '+919900000010', 11, 60, 'available',            93.00, 4.00, 91.00),
  -- Padma – accounting & other
  ('m0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000011',
   'Padma Reddy',     '+919900000011',  5, 25, 'available',            96.00, 2.00, 94.00),
  -- Nirmala – stitching
  ('m0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000012',
   'Nirmala Joshi',   '+919900000012', 10, 55, 'unavailable',          80.00, 10.00, 75.00),
  -- Bharathi – packing & delivery
  ('m0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000013',
   'Bharathi Suresh', '+919900000013', 14, 75, 'available',            89.00, 5.00, 86.00)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 4. MEMBER SKILLS
-- ============================================================================
INSERT INTO member_skills (id, shg_member_id, skill, proficiency) VALUES
  -- Lakshmi: Tailoring 5, Cutting 3
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000002', 'TAILORING',     5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000002', 'CUTTING',       3),

  -- Meena: Stitching 5, Tailoring 3, Cutting 2
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000003', 'STITCHING',     5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000003', 'TAILORING',     3),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000003', 'CUTTING',       2),

  -- Radha: Embroidery 5, Stitching 2
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000004', 'EMBROIDERY',    5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000004', 'STITCHING',     2),

  -- Saraswati: Cutting 4, Stitching 4
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000005', 'CUTTING',       4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000005', 'STITCHING',     4),

  -- Devi: Packing 5, Delivery 5
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000006', 'PACKING',       5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000006', 'DELIVERY',      5),

  -- Anitha: Quality Check 5, Stitching 3
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000007', 'QUALITY_CHECK', 5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000007', 'STITCHING',     3),

  -- Kavitha: Tailoring 4, Embroidery 2, Cutting 3
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000008', 'TAILORING',     4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000008', 'EMBROIDERY',    2),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000008', 'CUTTING',       3),

  -- Suma: Embroidery 4, Stitching 3
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000009', 'EMBROIDERY',    4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000009', 'STITCHING',     3),

  -- Geetha: Cutting 5, Tailoring 2
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000010', 'CUTTING',       5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000010', 'TAILORING',     2),

  -- Padma: Accounting 5, Other 3
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000011', 'ACCOUNTING',    5),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000011', 'OTHER',         3),

  -- Nirmala: Stitching 4, Packing 2
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000012', 'STITCHING',     4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000012', 'PACKING',       2),

  -- Bharathi: Packing 4, Delivery 4, Quality Check 2
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000013', 'PACKING',       4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000013', 'DELIVERY',      4),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000013', 'QUALITY_CHECK', 2)
ON CONFLICT (shg_member_id, skill) DO NOTHING;


-- ============================================================================
-- 5. MEMBER AVAILABILITY
-- ============================================================================
INSERT INTO member_availability (id, shg_member_id, available_from, available_to, status, reason) VALUES
  -- Most members are fully available for the next 30 days
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000002', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000003', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000004', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000005', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000006', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000007', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  -- Kavitha partially available (family commitments)
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000008', CURRENT_DATE, CURRENT_DATE + 14, 'partially_available',  'Family function – can work half days'),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000008', CURRENT_DATE + 15, CURRENT_DATE + 30, 'available',       NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000009', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000010', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000011', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL),
  -- Nirmala unavailable (medical leave)
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000012', CURRENT_DATE, CURRENT_DATE + 10, 'unavailable',          'Medical leave'),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000012', CURRENT_DATE + 11, CURRENT_DATE + 30, 'available',       NULL),
  (uuid_generate_v4(), 'm0000000-0000-4000-8000-000000000013', CURRENT_DATE, CURRENT_DATE + 30, 'available',            NULL);


-- ============================================================================
-- 6. BUYER
-- ============================================================================
INSERT INTO buyers (id, profile_id, buyer_name, organization_name, phone_number, email) VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000099',
    'Ramesh Kumar',
    'Green Earth Crafts',
    '+919900000099',
    'ramesh@example.com'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
