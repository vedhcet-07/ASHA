/**
 * SignupScreen — ASHA Platform Phase 1 (task 1.7).
 *
 * Rendered at /signup via PublicLayout.
 * - Validates with React Hook Form + Zod
 * - Calls POST /api/v1/auth/signup via apiClient
 * - On success: navigates to /login with a success message shown as toast
 * - Supports all 6 roles from Requirement 1.6
 *
 * Requirements: 1.1, 1.2, 1.6
 */
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ROLES = [
  "leader",
  "member",
  "approver",
  "checker",
  "buyer",
  "federation_staff",
] as const;

const signupSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  role: z.enum(ROLES, { required_error: "Please select a role" }),
  phone_number: z
    .string()
    .regex(/^(\+?[0-9\s\-()]{7,20})?$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

type SignupFormValues = z.infer<typeof signupSchema>;

// Human-readable labels for the role select
const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  leader: "Leader",
  member: "Member",
  approver: "Approver",
  checker: "Quality Checker",
  buyer: "Buyer",
  federation_staff: "Federation Staff",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Component() {
  const navigate = useNavigate();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      // Strip empty optional fields before sending
      const payload: Record<string, unknown> = {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        role: values.role,
      };
      if (values.phone_number) {
        payload["phone_number"] = values.phone_number;
      }

      await apiClient.post("/api/v1/auth/signup", payload);

      toast({
        title: "Account created",
        description:
          "Your account has been created. Please sign in to continue.",
        status: "success",
        duration: 6000,
        isClosable: true,
        position: "top",
      });

      navigate("/login", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Sign up failed. Please try again.";

      toast({
        title: "Sign up failed",
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
          Create account
        </Heading>
        <Text fontSize="sm" color="gray.500">
          Join the ASHA platform
        </Text>
      </VStack>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <VStack spacing={4} align="stretch">
          {/* Full name */}
          <FormControl isInvalid={!!errors.full_name} isRequired>
            <FormLabel fontSize="sm">Full name</FormLabel>
            <Input
              type="text"
              placeholder="Priya Sharma"
              autoComplete="name"
              {...register("full_name")}
            />
            <FormErrorMessage>{errors.full_name?.message}</FormErrorMessage>
          </FormControl>

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
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

          {/* Role */}
          <FormControl isInvalid={!!errors.role} isRequired>
            <FormLabel fontSize="sm">Role</FormLabel>
            <Select placeholder="Select your role" {...register("role")}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <FormErrorMessage>{errors.role?.message}</FormErrorMessage>
          </FormControl>

          {/* Phone (optional) */}
          <FormControl isInvalid={!!errors.phone_number}>
            <FormLabel fontSize="sm">
              Phone number{" "}
              <Text as="span" color="gray.400" fontWeight="normal">
                (optional)
              </Text>
            </FormLabel>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              {...register("phone_number")}
            />
            <FormHelperText fontSize="xs" color="gray.400">
              Used for voice reminders and notifications.
            </FormHelperText>
            <FormErrorMessage>{errors.phone_number?.message}</FormErrorMessage>
          </FormControl>

          <Button
            type="submit"
            colorScheme="brand"
            size="md"
            isLoading={isSubmitting}
            loadingText="Creating account…"
            w="full"
            mt={1}
          >
            Create account
          </Button>
        </VStack>
      </form>

      <Text fontSize="sm" color="gray.500" textAlign="center">
        Already have an account?{" "}
        <Link as={RouterLink} to="/login" color="brand.600" fontWeight="medium">
          Sign in
        </Link>
      </Text>
    </VStack>
  );
}
