export type UserRole =
  | "leader"
  | "member"
  | "approver"
  | "checker"
  | "buyer"
  | "federation_staff"
  | "admin";

export type AvailabilityStatus =
  | "available"
  | "partially_available"
  | "unavailable";

export type MemberSkill =
  | "CUTTING"
  | "STITCHING"
  | "TAILORING"
  | "EMBROIDERY"
  | "PACKING"
  | "QUALITY_CHECK"
  | "DELIVERY"
  | "ACCOUNTING"
  | "OTHER";

export type OrderStatus =
  | "REQUESTED"
  | "REVIEWED"
  | "PLANNING"
  | "ALLOCATION_PENDING"
  | "IN_PROGRESS"
  | "QUALITY_REVIEW"
  | "REWORK"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "COMPLETED";

export type TaskStatus =
  | "PROPOSED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "QUALITY_REVIEW"
  | "REWORK"
  | "CANCELLED";

export type QualityDecision = "ACCEPTED" | "REWORK" | "REJECTED";

export type PayoutStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_REMINDER"
  | "DELAY_WARNING"
  | "QUALITY_REVIEW_REQUIRED"
  | "REWORK_REQUIRED"
  | "PAYOUT_READY"
  | "PAYOUT_APPROVED"
  | "PAYOUT_CHANGES_REQUESTED";
