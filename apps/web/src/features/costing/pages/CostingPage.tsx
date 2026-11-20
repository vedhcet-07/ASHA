import { useParams } from "react-router-dom";
import {
  Box, Heading, VStack, HStack, Text, Card, CardBody,
  Spinner, Button, Alert, AlertIcon, Divider, Table,
  Tbody, Tr, Td, Select, NumberInput, NumberInputField,
  Input, FormControl, FormLabel, IconButton, Badge, SimpleGrid,
} from "@chakra-ui/react";
import { Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../../lib/api";

const COMPONENT_TYPES = ["MATERIAL", "LABOUR", "PACKAGING", "TRANSPORT", "UTILITIES", "OTHER_OVERHEAD"] as const;
const BASIS_OPTIONS = ["PER_UNIT", "PER_BATCH", "PER_HOUR", "PERCENTAGE", "FIXED"] as const;

interface Component {
  component_type: typeof COMPONENT_TYPES[number];
  label: string;
  calculation_basis: typeof BASIS_OPTIONS[number];
  rate: number;
  quantity: number;
}

interface CostSheet {
  id: string;
  quantity: number;
  material_cost: number;
  labour_cost: number;
  overhead_cost: number;
  total_cost: number;
  unit_cost: number;
  margin_type: string;
  margin_value: number;
  selling_price_per_unit: number;
  total_selling_price: number;
  pricing_warning?: string;
  cost_components: Array<{ component_type: string; label: string; amount: number }>;
}

const defaultComponent = (): Component => ({
  component_type: "MATERIAL", label: "", calculation_basis: "PER_UNIT", rate: 0, quantity: 1,
});

export function CostingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [components, setComponents] = useState<Component[]>([
    { component_type: "MATERIAL", label: "Raw material", calculation_basis: "PER_UNIT", rate: 45, quantity: 1 },
    { component_type: "LABOUR", label: "Stitching labour", calculation_basis: "PER_UNIT", rate: 20, quantity: 1 },
    { component_type: "PACKAGING", label: "Packaging", calculation_basis: "PER_UNIT", rate: 5, quantity: 1 },
  ]);
  const [qty, setQty] = useState(100);
  const [marginType, setMarginType] = useState<"PERCENTAGE" | "FIXED_PER_UNIT" | "MANUAL">("PERCENTAGE");
  const [marginValue, setMarginValue] = useState(20);
  const [error, setError] = useState("");

  const { data: sheetData, isLoading } = useQuery({
    queryKey: ["cost-sheet", orderId],
    queryFn: () => api.get<{ success: boolean; data: CostSheet }>(`/orders/${orderId}/cost-sheet`),
    retry: false,
  });

  const calculateMutation = useMutation({
    mutationFn: () => api.post(`/orders/${orderId}/cost-sheet`, {
      quantity: qty, components, margin_type: marginType, margin_value: marginValue,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-sheet", orderId] });
      setError("");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Calculation failed"),
  });

  const sheet: CostSheet | undefined = sheetData?.data;

  function updateComponent(idx: number, field: keyof Component, value: string | number) {
    setComponents(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <Heading size="lg">Costing Sheet</Heading>
        <Text color="gray.500" mt={1}>Enter costs to calculate selling price and markup</Text>
      </Box>

      <Badge colorScheme="yellow" px={3} py={1} borderRadius="btn" fontSize="xs" alignSelf="start">
        All payments and calculations are SIMULATED
      </Badge>

      {error && <Alert status="error" borderRadius="btn"><AlertIcon />{error}</Alert>}

      {/* Warning banner */}
      {sheet?.pricing_warning && (
        <Alert status="warning" borderRadius="card">
          <AlertIcon as={AlertTriangle} />
          <Text fontWeight="600">{sheet.pricing_warning}</Text>
        </Alert>
      )}

      {/* Input form */}
      <Card borderRadius="card">
        <CardBody p={5}>
          <Heading size="sm" mb={4}>Cost inputs</Heading>

          <HStack mb={4} spacing={4} flexWrap="wrap">
            <FormControl maxW="150px">
              <FormLabel fontSize="sm">Total quantity</FormLabel>
              <NumberInput min={1} value={qty} onChange={(_, v) => setQty(isNaN(v) ? 1 : v)}>
                <NumberInputField borderRadius="input" />
              </NumberInput>
            </FormControl>
            <FormControl maxW="200px">
              <FormLabel fontSize="sm">Margin / Markup type</FormLabel>
              <Select borderRadius="input" value={marginType}
                onChange={e => setMarginType(e.target.value as typeof marginType)}>
                <option value="PERCENTAGE">Markup (% on cost)</option>
                <option value="FIXED_PER_UNIT">Fixed per unit (₹)</option>
                <option value="MANUAL">Manual price (₹)</option>
              </Select>
            </FormControl>
            <FormControl maxW="150px">
              <FormLabel fontSize="sm">
                {marginType === "PERCENTAGE" ? "Markup % on cost" : marginType === "FIXED_PER_UNIT" ? "Per unit (₹)" : "Final price (₹)"}
              </FormLabel>
              <NumberInput min={0} value={marginValue} onChange={(_, v) => setMarginValue(isNaN(v) ? 0 : v)}>
                <NumberInputField borderRadius="input" />
              </NumberInput>
            </FormControl>
          </HStack>

          <Divider mb={4} />

          <VStack spacing={3} align="stretch">
            {components.map((comp, idx) => (
              <HStack key={idx} spacing={2} flexWrap="wrap" align="end">
                <FormControl minW="120px" flex={1}>
                  {idx === 0 && <FormLabel fontSize="xs">Type</FormLabel>}
                  <Select size="sm" borderRadius="input" value={comp.component_type}
                    onChange={e => updateComponent(idx, "component_type", e.target.value)}>
                    {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormControl>
                <FormControl minW="120px" flex={2}>
                  {idx === 0 && <FormLabel fontSize="xs">Label</FormLabel>}
                  <Input size="sm" borderRadius="input" placeholder="e.g. Canvas fabric"
                    value={comp.label} onChange={e => updateComponent(idx, "label", e.target.value)} />
                </FormControl>
                <FormControl w="110px">
                  {idx === 0 && <FormLabel fontSize="xs">Basis</FormLabel>}
                  <Select size="sm" borderRadius="input" value={comp.calculation_basis}
                    onChange={e => updateComponent(idx, "calculation_basis", e.target.value)}>
                    {BASIS_OPTIONS.map(b => <option key={b} value={b}>{b.replace("_", " ")}</option>)}
                  </Select>
                </FormControl>
                <FormControl w="90px">
                  {idx === 0 && <FormLabel fontSize="xs">Rate (₹)</FormLabel>}
                  <NumberInput size="sm" min={0} value={comp.rate}
                    onChange={(_, v) => updateComponent(idx, "rate", isNaN(v) ? 0 : v)}>
                    <NumberInputField borderRadius="input" />
                  </NumberInput>
                </FormControl>
                <FormControl w="80px">
                  {idx === 0 && <FormLabel fontSize="xs">Qty</FormLabel>}
                  <NumberInput size="sm" min={0} value={comp.quantity}
                    onChange={(_, v) => updateComponent(idx, "quantity", isNaN(v) ? 0 : v)}>
                    <NumberInputField borderRadius="input" />
                  </NumberInput>
                </FormControl>
                <IconButton aria-label="Remove" icon={<Trash2 size={14} />} size="sm"
                  variant="ghost" colorScheme="red" mt={idx === 0 ? 5 : 0}
                  onClick={() => setComponents(prev => prev.filter((_, i) => i !== idx))} />
              </HStack>
            ))}
          </VStack>

          <HStack mt={4} spacing={3}>
            <Button size="sm" variant="outline" leftIcon={<Plus size={14} />}
              onClick={() => setComponents(prev => [...prev, defaultComponent()])}>
              Add component
            </Button>
            <Button leftIcon={<Calculator size={16} />}
              isLoading={calculateMutation.isPending} loadingText="Calculating..."
              onClick={() => calculateMutation.mutate()}>
              Calculate
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Results */}
      {isLoading ? <Spinner color="primary.500" /> : sheet && (
        <Card borderRadius="card">
          <CardBody p={5}>
            <Heading size="sm" mb={4}>Cost breakdown</Heading>
            <Table size="sm" mb={4}>
              <Tbody>
                {[
                  ["Material cost", sheet.material_cost],
                  ["Labour cost", sheet.labour_cost],
                  ["Overhead cost", sheet.overhead_cost],
                ].map(([label, val]) => (
                  <Tr key={label as string}>
                    <Td color="gray.600">{label}</Td>
                    <Td isNumeric>₹{(val as number).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Td>
                  </Tr>
                ))}
                <Tr borderTop="2px" borderColor="gray.200">
                  <Td fontWeight="700">Total cost</Td>
                  <Td isNumeric fontWeight="700">₹{sheet.total_cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Td>
                </Tr>
                <Tr>
                  <Td color="gray.600">Unit cost</Td>
                  <Td isNumeric>₹{sheet.unit_cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Td>
                </Tr>
              </Tbody>
            </Table>

            <Divider mb={4} />

            <SimpleGrid columns={2} spacing={4}>
              <Card borderRadius="btn" bg="primary.50">
                <CardBody p={4}>
                  <Text fontSize="sm" color="gray.600">Selling price / unit</Text>
                  <Text fontSize="2xl" fontWeight="700" color="primary.600">
                    ₹{sheet.selling_price_per_unit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </CardBody>
              </Card>
              <Card borderRadius="btn" bg="success.50">
                <CardBody p={4}>
                  <Text fontSize="sm" color="gray.600">Total order value</Text>
                  <Text fontSize="2xl" fontWeight="700" color="success.600">
                    ₹{sheet.total_selling_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Text>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Badge colorScheme="yellow" mt={4} px={3} py={1} borderRadius="full" fontSize="xs">
              SIMULATED — not a real payment
            </Badge>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
