# ImgResize — Image Resizer

A micro, 100% client-side image resizer. Change image dimensions by exact pixels or a percentage, with an optional aspect-ratio lock. Preview before downloading. Nothing is uploaded.

Open `index.html`, or serve the folder (`npx serve .`).

## Features
- Resize by pixels (width × height) or by percent
- Keep-aspect-ratio lock auto-fills the other dimension
- Preview the image and original dimensions
- Output as JPG / PNG / WebP

## Files
```
index.html   page + layout + dropzone + editor
css/style.css
js/app.js    image load, ratio math, canvas resize
```
No external libraries — uses the browser's native canvas.
