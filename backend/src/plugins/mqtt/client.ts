// ── MQTT client singleton ──────────────────────────────────
// Connect ที่ start, subscribe ทุก smartpole topic, dispatch ไป handlers
import mqtt, { type MqttClient } from "mqtt";
import { env } from "@/config/env";
import { logger } from "@/plugins/logger";
import { parseTopic } from "./parse-topic";
import { handleSensorMessage } from "./handlers/handle-sensor";
import { handleHeartbeatMessage } from "./handlers/handle-heartbeat";
import { handleEventMessage } from "./handlers/handle-event";

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
    client?.subscribe("smartpole/+/sensor", { qos: 1 });
    client?.subscribe("smartpole/+/heartbeat", { qos: 0 });
    client?.subscribe("smartpole/+/event", { qos: 2 });
    logger.info("MQTT: subscribed to smartpole/+/{sensor,heartbeat,event}");
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
        case "heartbeat":
          await handleHeartbeatMessage(parsedTopic.poleName, json);
          break;
        case "event":
          await handleEventMessage(parsedTopic.poleName, json);
          break;
        default:
          logger.warn({ messageType: parsedTopic.messageType }, "MQTT: unhandled message type");
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
