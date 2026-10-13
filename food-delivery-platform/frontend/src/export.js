/* Export helpers: any element with [data-export-url] downloads that dataset as CSV or a printable PDF report.
   The API returns {title, columns:[{key,label,type}], rows}; CSV and PDF are both rendered here. */
(function () {
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);
  const nf = new Intl.NumberFormat('vi-VN');
  const pad = n => String(n).padStart(2, '0');

  function format(value, type) {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'money') return `${nf.format(Math.round(Number(value) || 0))}`;
    if (type === 'number') return nf.format(Number(value) || 0);
    if (type === 'date' || type === 'datetime') {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      return type === 'date' ? day : `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return String(value);
  }

  /* raw value for CSV: keep numbers machine-readable, neutralise spreadsheet formulas */
  function csvValue(value, type) {
    if (value === null || value === undefined) return '';
    if (type === 'money' || type === 'number') return String(Number(value) || 0);
    const text = format(value, type);
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  }

  function csvCell(text) {
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function toCsv(dataset) {
    const lines = [dataset.columns.map(c => csvCell(c.label)).join(',')];
    dataset.rows.forEach(row => lines.push(dataset.columns.map(c => csvCell(csvValue(row[c.key], c.type))).join(',')));
    return `﻿${lines.join('\r\n')}\r\n`;
  }

  function download(filename, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function summaryRow(dataset) {
    const sums = dataset.columns.filter(c => c.type === 'money');
    if (!sums.length) return '';
    return `<tr class="total"><td colspan="${dataset.columns.length - sums.length || 1}">Tổng cộng (${nf.format(dataset.rows.length)} dòng)</td>${sums.map(c => `<td class="r">${nf.format(Math.round(dataset.rows.reduce((a, r) => a + (Number(r[c.key]) || 0), 0)))}</td>`).join('')}</tr>`;
  }

  function reportHtml(dataset, title) {
    const user = fd().state.user;
    const head = dataset.columns.map(c => `<th class="${c.type === 'money' || c.type === 'number' ? 'r' : ''}">${esc(c.label)}</th>`).join('');
    const body = dataset.rows.map(row => `<tr>${dataset.columns.map(c => `<td class="${c.type === 'money' || c.type === 'number' ? 'r' : ''}">${esc(format(row[c.key], c.type))}</td>`).join('')}</tr>`).join('');
    const wide = dataset.columns.length > 7;
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page { size: A4 ${wide ? 'landscape' : 'portrait'}; margin: 14mm 10mm; }
      * { box-sizing: border-box; }
      body { font: 12px/1.45 "Be Vietnam Pro", "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }
      header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #ee4d2d; padding-bottom: 8px; margin-bottom: 12px; }
      .brand { font-size: 20px; font-weight: 800; color: #ee4d2d; }
      h1 { font-size: 17px; margin: 0 0 2px; }
      .meta { color: #6b7280; font-size: 11px; text-align: right; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #fff1ec; color: #b4321a; text-align: left; font-size: 11px; }
      th, td { border: 1px solid #e5e7eb; padding: 4px 6px; vertical-align: top; word-break: break-word; }
      tr:nth-child(even) td { background: #fafafa; }
      .r { text-align: right; white-space: nowrap; }
      tr.total td { font-weight: 700; background: #fff1ec; }
      thead { display: table-header-group; } tr { page-break-inside: avoid; }
      footer { margin-top: 10px; color: #9ca3af; font-size: 10px; text-align: center; }
      </style></head><body>
      <header><div><div class="brand">FoodGo</div><h1>${esc(title)}</h1></div>
      <div class="meta">Xuất lúc: ${esc(format(new Date().toISOString(), 'datetime'))}<br>Người xuất: ${esc(user?.fullName || user?.username || '—')}<br>${nf.format(dataset.rows.length)} dòng${dataset.truncated ? ' (đã cắt bớt)' : ''}</div></header>
      <table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${dataset.columns.length}">Không có dữ liệu.</td></tr>`}${summaryRow(dataset)}</tbody></table>
      <footer>FoodGo · Báo cáo tạo tự động từ hệ thống quản trị</footer></body></html>`;
  }

  /* render in a hidden iframe and open the print dialog ("Save as PDF") — no pop-up needed */
  function printHtml(html) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.srcdoc = html;
    frame.onload = () => {
      setTimeout(() => {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch { fd().toast('Trình duyệt chặn in. Hãy thử Ctrl+P.', true); }
        setTimeout(() => frame.remove(), 60000);
      }, 250);
    };
    document.body.appendChild(frame);
  }

  async function run(url, fmt, fallbackTitle) {
    try {
      fd().toast('Đang chuẩn bị dữ liệu…');
      const dataset = await fd().api(url.replace('{rid}', fd().state.ownerRestaurantId));
      const stamp = new Date().toISOString().slice(0, 10);
      if (!dataset.rows.length) { fd().toast('Không có dữ liệu để xuất.', true); return; }
      if (fmt === 'csv') {
        download(`${dataset.name || 'export'}-${stamp}.csv`, toCsv(dataset), 'text/csv;charset=utf-8');
        fd().toast(`Đã xuất ${dataset.rows.length} dòng ra CSV.`);
      } else {
        printHtml(reportHtml(dataset, dataset.title || fallbackTitle || 'Báo cáo'));
      }
    } catch (error) {
      fd().toast(error.message, true);
    }
  }

  /* <details> dropdown listing datasets, each with CSV / PDF buttons */
  function menu(items, label = '⬇ Xuất dữ liệu') {
    return `<details class="export-menu"><summary class="secondary-button">${label}</summary><div class="export-pop">${items.map(item => `
      <div class="export-row"><span>${esc(item.label)}</span>
        <button type="button" class="secondary-button compact-button" data-export-url="${esc(item.url)}" data-export-fmt="csv" data-export-title="${esc(item.label)}">CSV</button>
        <button type="button" class="secondary-button compact-button" data-export-url="${esc(item.url)}" data-export-fmt="pdf" data-export-title="${esc(item.label)}">PDF</button>
      </div>`).join('')}</div></details>`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-export-url]');
    if (button) {
      button.closest('details')?.removeAttribute('open');
      run(button.dataset.exportUrl, button.dataset.exportFmt, button.dataset.exportTitle);
      return;
    }
    document.querySelectorAll('.export-menu[open]').forEach(el => { if (!el.contains(event.target)) el.removeAttribute('open'); });
  });

  window.FDExport = { menu, run, toCsv };
}());
