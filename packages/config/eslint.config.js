// @ts-check
/**
 * Shared ESLint flat config for all ASHA packages and apps.
 *
 * Usage in an app/package:
 *   // eslint.config.js
 *   import ashaConfig from "@asha/config/eslint";
 *   export default [...ashaConfig];
 */

import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/** @type {import("eslint").Linter.FlatConfig[]} */
const ashaConfig = [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // React hooks
      ...reactHooks.configs.recommended.rules,

      // React refresh (dev-only HMR safety)
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // General best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.turbo/**"],
  },
];

export default ashaConfig;
