import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Camera, AlertCircle, ArrowUpCircle, ImageIcon } from 'lucide-react';
import { tasksApi, type TaskItem } from '@/lib/api/tasks';
import { PageHeader } from '@/components/ui/PageHeader';
import { VoicePlayer } from '@/components/voice/VoicePlayer';
import { StatusBadge } from '@/components/ui/Badge';
import { LoadingSpinner, SkeletonGrid } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { Callout } from '@/components/ui/Callout';
import { Input, FormControl, FormLabel } from '@/components/ui/Form';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalClose } from '@/components/ui/Modal';
import { useDisclosure } from '@/components/ui/useDisclosure';
import { useToast } from '@/components/ui/Toast';
import { MotionContainer, MotionItem } from '@/components/ui/motion';

export const MemberTaskPage: React.FC = () => {
  const toast = useToast();
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: tasksApi.getMyTasks,
  });

  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [completedQty, setCompletedQty] = useState('');
  const [progressNote, setProgressNote] = useState('');

  const progressModal = useDisclosure();
  const proofModal = useDisclosure();
  const [proofUrl, setProofUrl] = useState(
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400',
  );

  const handleAccept = async (t: TaskItem) => {
    try {
      await tasksApi.accept(t.id);
      toast({ title: 'Task accepted!', status: 'success' });
      refetch();
    } catch {
      toast({ title: 'Action failed', status: 'error' });
    }
  };

  const handleUpdateProgressSubmit = async () => {
    if (!activeTask) return;
    try {
      await tasksApi.updateProgress(activeTask.id, parseInt(completedQty) || 0, progressNote);
      toast({ title: 'Progress recorded successfully', status: 'success' });
      progressModal.onClose();
      refetch();
    } catch {
      toast({ title: 'Update failed', status: 'error' });
    }
  };

  const handleUploadProofSubmit = async () => {
    if (!activeTask) return;
    try {
      await tasksApi.completeProof(activeTask.id, proofUrl);
      toast({ title: 'Photo proof submitted for quality review!', status: 'success' });
      proofModal.onClose();
      refetch();
    } catch {
      toast({ title: 'Upload failed', status: 'error' });
    }
  };

  if (isLoading) return <SkeletonGrid cols="sm:grid-cols-2" count={2} />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Member" title="My Active Work" subtitle="Voice-first task tracking with proof" />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={26} />}
          title="No active tasks"
          description="When work is allocated to you, your tasks will appear here with progress tracking and photo proof."
        />
      ) : (
        <MotionContainer className="mt-7 flex flex-col gap-6" amount={0.1}>
          {tasks.map((t) => {
            const pct = t.allocated_quantity > 0 ? Math.round((t.completed_quantity / t.allocated_quantity) * 100) : 0;
            const speech = `Hello ${t.assigned_member_name}. Your task is ${t.task_name}. You have completed ${t.completed_quantity} out of ${t.allocated_quantity} units. Due by ${t.due_date}.`;

            return (
              <MotionItem key={t.id}>
                <Card className={t.status === 'QUALITY_REVIEW' ? 'border-warning/40' : ''}>
                  <CardBody className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-accent">{t.task_name}</h3>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="text-xs text-muted">Task #{t.id} • Due: {t.due_date}</p>
                      </div>
                      <VoicePlayer text={speech} label="Play" />
                    </div>

                    {t.is_rework && (
                      <Callout tone="danger" icon={<AlertCircle size={18} />} title="REWORK REQUIRED">
                        {t.rework_reason || 'Please correct seam tension and re-inspect.'}
                      </Callout>
                    )}

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-muted">
                          Progress: <span className="font-semibold text-ink">{t.completed_quantity}</span> / {t.allocated_quantity} pcs
                        </span>
                        <span className="font-bold text-ink">{pct}%</span>
                      </div>
                      <ProgressBar value={pct} tone="accent" size="md" />
                    </div>

                    {t.proofs && t.proofs.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold text-muted">Submitted Photo Proof:</p>
                        <div className="overflow-hidden rounded-2xl border border-stone-200/70">
                          <img src={t.proofs[0].storage_path} alt="Proof" className="h-28 w-full object-cover" />
                        </div>
                      </div>
                    )}

                    {t.status === 'ASSIGNED' ? (
                      <div className="flex gap-3">
                        <Button tone="ink" fullWidth onClick={() => handleAccept(t)}>
                          Accept Task
                        </Button>
                        <Button variant="outline" tone="danger" fullWidth>
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <Button
                          tone="ink"
                          fullWidth
                          leftIcon={<ArrowUpCircle size={16} />}
                          onClick={() => {
                            setActiveTask(t);
                            setCompletedQty(t.completed_quantity.toString());
                            progressModal.onOpen();
                          }}
                        >
                          Update Progress
                        </Button>
                        <Button
                          variant="outline"
                          tone="accent"
                          fullWidth
                          leftIcon={<Camera size={16} />}
                          onClick={() => {
                            setActiveTask(t);
                            proofModal.onOpen();
                          }}
                        >
                          Add Photo
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </MotionItem>
            );
          })}
        </MotionContainer>
      )}

      {/* Progress Modal */}
      <Modal isOpen={progressModal.isOpen} onClose={progressModal.onClose} size="md">
        <ModalHeader>
          <div className="flex w-full items-center justify-between">
            Update Completed Quantity
            <ModalClose onClose={progressModal.onClose} />
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <FormControl isRequired>
              <FormLabel isRequired>Total Completed Pieces</FormLabel>
              <Input type="number" value={completedQty} onChange={(e) => setCompletedQty(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Optional Note</FormLabel>
              <Input
                placeholder="e.g. Completed initial 15 bags before lunch"
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
              />
            </FormControl>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={progressModal.onClose}>
            Cancel
          </Button>
          <Button tone="ink" onClick={handleUpdateProgressSubmit}>
            Save Progress
          </Button>
        </ModalFooter>
      </Modal>

      {/* Photo Proof Modal */}
      <Modal isOpen={proofModal.isOpen} onClose={proofModal.onClose} size="md">
        <ModalHeader>
          <div className="flex w-full items-center justify-between">
            Upload Work Verification Proof
            <ModalClose onClose={proofModal.onClose} />
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Take or upload a clear photo showing the seams, stitching quality, and finished piece count.
            </p>
            <div className="overflow-hidden rounded-2xl border border-stone-200/70">
              <img src={proofUrl} alt="Preview" className="max-h-52 w-full object-cover" />
            </div>
            <Button
              size="sm"
              variant="outline"
              tone="ink"
              leftIcon={<ImageIcon size={14} />}
              onClick={() =>
                setProofUrl(
                  'https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&q=80&w=400',
                )
              }
            >
              Switch Demo Sample Photo
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={proofModal.onClose}>
            Cancel
          </Button>
          <Button tone="ink" onClick={handleUploadProofSubmit}>
            Submit Proof
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};
