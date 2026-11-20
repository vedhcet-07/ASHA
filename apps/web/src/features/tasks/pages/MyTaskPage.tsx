import {
  Box, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Button, Progress, Alert, AlertIcon,
  Textarea, NumberInput, NumberInputField, FormControl, FormLabel,
} from "@chakra-ui/react";
import { Volume2, Camera, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { api } from "../../../lib/api";
import { useAuthStore } from "../../../lib/store";

interface TaskAssignment {
  task_id: string;
  allocated_quantity: number;
  accepted_quantity: number;
  member_response: string;
  tasks: {
    id: string;
    task_name: string;
    status: string;
    due_date?: string;
    completed_quantity: number;
    allocated_quantity: number;
    required_skill?: string;
  };
}

export function MyTaskPage() {
  const { fullName } = useAuthStore();
  const queryClient = useQueryClient();
  const [progressQty, setProgressQty] = useState(0);
  const [note, setNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => api.get<{ success: boolean; data: TaskAssignment[] }>("/member/tasks"),
  });

  const tasks = data?.data ?? [];
  const activeTask = tasks.find(t =>
    !["COMPLETED", "CANCELLED", "REJECTED"].includes(t.tasks?.status ?? "")
  );
  const task = activeTask?.tasks;
  const assignment = activeTask;

  const acceptMutation = useMutation({
    mutationFn: () => api.post(`/member/tasks/${task?.id}/accept`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-tasks"] }); setActionMsg("Task accepted!"); },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/member/tasks/${task?.id}/reject`, { response_reason: rejectReason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-tasks"] }); setShowReject(false); },
  });

  const progressMutation = useMutation({
    mutationFn: () => api.post(`/member/tasks/${task?.id}/progress`, {
      quantity_completed: progressQty, note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      setProgressQty(0); setNote(""); setActionMsg("Progress saved!");
    },
  });

  function speak(text: string) {
    if ("speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "en-IN";
      window.speechSynthesis.speak(utt);
    }
  }

  if (isLoading) return <Box textAlign="center" py={12}><Spinner color="primary.500" size="lg" /></Box>;

  if (!task) {
    return (
      <VStack spacing={6} align="stretch">
        <Box><Text color="gray.500" fontSize="sm">Welcome</Text>
          <Text fontSize="xl" fontWeight="700">{fullName}</Text></Box>
        <Card borderRadius="card" border="2px" borderColor="gray.100">
          <CardBody p={8} textAlign="center">
            <VStack spacing={3}>
              <Box p={4} borderRadius="full" bg="primary.50" display="inline-flex">
                <CheckCircle size={32} color="#0F766E" />
              </Box>
              <Text fontSize="lg" fontWeight="600" color="gray.700">No task right now</Text>
              <Text color="gray.400" fontSize="sm">Your leader will assign a task soon.</Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  const completed = task.completed_quantity ?? 0;
  const allocated = assignment?.allocated_quantity ?? task.allocated_quantity;
  const progress = allocated > 0 ? Math.min((completed / allocated) * 100, 100) : 0;
  const isPending = assignment?.member_response === "PENDING";
  const isAccepted = assignment?.member_response === "ACCEPTED";

  const voiceText = `You have ${task.task_name}. Complete ${allocated} units by ${task.due_date ?? "the deadline"}. You have done ${completed} so far.`;

  return (
    <VStack spacing={5} align="stretch">
      {actionMsg && (
        <Alert status="success" borderRadius="btn">
          <AlertIcon />{actionMsg}
        </Alert>
      )}

      {/* Task card */}
      <Card borderRadius="card" bg="primary.500" color="white">
        <CardBody p={5}>
          <HStack justify="space-between" mb={3}>
            <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={2}>
              {task.status}
            </Badge>
            {task.due_date && (
              <Text fontSize="sm" opacity={0.9}>Due {task.due_date}</Text>
            )}
          </HStack>
          <Text fontSize="xl" fontWeight="700" mb={1}>{task.task_name}</Text>
          <HStack spacing={4} my={2}>
            <Text fontSize="md" fontWeight="600">Assigned: {allocated} units</Text>
            <Text fontSize="md" opacity={0.9}>Completed: {completed} units</Text>
          </HStack>
          {task.required_skill && (
            <Text fontSize="sm" opacity={0.85}>Skill: {task.required_skill}</Text>
          )}
          <Button mt={4} size="sm" bg="whiteAlpha.300" color="white"
            leftIcon={<Volume2 size={16} />}
            _hover={{ bg: "whiteAlpha.400" }}
            onClick={() => speak(voiceText)}>
            Listen to task
          </Button>
        </CardBody>
      </Card>

      {/* Progress */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="600">Progress</Text>
            <Text fontWeight="700" color="primary.600">{completed} / {allocated}</Text>
          </HStack>
          <Progress value={progress} colorScheme="primary" borderRadius="full" size="lg" />
          <Text fontSize="sm" color="gray.500" mt={1}>{progress.toFixed(0)}% complete</Text>
        </CardBody>
      </Card>

      {/* Accept / Reject */}
      {isPending && (
        <Card borderRadius="card" border="2px" borderColor="primary.200">
          <CardBody p={5}>
            <Text fontWeight="600" mb={3}>New task — do you accept?</Text>
            <Button leftIcon={<Volume2 size={16} />} variant="ghost" size="sm" mb={4}
              onClick={() => speak(voiceText)}>Listen</Button>
            <VStack spacing={3}>
              <Button w="full" size="lg" leftIcon={<CheckCircle size={18} />}
                isLoading={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}>
                Accept task
              </Button>
              <Button w="full" size="lg" variant="outline" colorScheme="red"
                leftIcon={<XCircle size={18} />}
                onClick={() => setShowReject(true)}>
                Cannot do this task
              </Button>
            </VStack>
            {showReject && (
              <VStack mt={4} spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="sm">Reason</FormLabel>
                  <Textarea borderRadius="input" rows={2} placeholder="e.g. Not available this week"
                    value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                </FormControl>
                <Button colorScheme="red" size="sm" isDisabled={!rejectReason.trim()}
                  isLoading={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate()}>
                  Confirm rejection
                </Button>
              </VStack>
            )}
          </CardBody>
        </Card>
      )}

      {/* Update progress */}
      {isAccepted && (
        <Card borderRadius="card">
          <CardBody p={5}>
            <Text fontWeight="600" mb={4}>Update progress</Text>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">Units completed this update</FormLabel>
                <NumberInput min={0} value={progressQty} onChange={(_, v) => setProgressQty(isNaN(v) ? 0 : v)}>
                  <NumberInputField borderRadius="input" />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Note (optional)</FormLabel>
                <Textarea borderRadius="input" rows={2} placeholder="Any notes..."
                  value={note} onChange={e => setNote(e.target.value)} />
              </FormControl>
              <Button isLoading={progressMutation.isPending}
                isDisabled={progressQty <= 0}
                onClick={() => progressMutation.mutate()}>
                Save progress
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Photo proof */}
      {isAccepted && (
        <Card borderRadius="card">
          <CardBody p={5}>
            <HStack justify="space-between" mb={3}>
              <Text fontWeight="600">Photo proof</Text>
              <Badge colorScheme="yellow" borderRadius="full" fontSize="xs">Required for quality review</Badge>
            </HStack>
            {uploadStatus === "success" && (
              <Alert status="success" borderRadius="btn" mb={3} fontSize="sm">
                <AlertIcon /> Photo proof uploaded successfully! Awaiting QC review.
              </Alert>
            )}
            {uploadStatus === "error" && (
              <Alert status="error" borderRadius="btn" mb={3} fontSize="sm">
                <AlertIcon />
                <Box flex={1}>
                  <Text>{uploadError || "Photo upload failed."}</Text>
                </Box>
                <Button size="xs" colorScheme="red" variant="outline" onClick={() => fileRef.current?.click()}>
                  Retry upload
                </Button>
              </Alert>
            )}
            <input type="file" accept="image/*" capture="environment"
              ref={fileRef} style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !task?.id) return;
                setUploadStatus("uploading");
                setUploadError("");
                try {
                  const urlRes = await api.post<{ success: boolean; data: { media_id: string; upload_url: string; storage_path: string } }>(
                    `/member/tasks/${task.id}/proof/upload-url`,
                    { media_type: "PHOTO", file_name: file.name, mime_type: file.type, file_size_bytes: file.size }
                  );
                  const { upload_url, media_id } = urlRes.data;
                  await fetch(upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
                  await api.post(`/member/tasks/${task.id}/proof/${media_id}/complete`, {});
                  queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
                  setUploadStatus("success");
                  setActionMsg("Photo uploaded successfully!");
                } catch (err) {
                  setUploadStatus("error");
                  setUploadError(err instanceof Error ? err.message : "Photo upload failed. Please try again.");
                }
              }}
            />
            <Button w="full" size="lg" leftIcon={<Camera size={18} />} variant="outline"
              isLoading={uploadStatus === "uploading"} loadingText="Uploading photo..."
              onClick={() => fileRef.current?.click()}>
              {uploadStatus === "success" ? "Upload another photo" : "Take / upload photo"}
            </Button>
          </CardBody>
        </Card>
      )}

      <Badge colorScheme="yellow" px={3} py={1} borderRadius="full" fontSize="xs" textAlign="center">
        All payments are SIMULATED
      </Badge>
    </VStack>
  );
}
