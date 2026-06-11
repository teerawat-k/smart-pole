// Run unit tests — spawn 1 child process ต่อไฟล์ test เพื่อกัน mock.module leak ข้ามไฟล์
// (Bun mock.module hoists ขึ้นบนสุดของ runtime, ระหว่างไฟล์ใน process เดียวจะปนกัน)

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

const tests = findTests("src").sort();
console.log(`Running ${tests.length} unit test files (one process per file — กัน mock.module leak)\n`);

const failed: string[] = [];
const startTime = Date.now();

for (let i = 0; i < tests.length; i++) {
  const test = tests[i]!;
  const num = String(i + 1).padStart(3, " ");
  const total = String(tests.length).padStart(3, " ");
  console.log(`\n──── [${num}/${total}] ${test} ────`);
  const result = spawnSync("bun", ["test", test], { stdio: "inherit", shell: true });
  if (result.status !== 0) failed.push(test);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n${"=".repeat(60)}`);
console.log(`Total: ${tests.length} files, ${tests.length - failed.length} passed, ${failed.length} failed (${elapsed}s)`);
if (failed.length > 0) {
  console.log("\n❌ Failed files:");
  for (const f of failed) console.log(`   • ${f}`);
  process.exit(1);
}
console.log("\n✅ All unit tests passed");
process.exit(0);
