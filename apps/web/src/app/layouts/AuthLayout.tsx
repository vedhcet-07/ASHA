import { Outlet } from "react-router-dom";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";

export function AuthLayout() {
  return (
    <Flex
      minH="100vh"
      direction={{ base: "column", md: "row" }}
      bg="gray.50"
    >
      {/* Brand panel */}
      <Flex
        display={{ base: "none", md: "flex" }}
        w="40%"
        bg="primary.500"
        direction="column"
        justify="center"
        align="center"
        p={12}
      >
        <VStack spacing={4} color="white" textAlign="center">
          <Text fontSize="4xl" fontWeight="800" letterSpacing="-0.5px">
            ASHA
          </Text>
          <Text fontSize="lg" fontWeight="500" opacity={0.9}>
            Allocation, Shares &amp; Honest Accounts
          </Text>
          <Text fontSize="md" opacity={0.75} maxW="280px" mt={2}>
            Fair work. Clear costs. Trusted payouts.
          </Text>
          <Box
            mt={8}
            p={6}
            bg="whiteAlpha.100"
            borderRadius="card"
            maxW="320px"
          >
            <Text fontSize="sm" opacity={0.9} lineHeight="tall">
              Helping women's self-help groups manage bulk orders, track
              production, and approve fair payouts — transparently.
            </Text>
          </Box>
        </VStack>
      </Flex>

      {/* Auth form panel */}
      <Flex flex={1} direction="column" justify="center" align="center" p={6}>
        {/* Mobile brand header */}
        <Box display={{ base: "block", md: "none" }} mb={8} textAlign="center">
          <Text fontSize="2xl" fontWeight="800" color="primary.500">
            ASHA
          </Text>
          <Text fontSize="sm" color="gray.500">
            Fair work. Clear costs. Trusted payouts.
          </Text>
        </Box>

        <Box w="full" maxW="420px">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
