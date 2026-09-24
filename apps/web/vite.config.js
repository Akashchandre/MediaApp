import { defineConfig } from "vite";
import { docsSite } from "../../scripts/docs-site.mjs";

export default defineConfig({
  // JSX files use named React imports, so compile with the automatic runtime.
  esbuild: { jsx: "automatic" },
  plugins: [docsSite()],
});
