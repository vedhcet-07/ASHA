import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, RotateCcw, X, Sparkles, ShieldCheck, ImageOff } from 'lucide-react';
import { qualityApi } from '@/lib/api/quality';
import { TaskItem } from '@/lib/api/tasks';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingSpinner, SkeletonGrid } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Form';
import { Callout } from '@/components/ui/Callout';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalClose } from '@/components/ui/Modal';
import { useDisclosure } from '@/components/ui/useDisclosure';
import { useToast } from '@/components/ui/Toast';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const QualityReviewPage: React.FC = () => {
  const toast = useToast();
  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['quality-queue'],
    queryFn: qualityApi.getReviewQueue,
  });

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [decisionType, setDecisionType] = useState<'REWORK' | 'REJECTED'>('REWORK');
  const [reason, setReason] = useState('Seam tension uneven on outer corner');
  const [aiNote, setAiNote] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const reworkModal = useDisclosure();

  const handleAccept = async (t: TaskItem) => {
    try {
      await qualityApi.review(t.id, 'ACCEPTED', t.completed_quantity, 'Work meets high standards');
      toast({ title: `Accepted ${t.completed_quantity} units! Added to payout ledger.`, status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Decision failed', status: 'error' });
    }
  };

  const handleOpenRework = async (t: TaskItem, type: 'REWORK' | 'REJECTED') => {
    setSelectedTask(t);
    setDecisionType(type);
    reworkModal.onOpen();
    setIsAiLoading(true);
    try {
      const draft = await qualityApi.getAiSuggestion(t.id, reason);
      setAiNote(draft);
    } catch {
      setAiNote('');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!selectedTask) return;
    try {
      await qualityApi.review(selectedTask.id, decisionType, selectedTask.completed_quantity, reason);
      toast({
        title: decisionType === 'REWORK' ? 'Rework task generated & assigned.' : 'Work marked rejected.',
        status: 'info',
      });
      reworkModal.onClose();
      refetch();
    } catch {
      toast({ title: 'Action failed', status: 'error' });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Quality"
        title="Quality Review Queue"
        subtitle="Inspect photo evidence, accept completed batches, or assign corrective rework"
      />

      {isLoading ? (
        <SkeletonGrid cols="sm:grid-cols-2" count={4} />
      ) : queue.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title="Queue is clear"
          description="No batches currently pending quality review. Submitted proof work will appear here for inspection."
        />
      ) : (
        <MotionContainer className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2" amount={0.1}>
          {queue.map((t) => (
            <MotionItem key={t.id}>
              <Card>
                <CardBody className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-ink">{t.task_name}</h3>
                      <p className="text-xs text-muted">
                        Member: <span className="font-semibold text-ink">{t.assigned_member_name}</span>
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted">Submitted Proof Media:</p>
                    {t.proofs && t.proofs.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border border-stone-200/70">
                        <img
                          src={t.proofs[0].storage_path}
                          alt="Submitted proof"
                          className="h-44 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-inset px-6 py-8 text-center">
                        <ImageOff size={22} className="text-muted-2" />
                        <span className="text-xs text-muted-2">No photo uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">
                      Submitted Units: <span className="font-semibold text-ink">{t.completed_quantity} pcs</span>
                    </span>
                    <span className="font-bold text-accent">Rate: ₹{t.rate_per_unit}/pc</span>
                  </div>

                  <div className="flex items-center gap-2 border-t border-stone-200/70 pt-3">
                    <Button tone="success" size="sm" leftIcon={<Check size={14} />} onClick={() => handleAccept(t)} fullWidth>
                      Accept
                    </Button>
                    <Button variant="outline" tone="warning" size="sm" leftIcon={<RotateCcw size={14} />} onClick={() => handleOpenRework(t, 'REWORK')} fullWidth>
                      Rework
                    </Button>
                    <Button variant="ghost" tone="danger" size="sm" onClick={() => handleOpenRework(t, 'REJECTED')}>
                      <X size={15} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </MotionItem>
          ))}
        </MotionContainer>
      )}

      {/* Rework / Reject Modal with AI Draft Note */}
      <Modal isOpen={reworkModal.isOpen} onClose={reworkModal.onClose} size="lg">
        <ModalHeader>
          <div className="flex w-full items-center justify-between">
            {decisionType === 'REWORK' ? 'Request Corrective Rework' : 'Reject Work Batch'}
            <ModalClose onClose={reworkModal.onClose} />
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Specify defect reason. A corrective rework task will be automatically tracked and prioritized.
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">Reason / Feedback</span>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>

            <Callout tone="violet" icon={<Sparkles size={16} />} title="AI-Drafted Member Feedback Note">
              {isAiLoading ? (
                <p className="text-xs text-violet">Generating plain-language explanation…</p>
              ) : (
                <Textarea value={aiNote} onChange={(e) => setAiNote(e.target.value)} rows={3} className="bg-surface" />
              )}
            </Callout>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={reworkModal.onClose}>
            Cancel
          </Button>
          <Button tone={decisionType === 'REWORK' ? 'warning' : 'danger'} onClick={handleSubmitDecision}>
            Confirm {decisionType === 'REWORK' ? 'Rework' : 'Rejection'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
