import { appDirectories, exists, failWith, mandatoryDocs, packageDirectories, readJson, readText, requiredApps, requiredPackages } from "./lib/repo.mjs";

const errors = [];
const forbiddenTerms = ["simple-web", "pro-web"];

for (const relativePath of [...requiredApps, ...requiredPackages, ...mandatoryDocs]) {
  if (!(await exists(relativePath))) {
    errors.push(`Missing required path: ${relativePath}`);
  }
}

for (const relativePath of ["package.json", ".nvmrc", ".python-version", "pnpm-workspace.yaml", ".env.example", "CODEOWNERS", ".github/workflows/fas0-ci.yml"]) {
  if (!(await exists(relativePath))) {
    errors.push(`Missing root artifact: ${relativePath}`);
  }
}

for (const relativePath of ["apps/api/.env.example", "apps/desktop-web/.env.example", "apps/field-mobile/.env.example", "apps/worker/.env.example"]) {
  if (!(await exists(relativePath))) {
    errors.push(`Missing env example: ${relativePath}`);
  }
}

for (const relativePath of [...(await appDirectories()), ...(await packageDirectories())]) {
  const packageJsonPath = `${relativePath}/package.json`;
  const readmePath = `${relativePath}/README.md`;
  if (!(await exists(packageJsonPath))) {
    errors.push(`Missing package manifest: ${packageJsonPath}`);
  } else {
    try {
      await readJson(packageJsonPath);
    } catch (error) {
      errors.push(`Invalid JSON in ${packageJsonPath}: ${error.message}`);
    }
  }
  if (!(await exists(readmePath))) {
    errors.push(`Missing README: ${readmePath}`);
  }
}

for (const forbiddenDir of ["apps/simple-web", "apps/pro-web"]) {
  if (await exists(forbiddenDir)) {
    errors.push(`Forbidden app path present: ${forbiddenDir}`);
  }
}

for (const docPath of mandatoryDocs) {
  const content = await readText(docPath);
  for (const forbiddenTerm of forbiddenTerms) {
    if (content.includes(forbiddenTerm)) {
      errors.push(`Forbidden term "${forbiddenTerm}" found in ${docPath}`);
    }
  }
}

failWith(errors);
console.log("Lint-level repository structure checks passed.");
