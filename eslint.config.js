import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const coreRestricted = ["react", "react-dom", "react-native"];
const uiRestricted = [
  "@headless-media/core",
  "@headless-media/react",
  "@headless-media/native",
];

export default [
  { ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"] },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,jsx,mjs}"],
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    plugins: { import: importPlugin, react, "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",
      "react/react-in-jsx-scope": "off",
      "import/no-unresolved": "off",
    },
  },
  {
    files: ["packages/media-core/**/*.js"],
    rules: { "no-restricted-imports": ["error", { paths: coreRestricted }] },
  },
  {
    files: ["packages/media-ui-react/**/*.{js,jsx}", "packages/media-ui-native/**/*.{js,jsx}"],
    rules: { "no-restricted-imports": ["error", { paths: uiRestricted }] },
  },
  {
    files: ["packages/media-react/src/**/*.js", "packages/media-native/src/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["@headless-media/ui-*", "@headless-media/react", "@headless-media/native", "react-dom", "react-dom/*"],
      }],
    },
  },
  {
    files: ["packages/media-ui-native/src/**/*.js"],
    rules: {
      "no-restricted-globals": ["error", "window", "document", "HTMLElement", "IntersectionObserver", "ResizeObserver"],
      "no-restricted-imports": ["error", {
        patterns: ["@headless-media/core", "@headless-media/react", "@headless-media/native", "@headless-media/ui-react", "react-dom", "react-dom/*"],
      }],
    },
  },
  {
    files: ["apps/web/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: ["@headless-media/core", "@headless-media/native", "@headless-media/ui-native"] },
      ],
    },
  },
];
