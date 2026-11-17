import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, Alert, AlertIcon, Divider,
} from "@chakra-ui/react";
import { CheckCircle, ChevronLeft, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

interface PlanDraft {
  id: string;
  status: "PENDING" | "VALID" | "INVALID" | "REVIEWED" | "DISCARDED";
  output?: {
    summary: string;
    total_days: number;
    stages: Array<{
      stage_name: string;
      stage_order: number;
      requires_skill?: string;
      planned_days: number;
      is_quality_checkpoint: boolean;
      description?: string;
    }>;
    notes?: string;
  };
  validation_errors?: Array<{ error: string }>;
}

export function PlanReviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [genError, setGenError] = useState("");

  // Generate plan
  const generateMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; data: { draft_id: string } }>(
      `/orders/${orderId}/plan/generate`
    ),
    onSuccess: (res) => setDraftId(res.data.draft_id),
    onError: (err) => setGenError(err instanceof Error ? err.message : "Failed to generate plan"),
  });

  // Poll draft status
  const { data: draftData } = useQuery({
    queryKey: ["plan-draft", draftId],
    queryFn: () => api.get<{ success: boolean; data: PlanDraft }>(
      `/orders/${orderId}/plan/drafts/${draftId}`
    ),
    enabled: !!draftId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "PENDING" ? 2000 : false;
    },
  });

  // Confirm plan
  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/plan/confirm`, { plan_id: draftId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      navigate(`/leader/orders/${orderId}/allocation`);
    },
    onError: (err) => setGenError(err instanceof Error ? err.message : "Failed to confirm plan"),
  });

  const draft = draftData?.data;

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Button variant="ghost" leftIcon={<ChevronLeft size={16} />}
          onClick={() => navigate(`/leader/orders/${orderId}`)}>
          Back to order
        </Button>
      </HStack>

      <Box>
        <Heading size="lg">Production Plan</Heading>
        <Text color="gray.500" mt={1}>
          ASHA drafts a plan — you review and confirm it.
        </Text>
      </Box>

      {genError && <Alert status="error" borderRadius="btn"><AlertIcon />{genError}</Alert>}

      {!draftId && (
        <Card borderRadius="card">
          <CardBody p={8} textAlign="center">
            <VStack spacing={4}>
              <Box p={4} borderRadius="full" bg="primary.50" display="inline-flex">
                <Zap size={32} color="#0F766E" />
              </Box>
              <Text fontWeight="600" fontSize="lg">Generate a production plan</Text>
              <Text color="gray.500" fontSize="sm" maxW="360px">
                ASHA will draft stages, timeline, and skill requirements for this order.
                You review every detail before confirming.
              </Text>
              <Badge colorScheme="yellow" px={3} py={1} borderRadius="full" fontSize="xs">
                AI proposes · You approve
              </Badge>
              <Button size="lg" leftIcon={<Zap size={16} />}
                isLoading={generateMutation.isPending} loadingText="Generating..."
                onClick={() => generateMutation.mutate()}>
                Generate plan
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}

      {draftId && draft?.status === "PENDING" && (
        <Card borderRadius="card">
          <CardBody p={8} textAlign="center">
            <Spinner color="primary.500" size="lg" mb={4} />
            <Text fontWeight="600">Generating your production plan…</Text>
            <Text color="gray.500" fontSize="sm" mt={1}>This usually takes 5–10 seconds</Text>
          </CardBody>
        </Card>
      )}

      {draft?.status === "INVALID" && (
        <Alert status="error" borderRadius="card" p={5}>
          <AlertIcon />
          <Box>
            <Text fontWeight="600">Plan generation failed</Text>
            <Text fontSize="sm" mt={1}>{draft.validation_errors?.[0]?.error ?? "Unknown error"}</Text>
            <Button size="sm" mt={3} onClick={() => { setDraftId(null); setGenError(""); }}>
              Try again
            </Button>
          </Box>
        </Alert>
      )}

      {draft?.status === "VALID" && draft.output && (
        <VStack spacing={4} align="stretch">
          <Alert status="info" borderRadius="btn">
            <AlertIcon />
            This is an AI draft. Review every stage carefully before confirming.
          </Alert>

          <Card borderRadius="card">
            <CardBody p={5}>
              <HStack justify="space-between" mb={3}>
                <Heading size="sm">Plan summary</Heading>
                <Badge colorScheme="blue" borderRadius="full">{draft.output.total_days} days</Badge>
              </HStack>
              <Text color="gray.700">{draft.output.summary}</Text>
              {draft.output.notes && (
                <Text color="gray.500" fontSize="sm" mt={2}>{draft.output.notes}</Text>
              )}
            </CardBody>
          </Card>

          <Card borderRadius="card">
            <CardBody p={5}>
              <Heading size="sm" mb={4}>Production stages</Heading>
              <VStack align="stretch" spacing={3}>
                {draft.output.stages.map((stage) => (
                  <HStack key={stage.stage_order} p={3} bg="gray.50"
                    borderRadius="btn" justify="space-between" align="start">
                    <HStack spacing={3} align="start">
                      <Box w={6} h={6} borderRadius="full" bg="primary.500"
                        display="flex" alignItems="center" justifyContent="center"
                        flexShrink={0} mt="1px">
                        <Text fontSize="xs" color="white" fontWeight="700">
                          {stage.stage_order}
                        </Text>
                      </Box>
                      <VStack align="start" spacing={0.5}>
                        <HStack>
                          <Text fontWeight="600" fontSize="sm">{stage.stage_name}</Text>
                          {stage.is_quality_checkpoint && (
                            <Badge colorScheme="green" fontSize="xs" borderRadius="full">
                              QC checkpoint
                            </Badge>
                          )}
                        </HStack>
                        {stage.requires_skill && (
                          <Text fontSize="xs" color="primary.600">
                            Requires: {stage.requires_skill}
                          </Text>
                        )}
                        {stage.description && (
                          <Text fontSize="xs" color="gray.500">{stage.description}</Text>
                        )}
                      </VStack>
                    </HStack>
                    <Badge colorScheme="gray" borderRadius="full" flexShrink={0}>
                      {stage.planned_days}d
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </Card>

          <Divider />

          <HStack spacing={3} justify="flex-end">
            <Button variant="outline" onClick={() => { setDraftId(null); setGenError(""); }}>
              Regenerate
            </Button>
            <Button leftIcon={<CheckCircle size={16} />}
              isLoading={confirmMutation.isPending} loadingText="Confirming..."
              onClick={() => confirmMutation.mutate()}>
              Confirm this plan
            </Button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
