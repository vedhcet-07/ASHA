import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner, SkeletonGrid } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const BuyerOrdersPage: React.FC = () => {
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow="Buyer"
        title="My Order Requests"
        subtitle="Track manufacturing progress and delivery timelines"
        action={
          <Button tone="ink" leftIcon={<Plus size={16} />} onClick={() => navigate('/buyer/orders/new')}>
            Place New Order
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonGrid cols="sm:grid-cols-2" count={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={26} />}
          title="No order requests yet"
          description="Place your first production order request to track live manufacturing milestones."
          action={
            <Button tone="ink" leftIcon={<Plus size={16} />} onClick={() => navigate('/buyer/orders/new')}>
              Place New Order
            </Button>
          }
        />
      ) : (
        <MotionContainer className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
          {orders.map((order) => (
            <MotionItem key={order.id}>
              <Card interactive hover="lift" className="h-full" onClick={() => navigate(`/orders/${order.id}`)}>
                <CardBody className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-ink">{order.title}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted">
                    Order #{order.order_number} • Target Delivery: {order.required_by_date}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-2">
                    {order.description || 'No description provided'}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted">
                    Track progress <ArrowRight size={13} />
                  </div>
                </CardBody>
              </Card>
            </MotionItem>
          ))}
        </MotionContainer>
      )}
    </div>
  );
};
