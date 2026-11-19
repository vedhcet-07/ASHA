import { apiClient } from './client';

export interface PlanStage {
  stage_name: string;
  stage_order: number;
  requires_skill: string;
  planned_days: number;
  is_quality_checkpoint: boolean;
  description?: string;
}

export interface ProductionPlan {
  id: string;
  order_id: string;
  version: number;
  status: string;
  stages: PlanStage[];
  summary?: string;
}

export const planningApi = {
  generateDraft: async (orderId: string) => {
    const res = await apiClient.post(`/orders/${orderId}/plan/generate`);
    return res.data.data;
  },
  getDraft: async (orderId: string, draftId: string) => {
    const res = await apiClient.get(`/orders/${orderId}/plan/drafts/${draftId}`);
    return res.data.data;
  },
  confirmPlan: async (orderId: string, stages?: PlanStage[]) => {
    const res = await apiClient.post(`/orders/${orderId}/plan/confirm`, { stages });
    return res.data.data;
  },
  getPlan: async (orderId: string): Promise<ProductionPlan> => {
    const res = await apiClient.get(`/orders/${orderId}/plan`);
    return res.data.data;
  }
};
