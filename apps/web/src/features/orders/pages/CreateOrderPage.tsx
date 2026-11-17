import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, FormControl, FormLabel, FormErrorMessage, Input, Textarea,
  VStack, HStack, Text, Alert, AlertIcon, Heading, Card, CardBody,
  Divider, IconButton, NumberInput, NumberInputField, SimpleGrid,
} from "@chakra-ui/react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { CreateOrderSchema, type CreateOrderInput } from "@asha/shared-types";

export function CreateOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
    useForm<CreateOrderInput>({
      resolver: zodResolver(CreateOrderSchema),
      defaultValues: {
        items: [{ product_name: "", quantity: 1, unit_type: "piece", specifications: {} }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(data: CreateOrderInput) {
    setApiError("");
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>("/orders", data);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/leader/orders/${res.data.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to create order");
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <IconButton aria-label="Back" icon={<ChevronLeft size={20} />}
          variant="ghost" onClick={() => navigate("/leader/orders")} />
        <Box>
          <Heading size="lg">Create order</Heading>
          <Text color="gray.500">Add a new production order manually</Text>
        </Box>
      </HStack>

      {apiError && <Alert status="error" borderRadius="btn"><AlertIcon />{apiError}</Alert>}

      <Card borderRadius="card">
        <CardBody p={6}>
          <VStack as="form" spacing={5} onSubmit={handleSubmit(onSubmit)} align="stretch">
            <Heading size="sm" color="gray.700">Order details</Heading>

            <FormControl isInvalid={!!errors.title}>
              <FormLabel>Order title</FormLabel>
              <Input placeholder="e.g. Festival Tote Bags" borderRadius="input" {...register("title")} />
              <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Description (optional)</FormLabel>
              <Textarea placeholder="Additional context for this order..."
                borderRadius="input" rows={3} {...register("description")} />
            </FormControl>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isInvalid={!!errors.required_by_date}>
                <FormLabel>Required by date</FormLabel>
                <Input type="date" borderRadius="input" {...register("required_by_date")} />
                <FormErrorMessage>{errors.required_by_date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Delivery address (optional)</FormLabel>
                <Input placeholder="Delivery location" borderRadius="input" {...register("delivery_address")} />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Special instructions (optional)</FormLabel>
              <Input placeholder="e.g. Use natural dye only" borderRadius="input"
                {...register("special_instructions")} />
            </FormControl>

            <Divider />

            <HStack justify="space-between">
              <Heading size="sm" color="gray.700">Products</Heading>
              <Button size="sm" variant="outline" leftIcon={<Plus size={14} />}
                onClick={() => append({ product_name: "", quantity: 1, unit_type: "piece", specifications: {} })}>
                Add product
              </Button>
            </HStack>

            {errors.items && (
              <Text fontSize="sm" color="danger.500">{errors.items.message}</Text>
            )}

            {fields.map((field, index) => (
              <Card key={field.id} borderRadius="btn" border="1px" borderColor="gray.100">
                <CardBody p={4}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="600" fontSize="sm" color="gray.600">
                      Product {index + 1}
                    </Text>
                    {fields.length > 1 && (
                      <IconButton aria-label="Remove" icon={<Trash2 size={14} />}
                        variant="ghost" size="sm" colorScheme="red" onClick={() => remove(index)} />
                    )}
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                    <FormControl isInvalid={!!errors.items?.[index]?.product_name}>
                      <FormLabel fontSize="sm">Product name</FormLabel>
                      <Input placeholder="e.g. Canvas Tote Bag" borderRadius="input" size="sm"
                        {...register(`items.${index}.product_name`)} />
                      <FormErrorMessage>{errors.items?.[index]?.product_name?.message}</FormErrorMessage>
                    </FormControl>

                    <FormControl isInvalid={!!errors.items?.[index]?.quantity}>
                      <FormLabel fontSize="sm">Quantity</FormLabel>
                      <Controller name={`items.${index}.quantity`} control={control}
                        render={({ field }) => (
                          <NumberInput min={1} size="sm" value={field.value}
                            onChange={(_, v) => field.onChange(v)}>
                            <NumberInputField borderRadius="input" />
                          </NumberInput>
                        )} />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Unit</FormLabel>
                      <Input placeholder="piece / kg / dozen" borderRadius="input" size="sm"
                        {...register(`items.${index}.unit_type`)} />
                    </FormControl>
                  </SimpleGrid>

                  <FormControl mt={3}>
                    <FormLabel fontSize="sm">Agreed price per unit (₹, optional)</FormLabel>
                    <Controller name={`items.${index}.agreed_unit_price`} control={control}
                      render={({ field }) => (
                        <NumberInput min={0} size="sm"
                          value={field.value ?? ""}
                          onChange={(_, v) => field.onChange(isNaN(v) ? undefined : v)}>
                          <NumberInputField borderRadius="input" placeholder="e.g. 120" />
                        </NumberInput>
                      )} />
                  </FormControl>
                </CardBody>
              </Card>
            ))}

            <Divider />
            <HStack spacing={3} justify="flex-end">
              <Button variant="ghost" onClick={() => navigate("/leader/orders")}>Cancel</Button>
              <Button type="submit" isLoading={isSubmitting} loadingText="Creating..." px={8}>
                Create order
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
