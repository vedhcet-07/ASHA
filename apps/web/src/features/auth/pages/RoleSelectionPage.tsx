import { useNavigate } from "react-router-dom";
import {
  Box,
  VStack,
  Text,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { Users, User, CheckSquare, Shield, ShoppingBag } from "lucide-react";
import { useAuthStore } from "../../../lib/store";
import { api } from "../../../lib/api";
import type { UserRole } from "@asha/shared-types";

const roles = [
  {
    value: "leader" as UserRole,
    label: "SHG Leader",
    description: "Create orders, manage members, review quality, approve payouts",
    icon: Users,
    color: "primary",
    path: "/leader",
  },
  {
    value: "member" as UserRole,
    label: "SHG Member",
    description: "View your tasks, update progress, upload proof",
    icon: User,
    color: "blue",
    path: "/member",
  },
  {
    value: "approver" as UserRole,
    label: "Approver",
    description: "Review and approve payout sheets",
    icon: Shield,
    color: "purple",
    path: "/approver",
  },
  {
    value: "checker" as UserRole,
    label: "Quality Checker",
    description: "Review submitted proof and make quality decisions",
    icon: CheckSquare,
    color: "green",
    path: "/leader/quality",
  },
  {
    value: "buyer" as UserRole,
    label: "Buyer",
    description: "Track your order status and delivery record",
    icon: ShoppingBag,
    color: "orange",
    path: "/buyer/orders",
  },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { setAuth, userId, fullName, accessToken } = useAuthStore();

  async function selectRole(role: UserRole, path: string) {
    try {
      await api.post("/auth/select-role", { role });
      if (userId && fullName && accessToken) {
        setAuth({ userId, role, fullName, accessToken });
      }
      navigate(path);
    } catch (err) {
      console.error("Role selection failed", err);
    }
  }

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      <VStack spacing={8} maxW="600px" mx="auto">
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="800" color="primary.500">
            ASHA
          </Text>
          <Heading size="lg" mt={4}>
            Select your role
          </Heading>
          <Text color="gray.500" mt={2}>
            Choose the role you want to access right now
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} w="full">
          {roles.map(({ value, label, description, icon: Icon, path }) => (
            <Card
              key={value}
              cursor="pointer"
              borderRadius="card"
              border="2px"
              borderColor="gray.100"
              _hover={{
                borderColor: "primary.300",
                shadow: "md",
                transform: "translateY(-2px)",
              }}
              transition="all 0.15s"
              onClick={() => selectRole(value, path)}
            >
              <CardBody p={5}>
                <VStack align="start" spacing={3}>
                  <Box
                    p={2}
                    borderRadius="btn"
                    bg="primary.50"
                    color="primary.500"
                  >
                    <Icon size={20} />
                  </Box>
                  <Box>
                    <Text fontWeight="700" fontSize="md">
                      {label}
                    </Text>
                    <Text fontSize="sm" color="gray.500" mt={1} lineHeight="short">
                      {description}
                    </Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
