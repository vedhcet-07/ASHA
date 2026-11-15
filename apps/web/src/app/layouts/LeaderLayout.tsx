import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  VStack,
  Text,
  IconButton,
  HStack,
  Avatar,
  Divider,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
} from "@chakra-ui/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  CheckSquare,
  Calculator,
  Wallet,
  BarChart2,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../../lib/store";
import { clearAuthToken } from "../../lib/api";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/leader" },
  { icon: ShoppingBag, label: "Orders", to: "/leader/orders" },
  { icon: Users, label: "Members", to: "/leader/members" },
  { icon: CheckSquare, label: "Quality", to: "/leader/quality" },
  { icon: Calculator, label: "Costing", to: "/leader/costing" },
  { icon: Wallet, label: "Payouts", to: "/leader/payouts" },
  { icon: BarChart2, label: "Reports", to: "/leader/reports" },
  { icon: Settings, label: "Settings", to: "/leader/settings" },
];

function NavItems({ onClose }: { onClose?: () => void }) {
  return (
    <VStack spacing={1} align="stretch">
      {navItems.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/leader"}
          onClick={onClose}
          style={() => ({
            textDecoration: "none",
          })}
        >
          {({ isActive }) => (
            <Flex
              align="center"
              gap={3}
              px={3}
              py={2.5}
              borderRadius="btn"
              bg={isActive ? "primary.50" : "transparent"}
              color={isActive ? "primary.600" : "gray.600"}
              _hover={{ bg: "primary.50", color: "primary.600" }}
              transition="all 0.15s"
              cursor="pointer"
            >
              <Icon size={18} />
              <Text fontSize="sm" fontWeight={isActive ? "600" : "500"}>
                {label}
              </Text>
            </Flex>
          )}
        </NavLink>
      ))}
    </VStack>
  );
}

export function LeaderLayout() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { fullName, shgName, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    clearAuthToken();
    navigate("/login");
  }

  return (
    <Flex minH="100vh" bg="gray.50">
      {/* Desktop sidebar */}
      <Box
        display={{ base: "none", lg: "flex" }}
        flexDirection="column"
        w="240px"
        bg="white"
        borderRight="1px"
        borderColor="gray.100"
        p={4}
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        overflowY="auto"
        zIndex={10}
      >
        {/* Brand */}
        <Box mb={6} px={3} pt={2}>
          <Text fontSize="xl" fontWeight="800" color="primary.500">
            ASHA
          </Text>
          {shgName && (
            <Text fontSize="xs" color="gray.500" mt={0.5} noOfLines={1}>
              {shgName}
            </Text>
          )}
        </Box>

        <NavItems />

        <Box flex={1} />

        <Divider my={4} />

        {/* User info */}
        <HStack spacing={2} px={2} mb={2}>
          <Avatar size="sm" name={fullName || "Leader"} bg="primary.500" />
          <Box flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="600" noOfLines={1}>
              {fullName}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Leader
            </Text>
          </Box>
          <IconButton
            aria-label="Logout"
            icon={<LogOut size={16} />}
            variant="ghost"
            size="sm"
            onClick={handleLogout}
          />
        </HStack>
      </Box>

      {/* Mobile top bar */}
      <Box
        display={{ base: "block", lg: "none" }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={20}
        bg="white"
        borderBottom="1px"
        borderColor="gray.100"
        px={4}
        py={3}
      >
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="800" color="primary.500">
            ASHA
          </Text>
          <IconButton
            aria-label="Open menu"
            icon={<Menu size={20} />}
            variant="ghost"
            onClick={onOpen}
          />
        </HStack>
      </Box>

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} onClose={onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottom="1px" borderColor="gray.100">
            <Text fontSize="xl" fontWeight="800" color="primary.500">
              ASHA
            </Text>
            {shgName && (
              <Text fontSize="xs" color="gray.500">
                {shgName}
              </Text>
            )}
          </DrawerHeader>
          <DrawerBody pt={4}>
            <NavItems onClose={onClose} />
            <Divider my={4} />
            <Flex
              align="center"
              gap={2}
              px={2}
              py={2}
              cursor="pointer"
              onClick={handleLogout}
              color="gray.600"
              _hover={{ color: "danger.500" }}
            >
              <LogOut size={16} />
              <Text fontSize="sm">Logout</Text>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main content */}
      <Box
        ml={{ base: 0, lg: "240px" }}
        flex={1}
        pt={{ base: "60px", lg: 0 }}
        minH="100vh"
        overflow="auto"
      >
        <Box maxW="1200px" mx="auto" p={{ base: 4, md: 6 }}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
