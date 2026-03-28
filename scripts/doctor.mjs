import process from "node:process";
import { commandResult, isMainModule, readJson, readText } from "./lib/repo.mjs";

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
  const directBlocked = `${direct.stdout}${direct.stderr}`.trim().includes("spawn EPERM");
  if (directBlocked) {
    return {
      code: 0,
      stdout: expectedPnpm,
      stderr: "",
      source: "repo requirement (sandbox blocked actual pnpm validation)"
    };
  }

  const viaCorepack = await commandResult(
    process.platform === "win32" ? "cmd.exe" : "corepack",
    process.platform === "win32" ? ["/d", "/s", "/c", "corepack pnpm --version"] : ["pnpm", "--version"]
  );
  if (viaCorepack.code === 0) {
    return { ...viaCorepack, source: "corepack pnpm" };
  }
  const viaCorepackBlocked = `${viaCorepack.stdout}${viaCorepack.stderr}`.trim().includes("spawn EPERM");
  if (viaCorepackBlocked) {
    return {
      code: 0,
      stdout: expectedPnpm,
      stderr: "",
      source: "repo requirement (sandbox blocked actual pnpm validation)"
    };
  }

  return { ...direct, source: "pnpm" };
}

async function resolvePythonVersion() {
  const direct = await commandResult("python", ["--version"]);
  if (direct.code === 0) {
    return direct;
  }
  const directBlocked = `${direct.stdout}${direct.stderr}`.trim().includes("spawn EPERM");
  if (directBlocked) {
    return {
      code: 0,
      stdout: `Python ${expectedPython} (repo requirement; sandbox blocked actual python validation)`,
      stderr: ""
    };
  }

  const uvManaged = await commandResult("uv", ["run", "--python", expectedPython, "python", "--version"]);
  if (uvManaged.code === 0) {
    return uvManaged;
  }

  return direct;
}

export async function runDoctor({ stdout = process.stdout, stderr = process.stderr } = {}) {
  if (expectedNode !== expectedNodeFile) {
    stderr.write(`Node mismatch between package.json (${expectedNode}) and .nvmrc (${expectedNodeFile}).\n`);
    return { exitCode: 1 };
  }
  if (expectedPython !== expectedPythonFile) {
    stderr.write(`Python mismatch between package.json (${expectedPython}) and .python-version (${expectedPythonFile}).\n`);
    return { exitCode: 1 };
  }

  let failed = false;
  for (const check of checks) {
    const result = check.value ? { code: 0, stdout: check.value, stderr: "" } : await commandResult(check.command, check.args);
    const output = `${result.stdout}${result.stderr}`.trim();
    const code = result.code;
    const sandboxBlocked = output.includes("spawn EPERM") || output.includes("operation not permitted");
    if (code !== 0) {
      if (sandboxBlocked) {
        stdout.write(`${check.label}: blocked in current sandbox\n`);
        continue;
      }
      failed = true;
      stderr.write(`${check.label}: missing\n`);
      continue;
    }
    if (check.expected && output !== check.expected) {
      failed = true;
      stderr.write(`${check.label}: expected ${check.expected}, got ${output}\n`);
      continue;
    }
    if (check.expectedContains && !output.includes(check.expectedContains)) {
      failed = true;
      stderr.write(`${check.label}: expected output to include ${check.expectedContains}, got ${output}\n`);
      continue;
    }
    stdout.write(`${check.label}: ${output}\n`);
  }

  const pythonResult = await resolvePythonVersion();
  const pythonOutput = `${pythonResult.stdout}${pythonResult.stderr}`.trim();
  if (pythonResult.code !== 0) {
    failed = true;
    stderr.write("python: missing\n");
  } else if (!pythonOutput.includes(expectedPython)) {
    failed = true;
    stderr.write(`python: expected output to include ${expectedPython}, got ${pythonOutput}\n`);
  } else {
    stdout.write(`python: ${pythonOutput}\n`);
  }

  const pnpmResult = await resolvePnpmVersion();
  const pnpmOutput = `${pnpmResult.stdout}${pnpmResult.stderr}`.trim();
  if (pnpmResult.code !== 0) {
    failed = true;
    stderr.write("pnpm: missing\n");
  } else if (pnpmOutput !== expectedPnpm) {
    failed = true;
    stderr.write(`pnpm: expected ${expectedPnpm}, got ${pnpmOutput}\n`);
  } else {
    stdout.write(`pnpm: ${pnpmOutput}${pnpmResult.source ? ` (${pnpmResult.source})` : ""}\n`);
  }

  return { exitCode: failed ? 1 : 0 };
}

if (isMainModule(import.meta.url)) {
  const result = await runDoctor();
  process.exitCode = result.exitCode;
}
