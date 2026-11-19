import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/app/layouts/MainLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { ProtectedRoute } from '@/app/layouts/ProtectedRoute';

import { LoginPage } from '@/features/auth/LoginPage';
import { RoleSelectionPage } from '@/features/auth/RoleSelectionPage';
import { LeaderDashboard } from '@/features/shg/LeaderDashboard';
import { MembersPage } from '@/features/shg/MembersPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { CreateOrderPage } from '@/features/orders/CreateOrderPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { ProductionPlanPage } from '@/features/planning/ProductionPlanPage';
import { AllocationReviewPage } from '@/features/allocation/AllocationReviewPage';
import { QualityReviewPage } from '@/features/quality/QualityReviewPage';
import { CostingSheetPage } from '@/features/costing/CostingSheetPage';
import { PayoutSheetPage } from '@/features/payouts/PayoutSheetPage';
import { BuyerDeliveryRecordPage } from '@/features/buyer/BuyerDeliveryRecordPage';
import { BuyerOrdersPage } from '@/features/buyer/BuyerOrdersPage';
import { MemberTaskPage } from '@/features/tasks/MemberTaskPage';
import { MemberEarningsPage } from '@/features/tasks/MemberEarningsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected App routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<LeaderDashboard />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<CreateOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/orders/:id/plan" element={<ProductionPlanPage />} />
        <Route path="/orders/:id/allocation" element={<AllocationReviewPage />} />
        <Route path="/orders/:id/costing" element={<CostingSheetPage />} />
        <Route path="/orders/:id/payout" element={<PayoutSheetPage />} />
        <Route path="/orders/:id/delivery" element={<BuyerDeliveryRecordPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/quality" element={<QualityReviewPage />} />
        <Route path="/buyer/orders" element={<BuyerOrdersPage />} />
        <Route path="/buyer/orders/new" element={<CreateOrderPage />} />
        <Route path="/my-tasks" element={<MemberTaskPage />} />
        <Route path="/my-earnings" element={<MemberEarningsPage />} />
        <Route path="/select-role" element={<RoleSelectionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
