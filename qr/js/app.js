/*
 * app.js — QR code generation from text and URLs.
 * 100% client-side. Nothing leaves the device.
 */
window.QRanyApp = (() => {
  'use strict';

  const els = {};
  let currentData = '';
  let debounceTimer = null;

  document.addEventListener('DOMContentLoaded', () => {
    ['textInput', 'charCount', 'errorLevel', 'qrSize', 'fgColor', 'bgColor',
     'fgColorHex', 'bgColorHex', 'outputFmt', 'qrCanvas', 'qrSvgWrap',
     'previewArea', 'downloadBar', 'downloadBtn', 'copyBtn', 'qrMeta', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.textInput.addEventListener('input', onTextInput);

    els.errorLevel.addEventListener('change', regenerate);
    els.qrSize.addEventListener('change', regenerate);
    els.fgColor.addEventListener('input', () => { els.fgColorHex.textContent = els.fgColor.value; regenerate(); });
    els.bgColor.addEventListener('input', () => { els.bgColorHex.textContent = els.bgColor.value; regenerate(); });
    els.outputFmt.addEventListener('change', regenerate);

    els.downloadBtn.addEventListener('click', download);
    els.copyBtn.addEventListener('click', copyToClipboard);
  }

  function onTextInput() {
    const text = els.textInput.value;
    els.charCount.textContent = text.length;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (text.trim()) {
        currentData = text;
        generate();
      } else {
        clearPreview();
      }
    }, 200);
  }

  function generate() {
    if (!currentData.trim()) { clearPreview(); return; }

    const ecLevel = els.errorLevel.value;
    const moduleSize = parseInt(els.qrSize.value, 10);
    const fg = els.fgColor.value;
    const bg = els.bgColor.value;
    const fmt = els.outputFmt.value;

    try {
      const qr = qrcode(0, ecLevel);
      qr.addData(currentData);
      qr.make();

      const count = qr.getModuleCount();

      if (fmt === 'svg') {
        renderSVG(qr, count, moduleSize, fg, bg);
      } else {
        renderCanvas(qr, count, moduleSize, fg, bg);
      }

      els.downloadBar.classList.remove('hidden');
      els.qrMeta.classList.remove('hidden');
      els.qrMeta.textContent = `${count}x${count} modules · ${currentData.length} chars · EC: ${ecLevel}`;
    } catch (err) {
      if (err.message && err.message.includes('too long')) {
        toast('Text is too long for a QR code. Max ~2900 characters.', true);
      } else {
        toast('Error generating QR code: ' + (err.message || err), true);
      }
      clearPreview();
    }
  }

  function regenerate() { if (currentData.trim()) generate(); }

  function renderCanvas(qr, count, moduleSize, fg, bg) {
    const padding = moduleSize * 2;
    const total = count * moduleSize + padding * 2;

    els.qrSvgWrap.classList.add('hidden');
    els.qrCanvas.classList.remove('hidden');

    els.qrCanvas.width = total;
    els.qrCanvas.height = total;

    const ctx = els.qrCanvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, total, total);

    ctx.fillStyle = fg;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(padding + c * moduleSize, padding + r * moduleSize, moduleSize, moduleSize);
        }
      }
    }
  }

  function renderSVG(qr, count, moduleSize, fg, bg) {
    const padding = moduleSize * 2;
    const total = count * moduleSize + padding * 2;

    els.qrCanvas.classList.add('hidden');
    els.qrSvgWrap.classList.remove('hidden');
    els.qrSvgWrap.innerHTML = '';

    let rects = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          rects += `<rect x="${padding + c * moduleSize}" y="${padding + r * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${fg}"/>`;
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="crispEdges">
  <rect width="${total}" height="${total}" fill="${bg}"/>
  ${rects}
</svg>`;
    els.qrSvgWrap.innerHTML = svg;
  }

  function download() {
    const fmt = els.outputFmt.value;

    if (fmt === 'svg') {
      const blob = new Blob([els.qrSvgWrap.innerHTML], { type: 'image/svg+xml' });
      triggerDownload(blob, 'qr-code.svg');
    } else {
      els.qrCanvas.toBlob(blob => {
        triggerDownload(blob, 'qr-code.png');
      }, 'image/png');
    }
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded ' + name);
  }

  async function copyToClipboard() {
    try {
      const fmt = els.outputFmt.value;
      let blob;
      if (fmt === 'svg') {
        blob = new Blob([els.qrSvgWrap.innerHTML], { type: 'image/svg+xml' });
      } else {
        blob = await new Promise(resolve => els.qrCanvas.toBlob(resolve, 'image/png'));
      }
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast('Copied to clipboard');
    } catch {
      toast('Copy failed — try downloading instead', true);
    }
  }

  function clearPreview() {
    els.qrCanvas.classList.add('hidden');
    els.qrSvgWrap.classList.add('hidden');
    els.downloadBar.classList.add('hidden');
    els.qrMeta.classList.add('hidden');
    els.qrSvgWrap.innerHTML = '';
  }

  function toast(msg, isError) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.textContent = msg;
    els.toastHost.appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); }, 2400);
    setTimeout(() => { el.remove(); }, 2800);
  }
})();
