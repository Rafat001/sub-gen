# LiveSubs Offline

Generate `.srt` subtitle files from any video or audio file using local AI. No internet required after setup, no API keys, nothing leaves your machine.

---

## How it works

1. Browser decodes the video/audio file into a 16kHz mono WAV (no ffmpeg needed)
2. The WAV is split into 30s chunks and sent to a local Whisper server for transcription
3. Segments are optionally translated via a local LibreTranslate server
4. A properly timestamped `.srt` file is built and downloaded

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Node.js](https://nodejs.org) v18+
- A modern browser (Chrome, Firefox, Edge, Safari)

---

## Setup

**1. Clone or unzip the project, then configure:**

```bash
cp .env.example .env
# Edit .env if you need to change ports (e.g. WHISPER_PORT, LIBRETRANSLATE_PORT)
```

**2. Start the Docker services:**

```bash
docker compose up -d
```

This pulls and starts two containers:
- `faster-whisper-server` on port 8080 — transcription
- `libretranslate` on port 5050 — translation

First run downloads ~2 GB of images and ~500 MB of model weights. Subsequent starts are instant.

**3. Install dependencies and start the app:**

```bash
npm install
npm run dev
# Opens http://localhost:3000
```

---

## Configuration

All ports and settings live in `.env`:

```
WHISPER_PORT=8080
WHISPER_MODEL=Systran/faster-whisper-small
LIBRETRANSLATE_PORT=5050
LT_LANGUAGES=en,es,fr,de,it,pt,ja,ko,zh,ru,ar,hi,bn

VITE_WHISPER_URL=http://localhost:8080/v1/audio/transcriptions
VITE_TRANSLATE_URL=http://localhost:5050/translate
```

After changing ports, update the `VITE_` URLs to match, then restart Docker:
```bash
docker compose up -d --force-recreate
```

---

## Caveats

- **Wait for the green dots** before generating. Whisper lazy-loads its model on first request (~2 min cold start). The footer shows "loading model…" while it warms up.
- **Keep parallel workers at 1 on CPU.** Whisper is single-threaded. Multiple concurrent requests cause timeouts and crash the server.
- **Use 30s chunks.** Smaller chunks are faster but less accurate. Larger than 60s rarely helps.
- **Set source language explicitly** if you know it. Auto-detect confuses similar scripts (Bengali, Telugu, Hindi).
- **Whisper hallucinates on silence and music** — repeated characters or comma-spam. These are filtered automatically but some may slip through.
- **Large files need RAM.** The browser decodes the entire file into memory. 2+ GB files may struggle on machines with less than 8 GB RAM.
- **macOS only: port 5000 is taken by AirPlay Receiver.** LibreTranslate defaults to 5050 to avoid this.
- **Translation quality varies.** Common pairs (any language → English) are good. Less common pairs may be rough.
- **CPU is slow.** A 20-minute video takes ~8–12 minutes with the small model. This is normal — it's running AI inference locally.