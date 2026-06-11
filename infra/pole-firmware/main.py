"""
Smart Pole Pi firmware — main MQTT publisher

ทุก SENSOR_INTERVAL วินาที:
  1. อ่าน sensor (PM2510TH-OD via Modbus RTU)
  2. ถ้า OK → publish ค่าจริงไป smartpole/<pole>/sensor
  3. ทุกครั้ง (OK หรือ fail) → publish health event ไป smartpole/<pole>/health
     เพื่อให้ backend track sensor_reads_total{result=...} ผ่าน Prometheus

Backend handler:
  - handle-sensor.ts: รับ /sensor → บันทึก SensorReading + อัปเดต Pole.latest*
  - handle-health.ts: รับ /health → เพิ่ม counter sensor_reads_total
"""

import paho.mqtt.client as mqtt
import json
import time
import logging
from sensor import PM2510Sensor, Outcome

# ── Config ────────────────────────────────────────────
BROKER     = "152.42.242.162"
PORT       = 7783
USERNAME   = "smartpole"
PASSWORD   = "mqtt_dev_2025"
POLE_NAME  = "pole-01"

SENSOR_DEVICE   = "/dev/ttyUSB0"
SENSOR_BAUD     = 9600
SENSOR_SLAVE_ID = 1
SENSOR_INTERVAL = 60

# ── Topics ────────────────────────────────────────────
SENSOR_TOPIC = f"smartpole/{POLE_NAME}/sensor"
HEALTH_TOPIC = f"smartpole/{POLE_NAME}/health"

# ── Logging ───────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("smartpole")

# ── MQTT Client ───────────────────────────────────────
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(USERNAME, PASSWORD)


def on_connect(c, userdata, flags, reason_code, properties):
    if reason_code == 0:
        log.info(f"MQTT connected to {BROKER}:{PORT}")
    else:
        log.error(f"MQTT connect failed: rc={reason_code}")


def on_disconnect(c, userdata, flags, reason_code, properties):
    log.warning("MQTT disconnected — auto reconnect")


client.on_connect    = on_connect
client.on_disconnect = on_disconnect
client.reconnect_delay_set(min_delay=5, max_delay=60)


# ── Sensor instance ──────────────────────────────────
sensor = PM2510Sensor(
    device=SENSOR_DEVICE,
    slave_id=SENSOR_SLAVE_ID,
    baudrate=SENSOR_BAUD,
)


def publish_sensor(seq: int, data: dict) -> None:
    payload = {
        "timestamp": int(time.time() * 1000),
        "seq":       seq,
        **data,   # humidity, temperature, pm1, pm25, pm10
    }
    info = client.publish(SENSOR_TOPIC, json.dumps(payload), qos=1)
    info.wait_for_publish(timeout=5)


def publish_health(outcome: str, error: str | None) -> None:
    """ส่งทุกครั้ง — backend ใช้ count outcome ต่อ pole"""
    payload = {
        "timestamp": int(time.time() * 1000),
        "outcome":   outcome,
    }
    if error:
        payload["error"] = error[:200]   # cap length
    info = client.publish(HEALTH_TOPIC, json.dumps(payload), qos=1)
    info.wait_for_publish(timeout=5)


def tick(seq: int) -> int:
    """อ่าน sensor → publish ที่เหมาะสม → return next seq"""
    result = sensor.read()

    # ส่ง health ทุกครั้ง (สำคัญสำหรับ metrics + alert)
    publish_health(result.outcome, result.error)

    if result.outcome == Outcome.OK and result.data:
        publish_sensor(seq, result.data)
        log.info(
            f"seq={seq} ok — H={result.data['humidity']}% "
            f"T={result.data['temperature']}°C "
            f"PM1={result.data['pm1']} PM2.5={result.data['pm25']} PM10={result.data['pm10']}"
        )
        return seq + 1

    # Sensor read fail — skip /sensor publish, แค่ /health
    log.warning(f"seq={seq} skipped — outcome={result.outcome} error={result.error}")
    return seq   # ไม่ increment เพราะไม่ได้ publish sensor data


# ── Main ──────────────────────────────────────────────
def main():
    log.info(f"Smart Pole starting — {POLE_NAME}")
    log.info(f"Sensor topic: {SENSOR_TOPIC}")
    log.info(f"Health topic: {HEALTH_TOPIC}")
    log.info(f"Sensor: {SENSOR_DEVICE} @ {SENSOR_BAUD} bps, slave={SENSOR_SLAVE_ID}")
    log.info(f"Interval: every {SENSOR_INTERVAL}s")

    client.connect(BROKER, PORT, keepalive=60)
    client.loop_start()
    time.sleep(2)

    seq = 1
    seq = tick(seq)
    last_tick = time.time()

    try:
        while True:
            now = time.time()
            if now - last_tick >= SENSOR_INTERVAL:
                seq = tick(seq)
                last_tick = now
            time.sleep(2)
    except KeyboardInterrupt:
        log.info("Shutting down...")
    finally:
        client.loop_stop()
        client.disconnect()
        sensor.close()


if __name__ == "__main__":
    main()
