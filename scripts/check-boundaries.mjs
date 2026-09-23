import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const checks = [
  {
    folder: "packages/media-react/src",
    forbidden: ["@headless-media/native", "@headless-media/ui-react", "@headless-media/ui-native", "react-dom", "react-native"],
  },
  {
    folder: "packages/media-native/src",
    forbidden: ["@headless-media/react", "@headless-media/ui-react", "@headless-media/ui-native", "react-dom"],
  },
  {
    folder: "packages/media-core/src",
    forbidden: ["react", "react-dom", "react-native"],
  },
  {
    folder: "packages/media-ui-react/src",
    forbidden: ["@headless-media/core", "@headless-media/react", "@headless-media/native"],
  },
  {
    folder: "packages/media-ui-native/src",
    forbidden: ["@headless-media/core", "@headless-media/react", "@headless-media/native", "@headless-media/ui-react", "react-dom"],
  },
  {
    folder: "apps/web/src",
    forbidden: ["@headless-media/core", "@headless-media/native", "@headless-media/ui-native"],
  },
];

async function sourceFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(folder, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : [path];
    }),
  );
  return files.flat().filter((file) => [".js", ".jsx", ".ts", ".tsx"].includes(extname(file)));
}

const failures = [];
for (const check of checks) {
  for (const file of await sourceFiles(join(root, check.folder))) {
    const source = await readFile(file, "utf8");
    for (const dependency of check.forbidden) {
      const pattern = new RegExp(`(?:from\\s+|import\\s*\\()(["'])${dependency.replace("/", "\\/")}\\1`);
      if (pattern.test(source)) failures.push(`${relative(root, file)} imports forbidden ${dependency}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Dependency boundaries are valid.");
}
