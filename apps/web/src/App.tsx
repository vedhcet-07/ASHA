import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { theme } from "./lib/theme";

// Layouts
import { AuthLayout } from "./app/layouts/AuthLayout";
import { LeaderLayout } from "./app/layouts/LeaderLayout";
import { MemberLayout } from "./app/layouts/MemberLayout";

// Auth pages
import { LoginPage } from "./features/auth/pages/LoginPage";
import { SignupPage } from "./features/auth/pages/SignupPage";
import { RoleSelectionPage } from "./features/auth/pages/RoleSelectionPage";

// Leader pages
import { LeaderDashboard } from "./features/shg/pages/LeaderDashboard";
import { MembersListPage } from "./features/shg/pages/MembersListPage";
import { AddMemberPage } from "./features/shg/pages/AddMemberPage";
import { MemberDetailPage } from "./features/shg/pages/MemberDetailPage";
import { CreateSHGPage } from "./features/shg/pages/CreateSHGPage";

// Member pages
import { MemberWorkspace } from "./features/tasks/pages/MemberWorkspace";

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
            {/* Public auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Role selection (after login) */}
            <Route
              path="/select-role"
              element={
                <RequireAuth>
                  <RoleSelectionPage />
                </RequireAuth>
              }
            />

            {/* SHG creation (leader first login) */}
            <Route
              path="/create-shg"
              element={
                <RequireAuth>
                  <RequireRole role="leader">
                    <CreateSHGPage />
                  </RequireRole>
                </RequireAuth>
              }
            />

            {/* Leader routes */}
            <Route
              path="/leader"
              element={
                <RequireAuth>
                  <RequireRole role="leader">
                    <LeaderLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<LeaderDashboard />} />
              <Route path="members" element={<MembersListPage />} />
              <Route path="members/add" element={<AddMemberPage />} />
              <Route path="members/:memberId" element={<MemberDetailPage />} />
            </Route>

            {/* Member routes */}
            <Route
              path="/member"
              element={
                <RequireAuth>
                  <RequireRole role="member">
                    <MemberLayout />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route index element={<MemberWorkspace />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
