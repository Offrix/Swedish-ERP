const targets = [
  { name: "api", url: process.env.API_HEALTH_URL || "http://localhost:4000/healthz" },
  { name: "desktop-web", url: process.env.DESKTOP_HEALTH_URL || "http://localhost:4001/healthz" },
  { name: "field-mobile", url: process.env.FIELD_HEALTH_URL || "http://localhost:4002/healthz" }
];

let failed = false;

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

for (const target of targets) {
  try {
    const response = await fetch(target.url);
    if (!response.ok) {
      failed = true;
      console.error(`${target.name}: ${response.status} at ${target.url}`);
      continue;
    }
    console.log(`${target.name}: ok (${target.url})`);
  } catch (error) {
    failed = true;
    console.error(`${target.name}: ${describeFetchError(error)} at ${target.url}`);
  }
}

if (failed) {
  process.exit(1);
}
