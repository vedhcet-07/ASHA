// apps/web/src/demo/demoMock.ts
// Core mock data and API surface for the frontend‑only demo.
// This file is intentionally simple – it provides deterministic, in‑memory state
// persisted to localStorage. All functions return Promise‑like results to mimic
// real API calls.

export type Role = 'buyer' | 'leader' | 'member' | 'checker' | 'approver';

export interface Member {
  id: string;
  name: string;
  skill: number; // 0‑100
  capacity: number; // max qty they can handle
  availability: number; // 0‑100
  quality: number; // 0‑100
  workload: number; // current assigned qty
}

export interface Order {
  id: string;
  buyerId: string;
  items: { product: string; qty: number }[];
  status: 'REQUESTED' | 'PLANNING' | 'IN_PROGRESS' | 'READY' | 'COMPLETED';
}

export interface Task {
  id: string;
  orderId: string;
  memberId: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  progress?: number; // 0‑100
}

export interface DemoState {
  version: number;
  role: Role;
  activeMemberId?: string;
  members: Record<string, Member>;
  orders: Record<string, Order>;
  tasks: Record<string, Task>;
  audit: string[];
}

const STORAGE_KEY = 'asha-demo-state-v1';
const INITIAL_STATE: DemoState = {
  version: 1,
  role: 'buyer',
  members: {
    // 12 demo members (shortened for brevity)
    'm1': { id: 'm1', name: 'Asha', skill: 80, capacity: 200, availability: 90, quality: 85, workload: 0 },
    'm2': { id: 'm2', name: 'Rohan', skill: 70, capacity: 150, availability: 95, quality: 80, workload: 0 },
    'm3': { id: 'm3', name: 'Neha', skill: 85, capacity: 180, availability: 85, quality: 90, workload: 0 },
    // ... add remaining members as needed
  },
  orders: {},
  tasks: {},
  audit: [],
};

function loadState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoState;
      // Simple version check – if version differs, reset to initial.
      if (parsed.version === INITIAL_STATE.version) return parsed;
    } catch (_) {}
  }
  saveState(INITIAL_STATE);
  return INITIAL_STATE;
}

