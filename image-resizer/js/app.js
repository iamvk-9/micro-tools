/*
 * app.js — ImgResize: resize images by pixels or percent.
 * 100% client-side.
 */
window.ImgResizeApp = (() => {
  'use strict';

  const els = {};
  let img = null;
  let origW = 0;
  let origH = 0;
  let fileName = '';
  let mode = 'pixel';

  document.addEventListener('DOMContentLoaded', () => {
    ['dropzone', 'fileInput', 'browseBtn', 'editor', 'previewImg', 'origDims',
     'newDims', 'newWidth', 'newHeight', 'percentVal', 'dimRowPixel', 'dimRowPercent',
     'modePixel', 'modePercent', 'keepRatio', 'resizeFormat', 'resizeBtn', 'resetBtn', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.browseBtn.addEventListener('click', e => { e.stopPropagation(); els.fileInput.click(); });
    els.dropzone.addEventListener('click', () => els.fileInput.click());
    els.dropzone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    els.fileInput.addEventListener('change', e => {
      if (e.target.files.length) loadImage(e.target.files[0]);
      e.target.value = '';
    });
    ['dragenter', 'dragover'].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add('dragover'); }));
    ['dragleave'].forEach(ev => els.dropzone.addEventListener(ev, () => els.dropzone.classList.remove('dragover')));
    els.dropzone.addEventListener('drop', e => {
      e.preventDefault();
      els.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) loadImage(e.dataTransfer.files[0]);
    });

    els.modePixel.addEventListener('click', () => setMode('pixel'));
    els.modePercent.addEventListener('click', () => setMode('percent'));
    els.newWidth.addEventListener('input', () => { if (els.keepRatio.checked) autosetHeight(); updateNewDims(); });
    els.newHeight.addEventListener('input', () => { if (els.keepRatio.checked) autosetWidth(); updateNewDims(); });
    els.percentVal.addEventListener('input', () => {
      const p = parseFloat(els.percentVal.value);
      if (!isNaN(p) && origW) {
        els.newWidth.value = Math.round(origW * p / 100);
        els.newHeight.value = Math.round(origH * p / 100);
        updateNewDims();
      }
    });
    els.keepRatio.addEventListener('change', updateNewDims);
    els.resizeBtn.addEventListener('click', resize);
    els.resetBtn.addEventListener('click', reset);
  }

  function setMode(m) {
    mode = m;
    els.modePixel.classList.toggle('active', m === 'pixel');
    els.modePercent.classList.toggle('active', m === 'percent');
    els.dimRowPixel.classList.toggle('hidden', m !== 'pixel');
    els.dimRowPercent.classList.toggle('hidden', m !== 'percent');
    updateNewDims();
  }

  function autosetHeight() {
    const w = parseInt(els.newWidth.value, 10);
    if (!isNaN(w) && origW) els.newHeight.value = Math.round(w * origH / origW);
  }
  function autosetWidth() {
    const h = parseInt(els.newHeight.value, 10);
    if (!isNaN(h) && origH) els.newWidth.value = Math.round(h * origW / origH);
  }

  function updateNewDims() {
    if (!els.editor.classList.contains('hidden')) {
      els.newDims.textContent = `${els.newWidth.value || '?'} × ${els.newHeight.value || '?'} px`;
    }
  }

  function loadImage(file) {
    if (!file.type.startsWith('image/')) { toast('Please drop an image file', true); return; }
    const url = URL.createObjectURL(file);
    const test = new Image();
    test.onload = () => {
      img = test;
      origW = test.naturalWidth;
      origH = test.naturalHeight;
      fileName = file.name;
      URL.revokeObjectURL(url);
      els.previewImg.src = test.src;
      els.dropzone.classList.add('hidden');
      els.editor.classList.remove('hidden');
      els.origDims.textContent = `Original: ${origW} × ${origH} px`;
      els.newWidth.value = origW;
      els.newHeight.value = origH;
      els.percentVal.value = 100;
      setMode('pixel');
      updateNewDims();
    };
    test.onerror = () => { URL.revokeObjectURL(url); toast('Could not load that image', true); };
    test.src = url;
  }

  function resize() {
    if (!img) return;
    const w = parseInt(els.newWidth.value, 10);
    const h = parseInt(els.newHeight.value, 10);
    if (isNaN(w) || isNaN(h) || w < 1 || h < 1) { toast('Enter valid dimensions', true); return; }
    if (w > 10000 || h > 10000) { toast('Maximum size is 10000px per side', true); return; }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const format = els.resizeFormat.value;
    const type = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[format];
    const ext = { jpeg: 'jpg', png: 'png', webp: 'webp' }[format];
    const quality = format === 'png' ? undefined : 0.92;

    canvas.toBlob(blob => {
      if (!blob) { toast('Failed to encode image', true); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName(fileName) + '-' + w + 'x' + h + '.' + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(`Downloaded ${w} × ${h}`);
    }, type, quality);
  }

  function reset() {
    img = null;
    els.dropzone.classList.remove('hidden');
    els.editor.classList.add('hidden');
    els.previewImg.removeAttribute('src');
    els.fileInput.click();
  }

  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
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
