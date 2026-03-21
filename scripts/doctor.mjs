import process from "node:process";
import { commandResult, readJson, readText } from "./lib/repo.mjs";

const packageJson = await readJson("package.json");
const expectedNode = packageJson.config.runtimeVersions.node;
const expectedPnpm = packageJson.config.runtimeVersions.pnpm;
const expectedPython = packageJson.config.runtimeVersions.python;
const expectedNodeFile = (await readText(".nvmrc")).trim();
const expectedPythonFile = (await readText(".python-version")).trim();

const checks = [
  { label: "node", value: `v${expectedNode}`, expected: `v${expectedNode}` },
  { label: "corepack", command: "corepack", args: ["--version"] },
  { label: "git", command: "git", args: ["--version"] },
  { label: "docker", command: "docker", args: ["--version"] },
  { label: "python", command: "python", args: ["--version"], expectedContains: expectedPython },
  { label: "uv", command: "uv", args: ["--version"] }
];

if (expectedNode !== expectedNodeFile) {
  console.error(`Node mismatch between package.json (${expectedNode}) and .nvmrc (${expectedNodeFile}).`);
  process.exit(1);
}
if (expectedPython !== expectedPythonFile) {
  console.error(`Python mismatch between package.json (${expectedPython}) and .python-version (${expectedPythonFile}).`);
  process.exit(1);
}

let failed = false;
for (const check of checks) {
  const result = check.value ? { code: 0, stdout: check.value, stderr: "" } : await commandResult(check.command, check.args);
  const output = `${result.stdout}${result.stderr}`.trim();
  const code = result.code;
  const sandboxBlocked = output.includes("spawn EPERM") || output.includes("operation not permitted");
  if (code !== 0) {
    failed = true;
    console.error(`${check.label}: ${sandboxBlocked ? "blocked in current sandbox" : "missing"}`);
    continue;
  }
  if (check.expected && output !== check.expected) {
    failed = true;
    console.error(`${check.label}: expected ${check.expected}, got ${output}`);
    continue;
  }
  if (check.expectedContains && !output.includes(check.expectedContains)) {
    failed = true;
    console.error(`${check.label}: expected output to include ${check.expectedContains}, got ${output}`);
    continue;
  }
  console.log(`${check.label}: ${output}`);
}

if (failed) {
  process.exit(1);
}

console.log(`pnpm target version: ${expectedPnpm}`);
