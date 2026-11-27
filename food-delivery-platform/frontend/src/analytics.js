/* Thống kê & báo cáo: biểu đồ, bảng, so sánh kỳ trước và xuất file thật (Excel/PDF/CSV) cho admin, nhà hàng, tài xế, khách.
   Mọi số liệu lấy từ /api/analytics/* (truy vấn trực tiếp DB); file xuất do server sinh ra đúng bằng bảng đang xem. */
(function () {
  const U = window.FDUI;
  const fd = () => window.FD;
  const { esc, num, vnd, compact, loading } = U;
  const PALETTE = ['#ee4d2d', '#2563eb', '#12a05c', '#f59e0b', '#8b5cf6', '#0ea5e9', '#6b7280'];
  const pad = n => String(n).padStart(2, '0');
  const today = () => U.localDate(new Date());
  const daysAgo = n => U.localDate(Date.now() - n * 86400000);
  const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; };
  const percent = value => `${(Number(value) || 0).toFixed(1)}%`;

  /* ---------- tải file thật từ server (kèm token) ---------- */
  async function download(path, format) {
    const separator = path.includes('?') ? '&' : '?';
    try {
      fd().toast(`Đang tạo file ${format.toUpperCase()}…`);
      const response = await fetch(`${path}${separator}format=${format}`, { headers: { Authorization: `Bearer ${fd().state.token}` } });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || `Lỗi ${response.status}`);
      const blob = await response.blob();
      const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '');
      const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: match?.[1] || `bao-cao.${format}` });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      fd().toast(`Đã tải ${link.download} (${(blob.size / 1024).toFixed(0)} KB).`);
    } catch (error) {
      fd().toast(error.message, true);
    }
  }

  const exportButtons = () => `<div class="export-bar" role="group" aria-label="Xuất báo cáo">
    <span class="muted">Xuất báo cáo:</span>
    <button type="button" class="secondary-button compact-button" data-an-export="xlsx">📗 Excel</button>
    <button type="button" class="secondary-button compact-button" data-an-export="pdf">📕 PDF</button>
    <button type="button" class="secondary-button compact-button" data-an-export="csv">📄 CSV</button></div>`;

  /* ---------- thanh chọn khoảng thời gian ---------- */
  function rangeBar(state) {
    const presets = [['7 ngày', 6], ['30 ngày', 29], ['90 ngày', 89]];
    const active = state.preset;
    return `<div class="range-bar">
      <div class="pill-tabs">${presets.map(([label, back]) => `<button type="button" class="${active === back ? 'is-active' : ''}" data-an-preset="${back}">${label}</button>`).join('')}
        <button type="button" class="${active === 'month' ? 'is-active' : ''}" data-an-preset="month">Tháng này</button></div>
      <form class="range-custom" data-an-range>
        <input type="date" name="from" value="${esc(state.from)}" max="${today()}" aria-label="Từ ngày"><span>→</span>
        <input type="date" name="to" value="${esc(state.to)}" max="${today()}" aria-label="Đến ngày">
        <button class="secondary-button compact-button" type="submit">Áp dụng</button></form>
      <div class="pill-tabs" aria-label="Nhóm theo">${[['day', 'Ngày'], ['week', 'Tuần'], ['month', 'Tháng']].map(([key, label]) => `<button type="button" class="${state.group === key ? 'is-active' : ''}" data-an-group="${key}">${label}</button>`).join('')}</div>
    </div>`;
  }

  function bindRange(root, state, reload) {
    root.querySelectorAll('[data-an-preset]').forEach(button => button.addEventListener('click', () => {
      const value = button.dataset.anPreset;
      state.preset = value === 'month' ? 'month' : Number(value);
      state.from = value === 'month' ? monthStart() : daysAgo(Number(value));
      state.to = today();
      reload();
    }));
    root.querySelector('[data-an-range]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.target);
      if (form.get('from') && form.get('to')) { state.from = form.get('from'); state.to = form.get('to'); state.preset = null; reload(); }
    });
    root.querySelectorAll('[data-an-group]').forEach(button => button.addEventListener('click', () => { state.group = button.dataset.anGroup; reload(); }));
  }

  /* ---------- thẻ KPI có so sánh kỳ trước ---------- */
  function kpi({ label, value, delta = null, goodWhenUp = true, hint = '', icon = '📈', tone = '' }) {
    let deltaHtml = '';
    if (delta !== null && delta !== undefined) {
      const up = delta >= 0;
      const good = up === goodWhenUp;
      deltaHtml = `<span class="delta ${good ? 'is-good' : 'is-bad'}" title="So với kỳ trước cùng độ dài">${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%</span>`;
    }
    return U.statCard({ label, value: `${value}${deltaHtml}`, hint, icon, tone });
  }

  /* ---------- biểu đồ ---------- */
  function lineChart(rows, defs, { format = compact, height = 230 } = {}) {
    if (!rows.length) return '<div class="empty-state">Chưa có dữ liệu trong khoảng này.</div>';
    const width = 760;
    const left = 58;
    const bottom = 30;
    const top = 14;
    const max = Math.max(1, ...rows.flatMap(row => defs.map(def => Number(row[def.key]) || 0)));
    const x = index => left + (rows.length === 1 ? (width - left - 12) / 2 : (index * (width - left - 12)) / (rows.length - 1));
    const y = value => top + (1 - value / max) * (height - top - bottom);
    const grid = [0, 0.25, 0.5, 0.75, 1].map(step => `<line x1="${left}" x2="${width - 6}" y1="${y(max * step)}" y2="${y(max * step)}" stroke="#eceef2"/><text x="${left - 6}" y="${y(max * step) + 4}" text-anchor="end" font-size="10" fill="#6b7280">${esc(format(max * step))}</text>`).join('');
    const step = Math.max(1, Math.ceil(rows.length / 10));
    const labels = rows.map((row, index) => (index % step === 0 ? `<text x="${x(index)}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#6b7280">${esc(row.label)}</text>` : '')).join('');
    const lines = defs.map((def, index) => {
      const color = def.color || PALETTE[index % PALETTE.length];
      const points = rows.map((row, i) => `${x(i)},${y(Number(row[def.key]) || 0)}`).join(' ');
      const area = index === 0 && defs.length === 1 ? `<polygon points="${left},${y(0)} ${points} ${x(rows.length - 1)},${y(0)}" fill="${color}" opacity=".08"/>` : '';
      const dots = rows.length <= 45 ? rows.map((row, i) => `<circle cx="${x(i)}" cy="${y(Number(row[def.key]) || 0)}" r="3" fill="${color}"><title>${esc(row.label)} · ${esc(def.label)}: ${esc((def.format || format)(row[def.key]))}</title></circle>`).join('') : '';
      return `${area}<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>${dots}`;
    }).join('');
    const legend = defs.length > 1 ? `<div class="legend">${defs.map((def, index) => `<span><i style="background:${def.color || PALETTE[index % PALETTE.length]}"></i>${esc(def.label)}</span>`).join('')}</div>` : '';
    return `<div class="line-chart"><svg viewBox="0 0 ${width} ${height}" role="img" preserveAspectRatio="xMidYMid meet">${grid}${labels}${lines}</svg>${legend}</div>`;
  }

  function stackedBars(rows, defs, { height = 180 } = {}) {
    if (!rows.length) return '<div class="empty-state">Chưa có dữ liệu trong khoảng này.</div>';
    const max = Math.max(1, ...rows.map(row => defs.reduce((sum, def) => sum + (Number(row[def.key]) || 0), 0)));
    const step = Math.max(1, Math.ceil(rows.length / 14));
    return `<div class="stack-chart" style="height:${height + 22}px">${rows.map((row, index) => `
      <div class="stack-col" title="${esc(row.label)}: ${defs.map(def => `${def.label} ${num(row[def.key])}`).join(' · ')}">
        <div class="stack" style="height:${height}px">${defs.map((def, i) => `<span style="height:${((Number(row[def.key]) || 0) / max) * 100}%;background:${def.color || PALETTE[i]}"></span>`).join('')}</div>
        <label>${index % step === 0 ? esc(row.label) : ''}</label></div>`).join('')}</div>
      <div class="legend">${defs.map((def, i) => `<span><i style="background:${def.color || PALETTE[i]}"></i>${esc(def.label)}</span>`).join('')}</div>`;
  }

  function heatmap(cells) {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    cells.forEach(cell => { grid[cell.weekday][cell.hour] = cell.orders; });
    const max = Math.max(1, ...grid.flat());
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return `<div class="heatmap"><div class="heat-row heat-head"><span></span>${Array.from({ length: 24 }, (_, h) => `<span>${h % 3 === 0 ? h : ''}</span>`).join('')}</div>
      ${grid.map((row, d) => `<div class="heat-row"><span>${days[d]}</span>${row.map((value, h) => `<i title="${days[d]} ${h}h: ${num(value)} đơn" style="background:rgba(238,77,45,${(value / max).toFixed(2)})"></i>`).join('')}</div>`).join('')}</div>`;
  }

  /* ---------- bảng từ dataset (có sắp xếp theo cột, xem thêm) ---------- */
  function cellText(value, type, key = '') {
    if (value === null || value === undefined || value === '') return '';
    if (type === 'money') return vnd(value);
    if (type === 'number') return num(Math.round(Number(value) * 100) / 100);
    if (type === 'percent') return percent(value);
    if (type === 'date') return U.dayFull(value);
    if (type === 'datetime') return U.dt(value);
    if (/status$/i.test(key)) return U.chip(value);
    return esc(value);
  }

  function dataTable(host, dataset, { limit = 15, filter = null } = {}) {
    let sortKey = null;
    let sortDir = -1;
    let shown = limit;
    const columns = dataset.columns;
    const render = () => {
      let rows = filter ? dataset.rows.filter(filter) : dataset.rows.slice();
      if (sortKey) {
        const type = columns.find(column => column.key === sortKey)?.type;
        rows.sort((a, b) => (['money', 'number', 'percent'].includes(type) ? (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0) : String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'vi')) * sortDir);
      }
      const visible = rows.slice(0, shown);
      const sums = columns.map(column => (column.type === 'money' ? rows.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0) : null));
      host.innerHTML = `<div class="table-shell"><table><thead><tr>${columns.map(column => `<th class="${['money', 'number', 'percent'].includes(column.type) ? 'num' : ''} sortable" data-sort="${column.key}">${esc(column.label)}${sortKey === column.key ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${visible.length ? visible.map(row => `<tr>${columns.map(column => `<td class="${['money', 'number', 'percent'].includes(column.type) ? 'num' : ''}">${cellText(row[column.key], column.type, column.key)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}"><div class="empty-state">Không có dữ liệu trong khoảng này.</div></td></tr>`}</tbody>
        ${sums.some(value => value !== null) && rows.length ? `<tfoot><tr>${columns.map((column, index) => `<td class="${sums[index] !== null ? 'num' : ''}">${index === 0 ? `Tổng (${num(rows.length)} dòng)` : sums[index] !== null ? vnd(sums[index]) : ''}</td>`).join('')}</tr></tfoot>` : ''}</table></div>
        ${rows.length > shown ? `<div class="load-more"><button class="secondary-button compact-button" type="button" data-more>Xem thêm (${num(rows.length - shown)} dòng)</button></div>` : ''}`;
      host.querySelectorAll('[data-sort]').forEach(th => th.addEventListener('click', () => { sortDir = sortKey === th.dataset.sort ? -sortDir : -1; sortKey = th.dataset.sort; render(); }));
      host.querySelector('[data-more]')?.addEventListener('click', () => { shown += 25; render(); });
    };
    render();
  }

  const methodLabel = method => fd().paymentLabel?.(method) ?? method;
  const statusLabel = status => fd().statusLabel?.(status) ?? status;

  /* ---------- khung trang báo cáo dùng chung ---------- */
  function shell(host, { title, subtitle, tabs, state, load }) {
    host.innerHTML = `<div class="an-page">
      <div class="an-head"><div><h3>${esc(title)}</h3><p class="muted">${esc(subtitle)}</p></div></div>
      <div class="an-tabs pill-tabs">${tabs.map(([key, label]) => `<button type="button" class="${state.tab === key ? 'is-active' : ''}" data-an-tab="${key}">${esc(label)}</button>`).join('')}</div>
      <div class="an-body" id="anBody">${loading}</div></div>`;
    host.querySelectorAll('[data-an-tab]').forEach(button => button.addEventListener('click', () => {
      state.tab = button.dataset.anTab;
      host.querySelectorAll('[data-an-tab]').forEach(item => item.classList.toggle('is-active', item === button));
      load();
    }));
  }

  const qs = state => `from=${state.from}&to=${state.to}&group=${state.group}`;

  function frame(body, state, path, reload, inner) {
    body.innerHTML = `<div class="an-toolbar">${rangeBar(state)}${exportButtons()}</div>${inner}`;
    bindRange(body, state, reload);
    body.querySelectorAll('[data-an-export]').forEach(button => button.addEventListener('click', () => download(path, button.dataset.anExport)));
  }

  /* ---------- các tab ---------- */
  const TABS = {
    async overview(body, ctx, state, reload) {
      const path = `${ctx.base}/overview?${qs(state)}`;
      const r = await fd().api(path);
      const k = r.kpis;
      const d = r.deltas;
      const cards = ctx.admin ? [
        kpi({ label: 'Doanh thu món (GMV)', value: vnd(k.gmv), delta: d.gmv, icon: '💰', hint: `Khách thanh toán ${vnd(k.collected)}` }),
        kpi({ label: 'Đơn hàng', value: num(k.orders), delta: d.orders, icon: '🧾', tone: 'is-blue', hint: `${num(k.delivered)} đã giao` }),
        kpi({ label: 'Giá trị TB/đơn', value: vnd(k.avgOrderValue), delta: d.avgOrderValue, icon: '🧮', tone: 'is-amber' }),
        kpi({ label: 'Hoa hồng nền tảng', value: vnd(k.commission), delta: d.commission, icon: '🏦', tone: 'is-green' }),
        kpi({ label: 'Chi phí khuyến mãi nền tảng', value: vnd(k.platformPromo), icon: '🎟️', tone: 'is-amber', hint: `Quán tự chịu ${vnd(k.shopPromo)}` }),
        kpi({ label: 'Doanh thu ròng nền tảng', value: vnd(k.netRevenue), delta: d.netRevenue, icon: '📈', tone: 'is-green', hint: 'Hoa hồng − khuyến mãi nền tảng' }),
        kpi({ label: 'Khách đặt hàng', value: num(k.activeCustomers), delta: d.activeCustomers, icon: '🙋', tone: 'is-blue', hint: `${num(k.newCustomers)} khách mới` }),
        kpi({ label: 'Tỷ lệ huỷ/thất bại', value: percent(k.cancelRate), icon: '🚫', tone: 'is-amber', hint: `${num(k.cancelled)} huỷ · ${num(k.failed)} thất bại` })
      ] : [
        kpi({ label: 'Doanh thu món', value: vnd(k.gmv), delta: d.gmv, icon: '💰', hint: `${num(k.delivered)} đơn đã giao` }),
        kpi({ label: 'Đơn hàng', value: num(k.orders), delta: d.orders, icon: '🧾', tone: 'is-blue' }),
        kpi({ label: 'Giá trị TB/đơn', value: vnd(k.avgOrderValue), delta: d.avgOrderValue, icon: '🧮', tone: 'is-amber' }),
        kpi({ label: 'Hoa hồng đã trả nền tảng', value: vnd(k.commission), icon: '🏦', tone: 'is-amber' }),
        kpi({ label: 'Khuyến mãi quán chịu', value: vnd(k.shopPromo), icon: '🎟️', tone: 'is-amber' }),
        kpi({ label: 'Thực nhận ước tính', value: vnd(k.restaurantNet), delta: d.restaurantNet, icon: '📈', tone: 'is-green', hint: 'Doanh thu − hoa hồng − khuyến mãi quán' }),
        kpi({ label: 'Khách đặt hàng', value: num(k.activeCustomers), delta: d.activeCustomers, icon: '🙋', tone: 'is-blue', hint: `${num(k.newCustomers)} khách mới` }),
        kpi({ label: 'Tỷ lệ huỷ/thất bại', value: percent(k.cancelRate), icon: '🚫', tone: 'is-amber', hint: `${num(k.cancelled)} huỷ · ${num(k.failed)} thất bại` })
      ];
      frame(body, state, path, reload, `
        <div class="stat-grid">${cards.join('')}</div>
        <div class="card"><div class="card-head"><h4>Doanh thu theo ${state.group === 'day' ? 'ngày' : state.group === 'week' ? 'tuần' : 'tháng'}</h4></div>
          ${lineChart(r.series, [{ key: 'gmv', label: 'Doanh thu món', format: vnd }, ...(ctx.admin ? [{ key: 'commission', label: 'Hoa hồng nền tảng', format: vnd }] : [{ key: 'discounts', label: 'Giảm giá', format: vnd }])], { format: compact })}</div>
        <div class="grid-2">
          <div class="card"><h4>Đơn hàng (đã giao / huỷ-thất bại)</h4>${stackedBars(r.series, [{ key: 'delivered', label: 'Đã giao', color: '#12a05c' }, { key: 'lost', label: 'Huỷ/thất bại', color: '#ef4444' }])}</div>
          <div class="card"><h4>Phương thức thanh toán</h4>${U.donut(r.byPayment, { labelKey: 'method', valueKey: 'orders', labelFn: methodLabel })}</div>
        </div>
        <div class="grid-2">
          <div class="card"><h4>Khung giờ cao điểm (thứ × giờ)</h4>${heatmap(r.heat)}</div>
          <div class="card"><h4>Trạng thái đơn</h4>${U.donut(r.byStatus, { labelKey: 'status', valueKey: 'orders', labelFn: statusLabel })}</div>
        </div>
        <div class="card"><h4>Bảng số liệu theo kỳ</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async restaurants(body, ctx, state, reload) {
      const path = `${ctx.base}/restaurants?${qs(state)}`;
      const r = await fd().api(path);
      frame(body, state, path, reload, `
        <div class="grid-2">
          <div class="card"><h4>Top nhà hàng theo doanh thu</h4>${U.hbars(r.items.slice(0, 10), { valueKey: 'gmv', format: vnd, sub: x => `${num(x.orders)} đơn · ${percent(x.share)} tổng doanh thu` })}</div>
          <div class="card"><h4>Tỷ lệ huỷ/thất bại cao nhất</h4>${U.hbars(r.items.slice().sort((a, b) => b.cancelRate - a.cancelRate).slice(0, 8), { valueKey: 'cancelRate', format: percent, tone: 'is-red', sub: x => `${num(x.orders)} đơn` })}</div>
        </div>
        <div class="card"><h4>Hiệu quả theo nhà hàng</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async items(body, ctx, state, reload) {
      const path = `${ctx.base}/items?${qs(state)}`;
      const r = await fd().api(path);
      const c = r.comboSummary;
      frame(body, state, path, reload, `
        <div class="stat-grid">
          ${U.statCard({ label: 'Món/combo có doanh thu', value: num(r.items.length), icon: '🍽️' })}
          ${U.statCard({ label: 'Combo đã bán', value: num(c.units), hint: `${num(c.count)} loại combo`, icon: '🍱', tone: 'is-green' })}
          ${U.statCard({ label: 'Doanh thu từ combo', value: vnd(c.revenue), hint: `${percent(c.share)} tổng doanh thu món`, icon: '💵', tone: 'is-blue' })}
          ${r.unsold !== null ? U.statCard({ label: 'Món chưa bán được', value: num(r.unsold), hint: 'Không có đơn giao trong kỳ', icon: '⚠️', tone: 'is-amber' }) : ''}
        </div>
        <div class="grid-2">
          <div class="card"><h4>Top 10 theo doanh thu</h4>${U.hbars(r.items.slice(0, 10), { valueKey: 'revenue', format: vnd, sub: x => `${num(x.quantity)} phần · ${x.type}${ctx.admin ? ` · ${esc(x.restaurant)}` : ''}` })}</div>
          <div class="card"><h4>Doanh thu theo danh mục</h4>${U.donut(r.categories, { labelKey: 'name', valueKey: 'revenue', center: 'Danh mục' })}</div>
        </div>
        <div class="card"><div class="card-head"><h4>Chi tiết món và combo</h4>
          <div class="pill-tabs" id="anItemFilter"><button type="button" class="is-active" data-kind="">Tất cả</button><button type="button" data-kind="Món">Món</button><button type="button" data-kind="Combo">Combo</button></div></div><div id="anTable"></div></div>`);
      const host = body.querySelector('#anTable');
      let kind = '';
      const draw = () => dataTable(host, r.dataset, { limit: 20, filter: kind ? row => row.type === kind : null });
      body.querySelectorAll('#anItemFilter [data-kind]').forEach(button => button.addEventListener('click', () => {
        kind = button.dataset.kind;
        body.querySelectorAll('#anItemFilter button').forEach(item => item.classList.toggle('is-active', item === button));
        draw();
      }));
      draw();
    },

    async regions(body, ctx, state, reload) {
      const path = `${ctx.base}/regions?${qs(state)}`;
      const r = await fd().api(path);
      frame(body, state, path, reload, `
        <div class="grid-2">
          <div class="card"><h4>Doanh thu theo phường/xã</h4>${U.hbars(r.items, { valueKey: 'gmv', labelKey: 'district', format: vnd, sub: x => `${num(x.orders)} đơn · ${num(x.restaurants)} quán` })}</div>
          <div class="card"><h4>Tỷ trọng đơn hàng</h4>${U.donut(r.items, { labelKey: 'district', valueKey: 'orders' })}</div>
        </div>
        <div class="card"><h4>Chi tiết theo khu vực</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async promotions(body, ctx, state, reload) {
      const path = `${ctx.base}/promotions?${qs(state)}`;
      const r = await fd().api(path);
      const spend = r.items.reduce((sum, item) => sum + item.discount, 0);
      const loyalty = r.loyalty;
      frame(body, state, path, reload, `
        <div class="stat-grid">
          ${U.statCard({ label: 'Đơn dùng voucher', value: num(r.voucherOrders), hint: `${percent(r.voucherOrderShare)} / ${num(r.deliveredOrders)} đơn đã giao`, icon: '🎟️' })}
          ${U.statCard({ label: 'Tổng tiền giảm', value: vnd(spend), icon: '💸', tone: 'is-amber' })}
          ${U.statCard({ label: 'Doanh thu từ đơn có voucher', value: vnd(r.items.reduce((s, i) => s + i.revenue, 0)), icon: '💰', tone: 'is-green' })}
          ${U.statCard({ label: 'Voucher đang được dùng', value: num(r.items.length), icon: '🏷️', tone: 'is-blue' })}
        </div>
        <div class="grid-2">
          <div class="card"><h4>Tiền giảm theo loại voucher</h4>${U.donut(r.byScope.filter(x => x.discount > 0), { labelKey: 'name', valueKey: 'discount', center: 'Giảm giá' })}</div>
          <div class="card"><h4>Top voucher theo lượt dùng</h4>${U.hbars(r.items.slice().sort((a, b) => b.uses - a.uses).slice(0, 8), { valueKey: 'uses', labelKey: 'code', format: num, sub: x => `${esc(x.scope)} · giảm ${vnd(x.discount)}` })}</div>
        </div>
        ${loyalty ? `<div class="card"><h4>⭐ Chương trình điểm thưởng</h4>
          <div class="stat-grid">
            ${U.statCard({ label: 'Điểm đã cấp trong kỳ', value: num(loyalty.earned), icon: '➕', tone: 'is-green' })}
            ${U.statCard({ label: 'Điểm đã đổi trong kỳ', value: num(loyalty.redeemed), hint: `${num(loyalty.redeemers)} khách đổi`, icon: '🎁', tone: 'is-blue' })}
            ${U.statCard({ label: 'Điểm đang lưu hành', value: num(loyalty.outstanding), hint: `${num(loyalty.holders)} khách còn điểm`, icon: '🏦', tone: 'is-amber' })}
          </div>
          ${U.table([{ h: 'Quà đổi điểm', f: x => esc(x.name) }, { h: 'Điểm cần', num: true, f: x => num(x.pointsCost) }, { h: 'Đã đổi trong kỳ', num: true, f: x => num(x.redeemed) }, { h: 'Còn lại', num: true, f: x => (x.stock === null ? 'Không giới hạn' : num(x.stock)) }, { h: 'Trạng thái', f: x => U.chip(x.status) }], loyalty.rewards)}</div>` : ''}
        <div class="card"><h4>Hiệu quả từng voucher</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async customers(body, ctx, state, reload) {
      const path = `${ctx.base}/customers?${qs(state)}`;
      const r = await fd().api(path);
      frame(body, state, path, reload, `
        <div class="stat-grid">
          ${U.statCard({ label: 'Khách có đơn trong kỳ', value: num(r.items.length), icon: '🙋' })}
          ${U.statCard({ label: 'Khách mới', value: num(r.segments[0].customers), hint: `Chi tiêu ${vnd(r.segments[0].spent)}`, icon: '🆕', tone: 'is-blue' })}
          ${U.statCard({ label: 'Khách quay lại', value: num(r.segments[1].customers), hint: `${percent(r.repeatRate)} tổng khách`, icon: '🔁', tone: 'is-green' })}
        </div>
        <div class="grid-2">
          <div class="card"><h4>Tần suất đặt hàng</h4>${U.barChart(r.buckets.map(b => ({ label: b.label, customers: b.customers })), { valueKey: 'customers', format: num })}</div>
          <div class="card"><h4>Chi tiêu: khách mới vs quay lại</h4>${U.donut(r.segments.filter(s => s.spent > 0), { labelKey: 'name', valueKey: 'spent', center: 'Chi tiêu' })}</div>
        </div>
        <div class="card"><h4>Khách hàng giá trị cao</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async shippers(body, ctx, state, reload) {
      const path = `${ctx.base}/shippers?${qs(state)}`;
      const r = await fd().api(path);
      frame(body, state, path, reload, `
        <div class="grid-2">
          <div class="card"><h4>Thu nhập tài xế</h4>${U.hbars(r.items.slice(0, 10), { valueKey: 'earnings', format: vnd, sub: x => `${num(x.delivered)} chuyến · ${Math.round(x.avgMinutes)} phút TB` })}</div>
          <div class="card"><h4>Chuyến giao theo giờ</h4>${U.barChart(Array.from({ length: 24 }, (_, h) => ({ label: String(h), deliveries: r.hourly.find(x => x.hour === h)?.deliveries || 0 })), { valueKey: 'deliveries', format: num })}</div>
        </div>
        <div class="card"><h4>Hiệu suất từng tài xế</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    },

    async finance(body, ctx, state, reload) {
      const path = `${ctx.base}/finance?${qs(state)}`;
      const r = await fd().api(path);
      const sum = key => r.items.reduce((s, i) => s + i[key], 0);
      frame(body, state, path, reload, `
        <div class="stat-grid">
          ${U.statCard({ label: 'Doanh thu món đã quyết toán', value: vnd(sum('gross')), icon: '💰' })}
          ${U.statCard({ label: 'Hoa hồng', value: vnd(sum('commission')), icon: '🏦', tone: 'is-amber' })}
          ${U.statCard({ label: 'Hoàn tiền trừ vào kỳ', value: vnd(sum('refunds')), icon: '↩️', tone: 'is-amber' })}
          ${U.statCard({ label: 'Thực nhận', value: vnd(sum('net')), icon: '✅', tone: 'is-green' })}
          ${r.cod ? U.statCard({ label: 'COD tài xế đang giữ', value: vnd(r.cod.holding), hint: `${num(r.cod.pending)} khoản chưa đối soát`, icon: '💵', tone: 'is-blue' }) : ''}
        </div>
        ${r.refunds.length ? `<div class="grid-2"><div class="card"><h4>Hoàn tiền theo trạng thái</h4>${U.donut(r.refunds, { labelKey: 'status', valueKey: 'amount', center: 'Hoàn tiền', labelFn: statusLabel })}</div>
          <div class="card"><h4>Chi tiết hoàn tiền</h4>${U.table([{ h: 'Trạng thái', f: x => U.chip(x.status) }, { h: 'Số yêu cầu', num: true, f: x => num(x.count) }, { h: 'Số tiền', num: true, f: x => vnd(x.amount) }], r.refunds)}</div></div>` : ''}
        <div class="card"><h4>Quyết toán theo kỳ</h4><div id="anTable"></div></div>`);
      dataTable(body.querySelector('#anTable'), r.dataset, { limit: 20 });
    }
  };

  function mount(host, ctx) {
    const state = { tab: 'overview', preset: 29, from: daysAgo(29), to: today(), group: 'day' };
    const tabs = ctx.tabs;
    const body = () => host.querySelector('#anBody');
    const load = async () => {
      const target = body();
      target.innerHTML = loading;
      try {
        await TABS[state.tab](target, ctx, state, load);
      } catch (error) {
        target.innerHTML = `<div class="error-box">${esc(error.message)}</div>`;
      }
    };
    shell(host, { title: ctx.title, subtitle: ctx.subtitle, tabs, state, load });
    load();
  }

  const ADMIN_TABS = [['overview', 'Tổng quan & doanh thu'], ['restaurants', 'Nhà hàng'], ['items', 'Món & combo'], ['regions', 'Khu vực'], ['promotions', 'Khuyến mãi & điểm'], ['customers', 'Khách hàng'], ['shippers', 'Tài xế'], ['finance', 'Tài chính']];
  const RESTAURANT_TABS = [['overview', 'Doanh thu'], ['items', 'Món & combo'], ['promotions', 'Voucher'], ['customers', 'Khách hàng'], ['finance', 'Đối soát']];

  /* ---------- tài xế & khách: trang riêng gọn hơn ---------- */
  async function shipperPage(host) {
    const state = { preset: 29, from: daysAgo(29), to: today(), group: 'day' };
    const load = async () => {
      host.innerHTML = loading;
      try {
        const path = `/api/analytics/shipper/performance?${qs(state)}`;
        const r = await fd().api(path);
        const me = r.items[0] ?? { delivered: 0, deliveries: 0, earnings: 0, avgMinutes: 0, onTimeRate: 0, successRate: 0, avgEarning: 0, avgKm: 0 };
        host.innerHTML = `<div class="an-toolbar">${rangeBar(state)}${exportButtons()}</div>
          <div class="stat-grid">
            ${U.statCard({ label: 'Thu nhập', value: vnd(me.earnings), hint: `${vnd(me.avgEarning)}/chuyến`, icon: '💰', tone: 'is-green' })}
            ${U.statCard({ label: 'Chuyến thành công', value: num(me.delivered), hint: `${percent(me.successRate)} trên ${num(me.deliveries)} chuyến`, icon: '🛵' })}
            ${U.statCard({ label: 'Thời gian giao TB', value: `${Math.round(me.avgMinutes)} phút`, hint: `${percent(me.onTimeRate)} đúng giờ (≤45 phút từ lúc đặt)`, icon: '⏱️', tone: 'is-blue' })}
            ${U.statCard({ label: 'Quãng đường TB', value: `${(me.avgKm || 0).toFixed(1)} km`, icon: '📍', tone: 'is-amber' })}
          </div>
          <div class="card"><h4>Thu nhập theo ${state.group === 'day' ? 'ngày' : state.group === 'week' ? 'tuần' : 'tháng'}</h4>${lineChart(r.series, [{ key: 'earnings', label: 'Thu nhập', format: vnd }])}</div>
          <div class="grid-2"><div class="card"><h4>Số chuyến theo kỳ</h4>${U.barChart(r.series, { valueKey: 'delivered', format: num })}</div>
          <div class="card"><h4>Giờ nhận chuyến</h4>${U.barChart(Array.from({ length: 24 }, (_, h) => ({ label: String(h), deliveries: r.hourly.find(x => x.hour === h)?.deliveries || 0 })), { valueKey: 'deliveries', format: num })}</div></div>`;
        bindRange(host, state, load);
        host.querySelectorAll('[data-an-export]').forEach(button => button.addEventListener('click', () => download(path, button.dataset.anExport)));
      } catch (error) { host.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
    };
    load();
  }

  async function customerPage(host) {
    const state = { preset: 179, from: daysAgo(179), to: today(), group: 'month' };
    const load = async () => {
      host.innerHTML = loading;
      try {
        const path = `/api/analytics/customer/spending?${qs(state)}`;
        const r = await fd().api(path);
        host.innerHTML = `<div class="an-toolbar">${rangeBar(state)}${exportButtons()}</div>
          <div class="stat-grid">
            ${U.statCard({ label: 'Tổng chi tiêu', value: vnd(r.totals.spent), hint: `${num(r.totals.delivered)} đơn đã giao`, icon: '💳' })}
            ${U.statCard({ label: 'Đã tiết kiệm nhờ ưu đãi', value: vnd(r.totals.saved), icon: '🎟️', tone: 'is-green' })}
            ${U.statCard({ label: 'Giá trị TB/đơn', value: vnd(r.totals.avg), icon: '🧮', tone: 'is-blue' })}
            ${U.statCard({ label: 'Điểm đã tích / đã đổi', value: `${num(r.points.EARN || 0)} / ${num(-(r.points.REDEEM || 0))}`, icon: '⭐', tone: 'is-amber' })}
          </div>
          <div class="card"><h4>Chi tiêu theo kỳ</h4>${lineChart(r.series, [{ key: 'spent', label: 'Chi tiêu', format: vnd }, { key: 'saved', label: 'Tiết kiệm', format: vnd }])}</div>
          <div class="card"><h4>Quán đặt nhiều nhất</h4>${U.hbars(r.restaurants, { valueKey: 'spent', format: vnd, sub: x => `${num(x.orders)} đơn` })}</div>`;
        bindRange(host, state, load);
        host.querySelectorAll('[data-an-export]').forEach(button => button.addEventListener('click', () => download(path, button.dataset.anExport)));
      } catch (error) { host.innerHTML = `<div class="error-box">${esc(error.message)}</div>`; }
    };
    load();
  }

  window.FDAN = {
    download,
    admin: host => mount(host, { base: '/api/analytics/admin', admin: true, tabs: ADMIN_TABS, title: 'Báo cáo & phân tích', subtitle: 'Số liệu tính trực tiếp từ cơ sở dữ liệu; mọi bảng có thể xuất Excel, PDF hoặc CSV.' }),
    restaurant: (host, restaurantId) => mount(host, { base: `/api/analytics/restaurant/${restaurantId}`, admin: false, tabs: RESTAURANT_TABS, title: 'Báo cáo kinh doanh của quán', subtitle: 'Doanh thu, món/combo, voucher, khách hàng và đối soát; xuất Excel, PDF hoặc CSV.' }),
    shipper: shipperPage,
    customer: customerPage
  };
}());
