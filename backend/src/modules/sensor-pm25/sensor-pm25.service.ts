import { sensorPm25Repository } from "./sensor-pm25.repository";

export const sensorPm25Service = {
  write: sensorPm25Repository.write.bind(sensorPm25Repository),
  findLatest: sensorPm25Repository.findLatest.bind(sensorPm25Repository),
  findHistory: sensorPm25Repository.findHistory.bind(sensorPm25Repository),
};
