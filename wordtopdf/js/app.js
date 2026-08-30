/*
 * app.js — UI orchestration: dropzone, file cards, conversion, merging, downloads.
 * Everything runs in the browser; files never leave the device.
 */
window.FileToPdfApp = (() => {
  'use strict';

  const els = {};
  const state = { items: [], converting: false };
  const QUALITY = { fast: 1.5, balanced: 2, high: 3 };
  const BADGE = {
    image: '#0f9d8a',
    docx: '#3f6fd8',
    xlsx: '#2e9e5b',
    html: '#d9822b',
    text: '#5a6472',
    pdf: '#d64545',
  };
  const NOTICE =
    'Images, text and PDFs are true vector output. Word/Excel/HTML are rasterized via html2canvas — zoomed text is not selectable.';

  document.addEventListener('DOMContentLoaded', () => {
    ['dropzone', 'fileInput', 'browseBtn', 'fileList', 'toolbar', 'convertBtn',
     'mergeBtn', 'clearBtn', 'qualitySel', 'toastHost', 'fileCount', 'progressBar', 'progressMsg']
      .forEach((id) => { els[id] = document.getElementById(id); });
    bindEvents();
    setToolbar();
  });

  function bindEvents() {
    els.browseBtn.addEventListener('click', (e) => { e.stopPropagation(); els.fileInput.click(); });
    els.dropzone.addEventListener('click', () => { if (!state.converting) els.fileInput.click(); });
    els.dropzone.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !state.converting) { e.preventDefault(); els.fileInput.click(); }
    });
    els.fileInput.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

    ['dragenter', 'dragover'].forEach((ev) => els.dropzone.addEventListener(ev, addDragClass, false));
    ['dragleave'].forEach((ev) => els.dropzone.addEventListener(ev, removeDragClass, false));
    els.dropzone.addEventListener('drop', onDrop, false);

    // Keep the browser from navigating away on accidental window drops.
    ['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => e.preventDefault()));

    els.convertBtn.addEventListener('click', startConversion);
    els.mergeBtn.addEventListener('click', mergeAll);
    els.clearBtn.addEventListener('click', clearAll);
  }

  function addDragClass(e) {
    e.preventDefault();
    els.dropzone.classList.add('dragover');
  }

  function removeDragClass() {
    els.dropzone.classList.remove('dragover');
  }

  function onDrop(e) {
    e.preventDefault();
    removeDragClass();
    if (state.converting) return;
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) addFiles(dt.files);
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function stem(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }

  function addFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    for (const file of arr) {
      const d = window.Converters.dispatch(file);
      state.items.push({
        id: 'f' + Math.random().toString(36).slice(2) + Date.now().toString(36),
        file,
        dispatch: d,
        status: d.kind === 'unsupported' ? 'unsupported' : 'ready',
        bytes: null,
        error: d.reason || null,
      });
    }
    renderAll();
    setToolbar();
    els.fileList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderAll() {
    els.fileList.innerHTML = '';
    for (const item of state.items) els.fileList.appendChild(cardFor(item));
    els.fileCount.textContent = state.items.length
      ? (state.items.length === 1 ? '1 file' : state.items.length + ' files')
      : '';
    if (!state.items.length) els.fileList.appendChild(emptyState());
  }

  function emptyState() {
    const el = document.createElement('div');
    el.className = 'empty-note';
    el.innerHTML = '<p><strong>No files yet.</strong> Drop files above or browse to get started.</p>';
    return el;
  }

  function extBadge(name) {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toUpperCase() : 'FILE';
    return ext.length > 4 ? ext.slice(0, 4) : ext;
  }

  function cardFor(item) {
    const card = document.createElement('article');
    card.className = 'fcard' + (item.status === 'converting' ? ' is-converting' : '');
    card.dataset.id = item.id;

    const kind = item.dispatch.kind;
    const color = BADGE[kind] || '#7a8290';

    const badge = document.createElement('div');
    badge.className = 'fcard-badge';
    badge.style.background = color;
    badge.textContent = extBadge(item.file.name);

    const info = document.createElement('div');
    info.className = 'fcard-info';
    const nameEl = document.createElement('div');
    nameEl.className = 'fcard-name';
    nameEl.title = item.file.name;
    nameEl.textContent = item.file.name;
    const metaEl = document.createElement('div');
    metaEl.className = 'fcard-meta';
    metaEl.textContent = fmtSize(item.file.size) + ' · ' + window.Converters.labelOf(kind);
    info.appendChild(nameEl);
    info.appendChild(metaEl);

    const statusEl = document.createElement('div');
    statusEl.className = 'fcard-status';

    const actions = document.createElement('div');
    actions.className = 'fcard-actions';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-icon';
    removeBtn.title = 'Remove from list';
    removeBtn.setAttribute('aria-label', 'Remove ' + item.file.name);
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => removeItem(item.id));
    actions.appendChild(removeBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-primary btn-small';
    downloadBtn.textContent = 'Download';
    downloadBtn.hidden = true;
    downloadBtn.addEventListener('click', () => downloadPdf(item));
    actions.appendChild(downloadBtn);

    if (item.status === 'ready') {
      statusEl.appendChild(pill('Ready', 'pill-ready'));
    } else if (item.status === 'converting') {
      statusEl.appendChild(pill('Converting…', 'pill-working'));
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      statusEl.appendChild(spinner);
      removeBtn.disabled = true;
    } else if (item.status === 'done') {
      statusEl.appendChild(pill('PDF ready', 'pill-done'));
      downloadBtn.hidden = false;
    } else if (item.status === 'error' || item.status === 'unsupported') {
      statusEl.appendChild(pill('Error', 'pill-error'));
      statusEl.title = item.error || 'Conversion failed';
    }

    card.appendChild(badge);
    card.appendChild(info);
    card.appendChild(statusEl);
    card.appendChild(actions);
    return card;
  }

  function pill(text, cls) {
    const s = document.createElement('span');
    s.className = 'pill ' + cls;
    s.textContent = text;
    return s;
  }

  function removeItem(id) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx < 0 || state.items[idx].status === 'converting') return;
    state.items.splice(idx, 1);
    renderAll();
    setToolbar();
  }

  function clearAll() {
    if (state.converting) return;
    if (!state.items.length) return;
    if (!confirm('Remove all ' + state.items.length + ' file(s) from the list?')) return;
    state.items = [];
    renderAll();
    setToolbar();
  }

  function setToolbar() {
    const n = state.items.length;
    const hasReady = state.items.some((i) => i.status === 'ready' || i.status === 'error');
    const hasDone = state.items.some((i) => i.status === 'done');
    els.toolbar.classList.remove('hidden');
    if (!n) {
      els.toolbar.classList.add('hidden');
    }
    els.convertBtn.disabled = state.converting || !hasReady;
    els.convertBtn.textContent = state.converting ? 'Converting…' : 'Convert to PDF';
    els.mergeBtn.disabled = !hasDone || state.converting;
    els.clearBtn.disabled = state.converting || !n;
    els.qualitySel.disabled = state.converting || !hasReady;
  }

  function qualityValue() {
    return QUALITY[els.qualitySel.value] || 2;
  }

  async function startConversion() {
    if (state.converting) return;
    const targets = state.items.filter((i) => i.status === 'ready' || i.status === 'error');
    if (!targets.length) return;

    state.converting = true;
    els.dropzone.classList.add('locked');
    setToolbar();
    els.progressBar.parentElement.classList.remove('hidden');
    setProgress(0, targets.length);

    const q = qualityValue();
    let done = 0;
    for (const item of targets) {
      item.status = 'converting';
      updateCard(item);
      setProgress(done, targets.length, item.file.name);
      try {
        const bytes = await item.dispatch.run(item.file, q);
        item.bytes = bytes;
        item.status = 'done';
      } catch (err) {
        console.error(err);
        item.error = err && err.message ? err.message : 'Conversion failed in the browser.';
        item.status = 'error';
      }
      done++;
      updateCard(item);
      renderAll();
      setProgress(done, targets.length, item.file.name);
      // let the DOM breathe between heavy conversions
      await new Promise((r) => setTimeout(r, 30));
    }

    state.converting = false;
    els.dropzone.classList.remove('locked');
    setToolbar();
    setTimeout(() => {
      els.progressBar.parentElement.classList.add('hidden');
      setProgress(0, 0);
    }, 1200);
    toast('Conversion finished.');
  }

  function setProgress(done, total, name) {
    els.progressBar.max = total;
    els.progressBar.value = done;
    els.progressMsg.textContent = name
      ? (done + 1 <= total ? 'Processing ' + (done + 1) + ' of ' + total + ': ' + (name.length > 60 ? name.slice(0, 57) + '…' : name) : 'Finishing…')
      : (done + '/' + total + ' converted');
  }

  function updateCard(item) {
    const card = els.fileList.querySelector('.fcard[data-id="' + item.id + '"]');
    if (card) card.parentNode.replaceChild(cardFor(item), card);
  }

  async function mergeAll() {
    const items = state.items.filter((i) => i.status === 'done' && i.bytes);
    if (!items.length) return;
    try {
      const merged = await PDFLib.PDFDocument.create();
      const inds = items.map((i) => i.id);
      for (const item of items) {
        const doc = await PDFLib.PDFDocument.load(item.bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      play(await merged.save(), 'merged.pdf');
      toast('Merged ' + items.length + ' PDF(s) into merged.pdf.');
    } catch (err) {
      console.error(err);
      toast('Merge failed: ' + (err.message || err), true);
    }
  }

  function play(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function downloadPdf(item) {
    if (!item.bytes) return;
    play(item.bytes, stem(item.file.name) + '.pdf');
  }

  function toast(msg, isError) {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' toast-error' : '');
    t.textContent = msg;
    els.toastHost.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 350);
    }, 3600);
  }

  return { addFiles, startConversion, mergeAll, clearAll, play, toast, notice: NOTICE };
})();