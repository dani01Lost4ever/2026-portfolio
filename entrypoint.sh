#!/bin/sh
set -eu

# Inject runtime env for the frontend (consumed by src/lib/pb.ts).
# Empty PB_URL = same origin: nginx proxies /api/ to the PocketBase container.
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  PB_URL: "${PB_URL:-}"
};
EOF

exec nginx -g "daemon off;"
