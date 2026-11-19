import { apiClient } from './client';

export const reportsApi = {
  getSummary: async () => {
    const res = await apiClient.get('/reports/summary');
    return res.data.data;
  },
  getDeliveryRecord: async (orderId: string) => {
    const res = await apiClient.get(`/buyers/orders/${orderId}/delivery-record`);
    return res.data.data;
  }
};
