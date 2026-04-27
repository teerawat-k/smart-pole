// In-memory WS connection registry — push เท่านั้น, ห้าม store state
type WsLike = { send: (msg: string) => void; close: () => void };

const connections = new Map<number, Set<WsLike>>();

export function addConnection(userId: number, ws: WsLike): void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(ws);
}

export function removeConnection(userId: number, ws: WsLike): void {
  connections.get(userId)?.delete(ws);
  if (connections.get(userId)?.size === 0) connections.delete(userId);
}

export function sendInvalidate(userIds: number[], entity: string): void {
  const msg = JSON.stringify({ type: "invalidate", entity });
  for (const uid of userIds) {
    connections.get(uid)?.forEach((ws) => ws.send(msg));
  }
}

export function broadcastToAll(message: unknown): void {
  const msg = JSON.stringify(message);
  for (const set of connections.values()) {
    set.forEach((ws) => ws.send(msg));
  }
}
