import { z } from "zod";
import { registerSensorHandler, type SensorHandler } from "@/plugins/mqtt/sensor-registry";
import { sensorHumidityService } from "./sensor-humidity.service";

const schema = z.object({
  humidity: z.number().min(0).max(100),
});

export type HumidityPayload = z.infer<typeof schema>;

export const humidityHandler: SensorHandler<HumidityPayload> = {
  key: "humidity",
  schema,
  async write({ poleId, time, seq, data, rawJson }, tx) {
    await sensorHumidityService.write({ poleId, time, seq, humidity: data.humidity, rawJson }, tx);
  },
};

registerSensorHandler(humidityHandler);
