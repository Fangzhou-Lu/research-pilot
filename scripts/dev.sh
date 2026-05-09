#!/usr/bin/env bash
# One-shot dev launcher: mongod (if needed) + Rust backend + Next.js frontend.
# All processes log to ./logs/. Hit Ctrl-C to stop everything.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGDIR="$ROOT/logs"
mkdir -p "$LOGDIR"

cleanup() {
  echo
  echo "Stopping services…"
  if [ -n "${BACKEND_PID:-}" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "${FRONTEND_PID:-}" ]; then kill "$FRONTEND_PID" 2>/dev/null || true; fi
  bash "$ROOT/scripts/mongo-stop.sh" || true
}
trap cleanup INT TERM EXIT

bash "$ROOT/scripts/mongo-start.sh"

echo "Starting Rust backend on 127.0.0.1:8000…"
( cd "$ROOT/server-rs" && cargo run --release ) >"$LOGDIR/server-rs.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend health
for i in $(seq 1 60); do
  if curl -fsS -m 1 http://127.0.0.1:8000/api/v1/health >/dev/null 2>&1; then
    echo "Backend ready"
    break
  fi
  sleep 0.5
done

echo "Starting Next.js on 127.0.0.1:3000…"
( cd "$ROOT" && npm run dev ) >"$LOGDIR/next.log" 2>&1 &
FRONTEND_PID=$!

echo
echo "─────────────────────────────────────────────"
echo "  Frontend : http://127.0.0.1:3000"
echo "  Backend  : http://127.0.0.1:8000/api/v1/health"
echo "  Logs     : $LOGDIR/"
echo "─────────────────────────────────────────────"
echo "Press Ctrl-C to stop."

wait
