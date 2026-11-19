import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, CheckCircle2, ArrowRight } from 'lucide-react';
import { allocationApi, type AllocationItem } from '@/lib/api/allocation';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatTile } from '@/components/ui/StatTile';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Input } from '@/components/ui/Form';
import { Callout } from '@/components/ui/Callout';
import { useToast } from '@/components/ui/Toast';

export const AllocationReviewPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['allocation-proposal', orderId],
    queryFn: () => allocationApi.getProposal(orderId!),
  });

  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  React.useEffect(() => {
    if (proposal?.allocations) {
      setAllocations(proposal.allocations);
    }
  }, [proposal]);

  const handleQtyChange = (memberId: string, newQty: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.member_id === memberId ? { ...a, allocated_quantity: newQty } : a)),
    );
  };

  const handleReasonChange = (memberId: string, reason: string) => {
    setOverrideReasons((prev) => ({ ...prev, [memberId]: reason }));
  };

  const handleConfirm = async () => {
    if (!orderId) return;
    setIsConfirming(true);
    try {
      const payload = allocations.map((a) => ({
        ...a,
        override_reason: overrideReasons[a.member_id] || undefined,
      }));
      await allocationApi.confirm(orderId, payload);
      toast({ title: 'Work allocation confirmed! Tasks assigned.', status: 'success' });
      navigate(`/orders/${orderId}`);
    } catch {
      toast({ title: 'Confirmation failed', status: 'error' });
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const totalAllocated = allocations.reduce((acc, a) => acc + (a.allocated_quantity || 0), 0);
  const targetQuantity = proposal?.total_quantity || 100;
  const balancePct = Math.round((totalAllocated / targetQuantity) * 100);

  return (
    <div>
      <PageHeader
        eyebrow={`Order #${orderId}`}
        title="Fair Work Allocation"
        subtitle="Deterministic scoring: Skill (30%) + Capacity (25%) + Availability (20%) + Workload (15%) + Quality (10%)"
        action={
          <Button
            tone="ink"
            leftIcon={<CheckCircle2 size={16} />}
            isLoading={isConfirming}
            onClick={handleConfirm}
          >
            Confirm & Create Tasks
          </Button>
        }
      />

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <Scale size={20} />
              </span>
              <h3 className="text-sm font-bold text-ink">Allocation Balance</h3>
            </div>
            <div className="mt-4 mb-1.5 flex items-center justify-between text-sm">
              <span className="text-muted">
                Allocated Units: <b className="text-ink">{totalAllocated}</b> / {targetQuantity}
              </span>
              <span className="font-bold text-ink">{balancePct}%</span>
            </div>
            <ProgressBar value={balancePct} tone={totalAllocated === targetQuantity ? 'success' : 'warning'} />
          </CardBody>
        </Card>

        <Card tone="inset">
          <CardBody>
            <h3 className="text-sm font-bold text-ink">AI Explanation</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Work was distributed evenly across top-scoring members based on verified daily stitching
              capacity and 90%+ historical quality ratings.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <Table>
          <Thead>
            <Tr>
              <Th>Member</Th>
              <Th isNumeric>Fairness Score</Th>
              <Th>Scoring Justification</Th>
              <Th isNumeric>Allocated Qty</Th>
              <Th>Override Reason (if edited)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {allocations.map((a) => (
              <Tr key={a.member_id}>
                <Td className="font-medium">{a.member_name}</Td>
                <Td isNumeric>
                  <Badge tone="success">{Math.round(a.score * 100)}%</Badge>
                </Td>
                <Td className="text-xs text-muted">{a.reasons?.join(' • ')}</Td>
                <Td isNumeric>
                  <Input
                    type="number"
                    value={a.allocated_quantity}
                    onChange={(e) => handleQtyChange(a.member_id, parseInt(e.target.value) || 0)}
                    className="w-20 text-right"
                  />
                </Td>
                <Td>
                  <Input
                    placeholder="Reason if adjusted"
                    value={overrideReasons[a.member_id] || ''}
                    onChange={(e) => handleReasonChange(a.member_id, e.target.value)}
                    className="w-full"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
};
