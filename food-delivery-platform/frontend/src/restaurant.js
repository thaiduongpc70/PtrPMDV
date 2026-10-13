/* Restaurant owner console: dashboard, order history, reviews, opening hours. */
(function () {
  const U = window.FDUI;
  const fd = () => window.FD;
  const { esc, num, vnd, dt, chip, statCard, table, cell, pager, barChart, hbars, donut, fillDays, modal, act, loading } = U;
  const api = (path, options) => fd().api(path, options);
  const json = body => ({ body: JSON.stringify(body) });
  const $ = selector => document.querySelector(selector);
  const rid = () => fd().state.ownerRestaurantId;
  const panel = id => document.querySelector(`#restaurantScreen [data-view-panel="restaurant:${id}"]`);

  const NAV = [
    { group: 'Kinh doanh' },
    { id: 'dashboard', ico: '📊', label: 'Tổng quan' },
    { id: 'orders', ico: '🔔', label: 'Đơn đang xử lý' },
    { id: 'history', ico: '🧾', label: 'Lịch sử đơn hàng' },
    { group: 'Cửa hàng' },
    { id: 'menu', ico: '🍽️', label: 'Thực đơn' },
    { id: 'promotions', ico: '🎟️', label: 'Khuyến mãi' },
    { id: 'reviews', ico: '⭐', label: 'Đánh giá' },
    { id: 'branches', ico: '🏪', label: 'Hồ sơ & giờ mở cửa' },
    { group: 'Tài chính' },
    { id: 'settlement', ico: '🏦', label: 'Đối soát & hoa hồng' }
  ];
  const TITLES = Object.fromEntries(NAV.filter(n => n.id).map(n => [n.id, n.label]));
  const state = { history: { page: 1, q: '', status: '', from: '', to: '' }, days: 7 };
  let built = false;
  let boardTimer = null;

  /* ---------- scaffold ---------- */
  function build() {
    if (built) return;
    const screen = $('#restaurantScreen');
    if (!screen) return;

    const head = screen.querySelector('.workspace-head');
    head.innerHTML = `
      <div><p class="eyebrow">Kênh nhà hàng</p><h2 id="restaurantHeading">Tổng quan</h2></div>
      <div class="head-tools" id="restaurantTools"></div>`;
    const tools = head.querySelector('#restaurantTools');
    const select = $('#ownerRestaurantSelect');
    tools.appendChild(select);
    tools.insertAdjacentHTML('beforeend', `
      <label class="open-toggle" title="Bật/tắt nhận đơn"><span id="openLabel">Đang mở cửa</span>
        <span class="switch"><input type="checkbox" id="openToggle"><span></span></span></label>
      <button class="secondary-button" type="button" id="restaurantReload">↻ Làm mới</button>`);
    $('#restaurantReload').addEventListener('click', () => $('#refreshRestaurantButton').click());

    const nav = screen.querySelector('.sub-tabs');
    nav.innerHTML = NAV.map(item => item.group
      ? `<span class="nav-group">${item.group}</span>`
      : `<button type="button" data-view="${item.id}" class="${item.id === 'dashboard' ? 'is-active' : ''}" data-subview-target="restaurant:${item.id}"><span class="nav-ico">${item.ico}</span>${item.label}<span class="nav-badge" data-badge="${item.id}" hidden></span></button>`).join('');
    nav.querySelectorAll('button').forEach(button => button.addEventListener('click', () => fd().showSubView('restaurant', button.dataset.view)));

    const layout = screen.querySelector('.restaurant-layout');
    ['dashboard', 'history', 'reviews'].forEach(id => layout.insertAdjacentHTML('afterbegin', `<section class="page-section" data-view-panel="restaurant:${id}"></section>`));

    // branches panel: hide legacy controls, add opening hours
    const branches = panel('branches');
    branches.querySelector('.panel-title h3').textContent = 'Thông tin cửa hàng';
    branches.querySelector('.panel-title p').textContent = 'Hồ sơ & vận hành';
    branches.classList.add('page-section');
    branches.querySelectorAll(':scope > .button-row').forEach(node => { node.hidden = true; });
    select.removeAttribute('style');
    branches.insertAdjacentHTML('beforeend', '<div class="card hours-card" id="hoursCard" style="margin-top:18px"></div>');

    // orders panel toolbar
    const orders = panel('orders');
    orders.querySelector('.panel-title').insertAdjacentHTML('afterend', `
      <div class="page-toolbar board-toolbar"><span class="muted" id="boardHint">Tự động cập nhật mỗi 20 giây</span>
      <div class="legend board-legend"><span><i style="background:#f59e0b"></i>Chờ xác nhận</span><span><i style="background:#2563eb"></i>Đang xử lý</span><span><i style="background:#12a05c"></i>Sẵn sàng giao</span></div></div>`);
    orders.querySelector('.panel-title h3').textContent = 'Bảng xử lý đơn';

    // menu panel: search + availability filter
    const menu = panel('menu');
    const tableShell = menu.querySelector('.table-shell');
    tableShell.insertAdjacentHTML('beforebegin', `
      <div class="filter-bar menu-filter"><input type="search" id="menuSearch" placeholder="Tìm món theo tên, nhóm…">
        <div class="pill-tabs" id="menuAvail"><button type="button" class="is-active" data-v="">Tất cả</button><button type="button" data-v="Đang bán">Đang bán</button><button type="button" data-v="Tạm ẩn">Tạm ẩn</button></div>
        <span class="muted" id="menuCountInfo"></span></div>`);
    const PAGE = 12;
    let menuPage = 1;
    const applyMenuFilter = (resetPage = true) => {
      if (resetPage === true) menuPage = 1;
      const q = $('#menuSearch').value.trim().toLowerCase();
      const avail = $('#menuAvail .is-active').dataset.v;
      const rows = Array.from(document.querySelectorAll('#ownerMenuRows tr'));
      const matched = rows.filter(row => (!q || row.textContent.toLowerCase().includes(q)) && (!avail || row.querySelector('.status-chip')?.textContent.trim() === avail));
      const pages = Math.max(1, Math.ceil(matched.length / PAGE));
      menuPage = Math.min(menuPage, pages);
      const visible = new Set(matched.slice((menuPage - 1) * PAGE, menuPage * PAGE));
      rows.forEach(row => { row.hidden = !visible.has(row); });
      $('#menuCountInfo').textContent = rows.length ? `${matched.length}/${rows.length} món` : '';
      const pager = $('#menuPager');
      pager.hidden = !rows.length;
      pager.innerHTML = `<span>Trang ${menuPage}/${pages}</span><div class="button-row">
        <button class="secondary-button compact-button" type="button" data-mp="${menuPage - 1}" ${menuPage <= 1 ? 'disabled' : ''}>‹ Trước</button>
        <button class="secondary-button compact-button" type="button" data-mp="${menuPage + 1}" ${menuPage >= pages ? 'disabled' : ''}>Sau ›</button></div>`;
    };
    tableShell.insertAdjacentHTML('afterend', '<div class="pager" id="menuPager" hidden></div>');
    $('#menuPager').addEventListener('click', event => {
      const b = event.target.closest('[data-mp]');
      if (b && !b.disabled) { menuPage = Number(b.dataset.mp); applyMenuFilter(false); }
    });
    const toolGrid = menu.querySelector('.management-grid');
    const catList = menu.querySelector('#ownerCategoryRows');
    const details = document.createElement('details');
    details.className = 'menu-tools';
    details.innerHTML = '<summary>⚙️ Nhóm món, topping & kích cỡ</summary>';
    toolGrid.before(details);
    details.append(toolGrid, catList);
    $('#menuSearch').addEventListener('input', () => applyMenuFilter(true));
    $('#menuAvail').addEventListener('click', event => {
      const b = event.target.closest('button'); if (!b) return;
      document.querySelectorAll('#menuAvail button').forEach(x => x.classList.toggle('is-active', x === b));
      applyMenuFilter(true);
    });
    new MutationObserver(() => applyMenuFilter(true)).observe($('#ownerMenuRows'), { childList: true });
    menu.querySelector('.panel-title h3').textContent = 'Quản lý thực đơn';
    $('#toggleCreateItemButton').className = 'primary-button compact-button';
    $('#toggleCreateItemButton').textContent = '＋ Thêm món mới';

    select.addEventListener('change', () => setTimeout(() => refresh(fd().state.subViews.restaurant), 50));
    $('#openToggle').addEventListener('change', toggleOpen);
    built = true;
  }

  function currentRestaurant() {
    return fd().state.ownerRestaurants.find(x => Number(x.id) === Number(rid()));
  }

  function syncOpenToggle() {
    const r = currentRestaurant();
    const box = $('#openToggle');
    if (!box) return;
    if (!r) { box.disabled = true; return; }
    const adjustable = ['ACTIVE', 'INACTIVE'].includes(r.status);
    box.disabled = !adjustable;
    box.checked = r.status === 'ACTIVE';
    $('#openLabel').textContent = !adjustable ? (r.status === 'PENDING' ? 'Chờ duyệt' : 'Bị khóa') : (r.status === 'ACTIVE' ? 'Đang mở cửa' : 'Tạm nghỉ');
  }

  async function toggleOpen(event) {
    const open = event.target.checked;
    const res = await act(() => api(`/api/restaurant/manage/${rid()}/availability`, { method: 'PATCH', ...json({ open }) }), open ? 'Cửa hàng đã mở nhận đơn.' : 'Cửa hàng tạm nghỉ, khách sẽ không đặt được món.');
    const r = currentRestaurant();
    if (res && r) r.status = res.status;
    syncOpenToggle();
  }

  function refresh(view) {
    build();
    syncOpenToggle();
    const heading = $('#restaurantHeading');
    if (heading) heading.textContent = TITLES[view] || 'Quản lý nhà hàng';
    clearInterval(boardTimer);
    boardTimer = null;
    if (!rid()) return;
    const fn = { dashboard, history, reviews, branches: hours, orders: boardAuto, menu: () => fd().loadOwnerMenu() }[view];
    fn?.(panel(view));
  }

  document.addEventListener('fd:subview', event => { if (event.detail.screen === 'restaurant') refresh(event.detail.view); });
  document.addEventListener('fd:screen', event => {
    if (event.detail.screen === 'restaurant') { build(); syncOpenToggle(); pollBadge(); }
  });

  function boardAuto() {
    const reload = () => { if (panel('orders').classList.contains('is-subview-active') && !document.querySelector('#restaurantOrderBoard .order-detail-card')) $('#loadRestaurantQueueButton').click(); };
    boardTimer = setInterval(reload, 20000);
  }

  async function pollBadge() {
    if (fd().roleOf(fd().state.user) !== 'RESTAURANT' || !rid()) return;
    try {
      const s = await api(`/api/restaurant/manage/${rid()}/stats?days=7`);
      const badge = document.querySelector('[data-badge="orders"]');
      if (badge) { badge.textContent = s.today.pending; badge.hidden = !s.today.pending; }
    } catch { /* bỏ qua */ }
  }
  setInterval(pollBadge, 30000);

  function bindClicks(container, handlers) {
    container.onclick = event => {
      const pg = event.target.closest('[data-page]');
      if (pg && handlers.page && !pg.disabled) { handlers.page(Number(pg.dataset.page)); return; }
      const button = event.target.closest('[data-act]');
      if (button) handlers[button.dataset.act]?.(button.dataset, button);
    };
  }

  /* ============ DASHBOARD ============ */
  async function dashboard(el) {
    el.innerHTML = loading;
    try {
      const s = await api(`/api/restaurant/manage/${rid()}/stats?days=${state.days}`);
      const series = fillDays(s.daily, state.days, ['revenue', 'orders']);
      const totalRevenue = series.reduce((a, b) => a + b.revenue, 0);
      const totalOrders = series.reduce((a, b) => a + b.orders, 0);
      const r = s.restaurant;
      const statusLabels = { DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', PENDING: 'Chờ xác nhận', READY_FOR_PICKUP: 'Sẵn sàng', PREPARING: 'Đang chuẩn bị', CONFIRMED: 'Đã xác nhận', DELIVERING: 'Đang giao', SHIPPER_ASSIGNED: 'Có tài xế', PICKED_UP: 'Đã lấy hàng' };
      el.innerHTML = `
        ${s.today.pending ? `<div class="alert-bar"><span>🔔 Bạn có <b>${s.today.pending}</b> đơn mới đang chờ xác nhận.</span><button class="primary-button compact-button" data-act="go" data-go="orders">Xử lý ngay</button></div>` : ''}
        <div class="stat-grid">
          ${statCard({ label: 'Doanh thu hôm nay', value: vnd(s.today.revenue), hint: `${num(s.today.orders)} đơn · ${num(s.today.cancelled)} hủy`, icon: '💰' })}
          ${statCard({ label: `Doanh thu ${state.days} ngày`, value: vnd(totalRevenue), hint: `${num(totalOrders)} đơn`, icon: '📈', tone: 'is-green' })}
          ${statCard({ label: 'Giá trị TB/đơn', value: vnd(totalOrders ? totalRevenue / totalOrders : 0), icon: '🧮', tone: 'is-blue' })}
          ${statCard({ label: 'Đánh giá', value: `★ ${r.rating.toFixed(1)}`, hint: `${num(r.totalReviews)} lượt đánh giá`, icon: '⭐', tone: 'is-amber' })}
          ${statCard({ label: 'Tổng đơn từ trước đến nay', value: num(r.totalOrders), hint: `Hoa hồng nền tảng ${r.commissionRate}%`, icon: '🧾', tone: 'is-blue' })}
          ${statCard({ label: 'Tổng doanh thu', value: vnd(r.totalRevenue), icon: '🏦', tone: 'is-green' })}
        </div>
        <div class="grid-65">
          <div class="card"><div class="card-head"><h4>Doanh thu theo ngày</h4>
            <div class="pill-tabs">${[7, 14, 30].map(n => `<button type="button" class="${state.days === n ? 'is-active' : ''}" data-act="days" data-days="${n}">${n} ngày</button>`).join('')}</div></div>
            ${barChart(series, { valueKey: 'revenue' })}</div>
          <div class="card"><h4>Trạng thái đơn</h4>${donut(s.orderStatus, { labelKey: 'status', valueKey: 'total', labelFn: x => statusLabels[x] || x })}</div>
        </div>
        <div class="grid-2">
          <div class="card"><h4>Món bán chạy</h4>${hbars(s.topItems, { valueKey: 'quantity', format: v => `${num(v)} phần`, sub: x => vnd(x.revenue) })}</div>
          <div class="card"><h4>Khách hàng thân thiết</h4>${hbars(s.topCustomers.map(c => ({ ...c, name: c.name })), { valueKey: 'spent', format: vnd, tone: 'is-blue', sub: x => `${num(x.orders)} đơn` })}</div>
        </div>`;
      const badge = document.querySelector('[data-badge="orders"]');
      if (badge) { badge.textContent = s.today.pending; badge.hidden = !s.today.pending; }
      bindClicks(el, {
        go: data => fd().showSubView('restaurant', data.go),
        days: data => { state.days = Number(data.days); dashboard(el); }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ HISTORY ============ */
  async function history(el) {
    const s = state.history;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `
        <div class="page-toolbar"><div><h3>Lịch sử đơn hàng</h3><p class="muted">Tra cứu mọi đơn đã nhận theo thời gian, trạng thái hoặc khách hàng.</p></div><div class="button-row">${window.FDExport.menu([
          { label: 'Đơn hàng', url: `/api/restaurant/export/{rid}/orders` },
          { label: 'Doanh thu theo ngày', url: `/api/restaurant/export/{rid}/revenue` },
          { label: 'Thực đơn & số món đã bán', url: `/api/restaurant/export/{rid}/menu` },
          { label: 'Đối soát', url: `/api/restaurant/export/{rid}/settlements` }
        ])}</div></div>
        <form class="filter-bar" data-filters>
          <input type="search" name="q" placeholder="Mã đơn, tên/SĐT khách…">
          <select name="status"><option value="">Mọi trạng thái</option>${['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED'].map(x => `<option value="${x}">${chip(x, 'order').replace(/<[^>]+>/g, '')}</option>`).join('')}</select>
          <input type="date" name="from" title="Từ ngày"><input type="date" name="to" title="Đến ngày">
          <button class="primary-button compact-button" type="submit">Lọc</button>
        </form><div data-list></div>`;
      el.querySelector('[data-filters]').addEventListener('submit', event => { event.preventDefault(); Object.assign(s, Object.fromEntries(new FormData(event.target)), { page: 1 }); history(el); });
    }
    const list = el.querySelector('[data-list]');
    list.innerHTML = loading;
    const params = new URLSearchParams({ page: s.page, pageSize: 12 });
    ['q', 'status', 'from', 'to'].forEach(k => s[k] && params.set(k, s[k]));
    try {
      const r = await api(`/api/restaurant/manage/${rid()}/orders?${params}`);
      list.innerHTML = table([
        { h: 'Đơn hàng', f: x => cell(esc(x.orderCode), `${num(x.itemCount)} món · ${dt(x.createdAt)}`) },
        { h: 'Khách', f: x => cell(esc(x.receiverName), esc(x.receiverPhone || '')) },
        { h: 'Giao đến', f: x => `<span class="clamp-1">${esc(x.deliveryAddress)}</span>` },
        { h: 'Tài xế', f: x => esc(x.shipperName || '—') },
        { h: 'Thanh toán', f: x => cell(chip(x.paymentStatus, 'payment'), esc(fd().paymentLabel(x.paymentMethod))) },
        { h: 'Trạng thái', f: x => chip(x.status, 'order') },
        { h: 'Tổng', num: true, f: x => `<b>${vnd(x.totalAmount)}</b>` },
        { h: '', f: x => `<button class="secondary-button compact-button" data-act="detail" data-id="${x.id}">Chi tiết</button>` }
      ], r.items, 'Chưa có đơn hàng phù hợp.') + pager(r);
      bindClicks(list, { page: p => { s.page = p; history(el); }, detail: data => orderDetail(Number(data.id)) });
    } catch (error) { list.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  async function orderDetail(id) {
    const m = modal('Chi tiết đơn hàng', loading, { wide: true });
    try {
      const o = await api(`/api/restaurant/orders/${id}`);
      m.body.innerHTML = `
        <div class="ticket-head"><b>${esc(o.orderCode)}</b> ${chip(o.status, 'order')} ${chip(o.paymentStatus, 'payment')} <span class="muted">${esc(fd().paymentLabel(o.paymentMethod))}</span></div>
        ${U.kv([['Người nhận', `${esc(o.receiverName || '')} · ${esc(o.receiverPhone || '')}`], ['Địa chỉ', esc(o.deliveryAddress || '')], ['Ghi chú', esc(o.customerNote || '—')]])}
        ${table([{ h: 'Món', f: i => cell(esc(i.name), esc(i.variantName || '')) }, { h: 'SL', num: true, f: i => i.quantity }, { h: 'Thành tiền', num: true, f: i => vnd(i.totalPrice) }], o.items || [])}
        <dl class="kv sum"><dt>Tạm tính</dt><dd>${vnd(o.subtotal)}</dd><dt>Phí giao</dt><dd>${vnd(o.deliveryFee)}</dd><dt class="total">Tổng đơn</dt><dd class="total">${vnd(o.totalAmount)}</dd></dl>
        <div class="timeline">${(o.statusHistory || []).map(h => `<span>${esc(fd().statusLabel(h.newStatus))} · ${dt(h.createdAt)}</span>`).join('')}</div>`;
    } catch (error) { m.body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ REVIEWS ============ */
  async function reviews(el) {
    el.innerHTML = loading;
    try {
      const { items } = await api(`/api/restaurant/manage/${rid()}/reviews`);
      const avg = items.length ? items.reduce((s, x) => s + x.rating, 0) / items.length : 0;
      const dist = [5, 4, 3, 2, 1].map(star => ({ name: `${star} sao`, count: items.filter(x => x.rating === star).length }));
      const unanswered = items.filter(x => !x.reply).length;
      el.innerHTML = `
        <div class="page-toolbar"><div><h3>Đánh giá của khách</h3><p class="muted">Phản hồi nhanh giúp tăng uy tín và thứ hạng của quán.</p></div></div>
        <div class="grid-65">
          <div class="card"><div class="rating-big"><strong>${avg.toFixed(1)}</strong><span class="star-line">${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span><small class="muted">${items.length} đánh giá · ${unanswered} chưa phản hồi</small></div></div>
          <div class="card"><h4>Phân bổ</h4>${hbars(dist, { valueKey: 'count', format: n => `${n}` })}</div>
        </div>
        <div class="card-list">${items.map(x => `
          <article class="review-admin-card">
            <header><div><strong>${esc(x.customerName)}</strong> <span class="muted">· ${esc(x.orderCode)}</span></div><span class="star-line">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)} <small>${dt(x.createdAt)}</small></span></header>
            <p>${esc(x.comment || 'Khách không để lại bình luận.')}</p>
            ${x.reply ? `<blockquote class="review-reply">Phản hồi của bạn: ${esc(x.reply)}</blockquote>` : `
              <form class="reply-box" data-review="${x.id}"><input name="reply" placeholder="Viết phản hồi cho khách…" maxlength="500" required><button class="primary-button compact-button" type="submit">Gửi</button></form>`}
          </article>`).join('') || '<div class="empty-state">Quán chưa có đánh giá nào.</div>'}</div>`;
      el.querySelectorAll('.reply-box').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        if (await act(() => api(`/api/restaurant/manage/${rid()}/reviews/${form.dataset.review}/reply`, { method: 'POST', ...json({ reply: form.elements.reply.value }) }), 'Đã gửi phản hồi.')) reviews(el);
      }));
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ OPENING HOURS ============ */
  async function hours() {
    const card = $('#hoursCard');
    if (!card) return;
    card.innerHTML = loading;
    try {
      const { items } = await api(`/api/restaurant/manage/${rid()}/hours`);
      const names = ['', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];
      card.innerHTML = `
        <div class="card-head"><h4>Giờ mở cửa trong tuần</h4><div class="button-row"><button type="button" class="secondary-button compact-button" data-act="copy">Áp dụng giờ Thứ hai cho cả tuần</button></div></div>
        <div class="hours-grid">${items.map(x => `
          <div class="hours-row ${x.isClosed ? 'is-closed' : ''}" data-day="${x.dayOfWeek}">
            <strong>${names[x.dayOfWeek]}</strong>
            <input type="time" name="open" value="${x.openTime}" ${x.isClosed ? 'disabled' : ''}>
            <input type="time" name="close" value="${x.closeTime}" ${x.isClosed ? 'disabled' : ''}>
            <label class="open-toggle"><span>${x.isClosed ? 'Nghỉ' : 'Mở'}</span><span class="switch"><input type="checkbox" name="open-flag" ${x.isClosed ? '' : 'checked'}><span></span></span></label>
          </div>`).join('')}</div>
        <div class="button-row" style="margin-top:14px"><button class="primary-button" type="button" data-act="save">Lưu giờ mở cửa</button></div>`;
      card.querySelectorAll('[name="open-flag"]').forEach(box => box.addEventListener('change', () => {
        const row = box.closest('.hours-row');
        row.classList.toggle('is-closed', !box.checked);
        row.querySelectorAll('input[type="time"]').forEach(input => { input.disabled = !box.checked; });
        box.closest('.open-toggle').firstElementChild.textContent = box.checked ? 'Mở' : 'Nghỉ';
      }));
      bindClicks(card, {
        copy: () => {
          const first = card.querySelector('.hours-row');
          const open = first.querySelector('[name="open"]').value;
          const close = first.querySelector('[name="close"]').value;
          card.querySelectorAll('.hours-row').forEach(row => { row.querySelector('[name="open"]').value = open; row.querySelector('[name="close"]').value = close; });
        },
        save: async () => {
          const payload = Array.from(card.querySelectorAll('.hours-row')).map(row => ({
            dayOfWeek: Number(row.dataset.day), openTime: row.querySelector('[name="open"]').value, closeTime: row.querySelector('[name="close"]').value,
            isClosed: !row.querySelector('[name="open-flag"]').checked
          }));
          await act(() => api(`/api/restaurant/manage/${rid()}/hours`, { method: 'PUT', ...json({ items: payload }) }), 'Đã lưu giờ mở cửa.');
        }
      });
    } catch (error) { card.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  build();
}());
