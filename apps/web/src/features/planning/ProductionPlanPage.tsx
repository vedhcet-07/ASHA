import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { planningApi, type PlanStage } from '@/lib/api/planning';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { useToast } from '@/components/ui/Toast';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const ProductionPlanPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: plan, isLoading, refetch } = useQuery({
    queryKey: ['plan', orderId],
    queryFn: () => planningApi.getPlan(orderId!),
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = async () => {
    if (!orderId) return;
    setIsGenerating(true);
    try {
      await planningApi.generateDraft(orderId);
      await planningApi.confirmPlan(orderId);
      toast({ title: 'AI Production Plan Generated!', status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Generation failed', status: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        eyebrow={`Order #${orderId}`}
        title="Production Plan & Stages"
        subtitle="AI-drafted milestone schedule with quality checkpoints"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              tone="violet"
              leftIcon={<Sparkles size={16} />}
              isLoading={isGenerating}
              onClick={handleGenerateAI}
            >
              Regenerate Plan (AI)
            </Button>
            <Button
              tone="ink"
              rightIcon={<ArrowRight size={16} />}
              onClick={() => navigate(`/orders/${orderId}/allocation`)}
            >
              Proceed to Allocation
            </Button>
          </div>
        }
      />

      <div className="mt-7">
        <Callout tone="accent" icon={<Sparkles size={18} />} title="ASHA Production Planner (AI-Assisted)">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">STATUS: {plan?.status || 'CONFIRMED'}</Badge>
            <p className="text-sm text-muted">
              {plan?.summary ||
                'Standardized 5-stage production plan. Stages are sequenced with strict quality gates before final dispatch.'}
            </p>
          </div>
        </Callout>
      </div>

      <h2 className="mb-3 mt-7 text-base font-bold text-ink">Workflow Stages</h2>
      <MotionContainer className="flex flex-col gap-4">
        {plan?.stages?.map((stage: PlanStage, idx: number) => (
          <MotionItem key={idx}>
            <Card>
              <CardBody>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-surface shadow-tactile-sm">
                      {stage.stage_order}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-ink">{stage.stage_name}</h3>
                        <Badge tone="accent">{stage.requires_skill}</Badge>
                        {stage.is_quality_checkpoint && (
                          <Badge tone="warning" variant="soft">
                            <ShieldCheck size={12} /> Quality Gate
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">{stage.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" tone="ink">
                    Est: {stage.planned_days} Days
                  </Badge>
                </div>
              </CardBody>
            </Card>
          </MotionItem>
        ))}
      </MotionContainer>
    </div>
  );
};
