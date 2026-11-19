import { z } from "zod";

// ─── Payout Status ─────────────────────────────────────────────────────────────

export const PayoutStatusEnum = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
]);

export type PayoutStatus = z.infer<typeof PayoutStatusEnum>;

// ─── Payout Line ───────────────────────────────────────────────────────────────

export const PayoutLineSchema = z.object({
  id: z.string().uuid(),
  payoutSheetId: z.string().uuid(),
  memberId: z.string().uuid(),
  taskAssignmentId: z.string().uuid(),
  quantityCompleted: z.number().int().nonnegative(),
  ratePerUnit: z.number().nonnegative(),
  grossAmount: z.number().nonnegative(),
  deductions: z.number().nonnegative().default(0),
  netAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});

export type PayoutLine = z.infer<typeof PayoutLineSchema>;

// ─── Payout Sheet ──────────────────────────────────────────────────────────────

export const PayoutSheetSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  shgId: z.string().uuid(),
  lines: z.array(PayoutLineSchema),
  totalGrossAmount: z.number().nonnegative(),
  totalDeductions: z.number().nonnegative(),
  totalNetAmount: z.number().nonnegative(),
  currency: z.string().default("INR"),
  status: PayoutStatusEnum,
  preparedBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PayoutSheet = z.infer<typeof PayoutSheetSchema>;

// ─── Payout Approval ───────────────────────────────────────────────────────────

export const PayoutApprovalSchema = z.object({
  id: z.string().uuid(),
  payoutSheetId: z.string().uuid(),
  approvedBy: z.string().uuid(),
  approved: z.boolean(),
  remarks: z.string().optional(),
  approvedAt: z.coerce.date(),
});

export type PayoutApproval = z.infer<typeof PayoutApprovalSchema>;
