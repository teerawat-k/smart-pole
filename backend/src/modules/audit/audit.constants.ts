// ── Audit action constants — ใช้แทน magic string ทั่วระบบ ────────────
// service เรียก: auditService.log({ action: AuditAction.CREATE, ... })

export const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  STATUS_CHANGE: "STATUS_CHANGE",
  REORDER: "REORDER",

  // Auth-specific
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  RESET_PASSWORD: "RESET_PASSWORD",
  CHANGE_PASSWORD: "CHANGE_PASSWORD",
  UNLOCK: "UNLOCK",

  // MQTT
  MQTT_INGEST_FAIL: "MQTT_INGEST_FAIL",

  // Workflow (ทั่วไป)
  SUBMIT: "SUBMIT",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  TRANSITION: "TRANSITION",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

/** System user marker — null = action จาก system (MQTT handler, cron, heartbeat)
 *  Schema: User.id เป็น Int + AuditLog.userId เป็น Int? (nullable) → null = system
 *  ห้ามตั้งเป็น 0 — จะ FK violation เพราะไม่มี user id=0 */
export const SYSTEM_USER_ID: null = null;
