import { defineConfig } from "vite";

export default defineConfig({
  // JSX files use named React imports, so compile with the automatic runtime.
  esbuild: { jsx: "automatic" },
});
