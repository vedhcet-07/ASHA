import {
  Box, VStack, HStack, Text, Card, CardBody,
  Spinner, Badge, Divider,
} from "@chakra-ui/react";
import { Volume2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@chakra-ui/react";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

interface EarningsData {
  member_name: string;
  total_approved_earnings: number;
  total_pending_earnings: number;
  lines: Array<{
    payable_amount: number;
    accepted_quantity: number;
    payout_sheets: { status: string };
  }>;
  note: string;
}

export function MyEarningsPage() {
  const { fullName } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["my-earnings"],
    queryFn: () => api.get<{ success: boolean; data: EarningsData }>("/member/earnings"),
  });

  const earnings = data?.data;

  function speak() {
    if (!earnings) return;
    const text = `Your approved earnings are ₹${earnings.total_approved_earnings.toLocaleString("en-IN")}. Your pending earnings are ₹${earnings.total_pending_earnings.toLocaleString("en-IN")}. All payments are simulated.`;
    if ("speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-IN";
      window.speechSynthesis.speak(utt);
    }
  }

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;

  return (
    <VStack spacing={5} align="stretch">
      <Box>
        <Text color="gray.500" fontSize="sm">Earnings summary</Text>
        <Text fontSize="xl" fontWeight="700">{fullName}</Text>
      </Box>

      <Button leftIcon={<Volume2 size={16} />} variant="ghost" size="sm"
        alignSelf="start" onClick={speak}>
        Listen to earnings
      </Button>

      {/* Approved earnings */}
      <Card borderRadius="card" bg="success.50" border="2px" borderColor="success.200">
        <CardBody p={5} textAlign="center">
          <Text fontSize="sm" color="gray.600" mb={1}>Approved earnings</Text>
          <Text fontSize="3xl" fontWeight="800" color="success.600">
            ₹{(earnings?.total_approved_earnings ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>Payout approved by group</Text>
        </CardBody>
      </Card>

      {/* Pending earnings */}
      <Card borderRadius="card" bg="warning.50" border="2px" borderColor="warning.200">
        <CardBody p={5} textAlign="center">
          <Text fontSize="sm" color="gray.600" mb={1}>Pending earnings</Text>
          <Text fontSize="2xl" fontWeight="700" color="warning.600">
            ₹{(earnings?.total_pending_earnings ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>Awaiting approval</Text>
        </CardBody>
      </Card>

      <Divider />

      <Badge colorScheme="yellow" px={3} py={1} borderRadius="full"
        fontSize="xs" textAlign="center">
        SIMULATED — not real payments
      </Badge>

      {earnings?.lines && earnings.lines.length > 0 && (
        <Card borderRadius="card">
          <CardBody p={5}>
            <Text fontWeight="600" mb={3}>Payment history</Text>
            <VStack align="stretch" spacing={2}>
              {earnings.lines.map((line, idx) => (
                <HStack key={idx} justify="space-between" p={2} bg="gray.50" borderRadius="btn">
                  <HStack>
                    <Text fontSize="sm">{line.accepted_quantity} units accepted</Text>
                    <Badge colorScheme={line.payout_sheets?.status === "APPROVED" ? "green" : "yellow"}
                      fontSize="xs" borderRadius="full">
                      {line.payout_sheets?.status ?? "PENDING"}
                    </Badge>
                  </HStack>
                  <Text fontWeight="700" fontSize="sm">
                    ₹{Number(line.payable_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
