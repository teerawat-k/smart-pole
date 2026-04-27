import { sensorHumidityRepository } from "./sensor-humidity.repository";

export const sensorHumidityService = {
  write: sensorHumidityRepository.write.bind(sensorHumidityRepository),
  findLatest: sensorHumidityRepository.findLatest.bind(sensorHumidityRepository),
  findHistory: sensorHumidityRepository.findHistory.bind(sensorHumidityRepository),
};
