import {
  Box,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  Flex,
  Badge,
  Card,
  CardBody,
  Spinner,
  Button,
} from "@chakra-ui/react";
import { Users, ShoppingBag, CheckSquare, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";
import type { SHGMember } from "@asha/shared-types";
import type { Order } from "@asha/shared-types";

function StatCard({
  icon: Icon,
  label,
  value,
  color = "primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card borderRadius="card">
      <CardBody p={5}>
        <HStack spacing={4}>
          <Box
            p={3}
            borderRadius="btn"
            bg={`${color}.50`}
            color={`${color}.500`}
          >
            <Icon size={22} />
          </Box>
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" lineHeight="1">
              {value}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {label}
            </Text>
          </VStack>
        </HStack>
      </CardBody>
    </Card>
  );
}

function getNextAction(order: Order): { label: string; to: string; colorScheme: string } {
  switch (order.status) {
    case "REQUESTED":
      return { label: "Review & Accept", to: `/leader/orders/${order.id}`, colorScheme: "primary" };
    case "REVIEWED":
    case "PLANNING":
      return { label: "Production Plan", to: `/leader/orders/${order.id}/plan`, colorScheme: "purple" };
    case "ALLOCATION_PENDING":
      return { label: "Allocate Tasks", to: `/leader/orders/${order.id}/allocation`, colorScheme: "blue" };
    case "IN_PROGRESS":
    case "QUALITY_REVIEW":
    case "REWORK":
      return { label: "Review Quality", to: `/leader/quality`, colorScheme: "teal" };
    case "READY":
      return { label: "Costing Sheet", to: `/leader/orders/${order.id}/costing`, colorScheme: "green" };
    case "DELIVERED":
      return { label: "Payout Sheet", to: `/leader/orders/${order.id}/payout`, colorScheme: "orange" };
    default:
      return { label: "View Order", to: `/leader/orders/${order.id}`, colorScheme: "gray" };
  }
}

export function LeaderDashboard() {
  const { shgName, fullName } = useAuthStore();

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () =>
      api.get<{ success: boolean; data: SHGMember[] }>("/shgs/current/members"),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ success: boolean; data: Order[] }>("/orders"),
  });

  const members = membersData?.data ?? [];
  const activeMembers = members.filter((m) => m.is_active);
  const orders = ordersData?.data ?? [];
  const activeOrders = orders.filter(o => !["COMPLETED","CANCELLED"].includes(o.status));
  const unavailableMembers = members.filter(
    (m) => m.availability_status === "unavailable"
  );

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Box>
        <Text color="gray.500" fontSize="sm">
          Welcome back
        </Text>
        <Heading size="lg" color="gray.900">
          {fullName}
        </Heading>
        {shgName && (
          <Badge colorScheme="primary" mt={1} px={2} py={0.5} borderRadius="full">
            {shgName}
          </Badge>
        )}
      </Box>

      {/* Quick stats */}
      {isLoading ? (
        <Box textAlign="center" py={8}>
          <Spinner color="primary.500" />
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
          <StatCard
            icon={Users}
            label="Active members"
            value={activeMembers.length}
            color="primary"
          />
          <StatCard icon={ShoppingBag} label="Active orders" value={activeOrders.length} color="blue" />
          <StatCard
            icon={CheckSquare}
            label="Pending quality reviews"
            value={0}
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="Unavailable members"
            value={unavailableMembers.length}
            color="warning"
          />
        </SimpleGrid>
      )}

      {/* Pending actions & active orders */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <HStack justify="space-between" mb={4}>
            <Heading size="sm">
              Active Orders & Pending Actions
            </Heading>
            <Badge colorScheme="primary" borderRadius="full" px={2}>
              {activeOrders.length} active
            </Badge>
          </HStack>
          <VStack align="stretch" spacing={3}>
            {activeOrders.length === 0 ? (
              <HStack
                p={4}
                bg="primary.50"
                borderRadius="btn"
                justify="space-between"
              >
                <Text fontSize="sm" color="gray.700">
                  No active orders right now. Create an order or add members to begin.
                </Text>
              </HStack>
            ) : (
              activeOrders.map((order) => {
                const action = getNextAction(order);
                return (
                  <Flex
                    key={order.id}
                    p={4}
                    bg="gray.50"
                    borderRadius="btn"
                    justify="space-between"
                    align="center"
                    flexWrap="wrap"
                    gap={3}
                  >
                    <Box minW="180px">
                      <HStack spacing={2} mb={1}>
                        <Text fontWeight="700" fontSize="md">
                          {order.title}
                        </Text>
                        <Badge colorScheme="blue" fontSize="xs" borderRadius="full">
                          {order.status}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {order.order_number} • Due {order.required_by_date}
                      </Text>
                    </Box>
                    <Button
                      as={Link}
                      to={action.to}
                      size="sm"
                      colorScheme={action.colorScheme}
                    >
                      {action.label}
                    </Button>
                  </Flex>
                );
              })
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Quick actions */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>
            Quick actions
          </Heading>
          <HStack spacing={3} flexWrap="wrap">
            <Button
              as={Link}
              to="/leader/members/add"
              size="sm"
              leftIcon={<Users size={14} />}
            >
              Add member
            </Button>
            <Button as={Link} to="/leader/orders/create" size="sm" variant="outline" leftIcon={<ShoppingBag size={14} />}>
              Create order
            </Button>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
