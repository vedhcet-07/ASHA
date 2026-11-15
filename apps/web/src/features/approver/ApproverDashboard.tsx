/**
 * ApproverDashboard — placeholder screen rendered at /approver/dashboard.
 * Full payout-approval views arrive in Phase 7.
 *
 * Validates: Requirements 1.4, 1.7
 */
import { Box, Center, Heading, Text } from "@chakra-ui/react";

export function Component() {
  return (
    <Center minH="100dvh" bg="purple.50">
      <Box textAlign="center" p={8}>
        <Heading size="xl" color="purple.600" mb={2}>
          Approver Dashboard
        </Heading>
        <Text color="gray.500">
          Approver dashboard — full implementation coming in Phase 7.
        </Text>
      </Box>
    </Center>
  );
}
