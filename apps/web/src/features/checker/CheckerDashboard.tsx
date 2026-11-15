/**
 * CheckerDashboard — placeholder screen rendered at /checker/dashboard.
 * Full quality-review queue arrives in Phase 5.
 *
 * Validates: Requirements 1.4, 1.7
 */
import { Box, Center, Heading, Text } from "@chakra-ui/react";

export function Component() {
  return (
    <Center minH="100dvh" bg="orange.50">
      <Box textAlign="center" p={8}>
        <Heading size="xl" color="orange.600" mb={2}>
          Checker Dashboard
        </Heading>
        <Text color="gray.500">
          Quality checker dashboard — full implementation coming in Phase 5.
        </Text>
      </Box>
    </Center>
  );
}
