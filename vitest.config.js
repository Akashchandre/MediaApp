import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@headless-media/core": fileURLToPath(new URL("./packages/media-core/src/index.ts", import.meta.url)),
      "@headless-media/react": fileURLToPath(new URL("./packages/media-react/src/index.js", import.meta.url)),
      "@headless-media/native": fileURLToPath(new URL("./packages/media-native/src/index.js", import.meta.url)),
      "@headless-media/ui-react": fileURLToPath(new URL("./packages/media-ui-react/src/index.js", import.meta.url)),
      "@headless-media/ui-native": fileURLToPath(new URL("./packages/media-ui-native/src/index.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    coverage: { reporter: ["text", "html"] },
  },
});
