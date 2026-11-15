/**
 * RoleSelectScreen — ASHA Platform Phase 1 (task 1.7).
 *
 * Rendered at /select-role.
 * - Requires the user to be authenticated (redirects to /login if not)
 * - Shows all selectable roles as card buttons
 * - Sets activeRole in Zustand auth store on selection
 * - Navigates to the role-specific dashboard on selection
 *
 * Requirements: 1.6, 1.7, 1.9
 */
import {
  Box,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, type UserRole } from "../../lib/hooks/useAuthStore";

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

interface RoleCard {
  role: UserRole;
  label: string;
  description: string;
  /** Emoji icon for a quick visual cue */
  emoji: string;
  /** Route to navigate to after selecting this role */
  dashboardPath: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    role: "leader",
    label: "Leader",
    description: "Manage orders, allocation, costing, and payouts",
    emoji: "🌿",
    dashboardPath: "/leader/dashboard",
  },
  {
    role: "member",
    label: "Member",
    description: "View and complete your production tasks",
    emoji: "🧵",
    dashboardPath: "/member/tasks",
  },
  {
    role: "approver",
    label: "Approver",
    description: "Review and approve payout sheets",
    emoji: "✅",
    dashboardPath: "/approver/payouts",
  },
  {
    role: "checker",
    label: "Quality Checker",
    description: "Review submitted proof and record quality decisions",
    emoji: "🔍",
    dashboardPath: "/checker/quality",
  },
  {
    role: "buyer",
    label: "Buyer",
    description: "Place orders and track delivery status",
    emoji: "🛒",
    dashboardPath: "/buyer/orders",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Component() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  // Guard: must be authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  const handleSelectRole = (card: RoleCard) => {
    setActiveRole(card.role);

    toast({
      title: `Signed in as ${card.label}`,
      status: "success",
      duration: 2500,
      isClosable: true,
      position: "top",
    });

    navigate(card.dashboardPath, { replace: true });
  };

  if (!user) {
    // Render nothing while redirect effect fires
    return null;
  }

  return (
    <Box minH="100dvh" bg="gray.50" py={{ base: 10, md: 16 }}>
      <Center>
        <VStack spacing={8} w="full" maxW="680px" px={4}>
          {/* Header */}
          <VStack spacing={2} textAlign="center">
            <Heading size="lg" fontWeight="extrabold" color="gray.800">
              Select your role
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Choose how you would like to operate on ASHA today.
              {user.email && (
                <>
                  {" "}
                  Signed in as{" "}
                  <Text as="span" fontWeight="medium" color="gray.700">
                    {user.email}
                  </Text>
                </>
              )}
            </Text>
          </VStack>

          {/* Role cards */}
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} w="full">
            {ROLE_CARDS.map((card) => (
              <RoleCardButton
                key={card.role}
                card={card}
                onClick={() => handleSelectRole(card)}
              />
            ))}
          </SimpleGrid>

          <Text fontSize="xs" color="gray.400" textAlign="center">
            Authorization is enforced server-side. Your role controls what data
            you can access.
          </Text>
        </VStack>
      </Center>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// RoleCardButton sub-component
// ---------------------------------------------------------------------------

interface RoleCardButtonProps {
  card: RoleCard;
  onClick: () => void;
}

function RoleCardButton({ card, onClick }: RoleCardButtonProps) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      w="full"
      textAlign="left"
      bg="white"
      border="2px solid"
      borderColor="gray.200"
      borderRadius="xl"
      p={5}
      cursor="pointer"
      transition="all 0.15s"
      _hover={{
        borderColor: "brand.400",
        shadow: "md",
        transform: "translateY(-1px)",
      }}
      _active={{
        transform: "translateY(0)",
        shadow: "sm",
      }}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "brand.500",
        outlineOffset: "2px",
      }}
    >
      <Flex align="flex-start" gap={3}>
        <Box
          fontSize="2xl"
          lineHeight="1"
          mt={0.5}
          w={9}
          h={9}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="brand.50"
          borderRadius="lg"
          flexShrink={0}
        >
          {card.emoji}
        </Box>
        <VStack align="start" spacing={0.5} flex={1} minW={0}>
          <Text fontWeight="semibold" color="gray.800" fontSize="sm">
            {card.label}
          </Text>
          <Text color="gray.500" fontSize="xs" lineHeight="short">
            {card.description}
          </Text>
        </VStack>
      </Flex>
    </Box>
  );
}
