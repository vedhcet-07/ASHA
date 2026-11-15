import {
  Box,
  Flex,
  Heading,
  Text,
  type BoxProps,
} from "@chakra-ui/react";
import React from "react";

export interface PageHeaderProps extends BoxProps {
  /** Primary page title */
  title: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Optional slot for action buttons or breadcrumbs */
  actions?: React.ReactNode;
}

/**
 * ASHA design-system page header.
 * Renders a title, optional subtitle, and an actions slot on the right.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  ...rest
}) => {
  return (
    <Box
      as="header"
      pb={4}
      mb={4}
      borderBottom="1px solid"
      borderColor="gray.200"
      {...rest}
    >
      <Flex align="center" justify="space-between" gap={4} flexWrap="wrap">
        <Box>
          <Heading as="h1" size="lg" fontWeight="bold" color="gray.800">
            {title}
          </Heading>
          {subtitle !== undefined && subtitle !== "" && (
            <Text mt={1} fontSize="sm" color="gray.500">
              {subtitle}
            </Text>
          )}
        </Box>
        {actions !== undefined && (
          <Flex gap={2} align="center" flexShrink={0}>
            {actions}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};
