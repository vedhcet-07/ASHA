import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
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
import { api } from "../../../lib/api";

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["leader", "member", "approver", "checker", "buyer"]),
  phone_number: z.string().optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

export function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "member" },
  });

  async function onSubmit(data: SignupForm) {
    setApiError("");
    try {
      await api.post("/auth/signup", data);
      setSuccess(true);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Signup failed. Please try again."
      );
    }
  }

  if (success) {
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="success" borderRadius="btn" p={4}>
          <AlertIcon />
          <Box>
            <Text fontWeight="600">Account created!</Text>
            <Text fontSize="sm" mt={1}>
              Check your email to confirm your account, then log in.
            </Text>
          </Box>
        </Alert>
        <Button onClick={() => navigate("/login")} variant="outline" w="full">
          Go to login
        </Button>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" color="gray.900">
          Create your account
        </Heading>
        <Text color="gray.500" mt={1}>
          Join ASHA to manage your SHG operations
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
        <FormControl isInvalid={!!errors.full_name}>
          <FormLabel>Full name</FormLabel>
          <Input
            placeholder="Your name"
            borderRadius="input"
            size="lg"
            {...register("full_name")}
          />
          <FormErrorMessage>{errors.full_name?.message}</FormErrorMessage>
        </FormControl>

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
              placeholder="At least 8 characters"
              borderRadius="input"
              {...register("password")}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? "Hide" : "Show"}
                icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.role}>
          <FormLabel>Your role</FormLabel>
          <Select borderRadius="input" size="lg" {...register("role")}>
            <option value="leader">SHG Leader</option>
            <option value="member">SHG Member</option>
            <option value="approver">Approver / Treasurer</option>
            <option value="checker">Quality Checker</option>
            <option value="buyer">Buyer</option>
          </Select>
          <FormErrorMessage>{errors.role?.message}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel>Phone number (optional)</FormLabel>
          <Input
            type="tel"
            placeholder="10-digit mobile number"
            borderRadius="input"
            size="lg"
            {...register("phone_number")}
          />
        </FormControl>

        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Creating account..."
          size="lg"
          w="full"
          mt={2}
        >
          Create account
        </Button>
      </VStack>

      <Text textAlign="center" color="gray.500" fontSize="sm">
        Already have an account?{" "}
        <Link to="/login">
          <Text as="span" color="primary.600" fontWeight="600">
            Login
          </Text>
        </Link>
      </Text>
    </VStack>
  );
}
