# PDFConverter — PDF ⇄ Word

A micro, 100% client-side converter with two directions:
- **Word → PDF**: renders a `.docx` and writes a PDF (matches the live document closely, rasterized).
- **PDF → Word**: extracts the text of a PDF into a Word-openable `.doc` document.

Nothing is uploaded.

Open `index.html`, or serve the folder (`npx serve .`).

## Honest limits
- Word → PDF output is rasterized (like a screenshot) — zoomed text is not re-selectable.
- PDF → Word is a text-extraction conversion: complex layouts, images and tables aren't preserved as editable elements. For a fully editable, faithful conversion use a server-side renderer (LibreOffice).

## Files
```
index.html          page + tabs
css/style.css
js/app.js           both conversion paths + downloads
js/render.js        html2canvas → PDF pipeline (Word → PDF)
libs/pdf.min.js + worker   pdf.js 3.11.174 — text extraction
libs/pdf-lib.min.js        PDF generation
libs/docx-preview / html2canvas / jszip   Word rendering
```
