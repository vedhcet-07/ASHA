import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  HStack,
  Text,
  VStack,
  Avatar,
  IconButton,
} from "@chakra-ui/react";
import { ShoppingBag, User, LogOut } from "lucide-react";
import { useAuthStore } from "../../lib/store";
import { clearAuthToken } from "../../lib/api";

const navItems = [
  { icon: ShoppingBag, label: "Orders & Payouts", to: "/approver" },
  { icon: User, label: "Profile", to: "/approver/profile" },
];

export function ApproverLayout() {
  const { fullName, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    clearAuthToken();
    navigate("/login", { replace: true });
  }

  return (
    <Flex minH="100vh" bg="gray.50" direction="column">
      {/* Top bar */}
      <HStack
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={20}
        bg="purple.700"
        px={4}
        py={3}
        justify="space-between"
      >
        <HStack spacing={3}>
          <Text fontSize="lg" fontWeight="800" color="white">
            ASHA
          </Text>
          <Text
            fontSize="xs"
            color="purple.100"
            bg="purple.800"
            px={2}
            py={0.5}
            borderRadius="full"
          >
            Approver Portal
          </Text>
        </HStack>
        <HStack spacing={3}>
          <Avatar size="sm" name={fullName || "Approver"} bg="purple.500" />
          <IconButton
            aria-label="Logout"
            icon={<LogOut size={16} />}
            variant="ghost"
            color="white"
            _hover={{ bg: "purple.600" }}
            size="sm"
            onClick={handleLogout}
          />
        </HStack>
      </HStack>

      {/* Main content */}
      <Box flex={1} pt="60px" pb="80px" overflow="auto">
        <Box maxW="960px" mx="auto" p={4}>
          <Outlet />
        </Box>
      </Box>

      {/* Bottom navigation */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={20}
        bg="white"
        borderTop="1px"
        borderColor="gray.100"
      >
        <HStack justify="space-around" px={2} py={2}>
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/approver"}
              style={{ textDecoration: "none", flex: 1 }}
            >
              {({ isActive }) => (
                <VStack
                  spacing={0.5}
                  align="center"
                  py={1}
                  color={isActive ? "purple.600" : "gray.400"}
                >
                  <Icon size={22} />
                  <Text fontSize="10px" fontWeight={isActive ? "600" : "500"}>
                    {label}
                  </Text>
                </VStack>
              )}
            </NavLink>
          ))}
        </HStack>
      </Box>
    </Flex>
  );
}

