# Grafana monitoring stack

Prometheus + Grafana สำหรับ observability ของ smart-pole backend

## Architecture

```
   backend → exposes /metrics (Prometheus format)
                       ↑
                       │ scrape every 30s
                       │
                   prometheus  (internal docker — ไม่ expose port)
                       ↑
                       │ default datasource
                       │
                    grafana   (127.0.0.1:7795 → nginx /grafana/)
                       ↑
                       │ HTTPS
                       │
                    browser
```

## Access

```
https://152.42.242.162/grafana/
```

**First login:**
- User: `admin`
- Password: ตามที่ตั้งใน `GF_ADMIN_PASSWORD` (default: `changeme-on-first-login`)
- เปลี่ยน password ทันทีที่ login ครั้งแรก (Grafana บังคับ)

## Setup

```bash
# 1. ตั้ง Grafana admin password (ผ่าน root .env บน DO)
ssh root@152.42.242.162 'cd /var/www/smart-pole && grep -q GF_ADMIN_PASSWORD .env || echo "GF_ADMIN_PASSWORD=$(openssl rand -hex 16)" >> .env'

# 2. Pull latest compose + start monitoring stack
ssh root@152.42.242.162 'cd /var/www/smart-pole && \
  mkdir -p volumes/prometheus-data volumes/grafana-data && \
  chown 472:472 volumes/grafana-data && \
  chown 65534:65534 volumes/prometheus-data && \
  docker compose up -d prometheus grafana'

# 3. Reload nginx (รับ /grafana/ path)
scp infra/nginx/smart-pole.conf root@152.42.242.162:/etc/nginx/sites-available/smart-pole.conf
ssh root@152.42.242.162 'nginx -t && systemctl reload nginx'
```

## Metrics ที่ backend export

### Default (จาก prom-client)
- `process_cpu_user_seconds_total` / `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_eventloop_lag_seconds`
- `nodejs_heap_size_total_bytes` / `nodejs_heap_size_used_bytes`
- `nodejs_active_handles_total`
- `nodejs_gc_duration_seconds` (histogram)

### Domain — Smart Pole
- `smart_pole_poles_online` — จำนวนเสา online (gauge, refresh 30s)
- `smart_pole_poles_total` — เสาทั้งหมด (gauge)
- `smart_pole_ws_connections` — WebSocket connections active (gauge, realtime)
- `mqtt_messages_total{sensor_type, result}` — counter ของ MQTT sensor messages
  - `result` = `ok` | `invalid` | `unknown_pole`

### HTTP layer
- `http_requests_total{method, route, status}` — counter
- `http_request_duration_seconds{method, route, status}` — histogram
  - Buckets: `5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s`

Route label มี normalization — `/api/poles/123` → `/api/poles/:id` (กัน cardinality blow-up)

## Built-in dashboard

`Smart Pole — Overview` — folder: `Smart Pole`

Panels:
1. **Poles** (stat) — Online / Offline
2. **WebSocket connections** (stat)
3. **MQTT sensor messages / sec** — by result (ok/invalid/unknown)
4. **HTTP request rate** — by status code
5. **HTTP latency** — p50 + p95 by route
6. **Backend memory** — RSS + heap used

## เพิ่ม Dashboard ใหม่

```bash
# 1. สร้าง JSON ใน infra/grafana/dashboards/
# 2. commit + push → CI deploy
# 3. ssh + restart grafana (provisioning reload)
ssh root@152.42.242.162 'cd /var/www/smart-pole && docker compose restart grafana'
```

## Troubleshooting

### Grafana login ไม่ได้
```bash
ssh root@152.42.242.162 'docker logs smart-pole-grafana 2>&1 | tail -20'
# Reset admin password
ssh root@152.42.242.162 'docker exec smart-pole-grafana grafana-cli admin reset-admin-password <new-pass>'
```

### Prometheus ไม่ scrape backend
```bash
# ดู scrape status
curl http://prometheus:9090/api/v1/targets   # (จาก docker network)
# หรือ port-forward
ssh root@152.42.242.162 'docker exec smart-pole-prometheus wget -qO- http://backend:7766/metrics | head -20'
```

### Dashboard ไม่โผล่
```bash
# ตรวจ provisioning log
ssh root@152.42.242.162 'docker logs smart-pole-grafana 2>&1 | grep -i dashboard'
# Reload
ssh root@152.42.242.162 'docker compose restart grafana'
```

## เพิ่ม Exporters ภายหลัง

### node_exporter (system metrics — CPU/RAM/Disk)
```yaml
# docker-compose.yml
node-exporter:
  image: prom/node-exporter:latest
  pid: host
  volumes:
    - /:/host:ro,rslave
  command:
    - --path.rootfs=/host
    - --collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)
```

Then add to prometheus.yml:
```yaml
- job_name: node
  static_configs:
    - targets: ['node-exporter:9100']
```

### Mosquitto exporter
```yaml
mosquitto-exporter:
  image: sapcc/mosquitto-exporter:latest
  environment:
    BROKER_ENDPOINT: tcp://mosquitto:1883
    MQTT_USER: $MQTT_USERNAME
    MQTT_PASS: $MQTT_PASSWORD
```

### Postgres exporter
```yaml
postgres-exporter:
  image: quay.io/prometheuscommunity/postgres-exporter:latest
  environment:
    DATA_SOURCE_NAME: $DATABASE_URL
```

## Retention

Prometheus storage: **15 วัน** (ตั้งใน docker-compose.yml — `--storage.tsdb.retention.time=15d`)

Grafana data (dashboards + users): persistent volume `./volumes/grafana-data/`
