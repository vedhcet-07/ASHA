// apps/web/src/demo/demoMock.ts
// Mock API for frontend-only demo mode (VITE_DEMO_MODE=true).
// All endpoints return data in the same shape as the real FastAPI backend.

export type Role = 'buyer' | 'leader' | 'member' | 'checker' | 'approver';

// ─── Seed data ────────────────────────────────────────────────────────────────

const DEMO_MEMBERS = [
  {
    id: 'm1',
    shg_id: 'shg-1',
    member_name: 'Priya Sharma',
    phone_number: '9876543210',
    daily_capacity: 20,
    weekly_capacity: 100,
    availability_status: 'available',
    is_active: true,
    skills: [
      { id: 's1', shg_member_id: 'm1', skill: 'stitching', proficiency: 5, created_at: '' },
      { id: 's2', shg_member_id: 'm1', skill: 'quality_check', proficiency: 4, created_at: '' },
    ],
  },
  {
    id: 'm2',
    shg_id: 'shg-1',
    member_name: 'Anita Patel',
    phone_number: '9876543211',
    daily_capacity: 15,
    weekly_capacity: 80,
    availability_status: 'available',
    is_active: true,
    skills: [
      { id: 's3', shg_member_id: 'm2', skill: 'stitching', proficiency: 4, created_at: '' },
    ],
  },
  {
    id: 'm3',
    shg_id: 'shg-1',
    member_name: 'Sunita Devi',
    phone_number: '9876543212',
    daily_capacity: 10,
    weekly_capacity: 50,
    availability_status: 'available',
    is_active: true,
    skills: [],
  },
  {
    id: 'm4',
    shg_id: 'shg-1',
    member_name: 'Kavita Rao',
    phone_number: '9876543213',
    daily_capacity: 18,
    weekly_capacity: 90,
    availability_status: 'unavailable',
    is_active: true,
    skills: [],
  },
  {
    id: 'm5',
    shg_id: 'shg-1',
    member_name: 'Meena Kumari',
    phone_number: '9876543214',
    daily_capacity: 12,
    weekly_capacity: 60,
    availability_status: 'available',
    is_active: true,
    skills: [],
  },
  {
    id: 'm6',
    shg_id: 'shg-1',
    member_name: 'Rekha Verma',
    phone_number: '9876543215',
    daily_capacity: 8,
    weekly_capacity: 40,
    availability_status: 'available',
    is_active: false,
    skills: [],
  },
];


const DEMO_ORDERS = [
  {
    id: 'ord-001', order_number: 'ORD-2025-001',
    title: 'Cotton Tote Bags – Batch A',
    buyer_name: 'GreenLeaf Retail', buyer_id: 'buyer-1',
    status: 'IN_PROGRESS',
    required_by_date: '2025-12-15',
    total_quantity: 500, unit_price: 85, currency: 'INR',
    items: [{ product: 'Cotton Tote Bag', qty: 500, unit_price: 85 }],
    created_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'ord-002', order_number: 'ORD-2025-002',
    title: 'Embroidered Cushion Covers',
    buyer_name: 'HomeCraft India', buyer_id: 'buyer-2',
    status: 'REQUESTED',
    required_by_date: '2025-12-20',
    total_quantity: 200, unit_price: 220, currency: 'INR',
    items: [{ product: 'Cushion Cover 18x18', qty: 200, unit_price: 220 }],
    created_at: '2025-11-10T09:30:00Z',
  },
  {
    id: 'ord-003', order_number: 'ORD-2025-003',
    title: 'Handloom Table Runners',
    buyer_name: 'Artisan Exports', buyer_id: 'buyer-3',
    status: 'READY',
    required_by_date: '2025-12-05',
    total_quantity: 150, unit_price: 350, currency: 'INR',
    items: [{ product: 'Table Runner 14x72"', qty: 150, unit_price: 350 }],
    created_at: '2025-10-20T11:00:00Z',
  },
  {
    id: 'ord-004', order_number: 'ORD-2025-004',
    title: 'Jute Shopping Bags',
    buyer_name: 'EcoMart', buyer_id: 'buyer-1',
    status: 'DELIVERED',
    required_by_date: '2025-11-30',
    total_quantity: 300, unit_price: 65, currency: 'INR',
    items: [{ product: 'Jute Bag Medium', qty: 300, unit_price: 65 }],
    created_at: '2025-10-05T08:00:00Z',
  },
];

