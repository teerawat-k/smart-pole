#!/usr/bin/env python3
"""
Admin trigger — สั่งเปิด/ปิด on-demand VPN ของเสาผ่าน MQTT (รันบน laptop admin)

ใช้:
    python vpn-trigger.py <pole> open [ttl_seconds]    # เปิด tunnel (default ttl=1800, max=3600)
    python vpn-trigger.py <pole> close                 # ปิด tunnel ทันที

ต้องมี: pip install paho-mqtt
creds: ใช้ user ที่ ACL อนุญาต publish smartpole/<pole>/cmd
   - pilot: backend-subscriber (topic readwrite smartpole/#) หรือเพิ่ม user "admin" เฉพาะ
   - production: ควรสั่งผ่าน backend endpoint (authenticated + audit log) แทน script ตรง

ขั้นตอน remote เต็ม (ดู docs/vpn-solution-design.md):
   1) python vpn-trigger.py pole-01 open 1800
   2) เปิด WireGuard tunnel "admin" บน laptop (Activate)
   3) ssh pi@10.99.0.11
   4) เสร็จงาน → python vpn-trigger.py pole-01 close + ปิด WG tunnel
"""

import json
import sys
import time

import paho.mqtt.client as mqtt

BROKER   = "152.42.242.162"
PORT     = 7783
USERNAME = "<admin-mqtt-user>"      # เช่น backend-subscriber
PASSWORD = "<admin-mqtt-pass>"


def build_payload(action: str, ttl: str | None) -> dict:
    payload = {"action": f"vpn-{action}"}
    if action == "open" and ttl:
        payload["ttl"] = int(ttl)
    return payload


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[2] not in ("open", "close"):
        sys.exit("usage: vpn-trigger.py <pole> open [ttl] | <pole> close")
    pole, action = sys.argv[1], sys.argv[2]
    ttl = sys.argv[3] if len(sys.argv) > 3 else None
    payload = build_payload(action, ttl)

    c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    c.username_pw_set(USERNAME, PASSWORD)
    c.connect(BROKER, PORT, 10)
    c.loop_start()
    time.sleep(1)
    c.publish(f"smartpole/{pole}/cmd", json.dumps(payload), qos=1).wait_for_publish()
    print(f"sent {payload} → smartpole/{pole}/cmd")
    time.sleep(1)
    c.loop_stop()
    c.disconnect()


if __name__ == "__main__":
    main()
