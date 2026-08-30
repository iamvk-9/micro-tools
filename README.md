# Micro Tools

A collection of small, **100% client-side** browser utilities. Every tool runs entirely on your device — files and text never leave your browser, there is no server and nothing is uploaded.

Hosted live on GitHub Pages: **https://iamvk-9.github.io/micro-tools/**

## Tools

| # | Tool | Folder | What it does |
|---|------|--------|--------------|
| 1 | QR Code Generator | `qr/` | Text, links & image metadata → QR code (PNG / SVG) |
| 2 | Image Compressor | `image-compressor/` | Reduce image file size with adjustable quality |
| 3 | Image Resizer | `image-resizer/` | Resize images by pixels or percentage |
| 4 | PDF ⇄ Word | `pdf-converter/` | Word → PDF and PDF → Word (text extraction) |
| 5 | PDF Merge & Split | `pdf-merge-split/` | Merge PDFs and split into pages / ranges |
| 6 | FileToPDF | `wordtopdf/` | Images, text, Word, Excel, HTML → PDF |
| 7 | Text Case Converter | `text-case/` | Uppercase, lowercase, title, camel, snake, kebab… |
| 8 | Word & Character Counter | `word-counter/` | Words, chars, sentences, reading time |
| 9 | Duplicate Text Remover | `duplicate-remover/` | Remove duplicate lines from a text list |
| 10 | Password Generator | `password-generator/` | Strong random passwords, exportable |
| 11 | Random Number Generator | `random-number/` | Random numbers in a range, with/without repeats |

## Run locally

Just double-click any tool's `index.html`, or serve the whole folder:

```sh
npx serve .
```

## Libraries (vendored, pinned)

All libraries are bundled in each tool's `libs/` folder so every tool works offline:

- pdf-lib 1.17.1 — PDF generation, merge, split
- pdf.js (pdfjs-dist 3.11.174 legacy) — PDF text extraction
- html2canvas 1.4.1 — DOM rasterization
- jszip 3.10.1 — zip container (docx dependency)
- docx-preview 0.3.2 — Word rendering
- SheetJS (xlsx) 0.20.3 — spreadsheet parsing
- qrcode-generator 1.4.4 — QR encoding

## Privacy

Everything runs in your browser tab. Files are never transmitted. None of these tools require an internet connection once loaded.
