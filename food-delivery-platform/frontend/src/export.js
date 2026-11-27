/* Menu xuất dữ liệu: mọi nút [data-export-url] tải file Excel (.xlsx), PDF hoặc CSV do máy chủ sinh ra.
   Dùng chung bộ tải của analytics.js (kèm token đăng nhập). */
(function () {
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);

  async function run(url, fmt) {
    await window.FDAN.download(url.replace('{rid}', fd().state.ownerRestaurantId), fmt);
  }

  /* <details> dropdown liệt kê các bộ dữ liệu, mỗi bộ có nút Excel / PDF / CSV */
  function menu(items, label = '⬇ Xuất dữ liệu') {
    return `<details class="export-menu"><summary class="secondary-button">${label}</summary><div class="export-pop">${items.map(item => `
      <div class="export-row"><span>${esc(item.label)}</span>
        <button type="button" class="secondary-button compact-button" data-export-url="${esc(item.url)}" data-export-fmt="xlsx">Excel</button>
        <button type="button" class="secondary-button compact-button" data-export-url="${esc(item.url)}" data-export-fmt="pdf">PDF</button>
        <button type="button" class="secondary-button compact-button" data-export-url="${esc(item.url)}" data-export-fmt="csv">CSV</button>
      </div>`).join('')}</div></details>`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-export-url]');
    if (button) {
      button.closest('details')?.removeAttribute('open');
      run(button.dataset.exportUrl, button.dataset.exportFmt);
      return;
    }
    document.querySelectorAll('.export-menu[open]').forEach(el => { if (!el.contains(event.target)) el.removeAttribute('open'); });
  });

  window.FDExport = { menu, run };
}());
