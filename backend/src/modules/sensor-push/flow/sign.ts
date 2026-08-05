// ── Atom: Ed25519 signing (asymmetric — receiver verify ด้วย public key) ──
import crypto, { type KeyObject } from "node:crypto";

/** parse Ed25519 private key จาก PEM (รองรับ \n escaped ใน env) */
export function loadPrivateKey(pem: string): KeyObject {
  const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  return crypto.createPrivateKey(normalized);
}

/** เซ็น Ed25519 บน `timestamp + "." + rawBody` → base64 */
export function signMessage(privateKey: KeyObject, timestamp: number, rawBody: string): string {
  const msg = Buffer.from(`${timestamp}.${rawBody}`, "utf8");
  return crypto.sign(null, msg, privateKey).toString("base64");
}
