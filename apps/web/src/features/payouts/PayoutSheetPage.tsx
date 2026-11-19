import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, ShieldCheck, Info } from 'lucide-react';
import { payoutsApi, type PayoutLine } from '@/lib/api/payouts';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardBody, CardSectionHeader } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { VoicePlayer } from '@/components/voice/VoicePlayer';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const PayoutSheetPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: payout, isLoading, refetch } = useQuery({
    queryKey: ['payout-sheet', orderId],
    queryFn: () => payoutsApi.getPayoutSheet(orderId!),
  });

  const [isActing, setIsActing] = useState(false);

  const handleApprove = async () => {
    if (!orderId) return;
    setIsActing(true);
    try {
      await payoutsApi.approve(orderId, 'APPROVED', 'Unanimously approved in weekly SHG meeting.');
      toast({ title: 'Group Payout APPROVED! Status updated.', status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Approval failed', status: 'error' });
    } finally {
      setIsActing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!orderId) return;
    setIsActing(true);
    try {
      await payoutsApi.approve(orderId, 'CHANGES_REQUESTED', 'Clarification requested for rework units.');
      toast({ title: 'Changes requested. Returned to leader.', status: 'info' });
      refetch();
    } catch {
      toast({ title: 'Action failed', status: 'error' });
    } finally {
      setIsActing(false);
    }
  };

  if (isLoading || !payout) return <LoadingSpinner />;

  const speech = `Payout sheet for order ${payout.order_id}. Total payable amount is ${payout.total_payable_amount} rupees across ${payout.lines?.length || 0} members for ${payout.total_accepted_quantity} accepted units. Current approval status is ${payout.status}.`;

  return (
    <div>
      <PageHeader
        eyebrow={`Order #${orderId}`}
        title="Group Payout Sheet"
        subtitle="Calculated strictly on quality-accepted units • Requires explicit group approval"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <VoicePlayer text={speech} label="Listen Summary" />
            {payout.status !== 'APPROVED' ? (
              <>
                <Button tone="success" leftIcon={<CheckCircle2 size={16} />} isLoading={isActing} onClick={handleApprove}>
                  Approve Payout
                </Button>
                <Button variant="outline" tone="warning" leftIcon={<RotateCcw size={16} />} isLoading={isActing} onClick={handleRequestChanges}>
                  Request Changes
                </Button>
              </>
            ) : (
              <Badge tone="success" variant="solid" className="px-3 py-1.5 text-sm">
                <ShieldCheck size={16} /> GROUP APPROVED
              </Badge>
            )}
          </div>
        }
      />

      <div className="mt-7">
        <Callout tone="accent" icon={<Info size={18} />} title="SIMULATED PAYMENTS · Transparent Honest Accounts">
          Every member earns solely based on accepted production. Defective or rework units are withheld
          until corrected and inspected.
        </Callout>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatTile label="Total Payable (Group)" value={formatCurrency(payout.total_payable_amount)} hint="100% verified labour" tone="accent" />
        <StatTile label="Accepted Units Paid" value={`${payout.total_accepted_quantity} pcs`} hint="Excludes rework / scrap" tone="success" />
        <StatTile
          label="Approval State"
          value={<Badge tone={payout.status === 'APPROVED' ? 'success' : 'warning'} variant="soft" className="text-sm">{payout.status}</Badge>}
          hint={`Submitted by ${payout.submitted_by || 'Leader'}`}
          tone="neutral"
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardSectionHeader>Member-wise Payable Record</CardSectionHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Member Name</Th>
              <Th>Task</Th>
              <Th isNumeric>Allocated</Th>
              <Th isNumeric>Accepted</Th>
              <Th isNumeric>In Rework</Th>
              <Th isNumeric>Rate</Th>
              <Th isNumeric>Payable Share</Th>
            </Tr>
          </Thead>
          <Tbody>
            {payout.lines?.map((line: PayoutLine, idx: number) => (
              <Tr key={idx}>
                <Td className="font-semibold">{line.member_name}</Td>
                <Td className="text-xs text-muted">{line.task_name}</Td>
                <Td isNumeric>{line.allocated_quantity}</Td>
                <Td isNumeric className="font-bold text-success">{line.accepted_quantity}</Td>
                <Td isNumeric className="text-warning">{line.rework_quantity}</Td>
                <Td isNumeric>{formatCurrency(line.rate)}</Td>
                <Td isNumeric className="font-bold text-accent text-base">{formatCurrency(line.payable_amount)}</Td>
              </Tr>
            ))}
            <Tr className="bg-inset/60 font-bold">
              <Td colSpan={6}>Total Payable Amount</Td>
              <Td isNumeric className="text-lg text-accent">{formatCurrency(payout.total_payable_amount)}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>
    </div>
  );
};
