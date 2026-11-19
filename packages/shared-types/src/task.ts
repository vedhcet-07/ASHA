import { z } from "zod";

// ─── Task Status ───────────────────────────────────────────────────────────────

export const TaskStatusEnum = z.enum([
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export type TaskStatus = z.infer<typeof TaskStatusEnum>;

// ─── Task Type ─────────────────────────────────────────────────────────────────

export const TaskTypeEnum = z.enum([
  "PIECE_BASED",
  "STAGE_BASED",
]);

export type TaskType = z.infer<typeof TaskTypeEnum>;

// ─── Task ──────────────────────────────────────────────────────────────────────

export const TaskSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: TaskTypeEnum,
  status: TaskStatusEnum,
  totalQuantity: z.number().int().positive(),
  completedQuantity: z.number().int().nonnegative().default(0),
  ratePerUnit: z.number().nonnegative(),
  dueDate: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Task = z.infer<typeof TaskSchema>;

// ─── Task Assignment ───────────────────────────────────────────────────────────

export const TaskAssignmentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  memberId: z.string().uuid(),
  assignedQuantity: z.number().int().positive(),
  completedQuantity: z.number().int().nonnegative().default(0),
  status: TaskStatusEnum,
  assignedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export type TaskAssignment = z.infer<typeof TaskAssignmentSchema>;

// ─── Progress Update ───────────────────────────────────────────────────────────

export const ProgressUpdateSchema = z.object({
  id: z.string().uuid(),
  taskAssignmentId: z.string().uuid(),
  quantityCompleted: z.number().int().positive(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  reportedBy: z.string().uuid(),
  reportedAt: z.coerce.date(),
});

export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
