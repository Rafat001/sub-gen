#!/bin/bash
# LiveSubs Offline — launcher
# Installs deps if needed, starts Vite dev server, opens browser.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🎙  LiveSubs Offline"
echo ""

# Install deps if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies (first run only)…"
  npm install
  echo ""
fi

echo "🚀 Starting dev server at http://localhost:3000"
echo "   Press Ctrl+C to stop."
echo ""

npm run dev
