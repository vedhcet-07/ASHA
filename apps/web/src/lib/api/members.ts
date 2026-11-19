import { apiClient } from './client';
import { SHGMember } from '@/types/member';

export const membersApi = {
  list: async (): Promise<SHGMember[]> => {
    const res = await apiClient.get('/shgs/current/members');
    return res.data.data;
  },
  getById: async (id: string): Promise<SHGMember> => {
    const res = await apiClient.get(`/shgs/current/members/${id}`);
    return res.data.data;
  },
  create: async (data: Partial<SHGMember>): Promise<SHGMember> => {
    const res = await apiClient.post('/shgs/current/members', data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<SHGMember>): Promise<SHGMember> => {
    const res = await apiClient.patch(`/shgs/current/members/${id}`, data);
    return res.data.data;
  }
};
