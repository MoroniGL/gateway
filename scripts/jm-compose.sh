#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
keychain_account=${USER:-jm-gateway}

keychain_value() {
  service=$1
  bytes=$2
  if value=$(security find-generic-password -a "$keychain_account" -s "$service" -w 2>/dev/null); then
    printf '%s' "$value"
    return
  fi
  value=$(openssl rand -hex "$bytes")
  security add-generic-password -a "$keychain_account" -s "$service" -w "$value" -U >/dev/null
  printf '%s' "$value"
}

db_password=$(keychain_value com.jmcleaning.gateway.database 32)
auth_secret=$(keychain_value com.jmcleaning.gateway.auth 48)
export GATEWAY_DB_NAME=wa_gateway
export GATEWAY_DB_USER=wa_gateway
export GATEWAY_DB_PASSWORD=$db_password
export GATEWAY_DATABASE_URL="postgresql://wa_gateway:${db_password}@postgres:5432/wa_gateway?schema=public"
export GATEWAY_AUTH_SECRET=$auth_secret
: "${GATEWAY_PUBLIC_URL:?Set GATEWAY_PUBLIC_URL to the HTTPS tunnel URL}"
export GATEWAY_PUBLIC_URL

if [ "${1:-}" = "provision" ]; then
  : "${JM_GATEWAY_ADMIN_EMAIL:?Set JM_GATEWAY_ADMIN_EMAIL before provisioning}"
  admin_password=$(keychain_value com.jmcleaning.gateway.admin-password 24)
  if api_key=$(security find-generic-password -a "$keychain_account" -s com.jmcleaning.gateway.api-key -w 2>/dev/null); then
    :
  else
    api_key="wag_$(openssl rand -hex 24)"
    security add-generic-password -a "$keychain_account" -s com.jmcleaning.gateway.api-key -w "$api_key" -U >/dev/null
  fi
  exec docker compose -f "$script_dir/docker-compose.jm.yml" exec \
    -e JM_GATEWAY_ADMIN_EMAIL="$JM_GATEWAY_ADMIN_EMAIL" \
    -e JM_GATEWAY_ADMIN_PASSWORD="$admin_password" \
    -e JM_GATEWAY_API_KEY="$api_key" \
    gateway node scripts/setup-jm-integration.js
fi

exec docker compose -f "$script_dir/docker-compose.jm.yml" "$@"
