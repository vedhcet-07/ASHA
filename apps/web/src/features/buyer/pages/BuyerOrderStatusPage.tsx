import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, IconButton, SimpleGrid, Table, Thead, Tbody, Tr, Th, Td,
} from "@chakra-ui/react";
import { ChevronLeft, CheckCircle, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import type { Order } from "@asha/shared-types";

const BUYER_STEPS = [
  { status: "REQUESTED",    label: "Order placed" },
  { status: "REVIEWED",     label: "Accepted by SHG" },
  { status: "IN_PROGRESS",  label: "In production" },
  { status: "QUALITY_REVIEW", label: "Quality check" },
  { status: "READY",        label: "Ready" },
  { status: "DELIVERED",    label: "Delivered" },
];

const STATUS_ORDER = ["REQUESTED","REVIEWED","PLANNING","ALLOCATION_PENDING",
  "IN_PROGRESS","QUALITY_REVIEW","REWORK","READY","DELIVERED","COMPLETED"];

export function BuyerOrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-order", orderId],
    queryFn: () => api.get<{ success: boolean; data: Order }>(`/buyers/orders/${orderId}`),
    enabled: !!orderId,
  });

  const order = data?.data;

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;
  if (!order) return <Box textAlign="center" py={8}><Text color="gray.500">Order not found.</Text></Box>;

  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <IconButton aria-label="Back" icon={<ChevronLeft size={20} />}
          variant="ghost" onClick={() => navigate("/buyer/orders")} />
        <Box flex={1}>
          <Heading size="lg" noOfLines={1}>{order.title}</Heading>
          <Text color="gray.400" fontSize="sm">{order.order_number}</Text>
        </Box>
      </HStack>

      {/* Status timeline */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={5}>Order status</Heading>
          <VStack align="stretch" spacing={0}>
            {BUYER_STEPS.map((step, i) => {
              const stepIdx = STATUS_ORDER.indexOf(step.status);
              const done = currentIdx > stepIdx || order.status === "COMPLETED" || order.status === "DELIVERED";
              const active = STATUS_ORDER[currentIdx] === step.status ||
                (step.status === "IN_PROGRESS" && ["PLANNING","ALLOCATION_PENDING","IN_PROGRESS","QUALITY_REVIEW","REWORK"].includes(order.status));
              const cancelled = order.status === "CANCELLED";

              return (
                <HStack key={step.status} spacing={4} align="start">
                  <VStack spacing={0} align="center" minW="24px">
                    <Box color={cancelled ? "gray.300" : done ? "primary.500" : active ? "primary.400" : "gray.300"}>
                      {done ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </Box>
                    {i < BUYER_STEPS.length - 1 && (
                      <Box w="2px" h="32px" bg={done ? "primary.300" : "gray.200"} mt={1} />
                    )}
                  </VStack>
                  <Box pb={i < BUYER_STEPS.length - 1 ? 4 : 0} pt="1px">
                    <Text fontWeight={active ? "700" : "500"}
                      color={cancelled ? "gray.400" : done || active ? "gray.800" : "gray.400"}
                      fontSize="sm">
                      {step.label}
                    </Text>
                    {active && !cancelled && (
                      <Badge colorScheme="primary" fontSize="xs" mt={1}>Current</Badge>
                    )}
                  </Box>
                </HStack>
              );
            })}

            {order.status === "CANCELLED" && (
              <HStack spacing={4}>
                <Box w="22px" textAlign="center">
                  <Box w={3} h={3} borderRadius="full" bg="red.300" mx="auto" />
                </Box>
                <Text fontSize="sm" color="red.500" fontWeight="600">Order cancelled</Text>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Order summary — no internal data exposed */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card borderRadius="card">
          <CardBody p={5}>
            <Heading size="sm" mb={3}>Order details</Heading>
            <VStack align="stretch" spacing={2}>
              {[
                ["Required by", format(new Date(order.required_by_date), "dd MMM yyyy")],
                ["Delivery address", order.delivery_address ?? "—"],
              ].map(([label, value]) => (
                <HStack key={label} justify="space-between">
                  <Text fontSize="sm" color="gray.500">{label}</Text>
                  <Text fontSize="sm" fontWeight="500">{value}</Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>

        <Card borderRadius="card">
          <CardBody p={5}>
            <Heading size="sm" mb={3}>Products ordered</Heading>
            <Table size="sm">
              <Thead><Tr><Th>Product</Th><Th isNumeric>Qty</Th><Th>Unit</Th></Tr></Thead>
              <Tbody>
                {(order.items ?? []).map((item) => (
                  <Tr key={item.id}>
                    <Td>{item.product_name}</Td>
                    <Td isNumeric>{item.quantity}</Td>
                    <Td>{item.unit_type}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );
}
