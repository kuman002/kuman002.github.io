import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", "public/**", "package-lock.json"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{ts,tsx,astro,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
  },
  {
    files: ["scripts/**/*.{cjs,mjs}", "*.config.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  prettier,
];
