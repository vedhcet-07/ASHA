import { apiClient } from './client';
import { UserProfile } from '@/types/auth';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  signup: async (data: any) => {
    const res = await apiClient.post('/auth/signup', data);
    return res.data;
  },
  getMe: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },
  selectRole: async (role: string) => {
    const res = await apiClient.post('/auth/select-role', { role });
    return res.data;
  },
  logout: async () => {
    return apiClient.post('/auth/logout');
  }
};
