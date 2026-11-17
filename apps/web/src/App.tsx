import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { theme } from "./lib/theme";

// Layouts
import { AuthLayout }   from "./app/layouts/AuthLayout";
import { LeaderLayout } from "./app/layouts/LeaderLayout";
import { MemberLayout } from "./app/layouts/MemberLayout";
import { BuyerLayout }  from "./app/layouts/BuyerLayout";

// Auth pages
import { LoginPage }         from "./features/auth/pages/LoginPage";
import { SignupPage }         from "./features/auth/pages/SignupPage";
import { RoleSelectionPage }  from "./features/auth/pages/RoleSelectionPage";

// Leader — SHG
import { LeaderDashboard }  from "./features/shg/pages/LeaderDashboard";
import { MembersListPage }  from "./features/shg/pages/MembersListPage";
import { AddMemberPage }    from "./features/shg/pages/AddMemberPage";
import { MemberDetailPage } from "./features/shg/pages/MemberDetailPage";
import { CreateSHGPage }    from "./features/shg/pages/CreateSHGPage";

// Leader — Orders
import { OrdersListPage }  from "./features/orders/pages/OrdersListPage";
import { CreateOrderPage } from "./features/orders/pages/CreateOrderPage";
import { OrderDetailPage } from "./features/orders/pages/OrderDetailPage";

// Leader — Planning & Allocation
import { PlanReviewPage }   from "./features/allocation/pages/PlanReviewPage";
import { AllocationPage }   from "./features/allocation/pages/AllocationPage";

// Leader — Quality & Costing
import { QualityQueuePage } from "./features/quality/pages/QualityQueuePage";
import { CostingPage }      from "./features/costing/pages/CostingPage";

// Member
import { MyTaskPage }       from "./features/tasks/pages/MyTaskPage";

// Buyer
import { BuyerCreateOrderPage } from "./features/buyer/pages/BuyerCreateOrderPage";
import { BuyerOrdersPage }      from "./features/buyer/pages/BuyerOrdersPage";
import { BuyerOrderStatusPage } from "./features/buyer/pages/BuyerOrderStatusPage";

// Guards
import { RequireAuth } from "./app/routes/RequireAuth";
import { RequireRole } from "./app/routes/RequireRole";

const chakraTheme = extendTheme(theme);

export default function App() {
  return (
    <ChakraProvider theme={chakraTheme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public auth */}
            <Route element={<AuthLayout />}>
              <Route path="/login"  element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            <Route path="/select-role" element={<RequireAuth><RoleSelectionPage /></RequireAuth>} />
            <Route path="/create-shg"  element={<RequireAuth><RequireRole role="leader"><CreateSHGPage /></RequireRole></RequireAuth>} />

            {/* Leader routes */}
            <Route path="/leader" element={<RequireAuth><RequireRole role="leader"><LeaderLayout /></RequireRole></RequireAuth>}>
              <Route index                        element={<LeaderDashboard />} />
              <Route path="members"               element={<MembersListPage />} />
              <Route path="members/add"           element={<AddMemberPage />} />
              <Route path="members/:memberId"     element={<MemberDetailPage />} />
              <Route path="orders"                element={<OrdersListPage />} />
              <Route path="orders/create"         element={<CreateOrderPage />} />
              <Route path="orders/:orderId"       element={<OrderDetailPage />} />
              <Route path="orders/:orderId/plan"       element={<PlanReviewPage />} />
              <Route path="orders/:orderId/allocation" element={<AllocationPage />} />
              <Route path="quality"                    element={<QualityQueuePage />} />
              <Route path="orders/:orderId/costing"    element={<CostingPage />} />
            </Route>

            {/* Member routes */}
            <Route path="/member" element={<RequireAuth><RequireRole role="member"><MemberLayout /></RequireRole></RequireAuth>}>
              <Route index element={<MyTaskPage />} />
            </Route>

            {/* Buyer routes */}
            <Route path="/buyer" element={<RequireAuth><RequireRole role="buyer"><BuyerLayout /></RequireRole></RequireAuth>}>
              <Route index                        element={<Navigate to="/buyer/orders" replace />} />
              <Route path="create-order"          element={<BuyerCreateOrderPage />} />
              <Route path="orders"                element={<BuyerOrdersPage />} />
              <Route path="orders/:orderId"       element={<BuyerOrderStatusPage />} />
            </Route>

            <Route path="/"  element={<Navigate to="/login" replace />} />
            <Route path="*"  element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
