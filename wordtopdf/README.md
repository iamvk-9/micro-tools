# FileToPDF

A micro, 100% client-side web tool that converts files to PDF — in the style of ILovePDF's convert page. No server, no uploads, no installs. Open `index.html` and it works, even offline.

## Run it

Just double-click `index.html`, or serve the folder:

```sh
npx serve .
```

## Supported formats

| Format | Method | Output |
|---|---|---|
| PNG, JPG, GIF, WEBP, BMP, SVG, ICO, AVIF | canvas / lossless embed | crisp vector PDF |
| TXT, MD, code, CSV, JSON, XML, YAML, logs | Courier text drawing | crisp, selectable |
| HTML | sandboxed iframe render | rasterized pages |
| DOCX | docx-preview page render | rasterized pages |
| XLSX, XLS, XLSM, ODS | SheetJS → styled table | rasterized pages |
| PDF | copied as-is | identity |

Anything else with a text-like content decodes as text; unrecognized binary types get a clear error. **PowerPoint (.pptx) and legacy .doc are the honest gaps** — faithful conversion needs a server-side renderer (LibreOffice) and is deliberately out of scope here.

## Fidelity notes

- Images, text files and PDFs are **true vector** output (selectable, crisp at any zoom).
- Word, Excel and HTML are rasterized via `html2canvas`, like a screenshot — visually faithful, but zoomed text is not re-selectable.
- Render quality (Fast / Balanced / High) controls the raster scale.

## File layout

```
index.html          page + layout
css/style.css       ILovePDF-inspired light theme
js/app.js           dropzone, file cards, conversion/merge orchestration
js/converters.js    extension → converter dispatch (+ HTML path)
js/render.js        html2canvas → PDF pipeline (page / slice / multi-page)
js/image.js         image → PDF
js/text.js          plain text → vector PDF
js/docx.js          docx → PDF
js/xlsx.js          xlsx/xls/ods → PDF
libs/               vendored, pinned libraries (work offline)
```

## Libraries (vendored, pinned)

- pdf-lib 1.17.1 — PDF generation/merge
- html2canvas 1.4.1 — DOM rasterization
- jszip 3.10.1 — zip container (docx dependency)
- docx-preview 0.3.2 — Word rendering
- SheetJS (xlsx) 0.20.3 — spreadsheet parsing

## Privacy

All conversion happens in your browser tab. Files are never transmitted.