import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, User, Wallet, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { MotionContainer, MotionItem } from '@/components/ui/motion';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import type { UserRole } from '@/types/auth';

const roles: {
  role: UserRole;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tone: string;
}[] = [
  { role: 'leader', title: 'SHG Leader', desc: 'Create orders, plan work, confirm allocation, manage costs', icon: <Crown size={22} />, tone: 'text-accent bg-accent/12' },
  { role: 'member', title: 'SHG Member', desc: 'View tasks, track daily progress, upload photo proof, check payouts', icon: <User size={22} />, tone: 'text-info bg-info/12' },
  { role: 'approver', title: 'Group Approver / Treasurer', desc: 'Review member-wise payout sheets and authorize group payments', icon: <Wallet size={22} />, tone: 'text-success bg-success/12' },
  { role: 'checker', title: 'Quality Checker', desc: 'Review submitted production proof and manage rework', icon: <ShieldCheck size={22} />, tone: 'text-warning bg-warning/14' },
  { role: 'buyer', title: 'Buyer', desc: 'Create order requests and track live production milestones', icon: <ShoppingBag size={22} />, tone: 'text-violet bg-violet/12' },
];

export const RoleSelectionPage: React.FC = () => {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const handleSelect = async (r: UserRole) => {
    await setRole(r);
    if (r === 'member') navigate('/my-tasks');
    else if (r === 'buyer') navigate('/buyer/orders');
    else navigate('/dashboard');
  };

  return (
    <div className="mx-auto max-w-4xl py-4">
      <PageHeader
        eyebrow="Demo"
        title="Select Your Demo Persona"
        subtitle="Experience ASHA from different stakeholder perspectives"
      />

      <MotionContainer className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" amount={0.1}>
        {roles.map((r) => (
          <MotionItem key={r.role}>
            <Card interactive hover="lift" className="h-full" >
              <button
                onClick={() => handleSelect(r.role)}
                className="flex h-full w-full flex-col gap-3 text-left"
              >
                <CardBody className="w-full">
                  <div className="flex items-center justify-between">
                    <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', r.tone)}>
                      {r.icon}
                    </span>
                    <motion.span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-inset text-muted"
                      whileHover={reduce ? undefined : { x: 2 }}
                    >
                      <ArrowRight size={16} />
                    </motion.span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted">{r.desc}</p>
                </CardBody>
              </button>
            </Card>
          </MotionItem>
        ))}
      </MotionContainer>
    </div>
  );
};
