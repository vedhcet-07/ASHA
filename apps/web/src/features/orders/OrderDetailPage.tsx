import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Scale, ShieldCheck, Calculator, DollarSign, Truck, Info } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Callout } from '@/components/ui/Callout';
import { VoicePlayer } from '@/components/voice/VoicePlayer';
import { Card, CardBody, CardSectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

  // Preserved from original (group-accept entry point, currently unused in UI).
  const handleAccept = async () => {
    if (!id) return;
    try {
      await ordersApi.accept(id);
      toast({ title: 'Order accepted', status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Action failed', status: 'error' });
    }
  };

  if (isLoading || !order) return <LoadingSpinner />;

  const voiceSummary = `Order ${order.order_number} for ${order.title}. Due date is ${order.required_by_date}. Total items: ${order.items?.length || 0}. Current status is ${order.status}.`;

  return (
    <div>
      <PageHeader
        eyebrow={`Order #${order.order_number}`}
        title={order.title}
        subtitle={`Created ${order.created_at?.slice(0, 10)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <VoicePlayer text={voiceSummary} label="Listen" />
            <Button variant="outline" tone="violet" size="sm" leftIcon={<Sparkles size={14} />} onClick={() => navigate(`/orders/${order.id}/plan`)}>
              Plan
            </Button>
            <Button variant="outline" tone="accent" size="sm" leftIcon={<Scale size={14} />} onClick={() => navigate(`/orders/${order.id}/allocation`)}>
              Allocate
            </Button>
            <Button variant="outline" tone="warning" size="sm" leftIcon={<ShieldCheck size={14} />} onClick={() => navigate('/quality')}>
              Quality
            </Button>
            <Button variant="outline" tone="info" size="sm" leftIcon={<Calculator size={14} />} onClick={() => navigate(`/orders/${order.id}/costing`)}>
              Costing
            </Button>
            <Button tone="success" size="sm" leftIcon={<DollarSign size={14} />} onClick={() => navigate(`/orders/${order.id}/payout`)}>
              Payouts
            </Button>
            <Button variant="outline" tone="ink" size="sm" leftIcon={<Truck size={14} />} onClick={() => navigate(`/orders/${order.id}/delivery`)}>
              Delivery
            </Button>
          </div>
        }
      />

      <Card className="mt-7 mb-6">
        <CardBody>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <StatusBadge status={order.status} />
            <span className="text-muted">
              Due: <span className="font-semibold text-ink">{order.required_by_date}</span>
            </span>
            <span className="text-muted">
              Buyer: <span className="font-semibold text-ink">{order.buyer_name || 'Green Earth Crafts'}</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-2">{order.description}</p>
          {order.special_instructions && (
            <div className="mt-4">
              <Callout tone="warning" icon={<Info size={18} />} title="Special Instructions">
                {order.special_instructions}
              </Callout>
            </div>
          )}
        </CardBody>
      </Card>

      <h2 className="mb-3 text-base font-bold text-ink">Product Line Items</h2>
      <Card className="overflow-hidden">
        <CardSectionHeader>Line items</CardSectionHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Product</Th>
              <Th isNumeric>Quantity</Th>
              <Th isNumeric>Agreed Unit Price</Th>
              <Th isNumeric>Total Value</Th>
            </Tr>
          </Thead>
          <Tbody>
            {order.items?.map((it) => (
              <Tr key={it.id}>
                <Td className="font-medium">{it.product_name}</Td>
                <Td isNumeric>{it.quantity} {it.unit_type}s</Td>
                <Td isNumeric>{formatCurrency(it.agreed_unit_price || 0)}</Td>
                <Td isNumeric className="font-semibold">{formatCurrency((it.agreed_unit_price || 0) * it.quantity)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
};
