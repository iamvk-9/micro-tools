/*
 * render.js — shared html2canvas → PDF pipeline.
 * Used by DOM-based converters (docx, xlsx, html) for uniform output.
 * Must run in a real browser (needs window, PDFLib, html2canvas).
 */
window.RenderHtml = (() => {
  'use strict';

  const PAGE_W = 612;   // US Letter, points
  const PAGE_H = 792;
  const MARGIN_TOP = 40;
  const MARGIN_BOTTOM = 40;

  async function canvasToPngBytes(canvas) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }

  function hexRgb(hex) {
    const h = hex.replace('#', '');
    return PDFLib.rgb(
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    );
  }

  /*
   * Render a page element for the given canvas into exactly one PDF page.
   * The PDF page matches the element's aspect ratio, scaled to fit within
   * the printable area. Ideal for docx-preview's already-paginated pages.
   */
  async function addElementPage(pdf, canvas) {
    const image = await pdf.embedPng(await canvasToPngBytes(canvas));
    const { width: iw, height: ih } = image.size();
    const maxW = PAGE_W - MARGIN_TOP - MARGIN_BOTTOM;
    const maxH = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;
    const scale = Math.min(maxW / iw, maxH / ih, 1);
    const pw = iw * scale;
    const ph = ih * scale;
    const page = pdf.addPage([pw, ph]);
    page.drawImage(image, { x: 0, y: 0, width: pw, height: ph });
  }

  async function elementToPdf(element, quality) {
    quality = quality || 2;
    const canvas = await html2canvas(element, {
      scale: quality,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const pdf = await PDFLib.PDFDocument.create();
    await addElementPage(pdf, canvas);
    return new Uint8Array(await pdf.save());
  }

  /*
   * Render several elements (e.g. every page of a document) into one PDF.
   */
  async function elementsToPdf(elements, quality) {
    quality = quality || 2;
    const pdf = await PDFLib.PDFDocument.create();
    for (const el of elements) {
      const canvas = await html2canvas(el, {
        scale: quality,
        backgroundColor: '#ffffff',
        logging: false,
      });
      await addElementPage(pdf, canvas);
    }
    return new Uint8Array(await pdf.save());
  }

  /*
   * Render free-flowing content (tables, whole HTML documents) into a canvas
   * of the element's full scroll height, then slice it into uniform pages.
   */
  async function scrollToPdf(element, quality) {
    quality = quality || 2;
    const canvas = await html2canvas(element, {
      scale: quality,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const pdf = await PDFLib.PDFDocument.create();
    const contentPxPerPage = (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM) * quality;
    const sliceWidth = canvas.width;
    let y = 0;

    while (y < canvas.height) {
      const sliceH = Math.min(contentPxPerPage, canvas.height - y);
      const slice = document.createElement('canvas');
      slice.width = sliceWidth;
      slice.height = sliceH;
      const ctx = slice.getContext('2d');
      ctx.drawImage(canvas, 0, y, sliceWidth, sliceH, 0, 0, sliceWidth, sliceH);

      const image = await pdf.embedPng(await canvasToPngBytes(slice));

      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const scaledH = sliceH / quality;
      page.drawImage(image, {
        x: (PAGE_W - sliceWidth / quality) / 2,
        y: PAGE_H - MARGIN_TOP - scaledH,
        width: sliceWidth / quality,
        height: scaledH,
      });
      y += sliceH;
    }
    return new Uint8Array(await pdf.save());
  }

  return { elementToPdf, elementsToPdf, scrollToPdf, hexRgb, PAGE_W, PAGE_H };
})();