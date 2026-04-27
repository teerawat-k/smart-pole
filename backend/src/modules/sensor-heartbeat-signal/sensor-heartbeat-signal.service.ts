import { sensorHeartbeatSignalRepository } from "./sensor-heartbeat-signal.repository";

export const sensorHeartbeatSignalService = {
  write: sensorHeartbeatSignalRepository.write.bind(sensorHeartbeatSignalRepository),
  findHistory: sensorHeartbeatSignalRepository.findHistory.bind(sensorHeartbeatSignalRepository),
};
