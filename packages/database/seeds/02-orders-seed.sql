-- Demo seed: Buyer and Orders
-- Run AFTER 01-demo-seed.sql

DO $$
DECLARE
  v_shg_id  UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_buyer_id UUID := 'a1b2c3d4-0003-0001-0001-000000000001';
  v_order_id UUID := 'a1b2c3d4-0004-0001-0001-000000000001';
BEGIN

  -- ─── Buyer ───
  INSERT INTO buyers (id, buyer_name, organization_name, phone_number, email)
  VALUES (
    v_buyer_id,
    'Ramesh Kumar',
    'FestiveMart Exports',
    '9988776655',
    'ramesh@festivmart.in'
  );

  -- ─── Order ───
  INSERT INTO orders (
    id, shg_id, buyer_id, order_number, title, description,
    required_by_date, delivery_address, special_instructions, status
  ) VALUES (
    v_order_id,
    v_shg_id,
    v_buyer_id,
    'ORD-2026-001',
    'Festival Tote Bags',
    'Bulk order of eco-friendly tote bags for the upcoming festival season.',
    CURRENT_DATE + INTERVAL '21 days',
    '14, MG Road, Bengaluru, Karnataka 560001',
    'Use natural dye only. Deliver in batches of 50.',
    'REQUESTED'
  );

  -- ─── Order Items ───
  INSERT INTO order_items (order_id, product_name, quantity, unit_type, specifications, agreed_unit_price)
  VALUES
    (v_order_id, 'Canvas Tote Bag',    100, 'piece',
      '{"size": "14x16 inch", "colour": "natural", "material": "canvas"}'::jsonb, 120.00),
    (v_order_id, 'Jute Pouch',          50, 'piece',
      '{"size": "8x10 inch", "colour": "natural", "material": "jute"}'::jsonb, 80.00),
    (v_order_id, 'Table Runner',         25, 'piece',
      '{"size": "12x48 inch", "colour": "terracotta", "material": "cotton"}'::jsonb, 200.00);

  -- ─── Audit event ───
  INSERT INTO audit_events (shg_id, order_id, event_type, entity_type, entity_id, new_values, metadata)
  VALUES (
    v_shg_id,
    v_order_id,
    'ORDER_CREATED',
    'order',
    v_order_id,
    jsonb_build_object('status', 'REQUESTED', 'title', 'Festival Tote Bags'),
    '{"source": "seed"}'::jsonb
  );

END $$;
