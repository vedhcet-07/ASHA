import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, SimpleGrid, Input, InputGroup, InputLeftElement, Select,
} from "@chakra-ui/react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../../../lib/api";
import type { Order } from "@asha/shared-types";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "yellow", REVIEWED: "blue", PLANNING: "purple",
  ALLOCATION_PENDING: "orange", IN_PROGRESS: "teal", QUALITY_REVIEW: "cyan",
  REWORK: "red", READY: "green", DELIVERED: "green", CANCELLED: "gray", COMPLETED: "green",
};

export function OrdersListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ success: boolean; data: Order[] }>("/orders"),
  });

  const orders = data?.data ?? [];
  const filtered = orders.filter((o) => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? o.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Orders</Heading>
          <Text color="gray.500" mt={1}>{orders.length} total orders</Text>
        </Box>
        <Button as={Link} to="/leader/orders/create" leftIcon={<Plus size={16} />}>
          Create order
        </Button>
      </HStack>

      <HStack spacing={3} flexWrap="wrap">
        <InputGroup maxW="300px">
          <InputLeftElement pointerEvents="none"><Search size={16} color="gray" /></InputLeftElement>
          <Input placeholder="Search orders..." borderRadius="input"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </InputGroup>
        <Select maxW="200px" borderRadius="input" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} placeholder="All statuses">
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </HStack>

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>
      ) : filtered.length === 0 ? (
        <Card borderRadius="card"><CardBody p={8} textAlign="center">
          <Text color="gray.400" fontSize="lg">
            {search || statusFilter ? "No orders match your filters." : "No orders yet."}
          </Text>
          {!search && !statusFilter && (
            <Button as={Link} to="/leader/orders/create" mt={4} leftIcon={<Plus size={16} />}>
              Create first order
            </Button>
          )}
        </CardBody></Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {filtered.map((order) => (
            <Card key={order.id} as={Link} to={`/leader/orders/${order.id}`}
              borderRadius="card" border="1px" borderColor="gray.100"
              _hover={{ borderColor: "primary.300", shadow: "sm", textDecoration: "none" }}
              transition="all 0.15s" cursor="pointer">
              <CardBody p={4}>
                <HStack justify="space-between" mb={2}>
                  <Badge colorScheme={STATUS_COLORS[order.status] ?? "gray"}
                    borderRadius="full" px={2} fontSize="xs">
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                  <Text fontSize="xs" color="gray.400">{order.order_number}</Text>
                </HStack>
                <Text fontWeight="700" fontSize="md" noOfLines={1}>{order.title}</Text>
                <HStack mt={2} justify="space-between">
                  <Text fontSize="sm" color="gray.500">
                    Due: {format(new Date(order.required_by_date), "dd MMM yyyy")}
                  </Text>
                  <HStack spacing={1} color="gray.400">
                    <Text fontSize="xs">{order.items?.length ?? 0} items</Text>
                    <ChevronRight size={14} />
                  </HStack>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );
}
