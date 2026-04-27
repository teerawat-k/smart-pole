// ── Atom: parse MQTT topic → { poleName, messageType } ─────
// Topic pattern: smartpole/{poleName}/{messageType}

export interface ParsedTopic {
  poleName: string;
  messageType: string;
}

export function parseTopic(topic: string): ParsedTopic | null {
  const parts = topic.split("/");
  if (parts.length < 3) return null;
  if (parts[0] !== "smartpole") return null;
  const poleName = parts[1];
  const messageType = parts.slice(2).join("/");
  if (!poleName || !messageType) return null;
  return { poleName, messageType };
}
