import { z } from "zod";

// ─── Cost Component Type ───────────────────────────────────────────────────────

export const CostComponentTypeEnum = z.enum([
  "RAW_MATERIAL",
  "LABOR",
  "TRANSPORT",
  "PACKAGING",
  "OVERHEAD",
  "MARGIN",
  "TAX",
  "OTHER",
]);

export type CostComponentType = z.infer<typeof CostComponentTypeEnum>;

// ─── Cost Component ────────────────────────────────────────────────────────────

export const CostComponentSchema = z.object({
  id: z.string().uuid(),
  costSheetId: z.string().uuid(),
  type: CostComponentTypeEnum,
  description: z.string().min(1),
  unitCost: z.number().nonnegative(),
  quantity: z.number().positive(),
  totalCost: z.number().nonnegative(),
});

export type CostComponent = z.infer<typeof CostComponentSchema>;

// ─── Cost Sheet ────────────────────────────────────────────────────────────────

export const CostSheetSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().optional(),
  components: z.array(CostComponentSchema),
  totalEstimatedCost: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  profitMargin: z.number(),
  currency: z.string().default("INR"),
  preparedBy: z.string().uuid(),
  approvedBy: z.string().uuid().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CostSheet = z.infer<typeof CostSheetSchema>;
