// ── Atom (side-effect): POST ไป receiver + retry/backoff/timeout ──
import { logger } from "@/plugins/logger";
import { PushHeader } from "../sensor-push.constants";
import type { PostResult, PushReceiverConfig } from "../sensor-push.schema";

export interface DeliverInput {
  cfg: PushReceiverConfig;
  rawBody: string;
  timestamp: number;
  signature: string;
  eventId: string;
}

async function postOnce(input: DeliverInput): Promise<PostResult> {
  const { cfg, rawBody, timestamp, signature, eventId } = input;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [PushHeader.KEY_ID]: cfg.keyId,
        [PushHeader.TIMESTAMP]: String(timestamp),
        [PushHeader.SIGNATURE]: `ed25519=${signature}`,
        [PushHeader.EVENT_ID]: eventId,
      },
      body: rawBody,
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 }; // network / timeout
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** retry เฉพาะ 5xx/timeout (exponential backoff) — 4xx = ไม่ retry (ผิดที่ payload/auth) */
export async function postToReceiver(input: DeliverInput): Promise<PostResult> {
  const { maxRetry } = input.cfg;
  let last: PostResult = { ok: false, status: 0 };
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    if (attempt > 0) await sleep(Math.min(2000 * 2 ** (attempt - 1), 30_000));
    last = await postOnce(input);
    if (last.ok) return last;
    if (last.status >= 400 && last.status < 500) return last;
  }
  logger.warn({ url: input.cfg.url, status: last.status }, "sensor-push: deliver failed after retries");
  return last;
}
