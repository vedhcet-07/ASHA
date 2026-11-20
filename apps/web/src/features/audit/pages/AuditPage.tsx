import React, { useEffect, useState } from 'react';
import { Box, Heading, List, ListItem, Text } from '@chakra-ui/react';
import { demoApi } from '../../demo/demoMock';

export const AuditPage = () => {
  const [audit, setAudit] = useState<string[]>([]);

  useEffect(() => {
    demoApi.getAuditTrail().then(setAudit);
  }, []);

  return (
    <Box p={4}>
      <Heading size="lg" mb={4}>Audit Trail</Heading>
      {audit.length === 0 ? (
        <Text>No audit events recorded.</Text>
      ) : (
        <List spacing={2}>
          {audit.map((entry, idx) => (
            <ListItem key={idx}>🕒 {entry}</ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

