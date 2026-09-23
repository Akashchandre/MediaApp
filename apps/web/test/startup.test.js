import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { transformWithEsbuild } from "vite";
import webConfig from "../vite.config.js";

// Exercise the web compiler configuration, not Vitest's separate JSX defaults.
it.each(["main.jsx", "App.jsx"])("compiles %s without an undefined React global", async (filename) => {
  const source = await readFile(new URL("../src/" + filename, import.meta.url), "utf8");
  const { code } = await transformWithEsbuild(source, filename, webConfig.esbuild);
  expect(code).toContain('from "react/jsx-runtime"');
  expect(code).not.toContain("React.createElement");
});
