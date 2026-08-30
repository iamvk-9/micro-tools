/*
 * app.js — WordCounter: live text statistics.
 * 100% client-side.
 */
window.WordCounterApp = (() => {
  'use strict';

  const els = {};

  document.addEventListener('DOMContentLoaded', () => {
    els.inputText = document.getElementById('inputText');
    els.statGrid = document.getElementById('statGrid');
    renderStats('');
    els.inputText.addEventListener('input', () => renderStats(els.inputText.value));
  });

  function renderStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? (text.match(/[.!?]+(\s|$)/g) || []).length : 0;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
    const lines = text.trim() ? text.split(/\n/).length : 0;
    const readingMin = Math.ceil(words.length / 200);
    const speakingMin = Math.round(words.length / 130);

    let str = '';
    str += statCard(words.length, 'Words', words.length === 1 ? 'word' : 'words');
    str += statCard(chars, 'Characters', 'with spaces');
    str += statCard(charsNoSpace, 'Characters', 'without spaces');
    str += statCard(sentences, 'Sentences', sentences === 1 ? 'sentence' : 'sentences');
    str += statCard(paragraphs, 'Paragraphs', paragraphs === 1 ? 'paragraph' : 'paragraphs');
    str += statCard(lines, 'Lines', lines === 1 ? 'line' : 'lines');
    str += statCard(readingMin, 'Reading time', readingMin <= 1 ? '~1 min' : `~${readingMin} min`);
    str += statCard(speakingMin, 'Speaking time', speakingMin <= 1 ? '~1 min' : `~${speakingMin} min`);

    els.statGrid.innerHTML = str;
  }

  function statCard(value, label, sub) {
    return `<div class="stat-card"><div class="stat-value">${value}</div>` +
           `<div class="stat-label">${label}</div><div class="stat-sub">${sub}</div></div>`;
  }
})();
