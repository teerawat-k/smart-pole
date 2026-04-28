// ── Atom: parse MQTT topic → messageType ───────────────────
// Topic pattern: smartpole/sensor — poleName อยู่ใน payload

export type MessageType = "sensor";

export interface ParsedTopic {
  messageType: MessageType;
}

export function parseTopic(topic: string): ParsedTopic | null {
  const parts = topic.split("/");
  if (parts.length !== 2) return null;
  if (parts[0] !== "smartpole") return null;
  if (parts[1] !== "sensor") return null;
  return { messageType: "sensor" };
}
