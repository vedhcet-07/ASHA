import {
  Box,
  VStack,
  Text,
  Heading,
  Card,
  CardBody,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { ClipboardList } from "lucide-react";
import { useAuthStore } from "../../../lib/store";

export function MemberWorkspace() {
  const { fullName } = useAuthStore();

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Text color="gray.500" fontSize="sm">
          Welcome
        </Text>
        <Heading size="lg" color="gray.900">
          {fullName}
        </Heading>
      </Box>

      {/* No task state */}
      <Card borderRadius="card" border="2px" borderColor="gray.100">
        <CardBody p={8} textAlign="center">
          <VStack spacing={4}>
            <Box
              p={4}
              borderRadius="full"
              bg="primary.50"
              display="inline-flex"
            >
              <ClipboardList size={32} color="#0F766E" />
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="600" color="gray.700">
                No task assigned right now
              </Text>
              <Text color="gray.400" mt={1} fontSize="sm">
                Your leader will assign a task to you soon.
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Summary cards */}
      <HStack spacing={4}>
        <Card borderRadius="card" flex={1}>
          <CardBody p={4} textAlign="center">
            <Text fontSize="2xl" fontWeight="700" color="primary.500">
              0
            </Text>
            <Text fontSize="sm" color="gray.500">
              Tasks completed
            </Text>
          </CardBody>
        </Card>
        <Card borderRadius="card" flex={1}>
          <CardBody p={4} textAlign="center">
            <Text fontSize="2xl" fontWeight="700" color="success.500">
              ₹0
            </Text>
            <Text fontSize="sm" color="gray.500">
              Expected earnings
            </Text>
          </CardBody>
        </Card>
      </HStack>

      <Badge
        colorScheme="yellow"
        p={3}
        borderRadius="btn"
        display="block"
        textAlign="center"
        fontSize="xs"
      >
        All payments are SIMULATED for demo purposes
      </Badge>
    </VStack>
  );
}
