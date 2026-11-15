import type { MemberSkill, QualityDecision, TaskStatus } from "./enums";

export interface Task {
  id: string;
  order_id: string;
  order_item_id?: string;
  production_plan_id?: string;
  plan_stage_id?: string;
  task_name: string;
  task_type: "PIECE_BASED" | "STAGE_BASED";
  required_skill?: MemberSkill;
  allocated_quantity: number;
  completed_quantity: number;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  due_date?: string;
  status: TaskStatus;
  assignments?: TaskAssignment[];
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  shg_member_id: string;
  allocated_quantity: number;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  member_response?: "ACCEPTED" | "REJECTED" | "PENDING";
  response_reason?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressUpdate {
  id: string;
  task_id: string;
  shg_member_id: string;
  quantity_completed: number;
  note?: string;
  voice_note_url?: string;
  created_at: string;
}

export interface QualityReview {
  id: string;
  task_id: string;
  reviewed_by: string;
  decision: QualityDecision;
  reviewed_quantity: number;
  reason?: string;
  ai_draft_note?: string;
  ai_model?: string;
  created_at: string;
}
