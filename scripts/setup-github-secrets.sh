#!/usr/bin/env bash
# Bootstrap GitHub secrets/variables (placeholders) สำหรับ Smart Pole CI/CD
# - สร้าง environments: uat_dev_site, production
# - สร้าง repo secrets/vars + environment secrets/vars (เป็นค่า placeholder)
# - ตามไปแก้ค่าจริงผ่าน GitHub UI หรือ `gh secret set <name> --env <env>`
#
# Usage:
#   bash scripts/setup-github-secrets.sh
#
# Re-run ได้ปลอดภัย — gh จะ overwrite ค่าเดิม

set -e

REPO="teerawat-k/smart-pole"
PLACEHOLDER="__SET_ME__"

echo "🔧 Repo: $REPO"

# ─── Repository secrets ─────────────────────────────────
REPO_SECRETS=(
  "DOCKERHUB_USERNAME"
  "DOCKERHUB_TOKEN"
  "DISCORD_WEBHOOK"
)

echo ""
echo "🔴 Repository secrets..."
for s in "${REPO_SECRETS[@]}"; do
  echo "  • $s"
  gh secret set "$s" --repo "$REPO" --body "$PLACEHOLDER" >/dev/null
done

# ─── Environments ───────────────────────────────────────
echo ""
echo "🌍 Creating environments via REST API..."
for env in uat_dev_site production; do
  gh api -X PUT "repos/$REPO/environments/$env" >/dev/null
  echo "  • $env"
done

# ─── Environment secrets (per env) ──────────────────────
ENV_SECRETS=(
  "SERVER_HOST"
  "SERVER_USER"
  "SERVER_PORT"
  "SSH_PRIVATE_KEY"
  "COMPOSE_PATH"
  "DATABASE_URL"
  "JWT_SECRET"
  "MQTT_USERNAME"
  "MQTT_PASSWORD"
  "SRS_DVR_TOKEN"
)

for env in uat_dev_site production; do
  echo ""
  echo "🔴 [$env] Environment secrets..."
  for s in "${ENV_SECRETS[@]}"; do
    echo "  • $s"
    gh secret set "$s" --repo "$REPO" --env "$env" --body "$PLACEHOLDER" >/dev/null
  done
done

# ─── Environment variables (public) ─────────────────────
declare -A ENV_VARS=(
  ["NEXT_PUBLIC_API_URL"]="https://api.example.com"
  ["NEXT_PUBLIC_WS_URL"]="wss://api.example.com/ws"
  ["NEXT_PUBLIC_HLS_BASE"]="https://stream.example.com"
  ["NEXT_PUBLIC_PROJECT_PREFIX"]="smart-pole"
  ["BACKEND_PORT"]="7766"
  ["FRONTEND_PORT"]="7765"
  ["SRS_API_PORT"]="7785"
  ["CORS_ORIGIN"]="https://app.example.com"
  ["MQTT_BROKER_URL"]="mqtt://mosquitto:1883"
  ["SRS_HLS_BASE"]="http://srs:8080"
  ["JWT_ACCESS_EXPIRES"]="15m"
  ["JWT_REFRESH_EXPIRES"]="7d"
  ["LOG_LEVEL"]="info"
  ["POLE_OFFLINE_THRESHOLD_MINUTES"]="5"
)

for env in uat_dev_site production; do
  echo ""
  echo "🟢 [$env] Environment variables..."
  for name in "${!ENV_VARS[@]}"; do
    val="${ENV_VARS[$name]}"
    echo "  • $name = $val"
    gh variable set "$name" --repo "$REPO" --env "$env" --body "$val" >/dev/null
  done
done

echo ""
echo "✅ Done. ตามไปกรอกค่าจริงที่:"
echo "   https://github.com/$REPO/settings/secrets/actions"
echo "   https://github.com/$REPO/settings/environments"
