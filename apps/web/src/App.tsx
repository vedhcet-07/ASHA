import { Box, Center, Heading, Text } from "@chakra-ui/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider, createBrowserRouter, redirect } from "react-router-dom";
import chakraTheme from "./app/theme";
import { useCurrentUser } from "./lib/hooks/useCurrentUser";

// ---------------------------------------------------------------------------
// Placeholder screen factory for routes not yet built in this phase
// ---------------------------------------------------------------------------

function makePlaceholder(label: string) {
  return function PlaceholderScreen() {
    return (
      <Center minH="100dvh" bg="gray.50">
        <Box textAlign="center" p={8}>
          <Heading size="md" color="brand.600" mb={2}>
            {label}
          </Heading>
          <Text color="gray.500" fontSize="sm">
            This screen will be implemented in a future phase.
          </Text>
        </Box>
      </Center>
    );
  };
}

// ---------------------------------------------------------------------------
// Router — routes added per phase; auth screens are complete in Phase 1
// ---------------------------------------------------------------------------

const router = createBrowserRouter([
  // Root — redirect based on role in a future phase; for now go to login
  {
    path: "/",
    loader: () => redirect("/login"),
  },

  // ── Public routes (centered card layout) ────────────────────────────────
  {
    lazy: () =>
      import("./app/layouts/PublicLayout").then((m) => ({
        Component: m.PublicLayout,
      })),
    children: [
      {
        path: "/login",
        lazy: () => import("./features/auth/LoginScreen"),
      },
      {
        path: "/signup",
        lazy: () => import("./features/auth/SignupScreen"),
      },
    ],
  },

  // ── Role selection ───────────────────────────────────────────────────────
  {
    path: "/select-role",
    lazy: () => import("./features/auth/RoleSelectScreen"),
  },

  // ── Leader routes ────────────────────────────────────────────────────────
  {
    path: "/leader",
    children: [
      {
        path: "shg/setup",
        lazy: () => import("./features/shg/SHGSetupScreen"),
      },
      {
        path: "dashboard",
        Component: makePlaceholder("Leader Dashboard"),
      },
      {
        path: "orders",
        Component: makePlaceholder("Leader Orders"),
      },
    ],
  },

  // ── Member routes ────────────────────────────────────────────────────────
  {
    path: "/member",
    children: [
      {
        path: "tasks",
        Component: makePlaceholder("Member Tasks"),
      },
      {
        path: "earnings",
        Component: makePlaceholder("Member Earnings"),
      },
    ],
  },

  // ── Approver routes ──────────────────────────────────────────────────────
  {
    path: "/approver",
    children: [
      {
        path: "payouts",
        Component: makePlaceholder("Approver Payouts"),
      },
    ],
  },

  // ── Checker routes ───────────────────────────────────────────────────────
  {
    path: "/checker",
    children: [
      {
        path: "quality",
        Component: makePlaceholder("Checker Quality Review"),
      },
    ],
  },

  // ── Buyer routes ─────────────────────────────────────────────────────────
  {
    path: "/buyer",
    children: [
      {
        path: "orders",
        Component: makePlaceholder("Buyer Orders"),
      },
      {
        path: "orders/new",
        Component: makePlaceholder("Place New Order"),
      },
    ],
  },
]);

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 3,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Inner component so useCurrentUser can access QueryClientProvider context. */
function AppWithAuth() {
  useCurrentUser();
  return (
    <>
      <RouterProvider router={router} />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </>
  );
}

export default function App() {
  return (
    <ChakraProvider theme={chakraTheme}>
      <QueryClientProvider client={queryClient}>
        <AppWithAuth />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
