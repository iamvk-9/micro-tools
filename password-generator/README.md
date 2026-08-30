# PassGen — Password Generator

A micro, 100% client-side password generator using the browser's cryptographically-secure random API. Customizable length and character sets, with an option to exclude ambiguous characters (Il1O0). Generate one password or a batch, then copy or export to a `.txt`.

Open `index.html`, or serve the folder (`npx serve .`).

## Features
- Length 4–64
- Toggle uppercase, lowercase, numbers, symbols
- Exclude ambiguous characters
- Generate 1, 5, 10 or 20 at once
- Copy to clipboard, export as .txt

## Files
```
index.html
css/style.css
js/app.js    crypto-random generation + export
```
No external libraries.
