import React from 'react';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VoicePlayer } from '@/components/voice/VoicePlayer';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export const MemberEarningsPage: React.FC = () => {
  const earningsSpeech =
    'Your total accepted work for Festival Tote Bags is 20 units at 20 rupees per unit. Your expected payout is 400 rupees pending group approval.';

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        eyebrow="Member"
        title="My Earnings"
        subtitle="Individual accepted work & payouts"
        action={<VoicePlayer text={earningsSpeech} label="Hear Details" />}
      />

      <Card className="mt-7" tone="default">
        <CardBody>
          <div className="flex items-center gap-2 text-muted">
            <Wallet size={16} />
            <span className="text-sm">Current Order Expected Payout</span>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight text-accent">{formatCurrency(400)}</p>
          <div className="mt-4 flex items-center justify-between border-t border-stone-200/70 pt-3 text-sm">
            <span className="text-muted">
              Accepted Units: <span className="font-semibold text-ink">20 pcs</span>
            </span>
            <Badge tone="success" variant="soft">Rate: ₹20/pc</Badge>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 flex items-start gap-2 text-center">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-muted-2" />
        <p className="text-xs text-muted-2">
          All earnings are calculated strictly from quality-approved work. Payout requires explicit group
          approval.
        </p>
      </div>
    </div>
  );
};
