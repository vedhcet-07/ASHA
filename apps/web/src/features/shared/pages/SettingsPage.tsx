import {
  Box,
  Heading,
  VStack,
  Text,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Select,
  Switch,
  HStack,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useAuthStore } from "../../../lib/store";

export function SettingsPage() {
  const { language, setLanguage, shgName } = useAuthStore();
  const toast = useToast();

  function handleSave() {
    toast({
      title: "Settings saved",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }

  return (
    <VStack spacing={6} align="stretch" maxW="600px">
      <Box>
        <Heading size="lg" color="gray.900">
          Settings
        </Heading>
        <Text color="gray.500" fontSize="sm" mt={1}>
          Manage your group and app preferences
        </Text>
      </Box>

      <Card borderRadius="card" shadow="sm">
        <CardBody p={6}>
          <VStack spacing={5} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600">SHG Group</FormLabel>
              <Text fontSize="md" fontWeight="500" color="gray.700">
                {shgName || "No SHG assigned"}
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600">Interface Language</FormLabel>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                borderRadius="input"
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </Select>
            </FormControl>

            <HStack justify="space-between" py={2}>
              <Box>
                <Text fontSize="sm" fontWeight="600">Voice Explanations</Text>
                <Text fontSize="xs" color="gray.500">Read tasks and payouts aloud using TTS</Text>
              </Box>
              <Switch defaultChecked colorScheme="primary" />
            </HStack>

            <HStack justify="space-between" py={2}>
              <Box>
                <Text fontSize="sm" fontWeight="600">High-Contrast Mode</Text>
                <Text fontSize="xs" color="gray.500">Enhanced contrast for low-light environments</Text>
              </Box>
              <Switch colorScheme="primary" />
            </HStack>

            <Button colorScheme="primary" mt={2} onClick={handleSave}>
              Save preferences
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
}

