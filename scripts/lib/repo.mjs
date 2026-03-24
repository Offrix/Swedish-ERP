import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..");

export const requiredApps = [
  "apps/api",
  "apps/desktop-web",
  "apps/field-mobile",
  "apps/worker"
];

export const requiredPackages = [
  "packages/ui-core",
  "packages/ui-desktop",
  "packages/ui-mobile",
  "packages/domain-core",
  "packages/domain-org-auth",
  "packages/domain-documents",
  "packages/domain-ledger",
  "packages/domain-accounting-method",
  "packages/domain-fiscal-year",
  "packages/domain-vat",
  "packages/domain-ar",
  "packages/domain-ap",
  "packages/domain-banking",
  "packages/domain-tax-account",
  "packages/domain-review-center",
  "packages/domain-notifications",
  "packages/domain-activity",
  "packages/domain-hr",
  "packages/domain-time",
  "packages/domain-balances",
  "packages/domain-collective-agreements",
  "packages/domain-payroll",
  "packages/domain-benefits",
  "packages/domain-document-classification",
  "packages/domain-import-cases",
  "packages/domain-travel",
  "packages/domain-pension",
  "packages/domain-hus",
  "packages/domain-projects",
  "packages/domain-field",
  "packages/domain-personalliggare",
  "packages/domain-egenkontroll",
  "packages/domain-reporting",
  "packages/domain-annual-reporting",
  "packages/domain-integrations",
  "packages/auth-core",
  "packages/events",
  "packages/db",
  "packages/rule-engine",
  "packages/document-engine",
  "packages/integration-core",
  "packages/test-fixtures"
];

export const mandatoryDocs = [
  "docs/MASTER_BUILD_PLAN.md",
  "docs/adr/ADR-0001-runtime-versions.md",
  "docs/adr/ADR-0002-surface-strategy.md",
  "docs/adr/ADR-0003-domain-boundaries.md",
  "docs/adr/ADR-0004-ledger-invariants.md",
  "docs/adr/ADR-0005-rule-engine-philosophy.md",
  "docs/adr/ADR-0006-document-archive-philosophy.md",
  "docs/adr/ADR-0007-security-baseline.md",
  "docs/adr/ADR-0008-testing-pyramid.md",
  "docs/compliance/se/accounting-foundation.md",
  "docs/compliance/se/vat-engine.md",
  "docs/compliance/se/agi-engine.md",
  "docs/compliance/se/payroll-engine.md",
  "docs/compliance/se/benefits-engine.md",
  "docs/compliance/se/travel-and-traktamente-engine.md",
  "docs/compliance/se/pension-and-salary-exchange-engine.md",
  "docs/compliance/se/rot-rut-engine.md",
  "docs/compliance/se/personalliggare-engine.md",
  "docs/compliance/se/einvoice-peppol-engine.md",
  "docs/compliance/se/annual-reporting-engine.md",
  "docs/domain/ubiquitous-language.md",
  "docs/test-plans/master-test-strategy.md",
  "docs/test-plans/master-verification-gates.md",
  "docs/runbooks/local-development.md",
  "docs/runbooks/production-deploy.md",
  "docs/ui/ENTERPRISE_UI_PLAN.md",
  "docs/prompts/CODEX_PROMPT_LIBRARY.md"
];

export function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

export async function exists(relativePath) {
  try {
    await fs.access(repoPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function readText(relativePath) {
  return fs.readFile(repoPath(relativePath), "utf8");
}

export async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

export async function listFiles(relativeRoot, extensions = []) {
  const files = [];
  const root = repoPath(relativeRoot);

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath);
        continue;
      }
      const relativeFile = path.relative(repoRoot, nextPath).replaceAll("\\", "/");
      if (extensions.length === 0 || extensions.includes(path.extname(entry.name))) {
        files.push(relativeFile);
      }
    }
  }

  await walk(root);
  return files.sort();
}

export async function commandResult(command, args = [], options = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd: repoRoot,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        ...options
      });
    } catch (error) {
      resolve({ code: 1, stdout: "", stderr: String(error) });
      return;
    }

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ code: 1, stdout, stderr: stderr || String(error) });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });

    if (typeof options.input === "string") {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
}

export function isMainModule(metaUrl) {
  return Boolean(process.argv[1]) && metaUrl === pathToFileURL(process.argv[1]).href;
}

export async function stopServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function packageDirectories() {
  const entries = await fs.readdir(repoPath("packages"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .sort();
}

export async function appDirectories() {
  const entries = await fs.readdir(repoPath("apps"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `apps/${entry.name}`)
    .sort();
}

export function parseImports(sourceText) {
  const results = [];
  const patterns = [/from\s+["']([^"']+)["']/g, /import\s+["']([^"']+)["']/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceText)) !== null) {
      results.push(match[1]);
    }
  }
  return results;
}

export function failWith(errors) {
  if (errors.length === 0) {
    return;
  }
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}
