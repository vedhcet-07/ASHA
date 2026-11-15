/**
 * SHGSetupScreen — ASHA Platform Phase 1 (task 1.7).
 *
 * Rendered at /leader/shg/setup.
 * - Requires the user to hold the leader role (redirects otherwise)
 * - Form to create a new SHG
 * - Calls POST /api/v1/shgs via apiClient
 * - On success: sets shgId in Zustand store, navigates to /leader/dashboard
 *
 * Requirements: 2.1
 */
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { apiClient } from "../../lib/api";
import { useAuthStore } from "../../lib/hooks/useAuthStore";

// ---------------------------------------------------------------------------
// Schema — mirrors Requirement 2.1
// ---------------------------------------------------------------------------

const shgSetupSchema = z.object({
  name: z.string().min(2, "SHG name must be at least 2 characters").max(120),
  district: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(80).optional().or(z.literal("")),
  registration_number: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  minimum_margin_percent: z
    .number({ invalid_type_error: "Enter a valid percentage" })
    .min(0, "Cannot be negative")
    .max(100, "Cannot exceed 100%")
    .optional(),
});

type SHGSetupFormValues = z.infer<typeof shgSetupSchema>;

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface SHGResponse {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Component() {
  const navigate = useNavigate();
  const toast = useToast();

  const activeRole = useAuthStore((s) => s.activeRole);
  const user = useAuthStore((s) => s.user);
  const setShgId = useAuthStore((s) => s.setShgId);

  // Guard: must be authenticated and hold leader role
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (activeRole !== "leader") {
      navigate("/select-role", { replace: true });
    }
  }, [user, activeRole, navigate]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SHGSetupFormValues>({
    resolver: zodResolver(shgSetupSchema),
    defaultValues: {
      minimum_margin_percent: 15,
    },
  });

  const onSubmit = async (values: SHGSetupFormValues) => {
    try {
      // Build a clean payload — omit empty strings
      const payload: Record<string, unknown> = { name: values.name };
      if (values.district) payload["district"] = values.district;
      if (values.state) payload["state"] = values.state;
      if (values.registration_number)
        payload["registration_number"] = values.registration_number;
      if (values.address) payload["address"] = values.address;
      if (values.minimum_margin_percent !== undefined)
        payload["minimum_margin_percent"] = values.minimum_margin_percent;

      const shg = await apiClient.post<SHGResponse>("/api/v1/shgs", payload);

      setShgId(shg.id);

      toast({
        title: "SHG created",
        description: `"${shg.name}" has been set up successfully.`,
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });

      navigate("/leader/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create SHG. Please try again.";

      toast({
        title: "Could not create SHG",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  };

  if (!user || activeRole !== "leader") {
    return null;
  }

  return (
    <Box minH="100dvh" bg="gray.50" py={{ base: 8, md: 14 }}>
      <Box
        maxW="560px"
        mx="auto"
        px={4}
        bg="white"
        borderRadius="2xl"
        shadow="md"
        border="1px solid"
        borderColor="gray.100"
        p={{ base: 6, md: 8 }}
      >
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <VStack spacing={1} align="start">
            <Heading size="md" fontWeight="bold">
              Set up your SHG
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Enter the details for your self-help group. You can update them
              later.
            </Text>
          </VStack>

          <Divider />

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <VStack spacing={4} align="stretch">
              {/* Name — required */}
              <FormControl isInvalid={!!errors.name} isRequired>
                <FormLabel fontSize="sm">SHG name</FormLabel>
                <Input
                  type="text"
                  placeholder="e.g. Mahila Shakti SHG"
                  {...register("name")}
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              {/* District */}
              <FormControl isInvalid={!!errors.district}>
                <FormLabel fontSize="sm">
                  District{" "}
                  <Text as="span" color="gray.400" fontWeight="normal">
                    (optional)
                  </Text>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="e.g. Mysuru"
                  {...register("district")}
                />
                <FormErrorMessage>{errors.district?.message}</FormErrorMessage>
              </FormControl>

              {/* State */}
              <FormControl isInvalid={!!errors.state}>
                <FormLabel fontSize="sm">
                  State{" "}
                  <Text as="span" color="gray.400" fontWeight="normal">
                    (optional)
                  </Text>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="e.g. Karnataka"
                  {...register("state")}
                />
                <FormErrorMessage>{errors.state?.message}</FormErrorMessage>
              </FormControl>

              {/* Registration number */}
              <FormControl isInvalid={!!errors.registration_number}>
                <FormLabel fontSize="sm">
                  Registration number{" "}
                  <Text as="span" color="gray.400" fontWeight="normal">
                    (optional)
                  </Text>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="e.g. KA/MYS/2024/0042"
                  {...register("registration_number")}
                />
                <FormErrorMessage>
                  {errors.registration_number?.message}
                </FormErrorMessage>
              </FormControl>

              {/* Address */}
              <FormControl isInvalid={!!errors.address}>
                <FormLabel fontSize="sm">
                  Address{" "}
                  <Text as="span" color="gray.400" fontWeight="normal">
                    (optional)
                  </Text>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="Village / ward, taluk, district"
                  {...register("address")}
                />
                <FormErrorMessage>{errors.address?.message}</FormErrorMessage>
              </FormControl>

              {/* Minimum margin % */}
              <FormControl isInvalid={!!errors.minimum_margin_percent}>
                <FormLabel fontSize="sm">Minimum margin (%)</FormLabel>
                <Controller
                  name="minimum_margin_percent"
                  control={control}
                  render={({ field: { onChange, value, ref } }) => (
                    <NumberInput
                      min={0}
                      max={100}
                      precision={1}
                      value={value ?? ""}
                      onChange={(_, numVal) =>
                        onChange(isNaN(numVal) ? undefined : numVal)
                      }
                    >
                      <NumberInputField
                        ref={ref}
                        placeholder="e.g. 15"
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormHelperText fontSize="xs" color="gray.400">
                  The costing engine will warn you if any order falls below this
                  margin.
                </FormHelperText>
                <FormErrorMessage>
                  {errors.minimum_margin_percent?.message}
                </FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                size="md"
                isLoading={isSubmitting}
                loadingText="Creating SHG…"
                w="full"
                mt={2}
              >
                Create SHG
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  );
}
