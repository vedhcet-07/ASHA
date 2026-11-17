import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, SimpleGrid,
} from "@chakra-ui/react";
import { Plus, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api } from "../../../lib/api";
import type { Order } from "@asha/shared-types";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "yellow", REVIEWED: "blue", IN_PROGRESS: "teal",
  QUALITY_REVIEW: "cyan", READY: "green", DELIVERED: "green",
  CANCELLED: "gray", COMPLETED: "green",
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Order placed", REVIEWED: "Accepted", PLANNING: "Planning",
  ALLOCATION_PENDING: "Planning", IN_PROGRESS: "In production",
  QUALITY_REVIEW: "Quality check", REWORK: "In production",
  READY: "Ready for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled", COMPLETED: "Completed",
};

export function BuyerOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["buyer-orders"],
    queryFn: () => api.get<{ success: boolean; data: Order[] }>("/buyers/orders"),
  });

  const orders = data?.data ?? [];

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">My Orders</Heading>
          <Text color="gray.500" mt={1}>{orders.length} orders placed</Text>
        </Box>
        <Button as={Link} to="/buyer/create-order" leftIcon={<Plus size={16} />} size="sm">
          New order
        </Button>
      </HStack>

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>
      ) : orders.length === 0 ? (
        <Card borderRadius="card"><CardBody p={8} textAlign="center">
          <Box p={4} borderRadius="full" bg="primary.50" display="inline-flex" mb={4}>
            <Package size={32} color="#0F766E" />
          </Box>
          <Text fontSize="lg" fontWeight="600" color="gray.700">No orders yet</Text>
          <Text color="gray.400" mt={1}>Place your first order with the SHG</Text>
          <Button as={Link} to="/buyer/create-order" mt={4} leftIcon={<Plus size={16} />}>
            Place an order
          </Button>
        </CardBody></Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {orders.map((order) => (
            <Card key={order.id} as={Link} to={`/buyer/orders/${order.id}`}
              borderRadius="card" border="1px" borderColor="gray.100"
              _hover={{ borderColor: "primary.300", shadow: "sm", textDecoration: "none" }}
              transition="all 0.15s" cursor="pointer">
              <CardBody p={4}>
                <HStack justify="space-between" mb={2}>
                  <Badge colorScheme={STATUS_COLORS[order.status] ?? "gray"}
                    borderRadius="full" px={2} fontSize="xs">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                  <Text fontSize="xs" color="gray.400">{order.order_number}</Text>
                </HStack>
                <Text fontWeight="700" fontSize="md" noOfLines={1}>{order.title}</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {order.items?.length ?? 0} products · Due {format(new Date(order.required_by_date), "dd MMM yyyy")}
                </Text>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );
}
