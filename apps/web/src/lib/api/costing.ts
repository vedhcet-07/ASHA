import { apiClient } from './client';

export interface CostComponent {
  component_type: string;
  label: string;
  calculation_basis: string;
  rate: number;
  quantity: number;
  amount: number;
}

export interface CostSheet {
  id: string;
  order_id: string;
  quantity: number;
  components: CostComponent[];
  margin_type: string;
  margin_value: number;
  material_cost: number;
  labour_cost: number;
  overhead_cost: number;
  total_cost: number;
  unit_cost: number;
  margin_amount: number;
  selling_price_per_unit: number;
  total_selling_price: number;
  pricing_warning?: string;
}

export const costingApi = {
  getCostSheet: async (orderId: string): Promise<CostSheet> => {
    const res = await apiClient.get(`/orders/${orderId}/cost-sheet`);
    return res.data.data;
  },
  saveCostSheet: async (orderId: string, data: any): Promise<CostSheet> => {
    const res = await apiClient.post(`/orders/${orderId}/cost-sheet`, data);
    return res.data.data;
  }
};
