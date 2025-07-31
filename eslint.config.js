import globals from "globals";
import tseslint from "typescript-eslint";
import pluginJs from "@eslint/js";

export default [
  {
    ignores: ["dist/**"]
  },
  {
    languageOptions: {
      globals: globals.node
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Add any specific rules or overrides here
      // Example: 'indent': ['error', 2],
      // 'linebreak-style': ['error', 'unix'],
      // 'quotes': ['error', 'single'],
      // 'semi': ['error', 'always'],
    }
  }
];
