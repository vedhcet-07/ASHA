export type SkillType = 
  | 'CUTTING'
  | 'STITCHING'
  | 'TAILORING'
  | 'EMBROIDERY'
  | 'PACKING'
  | 'QUALITY_CHECK'
  | 'DELIVERY'
  | 'ACCOUNTING'
  | 'OTHER';

export interface MemberSkill {
  skill: SkillType;
  proficiency: number;
}

export interface SHGMember {
  id: string;
  member_name: string;
  phone_number?: string;
  daily_capacity: number;
  weekly_capacity: number;
  availability_status: 'available' | 'partially_available' | 'unavailable';
  past_acceptance_rate: number;
  skills: MemberSkill[];
}
