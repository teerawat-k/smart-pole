// Run unit tests (exclude integration test files)
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

function findTests(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findTests(full, results);
    } else if (entry.isFile() && entry.name.endsWith(".test.ts") && !entry.name.includes("integration")) {
      results.push(full);
    }
  }
  return results;
}

const tests = findTests("src");
console.log(`Running ${tests.length} unit test files...`);
const result = spawnSync("bun", ["test", ...tests], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
