const targets = [
  { name: "api", url: process.env.API_HEALTH_URL || "http://localhost:4000/healthz" },
  { name: "desktop-web", url: process.env.DESKTOP_HEALTH_URL || "http://localhost:4001/healthz" },
  { name: "field-mobile", url: process.env.FIELD_HEALTH_URL || "http://localhost:4002/healthz" }
];

let failed = false;

for (const target of targets) {
  try {
    const response = await fetch(target.url);
    if (!response.ok) {
      failed = true;
      console.error(`${target.name}: ${response.status}`);
      continue;
    }
    console.log(`${target.name}: ok`);
  } catch (error) {
    failed = true;
    console.error(`${target.name}: ${error.message}`);
  }
}

if (failed) {
  process.exit(1);
}
