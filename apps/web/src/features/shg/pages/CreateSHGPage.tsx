import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  NumberInput,
  NumberInputField,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../../lib/api";
import { CreateSHGSchema, type CreateSHGInput } from "@asha/shared-types";
import { useAuthStore } from "../../../lib/store";

export function CreateSHGPage() {
  const navigate = useNavigate();
  const { setAuth, userId, role, fullName, accessToken } = useAuthStore();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSHGInput>({
    resolver: zodResolver(CreateSHGSchema),
    defaultValues: { minimum_margin_percent: 15 },
  });

  async function onSubmit(data: CreateSHGInput) {
    setApiError("");
    try {
      const response = await api.post<{ success: boolean; data: { id: string; name: string } }>(
        "/shgs",
        data
      );
      const shg = response.data;

      if (userId && role && fullName && accessToken) {
        setAuth({
          userId,
          role,
          fullName,
          accessToken,
          shgId: shg.id,
          shgName: shg.name,
        });
      }
      navigate("/leader");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to create SHG");
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={6}>
      <Card maxW="480px" w="full" borderRadius="card">
        <CardBody p={8}>
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontSize="xl" fontWeight="800" color="primary.500" mb={1}>
                ASHA
              </Text>
              <Heading size="md">Create your SHG</Heading>
              <Text color="gray.500" mt={1} fontSize="sm">
                Set up your self-help group workspace
              </Text>
            </Box>

            {apiError && (
              <Alert status="error" borderRadius="btn">
                <AlertIcon />
                {apiError}
              </Alert>
            )}

            <VStack as="form" spacing={4} onSubmit={handleSubmit(onSubmit)} align="stretch">
              <FormControl isInvalid={!!errors.name}>
                <FormLabel>SHG name</FormLabel>
                <Input
                  placeholder="e.g. Mahila Shakti SHG"
                  borderRadius="input"
                  size="lg"
                  {...register("name")}
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Registration number (optional)</FormLabel>
                <Input
                  placeholder="e.g. KA/SHG/2019/00142"
                  borderRadius="input"
                  size="lg"
                  {...register("registration_number")}
                />
              </FormControl>

              <FormControl>
                <FormLabel>District (optional)</FormLabel>
                <Input
                  placeholder="e.g. Mysuru"
                  borderRadius="input"
                  size="lg"
                  {...register("district")}
                />
              </FormControl>

              <FormControl>
                <FormLabel>State (optional)</FormLabel>
                <Input
                  placeholder="e.g. Karnataka"
                  borderRadius="input"
                  size="lg"
                  {...register("state")}
                />
              </FormControl>

              <FormControl isInvalid={!!errors.minimum_margin_percent}>
                <FormLabel>Minimum acceptable margin (%)</FormLabel>
                <Controller
                  name="minimum_margin_percent"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      min={0}
                      max={100}
                      size="lg"
                      value={field.value}
                      onChange={(_, val) => field.onChange(val)}
                    >
                      <NumberInputField borderRadius="input" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>
                  {errors.minimum_margin_percent?.message}
                </FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Creating SHG..."
                size="lg"
                w="full"
                mt={2}
              >
                Create SHG
              </Button>
            </VStack>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}
