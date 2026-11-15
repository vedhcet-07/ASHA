import type { PayoutStatus } from "./enums";

export interface PayoutSheet {
  id: string;
  order_id: string;
  version: number;
  status: PayoutStatus;
  total_payable_amount: number;
  total_accepted_quantity: number;
  submitted_by?: string;
  submitted_at?: string;
  lines?: PayoutLine[];
  created_at: string;
  updated_at: string;
}

export interface PayoutLine {
  id: string;
  payout_sheet_id: string;
  shg_member_id: string;
  task_id?: string;
  allocated_quantity: number;
  completed_quantity: number;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  payment_basis: "PER_PIECE" | "PER_HOUR" | "FIXED";
  rate: number;
  hours: number;
  payable_amount: number;
  explanation?: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutApproval {
  id: string;
  payout_sheet_id: string;
  approver_id: string;
  action: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  note?: string;
  created_at: string;
}
