import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/auth';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match strategy for active state. */
  match?: 'exact' | 'prefix';
}

const LEADER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
  { to: '/orders', label: 'Orders', icon: ShoppingBag, match: 'prefix' },
  { to: '/members', label: 'Members', icon: Users, match: 'prefix' },
  { to: '/quality', label: 'Quality', icon: ShieldCheck, match: 'prefix' },
];

const MEMBER_NAV: NavItem[] = [
  { to: '/my-tasks', label: 'My Tasks', icon: CheckCircle2, match: 'prefix' },
  { to: '/my-earnings', label: 'Earnings', icon: Wallet, match: 'exact' },
];

const BUYER_NAV: NavItem[] = [
  { to: '/buyer/orders', label: 'My Orders', icon: ShoppingBag, match: 'prefix' },
  { to: '/buyer/orders/new', label: 'New Order', icon: Plus, match: 'exact' },
];

export function navForRole(role: UserRole): NavItem[] {
  if (role === 'buyer') return BUYER_NAV;
  if (role === 'member') return MEMBER_NAV;
  return LEADER_NAV;
}

/** Contextual page titles for the top bar, derived from the path. */
export function titleForPath(pathname: string): { title: string; subtitle?: string } {
  const map: Record<string, { title: string; subtitle?: string }> = {
    '/dashboard': { title: 'Dashboard', subtitle: "Shakti Women's Self-Help Group · Bengaluru Urban" },
    '/orders': { title: 'Production Orders', subtitle: 'Manage bulk orders, planning & member allocations' },
    '/orders/new': { title: 'Create Order', subtitle: 'Add order requirements and product line items' },
    '/members': { title: 'SHG Members', subtitle: 'Capacities, skills & daily availability' },
    '/quality': { title: 'Quality Review Queue', subtitle: 'Inspect photo evidence, accept or assign rework' },
    '/buyer/orders': { title: 'My Order Requests', subtitle: 'Track manufacturing progress & delivery' },
    '/buyer/orders/new': { title: 'Place New Order', subtitle: 'Submit a new production request' },
    '/my-tasks': { title: 'My Active Work', subtitle: 'Voice-first task tracking with proof' },
    '/my-earnings': { title: 'My Earnings', subtitle: 'Individual accepted work & payouts' },
    '/select-role': { title: 'Select Persona', subtitle: 'Experience ASHA from different perspectives' },
  };
  if (map[pathname]) return map[pathname];
  if (pathname.startsWith('/orders/') && pathname.endsWith('/plan'))
    return { title: 'Production Plan & Stages', subtitle: 'AI-drafted milestone schedule' };
  if (pathname.startsWith('/orders/') && pathname.endsWith('/allocation'))
    return { title: 'Fair Work Allocation', subtitle: 'Deterministic scoring & override' };
  if (pathname.startsWith('/orders/') && pathname.endsWith('/costing'))
    return { title: 'Costing & Pricing Sheet', subtitle: 'Transparent material, labour & margin' };
  if (pathname.startsWith('/orders/') && pathname.endsWith('/payout'))
    return { title: 'Group Payout Sheet', subtitle: 'Quality-accepted units · group approval' };
  if (pathname.startsWith('/orders/') && pathname.endsWith('/delivery'))
    return { title: 'Delivery Record & Proof', subtitle: 'Logistics, tracking & inspection' };
  if (pathname.startsWith('/orders/'))
    return { title: 'Order Details', subtitle: 'Workflow, line items & actions' };
  return { title: 'ASHA' };
}
