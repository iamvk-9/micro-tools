/*
 * app.js — PDFMergeSplit: merge PDFs and split PDFs.
 * Uses pdf-lib. 100% client-side.
 */
window.PDFMergeSplitApp = (() => {
  'use strict';

  const els = {};
  const mergeFiles = [];
  const mergePageCounts = {};
  let splitFile = null;
  let splitPages = 0;
  let splitMode = 'single';

  document.addEventListener('DOMContentLoaded', () => {
    ['tabMerge', 'tabSplit', 'panelMerge', 'panelSplit', 'mergeDrop', 'mergeInput',
     'mergeBrowseBtn', 'mergeList', 'mergeBtn', 'mergeClearBtn', 'splitDrop', 'splitInput',
     'splitBrowseBtn', 'splitInfo', 'modeSingle', 'modeRange', 'rangeFrom', 'rangeTo',
     'rangeRow', 'splitTotal', 'splitBtn', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.tabMerge.addEventListener('click', () => switchTab('merge'));
    els.tabSplit.addEventListener('click', () => switchTab('split'));

    els.mergeBrowseBtn.addEventListener('click', e => { e.stopPropagation(); els.mergeInput.click(); });
    els.mergeDrop.addEventListener('click', () => els.mergeInput.click());
    els.mergeDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.mergeInput.click(); } });
    els.mergeInput.addEventListener('change', e => { addMergeFiles(e.target.files); e.target.value = ''; });
    wireDrop(els.mergeDrop, files => addMergeFiles(files));

    els.mergeBtn.addEventListener('click', merge);
    els.mergeClearBtn.addEventListener('click', clearMerge);

    els.splitBrowseBtn.addEventListener('click', e => { e.stopPropagation(); els.splitInput.click(); });
    els.splitDrop.addEventListener('click', () => els.splitInput.click());
    els.splitDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.splitInput.click(); } });
    els.splitInput.addEventListener('change', e => { if (e.target.files.length) loadSplit(e.target.files[0]); e.target.value = ''; });
    wireDrop(els.splitDrop, files => { if (files.length) loadSplit(files[0]); });

    els.modeSingle.addEventListener('click', () => setSplitMode('single'));
    els.modeRange.addEventListener('click', () => setSplitMode('range'));
    els.splitBtn.addEventListener('click', split);
    els.rangeFrom.addEventListener('input', updateSplitTotal);
    els.rangeTo.addEventListener('input', updateSplitTotal);

    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
  }

  function wireDrop(el, handler) {
    ['dragenter', 'dragover'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add('dragover'); }));
    ['dragleave'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('dragover')));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('dragover');
      handler(e.dataTransfer.files);
    });
  }

  function switchTab(tab) {
    const merge = tab === 'merge';
    els.tabMerge.classList.toggle('active', merge);
    els.tabSplit.classList.toggle('active', !merge);
    els.panelMerge.classList.toggle('hidden', !merge);
    els.panelSplit.classList.toggle('hidden', merge);
  }

  async function addMergeFiles(fileList) {
    const pdfs = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) { toast('Please choose PDF files', true); return; }
    for (const file of pdfs) {
      try {
        const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        mergePageCounts[file.name + '_' + file.size] = pdf.getPageCount();
      } catch { /* leave count unknown */ }
      mergeFiles.push(file);
    }
    renderMergeList();
  }

  function renderMergeList() {
    els.mergeList.innerHTML = mergeFiles.map((f, i) => {
      const count = mergePageCounts[f.name + '_' + f.size];
      return `<div class="fcard">
        <span class="fcard-name">${i + 1}. ${escapeHtml(f.name)}</span>
        <span class="fcard-pages">${count ? count + ' page' + (count === 1 ? '' : 's') : fmtSize(f.size)}</span>
        <button type="button" class="fcard-x" data-i="${i}" aria-label="Remove">×</button>
      </div>`;
    }).join('');
    document.querySelectorAll('.fcard-x').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.i, 10);
        const f = mergeFiles[idx];
        delete mergePageCounts[f.name + '_' + f.size];
        mergeFiles.splice(idx, 1);
        renderMergeList();
      });
    });
  }

  function clearMerge() {
    mergeFiles.length = 0;
    renderMergeList();
  }

  async function merge() {
    if (!mergeFiles.length) { toast('Add at least one PDF to merge', true); return; }
    els.mergeBtn.disabled = true;
    try {
      const out = await PDFLib.PDFDocument.create();
      for (const file of mergeFiles) {
        const src = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach(p => out.addPage(p));
      }
      const bytes = await out.save();
      trigger(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf', 'application/pdf');
    } catch (err) {
      toast('Merge failed: ' + (err && err.message || err), true);
    } finally {
      els.mergeBtn.disabled = false;
    }
  }

  async function loadSplit(file) {
    try {
      const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      splitFile = file;
      splitPages = pdf.getPageCount();
      setSplitInfo(`<strong>${escapeHtml(file.name)}</strong> — ${splitPages} page${splitPages === 1 ? '' : 's'}`, false);
      els.rangeFrom.max = splitPages;
      els.rangeTo.max = splitPages;
      els.rangeTo.value = splitPages;
      updateSplitTotal();
    } catch (err) {
      setSplitInfo('Could not read PDF: ' + (err && err.message || err), true);
    }
  }

  function setSplitInfo(html, err) {
    els.splitInfo.innerHTML = html;
    els.splitInfo.className = 'result ' + (err ? 'err' : 'ok');
    els.splitInfo.classList.remove('hidden');
  }

  function setSplitMode(m) {
    splitMode = m;
    els.modeSingle.classList.toggle('active', m === 'single');
    els.modeRange.classList.toggle('active', m === 'range');
    els.rangeRow.classList.toggle('hidden', m !== 'range');
    updateSplitTotal();
  }

  function updateSplitTotal() {
    if (splitMode === 'single' && splitPages) {
      els.splitTotal.textContent = `Splits into ${splitPages} file${splitPages === 1 ? '' : 's'} (one per page)`;
      return;
    }
    if (splitMode === 'range') {
      const from = parseInt(els.rangeFrom.value, 10) || 1;
      const to = parseInt(els.rangeTo.value, 10) || 1;
      const count = Math.max(0, to - from + 1);
      els.splitTotal.textContent = count > 0 ? `Extracts ${count} page${count === 1 ? '' : 's'}` : 'Invalid range';
    }
  }

  async function split() {
    if (!splitFile) { toast('Add a PDF to split first', true); return; }
    els.splitBtn.disabled = true;
    try {
      const src = await PDFLib.PDFDocument.load(await splitFile.arrayBuffer(), { ignoreEncryption: true });
      const base = baseName(splitFile.name);

      if (splitMode === 'single') {
        for (let i = 0; i < src.getPageCount(); i++) {
          const doc = await PDFLib.PDFDocument.create();
          const [page] = await doc.copyPages(src, [i]);
          doc.addPage(page);
          const bytes = await doc.save();
          trigger(new Blob([bytes], { type: 'application/pdf' }), `${base}-page-${String(i + 1).padStart(2, '0')}.pdf`, 'application/pdf');
        }
        toast(`Split into ${src.getPageCount()} files`);
      } else {
        const from = Math.max(1, Math.min(parseInt(els.rangeFrom.value, 10) || 1, src.getPageCount()));
        const to = Math.max(from, Math.min(parseInt(els.rangeTo.value, 10) || from, src.getPageCount()));
        const indices = [];
        for (let i = from - 1; i <= to - 1; i++) indices.push(i);
        const doc = await PDFLib.PDFDocument.create();
        const pages = await doc.copyPages(src, indices);
        pages.forEach(p => doc.addPage(p));
        const bytes = await doc.save();
        trigger(new Blob([bytes], { type: 'application/pdf' }), `${base}-pages-${from}-${to}.pdf`, 'application/pdf');
        toast(`Extracted pages ${from}–${to}`);
      }
    } catch (err) {
      toast('Split failed: ' + (err && err.message || err), true);
    } finally {
      els.splitBtn.disabled = false;
    }
  }

  function trigger(blob, name, type) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded ' + name);
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
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
