import {
  Center,
  Icon,
  Text,
  VStack,
  type CenterProps,
} from "@chakra-ui/react";
import React from "react";

export interface EmptyStateProps extends CenterProps {
  /** Short headline shown in the empty state */
  title: string;
  /** Longer description of what the user can do */
  description?: string;
  /** Optional icon element (e.g. a Chakra UI icon or any SVG) */
  icon?: React.ElementType;
  /** Optional CTA slot — pass a Button or link */
  action?: React.ReactNode;
}

/**
 * ASHA design-system empty state.
 * Shown when a list or view has no content to display.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  minH = "240px",
  ...rest
}) => {
  return (
    <Center minH={minH} {...rest}>
      <VStack gap={4} textAlign="center" maxW="sm" px={4}>
        {icon !== undefined && (
          <Icon as={icon} boxSize={12} color="gray.300" />
        )}
        <VStack gap={1}>
          <Text fontWeight="semibold" fontSize="md" color="gray.700">
            {title}
          </Text>
          {description !== undefined && description !== "" && (
            <Text fontSize="sm" color="gray.500">
              {description}
            </Text>
          )}
        </VStack>
        {action !== undefined && action}
      </VStack>
    </Center>
  );
};
