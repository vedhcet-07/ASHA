import { z } from "zod";

// ─── Order Status ──────────────────────────────────────────────────────────────

export const OrderStatusEnum = z.enum([
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

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// ─── Order Item ────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitType: z.string().min(1),
  specifications: z.string().optional(),
  agreedUnitPrice: z.number().nonnegative(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

// ─── Order ─────────────────────────────────────────────────────────────────────

export const OrderSchema = z.object({
  id: z.string().uuid(),
  shgId: z.string().uuid(),
  buyerId: z.string().uuid(),
  orderNumber: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  requiredByDate: z.coerce.date(),
  deliveryAddress: z.string().min(1),
  specialInstructions: z.string().optional(),
  status: OrderStatusEnum,
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Order = z.infer<typeof OrderSchema>;
