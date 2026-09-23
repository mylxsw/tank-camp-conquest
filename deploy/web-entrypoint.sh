#!/bin/sh
set -eu
# Generate /config.json from env so one image works for IP or domain.
# Empty COLYSEUS_URL → client derives ws(s)://<browser-host><COLYSEUS_PATH>
COLYSEUS_PATH="${COLYSEUS_PATH:-/colyseus}"
COLYSEUS_URL="${COLYSEUS_URL:-}"
PUBLIC_HOST="${PUBLIC_HOST:-localhost}"

# Escape for JSON string
json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/config.json <<JSON
{
  "colyseusUrl": "$(json_escape "$COLYSEUS_URL")",
  "colyseusPath": "$(json_escape "$COLYSEUS_PATH")",
  "publicHost": "$(json_escape "$PUBLIC_HOST")"
}
JSON

echo "[tcc-web] wrote config.json publicHost=${PUBLIC_HOST} path=${COLYSEUS_PATH} url=${COLYSEUS_URL:-<auto>}"
