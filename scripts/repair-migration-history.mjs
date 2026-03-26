import { commandResult, repoPath } from "./lib/repo.mjs";
import { buildMigrationHistoryRepairPlan } from "./lib/migration-history.mjs";

function parseArgs(argv) {
  const options = {
    apply: false,
    backupTableName: null
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg.startsWith("--backup-name=")) {
      options.backupTableName = arg.slice("--backup-name=".length).trim() || null;
      continue;
    }
  }

  return options;
}

async function runPsql(args, input = null) {
  const composeFile = repoPath("infra", "docker", "docker-compose.yml");
  return commandResult(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      process.env.POSTGRES_USER || "swedish_erp",
      "-d",
      process.env.POSTGRES_DB || "swedish_erp",
      ...args
    ],
    input ? { input } : {}
  );
}

function printPlan(plan) {
  console.log(`schema_migrations status: ${plan.status}`);
  for (const finding of plan.findings) {
    console.log(` - ${finding}`);
  }

  if (plan.sql) {
    console.log("");
    console.log("-- Repair SQL --");
    console.log(plan.sql);
  }
}

const options = parseArgs(process.argv.slice(2));
const dockerCheck = await commandResult("docker", ["--version"]);

if (dockerCheck.code !== 0) {
  console.error(
    "Docker is required for migration-history repair. Start infra or run this on a machine with docker compose access."
  );
  process.exit(1);
}

const columnsResult = await runPsql([
  "-At",
  "-c",
  "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schema_migrations' ORDER BY ordinal_position;"
]);

if (columnsResult.code !== 0) {
  console.error(columnsResult.stderr.trim() || "Failed to inspect schema_migrations.");
  process.exit(columnsResult.code || 1);
}

const columns = columnsResult.stdout
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);

let plan;
try {
  const backupTableName =
    options.backupTableName ||
    `schema_migrations_legacy_${new Date().toISOString().replace(/[-:.TZ]/gu, "").toLowerCase()}`;
  plan = buildMigrationHistoryRepairPlan({ columns, backupTableName });
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}

if (plan.status === "canonical") {
  printPlan(plan);
  process.exit(0);
}

if (!options.apply) {
  printPlan(plan);
  console.log("");
  console.log("Dry run only. Re-run with --apply to execute the repair SQL.");
  process.exit(0);
}

const backupExistsResult = await runPsql([
  "-At",
  "-c",
  `SELECT to_regclass('public.${plan.backupTableName}') IS NOT NULL;`
]);

if (backupExistsResult.code !== 0) {
  console.error(backupExistsResult.stderr.trim() || "Failed to verify backup table availability.");
  process.exit(backupExistsResult.code || 1);
}

if (backupExistsResult.stdout.trim() === "t") {
  console.error(
    `Backup table ${plan.backupTableName} already exists. Pass --backup-name=<new_name> or remove the stale backup table first.`
  );
  process.exit(1);
}

const applyResult = await runPsql([], plan.sql);

if (applyResult.code !== 0) {
  console.error(applyResult.stderr.trim() || "Migration history repair failed.");
  process.exit(applyResult.code || 1);
}

printPlan(plan);
console.log("");
console.log("schema_migrations repaired successfully.");
