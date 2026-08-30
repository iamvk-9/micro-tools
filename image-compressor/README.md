# ImgCompress — Image Compressor

A micro, 100% client-side image compressor. Reduce JPG / PNG / WebP file sizes with an adjustable quality slider and see the before/after size. Nothing is uploaded.

Open `index.html`, or serve the folder (`npx serve .`).

## Features
- Drop multiple images at once (JPG, PNG, WebP)
- Adjustable quality (10–100%) with live re-compression
- Choose output format (JPG / WebP / PNG)
- Per-file before → after size + savings, and a Download all button

## Files
```
index.html   page + layout + dropzone
css/style.css
js/app.js    canvas re-encoding, file cards, downloads
```
No external libraries — uses the browser's native canvas.
