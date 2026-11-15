import {
  Badge as ChakraBadge,
  type BadgeProps as ChakraBadgeProps,
} from "@chakra-ui/react";
import React from "react";

/** Pre-defined semantic status variants */
export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "simulated";

const VARIANT_COLOR_MAP: Record<BadgeVariant, string> = {
  success: "green",
  warning: "orange",
  error: "red",
  info: "blue",
  neutral: "gray",
  simulated: "purple",
};

export interface BadgeProps extends Omit<ChakraBadgeProps, "colorScheme"> {
  /** Semantic variant that maps to a Chakra color scheme */
  status?: BadgeVariant;
}

/**
 * ASHA design-system badge.
 * Pass `status` for a semantic color; fall back to Chakra's `colorScheme`
 * via the spread if you need a custom color.
 */
export const Badge: React.FC<BadgeProps> = ({
  status = "neutral",
  children,
  ...rest
}) => {
  return (
    <ChakraBadge
      colorScheme={VARIANT_COLOR_MAP[status]}
      borderRadius="full"
      px={2}
      py={0.5}
      fontSize="xs"
      fontWeight="semibold"
      textTransform="uppercase"
      letterSpacing="wide"
      {...rest}
    >
      {children}
    </ChakraBadge>
  );
};
