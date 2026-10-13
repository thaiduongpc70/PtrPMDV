/* Shared UI helpers for management consoles (admin / restaurant). */
(function () {
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);
  const nf = new Intl.NumberFormat('vi-VN');

  const num = value => nf.format(Number(value) || 0);
  const vnd = value => `${nf.format(Math.round(Number(value) || 0))}đ`;
  const compact = value => {
    const n = Number(value) || 0;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)} tr`;
    if (n >= 1e3) return `${Math.round(n / 1e3)}k`;
    return String(n);
  };
  const dt = value => (value ? new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const day = value => (value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—');
  const dayFull = value => (value ? new Date(value).toLocaleDateString('vi-VN') : '—');
  const localDate = value => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /* ---------- status chips ---------- */
  const LABELS = {
    order: {
      PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', READY_FOR_PICKUP: 'Sẵn sàng lấy hàng',
      SHIPPER_ASSIGNED: 'Đã có tài xế', PICKED_UP: 'Đã lấy hàng', DELIVERING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy', FAILED: 'Thất bại'
    },
    payment: {
      PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thất bại', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền',
      PARTIALLY_REFUNDED: 'Hoàn một phần', PROCESSING: 'Đang xử lý', COLLECTED: 'Đã thu', SETTLED: 'Đã đối soát'
    },
    generic: {
      ACTIVE: 'Hoạt động', INACTIVE: 'Tạm ngưng', SUSPENDED: 'Bị khóa', LOCKED: 'Bị khóa', PENDING: 'Chờ duyệt', OPEN: 'Mới', IN_PROGRESS: 'Đang xử lý',
      RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng', AVAILABLE: 'Sẵn sàng', BUSY: 'Đang bận', OFFLINE: 'Ngoại tuyến', COMPLETED: 'Hoàn tất',
      PROCESSING: 'Đang xử lý', SETTLED: 'Đã chi trả', FAILED: 'Thất bại', REJECTED: 'Từ chối', EXPIRED: 'Hết hạn', LOW: 'Thấp', MEDIUM: 'Trung bình',
      HIGH: 'Cao', URGENT: 'Khẩn cấp', PENDING_PAYOUT: 'Chờ chi'
    }
  };
  const TONES = {
    DELIVERED: 'ok', PAID: 'ok', ACTIVE: 'ok', COMPLETED: 'ok', SETTLED: 'ok', RESOLVED: 'ok', AVAILABLE: 'ok', COLLECTED: 'info',
    PENDING: 'warn', OPEN: 'warn', BUSY: 'warn', PROCESSING: 'info', IN_PROGRESS: 'info', CONFIRMED: 'info', PREPARING: 'info', READY_FOR_PICKUP: 'info',
    SHIPPER_ASSIGNED: 'info', PICKED_UP: 'info', DELIVERING: 'info', HIGH: 'warn', URGENT: 'danger', MEDIUM: 'info',
    CANCELLED: 'danger', FAILED: 'danger', SUSPENDED: 'danger', LOCKED: 'danger', REJECTED: 'danger',
    INACTIVE: 'muted', CLOSED: 'muted', OFFLINE: 'muted', EXPIRED: 'muted', REFUNDED: 'muted', LOW: 'muted'
  };
  function chip(status, kind = 'generic') {
    const label = (LABELS[kind] && LABELS[kind][status]) || LABELS.generic[status] || fd().statusLabel(status) || status || '—';
    const tone = { ok: '', warn: ' is-warn', danger: ' is-danger', info: ' is-info', muted: ' is-muted' }[TONES[status] || 'muted'] ?? '';
    return `<span class="status-chip${tone}">${esc(label)}</span>`;
  }

  /* ---------- building blocks ---------- */
  function statCard({ label, value, hint = '', icon = '📈', tone = '' }) {
    return `<article class="stat-card ${tone}"><span class="stat-icon">${icon}</span><span>${esc(label)}</span><strong>${value}</strong><small>${hint}</small></article>`;
  }

  function table(columns, rows, emptyText = 'Không có dữ liệu phù hợp.') {
    const head = columns.map(col => `<th class="${col.num ? 'num' : ''}">${col.h}</th>`).join('');
    const body = rows.length
      ? rows.map(row => `<tr>${columns.map(col => `<td class="${col.num ? 'num' : ''}">${col.f(row)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${columns.length}"><div class="empty-state">${esc(emptyText)}</div></td></tr>`;
    return `<div class="table-shell"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function cell(main, sub = '') {
    return `<div class="cell-main"><strong>${main}</strong>${sub ? `<small>${sub}</small>` : ''}</div>`;
  }

  function pager({ page, pageSize, totalItems }) {
    const pages = Math.max(1, Math.ceil(totalItems / pageSize));
    return `<div class="pager"><span>${num(totalItems)} bản ghi · Trang ${page}/${pages}</span>
      <div class="button-row">
        <button class="secondary-button compact-button" type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹ Trước</button>
        <button class="secondary-button compact-button" type="button" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Sau ›</button>
      </div></div>`;
  }

  function barChart(points, { valueKey, labelKey = 'label', format = compact }) {
    const max = Math.max(1, ...points.map(p => p[valueKey]));
    return `<div class="bar-chart">${points.map(p => `
      <div class="bar-col" title="${esc(p[labelKey])}: ${esc(format(p[valueKey]))}">
        <span class="bar-val">${p[valueKey] ? esc(format(p[valueKey])) : ''}</span>
        <div class="bar" style="height:${Math.max(2, (p[valueKey] / max) * 150)}px"></div>
        <label>${esc(p[labelKey])}</label>
      </div>`).join('')}</div>`;
  }

  function hbars(rows, { valueKey, labelKey = 'name', sub, format = num, tone = '' }) {
    const max = Math.max(1, ...rows.map(r => r[valueKey]));
    if (!rows.length) return '<div class="empty-state">Chưa có dữ liệu.</div>';
    return `<div class="hbar-list">${rows.map(r => `
      <div class="hbar-row">
        <div><span>${esc(r[labelKey])}</span><b>${esc(format(r[valueKey]))}</b></div>
        <div class="hbar-track"><div class="hbar-fill ${tone}" style="width:${Math.max(3, (r[valueKey] / max) * 100)}%"></div></div>
        ${sub ? `<small class="muted">${sub(r)}</small>` : ''}
      </div>`).join('')}</div>`;
  }

  const PALETTE = ['#ee4d2d', '#2563eb', '#12a05c', '#f59e0b', '#8b5cf6', '#6b7280', '#0ea5e9'];
  function donut(rows, { labelKey, valueKey, center, labelFn }) {
    const total = rows.reduce((sum, r) => sum + r[valueKey], 0);
    if (!total) return '<div class="empty-state">Chưa có dữ liệu.</div>';
    let acc = 0;
    const stops = rows.map((r, i) => {
      const from = (acc / total) * 100;
      acc += r[valueKey];
      return `${PALETTE[i % PALETTE.length]} ${from}% ${(acc / total) * 100}%`;
    }).join(', ');
    return `<div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})" data-center="${esc(center ?? num(total))}"></div>
      <div class="legend">${rows.map((r, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(labelFn ? labelFn(r[labelKey]) : r[labelKey])} · <b>${num(r[valueKey])}</b></span>`).join('')}</div>
    </div>`;
  }

  /* fill missing days so charts keep a continuous time axis */
  function fillDays(rows, count, valueKeys) {
    const byDate = new Map(rows.map(r => [localDate(r.date), r]));
    const out = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = localDate(d);
      const hit = byDate.get(key);
      const entry = { date: key, label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` };
      valueKeys.forEach(k => { entry[k] = hit ? Number(hit[k]) || 0 : 0; });
      out.push(entry);
    }
    return out;
  }

  /* ---------- modal ---------- */
  function modal(title, body, { wide = false } = {}) {
    document.getElementById('fdDialog')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.id = 'fdDialog';
    wrap.innerHTML = `
      <section class="m-dialog ${wide ? 'is-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header><h3>${esc(title)}</h3><button type="button" class="modal-close" data-close aria-label="Đóng">×</button></header>
        <div class="m-body">${body}</div>
      </section>`;
    document.body.appendChild(wrap);
    document.body.classList.add('modal-open');
    const close = () => { wrap.remove(); document.body.classList.remove('modal-open'); };
    wrap.addEventListener('click', event => { if (event.target === wrap || event.target.closest('[data-close]')) close(); });
    return { el: wrap, body: wrap.querySelector('.m-body'), close };
  }

  function confirmBox(message, okLabel = 'Xác nhận') {
    return new Promise(resolve => {
      const m = modal('Xác nhận', `<p>${esc(message)}</p><div class="button-row m-actions"><button class="secondary-button" data-close>Hủy</button><button class="primary-button" data-ok>${esc(okLabel)}</button></div>`);
      m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); resolve(true); });
      m.el.addEventListener('click', event => { if (event.target === m.el || event.target.closest('[data-close]')) resolve(false); });
    });
  }

  /* run an async action with toast feedback */
  async function act(promiseFactory, successMessage) {
    try {
      const result = await promiseFactory();
      if (successMessage) fd().toast(successMessage);
      return result;
    } catch (error) {
      fd().toast(error.message, true);
      return null;
    }
  }

  const loading = '<div class="empty-state">Đang tải dữ liệu…</div>';
  const kv = pairs => `<dl class="kv">${pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;

  window.FDUI = { esc, num, vnd, compact, dt, day, dayFull, localDate, chip, statCard, table, cell, pager, barChart, hbars, donut, fillDays, modal, confirmBox, act, loading, kv };
}());
