import {
  Box, Heading, VStack, SimpleGrid, Text, Card, CardBody,
  Spinner, Badge,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";

interface Summary {
  orders: { total: number; completed: number; active: number };
  tasks: {
    total_allocated: number; total_accepted: number; total_rejected: number;
    acceptance_rate_pct: number; rejection_rate_pct: number;
  };
  payouts: { total_approved_inr: number };
}

export function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get<{ success: boolean; data: Summary }>("/reports/summary"),
  });

  const s = data?.data;

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Reports</Heading>
        <Text color="gray.500" mt={1}>Operational summary for your SHG</Text>
      </Box>

      <Heading size="sm" color="gray.600">Orders</Heading>
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        {[
          ["Total orders", s?.orders.total ?? 0, "gray"],
          ["Active orders", s?.orders.active ?? 0, "blue"],
          ["Completed", s?.orders.completed ?? 0, "green"],
        ].map(([label, val, color]) => (
          <Card key={label as string} borderRadius="card">
            <CardBody p={4} textAlign="center">
              <Text fontSize="3xl" fontWeight="800" color={`${color}.500`}>{val}</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Heading size="sm" color="gray.600">Production quality</Heading>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        {[
          ["Allocated", s?.tasks.total_allocated ?? 0, "gray"],
          ["Accepted", s?.tasks.total_accepted ?? 0, "green"],
          ["Acceptance rate", `${s?.tasks.acceptance_rate_pct ?? 0}%`, "primary"],
          ["Rejection rate", `${s?.tasks.rejection_rate_pct ?? 0}%`, "red"],
        ].map(([label, val, color]) => (
          <Card key={label as string} borderRadius="card">
            <CardBody p={4} textAlign="center">
              <Text fontSize="2xl" fontWeight="700" color={`${color}.500`}>{val}</Text>
              <Text fontSize="xs" color="gray.500" mt={1}>{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <Heading size="sm" color="gray.600">Earnings</Heading>
      <Card borderRadius="card" bg="success.50" border="2px" borderColor="success.200">
        <CardBody p={5} textAlign="center">
          <Text fontSize="sm" color="gray.600">Total approved payouts</Text>
          <Text fontSize="3xl" fontWeight="800" color="success.600">
            ₹{(s?.payouts.total_approved_inr ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
          <Badge colorScheme="yellow" mt={2} borderRadius="full" fontSize="xs">SIMULATED</Badge>
        </CardBody>
      </Card>
    </VStack>
  );
}
