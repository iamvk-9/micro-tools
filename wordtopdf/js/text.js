/*
 * text.js — convert plain-text content to a crisp, vector PDF.
 * Used for txt, markdown, csv, json, code, logs and any other UTF-8 text.
 */
window.TextToPdf = (() => {
  'use strict';

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 48;
  const FONT_SIZE = 11;
  const LINE_HEIGHT = 15;
  const COLOR = '#1a1a1a';
  const GRAY = '#8a8f98';

  const SMART = {
    '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
    '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
    '\u2013': '-', '\u2014': '-', '\u2026': '...',
    '\u00A0': ' ', '\u2022': '*', '\u2020': '*', '\u2021': '+',
    '\u2044': '/', '\u00B0': ' degrees', '\u2011': '-',
  };

  // Replace anything outside WinAnsi-printable ranges so font drawing never throws.
  function sanitize(str) {
    let out = '';
    for (const ch of str) {
      if (SMART[ch] !== undefined) { out += SMART[ch]; continue; }
      const c = ch.codePointAt(0);
      if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff)) out += ch;
      else out += '?';
    }
    return out;
  }

  function wrap(font, text, maxW, size) {
    const lines = [];
    for (const para of text.split('\n')) {
      const expanded = para.replace(/\t/g, '    ');
      const tokens = expanded.split(/(\s+)/).filter((t) => t.length > 0);
      let cur = '';
      for (const tok of tokens) {
        const test = cur + tok;
        if (cur && font.widthOfTextAtSize(test, size) > maxW) {
          lines.push(cur.replace(/\s+$/, ''));
          cur = tok;
          // Hard-break words that are longer than a full line.
          while (font.widthOfTextAtSize(cur, size) > maxW) {
            let cut = 1;
            while (cut < cur.length && font.widthOfTextAtSize(cur.slice(0, cut + 1), size) <= maxW) cut++;
            lines.push(cur.slice(0, cut));
            cur = cur.slice(cut);
          }
        } else {
          cur = test;
        }
      }
      if (cur.length) lines.push(cur);
    }
    return lines;
  }

  async function convert(text) {
    const content = String(text == null ? '' : text).replace(/\r\n/g, '\n');
    const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.Courier);
    const maxW = PAGE_W - MARGIN * 2;
    const sanitized = sanitize(content);

    let page = null;
    let y = 0;

    const drawLine = (line) => {
      page.drawText(line, {
        x: MARGIN,
        y: y,
        size: FONT_SIZE,
        font: font,
        color: RenderHtml.hexRgb(COLOR),
      });
    };

    const newPage = () => {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    };

    newPage();
    const lines = wrap(font, sanitized, maxW, FONT_SIZE);
    if (lines.length === 0) {
      drawLine('(empty file)');
    }
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      drawLine(line);
      y -= LINE_HEIGHT;
    }

    if (sanitized !== content) {
      const notice = '(Some characters were simplified for PDF text encoding.)';
      if (y < MARGIN + LINE_HEIGHT * 2) newPage();
      y -= LINE_HEIGHT;
      page.drawText(notice, {
        x: MARGIN,
        y: y,
        size: 8.5,
        font: font,
        color: RenderHtml.hexRgb(GRAY),
      });
    }

    return new Uint8Array(await pdf.save());
  }

  return { convert };
})();