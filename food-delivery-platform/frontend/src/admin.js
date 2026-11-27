/* Admin console. Everything here talks to the real API; the map is OpenStreetMap with coordinates stored in the DB (see live.js). */
(function () {
  const U = window.FDUI;
  const fd = () => window.FD;
  const { esc, num, vnd, dt, day, chip, statCard, table, cell, pager, barChart, hbars, donut, fillDays, modal, confirmBox, act, loading, kv } = U;
  const api = (path, options) => fd().api(path, options);
  const json = body => ({ body: JSON.stringify(body) });
  const $ = selector => document.querySelector(selector);

  const NAV = [
    { group: 'Tổng quan' },
    { id: 'overview', ico: '📊', label: 'Bảng điều khiển' },
    { id: 'live', ico: '🛰️', label: 'Giám sát giao hàng' },
    { id: 'reports', ico: '📈', label: 'Báo cáo & phân tích' },
    { group: 'Vận hành' },
    { id: 'orders', ico: '🧾', label: 'Đơn hàng' },
    { id: 'applications', ico: '📝', label: 'Duyệt đối tác' },
    { id: 'restaurants', ico: '🏪', label: 'Nhà hàng' },
    { id: 'shippers', ico: '🛵', label: 'Tài xế' },
    { id: 'customers', ico: '🙋', label: 'Khách hàng' },
    { group: 'Tài chính' },
    { id: 'payments', ico: '💳', label: 'Thanh toán & hoàn tiền' },
    { id: 'settlements', ico: '🏦', label: 'Đối soát nhà hàng' },
    { group: 'Marketing' },
    { id: 'promotions', ico: '🎟️', label: 'Khuyến mãi' },
    { id: 'banners', ico: '🖼️', label: 'Banner' },
    { id: 'reviews', ico: '⭐', label: 'Đánh giá' },
    { group: 'Hệ thống' },
    { id: 'support', ico: '🎧', label: 'Hỗ trợ khách hàng' },
    { id: 'users', ico: '👥', label: 'Tài khoản & phân quyền' },
    { id: 'catalog', ico: '🗂️', label: 'Danh mục & khu vực' },
    { id: 'settings', ico: '⚙️', label: 'Cấu hình hệ thống' },
    { id: 'data', ico: '📦', label: 'Nhập / xuất dữ liệu' },
    { id: 'audit', ico: '🛡️', label: 'Nhật ký bảo mật' }
  ];

  const state = { orders: { page: 1, q: '', status: '', paymentStatus: '' }, audit: { page: 1, action: '' }, payments: { page: 1, status: '', method: '' }, reviews: { page: 1, maxRating: 5 }, restaurants: { q: '', status: '' }, users: { role: '', q: '' }, customers: { page: 1, q: '' }, reportDays: 30, support: { status: '' }, applications: { status: 'PENDING', type: '' } };
  let mapController = null;
  let built = false;

  const panel = id => document.querySelector(`#adminScreen [data-view-panel="admin:${id}"]`);

  /* ---------- scaffold ---------- */
  function build() {
    if (built) return;
    const screen = $('#adminScreen');
    screen.innerHTML = `
      <div class="workspace-head">
        <div><p class="eyebrow">Quản trị hệ thống</p><h2 id="adminHeading">Bảng điều khiển</h2></div>
        <div class="head-tools"><span class="muted" id="adminClock"></span><button class="secondary-button" type="button" id="adminRefresh">↻ Làm mới</button></div>
      </div>
      <nav class="sub-tabs" aria-label="Màn quản trị">
        ${NAV.map(item => item.group
    ? `<span class="nav-group">${item.group}</span>`
    : `<button type="button" class="${item.id === 'overview' ? 'is-active' : ''}" data-subview-target="admin:${item.id}"><span class="nav-ico">${item.ico}</span>${item.label}</button>`).join('')}
      </nav>
      ${NAV.filter(item => item.id).map(item => `<section class="page-section ${item.id === 'overview' ? 'is-subview-active' : ''}" data-view-panel="admin:${item.id}"></section>`).join('')}`;
    screen.querySelectorAll('[data-subview-target]').forEach(button => {
      button.addEventListener('click', () => fd().showSubView('admin', button.dataset.subviewTarget.split(':')[1]));
    });
    $('#adminRefresh').addEventListener('click', () => render(fd().state.subViews.admin));
    built = true;
  }

  function render(view) {
    const item = NAV.find(entry => entry.id === view);
    if ($('#adminHeading') && item) $('#adminHeading').textContent = item.label;
    const target = panel(view);
    if (!target) return;
    if (mapController && view !== 'live') { mapController.stop(); mapController = null; }
    (RENDER[view] || (() => {}))(target);
  }

  document.addEventListener('fd:subview', event => {
    if (event.detail.screen === 'admin') render(event.detail.view);
  });

  let refundPage = 1; let settlePage = 1; let promoPage = 1; // trang hiện tại của các danh sách phân trang phía máy chủ
  function bindClicks(container, handlers) {
    container.onclick = event => {
      const pg = event.target.closest('[data-page]');
      if (pg && handlers.page && !pg.disabled) { handlers.page(Number(pg.dataset.page)); return; }
      const button = event.target.closest('[data-act]');
      if (!button) return;
      handlers[button.dataset.act]?.(button.dataset, button);
    };
  }

  const X = (label, name) => ({ label, url: `/api/admin/export/${name}` });
  const EXPORTS = {
    'Báo cáo & phân tích': [X('Doanh thu theo ngày', 'revenue'), X('Đơn hàng', 'orders')],
    'Quản lý đơn hàng': [X('Danh sách đơn hàng', 'orders')],
    'Quản lý nhà hàng': [X('Danh sách nhà hàng', 'restaurants')],
    'Quản lý tài xế': [X('Danh sách tài xế', 'shippers')],
    'Khách hàng': [X('Danh sách khách hàng', 'customers')],
    'Thanh toán, COD & hoàn tiền': [X('Lịch sử thanh toán', 'payments')],
    'Đối soát nhà hàng': [X('Bảng đối soát', 'settlements')],
    'Tài khoản & phân quyền': [X('Danh sách tài khoản', 'users')],
    'Nhật ký bảo mật & kiểm toán': [X('Nhật ký bảo mật', 'audit')],
    'Duyệt đối tác': [X('Hồ sơ đối tác', 'applications')],
    'Nhập / xuất dữ liệu': [X('Đơn hàng', 'orders'), X('Doanh thu theo ngày', 'revenue'), X('Nhà hàng', 'restaurants'), X('Tài xế', 'shippers'),
      X('Khách hàng', 'customers'), X('Thanh toán', 'payments'), X('Đối soát', 'settlements'), X('Tài khoản', 'users'), X('Hồ sơ đối tác', 'applications')]
  };

  function head(title, subtitle, actions = '') {
    const exports = EXPORTS[title] && window.FDExport ? window.FDExport.menu(EXPORTS[title]) : '';
    return `<div class="page-toolbar"><div><h3>${title}</h3>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div><div class="button-row">${actions}${exports}</div></div>`;
  }

  /* ============ OVERVIEW ============ */
  async function overview(el) {
    el.innerHTML = loading;
    const [dash, rep, refunds, tickets, apps] = await Promise.allSettled([
      api('/api/admin/dashboard'),
      api('/api/admin/manage/reports?days=14'),
      api('/api/admin/manage/refunds?status=PENDING&pageSize=1'),
      api('/api/communications/support/tickets'),
      api('/api/admin/partners/applications?status=PENDING')
    ]);
    if (dash.status !== 'fulfilled') { el.innerHTML = `<div class="error-box">${esc(dash.reason.message)}</div>`; return; }
    const d = dash.value;
    const o = d.overview;
    const r = rep.status === 'fulfilled' ? rep.value : { daily: [], delivery: {} };
    const series = fillDays(r.daily, 14, ['gmv', 'orders']);
    const week = series.slice(-7);
    const prevWeek = series.slice(0, 7);
    const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);
    const trend = (cur, prev) => (prev ? `<span class="${cur >= prev ? 'trend-up' : 'trend-down'}">${cur >= prev ? '▲' : '▼'} ${Math.abs(Math.round(((cur - prev) / prev) * 100))}%</span> so với tuần trước` : 'Chưa có dữ liệu tuần trước');
    const openTickets = tickets.status === 'fulfilled' ? tickets.value.items.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)) : [];
    const pendingRefunds = refunds.status === 'fulfilled' ? { length: refunds.value.summary?.PENDING ?? refunds.value.items.filter(x => x.status === 'PENDING').length } : [];
    const todos = [
      { n: apps.status === 'fulfilled' ? apps.value.items.length : 0, text: 'hồ sơ đối tác chờ duyệt', go: 'applications', ico: '📝' },
      { n: o.pendingRestaurants, text: 'nhà hàng chờ duyệt', go: 'restaurants', ico: '🏪' },
      { n: pendingRefunds.length, text: 'yêu cầu hoàn tiền', go: 'payments', ico: '💸' },
      { n: openTickets.length, text: 'ticket hỗ trợ đang mở', go: 'support', ico: '🎧' }
    ];
    el.innerHTML = `
      <div class="stat-grid">
        ${statCard({ label: 'GMV hôm nay', value: vnd(o.todayGmv), hint: `${num(o.todayOrders)} đơn mới`, icon: '💰' })}
        ${statCard({ label: 'Doanh thu đã thu', value: vnd(o.paidRevenue), hint: `${num(o.totalOrders)} đơn toàn hệ thống`, icon: '🏦', tone: 'is-green' })}
        ${statCard({ label: 'Đơn 7 ngày', value: num(sum(week, 'orders')), hint: trend(sum(week, 'orders'), sum(prevWeek, 'orders')), icon: '🧾', tone: 'is-blue' })}
        ${statCard({ label: 'Nhà hàng hoạt động', value: num(o.activeRestaurants), hint: `${num(o.pendingRestaurants)} chờ duyệt · ${num(o.activeMenuItems)} món`, icon: '🏪', tone: 'is-amber' })}
        ${statCard({ label: 'Người dùng', value: num(o.totalUsers), hint: `${num(o.activeUsers)} đang hoạt động`, icon: '👥', tone: 'is-blue' })}
        ${statCard({ label: 'Giao thành công', value: `${Math.round((r.delivery?.successRate || 0) * 100)}%`, hint: r.delivery?.avgMinutes ? `TB ${Math.round(r.delivery.avgMinutes)} phút/đơn` : '14 ngày gần nhất', icon: '🛵', tone: 'is-green' })}
      </div>
      <div class="grid-65">
        <div class="card"><div class="card-head"><h4>Doanh thu 14 ngày (GMV)</h4><span class="muted">${vnd(sum(series, 'gmv'))}</span></div>${barChart(series, { valueKey: 'gmv' })}</div>
        <div class="card"><h4>Cần xử lý</h4><div class="todo-list">${todos.map(t => `
          <button type="button" class="todo ${t.n ? 'has-items' : ''}" data-act="go" data-go="${t.go}"><span>${t.ico}</span><div><strong>${num(t.n)}</strong><small>${t.text}</small></div><i>›</i></button>`).join('')}</div></div>
      </div>
      <div class="grid-3">
        <div class="card"><h4>Trạng thái đơn hàng</h4>${donut(d.orderStatus, { labelKey: 'status', valueKey: 'total', labelFn: s => ({ DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', PENDING: 'Chờ xác nhận', READY_FOR_PICKUP: 'Sẵn sàng', PREPARING: 'Đang chuẩn bị', CONFIRMED: 'Đã xác nhận', DELIVERING: 'Đang giao', SHIPPER_ASSIGNED: 'Có tài xế', PICKED_UP: 'Đã lấy hàng' }[s] || s) })}</div>
        <div class="card"><h4>Người dùng theo vai trò</h4>${hbars(d.userRoles.map(x => ({ ...x, name: fd().roleLabel(x.role) })), { valueKey: 'total', tone: 'is-blue' })}</div>
        <div class="card"><h4>Nhà hàng theo trạng thái</h4>${hbars(d.restaurantStatus.map(x => ({ ...x, name: ({ ACTIVE: 'Hoạt động', PENDING: 'Chờ duyệt', INACTIVE: 'Tạm ngưng', SUSPENDED: 'Bị khóa' }[x.status] || x.status) })), { valueKey: 'total', tone: 'is-green' })}</div>
      </div>
      <div><div class="card-head"><h4>Đơn hàng mới nhất</h4><button class="text-button" data-act="go" data-go="orders">Xem tất cả →</button></div>
        ${table([
    { h: 'Mã đơn', f: x => `<b>${esc(x.orderCode)}</b>` },
    { h: 'Nhà hàng', f: x => esc(x.restaurantName) },
    { h: 'Trạng thái', f: x => chip(x.status, 'order') },
    { h: 'Thanh toán', f: x => chip(x.paymentStatus, 'payment') },
    { h: 'Thời gian', f: x => dt(x.createdAt) },
    { h: 'Tổng tiền', num: true, f: x => `<b>${vnd(x.totalAmount)}</b>` }
  ], d.recentOrders)}</div>`;
    bindClicks(el, { go: data => fd().showSubView('admin', data.go) });
  }

  /* ============ LIVE MAP ============ */
  function live(el) {
    el.innerHTML = `${head('Giám sát giao hàng thời gian thực', 'Bản đồ OpenStreetMap · vị trí tài xế là GPS thật do tài xế gửi lên, nhà hàng và khách theo toạ độ trong DB (tự làm mới mỗi 5 giây).')}<div data-slot></div>`;
    mapController = window.FDLive.renderAdminMap(el.querySelector('[data-slot]'));
  }

  /* ============ REPORTS ============ */
  /* ============ REPORTS ============ */
  const reports = el => window.FDAN.admin(el);

  /* ============ ORDERS ============ */
  async function orders(el) {
    const s = state.orders;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `
        ${head('Quản lý đơn hàng', 'Tra cứu mọi đơn trên hệ thống, xem chi tiết và lịch sử xử lý.')}
        <form class="filter-bar" data-filters>
          <input type="search" name="q" placeholder="Mã đơn, tên/SĐT người nhận, nhà hàng…">
          <select name="status"><option value="">Mọi trạng thái đơn</option>${['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'CANCELLED'].map(x => `<option value="${x}">${U.chip(x, 'order').replace(/<[^>]+>/g, '')}</option>`).join('')}</select>
          <select name="paymentStatus"><option value="">Mọi trạng thái thanh toán</option>${['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map(x => `<option value="${x}">${U.chip(x, 'payment').replace(/<[^>]+>/g, '')}</option>`).join('')}</select>
          <button class="primary-button compact-button" type="submit">Lọc</button>
        </form>
        <div data-list></div>`;
      el.querySelector('[data-filters]').addEventListener('submit', event => {
        event.preventDefault();
        const form = new FormData(event.target);
        Object.assign(s, { q: form.get('q'), status: form.get('status'), paymentStatus: form.get('paymentStatus'), page: 1 });
        orders(el);
      });
    }
    const list = el.querySelector('[data-list]');
    list.innerHTML = loading;
    const params = new URLSearchParams({ page: s.page, pageSize: 15 });
    ['q', 'status', 'paymentStatus'].forEach(k => s[k] && params.set(k, s[k]));
    try {
      const r = await api(`/api/admin/manage/orders?${params}`);
      list.innerHTML = table([
        { h: 'Đơn hàng', f: x => cell(esc(x.orderCode), `${num(x.itemCount)} món · ${dt(x.createdAt)}`) },
        { h: 'Nhà hàng', f: x => esc(x.restaurantName) },
        { h: 'Người nhận', f: x => cell(esc(x.receiverName), esc(x.receiverPhone || '')) },
        { h: 'Tài xế', f: x => esc(x.shipperName || '—') },
        { h: 'Thanh toán', f: x => cell(chip(x.paymentStatus, 'payment'), esc(fd().paymentLabel(x.paymentMethod))) },
        { h: 'Trạng thái', f: x => chip(x.status, 'order') },
        { h: 'Tổng tiền', num: true, f: x => `<b>${vnd(x.totalAmount)}</b>` },
        { h: '', f: x => `<button class="secondary-button compact-button" data-act="detail" data-id="${x.id}">Chi tiết</button>` }
      ], r.items) + pager(r);
      bindClicks(list, {
        page: p => { s.page = p; orders(el); },
        detail: data => orderDetail(Number(data.id))
      });
    } catch (error) { list.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  async function orderDetail(id) {
    const m = modal('Chi tiết đơn hàng', loading, { wide: true });
    try {
      const o = await api(`/api/admin/manage/orders/${id}`);
      m.body.innerHTML = `
        <div class="grid-2">
          <div>${kv([
    ['Mã đơn', `<b>${esc(o.orderCode)}</b> ${chip(o.status, 'order')}`],
    ['Nhà hàng', `${esc(o.restaurantName)}<br><small class="muted">${esc(o.restaurantAddress || '')}</small>`],
    ['Khách hàng', `${esc(o.customerName)} · ${esc(o.customerPhone || '')}`],
    ['Người nhận', `${esc(o.receiverName)} · ${esc(o.receiverPhone || '')}`],
    ['Địa chỉ giao', esc(o.deliveryAddress)],
    ['Tài xế', esc(o.shipperName || 'Chưa có')],
    ['Ghi chú', esc(o.customerNote || '—')],
    ['Đặt lúc', dt(o.createdAt)]
  ])}</div>
          <div>
            ${table([{ h: 'Món', f: i => cell(esc(i.name), esc(i.variantName || '')) }, { h: 'SL', num: true, f: i => i.quantity }, { h: 'Tiền', num: true, f: i => vnd(i.totalPrice) }], o.items)}
            <dl class="kv sum">
              <dt>Tạm tính</dt><dd>${vnd(o.subtotal)}</dd><dt>Giảm giá</dt><dd>-${vnd(o.discountAmount)}</dd>
              <dt>Phí giao</dt><dd>${vnd(o.deliveryFee)}</dd><dt>Phí dịch vụ + thuế</dt><dd>${vnd(o.serviceFee + o.taxAmount)}</dd>
              <dt class="total">Tổng cộng</dt><dd class="total">${vnd(o.totalAmount)}</dd>
            </dl>
          </div>
        </div>
        <div class="grid-2">
          <div><h4>Thanh toán</h4>${o.payments.length ? o.payments.map(p => `<div class="fee-row"><span>${esc(fd().paymentLabel(p.method))} · ${esc(p.code)}</span><span>${vnd(p.amount)} ${chip(p.status, 'payment')}</span></div>`).join('') : '<p class="muted">Chưa có giao dịch.</p>'}
            ${o.delivery ? `<h4 style="margin-top:14px">Giao hàng</h4><div class="fee-row"><span>Trạng thái</span><span>${chip(o.delivery.status, 'order')}</span></div><div class="fee-row"><span>Quãng đường</span><span>${o.delivery.distanceKm} km</span></div>` : ''}</div>
          <div><h4>Lịch sử xử lý</h4><div class="timeline">${o.history.map(h => `<span><b>${esc(fd().statusLabel(h.to))}</b> · ${dt(h.at)}${h.note ? ` · ${esc(h.note)}` : ''}</span>`).join('')}</div></div>
        </div>`;
    } catch (error) { m.body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ RESTAURANTS ============ */
  async function restaurants(el) {
    const s = state.restaurants;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `
        ${head('Quản lý nhà hàng', 'Duyệt hồ sơ, khóa/mở, thiết lập hoa hồng và theo dõi hiệu quả kinh doanh.')}
        <div class="filter-bar">
          <input type="search" data-q placeholder="Tìm theo tên, chủ quán, quận…">
          <div class="pill-tabs" data-status>${[['', 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['ACTIVE', 'Hoạt động'], ['INACTIVE', 'Tạm ngưng'], ['SUSPENDED', 'Bị khóa']].map(([v, l]) => `<button type="button" data-v="${v}" class="${v === '' ? 'is-active' : ''}">${l}</button>`).join('')}</div>
        </div>
        <div data-list></div>`;
      el.querySelector('[data-q]').addEventListener('input', event => { s.q = event.target.value.toLowerCase(); paint(el); });
      el.querySelector('[data-status]').addEventListener('click', event => {
        const b = event.target.closest('button'); if (!b) return;
        s.status = b.dataset.v;
        el.querySelectorAll('[data-status] button').forEach(x => x.classList.toggle('is-active', x === b));
        paint(el);
      });
    }
    el.querySelector('[data-list]').innerHTML = loading;
    try {
      const r = await api('/api/admin/restaurants?pageSize=100');
      state.restaurantRows = r.items || [];
      paint(el);
    } catch (error) { el.querySelector('[data-list]').innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  function paint(el) {
    const s = state.restaurants;
    const rows = (state.restaurantRows || []).filter(x => (!s.status || x.status === s.status)
      && (!s.q || `${x.name} ${x.ownerUsername} ${x.district} ${x.categoryName}`.toLowerCase().includes(s.q)));
    const list = el.querySelector('[data-list]');
    list.innerHTML = table([
      { h: 'Nhà hàng', f: x => `<div class="owner-menu-cell">${fd().photo(x.name, x.coverUrl || x.logoUrl, 'owner-menu-thumb')}${cell(esc(x.name), `${esc(x.categoryName || '')} · ${esc(x.district || x.city || '')}`)}</div>` },
      { h: 'Chủ quán', f: x => cell(esc(x.ownerUsername), esc(x.phone || x.ownerEmail || '')) },
      { h: 'Trạng thái', f: x => chip(x.status) },
      { h: 'Hoa hồng', num: true, f: x => `${Number(x.commissionRate).toFixed(1)}%` },
      { h: 'Đánh giá', num: true, f: x => `<span class="rating-pill">★ ${Number(x.rating).toFixed(1)}</span> <small class="muted">${num(x.totalReviews)}</small>` },
      { h: 'Đơn / Doanh thu', num: true, f: x => cell(num(x.totalOrders), vnd(x.totalRevenue)) },
      {
        h: 'Thao tác',
        f: x => `<div class="row-actions">
          ${x.status === 'PENDING' ? `<button class="primary-button compact-button" data-act="state" data-id="${x.id}" data-v="ACTIVE">Duyệt</button>` : ''}
          ${x.status === 'ACTIVE' ? `<button class="secondary-button" data-act="state" data-id="${x.id}" data-v="SUSPENDED">Khóa</button>` : ''}
          ${['SUSPENDED', 'INACTIVE'].includes(x.status) ? `<button class="secondary-button" data-act="state" data-id="${x.id}" data-v="ACTIVE">Mở lại</button>` : ''}
          <button class="secondary-button" data-act="commission" data-id="${x.id}">Hoa hồng</button>
          <button class="secondary-button" data-act="detail" data-id="${x.id}">Chi tiết</button></div>`
      }
    ], rows) + `<div class="pager"><span>${rows.length}/${(state.restaurantRows || []).length} nhà hàng</span></div>`;
    bindClicks(list, {
      state: async data => {
        const label = data.v === 'ACTIVE' ? 'kích hoạt' : 'khóa';
        if (!(await confirmBox(`Bạn muốn ${label} nhà hàng này?`))) return;
        if (await act(() => api(`/api/admin/restaurants/${data.id}/state`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật trạng thái nhà hàng.')) restaurants(el);
      },
      commission: data => commissionForm(Number(data.id), el),
      detail: data => restaurantDetail(Number(data.id))
    });
  }

  function commissionForm(id, el) {
    const row = state.restaurantRows.find(x => x.id === id);
    const m = modal(`Hoa hồng · ${row.name}`, `
      <form class="stacked-form"><label>Tỷ lệ hoa hồng (%)<input type="number" name="rate" min="0" max="100" step="0.5" value="${row.commissionRate}" required></label>
      <p class="muted">Áp dụng cho các đơn phát sinh sau khi lưu.</p>
      <div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Lưu</button></div></form>`);
    m.body.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const rate = Number(new FormData(event.target).get('rate'));
      if (await act(() => api(`/api/admin/restaurants/${id}/state`, { method: 'PATCH', ...json({ commissionRate: rate }) }), 'Đã cập nhật hoa hồng.')) { m.close(); restaurants(el); }
    });
  }

  async function restaurantDetail(id) {
    const row = state.restaurantRows.find(x => x.id === id);
    modal(row.name, `
      ${kv([
    ['Trạng thái', chip(row.status)], ['Danh mục', esc(row.categoryName || '—')],
    ['Chủ quán', `${esc(row.ownerUsername)} · ${esc(row.ownerEmail || '')}`], ['Liên hệ', `${esc(row.phone || '—')} · ${esc(row.email || '')}`],
    ['Địa chỉ', `${esc(row.address)}, ${esc(row.ward || '')}, ${esc(row.district || '')}, ${esc(row.city)}`],
    ['Giờ mở cửa', `${esc(String(row.openingTime || '').slice(0, 5))} – ${esc(String(row.closingTime || '').slice(0, 5))}`],
    ['Đơn tối thiểu', vnd(row.minimumOrder)], ['Chuẩn bị TB', `${row.averagePrepareTime} phút`],
    ['Hoa hồng', `${row.commissionRate}%`], ['Đánh giá', `★ ${Number(row.rating).toFixed(1)} (${num(row.totalReviews)} lượt)`],
    ['Tổng đơn', num(row.totalOrders)], ['Tổng doanh thu', vnd(row.totalRevenue)], ['Tham gia', dt(row.createdAt)]
  ])}`, { wide: true });
  }

  /* ============ SHIPPERS ============ */
  async function shippers(el) {
    el.innerHTML = head('Quản lý tài xế', 'Theo dõi hiệu suất, trạng thái sẵn sàng và duyệt giấy tờ.') + loading;
    try {
      const r = await api('/api/admin/manage/shippers?pageSize=100');
      const items = r.items;
      const sm = r.summary ?? {};
      el.innerHTML = `${head('Quản lý tài xế', 'Theo dõi hiệu suất, trạng thái sẵn sàng và duyệt giấy tờ.')}
        <div class="stat-grid">
          ${statCard({ label: 'Tổng tài xế', value: num(sm.total ?? items.length), icon: '🛵' })}
          ${statCard({ label: 'Đang sẵn sàng', value: num(sm.available ?? items.filter(x => x.status === 'AVAILABLE').length), icon: '🟢', tone: 'is-green' })}
          ${statCard({ label: 'Đang giao', value: num(sm.activeDeliveries ?? items.reduce((s, x) => s + x.activeDeliveries, 0)), icon: '📦', tone: 'is-blue' })}
          ${statCard({ label: 'Bị khóa', value: num(sm.suspended ?? items.filter(x => x.status === 'SUSPENDED').length), icon: '⛔', tone: 'is-amber' })}
        </div>
        ${table([
    { h: 'Tài xế', f: x => cell(esc(x.fullName), esc(x.phone || x.email || '')) },
    { h: 'Phương tiện', f: x => cell(esc(x.vehicleType), esc(x.vehiclePlate || '—')) },
    { h: 'Trạng thái', f: x => chip(x.status) },
    { h: 'Đánh giá', num: true, f: x => `<span class="rating-pill">★ ${x.rating.toFixed(1)}</span>` },
    { h: 'Chuyến / Thu nhập', num: true, f: x => cell(num(x.totalDeliveries), vnd(x.totalEarnings)) },
    { h: 'Giấy tờ', f: x => `${x.verifiedDocuments}/${x.documents} đã duyệt` },
    { h: 'Thao tác', f: x => `<div class="row-actions"><button class="secondary-button" data-act="docs" data-id="${x.id}" data-name="${esc(x.fullName)}">Giấy tờ</button>${x.status === 'SUSPENDED' ? `<button class="secondary-button" data-act="status" data-id="${x.id}" data-v="OFFLINE">Mở khóa</button>` : `<button class="secondary-button" data-act="status" data-id="${x.id}" data-v="SUSPENDED">Khóa</button>`}</div>` }
  ], items)}`;
      bindClicks(el, {
        status: async data => { if (!(await confirmBox(data.v === 'SUSPENDED' ? 'Khóa tài khoản tài xế này?' : 'Mở khóa tài xế này?'))) return; if (await act(() => api(`/api/admin/manage/shippers/${data.id}/status`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật tài xế.')) shippers(el); },
        docs: data => shipperDocs(Number(data.id), data.name, el)
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  async function shipperDocs(id, name, el) {
    const m = modal(`Giấy tờ · ${name}`, loading);
    const loadDocs = async () => {
      const r = await api(`/api/admin/manage/shippers/${id}/documents`);
      const types = { IDENTITY_CARD: 'CCCD/CMND', DRIVING_LICENSE: 'Bằng lái xe', VEHICLE_REGISTRATION: 'Cà vẹt xe', OTHER: 'Khác' };
      m.body.innerHTML = r.items.length ? table([
        { h: 'Loại', f: x => esc(types[x.type] || x.type) },
        { h: 'Số', f: x => esc(x.number || '—') },
        { h: 'Trạng thái', f: x => x.verified ? '<span class="status-chip">Đã duyệt</span>' : '<span class="status-chip is-warn">Chờ duyệt</span>' },
        { h: '', f: x => `<button class="secondary-button compact-button" data-doc="${x.id}" data-v="${x.verified ? 'false' : 'true'}">${x.verified ? 'Hủy duyệt' : 'Duyệt'}</button>` }
      ], r.items) : '<div class="empty-state">Tài xế chưa tải giấy tờ nào.</div>';
      m.body.querySelectorAll('[data-doc]').forEach(button => button.addEventListener('click', async () => {
        if (await act(() => api(`/api/admin/manage/shipper-documents/${button.dataset.doc}/verify`, { method: 'POST', ...json({ verified: button.dataset.v === 'true' }) }), 'Đã cập nhật giấy tờ.')) { loadDocs(); shippers(el); }
      }));
    };
    loadDocs().catch(error => { m.body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; });
  }

  /* ============ CUSTOMERS ============ */
  async function customers(el) {
    const s = state.customers;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `${head('Khách hàng', 'Hồ sơ, mức chi tiêu và điểm tích lũy.')}
        <form class="filter-bar" data-filters><input type="search" name="q" placeholder="Tên, email, SĐT, username…"><button class="primary-button compact-button" type="submit">Tìm</button></form><div data-list></div>`;
      el.querySelector('[data-filters]').addEventListener('submit', event => { event.preventDefault(); s.q = new FormData(event.target).get('q'); s.page = 1; customers(el); });
    }
    const list = el.querySelector('[data-list]');
    list.innerHTML = loading;
    try {
      const r = await api(`/api/admin/manage/customers?page=${s.page}&pageSize=15${s.q ? `&q=${encodeURIComponent(s.q)}` : ''}`);
      list.innerHTML = table([
        { h: 'Khách hàng', f: x => cell(esc(x.fullName || x.username), `@${esc(x.username)}`) },
        { h: 'Liên hệ', f: x => cell(esc(x.email), esc(x.phone || '')) },
        { h: 'Trạng thái', f: x => chip(x.status) },
        { h: 'Số đơn', num: true, f: x => num(x.totalOrders) },
        { h: 'Đã chi', num: true, f: x => `<b>${vnd(x.totalSpent)}</b>` },
        { h: 'Điểm', num: true, f: x => num(x.loyaltyPoints) },
        { h: 'Đăng nhập gần nhất', f: x => dt(x.lastLoginAt) },
        { h: '', f: x => `<button class="secondary-button compact-button" data-act="toggle" data-id="${x.id}" data-v="${x.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'}">${x.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button>` }
      ], r.items) + pager(r);
      bindClicks(list, {
        page: p => { s.page = p; customers(el); },
        toggle: async data => { if (await act(() => api(`/api/accounts/admin/users/${data.id}/status`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật tài khoản.')) customers(el); }
      });
    } catch (error) { list.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ PAYMENTS ============ */
  async function payments(el) {
    const s = state.payments;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `${head('Thanh toán, COD & hoàn tiền', 'Giám sát dòng tiền, đối chiếu COD và xử lý yêu cầu hoàn tiền.')}
        <div data-summary></div>
        <div class="card"><div class="card-head"><h4>Yêu cầu hoàn tiền</h4></div><div data-refunds></div></div>
        <form class="filter-bar" data-filters>
          <select name="status"><option value="">Mọi trạng thái</option>${['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map(x => `<option value="${x}">${chip(x, 'payment').replace(/<[^>]+>/g, '')}</option>`).join('')}</select>
          <select name="method"><option value="">Mọi phương thức</option>${['COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'ZALOPAY', 'CARD', 'WALLET'].map(x => `<option value="${x}">${esc(fd().paymentLabel(x))}</option>`).join('')}</select>
          <button class="primary-button compact-button" type="submit">Lọc giao dịch</button>
        </form>
        <div data-list></div>`;
      el.querySelector('[data-filters]').addEventListener('submit', event => { event.preventDefault(); const f = new FormData(event.target); Object.assign(s, { status: f.get('status'), method: f.get('method'), page: 1 }); payments(el); });
    }
    el.querySelector('[data-list]').innerHTML = loading;
    const params = new URLSearchParams({ page: s.page, pageSize: 12 });
    if (s.status) params.set('status', s.status);
    if (s.method) params.set('method', s.method);
    try {
      const [r, refunds] = await Promise.all([api(`/api/admin/manage/payments?${params}`), api(`/api/admin/manage/refunds?page=${refundPage}&pageSize=10`)]);
      const sumBy = status => r.summary.find(x => x.status === status) || { total: 0, amount: 0 };
      const cod = k => r.cod.find(x => x.status === k) || { total: 0, amount: 0 };
      el.querySelector('[data-summary]').innerHTML = `
        <div class="stat-grid">
          ${statCard({ label: 'Đã thanh toán', value: vnd(sumBy('PAID').amount), hint: `${num(sumBy('PAID').total)} giao dịch`, icon: '✅', tone: 'is-green' })}
          ${statCard({ label: 'Chờ thanh toán', value: vnd(sumBy('PENDING').amount), hint: `${num(sumBy('PENDING').total)} giao dịch`, icon: '⏳', tone: 'is-amber' })}
          ${statCard({ label: 'Đã hoàn tiền', value: vnd(r.refunded?.amount ?? sumBy('REFUNDED').amount), hint: `${num(r.refunded?.orders ?? sumBy('REFUNDED').total)} đơn đã hoàn`, icon: '↩️' })}
          ${statCard({ label: 'COD chưa đối soát', value: vnd(cod('COLLECTED').amount + cod('PENDING').amount), hint: `Đã thu ${vnd(cod('COLLECTED').amount)} · đã đối soát ${vnd(cod('SETTLED').amount)}`, icon: '💵', tone: 'is-blue' })}
        </div>
        <div class="card"><h4>Doanh thu theo phương thức</h4>${hbars(r.methods.map(m => ({ ...m, name: fd().paymentLabel(m.method) })), { valueKey: 'amount', format: vnd, sub: m => `${num(m.total)} giao dịch` })}</div>`;
      el.querySelector('[data-refunds]').innerHTML = table([
        { h: 'Đơn', f: x => `<b>${esc(x.orderCode)}</b>` },
        { h: 'Số tiền', num: true, f: x => vnd(x.amount) },
        { h: 'Lý do', f: x => esc(x.reason || '—') },
        { h: 'Tạo lúc', f: x => dt(x.createdAt) },
        { h: 'Trạng thái', f: x => chip(x.status) },
        { h: '', f: x => x.status === 'PENDING' ? `<div class="row-actions"><button class="primary-button compact-button" data-act="refund" data-id="${x.id}" data-v="COMPLETED">Duyệt</button><button class="secondary-button" data-act="refund" data-id="${x.id}" data-v="REJECTED">Từ chối</button></div>` : '' }
      ], refunds.items, 'Không có yêu cầu hoàn tiền nào.') + pager(refunds).replace(/data-page="(\d+)"/g, 'data-act="refundPage" data-v="$1"');
      el.querySelector('[data-list]').innerHTML = table([
        { h: 'Mã GD', f: x => cell(esc(x.paymentCode), esc(x.orderCode)) },
        { h: 'Nhà hàng', f: x => esc(x.restaurantName) },
        { h: 'Phương thức', f: x => cell(esc(fd().paymentLabel(x.method)), esc(x.gateway || '')) },
        { h: 'Trạng thái', f: x => chip(x.status, 'payment') },
        { h: 'Thời gian', f: x => dt(x.paidAt || x.createdAt) },
        { h: 'Số tiền', num: true, f: x => `<b>${vnd(x.amount)}</b>` }
      ], r.items) + pager(r);
      bindClicks(el, {
        page: p => { s.page = p; payments(el); },
        refundPage: data => { refundPage = Number(data.v); payments(el); },
        refund: async data => { if (await act(() => api(`/api/admin/manage/refunds/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), data.v === 'COMPLETED' ? 'Đã duyệt hoàn tiền.' : 'Đã từ chối yêu cầu.')) payments(el); }
      });
    } catch (error) { el.querySelector('[data-list]').innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ SETTLEMENTS ============ */
  async function settlements(el) {
    el.innerHTML = loading;
    try {
      const r = await api(`/api/admin/manage/settlements?page=${settlePage}&pageSize=50`);
      const sm = r.summary ?? {};
      const total = k => sm[k] ?? r.items.reduce((s, x) => s + x[k], 0);
      el.innerHTML = `
        ${head('Đối soát nhà hàng', 'Tổng hợp doanh số, hoa hồng và chi trả cho đối tác theo kỳ.', '<button class="primary-button" data-act="generate">＋ Tạo kỳ đối soát</button>')}
        <div class="stat-grid">
          ${statCard({ label: 'Tổng doanh số (mọi kỳ)', value: vnd(total('grossSales')), icon: '📦' })}
          ${statCard({ label: 'Hoa hồng nền tảng', value: vnd(total('commissionAmount')), icon: '🏦', tone: 'is-green' })}
          ${statCard({ label: 'Cần chi trả', value: vnd(sm.pendingNet ?? r.items.filter(x => x.status !== 'SETTLED').reduce((s, x) => s + x.netAmount, 0)), icon: '💸', tone: 'is-amber' })}
          ${statCard({ label: 'Đã chi trả', value: vnd(sm.settledNet ?? r.items.filter(x => x.status === 'SETTLED').reduce((s, x) => s + x.netAmount, 0)), icon: '✅', tone: 'is-blue' })}
        </div>
        ${table([
    { h: 'Nhà hàng', f: x => esc(x.restaurantName) },
    { h: 'Kỳ', f: x => `${U.dayFull(x.periodStart)} – ${U.dayFull(x.periodEnd)}` },
    { h: 'Doanh số', num: true, f: x => vnd(x.grossSales) },
    { h: 'Hoa hồng', num: true, f: x => vnd(x.commissionAmount) },
    { h: 'Hoàn tiền', num: true, f: x => vnd(x.refundAmount) },
    { h: 'Thực nhận', num: true, f: x => `<b>${vnd(x.netAmount)}</b>` },
    { h: 'Trạng thái', f: x => chip(x.status) },
    { h: '', f: x => x.status !== 'SETTLED' ? `<button class="primary-button compact-button" data-act="settle" data-id="${x.id}">Đã chi trả</button>` : '' }
  ], r.items, 'Chưa có kỳ đối soát. Bấm "Tạo kỳ đối soát" để tổng hợp.')}${pager(r)}`;
      bindClicks(el, {
        page: p => { settlePage = p; settlements(el); },
        generate: () => {
          const end = U.localDate(new Date());
          const start = U.localDate(Date.now() - 7 * 86400000);
          const m = modal('Tạo kỳ đối soát', `<form class="stacked-form"><div class="form-row"><label>Từ ngày<input type="date" name="start" value="${start}" required></label><label>Đến ngày<input type="date" name="end" value="${end}" required></label></div><p class="muted">Hệ thống tổng hợp các đơn đã giao và tính hoa hồng theo tỷ lệ của từng nhà hàng.</p><div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Tạo</button></div></form>`);
          m.body.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const f = new FormData(event.target);
            const res = await act(() => api('/api/settlements/admin/settlements/generate', { method: 'POST', ...json({ periodStart: f.get('start'), periodEnd: f.get('end') }) }));
            if (res) { m.close(); fd().toast(`Đã tạo ${res.totalItems ?? 0} kỳ đối soát.`); settlements(el); }
          });
        },
        settle: async data => { if (await act(() => api(`/api/admin/manage/settlements/${data.id}`, { method: 'PATCH', ...json({ status: 'SETTLED' }) }), 'Đã ghi nhận chi trả.')) settlements(el); }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ PROMOTIONS ============ */
  async function promotions(el) {
    el.innerHTML = loading;
    try {
      const r = await api(`/api/admin/manage/promotions?page=${promoPage}&pageSize=50`);
      el.innerHTML = `
        ${head('Khuyến mãi', 'Voucher toàn hệ thống do admin quản; voucher từng quán do chủ quán tự cấp (admin chỉ theo dõi, bật/tắt khi cần). Mã giảm giá chung không giới hạn lượt; riêng mã freeship phải có hạn ngạch và ngày kết thúc.', '<button class="secondary-button" data-act="rewards">🎁 Quà đổi điểm</button><button class="primary-button" data-act="create">＋ Tạo mã toàn hệ thống</button>')}
        ${table([
    { h: 'Mã', f: x => cell(`<code>${esc(x.code)}</code>`, esc(x.name)) },
    { h: 'Phạm vi', f: x => x.restaurantName ? esc(x.restaurantName) : '<span class="status-chip is-info">Toàn hệ thống</span>' },
    { h: 'Ưu đãi', f: x => x.discountType === 'PERCENT' ? `${x.discountValue}%${x.maxDiscount ? ` (tối đa ${vnd(x.maxDiscount)})` : ''}` : x.discountType === 'FREE_DELIVERY' ? 'Miễn phí giao' : vnd(x.discountValue) },
    { h: 'Đơn tối thiểu', num: true, f: x => vnd(x.minimumOrder) },
    { h: 'Hiệu lực', f: x => new Date(x.endAt).getFullYear() >= 2090 ? `Từ ${U.dayFull(x.startAt)} · <span class="status-chip is-info">Không giới hạn</span>` : `${U.dayFull(x.startAt)} – ${U.dayFull(x.endAt)}` },
    { h: 'Đã dùng', num: true, f: x => `${num(x.usedCount)}${x.usageLimit ? `/${num(x.usageLimit)}` : ' · không giới hạn'}${x.firstOrderOnly ? ' · khách mới' : ''}` },
    { h: 'Trạng thái', f: x => chip(x.status) },
    { h: '', f: x => `<div class="row-actions">${x.restaurantName ? '' : `<button class="secondary-button" data-act="extend" data-id="${x.id}">Gia hạn</button>`}<button class="secondary-button" data-act="toggle" data-id="${x.id}" data-v="${x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${x.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</button><button class="text-button danger-text" data-act="remove" data-id="${x.id}">Xóa</button></div>` }
  ], r.items)}${pager(r)}`;
      bindClicks(el, {
        page: p => { promoPage = p; promotions(el); },
        toggle: async data => { if (await act(() => api(`/api/admin/manage/promotions/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật.')) promotions(el); },
        extend: data => {
          const m = modal('Gia hạn voucher', `<form class="stacked-form compact-form">
            <label>Gia hạn thêm (ngày)<input type="number" name="days" min="0" max="365" value="30"></label>
            <label>Thêm hạn ngạch (lượt, chỉ áp dụng nếu mã đang có hạn ngạch)<input type="number" name="addQuota" min="0" value="0"></label>
            <div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Gia hạn</button></div></form>`);
          m.body.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const f = Object.fromEntries(new FormData(event.target));
            if (await act(() => api(`/api/admin/manage/promotions/${data.id}/extend`, { method: 'POST', ...json({ days: Number(f.days), addQuota: Number(f.addQuota) }) }), 'Đã gia hạn voucher.')) { m.close(); promotions(el); }
          });
        },
        rewards: () => loyaltyRewards(),
        remove: async data => { if (!(await confirmBox('Xóa mã khuyến mãi này?', 'Xóa'))) return; if (await act(() => api(`/api/admin/manage/promotions/${data.id}`, { method: 'DELETE' }), 'Đã xóa mã.')) promotions(el); },
        create: () => {
          const m = modal('Tạo mã khuyến mãi toàn hệ thống', `
            <form class="stacked-form compact-form">
              <label>Mã<input name="code" required maxlength="30" placeholder="FREESHIP99" style="text-transform:uppercase"></label>
              <label>Tên chương trình<input name="name" required placeholder="Miễn phí giao đơn từ 99K"></label>
              <label>Loại<select name="discountType"><option value="PERCENT">Giảm %</option><option value="FIXED_AMOUNT">Giảm tiền</option><option value="FREE_DELIVERY">Miễn phí giao</option></select></label>
              <label>Giá trị<input type="number" name="discountValue" min="0" value="10"></label>
              <label>Giảm tối đa (đ)<input type="number" name="maxDiscount" min="0" placeholder="Không bắt buộc"></label>
              <label>Đơn tối thiểu (đ)<input type="number" name="minimumOrder" min="0" value="50000"></label>
              <label>Bắt đầu<input type="date" name="startAt" value="${U.localDate(new Date())}"></label>
              <label>Kết thúc<input type="date" name="endAt" value="${U.localDate(Date.now() + 30 * 86400000)}"></label>
              <label data-freeship-only>Hạn ngạch lượt dùng (bắt buộc với freeship)<input type="number" name="usageLimit" min="1" placeholder="VD: 3000"></label>
              <label>Số lượt mỗi khách<input type="number" name="usagePerCustomer" min="1" value="1"></label>
              <label class="check-line"><input type="checkbox" name="firstOrderOnly"> Chỉ cho đơn đầu tiên của khách mới</label>
              <p class="muted wide-field" data-rule-note></p>
              <label class="wide-field">Mô tả<textarea name="description" rows="2"></textarea></label>
              <div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Tạo mã</button></div>
            </form>`, { wide: true });
          const form = m.body.querySelector('form');
          const syncRules = () => {
            const freeship = form.discountType.value === 'FREE_DELIVERY';
            form.querySelector('[data-freeship-only]').hidden = !freeship;
            form.endAt.closest('label').hidden = !freeship;
            form.querySelector('[data-rule-note]').textContent = freeship ? 'Mã freeship: bắt buộc có hạn ngạch và ngày kết thúc.' : 'Mã giảm giá chung: không giới hạn hạn ngạch và thời gian (có thể tắt bất cứ lúc nào).';
          };
          form.discountType.addEventListener('change', syncRules);
          syncRules();
          m.body.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const f = Object.fromEntries(new FormData(event.target));
            const freeship = f.discountType === 'FREE_DELIVERY';
            f.firstOrderOnly = event.target.firstOrderOnly.checked;
            f.startAt = new Date(`${f.startAt}T00:00:00`).toISOString();
            if (freeship) f.endAt = new Date(`${f.endAt}T23:59:59`).toISOString(); else { delete f.endAt; delete f.usageLimit; }
            if (!f.maxDiscount) delete f.maxDiscount;
            if (await act(() => api('/api/admin/manage/promotions', { method: 'POST', ...json(f) }), 'Đã tạo mã khuyến mãi.')) { m.close(); promotions(el); }
          });
        }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ QUÀ ĐỔI ĐIỂM ============ */
  async function loyaltyRewards() {
    const m = modal('Quà đổi điểm thưởng', loading, { wide: true });
    const render = async () => {
      try {
        const r = await api('/api/admin/manage/loyalty-rewards');
        m.body.innerHTML = `<p class="muted">Khách tích 1 điểm cho mỗi 1.000đ tiền món của đơn giao thành công và đổi điểm lấy voucher cá nhân (dùng 1 lần).</p>
          ${table([
    { h: 'Quà', f: x => cell(esc(x.name), esc(x.description || '')) },
    { h: 'Điểm cần', num: true, f: x => num(x.pointsCost) },
    { h: 'Ưu đãi', f: x => x.discountType === 'PERCENT' ? `${x.discountValue}%${x.maxDiscount ? ` (tối đa ${vnd(x.maxDiscount)})` : ''}` : x.discountType === 'FREE_DELIVERY' ? 'Miễn phí giao' : vnd(x.discountValue) },
    { h: 'Đơn tối thiểu', num: true, f: x => vnd(x.minimumOrder) },
    { h: 'Đã đổi', num: true, f: x => `${num(x.redeemed)}${x.stock != null ? ` · còn ${num(x.stock)}` : ''}` },
    { h: '', f: x => `<button class="secondary-button" data-act="reward-toggle" data-id="${x.id}" data-v="${x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${x.status === 'ACTIVE' ? 'Ngừng đổi' : 'Mở lại'}</button>` }
  ], r.items)}
          <form class="stacked-form compact-form" id="rewardForm">
            <strong>Thêm quà mới</strong>
            <label>Tên quà<input name="name" required placeholder="Voucher giảm 30K"></label>
            <label>Điểm cần đổi<input type="number" name="pointsCost" min="1" required value="2000"></label>
            <label>Loại<select name="discountType"><option value="FIXED_AMOUNT">Giảm tiền</option><option value="PERCENT">Giảm %</option><option value="FREE_DELIVERY">Miễn phí giao</option></select></label>
            <label>Giá trị<input type="number" name="discountValue" min="0" value="30000"></label>
            <label>Đơn tối thiểu<input type="number" name="minimumOrder" min="0" value="120000"></label>
            <label>Hiệu lực sau khi đổi (ngày)<input type="number" name="validDays" min="1" value="30"></label>
            <button class="primary-button" type="submit">Thêm quà</button>
          </form>`;
        bindClicks(m.body, { 'reward-toggle': async data => { if (await act(() => api(`/api/admin/manage/loyalty-rewards/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật quà.')) render(); } });
        m.body.querySelector('#rewardForm').addEventListener('submit', async event => {
          event.preventDefault();
          const f = Object.fromEntries(new FormData(event.target));
          if (await act(() => api('/api/admin/manage/loyalty-rewards', { method: 'POST', ...json({ ...f, pointsCost: Number(f.pointsCost), discountValue: Number(f.discountValue), minimumOrder: Number(f.minimumOrder), validDays: Number(f.validDays) }) }), 'Đã thêm quà đổi điểm.')) render();
        });
      } catch (error) { m.body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
    };
    render();
  }

  /* ============ BANNERS ============ */
  async function banners(el) {
    el.innerHTML = loading;
    try {
      const r = await api('/api/admin/manage/banners');
      el.innerHTML = `
        ${head('Banner trang chủ', 'Quản lý slide quảng cáo hiển thị đầu trang khách hàng.', '<button class="primary-button" data-act="create">＋ Thêm banner</button>')}
        <div class="banner-admin-grid">${r.items.map(b => `
          <article class="card banner-admin-card">
            <div class="banner-preview" style="background: linear-gradient(120deg, #ee4d2d, #ff8a3d)"><strong>${esc(b.title)}</strong></div>
            <div class="cell-main"><small class="muted">Thứ tự ${b.sortOrder} · ${U.dayFull(b.startAt)} – ${U.dayFull(b.endAt)}</small></div>
            <div class="button-row">${chip(b.status)}
              <button class="secondary-button compact-button" data-act="toggle" data-id="${b.id}" data-v="${b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${b.status === 'ACTIVE' ? 'Ẩn' : 'Hiện'}</button>
              <button class="text-button danger-text" data-act="remove" data-id="${b.id}">Xóa</button></div>
          </article>`).join('') || '<div class="empty-state">Chưa có banner.</div>'}</div>`;
      bindClicks(el, {
        toggle: async data => { if (await act(() => api(`/api/admin/banners/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật banner.')) banners(el); },
        remove: async data => { if (!(await confirmBox('Xóa banner này?', 'Xóa'))) return; if (await act(() => api(`/api/admin/banners/${data.id}`, { method: 'DELETE' }), 'Đã xóa banner.')) banners(el); },
        create: () => {
          const m = modal('Thêm banner', `<form class="stacked-form"><label>Tiêu đề<input name="title" required maxlength="120" placeholder="Giảm 30% cho đơn đầu tiên"></label>
            <label>Từ khóa khi bấm "Đặt ngay"<input name="targetUrl" placeholder="vd: cơm, trà sữa"></label>
            <div class="form-row"><label>Thứ tự<input type="number" name="sortOrder" value="1"></label><label>Hết hạn<input type="date" name="endAt" value="${U.localDate(Date.now() + 30 * 86400000)}"></label></div>
            <div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Lưu</button></div></form>`);
          m.body.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const f = Object.fromEntries(new FormData(event.target));
            const payload = { title: f.title, targetUrl: f.targetUrl || null, sortOrder: Number(f.sortOrder), imageUrl: '/uploads/banners/default.jpg', startAt: new Date().toISOString().slice(0, 19).replace('T', ' '), endAt: `${f.endAt} 23:59:59`, status: 'ACTIVE' };
            if (await act(() => api('/api/admin/banners', { method: 'POST', ...json(payload) }), 'Đã thêm banner.')) { m.close(); banners(el); }
          });
        }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ REVIEWS ============ */
  async function reviews(el) {
    const s = state.reviews;
    el.innerHTML = loading;
    try {
      const r = await api(`/api/admin/manage/reviews?page=${s.page}&pageSize=10&maxRating=${s.maxRating}`);
      el.innerHTML = `
        ${head('Kiểm duyệt đánh giá', 'Theo dõi phản hồi của khách và gỡ nội dung vi phạm.', `<div class="pill-tabs">${[[5, 'Tất cả'], [3, '≤ 3 sao'], [2, '≤ 2 sao']].map(([v, l]) => `<button type="button" class="${s.maxRating === v ? 'is-active' : ''}" data-act="filter" data-v="${v}">${l}</button>`).join('')}</div>`)}
        <div class="card-list">${r.items.map(x => `
          <article class="review-admin-card">
            <header><div><strong>${esc(x.customerName)}</strong> <span class="muted">→ ${esc(x.restaurantName)} · ${esc(x.orderCode)}</span></div><span class="star-line">${'★'.repeat(x.rating)}${'☆'.repeat(5 - x.rating)} <small>${dt(x.createdAt)}</small></span></header>
            <p>${esc(x.comment || 'Không có bình luận.')}</p>
            ${x.reply ? `<blockquote class="review-reply">Phản hồi của quán: ${esc(x.reply)}</blockquote>` : ''}
            <div class="button-row"><button class="text-button danger-text" data-act="remove" data-id="${x.id}">Gỡ đánh giá</button></div>
          </article>`).join('') || '<div class="empty-state">Chưa có đánh giá.</div>'}</div>${pager(r)}`;
      bindClicks(el, {
        page: p => { s.page = p; reviews(el); },
        filter: data => { s.maxRating = Number(data.v); s.page = 1; reviews(el); },
        remove: async data => { if (!(await confirmBox('Gỡ đánh giá này khỏi hệ thống?', 'Gỡ'))) return; if (await act(() => api(`/api/admin/manage/reviews/${data.id}`, { method: 'DELETE' }), 'Đã gỡ đánh giá.')) reviews(el); }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ SUPPORT ============ */
  async function support(el) {
    const s = state.support;
    el.innerHTML = loading;
    try {
      const r = await api('/api/communications/support/tickets');
      const items = r.items.filter(t => !s.status || (s.status === 'OPEN_ALL' ? !['RESOLVED', 'CLOSED'].includes(t.status) : t.status === s.status));
      el.innerHTML = `
        ${head('Hỗ trợ khách hàng', `${r.items.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length} ticket đang mở`, `<div class="pill-tabs">${[['', 'Tất cả'], ['OPEN_ALL', 'Đang mở'], ['RESOLVED', 'Đã giải quyết'], ['CLOSED', 'Đã đóng']].map(([v, l]) => `<button type="button" class="${s.status === v ? 'is-active' : ''}" data-act="filter" data-v="${v}">${l}</button>`).join('')}</div>`)}
        ${table([
    { h: 'Ticket', f: x => cell(esc(x.ticketCode), esc(x.subject)) },
    { h: 'Người gửi', f: x => esc(x.username) },
    { h: 'Nhóm', f: x => esc(x.category) },
    { h: 'Ưu tiên', f: x => chip(x.priority) },
    { h: 'Trạng thái', f: x => chip(x.status) },
    { h: 'Tạo lúc', f: x => dt(x.createdAt) },
    { h: '', f: x => `<button class="primary-button compact-button" data-act="open" data-id="${x.id}">Xử lý</button>` }
  ], items, 'Không có ticket nào.')}`;
      bindClicks(el, {
        filter: data => { s.status = data.v; support(el); },
        open: data => ticketDialog(items.find(t => t.id === Number(data.id)), el)
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  async function ticketDialog(ticket, el) {
    const m = modal(`${ticket.ticketCode} · ${ticket.subject}`, loading, { wide: true });
    const load = async () => {
      const r = await api(`/api/communications/support/tickets/${ticket.id}/messages`);
      m.body.innerHTML = `
        <div class="ticket-head">${chip(ticket.status)} ${chip(ticket.priority)} <span class="muted">${esc(ticket.username)} · ${esc(ticket.category)} · ${dt(ticket.createdAt)}</span></div>
        <blockquote class="review-reply">${esc(ticket.description)}</blockquote>
        <div class="fd-chat-log">${r.items.map(x => `<div class="fd-bubble ${x.senderId === fd().state.user.id ? 'is-mine' : ''}"><small>${esc(x.username)} · ${dt(x.createdAt)}</small><span>${esc(x.message)}</span></div>`).join('') || '<p class="muted">Chưa có phản hồi.</p>'}</div>
        <form class="fd-chat-form"><input name="message" placeholder="Nhập phản hồi cho khách…" required><button class="primary-button" type="submit">Gửi</button></form>
        <div class="button-row">${['IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(v => `<button class="secondary-button compact-button" data-status="${v}">${chip(v).replace(/<[^>]+>/g, '')}</button>`).join('')}</div>`;
      m.body.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        const message = new FormData(event.target).get('message');
        if (await act(() => api(`/api/communications/support/tickets/${ticket.id}/messages`, { method: 'POST', ...json({ message }) }))) load();
      });
      m.body.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', async () => {
        if (await act(() => api(`/api/communications/support/tickets/${ticket.id}`, { method: 'PATCH', ...json({ status: button.dataset.status }) }), 'Đã cập nhật ticket.')) { ticket.status = button.dataset.status; support(el); load(); }
      }));
    };
    load().catch(error => { m.body.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; });
  }

  /* ============ USERS ============ */
  async function users(el) {
    const s = state.users;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `${head('Tài khoản & phân quyền', 'Toàn bộ tài khoản hệ thống theo vai trò (Admin, Nhà hàng, Tài xế, Khách).')}
        <div class="filter-bar"><input type="search" data-q placeholder="Tìm username, email, SĐT…">
          <div class="pill-tabs" data-role>${[['', 'Tất cả'], ['ADMIN', 'Admin'], ['RESTAURANT', 'Nhà hàng'], ['SHIPPER', 'Tài xế'], ['CUSTOMER', 'Khách hàng']].map(([v, l]) => `<button type="button" data-v="${v}" class="${v === '' ? 'is-active' : ''}">${l}</button>`).join('')}</div></div>
        <div data-list></div>`;
      el.querySelector('[data-q]').addEventListener('input', event => { s.q = event.target.value.toLowerCase(); paintUsers(el); });
      el.querySelector('[data-role]').addEventListener('click', event => {
        const b = event.target.closest('button'); if (!b) return;
        s.role = b.dataset.v;
        el.querySelectorAll('[data-role] button').forEach(x => x.classList.toggle('is-active', x === b));
        paintUsers(el);
      });
    }
    el.querySelector('[data-list]').innerHTML = loading;
    try { state.userRows = (await api('/api/accounts/admin/users')).items; paintUsers(el); } catch (error) { el.querySelector('[data-list]').innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  function paintUsers(el) {
    const s = state.users;
    const rows = (state.userRows || []).filter(x => (!s.role || x.role === s.role) && (!s.q || `${x.username} ${x.email} ${x.phone}`.toLowerCase().includes(s.q)));
    const list = el.querySelector('[data-list]');
    list.innerHTML = table([
      { h: 'Tài khoản', f: x => `<div class="owner-menu-cell"><span class="avatar">${esc((x.username || '?')[0].toUpperCase())}</span>${cell(esc(x.username), esc(x.email))}</div>` },
      { h: 'Vai trò', f: x => `<span class="status-chip is-info">${esc(fd().roleLabel(x.role))}</span>` },
      { h: 'Điện thoại', f: x => esc(x.phone || '—') },
      { h: 'Trạng thái', f: x => chip(x.status) },
      { h: 'Tạo lúc', f: x => dt(x.createdAt) },
      { h: 'Thao tác', f: x => x.id === fd().state.user.id ? '<span class="muted">Tài khoản của bạn</span>' : `<div class="row-actions">${x.status !== 'ACTIVE' ? `<button class="secondary-button" data-act="set" data-id="${x.id}" data-v="ACTIVE">Mở</button>` : ''}${x.status === 'ACTIVE' ? `<button class="secondary-button" data-act="set" data-id="${x.id}" data-v="LOCKED">Khóa</button><button class="secondary-button" data-act="set" data-id="${x.id}" data-v="INACTIVE">Tạm ngưng</button>` : ''}</div>` }
    ], rows) + `<div class="pager"><span>${rows.length}/${(state.userRows || []).length} tài khoản</span></div>`;
    bindClicks(list, { set: async data => { if (await act(() => api(`/api/accounts/admin/users/${data.id}/status`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật tài khoản.')) users(el); } });
  }

  /* ============ CATALOG (categories + delivery zones) ============ */
  async function catalog(el) {
    el.innerHTML = loading;
    try {
      const [cats, zones] = await Promise.all([api('/api/admin/restaurant-categories'), api('/api/admin/manage/zones')]);
      el.innerHTML = `
        ${head('Danh mục & khu vực giao hàng', 'Danh mục hiển thị cho khách và biểu phí giao theo khu vực.')}
        <div class="grid-2">
          <div class="card"><div class="card-head"><h4>Danh mục nhà hàng</h4><button class="primary-button compact-button" data-act="cat-create">＋ Thêm</button></div>
            ${table([
    { h: 'Danh mục', f: x => `<span class="cat-inline">${fd().foodEmoji(x.name)}</span> ${cell(esc(x.name), esc(x.description || ''))}` },
    { h: 'Trạng thái', f: x => chip(x.status) },
    { h: '', f: x => `<div class="row-actions"><button class="secondary-button" data-act="cat-toggle" data-id="${x.id}" data-v="${x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${x.status === 'ACTIVE' ? 'Ẩn' : 'Hiện'}</button></div>` }
  ], cats.items)}</div>
          <div class="card"><div class="card-head"><h4>Khu vực & phí giao</h4><button class="primary-button compact-button" data-act="zone-create">＋ Thêm</button></div>
            ${table([
    { h: 'Khu vực', f: x => cell(esc(x.name), esc([x.district, x.city].filter(Boolean).join(', '))) },
    { h: 'Phí cơ bản', num: true, f: x => vnd(x.baseFee) },
    { h: '/km', num: true, f: x => vnd(x.pricePerKm) },
    { h: 'Tối đa', num: true, f: x => `${x.maximumDistance} km` },
    { h: '', f: x => `<button class="secondary-button compact-button" data-act="zone-toggle" data-id="${x.id}" data-v="${x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${x.status === 'ACTIVE' ? 'Tắt' : 'Bật'}</button>` }
  ], zones.items)}</div>
        </div>`;
      bindClicks(el, {
        'cat-toggle': async data => { if (await act(() => api(`/api/admin/restaurant-categories/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật danh mục.')) catalog(el); },
        'zone-toggle': async data => { if (await act(() => api(`/api/admin/manage/zones/${data.id}`, { method: 'PATCH', ...json({ status: data.v }) }), 'Đã cập nhật khu vực.')) catalog(el); },
        'cat-create': () => {
          const m = modal('Thêm danh mục', `<form class="stacked-form"><label>Tên danh mục<input name="name" required maxlength="100"></label><label>Mô tả<input name="description" maxlength="255"></label><div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Lưu</button></div></form>`);
          m.body.querySelector('form').addEventListener('submit', async event => { event.preventDefault(); if (await act(() => api('/api/admin/restaurant-categories', { method: 'POST', ...json(Object.fromEntries(new FormData(event.target))) }), 'Đã thêm danh mục.')) { m.close(); catalog(el); } });
        },
        'zone-create': () => {
          const m = modal('Thêm khu vực giao hàng', `<form class="stacked-form compact-form"><label>Tên<input name="name" required></label><label>Thành phố<input name="city" value="${esc(fd().state.city || '')}" required></label><label>Phường/Xã<input name="district"></label><label>Phí cơ bản (đ)<input type="number" name="baseFee" value="15000"></label><label>Phí mỗi km (đ)<input type="number" name="pricePerKm" value="5000"></label><label>Phí tối thiểu (đ)<input type="number" name="minimumFee" value="15000"></label><label>Khoảng cách tối đa (km)<input type="number" name="maximumDistance" value="15"></label><div class="button-row m-actions"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">Lưu</button></div></form>`);
          m.body.querySelector('form').addEventListener('submit', async event => { event.preventDefault(); if (await act(() => api('/api/admin/manage/zones', { method: 'POST', ...json(Object.fromEntries(new FormData(event.target))) }), 'Đã thêm khu vực.')) { m.close(); catalog(el); } });
        }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ SETTINGS ============ */
  async function settings(el) {
    el.innerHTML = loading;
    try {
      const r = await api('/api/admin/system-settings');
      el.innerHTML = `${head('Cấu hình hệ thống', 'Các tham số vận hành áp dụng toàn nền tảng. Thay đổi được ghi vào nhật ký.')}
        <div class="card settings-list">${r.items.map(x => `
          <form class="setting-row" data-key="${esc(x.key)}">
            <div class="cell-main"><strong>${esc(x.description || x.key)}</strong><small><code>${esc(x.key)}</code> · cập nhật ${dt(x.updatedAt)}</small></div>
            <input name="value" value="${esc(x.value)}" maxlength="500">
            <button class="secondary-button" type="submit">Lưu</button>
          </form>`).join('')}</div>`;
      el.querySelectorAll('.setting-row').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        await act(() => api(`/api/admin/system-settings/${encodeURIComponent(form.dataset.key)}`, { method: 'PUT', ...json({ value: form.elements.value.value, description: form.querySelector('strong').textContent }) }), 'Đã lưu cấu hình.');
      }));
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ DATA (import / export / jobs) ============ */
  async function data(el) {
    el.innerHTML = loading;
    try {
      const [ex, im, bg] = await Promise.all([api('/api/jobs/exports'), api('/api/jobs/imports'), api('/api/jobs/background')]);
      el.innerHTML = `
        ${head('Nhập / xuất dữ liệu', 'Xuất báo cáo CSV/Excel/PDF, nhập danh sách nhà hàng & món, và các tác vụ nền.', '<button class="secondary-button" data-act="run">▶ Chạy job nền</button>')}
        <div class="card"><h4>Tạo file xuất</h4>
          <form class="filter-bar" data-export>
            <select name="exportType"><option value="ORDERS">Đơn hàng</option><option value="REVENUE">Doanh thu</option><option value="SHIPPER">Tài xế</option><option value="SETTLEMENT">Đối soát</option></select>
            <select name="format"><option value="CSV">CSV</option><option value="EXCEL">Excel</option><option value="PDF">PDF</option></select>
            <button class="primary-button compact-button" type="submit">Tạo file</button></form></div>
        <div class="card"><h4>Nhập từ file</h4>
          <p class="muted">Hỗ trợ <b>.xlsx</b>, .csv, .xls/.xml (SpreadsheetML). Dòng 1 là tiêu đề cột — món: <code>restaurant_id, name, price, description</code>; nhà hàng: <code>name, address, district, city, phone, description</code>. Tối đa khoảng 700 KB.</p>
          <form class="filter-bar" data-import>
            <select name="jobType"><option value="MENU_ITEMS">Món ăn</option><option value="RESTAURANTS">Nhà hàng</option></select>
            <input type="file" name="file" accept=".xlsx,.csv,.xls,.xml" required>
            <button class="primary-button compact-button" type="submit">Nhập dữ liệu</button></form>
          <div id="importResult" class="muted"></div></div>
        <div class="grid-2">
          <div class="card"><h4>Lịch sử xuất (${ex.items.length})</h4>${table([
    { h: 'Loại', f: x => `<b>${esc(x.exportType)}</b> <small class="muted">${esc(x.format)}</small>` },
    { h: 'Trạng thái', f: x => chip(x.status) }, { h: 'Thời gian', f: x => dt(x.createdAt) },
    { h: '', f: x => x.fileUrl ? `<a class="secondary-link" href="${esc(x.fileUrl)}" target="_blank" rel="noreferrer">Tải về</a>` : '' }
  ], ex.items.slice(0, 8))}</div>
          <div class="card"><h4>Lịch sử nhập (${im.items.length}) · Job nền (${bg.items.length})</h4>${table([
    { h: 'Loại', f: x => esc(x.importType || x.jobType || '—') }, { h: 'Trạng thái', f: x => chip(x.status) }, { h: 'Thời gian', f: x => dt(x.createdAt) }
  ], [...im.items, ...bg.items].slice(0, 8), 'Chưa có job nhập hoặc job nền.')}</div>
        </div>`;
      el.querySelector('[data-export]').addEventListener('submit', async event => {
        event.preventDefault();
        const f = Object.fromEntries(new FormData(event.target));
        const res = await act(() => api('/api/jobs/exports', { method: 'POST', ...json({ ...f, filters: {} }) }), 'Đã tạo file xuất.');
        if (res) data(el);
      });
      el.querySelector('[data-import]').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.target;
        const file = form.elements.file.files[0];
        if (!file) return;
        const isXlsx = /.xlsx$/i.test(file.name);
        const content = isXlsx
          ? await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file); })
          : await file.text();
        const res = await act(() => api('/api/jobs/imports', { method: 'POST', ...json({ jobType: form.elements.jobType.value, fileName: file.name, content, ...(isXlsx ? { encoding: 'base64' } : {}) }) }), 'Đã nhập xong file.');
        if (res) {
          el.querySelector('#importResult').innerHTML = `Kết quả: <b>${num(res.successRows ?? 0)}</b>/${num(res.totalRows ?? 0)} dòng thành công${res.failedRows ? `, <b>${num(res.failedRows)}</b> dòng lỗi` : ''}.${(res.errors || []).slice(0, 5).map(e => `<div class="error-box">Dòng ${esc(e.row ?? '')}: ${esc(e.message || e.error || '')}</div>`).join('')}`;
        }
      });
      bindClicks(el, { run: async () => { const res = await act(() => api('/api/jobs/background/run', { method: 'POST' })); if (res) { fd().toast(`Đã chạy ${res.completedJobIds?.length || 0} job nền.`); data(el); } } });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }


  /* ============ PARTNER APPLICATIONS ============ */
  async function applications(el) {
    const s = state.applications;
    const title = 'Duyệt đối tác';
    const subtitle = 'Hồ sơ đăng ký làm tài xế hoặc mở nhà hàng gửi từ trang chủ. Duyệt xong tài khoản mới đăng nhập được.';
    el.innerHTML = head(title, subtitle) + loading;
    try {
      const qs = new URLSearchParams(Object.entries(s).filter(([, v]) => v)).toString();
      const res = await api(`/api/admin/partners/applications${qs ? `?${qs}` : ''}`);
      const c = res.counts || {};
      el.innerHTML = `${head(title, subtitle)}
        <div class="stat-grid">
          ${statCard({ label: 'Chờ duyệt', value: num(c.PENDING || 0), icon: '⏳', tone: 'is-amber' })}
          ${statCard({ label: 'Đã duyệt', value: num(c.APPROVED || 0), icon: '✅', tone: 'is-green' })}
          ${statCard({ label: 'Từ chối', value: num(c.REJECTED || 0), icon: '⛔', tone: 'is-blue' })}
        </div>
        <div class="filter-bar">
          <div class="pill-tabs">${[['', 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối']].map(([v, l]) => `<button type="button" data-act="status" data-v="${v}" class="${s.status === v ? 'is-active' : ''}">${l}</button>`).join('')}</div>
          <div class="pill-tabs">${[['', 'Mọi loại'], ['SHIPPER', '🛵 Tài xế'], ['RESTAURANT', '🏪 Nhà hàng']].map(([v, l]) => `<button type="button" data-act="type" data-v="${v}" class="${s.type === v ? 'is-active' : ''}">${l}</button>`).join('')}</div>
        </div>
        ${res.items.length ? `<div class="app-grid">${res.items.map(a => {
    const p = a.payload;
    const rows = a.type === 'SHIPPER'
      ? [['Họ tên', esc(p.fullName)], ['CCCD', esc(p.identityNumber)], ['Phương tiện', esc([p.vehicleType, p.vehiclePlate].filter(Boolean).join(' · '))], ['GPLX', esc(p.drivingLicense || '—')], ['Khu vực', esc(p.city || '—')]]
      : [['Chủ quán', esc(p.ownerName)], ['Địa chỉ', esc([p.address, p.ward, p.district, p.city].filter(Boolean).join(', '))], ['GPKD', esc(p.businessLicense || '—')], ['Đơn tối thiểu', vnd(p.minimumOrder || 0)]];
    return `<article class="card app-card">
            <header>${cell(esc(a.applicantName), `${a.type === 'SHIPPER' ? '🛵 Tài xế' : '🏪 Nhà hàng'} · #${a.id}`)}${chip(a.status)}</header>
            ${kv([...rows, ['Liên hệ', `${esc(a.email)} · ${esc(a.phone)}`], ['Tài khoản', esc(a.username)], ['Gửi lúc', dt(a.createdAt)], ...(a.reviewNote ? [['Ghi chú duyệt', esc(a.reviewNote)]] : [])])}
            ${a.status === 'PENDING' ? `<div class="button-row"><button class="primary-button compact-button" data-act="approve" data-id="${a.id}" data-type="${a.type}">✔ Duyệt</button><button class="secondary-button compact-button" data-act="reject" data-id="${a.id}">✖ Từ chối</button></div>` : ''}
          </article>`;
  }).join('')}</div>` : '<div class="empty-state">Chưa có hồ sơ nào phù hợp.</div>'}`;
      bindClicks(el, {
        status: d => { s.status = d.v; applications(el); },
        type: d => { s.type = d.v; applications(el); },
        approve: async d => {
          let commission = 15;
          if (d.type === 'RESTAURANT') {
            const value = window.prompt('Tỷ lệ hoa hồng cho nhà hàng này (%)', '15');
            if (value === null) return;
            commission = Number(value);
            if (!Number.isFinite(commission) || commission < 0 || commission > 100) { fd().toast('Hoa hồng phải từ 0 đến 100.', true); return; }
          }
          if (await act(() => api(`/api/admin/partners/applications/${d.id}/approve`, { method: 'POST', ...json({ commissionRate: commission }) }), 'Đã duyệt hồ sơ. Tài khoản đã kích hoạt.')) applications(el);
        },
        reject: async d => {
          const note = window.prompt('Lý do từ chối (bắt buộc)');
          if (!note || !note.trim()) return;
          if (await act(() => api(`/api/admin/partners/applications/${d.id}/reject`, { method: 'POST', ...json({ note: note.trim() }) }), 'Đã từ chối hồ sơ.')) applications(el);
        }
      });
    } catch (error) { el.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  /* ============ AUDIT ============ */
  async function audit(el) {
    const s = state.audit;
    if (!el.dataset.ready) {
      el.dataset.ready = '1';
      el.innerHTML = `${head('Nhật ký bảo mật & kiểm toán', 'Mọi thao tác nhạy cảm đều được ghi lại: ai, làm gì, từ đâu.')}
        <form class="filter-bar" data-filters><select name="entityType"><option value="">Mọi đối tượng</option>${['USER', 'RESTAURANT', 'ORDER', 'PAYMENT', 'PROMOTION', 'SHIPPER_PROFILE', 'SYSTEM_SETTING'].map(x => `<option>${x}</option>`).join('')}</select><input name="action" placeholder="Mã hành động, vd ADMIN_REFUND_UPDATE"><button class="primary-button compact-button" type="submit">Lọc</button></form>
        <div data-list></div>`;
      el.querySelector('[data-filters]').addEventListener('submit', event => { event.preventDefault(); Object.assign(s, Object.fromEntries(new FormData(event.target)), { page: 1 }); audit(el); });
    }
    const list = el.querySelector('[data-list]');
    list.innerHTML = loading;
    const params = new URLSearchParams({ page: s.page, pageSize: 20 });
    if (s.action) params.set('action', s.action);
    if (s.entityType) params.set('entityType', s.entityType);
    try {
      const r = await api(`/api/admin/audit-logs?${params}`);
      list.innerHTML = table([
        { h: 'Thời gian', f: x => dt(x.createdAt) },
        { h: 'Người thực hiện', f: x => esc(x.username || 'Hệ thống') },
        { h: 'Hành động', f: x => cell(esc(fd().activityLabel(x.action)), `<code>${esc(x.action)}</code>`) },
        { h: 'Đối tượng', f: x => `${esc(x.entityType || '—')}${x.entityId ? ` #${esc(x.entityId)}` : ''}` },
        { h: 'IP', f: x => esc(x.ipAddress || '—') }
      ], r.items) + pager({ page: r.page || s.page, pageSize: r.pageSize || 20, totalItems: r.totalItems ?? r.items.length });
      bindClicks(list, { page: p => { s.page = p; audit(el); } });
    } catch (error) { list.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
  }

  const RENDER = { overview, live, reports, orders, applications, restaurants, shippers, customers, payments, settlements, promotions, banners, reviews, support, users, catalog, settings, data, audit };

  build();
  setInterval(() => { const clock = $('#adminClock'); if (clock) clock.textContent = new Date().toLocaleString('vi-VN'); }, 1000);
  window.FDAdmin = { load() { build(); fd().showSubView('admin', 'overview'); } };
}());
