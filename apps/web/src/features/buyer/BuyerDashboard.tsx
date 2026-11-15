/**
 * BuyerDashboard — placeholder screen rendered at /buyer/dashboard.
 * Full buyer order and delivery record screens arrive in Phase 2.
 *
 * Validates: Requirements 1.4, 1.7
 */
import { Box, Center, Heading, Text } from "@chakra-ui/react";

export function Component() {
  return (
    <Center minH="100dvh" bg="teal.50">
      <Box textAlign="center" p={8}>
        <Heading size="xl" color="teal.600" mb={2}>
          Buyer Dashboard
        </Heading>
        <Text color="gray.500">
          Buyer dashboard — full implementation coming in Phase 2.
        </Text>
      </Box>
    </Center>
  );
}
