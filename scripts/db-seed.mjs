import fs from "node:fs/promises";
import path from "node:path";
import { commandResult, repoPath } from "./lib/repo.mjs";

const args = new Set(process.argv.slice(2));
const demoMode = args.has("--demo");
const dryRun = args.has("--dry-run");
const seedDir = repoPath("packages", "db", "seeds");
const seedFiles = (await fs.readdir(seedDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const selectedFiles = demoMode ? seedFiles : seedFiles.filter((file) => !file.includes("_demo_"));

if (dryRun) {
  console.log("Dry-run seed files:");
  for (const file of selectedFiles) {
    console.log(`- ${file}`);
  }
  process.exit(0);
}

const dockerCheck = await commandResult("docker", ["--version"]);
if (dockerCheck.code !== 0) {
  console.error("Docker is required for seeding. Use `pnpm run db:seed -- --dry-run` or `pnpm run seed:demo -- --dry-run` until Docker is installed.");
  process.exit(1);
}

for (const fileName of selectedFiles) {
  const seedFile = path.join(seedDir, fileName);
  const sql = await fs.readFile(seedFile, "utf8");
  const result = await commandResult("docker", [
    "compose",
    "-f",
    repoPath("infra", "docker", "docker-compose.yml"),
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
    console.error(result.stderr.trim());
    process.exit(result.code || 1);
  }

  console.log(`Applied seed file ${fileName}`);
}
