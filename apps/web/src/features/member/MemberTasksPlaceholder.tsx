/**
 * MemberTasksPlaceholder — placeholder screen rendered at /member/tasks.
 * Full task list and task-detail implementation arrives in Phase 4–5.
 *
 * Validates: Requirements 1.4, 1.7
 */
import { Box, Center, Heading, Text } from "@chakra-ui/react";

export function Component() {
  return (
    <Center minH="100dvh" bg="blue.50">
      <Box textAlign="center" p={8}>
        <Heading size="xl" color="blue.600" mb={2}>
          My Tasks
        </Heading>
        <Text color="gray.500">
          Member task list — full implementation coming in Phase 5.
        </Text>
      </Box>
    </Center>
  );
}
