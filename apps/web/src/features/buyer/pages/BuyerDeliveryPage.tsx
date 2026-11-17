import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Table, Thead, Tbody, Tr, Th, Td, IconButton,
} from "@chakra-ui/react";
import { ChevronLeft, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "../../../lib/api";

interface Order {
  id: string;
  order_number: string;
  title: string;
  status: string;
  required_by_date: string;
  delivery_address?: string;
  order_items: Array<{ product_name: string; quantity: number; unit_type: string; agreed_unit_price?: number }>;
}

export function BuyerDeliveryPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["buyer-delivery", orderId],
    queryFn: () => api.get<{ success: boolean; data: Order }>(`/buyers/orders/${orderId}`),
    enabled: !!orderId,
  });

  const order = data?.data;

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;
  if (!order) return <Box textAlign="center" py={8}><Text color="gray.500">Order not found.</Text></Box>;

  const isDelivered = ["DELIVERED", "COMPLETED"].includes(order.status);
  const totalUnits = order.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const orderValue = order.order_items?.reduce((s, i) => s + (i.agreed_unit_price ?? 0) * i.quantity, 0) ?? 0;

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

      {/* Delivery status banner */}
      <Card borderRadius="card" bg={isDelivered ? "success.50" : "primary.50"}
        border="2px" borderColor={isDelivered ? "success.200" : "primary.200"}>
        <CardBody p={5}>
          <HStack spacing={4}>
            <Box p={3} borderRadius="full" bg={isDelivered ? "success.100" : "primary.100"}>
              <Package size={24} color={isDelivered ? "#16A34A" : "#0F766E"} />
            </Box>
            <VStack align="start" spacing={0}>
              <Badge colorScheme={isDelivered ? "green" : "blue"} borderRadius="full" px={2}>
                {order.status.replace(/_/g, " ")}
              </Badge>
              <Text fontWeight="600" mt={1}>
                {isDelivered
                  ? "Your order has been delivered!"
                  : `Expected by ${format(new Date(order.required_by_date), "dd MMM yyyy")}`}
              </Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>

      {/* Delivery record */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Delivery record</Heading>
          <VStack align="stretch" spacing={2}>
            {[
              ["Order number", order.order_number],
              ["Required by", format(new Date(order.required_by_date), "dd MMM yyyy")],
              ["Delivery address", order.delivery_address ?? "—"],
              ["Total units", totalUnits],
            ].map(([label, val]) => (
              <HStack key={label as string} justify="space-between" p={2} bg="gray.50" borderRadius="btn">
                <Text fontSize="sm" color="gray.500">{label}</Text>
                <Text fontSize="sm" fontWeight="600">{val}</Text>
              </HStack>
            ))}
            {orderValue > 0 && (
              <HStack justify="space-between" p={2} bg="primary.50" borderRadius="btn">
                <Text fontSize="sm" color="gray.600">Order value</Text>
                <Text fontSize="sm" fontWeight="700" color="primary.600">
                  ₹{orderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Text>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Products */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Products</Heading>
          <Table size="sm">
            <Thead><Tr><Th>Product</Th><Th isNumeric>Qty</Th><Th>Unit</Th></Tr></Thead>
            <Tbody>
              {(order.order_items ?? []).map((item, idx) => (
                <Tr key={idx}>
                  <Td fontWeight="500">{item.product_name}</Td>
                  <Td isNumeric>{item.quantity}</Td>
                  <Td>{item.unit_type}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </VStack>
  );
}
