import {
  Center,
  Spinner,
  Text,
  VStack,
  type CenterProps,
} from "@chakra-ui/react";
import React from "react";

export interface LoadingStateProps extends CenterProps {
  /** Optional message shown below the spinner */
  message?: string;
  /** Spinner size passed directly to Chakra Spinner */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * ASHA design-system loading state.
 * Renders a centred spinner with an optional descriptive message.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = "lg",
  minH = "200px",
  ...rest
}) => {
  return (
    <Center minH={minH} {...rest}>
      <VStack gap={3}>
        <Spinner
          size={size}
          color="teal.500"
          thickness="3px"
          speed="0.65s"
          emptyColor="gray.200"
        />
        {message !== undefined && message !== "" && (
          <Text fontSize="sm" color="gray.500">
            {message}
          </Text>
        )}
      </VStack>
    </Center>
  );
};
