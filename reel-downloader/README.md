# ReelSaver — Instagram Reel Downloader

> A 100% client-side tool that inspects an Instagram Reel link, validates it, and gives **honest, reliable guidance** on the ways to actually keep a copy on your device.

## What it does

- **Validates & identifies** an Instagram Reel link (supports `instagram.com/reel/…`, `instagram.com/p/…`, `instagram.com/tv/…`, and `instagr.am` short links). It extracts the unique Reel shortcode.
- **Best-effort preview** — when Instagram permits it, it shows the Reel's title, creator, and thumbnail via Instagram's public oEmbed endpoint. When blocked (the common case for private videos, or server-side CORS restrictions), it clearly says so instead of pretending.
- **Honest guidance** — from the app's built-in save, to screen capture, to requesting the file from the creator or your own account.

## Why it can't just "download the Reel"

Instagram serves Reel videos behind login and server-side logic. A purely client-side static page:

- cannot authenticate as a user, and
- is blocked by Instagram's CORS policy from calling its private endpoints.

So **no in-browser tool can fetch and save the raw Reel video file** — this isn't a limitation of this page, it's how Instagram works. Anything claiming otherwise is either a remote server API (which costs money and breaks constantly) or is misleading its users.

## How to use

1. Open **ReelSaver**.
2. Paste an Instagram Reel link and press **Inspect**.
3. Verify the link is valid and read the guidance on the realistic ways to keep a copy:
   - **In-app save** (Share → Save video) — reliable and respects the creator.
   - **Screen record** the Reel playing fullscreen.
   - **Ask the creator** or download your **own** Reels from your account.

## Files

```
reel-downloader/
├── index.html      # UI: URL input, result, guidance
├── css/style.css   # Shared light theme
├── js/app.js       # URL validation, shortcode extraction, best-effort oEmbed lookup
└── README.md
```

No external libraries, no data leaves your browser.
