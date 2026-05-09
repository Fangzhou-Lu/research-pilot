#!/usr/bin/env bash
# Start a local mongod on 127.0.0.1:27017 against MONGO_DBPATH.
# Default: $(brew --prefix)/var/mongodb (Homebrew convention).
# On Apple Silicon → /opt/homebrew/var/mongodb; on Intel → /usr/local/var/mongodb.
# Override with MONGO_DBPATH=/some/path.
set -euo pipefail

if [ -z "${MONGO_DBPATH:-}" ]; then
  if command -v brew >/dev/null 2>&1; then
    MONGO_DBPATH="$(brew --prefix)/var/mongodb"
  elif [ -d /opt/homebrew/var/mongodb ]; then
    MONGO_DBPATH="/opt/homebrew/var/mongodb"
  else
    MONGO_DBPATH="/usr/local/var/mongodb"
  fi
fi

LOG="$MONGO_DBPATH/mongod.log"
PIDFILE="$MONGO_DBPATH/mongod.pid"
mkdir -p "$MONGO_DBPATH"

if nc -z 127.0.0.1 27017 2>/dev/null; then
  echo "MongoDB already up on 127.0.0.1:27017 (dbpath: $MONGO_DBPATH)"
  exit 0
fi

# --fork is unsupported on macOS — daemonise via nohup.
nohup mongod \
  --bind_ip 127.0.0.1 --port 27017 \
  --dbpath "$MONGO_DBPATH" --logpath "$LOG" \
  --pidfilepath "$PIDFILE" \
  >/dev/null 2>&1 &
disown

for i in $(seq 1 20); do
  if nc -z 127.0.0.1 27017 2>/dev/null; then
    echo "MongoDB ready (attempt $i, dbpath: $MONGO_DBPATH)"
    exit 0
  fi
  sleep 0.5
done
echo "MongoDB failed to come up. Last log:"
tail -20 "$LOG" 2>&1 || true
exit 1