function saveState(state: DemoState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function appendAudit(state: DemoState, entry: string) {
  state.audit.push(`${new Date().toISOString()} – ${entry}`);
}

// ----- Mock API implementation -----
export const demoApi = {
  // State helpers
  getDemoState: async () => {
    return loadState();
  },
  setRole: async (role: Role) => {
    const state = loadState();
    state.role = role;
    saveState(state);
    appendAudit(state, `Role set to ${role}`);
    return state;
  },
  setActiveMember: async (memberId: string) => {
    const state = loadState();
    state.activeMemberId = memberId;
    saveState(state);
    appendAudit(state, `Active member set to ${memberId}`);
    return state;
  },

  // Order flow
  createOrder: async (buyerId: string, items: { product: string; qty: number }[]) => {
    const state = loadState();
    const orderId = `order-${Date.now()}`;
    state.orders[orderId] = {
      id: orderId,
      buyerId,
      items,
      status: 'REQUESTED',
    };
    saveState(state);
    appendAudit(state, `Order ${orderId} created`);
    return state.orders[orderId];
  },
  generatePlanDraft: async (orderId: string) => {
    // In demo we simply return a static draft object.
    const draft = {
      steps: ['Cutting', 'Stitching', 'Quality Check', 'Packing'],
      notes: 'Demo plan – deterministic',
    };
    appendAudit(loadState(), `Plan draft generated for ${orderId}`);
    return draft;
  },
  confirmPlan: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    order.status = 'PLANNING';
    saveState(state);
    appendAudit(state, `Plan confirmed for ${orderId}`);
    return order;
  },

  // Allocation
  proposeAllocation: async (orderId: string) => {
    const state = loadState();
    // Simple deterministic allocation: distribute total qty equally among members.
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    const totalQty = order.items.reduce((s, i) => s + i.qty, 0);
    const memberIds = Object.keys(state.members);
    const perMember = Math.floor(totalQty / memberIds.length);
    const allocation = memberIds.map(id => ({ memberId: id, allocatedQty: perMember }));
    appendAudit(state, `Allocation proposed for ${orderId}`);
    return allocation;
  },
  confirmAllocation: async (orderId: string, allocations: { memberId: string; allocatedQty: number }[]) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    // Create tasks for each allocation.
    allocations.forEach(a => {
      const taskId = `task-${Date.now()}-${a.memberId}`;
      state.tasks[taskId] = {
        id: taskId,
        orderId,
        memberId: a.memberId,
        description: `Work on ${order.items.map(i => i.product).join(', ')}`,
        status: 'PENDING',
        progress: 0,
      };
    });
    order.status = 'IN_PROGRESS';
    saveState(state);
    appendAudit(state, `Allocation confirmed for ${orderId}`);
    return order;
  },

  // Member task workflow
  acceptTask: async (taskId: string) => {
    const state = loadState();
    const task = state.tasks[taskId];
    if (!task) throw new Error('Task not found');
    task.status = 'IN_PROGRESS';
    saveState(state);
    appendAudit(state, `Task ${taskId} accepted`);
    return task;
  },
  addProgress: async (taskId: string, progress: number) => {
    const state = loadState();
    const task = state.tasks[taskId];
    if (!task) throw new Error('Task not found');
    task.progress = Math.min(100, (task.progress ?? 0) + progress);
    if (task.progress === 100) task.status = 'COMPLETED';
    saveState(state);
    appendAudit(state, `Progress ${progress}% added to ${taskId}`);
    return task;
  },
  addProof: async (taskId: string, proofUrl: string) => {
    // In demo we just record the URL in the audit log.
    const state = loadState();
    appendAudit(state, `Proof uploaded for ${taskId}: ${proofUrl}`);
    return { taskId, proofUrl };
  },

  // Quality review
  reviewQuality: async (taskId: string, accepted: boolean) => {
    const state = loadState();
    const task = state.tasks[taskId];
    if (!task) throw new Error('Task not found');
    // Accept/reject influences payout later – we just log.
    appendAudit(state, `Quality review for ${taskId}: ${accepted ? 'accepted' : 'rejected'}`);
    return { taskId, accepted };
  },
  createRework: async (taskId: string) => {
    const state = loadState();
    // Clone the task as a new rework task.
    const orig = state.tasks[taskId];
    const newId = `task-${Date.now()}-rework`;
    state.tasks[newId] = { ...orig, id: newId, status: 'PENDING', progress: 0 };
    saveState(state);
    appendAudit(state, `Rework task ${newId} created from ${taskId}`);
    return state.tasks[newId];
  },

  // Costing & payout (real formulas, but deterministic values)
  calculateCostSheet: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    const costPerItem = 5; // demo constant
    const totalCost = order.items.reduce((s, i) => s + i.qty * costPerItem, 0);
    return { orderId, totalCost, currency: 'INR' };
  },
  calculatePayout: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    const pricePerItem = 10; // demo constant
    const totalPrice = order.items.reduce((s, i) => s + i.qty * pricePerItem, 0);
    const totalCost = order.items.reduce((s, i) => s + i.qty * 5, 0);
    const payout = totalPrice - totalCost;
    return { orderId, payout, currency: 'INR' };
  },
  submitPayout: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    // Mark as pending approval in audit.
    appendAudit(state, `Payout submitted for ${orderId}`);
    return { orderId, status: 'PENDING_APPROVAL' };
  },
  approvePayout: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    appendAudit(state, `Payout approved for ${orderId}`);
    return { orderId, status: 'APPROVED' };
  },

  // Delivery
  markDelivered: async (orderId: string) => {
    const state = loadState();
    const order = state.orders[orderId];
    if (!order) throw new Error('Order not found');
    order.status = 'COMPLETED';
    saveState(state);
    appendAudit(state, `Order ${orderId} marked delivered`);
    return order;
  },

  // Utilities
  resetDemo: async () => {
    saveState(INITIAL_STATE);
    return INITIAL_STATE;
  },
  jumpToPayoutReview: async () => {
    // Fast‑forward state to a checkpoint where an order is ready for payout.
    const state = { ...INITIAL_STATE };
    // Create a demo order and set it through the flow.
    const orderId = 'order-demo';
    state.orders[orderId] = {
      id: orderId,
      buyerId: 'buyer-demo',
      items: [{ product: 'Tote Bag', qty: 100 }],
      status: 'READY',
    };
    // Create a single task for illustration.
    const taskId = 'task-demo';
    state.tasks[taskId] = {
      id: taskId,
      orderId,
      memberId: 'm1',
      description: 'Demo task',
      status: 'COMPLETED',
      progress: 100,
    };
    saveState(state);
    appendAudit(state, 'Jumped to payout review checkpoint');
    return state;
  },
  getAuditTrail: async () => {
    const state = loadState();
    return state.audit;
  },
  getNotifications: async () => {
    // Simple static placeholder – UI can poll this.
    return [];
  },
};

