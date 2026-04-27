import { z } from "zod";
import { registerSensorHandler, type SensorHandler } from "@/plugins/mqtt/sensor-registry";
import { sensorPm25Service } from "./sensor-pm25.service";

const schema = z.object({
  pm25: z.number().min(0).max(1000),
  pm10: z.number().min(0).max(2000).optional(),
  aqi: z.number().int().min(0).max(500).optional(),
});

export type Pm25Payload = z.infer<typeof schema>;

export const pm25Handler: SensorHandler<Pm25Payload> = {
  key: "pm25",
  schema,
  async write({ poleId, time, seq, data, rawJson }, tx) {
    await sensorPm25Service.write(
      { poleId, time, seq, pm25: data.pm25, pm10: data.pm10, aqi: data.aqi, rawJson },
      tx,
    );
  },
};

registerSensorHandler(pm25Handler);
