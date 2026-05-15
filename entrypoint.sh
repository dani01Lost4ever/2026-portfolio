#!/bin/sh
# Write runtime environment config before nginx starts.
# PB_URL can be set via docker-compose `environment:` without rebuilding the image.
cat > /usr/share/nginx/html/env-config.js <<EOF
window._env_ = {
  PB_URL: "${PB_URL:-http://localhost:8090}"
};
EOF

exec nginx -g 'daemon off;'
