import { failWith, listFiles, readText } from "./lib/repo.mjs";

const files = [
  ...(await listFiles("apps", [".js", ".mjs"])),
  ...(await listFiles("packages", [".js", ".mjs"])),
  ...(await listFiles("scripts", [".js", ".mjs"])),
  ...(await listFiles("tests", [".js", ".mjs"]))
];

const errors = [];

for (const file of files) {
  const source = await readText(file);
  if (!source.trim()) {
    errors.push(`${file} is empty`);
  }
  if (/^(<{7}|={7}|>{7})/m.test(source)) {
    errors.push(`${file} contains unresolved merge markers`);
  }
}

failWith(errors);
console.log(`Build baseline verification passed for ${files.length} files.`);
