import {
  Box,
  type BoxProps,
} from "@chakra-ui/react";
import React from "react";

export interface CardProps extends BoxProps {
  /** Whether to show a subtle shadow */
  elevated?: boolean;
}

/**
 * ASHA design-system card — a padded, rounded box.
 * Use `elevated` for a stronger visual lift.
 */
export const Card: React.FC<CardProps> = ({
  elevated = false,
  children,
  ...rest
}) => {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      boxShadow={elevated ? "md" : "sm"}
      {...rest}
    >
      {children}
    </Box>
  );
};
