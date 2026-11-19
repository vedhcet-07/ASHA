export type OrderStatus = 
  | 'REQUESTED' 
  | 'REVIEWED' 
  | 'PLANNING' 
  | 'ALLOCATION_PENDING' 
  | 'IN_PROGRESS' 
  | 'QUALITY_REVIEW' 
  | 'REWORK' 
  | 'READY' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'COMPLETED';

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_type: string;
  agreed_unit_price?: number;
  specifications?: Record<string, any>;
}

export interface Order {
  id: string;
  order_number: string;
  title: string;
  description?: string;
  required_by_date: string;
  delivery_address?: string;
  special_instructions?: string;
  status: OrderStatus;
  buyer_id?: string;
  buyer_name?: string;
  created_at: string;
  items: OrderItem[];
}
