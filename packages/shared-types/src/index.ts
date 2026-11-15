/**
 * @asha/shared-types
 *
 * Zod schemas and inferred TypeScript types for all core ASHA platform entities.
 * Enum values match the PostgreSQL enum definitions in the database schema.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Status Enums
// Matching PostgreSQL CREATE TYPE definitions in the design.
// ---------------------------------------------------------------------------

/** Matches: CREATE TYPE order_status AS ENUM (...) */
export const OrderStatusSchema = z.enum([
  "REQUESTED",
  "REVIEWED",
  "PLANNING",
  "ALLOCATION_PENDING",
  "IN_PROGRESS",
  "QUALITY_REVIEW",
  "REWORK",
  "READY",
  "DELIVERED",
  "CANCELLED",
  "COMPLETED",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Matches: CREATE TYPE task_status AS ENUM (...) */
export const TaskStatusSchema = z.enum([
  "PROPOSED",
  "ASSIGNED",
  "ACCEPTED",
  "REJECTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "QUALITY_REVIEW",
  "REWORK",
  "CANCELLED",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/** Matches: CREATE TYPE payout_status AS ENUM (...) */
export const PayoutStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

/** Matches: CREATE TYPE ai_draft_status AS ENUM (...) */
export const AiDraftStatusSchema = z.enum([
  "PENDING",
  "VALID",
  "INVALID",
  "REVIEWED",
  "DISCARDED",
]);
export type AiDraftStatus = z.infer<typeof AiDraftStatusSchema>;

// ---------------------------------------------------------------------------
// Supporting Enums
// ---------------------------------------------------------------------------

export const SkillCatalogueSchema = z.enum([
  "CUTTING",
  "STITCHING",
  "TAILORING",
  "EMBROIDERY",
  "PACKING",
  "QUALITY_CHECK",
  "DELIVERY",
  "ACCOUNTING",
  "OTHER",
]);
export type SkillCatalogue = z.infer<typeof SkillCatalogueSchema>;

export const AvailabilityStatusSchema = z.enum([
  "available",
  "partially_available",
  "unavailable",
]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const MemberResponseSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);
export type MemberResponse = z.infer<typeof MemberResponseSchema>;

export const QualityDecisionSchema = z.enum([
  "ACCEPTED",
  "REWORK",
  "REJECTED",
]);
export type QualityDecision = z.infer<typeof QualityDecisionSchema>;

export const PaymentBasisSchema = z.enum(["PER_PIECE", "HOURLY"]);
export type PaymentBasis = z.infer<typeof PaymentBasisSchema>;

export const MarginTypeSchema = z.enum(["PERCENTAGE", "FIXED_PER_UNIT", "MANUAL"]);
export type MarginType = z.infer<typeof MarginTypeSchema>;

export const CalculationBasisSchema = z.enum([
  "PER_UNIT",
  "PER_BATCH",
  "PER_HOUR",
  "PERCENTAGE",
  "FIXED",
]);
export type CalculationBasis = z.infer<typeof CalculationBasisSchema>;

export const CostComponentTypeSchema = z.enum([
  "MATERIAL",
  "LABOUR",
  "PACKAGING",
  "TRANSPORT",
  "UTILITIES",
  "OTHER_OVERHEAD",
]);
export type CostComponentType = z.infer<typeof CostComponentTypeSchema>;

export const MediaTypeSchema = z.enum(["PHOTO", "VIDEO", "VOICE_NOTE"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const TaskTypeSchema = z.enum(["PIECE_BASED", "STAGE_BASED"]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const UserRoleSchema = z.enum([
  "leader",
  "member",
  "approver",
  "checker",
  "buyer",
  "federation_staff",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const PreferredLanguageSchema = z.enum(["en", "kn", "hi"]);
export type PreferredLanguage = z.infer<typeof PreferredLanguageSchema>;

export const PayoutApprovalActionSchema = z.enum([
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
]);
export type PayoutApprovalAction = z.infer<typeof PayoutApprovalActionSchema>;

// ---------------------------------------------------------------------------
// OrderItem
// ---------------------------------------------------------------------------

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_type: z.string().min(1),
  specifications: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string().min(1),
  shg_id: z.string().uuid(),
  buyer_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  status: OrderStatusSchema,
  required_delivery_date: z.string().date(),
  delivery_address: z.string().min(1),
  items: z.array(OrderItemSchema).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

// ---------------------------------------------------------------------------
// MemberSkill
// ---------------------------------------------------------------------------

export const MemberSkillSchema = z.object({
  id: z.string().uuid(),
  shg_member_id: z.string().uuid(),
  skill: SkillCatalogueSchema,
  proficiency: z.number().int().min(1).max(5),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type MemberSkill = z.infer<typeof MemberSkillSchema>;

// ---------------------------------------------------------------------------
// Member (shg_members row)
// ---------------------------------------------------------------------------

export const MemberSchema = z.object({
  id: z.string().uuid(),
  shg_id: z.string().uuid(),
  profile_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  daily_capacity: z.number().positive(),
  availability_status: AvailabilityStatusSchema,
  acceptance_rate: z.number().min(0).max(1).nullable().optional(),
  rework_rate: z.number().min(0).max(1).nullable().optional(),
  on_time_rate: z.number().min(0).max(1).nullable().optional(),
  skills: z.array(MemberSkillSchema).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Member = z.infer<typeof MemberSchema>;

// ---------------------------------------------------------------------------
// TaskAssignment
// ---------------------------------------------------------------------------

export const TaskAssignmentSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  shg_member_id: z.string().uuid(),
  allocated_quantity: z.number().int().nonnegative(),
  accepted_quantity: z.number().int().nonnegative(),
  rework_quantity: z.number().int().nonnegative(),
  rejected_quantity: z.number().int().nonnegative(),
  member_response: MemberResponseSchema,
  rejection_reason: z.string().nullable().optional(),
  allocation_score: z.number().min(0).max(1).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type TaskAssignment = z.infer<typeof TaskAssignmentSchema>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const TaskSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  plan_stage_id: z.string().uuid().nullable().optional(),
  task_type: TaskTypeSchema,
  required_skill: SkillCatalogueSchema,
  total_quantity: z.number().int().positive(),
  deadline: z.string().datetime(),
  instructions: z.string().nullable().optional(),
  status: TaskStatusSchema,
  assignments: z.array(TaskAssignmentSchema).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// CostComponent
// ---------------------------------------------------------------------------

export const CostComponentSchema = z.object({
  id: z.string().uuid(),
  cost_sheet_id: z.string().uuid(),
  component_type: CostComponentTypeSchema,
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  calculation_basis: CalculationBasisSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CostComponent = z.infer<typeof CostComponentSchema>;

// ---------------------------------------------------------------------------
// CostSheet
// ---------------------------------------------------------------------------

export const CostSheetSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  order_item_id: z.string().uuid().nullable().optional(),
  version: z.number().int().positive(),
  quantity: z.number().int().positive(),
  material_cost: z.number().nonnegative(),
  labour_cost: z.number().nonnegative(),
  overhead_cost: z.number().nonnegative(),
  total_cost: z.number().nonnegative(),
  unit_cost: z.number().nonnegative(),
  margin_type: MarginTypeSchema,
  margin_value: z.number().nonnegative(),
  margin_per_unit: z.number().nonnegative(),
  selling_price_per_unit: z.number().nonnegative(),
  pricing_warnings: z.array(z.string()).optional(),
  components: z.array(CostComponentSchema).optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type CostSheet = z.infer<typeof CostSheetSchema>;

// ---------------------------------------------------------------------------
// PayoutLine
// ---------------------------------------------------------------------------

export const PayoutLineSchema = z.object({
  id: z.string().uuid(),
  payout_sheet_id: z.string().uuid(),
  shg_member_id: z.string().uuid(),
  task_id: z.string().uuid(),
  allocated_quantity: z.number().int().nonnegative(),
  accepted_quantity: z.number().int().nonnegative(),
  rework_quantity: z.number().int().nonnegative(),
  rejected_quantity: z.number().int().nonnegative(),
  rate: z.number().nonnegative(),
  payment_basis: PaymentBasisSchema,
  approved_hours: z.number().nonnegative().nullable().optional(),
  payable_amount: z.number().nonnegative(),
  is_payout_eligible: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PayoutLine = z.infer<typeof PayoutLineSchema>;

// ---------------------------------------------------------------------------
// PayoutSheet
// ---------------------------------------------------------------------------

export const PayoutSheetSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  version: z.number().int().positive(),
  status: PayoutStatusSchema,
  total_payout: z.number().nonnegative(),
  lines: z.array(PayoutLineSchema).optional(),
  submitted_by: z.string().uuid().nullable().optional(),
  submitted_at: z.string().datetime().nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type PayoutSheet = z.infer<typeof PayoutSheetSchema>;

// ---------------------------------------------------------------------------
// AuditEvent
// ---------------------------------------------------------------------------

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  shg_id: z.string().uuid(),
  order_id: z.string().uuid().nullable().optional(),
  old_values: z.record(z.unknown()).nullable().optional(),
  new_values: z.record(z.unknown()).nullable().optional(),
  reason: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
