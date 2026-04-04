# LiveSubs Offline — Local SRT Generator

Generate `.srt` subtitle files from any video or audio file using local AI.
Everything runs on your machine — no internet required after first setup, no API keys, no data leaving your computer.

---

## How it works

```
Your video file
      │
      ▼
Browser decodes audio        (Web Audio API — no ffmpeg needed)
      │
      ▼
Whisper transcribes          (faster-whisper running in Docker)
      │
      ▼
LibreTranslate translates    (optional, also in Docker)
      │
      ▼
Download .srt file
```

---

## Requirements

- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Python 3** — for the local web server (comes pre-installed on macOS and most Linux)
- A modern browser (Chrome, Firefox, Edge, Safari)

That's it. No Node.js, no ffmpeg, no Homebrew packages.

---

## First-time setup

### 1. Start the Docker services

```bash
docker compose up -d
```

This pulls two images and starts them in the background:

| Service | What it does | Port |
|---|---|---|
| `faster-whisper-server` | Transcribes audio to text | 8080 |
| `libretranslate` | Translates between languages | 5050 |

**First run takes time.** The images need to download (~2 GB total), and the Whisper model (~500 MB) downloads on first use. Expect 5–10 minutes on a decent connection. Subsequent starts are instant.

### 2. Launch the web app

```bash
chmod +x start_server.sh # one time only
./start_server.sh
```

This starts a local server and opens `http://localhost:3000` in your browser automatically.

> **Why not just double-click `index.html`?**
> Browsers block network requests from `file://` pages for security reasons. The local server gets around this. You must always open via `http://localhost:3000`, never from the file system directly.

---

## Everyday usage

Once set up, your workflow is just two commands:

```bash
docker compose up -d   # start services (skip if already running)
./start_server.sh      # open the app
```

### Step-by-step in the UI

1. **Wait for the green dots** in the footer — both Whisper and LibreTranslate must show online before you start. Whisper loads its model on the first request after startup, which takes about 2 minutes — the dot will show `loading model…` during this time.

2. **Drop your video or audio file** onto the drop zone, or click to browse. Supported formats: MP4, MKV, MOV, AVI, WEBM, MP3, WAV, M4A — anything your browser can decode.

3. **Configure settings** (left panel):

   | Setting | Recommendation |
   |---|---|
   | Source language | Set explicitly if you know it (e.g. Spanish). Auto-detect works but can mis-identify similar scripts. |
   | Whisper server URL | Leave as default unless you changed ports |
   | Chunk size | 30s is the best balance. Larger = more accurate but slower per chunk. |
   | Parallel workers | Keep at **1** on CPU. Whisper is single-threaded — more workers just time out. |
   | Translate | Toggle on/off. Set target language. Auto-detect source is more reliable than trusting Whisper's label. |

4. **Click Generate SRT** and watch the progress. For a 21-minute video at 30s chunks, expect roughly 8–12 minutes total on a modern Mac/PC without a GPU.

5. **Download the `.srt`** file. It will be named after your video file automatically.

---

## Settings explained

### Chunk size
Whisper processes audio in chunks. Larger chunks give Whisper more context and produce more accurate transcripts, but each chunk takes longer.

- **10s** — fastest, least accurate, good for testing
- **30s** — recommended default
- **60s** — better for dense speech, slower

### Parallel workers
The number of audio chunks sent to Whisper simultaneously.

- **CPU (no GPU): always use 1.** Whisper on CPU is inherently single-threaded. Sending multiple chunks in parallel doesn't make it faster — it just means multiple requests compete for the same resource, causing timeouts and crashes.
- **GPU:** you can try 2–4, but even then Whisper serialises internally.

Translation workers are set automatically to 2× this value — LibreTranslate handles parallel requests much better.

