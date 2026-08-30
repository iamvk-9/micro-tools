/*
 * app.js — PassGen: cryptographically-random password generator.
 * 100% client-side.
 */
window.PassGenApp = (() => {
  'use strict';

  const els = {};
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUM = '0123456789';
  const SYM = '!@#$%^&*()-_=+[]{};:,.<>?/';
  const AMBIGUOUS = 'Il1O0';

  document.addEventListener('DOMContentLoaded', () => {
    ['passwordField', 'copyBtn', 'regenerateBtn', 'generateBtn', 'downloadBtn',
     'lengthRange', 'lengthVal', 'uc', 'lc', 'num', 'sym', 'ambiguous',
     'countSel', 'batchResults', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
    generate();
  });

  function bindEvents() {
    els.lengthRange.addEventListener('input', () => {
      els.lengthVal.textContent = els.lengthRange.value;
      generate();
    });
    ['uc', 'lc', 'num', 'sym', 'ambiguous'].forEach(id => {
      els[id].addEventListener('change', generate);
    });
    els.generateBtn.addEventListener('click', generateAll);
    els.regenerateBtn.addEventListener('click', single);
    els.copyBtn.addEventListener('click', copyCurrent);
    els.downloadBtn.addEventListener('click', downloadAll);
  }

  function charSet() {
    let set = '';
    if (els.uc.checked) set += UPPER;
    if (els.lc.checked) set += LOWER;
    if (els.num.checked) set += NUM;
    if (els.sym.checked) set += SYM;
    if (els.ambiguous.checked) {
      set = set.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }
    if (!set) set = LOWER;
    return set;
  }

  function randomByte() {
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  }

  function makePassword(set, length) {
    let pw = '';
    for (let i = 0; i < length; i++) {
      pw += set[randomByte() % set.length];
    }
    return pw;
  }

  function single() {
    const set = charSet();
    els.passwordField.value = makePassword(set, parseInt(els.lengthRange.value, 10));
  }

  function generate() {
    if (els.countSel && els.countSel.value === '1') {
      single();
      els.batchResults.classList.add('hidden');
    } else {
      generateAll();
    }
  }

  function generateAll() {
    const count = parseInt(els.countSel.value, 10);
    const set = charSet();
    const lines = [];
    for (let i = 0; i < count; i++) {
      lines.push(makePassword(set, parseInt(els.lengthRange.value, 10)));
    }
    els.passwordField.value = lines[0];
    if (count > 1) {
      els.batchResults.innerHTML = lines.map(l => `<div class="pw-line">${l}</div>`).join('');
      els.batchResults.classList.remove('hidden');
    } else {
      els.batchResults.classList.add('hidden');
    }
  }

  async function copyCurrent() {
    if (!els.passwordField.value) return;
    try {
      await navigator.clipboard.writeText(els.passwordField.value);
      toast('Password copied to clipboard');
    } catch { toast('Copy failed', true); }
  }

  function downloadAll() {
    const count = parseInt(els.countSel.value, 10);
    const set = charSet();
    const lines = [];
    for (let i = 1; i <= count; i++) {
      lines.push((i) + '. ' + makePassword(set, parseInt(els.lengthRange.value, 10)));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passwords.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${count} password${count === 1 ? '' : 's'}`);
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
