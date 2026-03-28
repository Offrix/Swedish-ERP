import process from "node:process";
import { isMainModule } from "./lib/repo.mjs";

function describeFetchError(error) {
  const message = error?.message || "unknown error";
  const causeCode = error?.cause?.code || "";
  if (causeCode === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
    return "unreachable (service not running or port closed)";
  }
  if (causeCode === "ENOTFOUND" || message.includes("ENOTFOUND")) {
    return "unreachable (host not found)";
  }
  return `fetch failed: ${message}`;
}

export async function runHealthcheck({
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  const resolvedTargets = [
    { name: "api", url: env.API_HEALTH_URL || "http://localhost:4000/healthz" },
    { name: "desktop-web", url: env.DESKTOP_HEALTH_URL || "http://localhost:4001/healthz" },
    { name: "field-mobile", url: env.FIELD_HEALTH_URL || "http://localhost:4002/healthz" }
  ];
  let localFailed = false;

  for (const target of resolvedTargets) {
    try {
      const response = await fetch(target.url);
      if (!response.ok) {
        localFailed = true;
        stderr.write(`${target.name}: ${response.status} at ${target.url}\n`);
        continue;
      }
      stdout.write(`${target.name}: ok (${target.url})\n`);
    } catch (error) {
      localFailed = true;
      stderr.write(`${target.name}: ${describeFetchError(error)} at ${target.url}\n`);
    }
  }

  return { exitCode: localFailed ? 1 : 0 };
}

if (isMainModule(import.meta.url)) {
  const result = await runHealthcheck();
  process.exitCode = result.exitCode;
}
