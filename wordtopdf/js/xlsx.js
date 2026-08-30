/*
 * xlsx.js — convert spreadsheet files (.xlsx, .xls, .xlsm, .ods) to PDF.
 * SheetJS extracts cell data, which is rendered as a styled HTML table and
 * then sliced into pages by the shared html2canvas pipeline.
 */
window.XlsxToPdf = (() => {
  'use strict';

  function sheetToMatrix(ws) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const rows = [];
    const maxCols = 200;
    const maxRows = 5000;
    for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + maxRows); r++) {
      const row = [];
      for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + maxCols); c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        row.push(cell && cell.v != null ? String(cell.v) : '');
      }
      while (row.length && row[row.length - 1] === '') row.pop();
      if (row.length) rows.push(row);
    }
    return rows;
  }

  function buildTables(wb) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:1080px;background:#ffffff;padding:24px 28px;box-sizing:border-box;';
    document.body.appendChild(host);

    const names = wb.SheetNames;
    names.forEach((sheetName, idx) => {
      const ws = wb.Sheets[sheetName];
      const grid = sheetToMatrix(ws);

      if (names.length > 1) {
        const title = document.createElement('h1');
        title.textContent = sheetName;
        title.style.cssText = 'font:700 20px/1.4 Arial,Helvetica,sans-serif;color:#111827;margin:0 0 6px;';
        if (idx > 0) title.style.marginTop = '40px';
        host.appendChild(title);

        const pageBreak = document.createElement('div');
        pageBreak.style.cssText = 'page-break-after:always;';
        host.appendChild(pageBreak);

        const spacer = document.createElement('div');
        spacer.style.height = '26px';
        host.appendChild(spacer);
      }

      const table = document.createElement('table');
      table.style.cssText =
        'border-collapse:collapse;width:100%;font:12px/1.35 Arial,Helvetica,sans-serif;color:#111827;';
      const tbody = document.createElement('tbody');

      grid.forEach((cells, r) => {
        const tr = document.createElement('tr');
        cells.forEach((val, c) => {
          const td = document.createElement('td');
          td.textContent = val;
          td.style.cssText =
            'border:1px solid #d7dce1;padding:5px 8px;white-space:normal;word-break:break-word;' +
            (r === 0 ? 'font-weight:700;background:#eef4f3;' : (r % 2 ? 'background:#f8faf9;' : ''));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      host.appendChild(table);
    });
    return host;
  }

  async function convert(file, quality) {
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    if (!wb.SheetNames.length) throw new Error('Workbook contains no sheets.');

    const host = buildTables(wb);
    try {
      return await RenderHtml.scrollToPdf(host, quality || 2);
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
    }
  }

  return { convert };
})();