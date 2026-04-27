export const ALERT_ENTITY = "alert" as const;

// dedupe window — ถ้า alert (poleId, alertType, isResolved=false) เดียวกันถูก trigger ซ้ำใน window นี้ ไม่ต้องสร้างใหม่
export const ALERT_DEDUPE_WINDOW_SEC = 60;

export const AlertType = {
  PM25_HIGH: "pm25_high",
  TEMP_HIGH: "temp_high",
  TEMP_LOW: "temp_low",
  HUMIDITY_HIGH: "humidity_high",
  HUMIDITY_LOW: "humidity_low",
  POLE_OFFLINE: "pole_offline",
  TAMPERING: "tampering",
  DEVICE_ERROR: "device_error",
  POWER_LOSS: "power_loss",
} as const;

export type AlertTypeValue = (typeof AlertType)[keyof typeof AlertType];
