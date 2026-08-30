/*
 * image.js — convert image files to PDF.
 * JPEG / PNG are embedded losslessly. Every other raster or vector format
 * is drawn to a canvas and re-encoded to PNG, then embedded.
 */
window.ImageToPdf = (() => {
  'use strict';

  const PAGE_W = 612;
  const PAGE_H = 792;

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image could not be decoded'));
      img.src = src;
    });
  }

  function canvasToPngBytes(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((b) => b.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))), 'image/png');
    });
  }

  function drawScaled(img) {
    // Ensure at least a sane intrinsic size (SVG often has none until rendered).
    const w = img.naturalWidth && img.naturalWidth > 0 ? img.naturalWidth : img.width || 1024;
    const h = img.naturalHeight && img.naturalHeight > 0 ? img.naturalHeight : img.height || 768;
    const cap = 4096;
    const scale = Math.min(1, cap / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function convert(file) {
    const pdf = await PDFLib.PDFDocument.create();
    let embed;
    const mime = (file.type || '').toLowerCase();

    if (mime === 'image/jpeg') {
      embed = await pdf.embedJpg(new Uint8Array(await file.arrayBuffer()));
    } else if (mime === 'image/png') {
      embed = await pdf.embedPng(new Uint8Array(await file.arrayBuffer()));
    } else {
      const img = await loadImage(await readAsDataURL(file));
      const canvas = drawScaled(img);
      embed = await pdf.embedPng(await canvasToPngBytes(canvas));
    }

    const { width, height } = embed.size();
    const maxW = PAGE_W, maxH = PAGE_H;
    const scale = Math.min(maxW / width, maxH / height, 1);
    const pw = Math.max(1, Math.round(width * scale));
    const ph = Math.max(1, Math.round(height * scale));

    const page = pdf.addPage([pw, ph]);
    page.drawImage(embed, { x: 0, y: 0, width: pw, height: ph });
    return new Uint8Array(await pdf.save());
  }

  return { convert };
})();