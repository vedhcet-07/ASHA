import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calculator, AlertTriangle, ArrowRight, Save } from 'lucide-react';
import { costingApi, type CostComponent } from '@/lib/api/costing';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardBody, CardSectionHeader } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const CostingSheetPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: sheet, isLoading, refetch } = useQuery({
    queryKey: ['cost-sheet', orderId],
    queryFn: () => costingApi.getCostSheet(orderId!),
  });

  const [marginVal, setMarginVal] = useState<number>(20);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (sheet?.margin_value) {
      setMarginVal(sheet.margin_value);
    }
  }, [sheet]);

  const handleRecalculate = async () => {
    if (!orderId || !sheet) return;
    setIsSaving(true);
    try {
      await costingApi.saveCostSheet(orderId, {
        quantity: sheet.quantity,
        components: sheet.components,
        margin_type: sheet.margin_type || 'PERCENTAGE',
        margin_value: marginVal,
      });
      toast({ title: 'Cost sheet calculated & saved!', status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Save failed', status: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !sheet) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        eyebrow={`Order #${orderId}`}
        title="Costing & Pricing Sheet"
        subtitle="Transparent material, labour, overhead & SHG margin breakdown"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              tone="ink"
              leftIcon={<Save size={16} />}
              isLoading={isSaving}
              onClick={handleRecalculate}
            >
              Recalculate & Save
            </Button>
            <Button
              tone="ink"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => navigate(`/orders/${orderId}/payout`)}
            >
              Go to Payouts
            </Button>
          </div>
        }
      />

      {sheet.pricing_warning && (
        <div className="mt-7">
          <Callout tone="danger" icon={<AlertTriangle size={18} />} title={sheet.pricing_warning} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Unit Production Cost" value={formatCurrency(sheet.unit_cost)} hint="Direct costs per piece" icon={<Calculator size={20} />} tone="neutral" />
        <StatTile label={`SHG Margin (${sheet.margin_value}%)`} value={formatCurrency(sheet.margin_amount / (sheet.quantity || 1))} hint="Group surplus per piece" tone="accent" />
        <StatTile label="Selling Price / Unit" value={formatCurrency(sheet.selling_price_per_unit)} hint="Fair buyer rate" icon={<ArrowRight size={20} />} tone="success" emphasis />
        <StatTile label="Total Order Value" value={formatCurrency(sheet.total_selling_price)} hint={`For ${sheet.quantity} units`} tone="info" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardSectionHeader>Cost Components Breakdown</CardSectionHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Category</Th>
              <Th>Component Item</Th>
              <Th>Basis</Th>
              <Th isNumeric>Rate</Th>
              <Th isNumeric>Quantity</Th>
              <Th isNumeric>Total Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sheet.components?.map((c: CostComponent, idx: number) => (
              <Tr key={idx}>
                <Td>
                  <Badge
                    tone={c.component_type === 'MATERIAL' ? 'info' : c.component_type === 'LABOUR' ? 'violet' : 'neutral'}
                  >
                    {c.component_type}
                  </Badge>
                </Td>
                <Td className="font-medium">{c.label}</Td>
                <Td className="text-xs text-muted">{c.calculation_basis}</Td>
                <Td isNumeric>{formatCurrency(c.rate)}</Td>
                <Td isNumeric>{c.quantity}</Td>
                <Td isNumeric className="font-semibold">{formatCurrency(c.amount)}</Td>
              </Tr>
            ))}
            <Tr className="bg-inset/60 font-bold">
              <Td colSpan={5}>Total Production Cost (Material + Labour + Overhead)</Td>
              <Td isNumeric>{formatCurrency(sheet.total_cost)}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>
    </div>
  );
};
