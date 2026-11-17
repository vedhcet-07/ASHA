-- Migration 004: Buyers, Orders, and Order Items
-- Requires: 001_enums.sql, 002_profiles_and_shg.sql

-- ─────────────────────────────────────
-- buyers
-- ─────────────────────────────────────
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  buyer_name TEXT NOT NULL,
  organization_name TEXT,
  phone_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- orders
-- ─────────────────────────────────────
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID NOT NULL REFERENCES shgs(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  order_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  required_by_date DATE NOT NULL,
  delivery_address TEXT,
  special_instructions TEXT,
  status order_status NOT NULL DEFAULT 'REQUESTED',
  rejection_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- order_items
-- ─────────────────────────────────────
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_type TEXT NOT NULL DEFAULT 'piece',
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  agreed_unit_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────
-- audit_events (needed for order actions)
-- ─────────────────────────────────────
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shg_id UUID REFERENCES shgs(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────
CREATE INDEX idx_orders_shg      ON orders(shg_id);
CREATE INDEX idx_orders_buyer    ON orders(buyer_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_audit_order     ON audit_events(order_id);
CREATE INDEX idx_audit_created   ON audit_events(created_at DESC);
