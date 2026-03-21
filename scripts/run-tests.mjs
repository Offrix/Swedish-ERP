import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { repoPath } from "./lib/repo.mjs";

const category = process.argv[2] || "all";
const categoryRoots = {
  all: "tests",
  unit: "tests/unit",
  integration: "tests/integration",
  golden: "tests/golden",
  e2e: "tests/e2e"
};

const root = categoryRoots[category];
if (!root) {
  console.error(`Unknown test category: ${category}`);
  process.exit(1);
}

async function collect(currentPath, results) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await collect(nextPath, results);
      continue;
    }
    if (entry.name.endsWith(".test.mjs")) {
      results.push(nextPath);
    }
  }
}

const files = [];
await collect(repoPath(root), files);

if (files.length === 0) {
  console.log(`No tests found for ${category}`);
  process.exit(0);
}

for (const file of files) {
  const moduleUrl = pathToFileURL(file).href;
  await import(moduleUrl);
}
