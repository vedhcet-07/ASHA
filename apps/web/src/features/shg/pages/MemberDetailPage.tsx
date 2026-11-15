import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Spinner,
  Avatar,
  IconButton,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Button,
  Select,
} from "@chakra-ui/react";
import { ChevronLeft, Edit, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";
import type { SHGMember } from "@asha/shared-types";

const SKILL_LABELS: Record<string, string> = {
  CUTTING: "Cutting",
  STITCHING: "Stitching",
  TAILORING: "Tailoring",
  EMBROIDERY: "Embroidery",
  PACKING: "Packing",
  QUALITY_CHECK: "Quality Check",
  DELIVERY: "Delivery",
  ACCOUNTING: "Accounting",
  OTHER: "Other",
};

const availabilityColorMap: Record<string, string> = {
  available: "green",
  partially_available: "yellow",
  unavailable: "red",
};

export function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [newAvailability, setNewAvailability] = useState("available");

  const { data, isLoading } = useQuery({
    queryKey: ["member", memberId],
    queryFn: () =>
      api.get<{ success: boolean; data: SHGMember }>(
        `/shgs/current/members/${memberId}`
      ),
    enabled: !!memberId,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<SHGMember>) =>
      api.patch(`/shgs/current/members/${memberId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setEditingAvailability(false);
    },
  });

  const member = data?.data;

  if (isLoading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner color="primary.500" size="lg" />
      </Box>
    );
  }

  if (!member) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="gray.500">Member not found.</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack>
        <IconButton
          aria-label="Back"
          icon={<ChevronLeft size={20} />}
          variant="ghost"
          onClick={() => navigate("/leader/members")}
        />
        <Box flex={1}>
          <Heading size="lg">{member.member_name}</Heading>
          <Text color="gray.500">Member profile</Text>
        </Box>
      </HStack>

      {/* Profile card */}
      <Card borderRadius="card">
        <CardBody p={6}>
          <HStack spacing={4} mb={4}>
            <Avatar
              size="lg"
              name={member.member_name}
              bg="primary.100"
              color="primary.700"
            />
            <VStack align="start" spacing={1}>
              <Text fontWeight="700" fontSize="xl">
                {member.member_name}
              </Text>
              {member.phone_number && (
                <HStack spacing={2} color="gray.500">
                  <Phone size={14} />
                  <Text fontSize="sm">{member.phone_number}</Text>
                </HStack>
              )}
              <HStack>
                <Badge
                  colorScheme={availabilityColorMap[member.availability_status] ?? "gray"}
                  borderRadius="full"
                  px={2}
                >
                  {member.availability_status.replace("_", " ")}
                </Badge>
                {!member.is_active && (
                  <Badge colorScheme="red" borderRadius="full" px={2}>
                    Inactive
                  </Badge>
                )}
              </HStack>
            </VStack>
          </HStack>

          {/* Availability editor */}
          {editingAvailability ? (
            <HStack mt={2} spacing={3}>
              <Select
                value={newAvailability}
                onChange={(e) => setNewAvailability(e.target.value)}
                borderRadius="input"
                size="sm"
                w="200px"
              >
                <option value="available">Available</option>
                <option value="partially_available">Partially available</option>
                <option value="unavailable">Unavailable</option>
              </Select>
              <Button
                size="sm"
                isLoading={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    availability_status: newAvailability as SHGMember["availability_status"],
                  })
                }
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingAvailability(false)}
              >
                Cancel
              </Button>
            </HStack>
          ) : (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Edit size={14} />}
              onClick={() => {
                setNewAvailability(member.availability_status);
                setEditingAvailability(true);
              }}
              mt={2}
            >
              Edit availability
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Capacity stats */}
      <Card borderRadius="card">
        <CardBody p={6}>
          <Heading size="sm" mb={4}>
            Work capacity
          </Heading>
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel>Daily capacity</StatLabel>
              <StatNumber>{member.daily_capacity}</StatNumber>
              <Text fontSize="xs" color="gray.500">
                pieces per day
              </Text>
            </Stat>
            <Stat>
              <StatLabel>Weekly capacity</StatLabel>
              <StatNumber>{member.weekly_capacity}</StatNumber>
              <Text fontSize="xs" color="gray.500">
                pieces per week
              </Text>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Performance stats */}
      <Card borderRadius="card">
        <CardBody p={6}>
          <Heading size="sm" mb={4}>
            Performance history
          </Heading>
          <SimpleGrid columns={3} spacing={4}>
            <Stat>
              <StatLabel>Acceptance rate</StatLabel>
              <StatNumber color="success.500">
                {member.past_acceptance_rate ?? 0}%
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel>On-time rate</StatLabel>
              <StatNumber color="primary.500">
                {member.past_on_time_rate ?? 0}%
              </StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Rework rate</StatLabel>
              <StatNumber color="warning.500">
                {member.past_rework_rate ?? 0}%
              </StatNumber>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Skills */}
      {member.skills && member.skills.length > 0 && (
        <Card borderRadius="card">
          <CardBody p={6}>
            <Heading size="sm" mb={4}>
              Skills
            </Heading>
            <VStack align="stretch" spacing={2}>
              {member.skills.map((skill) => (
                <HStack key={skill.id} justify="space-between" p={2} bg="gray.50" borderRadius="btn">
                  <Text fontSize="sm" fontWeight="500">
                    {SKILL_LABELS[skill.skill] ?? skill.skill}
                  </Text>
                  <HStack spacing={1}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Box
                        key={i}
                        w={3}
                        h={3}
                        borderRadius="full"
                        bg={i < skill.proficiency ? "primary.500" : "gray.200"}
                      />
                    ))}
                    <Text fontSize="xs" color="gray.500" ml={1}>
                      {skill.proficiency}/5
                    </Text>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
