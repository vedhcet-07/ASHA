/**
 * LeaderDashboard — placeholder screen rendered at /leader/dashboard.
 * Full implementation arrives in Phase 2–4 when order and allocation features land.
 *
 * Validates: Requirements 1.4, 1.7
 */
import { Box, Center, Heading, Text } from "@chakra-ui/react";

export function Component() {
  return (
    <Center minH="100dvh" bg="green.50">
      <Box textAlign="center" p={8}>
        <Heading size="xl" color="green.600" mb={2}>
          Leader Dashboard
        </Heading>
        <Text color="gray.500">
          Leader dashboard — full implementation coming in Phase 2.
        </Text>
      </Box>
    </Center>
  );
}
