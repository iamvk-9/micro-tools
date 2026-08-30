/* ReelSaver — Instagram Reel saver (client-side)
 * Validates & IDs an IG Reel link and does a best-effort public metadata lookup.
 * IMPORTANT: Instagram prevents browsers from downloading Reel video files, so
 * the real value of this tool is the honest, reliable guidance (see README).
 */
(function () {
  'use strict';

  var els = {
    reelUrl: document.getElementById('reelUrl'),
    inspectBtn: document.getElementById('inspectBtn'),
    result: document.getElementById('result'),
    metaPanel: document.getElementById('metaPanel'),
    metaBody: document.getElementById('metaBody'),
    toastHost: document.getElementById('toastHost')
  };

  var REEL_PATTERN = /^(?:https?:\/\/)?(?:www\.|m\.|www\.instagram\.com\/)?(?:instagram\.com|instagr\.am)\/(?:reel|p|tv)\/([A-Za-z0-9_-]{5,})\/?(\?[^\s]*)?$/i;
  var IG_HOST_PATTERN = /instagram\.com|instagr\.am/i;
  var TIMEOUT_MS = 9000;

  function parseShortcode(url) {
    var m = String(url).trim().match(REEL_PATTERN);
    return m ? m[1] : null;
  }

  function validate(url) {
    var value = String(url || '').trim();
    if (!value) return { ok: false, msg: 'Please paste an Instagram Reel link first.' };
    if (!/^(https?:\/\/)/i.test(value)) value = 'https://' + value;
    if (!IG_HOST_PATTERN.test(value)) return { ok: false, msg: 'That does not look like an Instagram link.' };
    var sc = parseShortcode(value);
    if (!sc) return { ok: false, msg: 'Could not find a valid Instagram Reel in that link. Use a link like instagram.com/reel/AbC123XYZ/' };
    return { ok: true, shortcode: sc };
  }

  function baseUrl() {
    return (location.protocol === 'https:' ? 'https' : 'http') + '://' + location.host + location.pathname;
  }

  /* Best-effort public metadata lookup via Instagram's public oEmbed endpoint.
   * Instagram requires CORS-friendly access that is usually blocked for a static
   * page, and many private videos are not embeddable at all — so this is
   * deliberately non-fatal and falls back gracefully to the honest guidance. */
  function lookUpMetadata(shortcode) {
    return new Promise(function (resolve) {
      if (typeof fetch !== 'function') return setTimeout(function () { resolve(null); }, 0);
      var endpoint =
        'https://graph.facebook.com/v20.0/instagram_oembed' +
        '?url=' + encodeURIComponent('https://www.instagram.com/reel/' + shortcode + '/') +
        '&access_token=' + encodeURIComponent('') +
        '&fields=thumbnail_url,title,author_name&maxwidth=600';
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { controller && controller.abort(); }, TIMEOUT_MS);

      fetch(endpoint, { signal: controller ? controller.signal : undefined })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('status ' + r.status)); })
        .then(function (data) { clearTimeout(timer); resolve(data || null); })
        .catch(function () { clearTimeout(timer); resolve(null); });
    });
  }

  function renderMeta(meta, shortcode) {
    els.metaPanel.classList.remove('hidden');
    var thumb = meta && meta.thumbnail_url ? String(meta.thumbnail_url) : null;
    var card = document.createElement('div');
    card.className = 'meta-body';

    if (thumb) {
      var img = document.createElement('img');
      img.className = 'meta-thumb';
      img.src = thumb;
      img.alt = meta && meta.title ? meta.title : 'Reel thumbnail';
      img.loading = 'lazy';
      card.appendChild(img);
    }

    var info = document.createElement('div');
    info.className = 'meta-info';
    var title = document.createElement('p');
    title.className = 'meta-title';
    title.textContent = (meta && meta.title) ? meta.title : 'Instagram Reel (preview unavailable)';
    info.appendChild(title);

    var author = document.createElement('p');
    author.className = 'meta-row';
    author.innerHTML = '<b>Creator:</b> ' + (meta && meta.author_name ? escHtml(meta.author_name) : 'unknown / hidden');
    info.appendChild(author);

    var row = document.createElement('p');
    row.className = 'meta-row';
    row.innerHTML = '<b>Shortcode:</b> <code>' + escHtml(shortcode) + '</code>';
    info.appendChild(row);

    var row2 = document.createElement('p');
    row2.className = 'meta-row';
    row2.innerHTML = '<b>Link:</b> <a href="https://www.instagram.com/reel/' + escHtml(shortcode) + '/" target="_blank" rel="noopener">open in Instagram</a>';
    info.appendChild(row2);

    if (meta && meta.thumbnail_url) {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-primary meta-copy';
      copyBtn.textContent = 'Copy image URL';
      copyBtn.addEventListener('click', function () { copyText(meta.thumbnail_url); });
      info.appendChild(copyBtn);
    } else {
      var note = document.createElement('p');
      note.className = 'honest-note';
      note.textContent = 'Live preview is usually blocked by Instagram for private videos. The link and shortcode above are correct.';
      info.appendChild(note);
    }

    card.appendChild(info);
    els.metaBody.innerHTML = '';
    els.metaBody.appendChild(card);
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setResult(mode, msg) {
    els.result.className = 'result ' + mode;
    els.result.textContent = msg;
    els.result.classList.remove('hidden');
  }

  function copyText(text, cb) {
    function legacy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
      cb && cb(true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb && cb(true); }, legacy);
    } else {
      legacy();
    }
  }

  function toast(msg, isError) {
    var t = document.createElement('div');
    t.className = 'toast' + (isError ? ' toast-error' : '');
    t.textContent = msg;
    els.toastHost.appendChild(t);
    setTimeout(function () { t.classList.add('toast-out'); }, 2400);
    setTimeout(function () { t.remove(); }, 2700);
  }

  function inspect() {
    var v = validate(els.reelUrl.value);
    if (!v.ok) {
      setResult('err', v.msg);
      els.metaPanel.classList.add('hidden');
      return;
    }

    setResult('ok', 'Valid Instagram Reel link · shortcode "' + v.shortcode + '".');
    els.inspectBtn.disabled = true;

    lookUpMetadata(v.shortcode).then(function (meta) {
      renderMeta(meta, v.shortcode);
      els.inspectBtn.disabled = false;
      if (meta && meta.thumbnail_url) {
        toast('Preview loaded from Instagram.');
      } else {
        setResult('warn', 'Live preview was blocked by Instagram (normal for private videos). The link is valid — see the guidance below.');
      }
    });
  }

  function install() {
    els.inspectBtn.addEventListener('click', inspect);
    els.reelUrl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); inspect(); }
    });
  }

  window.__REELSAVER = { baseUrl: baseUrl, validate: validate };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
