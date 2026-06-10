import paho.mqtt.client as mqtt
import json, time

# ── Config ────────────────────────────────────────────
BROKER    = "152.42.242.162"
PORT      = 7783
USERNAME  = "smartpole"
PASSWORD  = "mqtt_dev_2025"
POLE_NAME = "pole-01"

SENSOR_INTERVAL = 300   # 5 นาที

# Topic v2 — smartpole/<poleName>/sensor
SENSOR_TOPIC = f"smartpole/{POLE_NAME}/sensor"

# ── MQTT Client ───────────────────────────────────────
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(USERNAME, PASSWORD)

def on_connect(c, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[MQTT] Connected to {BROKER}:{PORT}")
    else:
        print(f"[MQTT] Connect failed: {reason_code}")

def on_disconnect(c, userdata, flags, reason_code, properties):
    print("[MQTT] Disconnected — reconnecting...")

client.on_connect    = on_connect
client.on_disconnect = on_disconnect
client.reconnect_delay_set(min_delay=5, max_delay=60)

# ── Publish ───────────────────────────────────────────
def send_sensor(seq):
    payload = {
        "timestamp":   int(time.time() * 1000),
        "seq":         seq,
        "pm25":        35.2,
        "temperature": 33.1,
        "humidity":    74.5,
    }
    client.publish(SENSOR_TOPIC, json.dumps(payload), qos=1)
    print(f"[Sensor] seq={seq} pm25={payload['pm25']} temp={payload['temperature']} hum={payload['humidity']}")

# ── Main ──────────────────────────────────────────────
def main():
    print(f"[Smart Pole] Starting — {POLE_NAME}")
    print(f"[Smart Pole] Publishing to: {SENSOR_TOPIC}")
    client.connect(BROKER, PORT, keepalive=60)
    client.loop_start()

    seq = 1
    last_sensor = 0

    time.sleep(2)
    send_sensor(seq)
    seq += 1
    last_sensor = time.time()

    while True:
        now = time.time()
        if now - last_sensor >= SENSOR_INTERVAL:
            send_sensor(seq)
            seq += 1
            last_sensor = now
        time.sleep(10)

if __name__ == "__main__":
    main()
