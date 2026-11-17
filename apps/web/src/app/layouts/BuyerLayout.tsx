import { Outlet, NavLink } from "react-router-dom";
import { Box, Flex, HStack, Text, VStack, Avatar } from "@chakra-ui/react";
import { Plus, ShoppingBag, User } from "lucide-react";
import { useAuthStore } from "../../lib/store";

const navItems = [
  { icon: Plus,        label: "New Order",  to: "/buyer/create-order" },
  { icon: ShoppingBag, label: "My Orders",  to: "/buyer/orders" },
  { icon: User,        label: "Profile",    to: "/buyer/profile" },
];

export function BuyerLayout() {
  const { fullName } = useAuthStore();

  return (
    <Flex minH="100vh" bg="gray.50" direction="column">
      <HStack position="fixed" top={0} left={0} right={0} zIndex={20}
        bg="primary.500" px={4} py={3} justify="space-between">
        <Text fontSize="lg" fontWeight="800" color="white">ASHA</Text>
        <Avatar size="sm" name={fullName || "Buyer"} bg="primary.600" />
      </HStack>

      <Box flex={1} pt="60px" pb="80px" overflow="auto">
        <Box maxW="720px" mx="auto" p={4}>
          <Outlet />
        </Box>
      </Box>

      <Box position="fixed" bottom={0} left={0} right={0} zIndex={20}
        bg="white" borderTop="1px" borderColor="gray.100">
        <HStack justify="space-around" px={2} py={2}>
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} style={{ textDecoration: "none", flex: 1 }}>
              {({ isActive }) => (
                <VStack spacing={0.5} align="center" py={1}
                  color={isActive ? "primary.500" : "gray.400"}>
                  <Icon size={22} />
                  <Text fontSize="10px" fontWeight={isActive ? "600" : "500"}>{label}</Text>
                </VStack>
              )}
            </NavLink>
          ))}
        </HStack>
      </Box>
    </Flex>
  );
}
