import { listFiles, readText } from "./lib/repo.mjs";

const scanners = [
  {
    name: "aws-access-key",
    pattern: /AKIA[0-9A-Z]{16}/
  },
  {
    name: "github-personal-access-token",
    pattern: /ghp_[A-Za-z0-9]{36,}/
  },
  {
    name: "private-key",
    pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/
  },
  {
    name: "postgres-connection-string",
    pattern: /postgres:\/\/[^:\s]+:[^@\s]+@/i,
    shouldIgnoreLine(line) {
      return (
        line.includes("${") ||
        line.includes("encodeURIComponent(") ||
        line.includes("process.env") ||
        line.includes("DATABASE_URL") ||
        line.includes("POSTGRES_URL")
      );
    }
  }
];

const errors = [];
const localBootstrapEnvPaths = new Set(["infra/docker/.env"]);
const files = [
  ...(await listFiles("apps")),
  ...(await listFiles("packages")),
  ...(await listFiles("docs")),
  ...(await listFiles("infra")),
  ...(await listFiles("scripts")),
  "package.json",
  ".env.example"
];

for (const file of files) {
  const isLocalAppEnv = /^apps\/[^/]+\/\.env$/.test(file);
  if (localBootstrapEnvPaths.has(file) || isLocalAppEnv) {
    continue;
  }
  if (file.endsWith(".env") && !file.endsWith(".example")) {
    errors.push(`Tracked non-example env file: ${file}`);
    continue;
  }
  const content = await readText(file);
  const lines = content.split(/\r?\n/u);
  for (const scanner of scanners) {
    for (const [index, line] of lines.entries()) {
      if (scanner.shouldIgnoreLine?.(line, file)) {
        continue;
      }
      if (scanner.pattern.test(line)) {
        errors.push(`Potential secret detected in ${file}:${index + 1} via ${scanner.name}`);
      }
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log("Security baseline scan passed.");
