/*
 * app.js — TextCase: convert text between different case styles.
 * 100% client-side.
 */
window.TextCaseApp = (() => {
  'use strict';

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    ['inputText', 'outputArea', 'copyBtn', 'clearBtn', 'toastHost']
      .forEach(id => { els[id] = document.getElementById(id); });
    bindEvents();
  });

  function bindEvents() {
    els.inputText.addEventListener('input', () => {
      convert(els.inputText.value);
    });
    document.querySelectorAll('.case-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        convert(els.inputText.value, btn.dataset.case);
      });
    });
    els.copyBtn.addEventListener('click', copyOutput);
    els.clearBtn.addEventListener('click', () => {
      els.inputText.value = '';
      els.outputArea.textContent = '';
      els.inputText.focus();
    });
  }

  function convert(text, targetCase) {
    if (!text) {
      els.outputArea.textContent = '';
      return;
    }
    const target = targetCase || 'upper';
    let result;
    switch (target) {
      case 'upper': result = text.toUpperCase(); break;
      case 'lower': result = text.toLowerCase(); break;
      case 'title': result = toTitleCase(text); break;
      case 'sentence': result = toSentenceCase(text); break;
      case 'camels': result = toCamelCase(text); break;
      case 'pascal': result = toPascalCase(text); break;
      case 'snake': result = toSnakeCase(text); break;
      case 'kebab': result = toKebabCase(text); break;
      case 'inverse': result = invertCase(text); break;
      case 'alternating': result = alternatingCase(text); break;
      default: result = text;
    }
    els.outputArea.textContent = result;
  }

  function toTitleCase(text) {
    return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  function toSentenceCase(text) {
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, m => m.toUpperCase());
  }

  function splitWords(text) {
    return text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[\s_\-—–.,;:!?()\[\]{}'"`/\\|]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function toCamelCase(text) {
    const words = splitWords(text);
    if (!words.length) return '';
    return words[0].toLowerCase() + words.slice(1)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }

  function toPascalCase(text) {
    return splitWords(text)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  function toSnakeCase(text) {
    return splitWords(text).map(w => w.toLowerCase()).join('_');
  }

  function toKebabCase(text) {
    return splitWords(text).map(w => w.toLowerCase()).join('-');
  }

  function invertCase(text) {
    return text.replace(/[a-zA-Z]/g, c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  }

  function alternatingCase(text) {
    let upper = false;
    return text.split('').map(ch => {
      if (/[a-zA-Z]/.test(ch)) {
        upper = !upper;
        return upper ? ch.toUpperCase() : ch.toLowerCase();
      }
      return ch;
    }).join('');
  }

  async function copyOutput() {
    const text = els.outputArea.textContent;
    if (!text) { toast('Nothing to copy', true); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch {
      toast('Copy failed', true);
    }
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
