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
