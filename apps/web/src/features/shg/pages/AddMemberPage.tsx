import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  Card,
  CardBody,
  Divider,
  SimpleGrid,
  Badge,
  IconButton,
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { AddMemberSchema, type AddMemberInput } from "@asha/shared-types";

const SKILLS = [
  "CUTTING",
  "STITCHING",
  "TAILORING",
  "EMBROIDERY",
  "PACKING",
  "QUALITY_CHECK",
  "DELIVERY",
  "ACCOUNTING",
  "OTHER",
] as const;

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

interface SkillEntry {
  skill: string;
  proficiency: number;
}

export function AddMemberPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [newSkill, setNewSkill] = useState({ skill: "STITCHING", proficiency: 3 });
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(AddMemberSchema),
    defaultValues: {
      daily_capacity: 20,
      weekly_capacity: 100,
      availability_status: "available",
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: ({ memberId, skill, proficiency }: { memberId: string; skill: string; proficiency: number }) =>
      api.post(`/shgs/current/members/${memberId}/skills`, { skill, proficiency }),
  });

  async function onSubmit(data: AddMemberInput) {
    setApiError("");
    try {
      const response = await api.post<{ success: boolean; data: { id: string } }>(
        "/shgs/current/members",
        data
      );
      const memberId = response.data.id;

      // Add skills
      for (const skillEntry of skills) {
        await addSkillMutation.mutateAsync({
          memberId,
          skill: skillEntry.skill,
          proficiency: skillEntry.proficiency,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["members"] });
      navigate("/leader/members");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  function addSkill() {
    if (skills.some((s) => s.skill === newSkill.skill)) return;
    setSkills([...skills, { ...newSkill }]);
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s.skill !== skill));
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
        <Box>
          <Heading size="lg">Add member</Heading>
          <Text color="gray.500">Add a new member to your SHG</Text>
        </Box>
      </HStack>

      {apiError && (
        <Alert status="error" borderRadius="btn">
          <AlertIcon />
          {apiError}
        </Alert>
      )}

      <Card borderRadius="card">
        <CardBody p={6}>
          <VStack as="form" spacing={5} onSubmit={handleSubmit(onSubmit)} align="stretch">
            {/* Basic info */}
            <Heading size="sm" color="gray.700">
              Basic information
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isInvalid={!!errors.member_name}>
                <FormLabel>Full name</FormLabel>
                <Input
                  placeholder="e.g. Meena Kumari"
                  borderRadius="input"
                  {...register("member_name")}
                />
                <FormErrorMessage>{errors.member_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Phone number (optional)</FormLabel>
                <Input
                  type="tel"
                  placeholder="10-digit number"
                  borderRadius="input"
                  {...register("phone_number")}
                />
              </FormControl>
            </SimpleGrid>

            <Divider />

            {/* Capacity */}
            <Heading size="sm" color="gray.700">
              Work capacity
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <FormControl isInvalid={!!errors.daily_capacity}>
                <FormLabel>Daily capacity (pieces)</FormLabel>
                <Controller
                  name="daily_capacity"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      min={0}
                      value={field.value}
                      onChange={(_, val) => field.onChange(val)}
                    >
                      <NumberInputField borderRadius="input" />
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{errors.daily_capacity?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.weekly_capacity}>
                <FormLabel>Weekly capacity (pieces)</FormLabel>
                <Controller
                  name="weekly_capacity"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      min={0}
                      value={field.value}
                      onChange={(_, val) => field.onChange(val)}
                    >
                      <NumberInputField borderRadius="input" />
                    </NumberInput>
                  )}
                />
              </FormControl>

              <FormControl isInvalid={!!errors.availability_status}>
                <FormLabel>Current availability</FormLabel>
                <Select borderRadius="input" {...register("availability_status")}>
                  <option value="available">Available</option>
                  <option value="partially_available">Partially available</option>
                  <option value="unavailable">Unavailable</option>
                </Select>
              </FormControl>
            </SimpleGrid>

            <Divider />

            {/* Skills */}
            <Heading size="sm" color="gray.700">
              Skills (optional)
            </Heading>

            {/* Add skill */}
            <HStack spacing={3} flexWrap="wrap">
              <Select
                value={newSkill.skill}
                onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value })}
                w="180px"
                borderRadius="input"
                size="sm"
              >
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {SKILL_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Select
                value={newSkill.proficiency}
                onChange={(e) =>
                  setNewSkill({ ...newSkill, proficiency: Number(e.target.value) })
                }
                w="140px"
                borderRadius="input"
                size="sm"
              >
                <option value={1}>1 — Basic</option>
                <option value={2}>2 — Learning</option>
                <option value={3}>3 — Skilled</option>
                <option value={4}>4 — Proficient</option>
                <option value={5}>5 — Expert</option>
              </Select>
              <Button
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={addSkill}
                variant="outline"
              >
                Add skill
              </Button>
            </HStack>

            {/* Skill chips */}
            {skills.length > 0 && (
              <HStack spacing={2} flexWrap="wrap">
                {skills.map((s) => (
                  <Badge
                    key={s.skill}
                    px={3}
                    py={1}
                    borderRadius="full"
                    colorScheme="primary"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    fontSize="sm"
                  >
                    {SKILL_LABELS[s.skill]} ({s.proficiency}/5)
                    <Box
                      as="button"
                      type="button"
                      onClick={() => removeSkill(s.skill)}
                      ml={1}
                      color="primary.700"
                      _hover={{ color: "danger.500" }}
                    >
                      <Trash2 size={12} />
                    </Box>
                  </Badge>
                ))}
              </HStack>
            )}

            <Divider />

            <HStack spacing={3} justify="flex-end">
              <Button
                variant="ghost"
                onClick={() => navigate("/leader/members")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Adding member..."
                px={8}
              >
                Add member
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
