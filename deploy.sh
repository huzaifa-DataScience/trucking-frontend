#!/usr/bin/env bash
# Deploy Next.js app to a server via SSH using your PEM file.
#
# 1. Set these (or pass as env vars):
#    SERVER_HOST   - e.g. 12.34.56.78 or my-server.example.com
#    SERVER_USER   - e.g. ubuntu or ec2-user
#    PEM_PATH      - path to your .pem file (e.g. ~/.ssh/my-key.pem)
#    REMOTE_DIR    - path on server (e.g. /var/www/trucking-frontend)
#
# 2. On the server, once: install Node (v18+), npm, and optionally PM2:
#    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
#    sudo apt-get install -y nodejs
#    sudo npm install -g pm2
#
# 3. Run: ./deploy.sh
#    Or: PEM_PATH=~/.ssh/key.pem SERVER_HOST=1.2.3.4 SERVER_USER=ubuntu ./deploy.sh

set -e

# Config (override with environment variables)
SERVER_HOST="${SERVER_HOST:-}"
SERVER_USER="${SERVER_USER:-ubuntu}"
PEM_PATH="${PEM_PATH:-}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/trucking-frontend}"

if [[ -z "$SERVER_HOST" ]]; then
  echo "Error: SERVER_HOST is not set."
  echo "Example: SERVER_HOST=12.34.56.78 ./deploy.sh"
  exit 1
fi

if [[ -z "$PEM_PATH" ]] || [[ ! -f "$PEM_PATH" ]]; then
  echo "Error: PEM_PATH must point to your .pem file."
  echo "Example: PEM_PATH=~/.ssh/my-key.pem ./deploy.sh"
  exit 1
fi

# Fix PEM permissions (required by SSH)
chmod 400 "$PEM_PATH" 2>/dev/null || true

SSH_OPTS=(-i "$PEM_PATH" -o StrictHostKeyChecking=accept-new)
RSYNC_OPTS=(-avz --delete -e "ssh -i $PEM_PATH -o StrictHostKeyChecking=no")
REMOTE="${SERVER_USER}@${SERVER_HOST}"

echo "→ Creating remote directory..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p $REMOTE_DIR"

echo "→ Syncing project (excluding node_modules, .next, .git)..."
rsync "${RSYNC_OPTS[@]}" \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.env*.local' \
  ./ "${REMOTE}:${REMOTE_DIR}/"

echo "→ Installing dependencies and building on server..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd $REMOTE_DIR && npm ci && npm run build"

echo "→ Restarting app (PM2 or node)..."
ssh "${SSH_OPTS[@]}" "$REMOTE" "cd $REMOTE_DIR && (command -v pm2 >/dev/null 2>&1 && pm2 restart trucking-frontend --update-env || pm2 start npm --name trucking-frontend -- start) || (pkill -f 'node.*next' 2>/dev/null; nohup npm run start > server.log 2>&1 &)"

echo "Done. App should be running on the server."
echo "If using PM2: ssh -i $PEM_PATH $REMOTE 'pm2 status'"
