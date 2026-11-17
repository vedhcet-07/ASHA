import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, Alert, AlertIcon, Table, Thead, Tbody, Tr, Th, Td,
  SimpleGrid,
} from "@chakra-ui/react";
import { CheckCircle, ChevronLeft, Send, Volume2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

interface PayoutLine {
  id: string;
  shg_member_id: string;
  allocated_quantity: number;
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
  payout_approvals: Array<{ action: string; note: string; created_at: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray", SUBMITTED: "blue", APPROVED: "green",
  REJECTED: "red", CHANGES_REQUESTED: "orange",
};

export function PayoutSheetPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payout", orderId],
    queryFn: () => api.get<{ success: boolean; data: PayoutSheet }>(`/orders/${orderId}/payout`),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/payout/submit`, { payout_sheet_id: sheet?.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payout", orderId] }); setError(""); },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to submit"),
  });

  function speak(text: string) {
    if ("speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-IN";
      window.speechSynthesis.speak(utt);
    }
  }

  const sheet = data?.data;

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;

  if (!sheet) return (
    <VStack spacing={4} align="stretch">
      <Button variant="ghost" leftIcon={<ChevronLeft size={16} />} alignSelf="start"
        onClick={() => navigate(`/leader/orders/${orderId}`)}>Back</Button>
      <Alert status="info" borderRadius="card">
        <AlertIcon />No payout sheet yet. Calculate payout first.
      </Alert>
    </VStack>
  );

  const totalLines = sheet.payout_lines?.length ?? 0;
  const voiceText = `Total payout for this order is ₹${sheet.total_payable_amount.toLocaleString("en-IN")}. ${totalLines} members are included. Status is ${sheet.status}. All payments are simulated.`;

  return (
    <VStack spacing={6} align="stretch">
      <HStack>
        <Button variant="ghost" leftIcon={<ChevronLeft size={16} />}
          onClick={() => navigate(`/leader/orders/${orderId}`)}>Back</Button>
      </HStack>

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Payout Sheet</Heading>
          <Text color="gray.500" mt={1}>v{sheet.version} · {totalLines} members</Text>
        </Box>
        <HStack spacing={2}>
          <Badge colorScheme={STATUS_COLORS[sheet.status] ?? "gray"} px={3} py={1}
            borderRadius="full" fontSize="sm">{sheet.status}</Badge>
          <Button size="sm" leftIcon={<Volume2 size={14} />} variant="ghost"
            onClick={() => speak(voiceText)}>Listen</Button>
        </HStack>
      </HStack>

      {error && <Alert status="error" borderRadius="btn"><AlertIcon />{error}</Alert>}

      {/* Previous approval actions */}
      {(sheet.payout_approvals?.length ?? 0) > 0 && (
        <Alert status={sheet.status === "CHANGES_REQUESTED" ? "warning" : "info"} borderRadius="card">
          <AlertIcon />
          <Box>
            <Text fontWeight="600">{sheet.payout_approvals[0].action.replace("_", " ")}</Text>
            {sheet.payout_approvals[0].note && (
              <Text fontSize="sm" mt={1}>{sheet.payout_approvals[0].note}</Text>
            )}
          </Box>
        </Alert>
      )}

      {/* Summary */}
      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
        {[
          ["Total payable", `₹${sheet.total_payable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`],
          ["Accepted units", sheet.total_accepted_quantity],
          ["Members", totalLines],
        ].map(([label, val]) => (
          <Card key={label as string} borderRadius="card">
            <CardBody p={4} textAlign="center">
              <Text fontSize="xl" fontWeight="700" color="primary.600">{val}</Text>
              <Text fontSize="xs" color="gray.500">{label}</Text>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Payout lines table */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Member breakdown</Heading>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Member</Th>
                  <Th isNumeric>Allocated</Th>
                  <Th isNumeric>Accepted</Th>
                  <Th isNumeric>Rework</Th>
                  <Th isNumeric>Rejected</Th>
                  <Th isNumeric>Rate (₹)</Th>
                  <Th isNumeric>Payout (₹)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(sheet.payout_lines ?? []).map((line) => (
                  <Tr key={line.id}>
                    <Td fontWeight="600">{line.shg_members?.member_name ?? "—"}</Td>
                    <Td isNumeric>{line.allocated_quantity}</Td>
                    <Td isNumeric color="success.600" fontWeight="600">{line.accepted_quantity}</Td>
                    <Td isNumeric color="warning.500">{line.rework_quantity}</Td>
                    <Td isNumeric color="danger.500">{line.rejected_quantity}</Td>
                    <Td isNumeric>₹{Number(line.rate).toFixed(2)}</Td>
                    <Td isNumeric fontWeight="700" color="primary.600">
                      ₹{Number(line.payable_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Td>
                  </Tr>
                ))}
                <Tr borderTop="2px" borderColor="gray.200">
                  <Td colSpan={6} fontWeight="700">Total</Td>
                  <Td isNumeric fontWeight="700" fontSize="md" color="primary.600">
                    ₹{sheet.total_payable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      <Badge colorScheme="yellow" px={3} py={1} borderRadius="full" fontSize="xs" alignSelf="center">
        SIMULATED — not real payments
      </Badge>

      {/* Submit for approval */}
      {sheet.status === "DRAFT" && (
        <Card borderRadius="card" border="2px" borderColor="primary.200">
          <CardBody p={5}>
            <Heading size="sm" mb={3}>Submit for group approval</Heading>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Once submitted, the approver will review and explicitly approve the payout.
            </Text>
            <Button leftIcon={<Send size={16} />} w="full" size="lg"
              isLoading={submitMutation.isPending} loadingText="Submitting..."
              onClick={() => submitMutation.mutate()}>
              Submit for approval
            </Button>
          </CardBody>
        </Card>
      )}

      {sheet.status === "SUBMITTED" && (
        <Alert status="info" borderRadius="card" p={4}>
          <AlertIcon />
          <Text>Payout submitted. Waiting for approver to review.</Text>
        </Alert>
      )}

      {sheet.status === "APPROVED" && (
        <Alert status="success" borderRadius="card" p={4}>
          <AlertIcon as={CheckCircle} />
          <Text fontWeight="600">Payout approved! Order is now COMPLETED.</Text>
        </Alert>
      )}
    </VStack>
  );
}
