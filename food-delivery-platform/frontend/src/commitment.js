/*
 * "Đọc cam kết": hiện bản cam kết (nội dung lấy từ API /api/partners/commitments/:kind) trong hộp thoại cuộn;
 * nút "Tôi đã đọc và đồng ý" chỉ bật khi người dùng đã kéo xuống tận cuối.
 * FDCommit.read(kind) → Promise<{kind, version, accepted, readToEnd} | null>
 */
(function () {
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);

  function fillContact(text) {
    const contact = fd().state.storefront?.contact ?? {};
    return String(text)
      .replace('{{email}}', contact.email ? `email ${contact.email}` : 'bộ phận hỗ trợ của FoodGo')
      .replace('{{hotline}}', contact.phone ? ` hoặc hotline ${contact.phone}` : '');
  }

  async function read(kind) {
    let content;
    try {
      content = await fd().api(`/api/partners/commitments/${encodeURIComponent(kind)}`);
    } catch (error) {
      fd().toast(error.message, true);
      return null;
    }
    return new Promise(resolve => {
      document.getElementById('fdCommit')?.remove();
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop commit-backdrop';
      wrap.id = 'fdCommit';
      wrap.innerHTML = `
        <section class="m-dialog is-wide commit-dialog" role="dialog" aria-modal="true" aria-label="${esc(content.title)}">
          <header><h3>${esc(content.title)}</h3><button type="button" class="modal-close" data-commit-close aria-label="Đóng">×</button></header>
          <div class="commit-meta"><span>Phiên bản ${esc(content.version)}</span><span class="commit-progress" aria-hidden="true"><i data-commit-bar></i></span><span data-commit-percent>0%</span></div>
          <div class="commit-body" data-commit-body tabindex="0">
            <p class="commit-intro">${esc(content.intro)}</p>
            ${content.sections.map(section => `
              <section class="commit-section">
                <h4>${esc(section.title)}</h4>
                <ol>${section.items.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
              </section>`).join('')}
            <p class="commit-closing">${esc(fillContact(content.closing))}</p>
            <p class="commit-end" data-commit-end>— Hết bản cam kết —</p>
          </div>
          <footer class="commit-footer">
            <p class="commit-hint" data-commit-hint>⬇ Kéo xuống cuối bản cam kết để bật nút xác nhận.</p>
            <div class="button-row m-actions">
              <button type="button" class="secondary-button" data-commit-close>Đóng</button>
              <button type="button" class="primary-button" data-commit-accept disabled>Tôi đã đọc và đồng ý</button>
            </div>
          </footer>
        </section>`;
      document.body.appendChild(wrap);
      document.body.classList.add('modal-open');

      const body = wrap.querySelector('[data-commit-body]');
      const accept = wrap.querySelector('[data-commit-accept]');
      const hint = wrap.querySelector('[data-commit-hint]');
      let reachedEnd = false;
      const update = () => {
        const max = body.scrollHeight - body.clientHeight;
        const ratio = max <= 0 ? 1 : Math.min(1, body.scrollTop / max);
        wrap.querySelector('[data-commit-bar]').style.width = `${Math.round(ratio * 100)}%`;
        wrap.querySelector('[data-commit-percent]').textContent = `${Math.round(ratio * 100)}%`;
        if (!reachedEnd && (max <= 0 || body.scrollTop >= max - 6)) {
          reachedEnd = true;
          accept.disabled = false;
          hint.textContent = '✅ Bạn đã đọc đến cuối. Bấm "Tôi đã đọc và đồng ý" để xác nhận.';
          hint.classList.add('is-done');
        }
      };
      body.addEventListener('scroll', update, { passive: true });
      update();
      body.focus();

      const finish = result => {
        wrap.remove();
        // Hộp thoại đăng ký đối tác bên dưới (nếu còn) vẫn đang mở
        document.body.classList.toggle('modal-open', Boolean(document.getElementById('fdDialog')));
        resolve(result);
      };
      wrap.addEventListener('click', event => {
        if (event.target.closest('[data-commit-close]')) finish(null);
      });
      accept.addEventListener('click', () => { if (reachedEnd) finish({ kind, version: content.version, accepted: true, readToEnd: true }); });
      wrap.addEventListener('keydown', event => { if (event.key === 'Escape') finish(null); });
    });
  }

  window.FDCommit = { read };
}());
