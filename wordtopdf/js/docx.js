/*
 * docx.js — convert Word documents (.docx) to PDF.
 * docx-preview renders the document to real paginated page elements;
 * each page is rasterized with html2canvas and written to the PDF.
 */
window.DocxToPdf = (() => {
  'use strict';

  function cleanup(container) {
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }

  async function convert(file, quality) {
    const container = document.createElement('div');
    container.className = 'docx-preview-host';
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;overflow:visible;';
    document.body.appendChild(container);

    try {
      const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      await docx.renderAsync(
        blob,
        container,
        null,
        {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        }
      );

      // Wait a frame for fonts/layout to settle before rasterizing.
      await new Promise((r) => setTimeout(r, 300));
      if (document.fonts) await document.fonts.ready;

      // docx-preview wraps each page in a <section class="docx">.
      const pages = Array.from(container.querySelectorAll('section.docx'));
      if (pages.length === 0) {
        const fallback = Array.from(container.querySelectorAll('.docx-wrapper > *'));
        if (fallback.length === 0) throw new Error('Document rendered no pages.');
        return await RenderHtml.elementsToPdf(fallback, quality || 2);
      }
      return await RenderHtml.elementsToPdf(pages, quality || 2);
    } finally {
      cleanup(container);
    }
  }

  return { convert };
})();