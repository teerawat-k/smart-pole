// ── Atom: parse MQTT topic → poleName + messageType ────────
// Topic pattern: smartpole/<poleName>/<messageType>
//
// รองรับเฉพาะ messageType ที่ระบบใช้จริง — เพิ่ม type ใหม่ที่ enum + handler
// ห้ามใช้ wildcard ใน parser (parser รับ topic ที่ broker resolve มาแล้ว)

export type MessageType = "sensor";

const MESSAGE_TYPES: readonly MessageType[] = ["sensor"] as const;

// poleName format: 1-64 chars, alphanumeric + dash/underscore — ตรงกับ Pole.poleName constraint
const POLE_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export interface ParsedTopic {
  poleName:    string;
  messageType: MessageType;
}

export function parseTopic(topic: string): ParsedTopic | null {
  const parts = topic.split("/");
  if (parts.length !== 3) return null;
  if (parts[0] !== "smartpole") return null;

  const poleName = parts[1]!;
  if (!POLE_NAME_RE.test(poleName)) return null;

  const messageType = parts[2]!;
  if (!isMessageType(messageType)) return null;

  return { poleName, messageType };
}

function isMessageType(value: string): value is MessageType {
  return (MESSAGE_TYPES as readonly string[]).includes(value);
}
