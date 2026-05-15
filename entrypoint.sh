#!/bin/sh
set -eu

# Inject runtime env for the frontend (consumed by src/lib/pb.ts).
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  PB_URL: "${PB_URL:-http://127.0.0.1:8090}"
};
EOF

exec nginx -g "daemon off;"