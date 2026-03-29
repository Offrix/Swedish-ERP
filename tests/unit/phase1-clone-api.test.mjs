import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  cloneSnapshotValue,
  cloneValue,
  deserializeSnapshotValue,
  serializeSnapshotValue
} from "../../packages/domain-core/src/clone.mjs";

const REPO_ROOT = "C:\\Users\\snobb\\Desktop\\Swedish ERP";
const APPS_ROOT = path.join(REPO_ROOT, "apps");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");
const ALLOWED_STRUCTURED_CLONE_FILES = new Set([
  path.join(REPO_ROOT, "packages", "domain-core", "src", "clone.mjs")
]);

test("cloneValue preserves runtime-native structures", () => {
  const source = {
    recordedAt: new Date("2026-03-29T10:00:00Z"),
    optional: undefined,
    index: new Map([["a", { count: 1 }]]),
    labels: new Set(["x", "y"]),
    binary: Uint8Array.from([1, 2, 3])
  };

  const cloned = cloneValue(source);
  assert.notEqual(cloned, source);
  assert.ok(cloned.recordedAt instanceof Date);
  assert.equal(cloned.recordedAt.toISOString(), "2026-03-29T10:00:00.000Z");
  assert.ok(cloned.index instanceof Map);
  assert.deepEqual([...cloned.index.entries()], [["a", { count: 1 }]]);
  assert.ok(cloned.labels instanceof Set);
  assert.deepEqual([...cloned.labels.values()], ["x", "y"]);
  assert.ok(cloned.binary instanceof Uint8Array);
  assert.deepEqual([...cloned.binary.values()], [1, 2, 3]);
  assert.equal(Object.prototype.hasOwnProperty.call(cloned, "optional"), true);
  assert.equal(cloned.optional, undefined);
});

test("snapshot clone serializes and restores dates, maps, sets, undefined and binary", () => {
  const snapshot = {
    createdAt: new Date("2026-03-29T11:15:00Z"),
    metadata: new Map([["key", new Set(["a", "b"])]]),
    optional: undefined,
    binary: Uint8Array.from([10, 20, 30])
  };

  const serialized = serializeSnapshotValue(snapshot);
  const restored = deserializeSnapshotValue(serialized);
  const cloned = cloneSnapshotValue(snapshot);

  assert.equal(serialized.createdAt.__type, "Date");
  assert.equal(serialized.optional.__type, "Undefined");
  assert.equal(serialized.metadata.__type, "Map");
  assert.equal(serialized.binary.__type, "TypedArray");

  assert.ok(restored.createdAt instanceof Date);
  assert.equal(restored.createdAt.toISOString(), "2026-03-29T11:15:00.000Z");
  assert.ok(restored.metadata instanceof Map);
  assert.ok(restored.metadata.get("key") instanceof Set);
  assert.deepEqual([...restored.metadata.get("key").values()], ["a", "b"]);
  assert.equal(restored.optional, undefined);
  assert.ok(restored.binary instanceof Uint8Array);
  assert.deepEqual([...restored.binary.values()], [10, 20, 30]);

  assert.deepEqual(
    {
      createdAt: cloned.createdAt.toISOString(),
      metadata: [...cloned.metadata.get("key").values()],
      optional: cloned.optional,
      binary: [...cloned.binary.values()]
    },
    {
      createdAt: "2026-03-29T11:15:00.000Z",
      metadata: ["a", "b"],
      optional: undefined,
      binary: [10, 20, 30]
    }
  );
});

test("apps and packages do not use raw clone heuristics outside the clone kernel", () => {
  const violations = [];
  for (const root of [APPS_ROOT, PACKAGES_ROOT]) {
    walkFiles(root, (filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("JSON.parse(JSON.stringify")) {
        violations.push(`${filePath}:JSON.parse(JSON.stringify)`);
      }
      if (content.includes("structuredClone(") && !ALLOWED_STRUCTURED_CLONE_FILES.has(filePath)) {
        violations.push(`${filePath}:structuredClone`);
      }
      if (/\bfunction copy\(value\)/.test(content) || /\bfunction clone\(value\)/.test(content) || /\bexport function copy\(value\)/.test(content) || /\bexport function clone\(value\)/.test(content)) {
        violations.push(`${filePath}:local_clone_helper`);
      }
    });
  }

  assert.deepEqual(violations, []);
});

function walkFiles(rootPath, visit) {
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, visit);
      continue;
    }
    if (entry.isFile() && /\.(mjs|js|ts)$/.test(entry.name)) {
      visit(fullPath);
    }
  }
}
