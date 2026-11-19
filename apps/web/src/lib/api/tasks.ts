import { apiClient } from './client';

export interface TaskItem {
  id: string;
  order_id: string;
  task_name: string;
  task_type: string;
  required_skill: string;
  allocated_quantity: number;
  completed_quantity: number;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  due_date: string;
  status: string;
  assigned_member_id: string;
  assigned_member_name: string;
  rate_per_unit: number;
  is_rework?: boolean;
  rework_reason?: string;
  proofs?: any[];
}

export const tasksApi = {
  getMyTasks: async (): Promise<TaskItem[]> => {
    const res = await apiClient.get('/member/tasks');
    return res.data.data;
  },
  getTask: async (id: string): Promise<TaskItem> => {
    const res = await apiClient.get(`/member/tasks/${id}`);
    return res.data.data;
  },
  accept: async (id: string): Promise<TaskItem> => {
    const res = await apiClient.post(`/member/tasks/${id}/accept`);
    return res.data.data;
  },
  reject: async (id: string, reason: string): Promise<TaskItem> => {
    const res = await apiClient.post(`/member/tasks/${id}/reject`, { reason });
    return res.data.data;
  },
  updateProgress: async (id: string, quantity_completed: number, note?: string): Promise<TaskItem> => {
    const res = await apiClient.post(`/member/tasks/${id}/progress`, { quantity_completed, note });
    return res.data.data;
  },
  completeProof: async (taskId: string, storagePath: string) => {
    const res = await apiClient.post(`/member/tasks/${taskId}/proof/mock-id/complete`, { storage_path: storagePath });
    return res.data.data;
  },
  getVoice: async (id: string): Promise<string> => {
    const res = await apiClient.get(`/member/tasks/${id}/voice`);
    return res.data.data.text;
  },
  getEarnings: async () => {
    const res = await apiClient.get('/member/earnings');
    return res.data.data;
  }
};
