import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, Users, Plus, ArrowRight } from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { membersApi } from '@/lib/api/members';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui';
import { StatusBadge } from '@/components/ui/Badge';
import { StatTile } from '@/components/ui/StatTile';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const LeaderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: membersApi.list });

  const activeOrder = orders[0];
  const pendingReviews = 3;
  const delayWarnings = 0;
  const groupMargin = 20.5;

  return (
    <div>
      <PageHeader
        eyebrow="Leader Dashboard"
        title="Leader Dashboard"
        subtitle="Shakti Women's Self-Help Group (Bengaluru Urban)"
        action={
          <Button tone="ink" leftIcon={<Plus size={16} />} onClick={() => navigate('/orders/new')}>
            New Order
          </Button>
        }
      />

      <MotionContainer className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MotionItem>
          <StatTile label="Active Members" value={members.length} icon={<Users size={20} />} tone="accent" />
        </MotionItem>
        <MotionItem>
          <StatTile label="Pending Proof Reviews" value={pendingReviews} icon={<CheckCircle2 size={20} />} tone="warning" />
        </MotionItem>
        <MotionItem>
          <StatTile label="Delay Warnings" value={delayWarnings} icon={<AlertCircle size={20} />} tone="success" />
        </MotionItem>
        <MotionItem>
          <StatTile label="Group Margin" value={`${groupMargin}%`} icon={<Clock size={20} />} tone="info" />
        </MotionItem>
      </MotionContainer>

      {activeOrder && (
        <Card className="mt-6" tone="default">
          <CardBody>
            <SectionHeader
              title="Active Production Order"
              icon={<Users size={16} />}
              action={
                <Button
                  variant="outline"
                  tone="ink"
                  size="sm"
                  rightIcon={<ArrowRight size={15} />}
                  onClick={() => navigate(`/orders/${activeOrder.id}`)}
                >
                  View Order Details
                </Button>
              }
            />
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-ink">{activeOrder.title}</h3>
                <StatusBadge status={activeOrder.status} />
              </div>
              <p className="text-sm text-muted">
                Order #{activeOrder.order_number} • Due by {activeOrder.required_by_date}
              </p>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted">Production Progress</span>
                <span className="font-semibold text-ink">68%</span>
              </div>
              <ProgressBar value={68} tone="accent" />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
