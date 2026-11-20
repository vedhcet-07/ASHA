import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, FormControl, FormLabel, FormErrorMessage, Input, Textarea,
  VStack, HStack, Text, Alert, AlertIcon, Heading, Card, CardBody,
  Divider, IconButton, NumberInput, NumberInputField, SimpleGrid, Badge,
} from "@chakra-ui/react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { CreateOrderSchema, type CreateOrderInput } from "@asha/shared-types";

export function BuyerCreateOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateOrderInput>({
      resolver: zodResolver(CreateOrderSchema),
      defaultValues: {
        items: [{ product_name: "", quantity: 1, unit_type: "piece", specifications: {} }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  function fillDemoOrder() {
    setValue("title", "Festival Canvas Tote Bags & Pouches");
    const d = new Date();
    d.setDate(d.getDate() + 21);
    setValue("required_by_date", d.toISOString().split("T")[0]);
    setValue("delivery_address", "14, MG Road, Bengaluru, Karnataka 560001");
    setValue("special_instructions", "Use natural dyes only. Deliver in batches of 50.");
    setValue("items", [
      { product_name: "Canvas Tote Bag", quantity: 100, unit_type: "piece", specifications: { size: "14x16 inch", material: "canvas" } },
      { product_name: "Jute Pouch", quantity: 50, unit_type: "piece", specifications: { size: "8x10 inch", material: "jute" } },
    ]);
  }

  async function onSubmit(data: CreateOrderInput) {
    setApiError("");
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>("/buyers/orders", data);
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      setCreatedOrderId(res.data?.id || null);
      setSuccess(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to place order");
    }
  }

  if (success) {
    return (
      <VStack spacing={6} align="stretch">
        <Alert status="success" borderRadius="card" p={5}>
          <AlertIcon />
          <Box>
            <Text fontWeight="700" fontSize="lg">Order submitted!</Text>
            <Text mt={1} fontSize="sm">
              The SHG leader will review your order shortly.
            </Text>
          </Box>
        </Alert>
        <HStack spacing={3}>
          {createdOrderId && (
            <Button colorScheme="primary" onClick={() => navigate(`/buyer/orders/${createdOrderId}`)}>
              Track order status
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/buyer/orders")}>View all orders</Button>
          <Button variant="ghost" onClick={() => setSuccess(false)}>Place another</Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Place an order</Heading>
        <Text color="gray.500" mt={1}>Submit a production request to the SHG</Text>
      </Box>

      <Badge colorScheme="yellow" px={3} py={1} borderRadius="btn" fontSize="xs" alignSelf="start">
        All payments are SIMULATED
      </Badge>

      {apiError && <Alert status="error" borderRadius="btn"><AlertIcon />{apiError}</Alert>}

      <Card borderRadius="card">
        <CardBody p={6}>
          <VStack as="form" spacing={5} onSubmit={handleSubmit(onSubmit)} align="stretch">
            <HStack justify="space-between" align="center">
              <Heading size="sm" color="gray.700">Order details</Heading>
              <Button size="xs" variant="outline" colorScheme="primary" onClick={fillDemoOrder}>
                Load Demo Example
              </Button>
            </HStack>

            <FormControl isInvalid={!!errors.title}>
              <FormLabel>What do you need?</FormLabel>
              <Input placeholder="e.g. Festival Tote Bags" borderRadius="input" size="lg"
                {...register("title")} />
              <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
            </FormControl>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isInvalid={!!errors.required_by_date}>
                <FormLabel>Required by</FormLabel>
                <Input type="date" borderRadius="input" {...register("required_by_date")} />
                <FormErrorMessage>{errors.required_by_date?.message}</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel>Delivery address</FormLabel>
                <Input placeholder="City, State" borderRadius="input"
                  {...register("delivery_address")} />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel>Special instructions (optional)</FormLabel>
              <Textarea placeholder="e.g. Use eco-friendly material, natural colours only"
                borderRadius="input" rows={2} {...register("special_instructions")} />
            </FormControl>

            <Divider />

            <HStack justify="space-between">
              <Heading size="sm" color="gray.700">Products</Heading>
              <Button size="sm" variant="outline" leftIcon={<Plus size={14} />}
                onClick={() => append({ product_name: "", quantity: 1, unit_type: "piece", specifications: {} })}>
                Add product
              </Button>
            </HStack>

            {fields.map((field, index) => (
              <Card key={field.id} borderRadius="btn" border="1px" borderColor="gray.100">
                <CardBody p={4}>
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="600" fontSize="sm">Product {index + 1}</Text>
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
                    <FormControl>
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
                </CardBody>
              </Card>
            ))}

            <Divider />
            <Button type="submit" size="lg" isLoading={isSubmitting} loadingText="Submitting...">
              Submit order request
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
