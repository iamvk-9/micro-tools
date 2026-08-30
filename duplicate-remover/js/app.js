/*
 * app.js — DupRemover: remove duplicate lines from text.
 * 100% client-side.
 */
window.DupRemoverApp = (() => {
  'use strict';

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    ['inputText', 'outputText', 'copyBtn', 'processBtn', 'clearBtn',
     'caseSensitive', 'trimSpaces', 'removeEmpty', 'sortOutput',
     'inputCount', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.processBtn.addEventListener('click', process);
    els.copyBtn.addEventListener('click', copyOutput);
    els.clearBtn.addEventListener('click', () => {
      els.inputText.value = '';
      els.outputText.value = '';
      updateCount('');
      els.inputText.focus();
    });
    els.inputText.addEventListener('input', () => updateCount(els.inputText.value));
  }

  function updateCount(text) {
    const count = text ? text.replace(/^\s*[\r\n]+/, '').split(/\r?\n/).filter(l => l.trim() !== '').length : 0;
    els.inputCount.textContent = count + (count === 1 ? ' line' : ' lines');
  }

  function process() {
    const raw = els.inputText.value;
    const lines = raw.split(/\r?\n/);
    const trim = els.trimSpaces.checked;
    const removeEmpty = els.removeEmpty.checked;
    const caseSensitive = els.caseSensitive.checked;

    const seen = new Set();
    const result = [];
    let removed = 0;

    for (let line of lines) {
      if (trim) line = line.trim();
      if (removeEmpty && line.trim() === '') continue;
      const key = caseSensitive ? line : line.toLowerCase();
      if (seen.has(key)) { removed++; continue; }
      seen.add(key);
      result.push(line);
    }

    if (els.sortOutput.checked) {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      result.sort(collator.compare);
    }

    els.outputText.value = result.join('\n');
    updateCount(raw);
    toast(`Removed ${removed} duplicate${removed === 1 ? '' : 's'} — kept ${result.length} line${result.length === 1 ? '' : 's'}`);
  }

  async function copyOutput() {
    if (!els.outputText.value) { toast('Nothing to copy', true); return; }
    try {
      await navigator.clipboard.writeText(els.outputText.value);
      toast('Copied to clipboard');
    } catch { toast('Copy failed', true); }
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
