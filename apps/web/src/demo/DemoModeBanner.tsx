// apps/web/src/demo/DemoModeBanner.tsx
import React from 'react';
import { Box, Select, Button, Text } from '@chakra-ui/react';
import { useDemo } from './DemoProvider';
import { Role } from './demoMock';

export const DemoModeBanner = () => {
  const { state, setRole, resetDemo } = useDemo();
  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as Role;
    await setRole(role);
  };
  return (
    <Box bg="yellow.100" p={2} display="flex" alignItems="center" justifyContent="space-between">
      <Text fontWeight="bold">Demo Mode – Current role: {state.role}</Text>
      <Select width="150px" value={state.role} onChange={handleRoleChange}>
        <option value="buyer">Buyer</option>
        <option value="leader">Leader</option>
        <option value="member">Member</option>
        <option value="checker">Checker</option>
        <option value="approver">Approver</option>
      </Select>
      <Button size="sm" onClick={resetDemo}>Reset Demo</Button>
    </Box>
  );
};

