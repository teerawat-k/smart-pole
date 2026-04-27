export { startMqttSubscriber, stopMqttSubscriber, getMqttClient } from "./client";
export { parseTopic } from "./parse-topic";
export { registerSensorHandler, getSensorHandler, listSensorKeys } from "./sensor-registry";

// register handlers ตอน module load
import "@/modules/sensor-pm25";
import "@/modules/sensor-temperature";
import "@/modules/sensor-humidity";
