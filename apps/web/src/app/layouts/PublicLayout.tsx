/**
 * PublicLayout — centered card layout for unauthenticated routes (login, signup).
 *
 * Requirements: 1.1, 1.2
 */
import {
  Box,
  Center,
  Flex,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

/** Leaf-shaped decorative icon representing the ASHA brand. */
function BrandMark() {
  return (
    <Flex
      w={12}
      h={12}
      borderRadius="xl"
      bg="brand.500"
      align="center"
      justify="center"
      mb={3}
    >
      {/* Simple geometric mark — leaf-like circle */}
      <Box
        w={6}
        h={6}
        borderRadius="full"
        bg="white"
        opacity={0.9}
        style={{ clipPath: "ellipse(55% 45% at 55% 50%)" }}
      />
    </Flex>
  );
}

export function PublicLayout() {
  return (
    <Box minH="100dvh" bg="gray.50" py={{ base: 8, md: 16 }}>
      <Center>
        <VStack spacing={6} w="full" maxW="420px" px={4}>
          {/* Brand header */}
          <VStack spacing={1} align="center">
            <BrandMark />
            <Heading
              as="h1"
              size="lg"
              color="brand.600"
              fontWeight="extrabold"
              letterSpacing="tight"
            >
              ASHA Platform
            </Heading>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Allocation, Shares &amp; Honest Accounts
            </Text>
          </VStack>

          {/* Page content (login / signup form card) */}
          <Box
            w="full"
            bg="white"
            borderRadius="2xl"
            shadow="md"
            border="1px solid"
            borderColor="gray.100"
            p={{ base: 6, md: 8 }}
          >
            <Outlet />
          </Box>

          {/* Footer */}
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Women&apos;s Self-Help Group Operations Platform
          </Text>
        </VStack>
      </Center>
    </Box>
  );
}
