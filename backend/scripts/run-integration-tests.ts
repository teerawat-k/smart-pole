// Run integration tests (only *.integration.test.ts files)
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function findTests(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findTests(full, results);
    } else if (entry.isFile() && entry.name.includes("integration.test.ts")) {
      results.push(full);
    }
  }
  return results;
}

const tests = findTests("src");
console.log(`Running ${tests.length} integration test files...`);
let exitCode = 0;
for (const file of tests) {
  console.log(`\n→ ${file}`);
  const result = spawnSync("bun", ["test", file], { stdio: "inherit", shell: true });
  if ((result.status ?? 1) !== 0) exitCode = result.status ?? 1;
}
process.exit(exitCode);
