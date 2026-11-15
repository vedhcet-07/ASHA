/**
 * LoginScreen — ASHA Platform Phase 1 (task 1.7).
 *
 * Rendered at /login via PublicLayout.
 * - Validates with React Hook Form + Zod
 * - Calls POST /api/v1/auth/login via apiClient
 * - On success: sets user in Zustand store, navigates to /select-role
 * - Shows error toast on failure
 *
 * Requirements: 1.1, 1.3
 */
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../lib/hooks/useAuthStore";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    shg_id: string | null;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Named component export used by React Router's lazy loading pattern. */
export function Component() {
  const navigate = useNavigate();
  const toast = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const setShgId = useAuthStore((s) => s.setShgId);

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await apiClient.post<LoginResponse>(
        "/api/v1/auth/login",
        values,
      );

      // Persist the resolved user and SHG membership in the Zustand store.
      // The Supabase user object shape is compatible with what the API returns;
      // we cast to unknown to satisfy the strict User type from supabase-js.
      setUser(response.user as unknown as import("@supabase/supabase-js").User);
      if (response.user.shg_id) {
        setShgId(response.user.shg_id);
      }

      navigate("/select-role", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";

      toast({
        title: "Login failed",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  };

  return (
    <VStack spacing={5} align="stretch">
      <VStack spacing={1} align="start">
        <Heading size="md" fontWeight="bold">
          Sign in
        </Heading>
        <Text fontSize="sm" color="gray.500">
          Welcome back to ASHA
        </Text>
      </VStack>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack spacing={4} align="stretch">
          {/* Email */}
          <FormControl isInvalid={!!errors.email} isRequired>
            <FormLabel fontSize="sm">Email address</FormLabel>
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register("email")}
            />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>

          {/* Password */}
          <FormControl isInvalid={!!errors.password} isRequired>
            <FormLabel fontSize="sm">Password</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                autoComplete="current-password"
                {...register("password")}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
          </FormControl>

          <Button
            type="submit"
            colorScheme="brand"
            size="md"
            isLoading={isSubmitting}
            loadingText="Signing in…"
            w="full"
            mt={1}
          >
            Sign in
          </Button>
        </VStack>
      </form>

      <Text fontSize="sm" color="gray.500" textAlign="center">
        Don&apos;t have an account?{" "}
        <Link as={RouterLink} to="/signup" color="brand.600" fontWeight="medium">
          Create one
        </Link>
      </Text>
    </VStack>
  );
}
