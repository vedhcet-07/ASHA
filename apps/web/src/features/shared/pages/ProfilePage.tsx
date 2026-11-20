import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Button,
  Avatar,
  Divider,
} from "@chakra-ui/react";
import { LogOut, User, Globe, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../lib/store";
import { clearAuthToken } from "../../../lib/api";

export function ProfilePage() {
  const { fullName, role, shgName, language, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    clearAuthToken();
    navigate("/login", { replace: true });
  }

  return (
    <VStack spacing={6} align="stretch" maxW="600px" mx="auto" py={4}>
      <Box>
        <Heading size="lg" color="gray.900">
          My Profile
        </Heading>
        <Text color="gray.500" fontSize="sm" mt={1}>
          Account details and settings
        </Text>
      </Box>

      <Card borderRadius="card" shadow="sm">
        <CardBody p={6}>
          <VStack spacing={5} align="stretch">
            <HStack spacing={4}>
              <Avatar size="lg" name={fullName || "User"} bg="primary.500" />
              <VStack align="start" spacing={1}>
                <Text fontSize="xl" fontWeight="700">
                  {fullName || "User"}
                </Text>
                <HStack>
                  <Badge colorScheme="primary" px={2} py={0.5} borderRadius="full">
                    {role?.toUpperCase()}
                  </Badge>
                  {shgName && (
                    <Badge colorScheme="teal" px={2} py={0.5} borderRadius="full">
                      {shgName}
                    </Badge>
                  )}
                </HStack>
              </VStack>
            </HStack>

            <Divider />

            <VStack spacing={3} align="stretch">
              <HStack justify="space-between" py={1}>
                <HStack color="gray.600">
                  <Shield size={18} />
                  <Text fontSize="sm" fontWeight="500">Active Role</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="600" textTransform="capitalize">
                  {role || "Unassigned"}
                </Text>
              </HStack>

              <HStack justify="space-between" py={1}>
                <HStack color="gray.600">
                  <Globe size={18} />
                  <Text fontSize="sm" fontWeight="500">Language</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="600">
                  {language?.toUpperCase() || "EN"}
                </Text>
              </HStack>

              <HStack justify="space-between" py={1}>
                <HStack color="gray.600">
                  <User size={18} />
                  <Text fontSize="sm" fontWeight="500">Switch Role</Text>
                </HStack>
                <Button size="xs" variant="outline" onClick={() => navigate("/select-role")}>
                  Change
                </Button>
              </HStack>
            </VStack>

            <Divider />

            <Button
              leftIcon={<LogOut size={16} />}
              colorScheme="red"
              variant="outline"
              size="md"
              w="full"
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}

