-- ============================================================
-- MIGRATION 002: Make shg_members.profile_id nullable
-- ============================================================
-- A member record may exist without a linked auth account. Leaders add
-- workers to an SHG during setup; only some of those workers later create
-- their own auth accounts and are linked via profile_id. Making the column
-- nullable aligns the schema with the member CRUD API (which accepts
-- profile_id as optional) and the shared-types MemberSchema
-- (`profile_id: z.string().uuid().nullable().optional()`).
--
-- The UNIQUE(shg_id, profile_id) constraint is retained. PostgreSQL treats
-- multiple NULLs as distinct, so several unlinked members within the same
-- SHG remain allowed.
--
-- Requirements: 2.2, 2.3
-- ============================================================

ALTER TABLE shg_members ALTER COLUMN profile_id DROP NOT NULL;

COMMENT ON COLUMN shg_members.profile_id IS
  'Optional link to a profiles row (auth user). Nullable so a member can '
  'be enrolled before (or without) creating her own auth account.';
