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
  {
    label: "corepack",
    command: process.platform === "win32" ? "cmd.exe" : "corepack",
    args: process.platform === "win32" ? ["/d", "/s", "/c", "corepack --version"] : ["--version"]
  },
  { label: "git", command: "git", args: ["--version"] },
  { label: "docker", command: "docker", args: ["--version"] },
  { label: "uv", command: "uv", args: ["--version"] }
];

async function resolvePnpmVersion() {
  const direct = await commandResult(process.platform === "win32" ? "cmd.exe" : "pnpm", process.platform === "win32" ? ["/d", "/s", "/c", "pnpm --version"] : ["--version"]);
  if (direct.code === 0) {
    return { ...direct, source: "pnpm" };
  }

  const viaCorepack = await commandResult(
    process.platform === "win32" ? "cmd.exe" : "corepack",
    process.platform === "win32" ? ["/d", "/s", "/c", "corepack pnpm --version"] : ["pnpm", "--version"]
  );
  if (viaCorepack.code === 0) {
    return { ...viaCorepack, source: "corepack pnpm" };
  }

  return { ...direct, source: "pnpm" };
}

async function resolvePythonVersion() {
  const direct = await commandResult("python", ["--version"]);
  if (direct.code === 0) {
    return direct;
  }

  const uvManaged = await commandResult("uv", ["run", "--python", expectedPython, "python", "--version"]);
  if (uvManaged.code === 0) {
    return uvManaged;
  }

  return direct;
}

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

const pythonResult = await resolvePythonVersion();
const pythonOutput = `${pythonResult.stdout}${pythonResult.stderr}`.trim();
if (pythonResult.code !== 0) {
  failed = true;
  console.error("python: missing");
} else if (!pythonOutput.includes(expectedPython)) {
  failed = true;
  console.error(`python: expected output to include ${expectedPython}, got ${pythonOutput}`);
} else {
  console.log(`python: ${pythonOutput}`);
}

const pnpmResult = await resolvePnpmVersion();
const pnpmOutput = `${pnpmResult.stdout}${pnpmResult.stderr}`.trim();
if (pnpmResult.code !== 0) {
  failed = true;
  console.error("pnpm: missing");
} else if (pnpmOutput !== expectedPnpm) {
  failed = true;
  console.error(`pnpm: expected ${expectedPnpm}, got ${pnpmOutput}`);
} else {
  console.log(`pnpm: ${pnpmOutput} (${pnpmResult.source})`);
}

if (failed) {
  process.exit(1);
}