const DEMO_TASKS = [
  {
    id: 'task-001', task_name: 'Cotton Tote Bag Stitching',
    order_id: 'ord-001', member_id: 'm1',
    status: 'IN_PROGRESS',
    allocated_quantity: 120, completed_quantity: 75,
    required_skill: 'stitching', due_date: '2025-12-10',
  },
  {
    id: 'task-002', task_name: 'Cotton Tote Bag Handle Attachment',
    order_id: 'ord-001', member_id: 'm2',
    status: 'PENDING',
    allocated_quantity: 100, completed_quantity: 0,
    required_skill: 'stitching', due_date: '2025-12-12',
  },
  {
    id: 'task-003', task_name: 'Quality Inspection – Tote Bags',
    order_id: 'ord-001', member_id: 'm3',
    status: 'PENDING',
    allocated_quantity: 220, completed_quantity: 0,
    required_skill: 'quality_check', due_date: '2025-12-14',
  },
];

const DEMO_TASK_ASSIGNMENTS = [
  {
    task_id: 'task-001',
    allocated_quantity: 120,
    accepted_quantity: 120,
    member_response: 'ACCEPTED',
    tasks: DEMO_TASKS[0],
  },
  {
    task_id: 'task-002',
    allocated_quantity: 100,
    accepted_quantity: 0,
    member_response: 'PENDING',
    tasks: DEMO_TASKS[1],
  },
];

const DEMO_EARNINGS = {
  member_name: 'Priya Sharma',
  total_approved_earnings: 18400,
  total_pending_earnings: 3200,
  lines: [
    { payable_amount: 8400,  accepted_quantity: 120, payout_sheets: { status: 'APPROVED' } },
    { payable_amount: 6500,  accepted_quantity: 100, payout_sheets: { status: 'APPROVED' } },
    { payable_amount: 3500,  accepted_quantity: 50,  payout_sheets: { status: 'APPROVED' } },
    { payable_amount: 3200,  accepted_quantity: 48,  payout_sheets: { status: 'PENDING'  } },
  ],
  note: 'Payments are processed via your SHG leader.',
};

const DEMO_QUALITY_QUEUE = [
  {
    id: 'task-001', task_name: 'Cotton Tote Bag Stitching',
    member_name: 'Priya Sharma', order_number: 'ORD-2025-001',
    completed_quantity: 75, allocated_quantity: 120,
    status: 'QUALITY_REVIEW', proof_url: null,
  },
];

const DEMO_PAYOUT_SHEET = {
  order_id: 'ord-003',
  order_number: 'ORD-2025-003',
  total_amount: 52500,
  status: 'PENDING_APPROVAL',
  currency: 'INR',
  lines: [
    { member_name: 'Priya Sharma', accepted_quantity: 60,  rate: 180, payable_amount: 10800, status: 'PENDING' },
    { member_name: 'Anita Patel',  accepted_quantity: 50,  rate: 180, payable_amount: 9000,  status: 'PENDING' },
    { member_name: 'Meena Kumari', accepted_quantity: 40,  rate: 180, payable_amount: 7200,  status: 'PENDING' },
  ],
};

const DEMO_COSTING = {
  order_id: 'ord-001',
  material_cost: 18500,
  labour_cost: 12000,
  overhead_cost: 3200,
  total_cost: 33700,
  selling_price: 42500,
  margin: 8800,
  currency: 'INR',
};

