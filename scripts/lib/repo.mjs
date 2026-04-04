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
  "packages/domain-legal-form",
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
  "packages/domain-kalkyl",
  "packages/domain-field",
  "packages/domain-personalliggare",
  "packages/domain-id06",
  "packages/domain-egenkontroll",
  "packages/domain-search",
  "packages/domain-reporting",
  "packages/domain-annual-reporting",
  "packages/domain-integrations",
  "packages/auth-core",
  "packages/events",
  "packages/db",
  "packages/rule-engine",
  "packages/document-engine"
];

const domainTruthDocuments = Array.from({ length: 18 }, (_, index) => index).flatMap((index) => {
  const phaseCode = String(index).padStart(2, "0");
  const documents = [
    `docs/implementation-control/domankarta-rebuild/DOMAIN_${phaseCode}_ANALYSIS.md`,
    `docs/implementation-control/domankarta-rebuild/DOMAIN_${phaseCode}_ROADMAP.md`,
    `docs/implementation-control/domankarta-rebuild/DOMAIN_${phaseCode}_IMPLEMENTATION_LIBRARY.md`
  ];
  if (index === 0) {
    documents.push("docs/implementation-control/domankarta-rebuild/DOMAIN_00_REPO_PRUNE_MAP.md");
  }
  return documents;
});

export const mandatoryDocs = [
  "AGENTS.md",
  "README.md",
  "docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_ROADMAP.md",
  "docs/implementation-control/domankarta-rebuild/MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md",
  "docs/implementation-control/domankarta-rebuild/CODEX_SETTINGS_PROMPT.md",
  ...domainTruthDocuments
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
  const skippedDirectoryNames = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo"
  ]);

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (skippedDirectoryNames.has(entry.name)) {
        continue;
      }

      const linkInfo = await fs.lstat(nextPath);
      if (linkInfo.isSymbolicLink()) {
        const targetInfo = await fs.stat(nextPath).catch(() => null);
        if (targetInfo?.isDirectory()) {
          continue;
        }
      }

      if (entry.isDirectory()) {
        await walk(nextPath);
        continue;
      }

      if (!entry.isFile() && !linkInfo.isSymbolicLink()) {
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
