import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['components/hr/*PDF.tsx'],
    rules: {
      'jsx-a11y/alt-text': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**",
    "scratch/**",
    "scripts/**",
    "seed.js",
    "test.js",
    "update_schema.js",
    "lib/prisma.js",
    "lib/hr/calculations.js",
  ]),
]);

export default eslintConfig;
