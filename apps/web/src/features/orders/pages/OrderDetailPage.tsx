import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, SimpleGrid, IconButton, Alert, AlertIcon,
  Table, Thead, Tbody, Tr, Th, Td,
} from "@chakra-ui/react";
import { ChevronLeft, CheckCircle, XCircle, Truck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import type { Order } from "@asha/shared-types";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "yellow", REVIEWED: "blue", PLANNING: "purple",
  ALLOCATION_PENDING: "orange", IN_PROGRESS: "teal", QUALITY_REVIEW: "cyan",
  REWORK: "red", READY: "green", DELIVERED: "green", CANCELLED: "gray", COMPLETED: "green",
};

const TIMELINE_STEPS = [
  "REQUESTED", "REVIEWED", "PLANNING", "ALLOCATION_PENDING",
  "IN_PROGRESS", "QUALITY_REVIEW", "READY", "DELIVERED", "COMPLETED",
];

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.get<{ success: boolean; data: Order }>(`/orders/${orderId}`),
    enabled: !!orderId,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/reject`, { reason: "Rejected by leader" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const deliverMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/deliver`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Action failed"),
  });

  const order = data?.data;

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;
  if (!order) return <Box textAlign="center" py={8}><Text color="gray.500">Order not found.</Text></Box>;

  const currentStep = TIMELINE_STEPS.indexOf(order.status);

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack>
        <IconButton aria-label="Back" icon={<ChevronLeft size={20} />}
          variant="ghost" onClick={() => navigate("/leader/orders")} />
        <Box flex={1}>
          <HStack>
            <Heading size="lg" noOfLines={1}>{order.title}</Heading>
            <Badge colorScheme={STATUS_COLORS[order.status] ?? "gray"}
              borderRadius="full" px={2}>{order.status.replace(/_/g, " ")}</Badge>
          </HStack>
          <Text color="gray.400" fontSize="sm">{order.order_number}</Text>
        </Box>
      </HStack>

      {actionError && <Alert status="error" borderRadius="btn"><AlertIcon />{actionError}</Alert>}

      {/* Action buttons */}
      {order.status === "REQUESTED" && (
        <HStack spacing={3}>
          <Button leftIcon={<CheckCircle size={16} />} colorScheme="green"
            isLoading={acceptMutation.isPending} onClick={() => acceptMutation.mutate()}>
            Accept order
          </Button>
          <Button leftIcon={<XCircle size={16} />} colorScheme="red" variant="outline"
            isLoading={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
            Reject order
          </Button>
        </HStack>
      )}
      {order.status === "REVIEWED" && (
        <Button leftIcon={<CheckCircle size={16} />} colorScheme="blue" maxW="220px"
          onClick={() => navigate(`/leader/orders/${orderId}/plan`)}>
          Generate production plan
        </Button>
      )}
      {order.status === "PLANNING" && (
        <Button leftIcon={<CheckCircle size={16} />} colorScheme="purple" maxW="220px"
          onClick={() => navigate(`/leader/orders/${orderId}/allocation`)}>
          Propose allocation
        </Button>
      )}
      {order.status === "READY" && (
        <Button leftIcon={<Truck size={16} />} colorScheme="teal" maxW="200px"
          isLoading={deliverMutation.isPending} onClick={() => deliverMutation.mutate()}>
          Mark delivered
        </Button>
      )}

      {/* Status timeline */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Progress</Heading>
          <HStack spacing={0} flexWrap="nowrap" overflowX="auto">
            {TIMELINE_STEPS.filter(s => s !== "COMPLETED").map((step, i) => {
              const done = currentStep > i || order.status === "COMPLETED";
              const active = TIMELINE_STEPS[currentStep] === step;
              const cancelled = order.status === "CANCELLED";
              return (
                <HStack key={step} spacing={0} flex={1} minW="80px">
                  <VStack spacing={1} flex={1} align="center">
                    <Box w={3} h={3} borderRadius="full"
                      bg={cancelled ? "gray.200" : done ? "primary.500" : active ? "primary.300" : "gray.200"} />
                    <Text fontSize="9px" color={done || active ? "primary.600" : "gray.400"}
                      textAlign="center" lineHeight="1.2">
                      {step.replace(/_/g, " ")}
                    </Text>
                  </VStack>
                  {i < TIMELINE_STEPS.filter(s => s !== "COMPLETED").length - 1 && (
                    <Box flex={1} h="1px" bg={done ? "primary.300" : "gray.200"} mt="-10px" />
                  )}
                </HStack>
              );
            })}
          </HStack>
        </CardBody>
      </Card>

      {/* Order info */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card borderRadius="card">
          <CardBody p={5}>
            <Heading size="sm" mb={3}>Details</Heading>
            <VStack align="stretch" spacing={2}>
              {[
                ["Required by", format(new Date(order.required_by_date), "dd MMM yyyy")],
                ["Delivery address", order.delivery_address ?? "—"],
                ["Special instructions", order.special_instructions ?? "—"],
              ].map(([label, value]) => (
                <HStack key={label} justify="space-between" align="start">
                  <Text fontSize="sm" color="gray.500" minW="120px">{label}</Text>
                  <Text fontSize="sm" fontWeight="500" textAlign="right">{value}</Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>

        <Card borderRadius="card">
          <CardBody p={5}>
            <Heading size="sm" mb={3}>Summary</Heading>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Products</Text>
                <Text fontSize="sm" fontWeight="600">{order.items?.length ?? 0}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Total units</Text>
                <Text fontSize="sm" fontWeight="600">
                  {order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0}
                </Text>
              </HStack>
              {order.items?.some(i => i.agreed_unit_price) && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Order value</Text>
                  <Text fontSize="sm" fontWeight="600" color="primary.600">
                    ₹{order.items.reduce((s, i) => s + (i.agreed_unit_price ?? 0) * i.quantity, 0).toLocaleString("en-IN")}
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Products table */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Products</Heading>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th isNumeric>Qty</Th>
                  <Th>Unit</Th>
                  <Th isNumeric>Price/unit</Th>
                  <Th isNumeric>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(order.items ?? []).map((item) => (
                  <Tr key={item.id}>
                    <Td fontWeight="500">{item.product_name}</Td>
                    <Td isNumeric>{item.quantity}</Td>
                    <Td>{item.unit_type}</Td>
                    <Td isNumeric>{item.agreed_unit_price ? `₹${item.agreed_unit_price}` : "—"}</Td>
                    <Td isNumeric fontWeight="600">
                      {item.agreed_unit_price
                        ? `₹${(item.agreed_unit_price * item.quantity).toLocaleString("en-IN")}`
                        : "—"}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
}
