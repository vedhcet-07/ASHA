import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { api, setAuthToken } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import type { UserRole } from "@asha/shared-types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginApiResponse {
  success: boolean;
  data: {
    access_token: string;
    profile: {
      id: string;
      full_name: string;
      role: UserRole;
      preferred_language: string;
    };
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setApiError("");
    try {
      const response = await api.post<LoginApiResponse>("/auth/login", data);
      const { access_token, profile } = response.data;

      setAuthToken(access_token);
      setAuth({
        userId: profile.id,
        role: profile.role,
        fullName: profile.full_name,
        accessToken: access_token,
      });

      // Route based on role
      if (profile.role === "leader") navigate("/leader");
      else if (profile.role === "member") navigate("/member");
      else navigate("/select-role");
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" color="gray.900">
          Welcome back
        </Heading>
        <Text color="gray.500" mt={1}>
          Log in to your ASHA account
        </Text>
      </Box>

      {apiError && (
        <Alert status="error" borderRadius="btn">
          <AlertIcon />
          {apiError}
        </Alert>
      )}

      <VStack
        as="form"
        spacing={4}
        onSubmit={handleSubmit(onSubmit)}
        align="stretch"
      >
        <FormControl isInvalid={!!errors.email}>
          <FormLabel>Email address</FormLabel>
          <Input
            type="email"
            placeholder="you@example.com"
            borderRadius="input"
            size="lg"
            {...register("email")}
          />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.password}>
          <FormLabel>Password</FormLabel>
          <InputGroup size="lg">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              borderRadius="input"
              {...register("password")}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? "Hide password" : "Show password"}
                icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Logging in..."
          size="lg"
          w="full"
          mt={2}
        >
          Login
        </Button>
      </VStack>

      <Text textAlign="center" color="gray.500" fontSize="sm">
        Don't have an account?{" "}
        <Link to="/signup">
          <Text as="span" color="primary.600" fontWeight="600">
            Sign up
          </Text>
        </Link>
      </Text>
    </VStack>
  );
}
