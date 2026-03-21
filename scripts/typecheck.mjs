import { appDirectories, failWith, packageDirectories, parseImports, readJson, readText, requiredPackages } from "./lib/repo.mjs";

const errors = [];
const packageJson = await readJson("package.json");
const versions = packageJson.config.runtimeVersions;
const nvmrc = (await readText(".nvmrc")).trim();
const pythonVersion = (await readText(".python-version")).trim();
const adrRuntime = await readText("docs/adr/ADR-0001-runtime-versions.md");
const composeFile = await readText("infra/docker/docker-compose.yml");

if (nvmrc !== versions.node) {
  errors.push(`.nvmrc (${nvmrc}) does not match package.json (${versions.node})`);
}
if (pythonVersion !== versions.python) {
  errors.push(`.python-version (${pythonVersion}) does not match package.json (${versions.python})`);
}

for (const value of Object.values(versions)) {
  if (!adrRuntime.includes(String(value))) {
    errors.push(`ADR-0001 does not include exact runtime version ${value}`);
  }
}

for (const expectedImage of [`postgres:${versions.postgresql}`, `valkey/valkey:${versions.valkey}`]) {
  if (!composeFile.includes(expectedImage)) {
    errors.push(`infra/docker/docker-compose.yml does not pin ${expectedImage}`);
  }
}

const appDirs = await appDirectories();
if (appDirs.length !== 4) {
  errors.push(`Expected exactly 4 app directories, found ${appDirs.length}`);
}

for (const packageDir of await packageDirectories()) {
  const packageJsonPath = `${packageDir}/package.json`;
  const manifest = await readJson(packageJsonPath);
  if (manifest.engines?.node && manifest.engines.node !== versions.node) {
    errors.push(`${packageJsonPath} has mismatched Node engine ${manifest.engines.node}`);
  }
  const entryPath = manifest.main || manifest.exports?.["."] || manifest.types;
  if (entryPath && entryPath.endsWith(".ts")) {
    const source = await readText(`${packageDir}/${entryPath}`);
    const imports = parseImports(source);
    const illegalImport = imports.find((value) => value.includes("domain-"));
    if (illegalImport && packageDir.startsWith("packages/domain-")) {
      errors.push(`${packageDir} must stay import-free in FAS 0, found ${illegalImport}`);
    }
  }
}

for (const requiredPackage of requiredPackages) {
  const readme = await readText(`${requiredPackage}/README.md`);
  if (!readme.trim()) {
    errors.push(`${requiredPackage}/README.md is empty`);
  }
}

failWith(errors);
console.log("Type-level consistency checks passed.");
