import { Outlet, NavLink } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Avatar,
} from "@chakra-ui/react";
import {
  ClipboardList,
  ShoppingBag,
  Wallet,
  User,
} from "lucide-react";
import { useAuthStore } from "../../lib/store";

const navItems = [
  { icon: ClipboardList, label: "My Task", to: "/member" },
  { icon: ShoppingBag, label: "My Orders", to: "/member/orders" },
  { icon: Wallet, label: "My Earnings", to: "/member/earnings" },
  { icon: User, label: "Profile", to: "/member/profile" },
];

export function MemberLayout() {
  const { fullName } = useAuthStore();

  return (
    <Flex minH="100vh" bg="gray.50" direction="column">
      {/* Top bar */}
      <HStack
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={20}
        bg="primary.500"
        px={4}
        py={3}
        justify="space-between"
      >
        <Text fontSize="lg" fontWeight="800" color="white">
          ASHA
        </Text>
        <Avatar size="sm" name={fullName || "Member"} bg="primary.600" />
      </HStack>

      {/* Main content */}
      <Box flex={1} pt="60px" pb="80px" overflow="auto">
        <Box maxW="480px" mx="auto" p={4}>
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
        safe-area-inset-bottom="0"
      >
        <HStack justify="space-around" px={2} py={2}>
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/member"}
              style={{ textDecoration: "none", flex: 1 }}
            >
              {({ isActive }) => (
                <VStack
                  spacing={0.5}
                  align="center"
                  py={1}
                  color={isActive ? "primary.500" : "gray.400"}
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
