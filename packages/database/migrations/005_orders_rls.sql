-- Migration 005: RLS policies for buyers, orders, order_items, audit_events

ALTER TABLE buyers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────
-- buyers
-- ─────────────────────────────────────

-- Buyers can read their own record
CREATE POLICY buyers_select_own
ON buyers FOR SELECT
USING (profile_id = auth.uid());

-- Leaders can read all buyers who placed orders with their SHG
CREATE POLICY buyers_select_leader
ON buyers FOR SELECT
USING (
  current_user_role() = 'leader'
  AND id IN (
    SELECT buyer_id FROM orders WHERE shg_id = current_user_shg_id()
  )
);

-- Buyers can insert their own record
CREATE POLICY buyers_insert_own
ON buyers FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- ─────────────────────────────────────
-- orders
-- ─────────────────────────────────────

-- Buyers can read their own orders
CREATE POLICY orders_select_buyer
ON orders FOR SELECT
USING (
  current_user_role() = 'buyer'
  AND buyer_id IN (
    SELECT id FROM buyers WHERE profile_id = auth.uid()
  )
);

-- SHG members (all roles) can read orders belonging to their SHG
CREATE POLICY orders_select_shg
ON orders FOR SELECT
USING (shg_id = current_user_shg_id());

-- Buyers can insert orders
CREATE POLICY orders_insert_buyer
ON orders FOR INSERT
WITH CHECK (
  current_user_role() = 'buyer'
  AND buyer_id IN (
    SELECT id FROM buyers WHERE profile_id = auth.uid()
  )
);

-- Leaders can insert orders (manual creation)
CREATE POLICY orders_insert_leader
ON orders FOR INSERT
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- Leaders can update orders in their SHG
CREATE POLICY orders_update_leader
ON orders FOR UPDATE
USING (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
)
WITH CHECK (
  current_user_role() = 'leader'
  AND shg_id = current_user_shg_id()
);

-- ─────────────────────────────────────
-- order_items
-- ─────────────────────────────────────

-- Everyone who can see the order can see its items
CREATE POLICY order_items_select
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders
    WHERE shg_id = current_user_shg_id()
       OR buyer_id IN (SELECT id FROM buyers WHERE profile_id = auth.uid())
  )
);

-- Leaders can manage order items
CREATE POLICY order_items_manage_leader
ON order_items FOR ALL
USING (
  current_user_role() = 'leader'
  AND order_id IN (
    SELECT id FROM orders WHERE shg_id = current_user_shg_id()
  )
)
WITH CHECK (
  current_user_role() = 'leader'
  AND order_id IN (
    SELECT id FROM orders WHERE shg_id = current_user_shg_id()
  )
);

-- ─────────────────────────────────────
-- audit_events (append-only, read by leader/approver)
-- ─────────────────────────────────────

CREATE POLICY audit_select_shg
ON audit_events FOR SELECT
USING (shg_id = current_user_shg_id());

CREATE POLICY audit_insert_all
ON audit_events FOR INSERT
WITH CHECK (shg_id = current_user_shg_id() OR shg_id IS NULL);
