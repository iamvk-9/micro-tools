/*
 * app.js — ImgCompress: compress images via canvas re-encoding.
 * 100% client-side.
 */
window.ImgCompressApp = (() => {
  'use strict';

  const els = {};
  const items = [];

  document.addEventListener('DOMContentLoaded', () => {
    ['dropzone', 'fileInput', 'browseBtn', 'fileList', 'downloadAllBtn',
     'qualityRange', 'qualityVal', 'formatSel', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.browseBtn.addEventListener('click', e => { e.stopPropagation(); els.fileInput.click(); });
    els.dropzone.addEventListener('click', () => els.fileInput.click());
    els.dropzone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    els.fileInput.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => els.dropzone.addEventListener(ev, e => { e.preventDefault(); els.dropzone.classList.add('dragover'); }));
    ['dragleave'].forEach(ev => els.dropzone.addEventListener(ev, () => els.dropzone.classList.remove('dragover')));
    els.dropzone.addEventListener('drop', e => {
      e.preventDefault();
      els.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    els.qualityRange.addEventListener('input', () => {
      els.qualityVal.textContent = els.qualityRange.value + '%';
      recompressAll();
    });
    els.formatSel.addEventListener('change', recompressAll);
    els.downloadAllBtn.addEventListener('click', downloadAll);
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
  }

  function addFiles(fileList) {
    const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!imgs.length) { toast('No images found in selection', true); return; }
    imgs.forEach(file => {
      const id = 'img' + Date.now() + Math.random().toString(36).slice(2, 7);
      items.push({ id, file, status: 'working', blob: null, thumb: null });
    });
    renderList();
    processAll();
  }

  function renderList() {
    els.fileList.innerHTML = items.map(item => {
      const f = item.file;
      const before = fmtSize(f.size);
      let meta = `<span class="before">${before}</span> → `;
      let status;
      if (item.status === 'working') {
        meta += 'compressing…';
        status = '<div class="spinner"></div>';
      } else if (item.status === 'done') {
        const after = fmtSize(item.blob.size);
        const diff = item.blob.size - f.size;
        meta += `<span class="after">${after}</span>`;
        if (diff < 0) meta += `<span class="saved">(−${fmtSize(-diff)})</span>`;
        else meta += `<span class="grew">(+${fmtSize(diff)})</span>`;
        status = '<span class="pill pill-done">Done</span>';
      } else {
        meta += 'failed';
        status = '<span class="pill pill-error">Error</span>';
      }
      const thumb = item.thumb ? `<img class="fcard-thumb" src="${item.thumb}" alt="">` : `<div class="fcard-thumb"></div>`;
      return `<div class="fcard" id="${item.id}">
        ${thumb}
        <div class="fcard-info">
          <div class="fcard-name">${escapeHtml(f.name)}</div>
          <div class="fcard-meta">${meta}</div>
        </div>
        <div class="fcard-status">${status}</div>
        <div class="fcard-actions">${item.status === 'done' ? '<button type="button" class="btn btn-dl" data-dl="' + item.id + '">Download</button>' : ''}</div>
      </div>`;
    }).join('');
    document.querySelectorAll('[data-dl]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(i => i.id === btn.dataset.dl);
        if (item && item.blob) downloadOne(item);
      });
    });
  }

  async function processAll() {
    for (const item of items) {
      if (item.status !== 'working') continue;
      item.status = 'working';
      renderList();
      try {
        const { blob, thumb } = await compress(item.file);
        item.blob = blob;
        item.thumb = thumb;
        item.status = 'done';
      } catch {
        item.status = 'error';
      }
      renderList();
    }
    toast('Compression finished');
  }

  function recompressAll() {
    items.forEach(item => {
      item.status = 'working';
      item.blob = null;
    });
    processAll();
  }

  function compress(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const quality = parseInt(els.qualityRange.value, 10) / 100;
          const type = mimeFor(els.formatSel.value);
          canvas.toBlob(blob => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error('encode failed')); return; }
            const thumb = canvas.toDataURL('image/jpeg', 0.6);
            resolve({ blob, thumb });
          }, type, quality);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
      img.src = url;
    });
  }

  function mimeFor(format) {
    if (format === 'webp') return 'image/webp';
    if (format === 'png') return 'image/png';
    return 'image/jpeg';
  }

  function extFor(format) {
    if (format === 'webp') return 'webp';
    if (format === 'png') return 'png';
    return 'jpg';
  }

  function baseName(name) {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }

  function downloadOne(item) {
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = baseName(item.file.name) + '-compressed.' + extFor(els.formatSel.value);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    const ready = items.filter(i => i.status === 'done');
    if (!ready.length) { toast('No compressed images ready', true); return; }
    ready.forEach((item, idx) => setTimeout(() => downloadOne(item), idx * 250));
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
