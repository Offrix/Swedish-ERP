import process from "node:process";
import { createApiPlatform } from "../apps/api/src/platform.mjs";
import { isMainModule } from "./lib/repo.mjs";

export function printUsage(output = process.stdout) {
  output.write(`Usage: node scripts/runtime-honesty-scan.mjs [options]

Options:
  --mode <runtime-mode>                         Runtime mode to evaluate.
  --surface <surface-code>                     Startup surface label. Default: api
  --active-store-kind <kind>                   Runtime store kind override.
  --critical-domain-state-store-kind <kind>    Critical domain state store override.
  --bootstrap-mode <mode>                      Bootstrap mode override.
  --bootstrap-scenario-code <code>             Bootstrap scenario override.
  --seed-demo                                  Force demo seeding for the scan.
  --expect-finding <code>                      Require a finding code to be present. Repeatable.
  --expect-category <code>                     Require a finding category to be present. Repeatable.
  --require-startup-blocked                    Require startupAllowed=false.
  --require-startup-allowed                    Require startupAllowed=true.
  --require-blocking                           Require at least one blocking finding.
  --json                                       Print JSON payload instead of summary lines.
  --help                                       Show this help text.
`);
}

export function parseArgs(argv) {
  const parsed = {
    mode: null,
    surface: "api",
    activeStoreKind: null,
    criticalDomainStateStoreKind: null,
    bootstrapMode: null,
    bootstrapScenarioCode: null,
    seedDemo: false,
    expectedFindings: [],
    expectedCategories: [],
    requireStartupBlocked: false,
    requireStartupAllowed: false,
    requireBlocking: false,
    json: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case "--mode":
        parsed.mode = argv[index + 1] || null;
        index += 1;
        break;
      case "--surface":
        parsed.surface = argv[index + 1] || "api";
        index += 1;
        break;
      case "--active-store-kind":
        parsed.activeStoreKind = argv[index + 1] || null;
        index += 1;
        break;
      case "--critical-domain-state-store-kind":
        parsed.criticalDomainStateStoreKind = argv[index + 1] || null;
        index += 1;
        break;
      case "--bootstrap-mode":
        parsed.bootstrapMode = argv[index + 1] || null;
        index += 1;
        break;
      case "--bootstrap-scenario-code":
        parsed.bootstrapScenarioCode = argv[index + 1] || null;
        index += 1;
        break;
      case "--expect-finding":
        parsed.expectedFindings.push(argv[index + 1] || "");
        index += 1;
        break;
      case "--expect-category":
        parsed.expectedCategories.push(argv[index + 1] || "");
        index += 1;
        break;
      case "--seed-demo":
        parsed.seedDemo = true;
        break;
      case "--require-startup-blocked":
        parsed.requireStartupBlocked = true;
        break;
      case "--require-startup-allowed":
        parsed.requireStartupAllowed = true;
        break;
      case "--require-blocking":
        parsed.requireBlocking = true;
        break;
      case "--json":
        parsed.json = true;
        break;
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return parsed;
}

export function validateExpectations({
  diagnostics,
  expectedFindings,
  expectedCategories,
  requireStartupBlocked,
  requireStartupAllowed,
  requireBlocking
}) {
  const findingCodes = new Set(diagnostics.findings.map((finding) => finding.findingCode));
  const categoryCodes = new Set(diagnostics.findings.map((finding) => finding.categoryCode));
  const failures = [];

  for (const expectedFinding of expectedFindings.filter(Boolean)) {
    if (!findingCodes.has(expectedFinding)) {
      failures.push(`Missing expected finding: ${expectedFinding}`);
    }
  }

  for (const expectedCategory of expectedCategories.filter(Boolean)) {
    if (!categoryCodes.has(expectedCategory)) {
      failures.push(`Missing expected category: ${expectedCategory}`);
    }
  }

  if (requireStartupBlocked && diagnostics.startupAllowed !== false) {
    failures.push("Startup was expected to be blocked, but diagnostics.startupAllowed was true.");
  }

  if (requireStartupAllowed && diagnostics.startupAllowed !== true) {
    failures.push("Startup was expected to be allowed, but diagnostics.startupAllowed was false.");
  }

  if (requireBlocking && diagnostics.summary.blockingCount < 1) {
    failures.push("Expected at least one blocking finding, but none were present.");
  }

  return failures;
}

export function buildOutput({ args, diagnostics, failures }) {
  return {
    runtimeMode: diagnostics.runtimeModeProfile.environmentMode,
    startupSurface: diagnostics.startupSurface,
    startupAllowed: diagnostics.startupAllowed,
    summary: diagnostics.summary,
    bootstrapMode: diagnostics.bootstrapMode,
    bootstrapScenarioCode: diagnostics.bootstrapScenarioCode,
    activeStoreKind: diagnostics.activeStoreKind,
    criticalDomainStoreKind: diagnostics.criticalDomainStoreKind,
    expectedFindings: args.expectedFindings,
    expectedCategories: args.expectedCategories,
    failures,
    findings: diagnostics.findings
  };
}

export async function runRuntimeHonestyScan({
  argv = process.argv.slice(2),
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    printUsage(stdout);
    return { exitCode: 0, output: null, failures: [] };
  }
  if (!args.mode) {
    throw new Error("Missing required argument: --mode");
  }
  if (args.requireStartupBlocked && args.requireStartupAllowed) {
    throw new Error("Cannot require both startup blocked and startup allowed.");
  }

  const platform = createApiPlatform({
    env: { ...env, ERP_RUNTIME_MODE: args.mode },
    runtimeMode: args.mode,
    enforceExplicitRuntimeMode: true,
    criticalDomainStateStoreKind: args.criticalDomainStateStoreKind || undefined,
    bootstrapMode: args.bootstrapMode || undefined,
    bootstrapScenarioCode:
      args.bootstrapScenarioCode === null ? undefined : args.bootstrapScenarioCode,
    seedDemo: args.seedDemo === true
  });

  try {
    const diagnostics = platform.scanRuntimeInvariants({
      startupSurface: args.surface,
      bootstrapMode: args.bootstrapMode || undefined,
      bootstrapScenarioCode:
        args.bootstrapScenarioCode === null ? undefined : args.bootstrapScenarioCode,
      seedDemo: args.seedDemo === true,
      activeStoreKind: args.activeStoreKind || undefined,
      criticalDomainStoreKind: args.criticalDomainStateStoreKind || undefined
    });
    const failures = validateExpectations({
      diagnostics,
      expectedFindings: args.expectedFindings,
      expectedCategories: args.expectedCategories,
      requireStartupBlocked: args.requireStartupBlocked,
      requireStartupAllowed: args.requireStartupAllowed,
      requireBlocking: args.requireBlocking
    });
    const output = buildOutput({ args, diagnostics, failures });

    if (args.json) {
      stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      stdout.write(
        [
          `runtimeMode=${output.runtimeMode}`,
          `startupSurface=${output.startupSurface}`,
          `startupAllowed=${String(output.startupAllowed)}`,
          `activeStoreKind=${output.activeStoreKind}`,
          `criticalDomainStoreKind=${output.criticalDomainStoreKind}`,
          `findings=${output.summary.totalCount}`,
          `blocking=${output.summary.blockingCount}`,
          `warnings=${output.summary.warningCount}`
        ].join(" ")
      );
      stdout.write("\n");
      for (const finding of output.findings) {
        stdout.write(
          `- ${finding.findingCode} [${finding.severityCode}] ${finding.summary}\n`
        );
      }
      if (failures.length > 0) {
        stdout.write(`validationFailures=${failures.length}\n`);
      }
    }

    if (failures.length > 0) {
      for (const failure of failures) {
        stderr.write(`${failure}\n`);
      }
      return { exitCode: 1, output, failures };
    }
    return { exitCode: 0, output, failures };
  } finally {
    if (typeof platform.closeCriticalDomainStateStore === "function") {
      platform.closeCriticalDomainStateStore();
    }
  }
}

if (isMainModule(import.meta.url)) {
  const result = await runRuntimeHonestyScan();
  process.exitCode = result.exitCode;
}
