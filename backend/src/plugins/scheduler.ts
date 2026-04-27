// ── Scheduler plugin (node-cron + Postgres advisory lock) ──
// Multi-instance safe: ใช้ pg_try_advisory_lock guard
import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "./prisma";
import { logger } from "./logger";

interface ScheduledJob {
  name: string;
  cronExpression: string;
  task: ScheduledTask;
}

const jobs = new Map<string, ScheduledJob>();

/**
 * รัน fn ภายใต้ Postgres advisory lock
 * lockKey = stable integer ต่อ job (ใช้ hash ของ job name)
 * @returns true ถ้าได้ lock + run เสร็จ, false ถ้าไม่ได้ lock (instance อื่น run อยู่)
 */
export async function runWithLock(lockKey: number, fn: () => Promise<void>): Promise<boolean> {
  // pg_try_advisory_lock — non-blocking, return true ถ้าได้ lock
  const rows = await prisma.$queryRawUnsafe<{ acquired: boolean }[]>(
    `SELECT pg_try_advisory_lock(${lockKey}) AS acquired`,
  );
  const acquired = rows[0]?.acquired === true;
  if (!acquired) return false;

  try {
    await fn();
  } finally {
    await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${lockKey})`);
  }
  return true;
}

/** Hash string → 32-bit signed int (สำหรับ advisory lock key) */
function hashLockKey(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return h;
}

export interface RegisterJobOptions {
  name: string;
  cronExpression: string;
  fn: () => Promise<void>;
}

export function registerJob(opts: RegisterJobOptions): void {
  if (jobs.has(opts.name)) {
    logger.warn({ name: opts.name }, "Scheduler: job already registered");
    return;
  }
  const lockKey = hashLockKey(opts.name);
  const task = cron.schedule(opts.cronExpression, async () => {
    const acquired = await runWithLock(lockKey, async () => {
      logger.debug({ name: opts.name }, "Scheduler: job start");
      try {
        await opts.fn();
      } catch (err) {
        logger.error({ err, name: opts.name }, "Scheduler: job failed");
      }
    });
    if (!acquired) logger.debug({ name: opts.name }, "Scheduler: job skipped (lock held by other instance)");
  });
  jobs.set(opts.name, { name: opts.name, cronExpression: opts.cronExpression, task });
  logger.info({ name: opts.name, cron: opts.cronExpression }, "Scheduler: job registered");
}

export function listJobs(): { name: string; cronExpression: string }[] {
  return Array.from(jobs.values()).map(({ name, cronExpression }) => ({ name, cronExpression }));
}

export function stopAllJobs(): void {
  for (const job of jobs.values()) job.task.stop();
  jobs.clear();
}
