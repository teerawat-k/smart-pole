import { z } from "zod";
import { registerSensorHandler, type SensorHandler } from "@/plugins/mqtt/sensor-registry";
import { sensorTemperatureService } from "./sensor-temperature.service";

const schema = z.object({
  temperature: z.number().min(-40).max(80),
  unit: z.enum(["celsius", "fahrenheit"]).optional(),
});

export type TemperaturePayload = z.infer<typeof schema>;

function toCelsius(value: number, unit?: "celsius" | "fahrenheit"): number {
  if (unit === "fahrenheit") return (value - 32) * (5 / 9);
  return value;
}

export const temperatureHandler: SensorHandler<TemperaturePayload> = {
  key: "temperature",
  schema,
  async write({ poleId, time, seq, data, rawJson }, tx) {
    const celsius = toCelsius(data.temperature, data.unit);
    await sensorTemperatureService.write(
      { poleId, time, seq, temperature: celsius, unit: data.unit ?? "celsius", rawJson },
      tx,
    );
  },
};

registerSensorHandler(temperatureHandler);
