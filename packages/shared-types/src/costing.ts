export type CostComponentType =
  | "MATERIAL"
  | "LABOUR"
  | "PACKAGING"
  | "TRANSPORT"
  | "UTILITIES"
  | "OTHER_OVERHEAD"
  | "MARGIN";

export type CalculationBasis =
  | "PER_UNIT"
  | "PER_BATCH"
  | "PER_HOUR"
  | "PERCENTAGE"
  | "FIXED";

export interface CostSheet {
  id: string;
  order_id: string;
  order_item_id?: string;
  version: number;
  quantity: number;
  material_cost: number;
  labour_cost: number;
  overhead_cost: number;
  total_cost: number;
  unit_cost: number;
  margin_type: "PERCENTAGE" | "FIXED_PER_UNIT" | "MANUAL";
  margin_value: number;
  margin_amount: number;
  selling_price_per_unit?: number;
  total_selling_price?: number;
  pricing_warning?: string;
  components?: CostComponent[];
  created_at: string;
  updated_at: string;
}

export interface CostComponent {
  id: string;
  cost_sheet_id: string;
  component_type: CostComponentType;
  label: string;
  calculation_basis: CalculationBasis;
  rate: number;
  quantity: number;
  amount: number;
  created_at: string;
  updated_at: string;
}
