import { apiClient } from './client';
import { TaskItem } from './tasks';

export const qualityApi = {
  getReviewQueue: async (): Promise<TaskItem[]> => {
    const res = await apiClient.get('/quality/review-queue');
    return res.data.data;
  },
  review: async (taskId: string, decision: 'ACCEPTED' | 'REWORK' | 'REJECTED', reviewedQuantity: number, reason?: string) => {
    const res = await apiClient.post(`/quality/tasks/${taskId}/review`, {
      decision,
      reviewed_quantity: reviewedQuantity,
      reason
    });
    return res.data.data;
  },
  getAiSuggestion: async (taskId: string, reason: string): Promise<string> => {
    const res = await apiClient.get(`/quality/tasks/${taskId}/ai-suggestion?reason=${encodeURIComponent(reason)}`);
    return res.data.data.suggested_note;
  }
};
