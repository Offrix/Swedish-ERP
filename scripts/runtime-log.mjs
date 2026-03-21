import process from "node:process";
import { commandResult, readJson } from "./lib/repo.mjs";

const packageJson = await readJson("package.json");
const versions = packageJson.config.runtimeVersions;

console.log("Swedish ERP FAS 0 runtime log");
console.log(`Configured Node: ${versions.node}`);
console.log(`Configured pnpm: ${versions.pnpm}`);
console.log(`Configured Python: ${versions.python}`);
console.log(`Configured PostgreSQL: ${versions.postgresql}`);
console.log(`Configured Valkey: ${versions.valkey}`);
console.log(`Configured TypeScript: ${versions.typescript}`);
console.log(`Configured React: ${versions.react}`);
console.log(`Configured Next.js: ${versions.next}`);
console.log(`Configured Expo SDK: ${versions.expo}`);

console.log(`Node: ${process.version}`);

for (const [label, command, args] of [
  ["Corepack", "corepack", ["--version"]],
  ["Git", "git", ["--version"]],
  ["Docker", "docker", ["--version"]],
  ["Python", "python", ["--version"]],
  ["uv", "uv", ["--version"]]
]) {
  const result = await commandResult(command, args);
  const output = `${result.stdout}${result.stderr}`.trim();
  const sandboxBlocked = output.includes("spawn EPERM") || output.includes("operation not permitted");
  console.log(`${label}: ${result.code === 0 ? output : sandboxBlocked ? "blocked in current sandbox" : "missing"}`);
}