const DEMO_ALLOCATION = [
  { member_id: 'm1', member_name: 'Priya Sharma',  allocated_qty: 120, skill_level: 'expert',       availability_status: 'available' },
  { member_id: 'm2', member_name: 'Anita Patel',   allocated_qty: 100, skill_level: 'intermediate', availability_status: 'available' },
  { member_id: 'm3', member_name: 'Sunita Devi',   allocated_qty: 80,  skill_level: 'beginner',     availability_status: 'available' },
  { member_id: 'm5', member_name: 'Meena Kumari',  allocated_qty: 100, skill_level: 'intermediate', availability_status: 'available' },
  { member_id: 'm6', member_name: 'Rekha Verma',   allocated_qty: 100, skill_level: 'beginner',     availability_status: 'available' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok<T>(data: T) {
  return Promise.resolve({ success: true, data });
}

// ─── Mock API ─────────────────────────────────────────────────────────────────

  // add reports summary endpoint
  const DEMO_REPORT_SUMMARY = {
    orders: { total: DEMO_ORDERS.length, completed: DEMO_ORDERS.filter(o => ['READY', 'DELIVERED'].includes(o.status)).length, active: DEMO_ORDERS.filter(o => o.status === 'IN_PROGRESS').length },
    tasks: {
      total_allocated: DEMO_TASKS.reduce((sum, t) => sum + (t.allocated_quantity ?? 0), 0),
      total_accepted: DEMO_TASKS.reduce((sum, t) => sum + (t.completed_quantity ?? 0), 0),
      total_rejected: 0,
      acceptance_rate_pct: (() => {
        const allocated = DEMO_TASKS.reduce((s, t) => s + (t.allocated_quantity ?? 0), 0);
        const accepted = DEMO_TASKS.reduce((s, t) => s + (t.completed_quantity ?? 0), 0);
        return allocated ? Math.round((accepted / allocated) * 100) : 0;
      })(),
      rejection_rate_pct: 0,
    },
    payouts: { total_approved_inr: DEMO_PAYOUT_SHEET.lines.filter(l => l.status === 'APPROVED').reduce((s, l) => s + (l.payable_amount ?? 0), 0) },
  };

export const demoApi = {
  // --- generic REST surface (api.get / api.post / api.patch / api.delete) ---
  get: <T>(path: string): Promise<{ success: boolean; data: T }> => {
    // Members
    if (path === '/shgs/current/members')
      return ok(DEMO_MEMBERS) as any;

    // Orders (leader & buyer)
    if (path === '/orders' || path === '/buyers/orders')
      return ok(DEMO_ORDERS) as any;

    // Single order
    const orderMatch = path.match(/^\/orders\/([\w-]+)$/);
    if (orderMatch) {
      const o = DEMO_ORDERS.find(x => x.id === orderMatch[1]) ?? DEMO_ORDERS[0];
      return ok(o) as any;
    }

    // Member tasks
    if (path === '/member/tasks')
      return ok(DEMO_TASK_ASSIGNMENTS) as any;

    // Member earnings
    if (path === '/member/earnings')
      return ok(DEMO_EARNINGS) as any;

    // Quality queue
    if (path === '/quality/queue')
      return ok(DEMO_QUALITY_QUEUE) as any;

    // Allocation
    if (path.includes('/allocation'))
      return ok(DEMO_ALLOCATION) as any;

    // Plan
    if (path.includes('/plan'))
      return ok({ steps: ['Cutting', 'Stitching', 'Quality Check', 'Packing'], notes: 'Demo production plan.' }) as any;

    // Costing
    if (path.includes('/costing'))
      return ok(DEMO_COSTING) as any;

    // Payout sheet
    if (path.includes('/payout'))
      return ok(DEMO_PAYOUT_SHEET) as any;

    // Notifications
    if (path === '/reports/summary')
      return ok(DEMO_REPORT_SUMMARY) as any;
    if (path === '/notifications')
      return ok([]) as any;

    // Profile / auth/me
    if (path === '/auth/me' || path === '/profile')
      return ok({ id: 'leader-1', full_name: 'Lata Desai', email: 'lata@demo.asha', role: 'leader', shg_name: 'Saheli SHG' }) as any;

    return ok(null) as any;
  },

  post: <T>(path: string, _body?: unknown): Promise<{ success: boolean; data: T }> => {
    if (path === '/auth/login')
      return ok({
        access_token: 'demo-token-123',
        profile: { id: 'leader-1', full_name: 'Lata Desai', role: 'leader', preferred_language: 'en' },
      }) as any;
    if (path.includes('/accept'))   return ok({ status: 'ACCEPTED' }) as any;
    if (path.includes('/reject'))   return ok({ status: 'REJECTED' }) as any;
    if (path.includes('/progress')) return ok({ status: 'IN_PROGRESS', completed_quantity: 80 }) as any;
    if (path.includes('/confirm'))  return ok({ status: 'CONFIRMED' }) as any;
    if (path.includes('/submit'))   return ok({ status: 'SUBMITTED' }) as any;
    if (path.includes('/deliver'))  return ok({ status: 'DELIVERED' }) as any;
    if (path.includes('/approve'))  return ok({ status: 'APPROVED' }) as any;
    if (path === '/orders')         return ok(DEMO_ORDERS[1]) as any;
    return ok({ status: 'OK' }) as any;
  },

  patch: <T>(path: string, _body?: unknown): Promise<{ success: boolean; data: T }> => {
    return ok({ status: 'UPDATED' }) as any;
  },

  delete: <T>(_path: string): Promise<{ success: boolean; data: T }> => {
    return ok({ status: 'DELETED' }) as any;
  },

  // --- Demo-specific helpers (used by DemoProvider) ---
  getDemoState: async () => ({ role: 'leader' as Role }),
  setRole: async (role: Role) => ({ role }),
  resetDemo: async () => ({ status: 'reset' }),
  getAuditTrail: async () => [
    '2025-11-01 – Order ORD-2025-001 created by GreenLeaf Retail',
    '2025-11-02 – Plan confirmed by Lata Desai',
    '2025-11-03 – Allocation confirmed: 5 members assigned',
    '2025-11-05 – Priya Sharma accepted task task-001',
    '2025-11-12 – Quality review passed for 75 units',
  ],
  getNotifications: async () => [],
};
