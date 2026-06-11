"""
Smart Pole Pi firmware — main MQTT publisher

Reads PM2510TH-OD sensor every SENSOR_INTERVAL sec and publishes to MQTT.
Topic: smartpole/<POLE_NAME>/sensor
Payload: { timestamp, seq, humidity, temperature, pm1, pm25, pm10 }
"""

import paho.mqtt.client as mqtt
import json
import time
import logging
from sensor import PM2510Sensor

# ── Config (provision-pi.sh sed lines ตรงนี้) ─────────
BROKER     = "152.42.242.162"
PORT       = 7783
USERNAME   = "smartpole"
PASSWORD   = "mqtt_dev_2025"
POLE_NAME  = "pole-01"

SENSOR_DEVICE   = "/dev/ttyUSB0"
SENSOR_BAUD     = 9600
SENSOR_SLAVE_ID = 1
SENSOR_INTERVAL = 60   # 1 นาที — backend อ่าน real-time ได้ดีกว่า 5 นาที

# ── Topic ─────────────────────────────────────────────
SENSOR_TOPIC = f"smartpole/{POLE_NAME}/sensor"

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


# ── Sensor instance — reuse connection ───────────────
sensor = PM2510Sensor(
    device=SENSOR_DEVICE,
    slave_id=SENSOR_SLAVE_ID,
    baudrate=SENSOR_BAUD,
)


def send_sensor(seq: int) -> bool:
    """อ่าน + publish 1 รอบ — return True ถ้าสำเร็จ"""
    reading = sensor.read()
    if reading is None:
        log.warning(f"seq={seq} sensor read failed — skip publish")
        return False

    payload = {
        "timestamp": int(time.time() * 1000),
        "seq":       seq,
        **reading,   # humidity, temperature, pm1, pm25, pm10
    }
    info = client.publish(SENSOR_TOPIC, json.dumps(payload), qos=1)
    info.wait_for_publish(timeout=5)
    log.info(
        f"seq={seq} published — "
        f"H={reading['humidity']}% T={reading['temperature']}°C "
        f"PM1={reading['pm1']} PM2.5={reading['pm25']} PM10={reading['pm10']}"
    )
    return True


# ── Main ──────────────────────────────────────────────
def main():
    log.info(f"Smart Pole starting — {POLE_NAME}")
    log.info(f"MQTT topic: {SENSOR_TOPIC}")
    log.info(f"Sensor: {SENSOR_DEVICE} @ {SENSOR_BAUD} bps, slave={SENSOR_SLAVE_ID}")
    log.info(f"Interval: every {SENSOR_INTERVAL}s")

    client.connect(BROKER, PORT, keepalive=60)
    client.loop_start()
    time.sleep(2)  # รอ MQTT handshake

    seq = 1
    send_sensor(seq)
    seq += 1
    last_sensor = time.time()

    try:
        while True:
            now = time.time()
            if now - last_sensor >= SENSOR_INTERVAL:
                send_sensor(seq)
                seq += 1
                last_sensor = now
            time.sleep(2)
    except KeyboardInterrupt:
        log.info("Shutting down...")
    finally:
        client.loop_stop()
        client.disconnect()
        sensor.close()


if __name__ == "__main__":
    main()
