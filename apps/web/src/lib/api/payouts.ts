import { apiClient } from './client';

export interface PayoutLine {
  member_id: string;
  member_name: string;
  task_name: string;
  allocated_quantity: number;
  completed_quantity: number;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  rate: number;
  payable_amount: number;
  explanation: string;
}

export interface PayoutSheet {
  id: string;
  order_id: string;
  status: string;
  total_payable_amount: number;
  total_accepted_quantity: number;
  submitted_by?: string;
  submitted_at?: string;
  lines: PayoutLine[];
}

export const payoutsApi = {
  getPayoutSheet: async (orderId: string): Promise<PayoutSheet> => {
    const res = await apiClient.get(`/orders/${orderId}/payout`);
    return res.data.data;
  },
  recalculate: async (orderId: string): Promise<PayoutSheet> => {
    const res = await apiClient.post(`/orders/${orderId}/payout/calculate`);
    return res.data.data;
  },
  submit: async (orderId: string): Promise<PayoutSheet> => {
    const res = await apiClient.post(`/orders/${orderId}/payout/submit`);
    return res.data.data;
  },
  approve: async (orderId: string, action: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED', note?: string): Promise<PayoutSheet> => {
    const res = await apiClient.post(`/orders/${orderId}/payout/approve`, { action, note });
    return res.data.data;
  },
  getExplanation: async (orderId: string) => {
    const res = await apiClient.get(`/orders/${orderId}/payout/explanation`);
    return res.data.data;
  }
};
