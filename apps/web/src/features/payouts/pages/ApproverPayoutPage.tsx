import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, Alert, AlertIcon, Table, Thead, Tbody, Tr, Th, Td,
  Textarea, FormControl, FormLabel, SimpleGrid,
} from "@chakra-ui/react";
import { CheckCircle, MessageSquare, ChevronLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

interface PayoutLine {
  id: string;
  accepted_quantity: number;
  rework_quantity: number;
  rejected_quantity: number;
  rate: number;
  payable_amount: number;
  explanation: string;
  shg_members: { member_name: string };
}

interface PayoutSheet {
  id: string;
  version: number;
  status: string;
  total_payable_amount: number;
  total_accepted_quantity: number;
  payout_lines: PayoutLine[];
}

export function ApproverPayoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payout-approver", orderId],
    queryFn: () => api.get<{ success: boolean; data: PayoutSheet }>(`/orders/${orderId}/payout`),
  });

  const sheet = data?.data;

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/payout/approve`, {
      payout_sheet_id: sheet?.id, note: note || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-approver", orderId] });
      setError("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to approve"),
  });

  const changesMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/payout/request-changes`, {
      payout_sheet_id: sheet?.id, note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-approver", orderId] });
      setNote(""); setError("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to request changes"),
  });

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;
  if (!sheet) return (
    <Box textAlign="center" py={8}><Text color="gray.500">No payout sheet found.</Text></Box>
  );

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
      </HStack>

      <Box>
        <Heading size="lg">Review Payout</Heading>
        <Text color="gray.500" mt={1}>Review the member-wise payout and approve or request changes</Text>
      </Box>

      {error && <Alert status="error" borderRadius="btn"><AlertIcon />{error}</Alert>}

      {sheet.status === "APPROVED" && (
        <Alert status="success" borderRadius="card">
          <AlertIcon as={CheckCircle} />
          <Text fontWeight="600">This payout has been approved.</Text>
        </Alert>
      )}

      {/* Summary */}
      <SimpleGrid columns={2} spacing={4}>
        <Card borderRadius="card" bg="primary.50">
          <CardBody p={4} textAlign="center">
            <Text fontSize="2xl" fontWeight="700" color="primary.600">
              ₹{sheet.total_payable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Text>
            <Text fontSize="xs" color="gray.500">Total payable</Text>
          </CardBody>
        </Card>
        <Card borderRadius="card">
          <CardBody p={4} textAlign="center">
            <Text fontSize="2xl" fontWeight="700">{sheet.payout_lines?.length ?? 0}</Text>
            <Text fontSize="xs" color="gray.500">Members</Text>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Payout lines */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Member-wise payout</Heading>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead><Tr>
                <Th>Member</Th><Th isNumeric>Accepted</Th>
                <Th isNumeric>Rate</Th><Th isNumeric>Payout</Th>
              </Tr></Thead>
              <Tbody>
                {(sheet.payout_lines ?? []).map(line => (
                  <Tr key={line.id}>
                    <Td fontWeight="600">{line.shg_members?.member_name ?? "—"}</Td>
                    <Td isNumeric>{line.accepted_quantity}</Td>
                    <Td isNumeric>₹{Number(line.rate).toFixed(2)}</Td>
                    <Td isNumeric fontWeight="700" color="primary.600">
                      ₹{Number(line.payable_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      <Badge colorScheme="yellow" alignSelf="center" px={3} py={1} borderRadius="full" fontSize="xs">
        SIMULATED — not real payments
      </Badge>

      {/* Approval actions */}
      {sheet.status === "SUBMITTED" && (
        <Card borderRadius="card" border="2px" borderColor="primary.200">
          <CardBody p={5}>
            <Heading size="sm" mb={4}>Your decision</Heading>
            <FormControl mb={4}>
              <FormLabel fontSize="sm">Note (optional for approval, required for changes)</FormLabel>
              <Textarea borderRadius="input" rows={2} placeholder="e.g. Approved in group meeting"
                value={note} onChange={e => setNote(e.target.value)} />
            </FormControl>
            <VStack spacing={3}>
              <Button w="full" size="lg" leftIcon={<CheckCircle size={18} />}
                isLoading={approveMutation.isPending} loadingText="Approving..."
                onClick={() => approveMutation.mutate()}>
                Approve payout
              </Button>
              <Button w="full" variant="outline" colorScheme="orange"
                leftIcon={<MessageSquare size={16} />}
                isDisabled={!note.trim()}
                isLoading={changesMutation.isPending} loadingText="Sending..."
                onClick={() => changesMutation.mutate()}>
                Request changes
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
