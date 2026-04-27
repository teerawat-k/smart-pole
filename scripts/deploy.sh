#!/usr/bin/env bash
# Manual UAT deploy helper — รันบน UAT host
set -euo pipefail

cd "$(dirname "$0")/.."

: "${DOCKERHUB_USERNAME:?DOCKERHUB_USERNAME is required}"
: "${IMAGE_TAG:=uat-latest}"

docker network create smart-pole-network 2>/dev/null || true
docker compose pull
docker compose up -d --force-recreate
docker compose ps
