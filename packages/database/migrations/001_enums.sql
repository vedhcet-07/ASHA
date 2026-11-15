-- Migration 001: Create all enums
-- Run this first before creating any tables.

CREATE TYPE user_role AS ENUM (
  'leader',
  'member',
  'approver',
  'checker',
  'buyer',
  'federation_staff',
  'admin'
);

CREATE TYPE availability_status AS ENUM (
  'available',
  'partially_available',
  'unavailable'
);

CREATE TYPE member_skill AS ENUM (
  'CUTTING',
  'STITCHING',
  'TAILORING',
  'EMBROIDERY',
  'PACKING',
  'QUALITY_CHECK',
  'DELIVERY',
  'ACCOUNTING',
  'OTHER'
);

CREATE TYPE order_status AS ENUM (
  'REQUESTED',
  'REVIEWED',
  'PLANNING',
  'ALLOCATION_PENDING',
  'IN_PROGRESS',
  'QUALITY_REVIEW',
  'REWORK',
  'READY',
  'DELIVERED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE task_status AS ENUM (
  'PROPOSED',
  'ASSIGNED',
  'ACCEPTED',
  'REJECTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'QUALITY_REVIEW',
  'REWORK',
  'CANCELLED'
);

CREATE TYPE quality_decision AS ENUM (
  'ACCEPTED',
  'REWORK',
  'REJECTED'
);

CREATE TYPE cost_component_type AS ENUM (
  'MATERIAL',
  'LABOUR',
  'PACKAGING',
  'TRANSPORT',
  'UTILITIES',
  'OTHER_OVERHEAD',
  'MARGIN'
);

CREATE TYPE payout_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED',
  'TASK_REMINDER',
  'DELAY_WARNING',
  'QUALITY_REVIEW_REQUIRED',
  'REWORK_REQUIRED',
  'PAYOUT_READY',
  'PAYOUT_APPROVED',
  'PAYOUT_CHANGES_REQUESTED'
);

CREATE TYPE ai_draft_status AS ENUM (
  'PENDING',
  'VALID',
  'INVALID',
  'REVIEWED',
  'DISCARDED'
);
