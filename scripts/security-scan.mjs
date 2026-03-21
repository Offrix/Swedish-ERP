import { listFiles, readText } from "./lib/repo.mjs";

const secretPatterns = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{36,}/,
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /postgres:\/\/[^:\s]+:[^@\s]+@/i
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
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      errors.push(`Potential secret detected in ${file} via ${pattern}`);
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
