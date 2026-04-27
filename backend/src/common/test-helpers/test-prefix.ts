/**
 * Generate unique prefix per test run — ใช้ป้องกัน data ชนกันใน integration test
 * Pattern: `TEST_<timestamp>_<random>`
 *
 * @example
 * const prefix = makeTestPrefix("pole");  // "pole_test_1719820000000_a3f"
 */
export function makeTestPrefix(scope: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 5);
  return `${scope}_test_${ts}_${rand}`;
}
