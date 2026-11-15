import { z } from "zod";
import type { AvailabilityStatus, MemberSkill, UserRole } from "./enums";

export interface Profile {
  id: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface SHG {
  id: string;
  name: string;
  registration_number?: string;
  district?: string;
  state?: string;
  default_currency: string;
  minimum_margin_percent: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SHGMember {
  id: string;
  shg_id: string;
  profile_id?: string;
  member_name: string;
  phone_number?: string;
  daily_capacity: number;
  weekly_capacity: number;
  availability_status: AvailabilityStatus;
  past_acceptance_rate: number;
  past_rework_rate: number;
  past_on_time_rate: number;
  is_active: boolean;
  skills?: MemberSkillRecord[];
  created_at: string;
  updated_at: string;
}

export interface MemberSkillRecord {
  id: string;
  shg_member_id: string;
  skill: MemberSkill;
  proficiency: number; // 1-5
  created_at: string;
}

export interface MemberAvailability {
  id: string;
  shg_member_id: string;
  available_from?: string;
  available_to?: string;
  status: AvailabilityStatus;
  reason?: string;
  created_at: string;
  updated_at: string;
}

// Zod schemas for form validation
export const AddMemberSchema = z.object({
  member_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().optional(),
  daily_capacity: z.number().int().min(0).max(1000),
  weekly_capacity: z.number().int().min(0).max(5000),
  availability_status: z.enum([
    "available",
    "partially_available",
    "unavailable",
  ]),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export const CreateSHGSchema = z.object({
  name: z.string().min(2, "SHG name must be at least 2 characters"),
  registration_number: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  minimum_margin_percent: z.number().min(0).max(100).default(0),
});

export type CreateSHGInput = z.infer<typeof CreateSHGSchema>;
