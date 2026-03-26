import fs from "node:fs/promises";
import path from "node:path";
import { commandResult, repoPath } from "./lib/repo.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const migrationsDir = repoPath("packages", "db", "migrations");
const composeFile = repoPath("infra", "docker", "docker-compose.yml");
const migrationFiles = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

function validateMigrationSql(sql) {
  const errors = [];

  if (/schema_migrations\s*\(\s*version\s*,\s*description\s*\)/iu.test(sql)) {
    errors.push("uses legacy schema_migrations(version, description) columns");
  }

  if (/ON\s+CONFLICT\s*\(\s*version\s*\)/iu.test(sql)) {
    errors.push("uses legacy ON CONFLICT(version) migration key");
  }

  if (
    /INSERT\s+INTO\s+schema_migrations/iu.test(sql) &&
    !/INSERT\s+INTO\s+schema_migrations\s*\(\s*migration_id\s*\)/iu.test(sql)
  ) {
    errors.push("must insert into schema_migrations using the canonical migration_id column");
  }

  return errors;
}

if (migrationFiles.length === 0) {
  console.log("No migrations found.");
  process.exit(0);
}

if (dryRun) {
  console.log("Dry-run migration order:");
  for (const file of migrationFiles) {
    console.log(`- ${file}`);
  }
  process.exit(0);
}

const dockerCheck = await commandResult("docker", ["--version"]);
if (dockerCheck.code !== 0) {
  console.error("Docker is required for `pnpm run db:migrate`. Use `pnpm run db:migrate -- --dry-run` until Docker is installed.");
  process.exit(1);
}

for (const file of migrationFiles) {
  const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
  const validationErrors = validateMigrationSql(sql);

  if (validationErrors.length > 0) {
    console.error(`Migration failed validation: ${file}`);
    for (const error of validationErrors) {
      console.error(` - ${error}`);
    }
    process.exit(1);
  }

  const result = await commandResult("docker", [
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
    process.env.POSTGRES_DB || "swedish_erp"
  ], { input: sql });

  if (result.code !== 0) {
    console.error(`Migration failed: ${file}`);
    console.error(result.stderr.trim());
    process.exit(result.code || 1);
  }
  console.log(`Applied ${file}`);
}
