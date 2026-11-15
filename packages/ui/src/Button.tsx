import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps,
} from "@chakra-ui/react";
import React from "react";

export interface ButtonProps extends ChakraButtonProps {
  /** Visual emphasis level */
  variant?: "solid" | "outline" | "ghost" | "link";
}

/**
 * ASHA design-system button built on top of Chakra UI Button.
 * Defaults to the brand `teal` color scheme.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ colorScheme = "teal", variant = "solid", children, ...rest }, ref) => {
    return (
      <ChakraButton
        ref={ref}
        colorScheme={colorScheme}
        variant={variant}
        {...rest}
      >
        {children}
      </ChakraButton>
    );
  }
);

Button.displayName = "Button";
