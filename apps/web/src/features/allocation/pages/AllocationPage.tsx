import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Card, CardBody,
  Spinner, Button, Alert, AlertIcon, Table, Thead, Tbody, Tr, Th, Td,
  Progress, Select, NumberInput, NumberInputField, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, useDisclosure, SimpleGrid,
} from "@chakra-ui/react";
import { CheckCircle, ChevronLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

interface AllocationLine {
  member_id: string;
  member_name: string;
  allocated_quantity: number;
  score: number;
  scores: { skill: number; capacity: number; availability: number; workload: number; quality: number };
  reasons: string[];
}

interface ProposalResponse {
  task_id: string;
  total_quantity: number;
  required_skill?: string;
  allocations: AllocationLine[];
  warnings: string[];
  unallocated: number;
}

interface Task {
  id: string;
  task_name: string;
  required_skill?: string;
  allocated_quantity: number;
  status: string;
}

export function AllocationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [editedAllocations, setEditedAllocations] = useState<AllocationLine[]>([]);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<{ memberId: string; name: string } | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [error, setError] = useState("");

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", orderId],
    queryFn: () => api.get<{ success: boolean; data: Task[] }>(`/orders/${orderId}/tasks`),
  });

  const tasks = tasksData?.data ?? [];

  const proposeMutation = useMutation({
    mutationFn: (taskId: string) => api.post<{ success: boolean; data: ProposalResponse }>(
      `/orders/${orderId}/allocation/propose`,
      { task_id: taskId, strategy: "FAIR_BALANCED" }
    ),
    onSuccess: (res) => {
      setProposal(res.data);
      setEditedAllocations(res.data.allocations);
      setError("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to propose allocation"),
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/allocation/confirm`, {
      task_id: selectedTaskId,
      allocations: editedAllocations.map(a => ({
        member_id: a.member_id,
        allocated_quantity: a.allocated_quantity,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", orderId] });
      navigate(`/leader/orders/${orderId}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to confirm allocation"),
  });

  const adjustMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${orderId}/allocation/adjust`, {
      task_id: selectedTaskId,
      member_id: adjustTarget?.memberId,
      new_quantity: adjustQty,
      reason: adjustReason,
    }),
    onSuccess: () => {
      setEditedAllocations(prev =>
        prev.map(a => a.member_id === adjustTarget?.memberId ? { ...a, allocated_quantity: adjustQty } : a)
      );
      onClose();
      setAdjustReason("");
    },
  });

  const totalAllocated = editedAllocations.reduce((s, a) => s + a.allocated_quantity, 0);
  const taskTotal = proposal?.total_quantity ?? 0;

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Button variant="ghost" leftIcon={<ChevronLeft size={16} />}
          onClick={() => navigate(`/leader/orders/${orderId}`)}>
          Back to order
        </Button>
      </HStack>

      <Box>
        <Heading size="lg">Work Allocation</Heading>
        <Text color="gray.500" mt={1}>
          ASHA proposes a fair split — you adjust and confirm.
        </Text>
      </Box>

      {error && <Alert status="error" borderRadius="btn"><AlertIcon />{error}</Alert>}

      {/* Task selector */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={3}>Select a task to allocate</Heading>
          {loadingTasks ? <Spinner color="primary.500" /> : tasks.length === 0 ? (
            <VStack spacing={3}>
              <Text color="gray.500" fontSize="sm">
                No tasks found. Generate and confirm a production plan first.
              </Text>
              <Button size="sm" onClick={() => navigate(`/leader/orders/${orderId}/plan`)}>
                Go to plan
              </Button>
            </VStack>
          ) : (
            <HStack spacing={3}>
              <Select borderRadius="input" placeholder="Choose task..."
                value={selectedTaskId}
                onChange={(e) => { setSelectedTaskId(e.target.value); setProposal(null); }}>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.task_name} ({t.allocated_quantity} units)
                  </option>
                ))}
              </Select>
              <Button
                isDisabled={!selectedTaskId}
                isLoading={proposeMutation.isPending}
                loadingText="Calculating..."
                onClick={() => proposeMutation.mutate(selectedTaskId)}>
                Propose
              </Button>
            </HStack>
          )}
        </CardBody>
      </Card>

      {/* Proposal */}
      {proposal && (
        <VStack spacing={4} align="stretch">
          {proposal.warnings.map((w, i) => (
            <Alert key={i} status="warning" borderRadius="btn">
              <AlertIcon />{w}
            </Alert>
          ))}

          <Alert status="info" borderRadius="btn">
            <AlertIcon />
            This is a proposed allocation. Click any row to adjust quantity. A reason is required.
          </Alert>

          {/* Summary */}
          <SimpleGrid columns={3} spacing={4}>
            {[
              ["Total quantity", taskTotal],
              ["Allocated", totalAllocated],
              ["Unallocated", taskTotal - totalAllocated],
            ].map(([label, val]) => (
              <Card key={label as string} borderRadius="card">
                <CardBody p={4} textAlign="center">
                  <Text fontSize="2xl" fontWeight="700"
                    color={(label === "Unallocated" && Number(val) > 0) ? "warning.500" : "gray.800"}>
                    {val}
                  </Text>
                  <Text fontSize="xs" color="gray.500">{label}</Text>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>

          {/* Allocation table */}
          <Card borderRadius="card">
            <CardBody p={5}>
              <Heading size="sm" mb={4}>Member allocation</Heading>
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Member</Th>
                      <Th isNumeric>Score</Th>
                      <Th isNumeric>Quantity</Th>
                      <Th>Reasons</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {editedAllocations.map((a) => (
                      <Tr key={a.member_id}>
                        <Td fontWeight="600">{a.member_name}</Td>
                        <Td isNumeric>
                          <HStack justify="flex-end" spacing={2}>
                            <Progress value={a.score * 100} size="xs" colorScheme="primary" w="60px" borderRadius="full" />
                            <Text fontSize="xs">{(a.score * 100).toFixed(0)}%</Text>
                          </HStack>
                        </Td>
                        <Td isNumeric fontWeight="700">{a.allocated_quantity}</Td>
                        <Td>
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>
                            {a.reasons.join(" · ")}
                          </Text>
                        </Td>
                        <Td>
                          <Button size="xs" variant="outline"
                            onClick={() => {
                              setAdjustTarget({ memberId: a.member_id, name: a.member_name });
                              setAdjustQty(a.allocated_quantity);
                              setAdjustReason("");
                              onOpen();
                            }}>
                            Edit
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </CardBody>
          </Card>

          <HStack justify="flex-end" spacing={3}>
            <Button variant="outline" onClick={() => proposeMutation.mutate(selectedTaskId)}>
              Re-propose
            </Button>
            <Button leftIcon={<CheckCircle size={16} />}
              isLoading={confirmMutation.isPending} loadingText="Confirming..."
              isDisabled={totalAllocated === 0}
              onClick={() => confirmMutation.mutate()}>
              Confirm allocation
            </Button>
          </HStack>
        </VStack>
      )}

      {/* Adjust modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="card" mx={4}>
          <ModalHeader>Adjust — {adjustTarget?.name}</ModalHeader>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>New quantity</Text>
                <NumberInput min={0} max={taskTotal} value={adjustQty}
                  onChange={(_, v) => setAdjustQty(isNaN(v) ? 0 : v)}>
                  <NumberInputField borderRadius="input" />
                </NumberInput>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>Reason (required)</Text>
                <Textarea borderRadius="input" rows={3} placeholder="e.g. Member requested fewer units"
                  value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button isDisabled={!adjustReason.trim()}
              isLoading={adjustMutation.isPending}
              onClick={() => adjustMutation.mutate()}>
              Save change
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
