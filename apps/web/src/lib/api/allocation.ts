import { apiClient } from './client';

export interface AllocationItem {
  member_id: string;
  member_name: string;
  allocated_quantity: number;
  score: number;
  reasons: string[];
  override_reason?: string;
}

export interface AllocationProposal {
  proposal_id: string;
  order_id: string;
  total_quantity: number;
  allocations: AllocationItem[];
  warnings: string[];
}

export const allocationApi = {
  propose: async (orderId: string): Promise<AllocationProposal> => {
    const res = await apiClient.post(`/orders/${orderId}/allocation/propose`);
    return res.data.data;
  },
  getProposal: async (orderId: string): Promise<AllocationProposal> => {
    const res = await apiClient.get(`/orders/${orderId}/allocation/proposal`);
    return res.data.data;
  },
  confirm: async (orderId: string, allocations: AllocationItem[], note?: string) => {
    const res = await apiClient.post(`/orders/${orderId}/allocation/confirm`, { allocations, note });
    return res.data.data;
  },
  getExplanation: async (orderId: string) => {
    const res = await apiClient.get(`/orders/${orderId}/allocation/explanation`);
    return res.data.data;
  }
};
