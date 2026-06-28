#!/usr/bin/env python3
"""
Smart Pole — On-demand WireGuard agent

ฟัง MQTT smartpole/<pole>/cmd → เปิด/ปิด tunnel wg-maint ตามคำสั่ง + auto-close timer
  - {"action":"vpn-open","ttl":1800}  → sudo wg-quick up wg-maint + ตั้ง timer ปิดเอง
  - {"action":"vpn-close"}            → sudo wg-quick down wg-maint
ack กลับ smartpole/<pole>/cmd-result

ปกติ tunnel ปิด = เสาไม่มี inbound path (attack surface ~0, data ~0)
sudo: ต้องตั้ง NOPASSWD เฉพาะ wg-quick up/down wg-maint (ดู /etc/sudoers.d/smartpole-vpn)
"""

import json
import logging
import signal
import subprocess
import sys
import threading

import paho.mqtt.client as mqtt

# ── Config ────────────────────────────────────────────
BROKER     = "152.42.242.162"
PORT       = 7783
USERNAME   = "pole-01"          # ต้องตรงกับ user ใน broker passwordfile + ACL pattern smartpole/%u/#
PASSWORD   = "mqtt_dev_2025"
POLE_NAME  = "pole-01"
IFACE      = "wg-maint"
DEFAULT_TTL = 1800   # 30 นาที
MAX_TTL     = 3600   # cap 60 นาที

CMD_TOPIC    = f"smartpole/{POLE_NAME}/cmd"
RESULT_TOPIC = f"smartpole/{POLE_NAME}/cmd-result"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] vpn-agent: %(message)s")
log = logging.getLogger("vpn-agent")

_timer: threading.Timer | None = None
_lock = threading.Lock()
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)


def wg(action: str) -> bool:
    r = subprocess.run(["sudo", "wg-quick", action, IFACE], capture_output=True, text=True)
    if r.returncode != 0:
        log.warning(f"wg-quick {action} rc={r.returncode}: {r.stderr.strip()[:200]}")
        return False
    return True


def is_up() -> bool:
    return subprocess.run(["ip", "link", "show", IFACE],
                          capture_output=True).returncode == 0


def ack(payload: dict) -> None:
    client.publish(RESULT_TOPIC, json.dumps(payload), qos=1)


def close_tunnel() -> None:
    global _timer
    with _lock:
        if _timer:
            _timer.cancel()
            _timer = None
        if is_up():
            wg("down")
            log.info("tunnel down")
        ack({"vpn": "down"})


def open_tunnel(ttl: int) -> None:
    global _timer
    with _lock:
        ttl = max(60, min(ttl, MAX_TTL))
        if not is_up():
            if not wg("up"):
                ack({"vpn": "error"})
                return
            log.info(f"tunnel up — auto-close in {ttl}s")
        if _timer:
            _timer.cancel()
        _timer = threading.Timer(ttl, close_tunnel)
        _timer.daemon = True
        _timer.start()
        ack({"vpn": "up", "expires_in": ttl})


def on_connect(c, userdata, flags, reason_code, properties) -> None:
    log.info(f"MQTT connected rc={reason_code}")
    c.subscribe(CMD_TOPIC, qos=1)
    log.info(f"subscribed {CMD_TOPIC}")


def on_message(c, userdata, msg) -> None:
    try:
        cmd = json.loads(msg.payload.decode())
    except Exception as e:
        log.warning(f"bad payload: {e}")
        return
    action = cmd.get("action")
    if action == "vpn-open":
        open_tunnel(int(cmd.get("ttl", DEFAULT_TTL)))
    elif action == "vpn-close":
        close_tunnel()
    else:
        log.info(f"ignore action={action}")


def shutdown(signum, frame) -> None:
    log.info("shutting down — ปิด tunnel")
    if is_up():
        wg("down")
    try:
        client.disconnect()
    except Exception:
        pass
    sys.exit(0)


def main() -> None:
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    # safety: ปิด tunnel ค้างตอน start (เช่น agent restart ระหว่าง session)
    if is_up():
        wg("down")
    client.username_pw_set(USERNAME, PASSWORD)
    client.reconnect_delay_set(min_delay=5, max_delay=60)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER, PORT, keepalive=60)
    client.loop_forever()   # paho จัดการ reconnect เอง


if __name__ == "__main__":
    main()
