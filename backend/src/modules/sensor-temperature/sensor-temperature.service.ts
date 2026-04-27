import { sensorTemperatureRepository } from "./sensor-temperature.repository";

export const sensorTemperatureService = {
  write: sensorTemperatureRepository.write.bind(sensorTemperatureRepository),
  findLatest: sensorTemperatureRepository.findLatest.bind(sensorTemperatureRepository),
  findHistory: sensorTemperatureRepository.findHistory.bind(sensorTemperatureRepository),
};
