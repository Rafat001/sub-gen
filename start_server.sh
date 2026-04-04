#!/bin/bash
# LiveSubs Offline — launcher
# Starts a local HTTP server and opens the app in your browser.
# Works on macOS, Linux, and Windows (Git Bash / WSL).

PORT=3000
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎙  LiveSubs Offline"
echo "   Serving from: $DIR"
echo "   URL: http://localhost:$PORT"
echo ""
echo "   Press Ctrl+C to stop."
echo ""

# Open browser after a short delay (so the server starts first)
(sleep 1 && \
  if command -v open &>/dev/null; then          # macOS
    open "http://localhost:$PORT"
  elif command -v xdg-open &>/dev/null; then    # Linux
    xdg-open "http://localhost:$PORT"
  elif command -v start &>/dev/null; then       # Windows Git Bash
    start "http://localhost:$PORT"
  fi
) &

# Start server
if command -v python3 &>/dev/null; then
  python3 -m http.server $PORT --directory "$DIR"
elif command -v python &>/dev/null; then
  python -m http.server $PORT --directory "$DIR"
else
  echo "❌ Python not found. Install Python 3 or serve index.html with any HTTP server."
  exit 1
fi
