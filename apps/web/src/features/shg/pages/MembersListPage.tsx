import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Spinner,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
} from "@chakra-ui/react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../../../lib/api";
import type { SHGMember } from "@asha/shared-types";

const availabilityColors: Record<string, string> = {
  available: "green",
  partially_available: "yellow",
  unavailable: "red",
};

const availabilityLabels: Record<string, string> = {
  available: "Available",
  partially_available: "Partial",
  unavailable: "Unavailable",
};

export function MembersListPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["members"],
    queryFn: () =>
      api.get<{ success: boolean; data: SHGMember[] }>("/shgs/current/members"),
  });

  const members = data?.data ?? [];
  const filtered = members.filter((m) =>
    m.member_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Members</Heading>
          <Text color="gray.500" mt={1}>
            {members.length} members in your SHG
          </Text>
        </Box>
        <Button
          as={Link}
          to="/leader/members/add"
          leftIcon={<Plus size={16} />}
          size="md"
        >
          Add member
        </Button>
      </HStack>

      {/* Search */}
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <Search size={16} color="gray" />
        </InputLeftElement>
        <Input
          placeholder="Search members..."
          borderRadius="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      {/* Members list */}
      {isLoading ? (
        <Box textAlign="center" py={12}>
          <Spinner color="primary.500" size="lg" />
        </Box>
      ) : isError ? (
        <Box textAlign="center" py={8}>
          <Text color="danger.500">Failed to load members. Please refresh.</Text>
        </Box>
      ) : filtered.length === 0 ? (
        <Card borderRadius="card">
          <CardBody p={8} textAlign="center">
            <Text color="gray.400" fontSize="lg">
              {search ? "No members match your search." : "No members yet."}
            </Text>
            {!search && (
              <Button
                as={Link}
                to="/leader/members/add"
                mt={4}
                leftIcon={<Plus size={16} />}
              >
                Add first member
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {filtered.map((member) => (
            <Card
              key={member.id}
              as={Link}
              to={`/leader/members/${member.id}`}
              borderRadius="card"
              border="1px"
              borderColor="gray.100"
              _hover={{ borderColor: "primary.300", shadow: "sm", textDecoration: "none" }}
              transition="all 0.15s"
              cursor="pointer"
            >
              <CardBody p={4}>
                <HStack spacing={3} justify="space-between">
                  <HStack spacing={3}>
                    <Avatar
                      size="md"
                      name={member.member_name}
                      bg="primary.100"
                      color="primary.700"
                    />
                    <VStack align="start" spacing={0.5}>
                      <Text fontWeight="600" fontSize="md">
                        {member.member_name}
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge
                          colorScheme={availabilityColors[member.availability_status] ?? "gray"}
                          borderRadius="full"
                          px={2}
                          fontSize="xs"
                        >
                          {availabilityLabels[member.availability_status] ?? member.availability_status}
                        </Badge>
                        {member.daily_capacity > 0 && (
                          <Text fontSize="xs" color="gray.500">
                            {member.daily_capacity}/day
                          </Text>
                        )}
                      </HStack>
                      {member.skills && member.skills.length > 0 && (
                        <HStack spacing={1} mt={1} flexWrap="wrap">
                          {member.skills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill.id}
                              variant="subtle"
                              colorScheme="gray"
                              fontSize="xs"
                              borderRadius="full"
                            >
                              {skill.skill}
                            </Badge>
                          ))}
                          {member.skills.length > 3 && (
                            <Text fontSize="xs" color="gray.400">
                              +{member.skills.length - 3} more
                            </Text>
                          )}
                        </HStack>
                      )}
                    </VStack>
                  </HStack>
                  <ChevronRight size={16} color="gray" />
                </HStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );
}
