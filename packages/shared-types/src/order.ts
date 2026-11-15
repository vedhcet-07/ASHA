import { z } from "zod";
import type { OrderStatus } from "./enums";

export interface Buyer {
  id: string;
  profile_id?: string;
  buyer_name: string;
  organization_name?: string;
  phone_number?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  shg_id: string;
  buyer_id: string;
  order_number: string;
  title: string;
  description?: string;
  required_by_date: string;
  delivery_address?: string;
  special_instructions?: string;
  status: OrderStatus;
  created_by?: string;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_type: string;
  specifications: Record<string, unknown>;
  agreed_unit_price?: number;
  created_at: string;
  updated_at: string;
}

export const CreateOrderItemSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_type: z.string().default("piece"),
  specifications: z.record(z.unknown()).default({}),
  agreed_unit_price: z.number().min(0).optional(),
});

export const CreateOrderSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  required_by_date: z.string().min(1, "Required date is needed"),
  delivery_address: z.string().optional(),
  special_instructions: z.string().optional(),
  items: z.array(CreateOrderItemSchema).min(1, "At least one item is required"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