### Source language
If left on auto-detect, Whisper determines the language from the audio. This works well for major languages but struggles with:
- South Asian scripts (Bangla, Telugu, Hindi look similar to Whisper's small model)
- Mixed-language content
- Low-quality audio

**Always set this explicitly when you know the source language.**

---

## Stopping the services

```bash
docker compose down
```

The downloaded models are saved in Docker volumes and persist between restarts — you won't need to re-download them.

To stop without losing data:
```bash
docker compose stop    # pauses containers, keeps data
docker compose start   # resume later
```

To completely reset and remove everything (models will re-download):
```bash
docker compose down -v
```

---

## Changing the Whisper model

Edit `docker-compose.yml` and change the `WHISPER__MODEL` line:

```yaml
- WHISPER__MODEL=Systran/faster-whisper-small    # default, fast
- WHISPER__MODEL=Systran/faster-whisper-medium   # more accurate, ~3-4 min/chunk on CPU
- WHISPER__MODEL=Systran/faster-whisper-large-v3 # most accurate, not viable on CPU
```

Then restart:
```bash
docker compose up -d --force-recreate whisper
```

> On CPU, `small` is the only practical model. `medium` takes 3–4 minutes per 30-second chunk, meaning a 20-minute video would take 4+ hours. Use `medium` or `large` only if you have a GPU.

---

## Adding or changing translation languages

LibreTranslate pre-loads languages on startup. To add a language, edit `docker-compose.yml`:

```yaml
- LT_LOAD_ONLY=en,es,fr,de,it,pt,ja,ko,zh,ru,ar,hi,bn,your_code_here
```

Then restart LibreTranslate:
```bash
docker compose up -d --force-recreate libretranslate
```

Common codes: `tr` (Turkish), `pl` (Polish), `uk` (Ukrainian), `vi` (Vietnamese), `id` (Indonesian), `sw` (Swahili).

---

## Caveats and known limitations

### Accuracy
- **Whisper `small` hallucinates on silence and background music.** You'll sometimes see repeated characters, strings of commas, or phrases like "no, no, no..." in silent sections. The app filters the most obvious cases, but some may slip through.
- **Language detection is unreliable for similar scripts.** Bengali, Telugu, Hindi, and other South Asian languages look similar to the small model. Always set the source language explicitly.
- **Accented speech, heavy background noise, and low-quality audio** reduce accuracy significantly.
- **The `small` model does not understand context across chunks.** Each 30-second chunk is processed independently, so sentences that span a chunk boundary may be cut awkwardly.

### Performance
- **CPU is slow.** A 20-minute video takes ~8–12 minutes on modern hardware with the small model. This is not a bug — it's the nature of running AI inference on a CPU.
- **No GPU support in this setup.** The Docker image uses CPU only. Adding GPU support requires the NVIDIA container toolkit and changing `WHISPER__INFERENCE_DEVICE=cuda` in `docker-compose.yml`.
- **Large files need RAM.** The browser decodes the entire video into memory before processing. Files over ~2 GB may cause issues on machines with less than 8 GB RAM.
- **Do not use parallel workers > 1 on CPU.** Multiple concurrent requests will all time out, crash the Whisper server, and cause every remaining chunk to fail.

### Translation
- **LibreTranslate quality varies by language pair.** Common pairs (Spanish↔English, French↔English) are good. Less common pairs may produce awkward translations.
- **LibreTranslate 400 errors** usually mean the detected source language doesn't match what's loaded. The app uses auto-detect mode for translation which is more robust than trusting Whisper's label.

### Browser and file format
- **Must be served via HTTP, not opened as a file.** Always use `./start_server.sh` and `http://localhost:3000`. Opening `index.html` directly will fail with CORS errors.
- **File format support depends on your browser.** Most common formats work. Some MKV files with unusual codecs may fail — convert to MP4 first with HandBrake or ffmpeg if needed.
- **Very long videos** (2+ hours) may be slow to decode in the browser. Audio extraction decodes the entire file at once.

### macOS specific
- **Port 5000 is taken by AirPlay Receiver** on macOS Monterey and later. This is why LibreTranslate uses port 5050. If you see "address already in use" for any port, check System Settings → AirDrop & Handoff.
- **Docker Desktop must be running** before `docker compose`. Enable "Start at Login" in Docker Desktop settings if you want it always available.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Whisper shows offline | Wait 2 min after startup for model to load. Check `docker logs subtitle_whisper`. |
| LibreTranslate shows offline | Run `docker compose up -d`. Check if port 5050 is free. |
| "Failed to fetch" on all chunks | Whisper crashed from parallel overload. Run `docker compose restart whisper`. Set workers to 1. |
| All chunks produce empty text | Source language mismatch. Set language explicitly in the UI. |
| SRT has commas or repeated characters | Whisper hallucination on silence. These are auto-filtered — increase chunk size to 60s to reduce gaps. |
| Browser can't decode the file | Convert to MP4 first using HandBrake or `ffmpeg -i input.mkv output.mp4`. |
| "address already in use" on port 8080 | Change to a free port in `docker-compose.yml`: `"8081:8000"` and update the URL in the app. |

---

## File overview

```
├── docker-compose.yml   — defines the Whisper and LibreTranslate Docker services
├── index.html           — the web app (UI + all processing logic)
└── start_server.sh      — starts local HTTP server and opens browser
```