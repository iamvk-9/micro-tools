/*
 * converters.js — classifies an uploaded file and dispatches it to the right
 * in-browser converter. Also implements the HTML→PDF path via a sandboxed
 * same-origin iframe (srcdoc) so html2canvas can capture it.
 */
window.Converters = (() => {
  'use strict';

  const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.avif', '.ico']);
  const DOCX_EXT = new Set(['.docx']);
  const XLSX_EXT = new Set(['.xlsx', '.xls', '.xlsm', '.ods']);
  const HTML_EXT = new Set(['.html', '.htm']);
  const TEXT_EXT = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.xml', '.yaml', '.yml',
    '.log', '.ini', '.cfg', '.conf', '.env', '.sh', '.bat', '.cmd', '.ps1',
    '.py', '.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx', '.css', '.scss',
    '.java', '.kt', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.rs', '.rb',
    '.php', '.sql', '.swift', '.scala', '.lua', '.pl', '.r', '.vue', '.toml',
    '.properties', '.sass', '.less', '.sqlite', '.graphql', '.gitignore',
    '.dockerfile', '.editorconfig',
  ]);
  const PDF_EXT = new Set(['.pdf']);

  // Formally recognized but unusable formats get a friendly, specific error.
  const KNOWN_UNSUPPORTED = new Set(['.doc', '.dot', '.ppt', '.pptx', '.pps', '.zip', '.rar', '.7z', '.tar', '.gz']);

  function extOf(file) {
    const name = (file.name || '').toLowerCase();
    const i = name.lastIndexOf('.');
    return i < 0 ? '' : name.slice(i);
  }

  async function readText(file) {
    if (typeof file.arrayBuffer === 'function') {
      return new TextDecoder('utf-8').decode(await file.arrayBuffer());
    }
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file, 'utf-8');
    });
  }

  async function htmlIframeToPdf(file, quality) {
    const html = await readText(file);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1080px;height:800px;border:0;';
    document.body.appendChild(iframe);

    try {
      iframe.srcdoc = html;
      await new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('Could not load the HTML file'));
      });
      // Sub-resources (images / css) may still be loading; give them a moment.
      await new Promise((r) => setTimeout(r, 400));

      const doc = iframe.contentDocument;
      const target = doc.body || doc.documentElement;
      Object.assign(target.style, {
        background: '#ffffff',
        margin: '0',
        padding: '0',
        width: '1040px',
        boxSizing: 'border-box',
      });
      const pdf = await RenderHtml.scrollToPdf(target, quality || 2);
      return pdf;
    } finally {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }
  }

  function dispatch(file) {
    const ext = extOf(file).toLowerCase();

    if (IMAGE_EXT.has(ext)) return { kind: 'image', run: (f, q) => ImageToPdf.convert(f, q) };
    if (DOCX_EXT.has(ext)) return { kind: 'docx', run: (f, q) => DocxToPdf.convert(f, q) };
    if (XLSX_EXT.has(ext)) return { kind: 'xlsx', run: (f, q) => XlsxToPdf.convert(f, q) };
    if (HTML_EXT.has(ext)) return { kind: 'html', run: (f, q) => htmlIframeToPdf(f, q) };
    if (PDF_EXT.has(ext)) return { kind: 'pdf', run: async (f) => new Uint8Array(await f.arrayBuffer()) };

    if (KNOWN_UNSUPPORTED.has(ext)) {
      return {
        kind: 'unsupported',
        reason: ext === '.ppt' || ext === '.pptx'
          ? 'PowerPoint files cannot be converted in the browser. Use a desktop/online tool for full-fidelity slides.'
          : ext === '.doc'
            ? 'Legacy .doc files are not supported in the browser. Re-save as .docx and try again.'
            : 'This format is not supported in the browser.',
      };
    }

    if (TEXT_EXT.has(ext)) {
      return { kind: 'text', run: async (f) => TextToPdf.convert(await readText(f)) };
    }

    // Unknown extension: sniff content. If it decodes as UTF-8 text, treat as text.
    return {
      kind: 'maybe-text',
      run: async (f) => {
        const text = await readText(f);
        if (text.includes('\uFFFD')) throw new Error('Unknown file type. Add a recognized extension like .png, .txt, .docx or .xlsx.');
        return TextToPdf.convert(text);
      },
    };
  }

  function labelOf(kind) {
    return {
      image: 'Image converter',
      docx: 'Word converter',
      xlsx: 'Spreadsheet converter',
      html: 'HTML renderer',
      text: 'Text converter',
      pdf: 'PDF copy',
    }[kind] || 'Converter';
  }

  return { dispatch, labelOf };
})();