// ── MQTT client singleton ──────────────────────────────────
// Subscribe smartpole/+/sensor (wildcard ครอบทุกเสา), dispatch ไป handler ตาม messageType
import mqtt, { type MqttClient } from "mqtt";
import { env } from "@/config/env";
import { logger } from "@/plugins/logger";
import { parseTopic } from "./parse-topic";
import { handleSensorMessage } from "./handlers/handle-sensor";

const SENSOR_TOPIC_PATTERN = "smartpole/+/sensor" as const;

let client: MqttClient | null = null;

export function getMqttClient(): MqttClient | null {
  return client;
}

export function startMqttSubscriber(): void {
  if (client) {
    logger.warn("MQTT subscriber already started");
    return;
  }

  logger.info({ broker: env.MQTT_BROKER_URL }, "MQTT: connecting...");
  client = mqtt.connect(env.MQTT_BROKER_URL, {
    clientId: env.MQTT_CLIENT_ID,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
    connectTimeout: 10_000,
    protocolVersion: 5,
    clean: true,
  });

  client.on("connect", () => {
    logger.info("MQTT: connected");
    client?.subscribe(SENSOR_TOPIC_PATTERN, { qos: 1 });
    logger.info({ pattern: SENSOR_TOPIC_PATTERN }, "MQTT: subscribed");
  });

  client.on("reconnect", () => logger.warn("MQTT: reconnecting..."));
  client.on("error", (err) => logger.error({ err }, "MQTT: error"));
  client.on("offline", () => logger.warn("MQTT: offline"));

  client.on("message", async (topic, payload) => {
    const parsedTopic = parseTopic(topic);
    if (!parsedTopic) {
      logger.warn({ topic }, "MQTT: unknown topic format");
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(payload.toString());
    } catch (err) {
      logger.warn({ err, topic }, "MQTT: invalid JSON payload");
      return;
    }

    try {
      switch (parsedTopic.messageType) {
        case "sensor":
          await handleSensorMessage(parsedTopic.poleName, json);
          break;
        default: {
          // exhaustive — type-checker จะ error เมื่อเพิ่ม MessageType แล้วไม่ handle
          const _exhaustive: never = parsedTopic.messageType;
          logger.warn({ topic, messageType: _exhaustive }, "MQTT: no handler for messageType");
        }
      }
    } catch (err) {
      logger.error({ err, topic }, "MQTT: handler crashed");
    }
  });
}

export async function stopMqttSubscriber(): Promise<void> {
  if (!client) return;
  await new Promise<void>((resolve) => client!.end(false, undefined, () => resolve()));
  client = null;
  logger.info("MQTT: stopped");
}
