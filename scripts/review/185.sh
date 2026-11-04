#!/usr/bin/env bash
# Review #185: one browser bar. Runs the browser tests and tsc, then starts this branch in Electron
# on throwaway ports with its own profile (your running DevOrbit stays untouched). Ctrl+C stops all.
set -euo pipefail
cd "$(dirname "$0")/../.."

VITE_PORT="${VITE_PORT:-3298}"
SERVER_PORT="${SERVER_PORT:-3299}"
PROFILE="$(mktemp -d -t review-185)"
pids=()
# bunx forks vite as a child: stop children first, then the launcher
cleanup() {
  for p in ${pids[@]+"${pids[@]}"}; do pkill -P "$p" 2>/dev/null || true; kill "$p" 2>/dev/null || true; done
  rm -rf "$PROFILE"
}
trap cleanup EXIT INT TERM

[ -d node_modules ] || bun install

bunx vitest run test/browserToolbar.test.tsx test/pullRequestsView.test.tsx
bunx tsc --noEmit

export VITE_PORT SERVER_PORT NODE_ENV=development
# Some shells leak this in; it turns Electron into plain node
unset ELECTRON_RUN_AS_NODE

bunx vite --port "$VITE_PORT" >"$PROFILE/vite.log" 2>&1 &
pids+=($!)
for _ in $(seq 1 30); do curl -sf -o /dev/null "http://localhost:$VITE_PORT/" && break; sleep 1; done

node_modules/.bin/electron . --user-data-dir="$PROFILE/ud" >"$PROFILE/electron.log" 2>&1 &
pids+=($!)

cat <<EOUT

Electron-Fenster (kein Login; UI http://localhost:$VITE_PORT, API :$SERVER_PORT):
  - Shell-Browser rechts öffnen: genau eine Leiste (Refresh, URL, 3 Viewport-Icons, DevTools, Systembrowser, X)
  - Header "n open PRs" > Maximize > PR anklicken: Pane ohne eigene Titelleiste, "Own tab" + X in der Leiste
  - Viewport-Icons und DevTools klicken; Seite beginnt direkt unter der Leiste
Beenden: Ctrl+C
EOUT
wait
