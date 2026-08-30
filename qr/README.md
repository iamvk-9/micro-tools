# QRany — QR Code Generator

A micro, 100% client-side web tool that generates QR codes from text and URLs — no server, no uploads, no installs. Open `index.html` and it works, even offline.

## Run it

Just double-click `index.html`, or serve the folder:

```sh
npx serve .
```

## What you can encode

| Source | What gets encoded |
|---|---|
| Text / URL | Anything you type (up to ~2900 characters) |

## Options

- **Error correction**: L (7%), M (15%), Q (25%), H (30%) — higher = more damage-resistant but denser codes.
- **Pixel size**: 4x to 16x rendered module size.
- **Foreground / Background**: custom colors.
- **Output format**: PNG (raster) or SVG (vector, scalable).

## File layout

```
index.html               page + layout
css/style.css            ILovePDF-inspired light theme
js/app.js                QR generation, preview, download/copy
libs/qrcode-generator.js vendored QR encoder (works offline)
```

## Library (vendored, pinned)

- qrcode-generator 1.4.4 (Kazuhiko Arase) — MIT-licensed, QR encoding.

## Privacy

All generation happens in your browser tab. Nothing is ever transmitted.

## Known limits

- Standard QR codes hold roughly 2900 characters max — larger input is rejected with a clear message.
