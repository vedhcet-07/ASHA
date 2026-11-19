import { apiClient } from './client';
import { Order } from '@/types/order';

export const ordersApi = {
  list: async (): Promise<Order[]> => {
    const res = await apiClient.get('/orders');
    return res.data.data;
  },
  getById: async (id: string): Promise<Order> => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data.data;
  },
  create: async (data: any): Promise<Order> => {
    const res = await apiClient.post('/orders', data);
    return res.data.data;
  },
  buyerCreate: async (data: any): Promise<Order> => {
    const res = await apiClient.post('/buyers/orders', data);
    return res.data.data;
  },
  accept: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/accept`);
    return res.data.data;
  },
  reject: async (id: string): Promise<Order> => {
    const res = await apiClient.post(`/orders/${id}/reject`);
    return res.data.data;
  },
  timeline: async (id: string) => {
    const res = await apiClient.get(`/orders/${id}/timeline`);
    return res.data.data;
  }
};
