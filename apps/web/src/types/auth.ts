export type UserRole = 'leader' | 'member' | 'approver' | 'checker' | 'buyer' | 'federation_staff' | 'admin';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  preferred_language: string;
  shg_id?: string;
}

export interface AuthSession {
  access_token: string;
  user: UserProfile;
}
