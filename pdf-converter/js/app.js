/*
 * app.js — PDFConverter: Word → PDF and PDF → Word.
 * Word → PDF uses docx-preview (render) + html2canvas (rasterize) via RenderHtml.
 * PDF → Word uses pdf.js to extract text and emits a Word-openable .doc.
 * 100% client-side.
 */
window.PDFConverterApp = (() => {
  'use strict';

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    ['tabDocx', 'tabPdf', 'panelDocx', 'panelPdf', 'dropzone', 'docxInput',
     'browseBtn', 'result', 'downloadBtn', 'dropzonePdf', 'pdfInput',
     'browsePdfBtn', 'pdfResult', 'downloadDocBtn', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
    bindEvents();
  });

  function bindEvents() {
    els.tabDocx.addEventListener('click', () => switchTab('docx'));
    els.tabPdf.addEventListener('click', () => switchTab('pdf'));

    els.browseBtn.addEventListener('click', e => { e.stopPropagation(); els.docxInput.click(); });
    els.dropzone.addEventListener('click', () => els.docxInput.click());
    els.dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.docxInput.click(); } });
    els.docxInput.addEventListener('change', e => {
      if (e.target.files.length) convertDocx(e.target.files[0]);
      e.target.value = '';
    });
    wireDrop(els.dropzone, () => els.docxInput.click());

    els.browsePdfBtn.addEventListener('click', e => { e.stopPropagation(); els.pdfInput.click(); });
    els.dropzonePdf.addEventListener('click', () => els.pdfInput.click());
    els.dropzonePdf.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.pdfInput.click(); } });
    els.pdfInput.addEventListener('change', e => {
      if (e.target.files.length) convertPdf(e.target.files[0]);
      e.target.value = '';
    });
    wireDrop(els.dropzonePdf, () => els.pdfInput.click());

    els.downloadBtn.addEventListener('click', downloadPdf);
    els.downloadDocBtn.addEventListener('click', downloadDoc);

    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
  }

  function wireDrop(dz, trigger) {
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); }));
    ['dragleave'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('dragover')));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        if (dz === els.dropzone) convertDocx(file);
        else convertPdf(file);
      }
    });
  }

  function switchTab(tab) {
    const docx = tab === 'docx';
    els.tabDocx.classList.toggle('active', docx);
    els.tabDocx.setAttribute('aria-selected', docx);
    els.tabPdf.classList.toggle('active', !docx);
    els.tabPdf.setAttribute('aria-selected', !docx);
    els.panelDocx.classList.toggle('hidden', !docx);
    els.panelPdf.classList.toggle('hidden', docx);
  }

  async function convertDocx(file) {
    setResult(els.result, 'Converting… please wait.', false);
    els.downloadBtn.classList.add('hidden');
    try {
      const bytes = await docxToPdf(file);
      currentPdfBlob = new Blob([bytes], { type: 'application/pdf' });
      els.downloadBtn.classList.remove('hidden');
      setResult(els.result, `Converted "${file.name}" to PDF (${fmtSize(currentPdfBlob.size)}).`, false);
    } catch (err) {
      setResult(els.result, 'Conversion failed: ' + (err && err.message || err), true);
    }
  }

  async function docxToPdf(file) {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;overflow:visible;';
    document.body.appendChild(container);
    try {
      const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      await docx.renderAsync(blob, container, null, {
        inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true,
        renderHeaders: true, renderFooters: true, renderFootnotes: true, useBase64URL: true,
      });
      await new Promise(r => setTimeout(r, 300));
      if (document.fonts) await document.fonts.ready;
      const pages = Array.from(container.querySelectorAll('section.docx'));
      if (pages.length === 0) throw new Error('Document rendered no pages.');
      return await RenderHtml.elementsToPdf(pages, 2);
    } finally {
      if (container.parentNode) container.parentNode.removeChild(container);
    }
  }

  let currentPdfBlob = null;
  let currentDocBlob = null;
  let currentPdfName = 'document';
  let currentPages = 0;

  async function convertPdf(file) {
    setResult(els.pdfResult, 'Extracting text… please wait.', false);
    els.downloadDocBtn.classList.add('hidden');
    try {
      currentPdfName = file.name;
      const docHtml = await pdfToDocHtml(file);
      currentDocBlob = new Blob([docHtml], { type: 'application/msword' });
      els.downloadDocBtn.classList.remove('hidden');
      setResult(els.pdfResult, `Extracted ${currentPages} page${currentPages === 1 ? '' : 's'} from "${file.name}".`, false);
    } catch (err) {
      setResult(els.pdfResult, 'Extraction failed: ' + (err && err.message || err), true);
    }
  }

  async function pdfToDocHtml(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;
    currentPages = doc.numPages;

    const style = `
      body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 60px; line-height: 1.5; color: #000; }
      p { margin: 0 0 8pt; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
      img { max-width: 100%; }
    `;

    let bodyHtml = '';
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const textContent = await page.getTextContent();
      let pageHtml = `<div class="page">`;
      let prevY = null;
      let line = [];
      const flush = () => {
        let text = line.join(' ').replace(/\s+/g, ' ').trim();
        if (text) pageHtml += `<p>${escapeHtml(text)}</p>`;
        line = [];
      };
      for (const item of textContent.items) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        if (prevY !== null && Math.abs(y - prevY) > 2) flush();
        prevY = y;
        line.push(item.str);
      }
      flush();
      pageHtml += '</div>';
      bodyHtml += pageHtml;
    }

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Converted</title><style>${style}</style></head>
      <body>${bodyHtml}</body></html>`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function downloadPdf() {
    if (!currentPdfBlob) return;
    trigger(currentPdfBlob, 'converted.pdf', 'application/pdf');
  }
  function downloadDoc() {
    if (!currentDocBlob) return;
    trigger(currentDocBlob, baseName(currentPdfName) + '-extracted.doc', 'application/msword');
  }

  function trigger(blob, name, type) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded ' + name);
  }

  function setResult(el, msg, err) {
    el.textContent = msg;
    el.className = 'result ' + (err ? 'err' : 'ok');
    el.classList.remove('hidden');
  }

  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function toast(msg, isError) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.textContent = msg;
    els.toastHost.appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); }, 2200);
    setTimeout(() => { el.remove(); }, 2600);
  }
})();
