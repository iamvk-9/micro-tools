/*
 * app.js — RandNum: random number generator.
 * 100% client-side.
 */
window.RandNumApp = (() => {
  'use strict';

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    ['minVal', 'maxVal', 'countSel', 'noDup', 'generateBtn', 'copyBtn', 'resultBox', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.generateBtn.addEventListener('click', generate);
    els.copyBtn.addEventListener('click', copy);
    els.minVal.addEventListener('keydown', enterGen);
    els.maxVal.addEventListener('keydown', enterGen);
    els.countSel.addEventListener('keydown', enterGen);
  }

  function enterGen(e) { if (e.key === 'Enter') generate(); }

  function generate() {
    const min = parseInt(els.minVal.value, 10);
    const max = parseInt(els.maxVal.value, 10);
    const count = parseInt(els.countSel.value, 10);
    const noDup = els.noDup.checked;

    if (isNaN(min) || isNaN(max) || isNaN(count)) { error('Please enter valid numbers'); return; }
    if (min > max) { error('Minimum must be ≤ maximum'); return; }
    if (count < 1) { error('How many must be at least 1'); return; }
    if (noDup && (max - min + 1) < count) { error('Not enough unique numbers in this range'); return; }

    const result = [];
    if (noDup) {
      const pool = [];
      for (let i = min; i <= max; i++) pool.push(i);
      for (let i = 0; i < count; i++) {
        const idx = secureRandom(pool.length);
        result.push(pool.splice(idx, 1)[0]);
      }
    } else {
      for (let i = 0; i < count; i++) {
        result.push(min + secureRandom(max - min + 1));
      }
    }

    els.resultBox.classList.remove('hidden');
    els.resultBox.innerHTML = result.map((n, i) => `<div class="num-chip" style="animation-delay:${i * 30}ms">${n}</div>`).join('');
  }

  function secureRandom(bound) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % bound;
  }

  async function copy() {
    const chips = els.resultBox.querySelectorAll('.num-chip');
    if (!chips.length) { error('Nothing to copy yet'); return; }
    const text = Array.from(chips).map(c => c.textContent).join(', ');
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch { error('Copy failed'); }
  }

  function error(msg) { toast(msg, true); }

  function toast(msg, isError) {
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' toast-error' : '');
    el.textContent = msg;
    els.toastHost.appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); }, 2200);
    setTimeout(() => { el.remove(); }, 2600);
  }
})();
