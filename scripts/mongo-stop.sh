#!/usr/bin/env bash
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

PIDFILE="$MONGO_DBPATH/mongod.pid"
if [ -f "$PIDFILE" ]; then
  PID="$(cat "$PIDFILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Stopped mongod pid=$PID"
  else
    echo "PID $PID not running"
  fi
  rm -f "$PIDFILE"
else
  pkill -x mongod 2>/dev/null || true
  echo "No PID file; pkill attempted"
fi
