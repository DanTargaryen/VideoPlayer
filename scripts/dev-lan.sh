#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

detect_lan_host() {
  if command -v ipconfig >/dev/null 2>&1; then
    local iface=""
    for iface in en0 en1; do
      local value=""
      value="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
      if [[ -n "$value" ]]; then
        echo "$value"
        return 0
      fi
    done
  fi

  if command -v hostname >/dev/null 2>&1; then
    local value=""
    value="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
    if [[ -n "$value" ]]; then
      echo "$value"
      return 0
    fi
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    local value=""
    value="$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)"
    if [[ -n "$value" ]]; then
      echo "$value"
      return 0
    fi
  fi

  return 1
}

ensure_https_cert() {
  local host="$1"
  local cert_dir="$ROOT_DIR/.certs"
  local cert_file="${DEV_HTTPS_CERT:-$cert_dir/dev-lan.pem}"
  local key_file="${DEV_HTTPS_KEY:-$cert_dir/dev-lan-key.pem}"

  if [[ -f "$cert_file" && -f "$key_file" ]]; then
    export VITE_DEV_HTTPS_CERT="$cert_file"
    export VITE_DEV_HTTPS_KEY="$key_file"
    return 0
  fi

  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to create a local HTTPS certificate."
    echo "Install OpenSSL, or set DEV_HTTPS_CERT and DEV_HTTPS_KEY to existing certificate files."
    exit 1
  fi

  mkdir -p "$cert_dir"
  openssl req \
    -x509 \
    -newkey rsa:2048 \
    -sha256 \
    -days 825 \
    -nodes \
    -keyout "$key_file" \
    -out "$cert_file" \
    -subj "/CN=$host" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$host" >/dev/null 2>&1

  export VITE_DEV_HTTPS_CERT="$cert_file"
  export VITE_DEV_HTTPS_KEY="$key_file"
}

LAN_HOST="${LAN_HOST:-${HOST_IP:-}}"
if [[ -z "$LAN_HOST" ]]; then
  LAN_HOST="$(detect_lan_host || true)"
fi

if [[ -z "$LAN_HOST" ]]; then
  echo "Unable to detect a LAN IP. Rerun with LAN_HOST=your.ip.address npm run dev:lan"
  exit 1
fi

ensure_https_cert "$LAN_HOST"

export LAN_HOST
export SRS_CANDIDATE="${SRS_CANDIDATE:-$LAN_HOST}"
export VITE_DEV_HTTPS=true
export VITE_DEV_HOST=0.0.0.0
export VITE_DEV_PORT="${VITE_DEV_PORT:-5173}"

echo "Starting LAN dev mode."
echo "Frontend: https://$LAN_HOST:${VITE_DEV_PORT}"
echo "SRS candidate: $SRS_CANDIDATE"
echo "The browser may ask you to trust the local development certificate."

exec bash "$ROOT_DIR/scripts/dev.sh"
