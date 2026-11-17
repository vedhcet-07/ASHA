import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, SimpleGrid, Textarea, FormControl,
  FormLabel, NumberInput, NumberInputField, Alert, AlertIcon,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { CheckCircle, RefreshCw, XCircle, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

interface QueueTask {
  id: string;
  task_name: string;
  status: string;
  completed_quantity: number;
  allocated_quantity: number;
  order_id: string;
  proof_media: Array<{ id: string; storage_path: string; media_type: string }>;
  task_assignments: Array<{ shg_members: { member_name: string } }>;
}

const DECISION_COLORS: Record<string, string> = {
  ACCEPTED: "green", REWORK: "orange", REJECTED: "red",
};

export function QualityQueuePage() {
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTask, setSelectedTask] = useState<QueueTask | null>(null);
  const [decision, setDecision] = useState<"ACCEPTED" | "REWORK" | "REJECTED">("ACCEPTED");
  const [reviewedQty, setReviewedQty] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["quality-queue"],
    queryFn: () => api.get<{ success: boolean; data: QueueTask[] }>("/quality/review-queue"),
  });

  const reviewMutation = useMutation({
    mutationFn: () => api.post(`/quality/tasks/${selectedTask?.id}/review`, {
      decision, reviewed_quantity: reviewedQty, reason: reason || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-queue"] });
      onClose(); setReason(""); setError("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Review failed"),
  });

  const tasks = data?.data ?? [];

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Quality Review</Heading>
          <Text color="gray.500" mt={1}>{tasks.length} tasks awaiting review</Text>
        </Box>
      </HStack>

      {isLoading ? (
        <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>
      ) : tasks.length === 0 ? (
        <Card borderRadius="card"><CardBody p={8} textAlign="center">
          <Box p={4} borderRadius="full" bg="green.50" display="inline-flex" mb={3}>
            <CheckCircle size={32} color="#16A34A" />
          </Box>
          <Text fontSize="lg" fontWeight="600" color="gray.700">All clear</Text>
          <Text color="gray.400" mt={1}>No work waiting for review.</Text>
        </CardBody></Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {tasks.map(task => {
            const memberName = task.task_assignments?.[0]?.shg_members?.member_name ?? "Unknown";
            return (
              <Card key={task.id} borderRadius="card" border="1px" borderColor="gray.100">
                <CardBody p={4}>
                  <HStack justify="space-between" mb={2}>
                    <Badge colorScheme="yellow" borderRadius="full" px={2} fontSize="xs">
                      Awaiting review
                    </Badge>
                    <Text fontSize="xs" color="gray.400">{task.proof_media.length} photos</Text>
                  </HStack>
                  <Text fontWeight="700" fontSize="md" noOfLines={1}>{task.task_name}</Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>By: {memberName}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Completed: {task.completed_quantity} / {task.allocated_quantity}
                  </Text>
                  {task.proof_media.length > 0 && (
                    <HStack mt={3} spacing={2} overflowX="auto">
                      {task.proof_media.slice(0, 3).map((m) => (
                        <Box key={m.id} w="60px" h="60px" borderRadius="btn" bg="gray.100"
                          display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                          <Eye size={20} color="gray" />
                        </Box>
                      ))}
                    </HStack>
                  )}
                  <Button mt={3} w="full" size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setReviewedQty(task.completed_quantity);
                      setDecision("ACCEPTED");
                      setReason("");
                      onOpen();
                    }}>
                    Review this work
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* Review modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent borderRadius="card" mx={4}>
          <ModalHeader>Review: {selectedTask?.task_name}</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {error && <Alert status="error" borderRadius="btn"><AlertIcon />{error}</Alert>}

              <FormControl>
                <FormLabel>Decision</FormLabel>
                <HStack spacing={3}>
                  {(["ACCEPTED", "REWORK", "REJECTED"] as const).map(d => (
                    <Button key={d} size="sm" flex={1}
                      colorScheme={decision === d ? DECISION_COLORS[d] : "gray"}
                      variant={decision === d ? "solid" : "outline"}
                      leftIcon={d === "ACCEPTED" ? <CheckCircle size={14} /> : d === "REWORK" ? <RefreshCw size={14} /> : <XCircle size={14} />}
                      onClick={() => setDecision(d)}>
                      {d}
                    </Button>
                  ))}
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Quantity reviewed</FormLabel>
                <NumberInput min={1} max={selectedTask?.completed_quantity}
                  value={reviewedQty} onChange={(_, v) => setReviewedQty(isNaN(v) ? 1 : v)}>
                  <NumberInputField borderRadius="input" />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Reason {decision !== "ACCEPTED" ? "(required)" : "(optional)"}</FormLabel>
                <Textarea borderRadius="input" rows={2}
                  placeholder={decision === "REWORK" ? "e.g. Stitching uneven on 3 bags" : ""}
                  value={reason} onChange={e => setReason(e.target.value)} />
              </FormControl>

              {decision !== "ACCEPTED" && (
                <Alert status="warning" borderRadius="btn" fontSize="sm">
                  <AlertIcon />
                  {decision === "REWORK"
                    ? "Work will be returned for correction. Not payable until accepted."
                    : "Rejected work is not payable and will not be reworked."}
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              colorScheme={DECISION_COLORS[decision]}
              isDisabled={decision !== "ACCEPTED" && !reason.trim()}
              isLoading={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate()}>
              Confirm {decision.toLowerCase()}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
