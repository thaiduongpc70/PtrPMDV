/* Live layer: bản đồ mock, theo dõi đơn, chat, thanh toán giả lập, hoá đơn, điều phối shipper.
   Định vị/bản đồ là mock (SVG), mọi dữ liệu còn lại đi qua API thật qua window.FD. */
(function () {
  const BOUNDS = { minLat: 10.74, maxLat: 10.81, minLng: 106.65, maxLng: 106.73 };
  const W = 640;
  const H = 400;
  const $ = selector => document.querySelector(selector);
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);

  /* ---------- toạ độ mock ---------- */
  function inBounds(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
  }

  function hash(text) {
    let h = 2166136261;
    for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967295;
  }

  function fallbackPoint(seed) {
    return {
      lat: BOUNDS.minLat + (BOUNDS.maxLat - BOUNDS.minLat) * (0.14 + 0.72 * hash(`${seed}:a`)),
      lng: BOUNDS.minLng + (BOUNDS.maxLng - BOUNDS.minLng) * (0.12 + 0.76 * hash(`${seed}:b`))
    };
  }

  function pointOf(lat, lng, seed) {
    const la = Number(lat);
    const ln = Number(lng);
    return inBounds(la, ln) ? { lat: la, lng: ln } : fallbackPoint(seed);
  }

  function toXY(point) {
    return {
      x: ((point.lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
      y: ((BOUNDS.maxLat - point.lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H
    };
  }

  function toLatLng(x, y) {
    return {
      lat: BOUNDS.maxLat - (y / H) * (BOUNDS.maxLat - BOUNDS.minLat),
      lng: BOUNDS.minLng + (x / W) * (BOUNDS.maxLng - BOUNDS.minLng)
    };
  }

  // Đường đi kiểu phố vuông: ngang rồi dọc.
  function routePath(a, b) {
    const pa = toXY(a);
    const pb = toXY(b);
    return [pa, { x: pb.x, y: pa.y }, pb];
  }

  function pathLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return total;
  }

  function pointAlong(points, t) {
    const target = pathLength(points) * Math.max(0, Math.min(1, t));
    let walked = 0;
    for (let i = 1; i < points.length; i += 1) {
      const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (walked + seg >= target && seg > 0) {
        const k = (target - walked) / seg;
        return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * k, y: points[i - 1].y + (points[i].y - points[i - 1].y) * k };
      }
      walked += seg;
    }
    return points[points.length - 1];
  }

  function haversineKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  /* ---------- bản đồ SVG mock ---------- */
  const ICONS = { restaurant: '🍜', customer: '🏠', shipper: '🛵' };

  class MockMap {
    constructor(container, { onPick } = {}) {
      this.container = container;
      this.markers = new Map();
      container.classList.add('fd-map');
      container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Bản đồ giả lập khu vực TP.HCM">
          <rect width="${W}" height="${H}" fill="#eef3ec"/>
          <path d="M0 330 C120 300 200 360 330 320 S560 250 640 280 L640 400 L0 400Z" fill="#cfe5f3"/>
          <rect x="40" y="40" width="90" height="60" rx="8" fill="#d6ead0"/>
          <rect x="470" y="70" width="110" height="70" rx="8" fill="#d6ead0"/>
          ${[80, 160, 240, 320, 400, 480, 560].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#fff" stroke-width="9"/>`).join('')}
          ${[60, 130, 200, 270].map(y => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#fff" stroke-width="9"/>`).join('')}
          <line x1="0" y1="0" x2="${W}" y2="${H * 0.7}" stroke="#f6e2b3" stroke-width="7" opacity=".8"/>
          <text x="22" y="372" class="fd-map-label">Sông Sài Gòn</text>
          <text x="250" y="30" class="fd-map-label">Quận 1</text>
          <text x="500" y="200" class="fd-map-label">Quận 3</text>
          <g class="fd-routes"></g>
          <g class="fd-markers"></g>
        </svg>
        <span class="fd-map-badge">Bản đồ giả lập</span>`;
      this.svg = container.querySelector('svg');
      this.routes = container.querySelector('.fd-routes');
      this.layer = container.querySelector('.fd-markers');
      if (onPick) {
        this.svg.classList.add('is-pickable');
        this.svg.addEventListener('click', event => {
          const box = this.svg.getBoundingClientRect();
          onPick(toLatLng(((event.clientX - box.left) / box.width) * W, ((event.clientY - box.top) / box.height) * H));
        });
      }
    }

    setRoutes(routes) {
      this.routes.innerHTML = routes.map(route => `
        <polyline points="${route.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"
          fill="none" stroke="${route.color || '#0f766e'}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"
          ${route.dashed ? 'stroke-dasharray="2 9"' : ''} opacity=".85"/>`).join('');
    }

    setMarker(key, { point, kind, title }) {
      let node = this.markers.get(key);
      if (!point) {
        node?.remove();
        this.markers.delete(key);
        return;
      }
      if (!node) {
        node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        node.classList.add('fd-marker', `fd-marker-${kind}`);
        node.innerHTML = `<title></title><circle r="15"/><text text-anchor="middle" dy="5">${ICONS[kind] || '📍'}</text>`;
        this.layer.appendChild(node);
        this.markers.set(key, node);
      }
      const xy = point.x === undefined ? toXY(point) : point;
      node.style.transform = `translate(${xy.x.toFixed(1)}px, ${xy.y.toFixed(1)}px)`;
      node.querySelector('title').textContent = title || '';
    }

    prune(keys) {
      for (const [key, node] of this.markers) {
        if (!keys.has(key)) {
          node.remove();
          this.markers.delete(key);
        }
      }
    }

    alive() {
      return document.body.contains(this.container);
    }
  }

  /* ---------- trạng thái & ETA ---------- */
  const ORDER_STEPS = [
    ['PENDING', 'Chờ xác nhận'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['PREPARING', 'Đang chuẩn bị'],
    ['READY_FOR_PICKUP', 'Sẵn sàng'],
    ['SHIPPER_ASSIGNED', 'Có tài xế'],
    ['PICKED_UP', 'Đã lấy hàng'],
    ['DELIVERING', 'Đang giao'],
    ['DELIVERED', 'Đã giao']
  ];

  function stepper(status) {
    if (status === 'CANCELLED') return '<div class="fd-steps"><span class="is-cancelled">Đơn đã hủy</span></div>';
    const current = ORDER_STEPS.findIndex(step => step[0] === status);
    return `<div class="fd-steps">${ORDER_STEPS.map(([, label], index) => `
      <span class="${index < current ? 'is-done' : index === current ? 'is-current' : ''}">${label}</span>`).join('')}</div>`;
  }

  function eta(shipperPoint, target) {
    const km = haversineKm(shipperPoint, target) * 1.35;
    return Math.max(1, Math.round((km / 24) * 60 + 2));
  }

  /* ---------- theo dõi đơn (khách / nhà hàng) ---------- */
  let trackTimer = null;

  function stopTracking() {
    if (trackTimer) clearInterval(trackTimer);
    trackTimer = null;
  }

  function trackingMarkup(title = 'Theo dõi đơn hàng') {
    return `
      <section class="fd-block">
        <div class="fd-block-head"><strong>${title}</strong><span class="status-chip" data-fd="live-chip">Đang tải…</span></div>
        <div data-fd="steps"></div>
        <div class="fd-map-wrap" data-fd="map"></div>
        <p class="muted" data-fd="eta"></p>
      </section>`;
  }

  async function startTracking(root, order, { role }) {
    stopTracking();
    const map = new MockMap(root.querySelector('[data-fd="map"]'));
    const etaEl = root.querySelector('[data-fd="eta"]');
    const chip = root.querySelector('[data-fd="live-chip"]');
    const stepsEl = root.querySelector('[data-fd="steps"]');
    const restaurantPoint = pointOf(order.pickupLatitude, order.pickupLongitude, `r${order.id}`);
    const homePoint = pointOf(order.deliveryLatitude, order.deliveryLongitude, `o${order.id}`);
    const t0 = Date.now();

    const tick = async () => {
      if (!map.alive()) { stopTracking(); return; }
      let status = order.status;
      let delivery = null;
      let latest = null;
      try {
        const base = role === 'CUSTOMER' ? await fd().api(`/api/customer/orders/${order.id}`) : await fd().api(`/api/restaurant/orders/${order.id}`);
        status = base.status;
      } catch { /* giữ trạng thái cũ */ }
      try {
        delivery = await fd().api(`/api/deliveries/order/${order.id}`);
        if (delivery) {
          const locations = await fd().api(`/api/deliveries/${delivery.id}/locations`);
          latest = locations.items?.[0] || null;
        }
      } catch { /* chưa có chuyến giao */ }

      if (delivery) {
        status = ['DELIVERED', 'CANCELLED'].includes(status) ? status : (delivery.orderStatus || status);
      }
      stepsEl.innerHTML = stepper(status);

      const rp = pointOf(delivery?.pickupLatitude, delivery?.pickupLongitude, `r${order.id}`);
      const hp = pointOf(delivery?.deliveryLatitude, delivery?.deliveryLongitude, `o${order.id}`);
      map.setMarker('restaurant', { point: rp || restaurantPoint, kind: 'restaurant', title: order.restaurantName || 'Nhà hàng' });
      map.setMarker('customer', { point: hp || homePoint, kind: 'customer', title: 'Địa chỉ giao hàng' });

      const routes = [{ points: routePath(rp, hp), color: '#94a3b8', dashed: true }];
      let message = 'Đang chờ nhà hàng xử lý đơn.';
      chip.textContent = fd().statusLabel(status);

      if (delivery && delivery.shipperId) {
        const toRestaurant = ['ASSIGNED', 'ACCEPTED'].includes(delivery.status);
        const start = pointOf(null, null, `s${delivery.shipperId}`);
        let shipper;
        let source = 'GPS';
        if (latest && inBounds(latest.latitude, latest.longitude)) {
          shipper = { lat: latest.latitude, lng: latest.longitude };
        } else if (delivery.status === 'DELIVERED') {
          shipper = hp;
        } else {
          source = 'ước tính';
          const elapsed = (Date.now() - t0) / 1000;
          if (toRestaurant) shipper = pointToLatLng(pointAlong(routePath(start, rp), Math.min(0.85, elapsed / 90)));
          else shipper = pointToLatLng(pointAlong(routePath(rp, hp), Math.min(0.9, elapsed / 120)));
        }
        map.setMarker('shipper', { point: shipper, kind: 'shipper', title: delivery.shipperName || 'Tài xế' });
        routes.push({ points: routePath(shipper, toRestaurant ? rp : hp), color: '#0f766e' });
        if (delivery.status === 'DELIVERED') {
          message = `Đơn đã được ${esc(delivery.shipperName || 'tài xế')} giao thành công.`;
        } else {
          const minutes = eta(shipper, toRestaurant ? rp : hp);
          message = `${esc(delivery.shipperName || 'Tài xế')} ${toRestaurant ? 'đang đến nhà hàng lấy món' : 'đang giao đến bạn'} · còn khoảng ${minutes} phút · vị trí ${source}`;
        }
      } else {
        map.setMarker('shipper', { point: null });
        if (status === 'CANCELLED') message = 'Đơn đã bị hủy.';
        else if (['READY_FOR_PICKUP', 'SHIPPER_ASSIGNED'].includes(status)) message = 'Món đã sẵn sàng, đang chờ tài xế nhận đơn.';
      }
      map.setRoutes(routes);
      etaEl.innerHTML = message;
    };

    await tick();
    trackTimer = setInterval(tick, 4000);
  }

  function pointToLatLng(xy) {
    return toLatLng(xy.x, xy.y);
  }

  /* ---------- chat theo đơn ---------- */
  const chatTimers = new Map();

  function chatMarkup() {
    return `
      <section class="fd-block fd-chat" data-fd="chat">
        <div class="fd-block-head"><strong>Trao đổi trong đơn</strong><span class="muted">Khách · nhà hàng · tài xế</span></div>
        <div class="fd-chat-log" data-fd="chat-log"><p class="muted">Đang mở phiên chat…</p></div>
        <form class="fd-chat-form" data-fd="chat-form">
          <input name="message" maxlength="500" placeholder="Nhập tin nhắn…" autocomplete="off" required>
          <button class="primary-button compact-button" type="submit">Gửi</button>
        </form>
      </section>`;
  }

  async function mountChat(root, orderId) {
    const log = root.querySelector('[data-fd="chat-log"]');
    const form = root.querySelector('[data-fd="chat-form"]');
    const key = `${orderId}:${Math.random()}`;
    let sessionId;
    try {
      sessionId = (await fd().api('/api/communications/chat/sessions', { method: 'POST', body: JSON.stringify({ orderId }) })).id;
    } catch (error) {
      log.innerHTML = `<p class="muted">Không mở được chat: ${esc(error.message)}</p>`;
      form.hidden = true;
      return;
    }
    const me = fd().state.user?.id;
    const load = async () => {
      if (!document.body.contains(log)) { clearInterval(chatTimers.get(key)); chatTimers.delete(key); return; }
      try {
        const result = await fd().api(`/api/communications/chat/sessions/${sessionId}/messages`);
        const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
        log.innerHTML = result.items.length ? result.items.map(m => `
          <div class="fd-bubble ${m.senderId === me ? 'is-mine' : ''}">
            <small>${esc(m.username)} · ${new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
            <span>${esc(m.message)}</span>
          </div>`).join('') : '<p class="muted">Chưa có tin nhắn. Hãy gửi lời chào!</p>';
        if (atBottom) log.scrollTop = log.scrollHeight;
      } catch { /* bỏ qua lỗi tạm thời */ }
    };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const input = form.elements.message;
      const message = input.value.trim();
      if (!message) return;
      input.value = '';
      try {
        await fd().api(`/api/communications/chat/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
        await load();
        log.scrollTop = log.scrollHeight;
      } catch (error) {
        fd().setStatus(error.message, true);
      }
    });
    await load();
    log.scrollTop = log.scrollHeight;
    chatTimers.set(key, setInterval(load, 4000));
  }

  /* ---------- thanh toán giả lập & hoá đơn ---------- */
  function paymentMarkup(order) {
    const online = order.paymentMethod !== 'COD';
    const unpaid = online && ['PENDING', 'FAILED', 'PROCESSING'].includes(order.paymentStatus);
    if (!unpaid) {
      return `<section class="fd-block"><div class="fd-block-head"><strong>Thanh toán</strong>
        <span class="status-chip">${esc(fd().statusLabel(order.paymentStatus))}</span></div>
        <p class="muted">${online ? 'Đã thanh toán qua cổng giả lập.' : 'Thanh toán tiền mặt khi nhận hàng (COD).'}</p></section>`;
    }
    return `
      <section class="fd-block fd-gateway">
        <div class="fd-block-head"><strong>Cổng thanh toán (giả lập)</strong><span class="status-chip">Chờ thanh toán</span></div>
        <div class="fd-card-face"><small>${esc(order.paymentMethod)}</small><b>4111 1111 1111 1111</b><span>NGUYEN VAN A · 12/30</span></div>
        <p class="muted">Cần thanh toán ${fd().formatMoney(order.totalAmount)}. Đây là cổng mô phỏng, không trừ tiền thật.</p>
        <div class="button-row">
          <button class="primary-button" type="button" data-fd="pay-ok">Thanh toán thành công</button>
          <button class="secondary-button" type="button" data-fd="pay-fail">Giả lập thất bại</button>
        </div>
      </section>`;
  }

  async function mockPay(order, outcome) {
    try {
      await fd().api(`/api/payments/orders/${order.id}/mock-pay`, { method: 'POST', body: JSON.stringify({ outcome }) });
      fd().setStatus(outcome === 'PAID' ? 'Thanh toán thành công.' : 'Giao dịch thất bại, bạn có thể thử lại.', outcome !== 'PAID');
      await fd().viewCustomerOrder(order.id);
    } catch (error) {
      fd().setStatus(error.message, true);
    }
  }

  async function showInvoice(order) {
    try {
      await fd().api(`/api/payments/orders/${order.id}/invoice`, { method: 'POST', body: '{}' });
      const invoice = await fd().api(`/api/payments/invoices/${encodeURIComponent(order.orderCode)}`);
      document.getElementById('fdInvoiceModal')?.remove();
      const modal = document.createElement('div');
      modal.id = 'fdInvoiceModal';
      modal.className = 'fd-modal';
      modal.innerHTML = `
        <div class="fd-invoice" role="dialog" aria-modal="true" aria-label="Hóa đơn">
          <header>
            <div><h3>HÓA ĐƠN ĐIỆN TỬ</h3><small>Số: ${esc(invoice.invoiceNumber)} · ${new Date(invoice.issuedAt).toLocaleString('vi-VN')}</small></div>
            <b>Food Delivery</b>
          </header>
          <p><b>Khách hàng:</b> ${esc(invoice.customerName || order.receiverName)}<br><b>Nhà hàng:</b> ${esc(invoice.restaurantName)}<br><b>Mã đơn:</b> ${esc(order.orderCode)}</p>
          <table>
            <thead><tr><th>Món</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>${(order.items || []).map(i => `<tr><td>${esc(i.name)}${i.variantName ? ` (${esc(i.variantName)})` : ''}</td><td>${i.quantity}</td><td>${fd().formatMoney(i.totalPrice)}</td></tr>`).join('')}</tbody>
          </table>
          <dl>
            <dt>Tạm tính</dt><dd>${fd().formatMoney(invoice.subtotal)}</dd>
            <dt>Giảm giá</dt><dd>-${fd().formatMoney(invoice.discountAmount)}</dd>
            <dt>Phí giao hàng</dt><dd>${fd().formatMoney(invoice.deliveryFee)}</dd>
            <dt>Phí dịch vụ</dt><dd>${fd().formatMoney(invoice.serviceFee)}</dd>
            <dt>Thuế</dt><dd>${fd().formatMoney(invoice.taxAmount)}</dd>
            <dt class="total">Tổng cộng</dt><dd class="total">${fd().formatMoney(invoice.totalAmount)}</dd>
          </dl>
          <div class="button-row fd-no-print">
            <button class="primary-button" type="button" data-fd="print">In / Lưu PDF</button>
            <button class="secondary-button" type="button" data-fd="close">Đóng</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
      modal.querySelector('[data-fd="close"]').addEventListener('click', () => modal.remove());
      modal.querySelector('[data-fd="print"]').addEventListener('click', () => window.print());
    } catch (error) {
      fd().setStatus(error.message, true);
    }
  }

  /* ---------- hook: khách hàng xem đơn ---------- */
  function onCustomerOrder(order) {
    const card = $('#customerOrders .order-detail-card');
    if (!card) return;
    const root = document.createElement('div');
    root.className = 'fd-live';
    root.innerHTML = `
      ${paymentMarkup(order)}
      ${trackingMarkup()}
      <div class="button-row"><button class="secondary-button" type="button" data-fd="invoice">Xem hóa đơn</button></div>
      ${chatMarkup()}`;
    card.appendChild(root);
    root.querySelector('[data-fd="pay-ok"]')?.addEventListener('click', () => mockPay(order, 'PAID'));
    root.querySelector('[data-fd="pay-fail"]')?.addEventListener('click', () => mockPay(order, 'FAILED'));
    root.querySelector('[data-fd="invoice"]').addEventListener('click', () => showInvoice(order));
    startTracking(root, order, { role: 'CUSTOMER' });
    mountChat(root, order.id);
  }

  /* ---------- hook: nhà hàng xem đơn + điều phối ---------- */
  async function onRestaurantOrder(order) {
    const card = $('#restaurantOrderBoard .order-detail-card');
    if (!card) return;
    const root = document.createElement('div');
    root.className = 'fd-live';
    root.innerHTML = `<div data-fd="dispatch"></div>${trackingMarkup('Theo dõi giao hàng')}${chatMarkup()}`;
    card.appendChild(root);
    startTracking(root, order, { role: 'RESTAURANT' });
    mountChat(root, order.id);

    const box = root.querySelector('[data-fd="dispatch"]');
    let delivery = null;
    try { delivery = await fd().api(`/api/deliveries/order/${order.id}`); } catch { /* chưa có */ }
    if (delivery?.shipperId) {
      box.innerHTML = `<section class="fd-block"><strong>Tài xế phụ trách:</strong> ${esc(delivery.shipperName)} · ${esc(fd().statusLabel(delivery.status))}</section>`;
      return;
    }
    if (order.status !== 'READY_FOR_PICKUP') {
      box.innerHTML = '<section class="fd-block muted">Khi đơn ở trạng thái "Sẵn sàng lấy hàng" bạn có thể gán tài xế tại đây.</section>';
      return;
    }
    try {
      const { items } = await fd().api('/api/deliveries/available-shippers');
      box.innerHTML = `
        <section class="fd-block">
          <div class="fd-block-head"><strong>Điều phối tài xế</strong><span class="muted">${items.length} tài xế đang sẵn sàng</span></div>
          ${items.length ? `
            <form class="fd-dispatch" data-fd="dispatch-form">
              <select name="shipperId">${items.map(s => `<option value="${s.id}">${esc(s.fullName)} · ${esc(s.vehicleType || '')} ${esc(s.vehiclePlate || '')} · ★${s.rating.toFixed(1)}</option>`).join('')}</select>
              <button class="primary-button" type="submit">Gán tài xế</button>
            </form>` : '<p class="muted">Chưa có tài xế nào sẵn sàng. Thử lại sau ít phút.</p>'}
        </section>`;
      box.querySelector('[data-fd="dispatch-form"]')?.addEventListener('submit', async event => {
        event.preventDefault();
        try {
          await fd().api('/api/deliveries/assign', {
            method: 'POST',
            body: JSON.stringify({ orderId: order.id, shipperId: Number(event.target.shipperId.value), distanceKm: 3.2 })
          });
          fd().setStatus('Đã gửi đề nghị giao hàng cho tài xế.');
          fd().viewRestaurantOrder(order.id);
        } catch (error) {
          fd().setStatus(error.message, true);
        }
      });
    } catch (error) {
      box.innerHTML = `<section class="fd-block muted">${esc(error.message)}</section>`;
    }
  }

  /* ---------- hook: shipper ---------- */
  const sim = { timer: null, deliveryId: null, point: null };
  let shipperMap = null;

  function stopSim() {
    if (sim.timer) clearInterval(sim.timer);
    sim.timer = null;
    sim.deliveryId = null;
    sim.point = null;
  }

  async function onShipperDeliveries(items) {
    const list = $('#shipperDeliveries');
    if (!list) return;
    let host = $('#fdShipperLive');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fdShipperLive';
      list.before(host);
    }
    const active = items.find(i => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(i.status));

    // nút phụ trên từng thẻ chuyến giao
    list.querySelectorAll('[data-delivery-status$=":DELIVERED"]').forEach(button => {
      const row = button.parentElement;
      const id = Number(button.dataset.deliveryStatus.split(':')[0]);
      const item = items.find(i => i.id === id);
      if (!item || row.querySelector('[data-fd="chat-toggle"]')) return;
      const chat = document.createElement('button');
      chat.className = 'secondary-button';
      chat.type = 'button';
      chat.dataset.fd = 'chat-toggle';
      chat.textContent = 'Chat';
      let panel = null;
      chat.addEventListener('click', () => {
        if (panel) { panel.remove(); panel = null; return; }
        panel = document.createElement('div');
        panel.innerHTML = chatMarkup();
        row.closest('.order-card').appendChild(panel);
        mountChat(panel, item.orderId);
      });
      row.appendChild(chat);
      if (item.paymentMethod === 'COD' && item.status !== 'FAILED') {
        const cod = document.createElement('button');
        cod.className = 'secondary-button';
        cod.type = 'button';
        cod.textContent = `Đã thu COD ${fd().formatMoney(item.totalAmount)}`;
        cod.addEventListener('click', () => collectCod(item, cod));
        row.appendChild(cod);
      }
    });

    if (!active) {
      stopSim();
      host.innerHTML = '<section class="panel fd-block"><strong>Bản đồ chuyến giao</strong><p class="muted">Chưa có chuyến giao đang thực hiện. Nhận một đề nghị giao hàng để bắt đầu.</p></section>';
      shipperMap = null;
      return;
    }

    const rp = pointOf(active.pickupLatitude, active.pickupLongitude, `r${active.orderId}`);
    const hp = pointOf(active.deliveryLatitude, active.deliveryLongitude, `o${active.orderId}`);
    const toRestaurant = ['ASSIGNED', 'ACCEPTED'].includes(active.status);
    let profile = null;
    try { profile = await fd().api('/api/shippers/profile'); } catch { /* bỏ qua */ }
    const here = pointOf(profile?.currentLatitude, profile?.currentLongitude, `s${active.shipperId}`);

    host.innerHTML = `
      <section class="panel fd-block">
        <div class="fd-block-head"><strong>Chuyến ${esc(active.orderCode || active.id)}</strong><span class="status-chip">${esc(fd().statusLabel(active.status))}</span></div>
        <div class="fd-map-wrap" data-fd="map"></div>
        <p class="muted">${toRestaurant ? 'Đến nhà hàng lấy món' : 'Giao đến khách'} · ${esc(toRestaurant ? active.pickupAddress : active.deliveryAddress)}</p>
        <div class="button-row">
          <button class="primary-button" type="button" data-fd="sim">${sim.deliveryId === active.id ? 'Dừng giả lập GPS' : 'Chạy giả lập hành trình'}</button>
        </div>
        <p class="muted" data-fd="sim-note"></p>
      </section>`;
    shipperMap = new MockMap(host.querySelector('[data-fd="map"]'));
    shipperMap.setMarker('restaurant', { point: rp, kind: 'restaurant', title: active.restaurantName || 'Nhà hàng' });
    shipperMap.setMarker('customer', { point: hp, kind: 'customer', title: 'Khách hàng' });
    shipperMap.setMarker('shipper', { point: sim.point || here, kind: 'shipper', title: 'Bạn' });
    shipperMap.setRoutes([{ points: routePath(here, rp), color: '#0f766e' }, { points: routePath(rp, hp), color: '#94a3b8', dashed: true }]);
    host.querySelector('[data-fd="sim"]').addEventListener('click', () => (sim.deliveryId === active.id ? (stopSim(), onShipperDeliveries(items)) : startSim(active, here, rp, hp)));
  }

  async function collectCod(item, button) {
    try {
      const { items } = await fd().api('/api/payments/cod');
      const row = items.find(c => c.orderId === item.orderId);
      if (!row) throw new Error('Không tìm thấy giao dịch COD cho đơn này.');
      await fd().api(`/api/payments/cod/${row.id}/collect`, { method: 'POST', body: '{}' });
      button.disabled = true;
      button.textContent = 'Đã thu COD';
      fd().setStatus('Đã ghi nhận thu tiền COD.');
    } catch (error) {
      fd().setStatus(error.message, true);
    }
  }

  function startSim(delivery, here, rp, hp) {
    stopSim();
    sim.deliveryId = delivery.id;
    let phase = ['ASSIGNED', 'ACCEPTED'].includes(delivery.status) ? 0 : 1;
    let t = 0;
    const note = () => $('#fdShipperLive [data-fd="sim-note"]');
    const button = $('#fdShipperLive [data-fd="sim"]');
    if (button) button.textContent = 'Dừng giả lập GPS';
    sim.timer = setInterval(async () => {
      if (!shipperMap?.alive()) { stopSim(); return; }
      const path = phase === 0 ? routePath(here, rp) : routePath(rp, hp);
      t = Math.min(1, t + 0.1);
      const xy = pointAlong(path, t);
      const position = toLatLng(xy.x, xy.y);
      sim.point = position;
      shipperMap.setMarker('shipper', { point: position, kind: 'shipper', title: 'Bạn' });
      try {
        await fd().api('/api/shippers/locations', {
          method: 'POST',
          body: JSON.stringify({ deliveryId: delivery.id, latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)), speed: 24 })
        });
      } catch { /* mất mạng tạm thời */ }
      if (note()) note().textContent = `${phase === 0 ? 'Đang đến nhà hàng' : 'Đang đến khách'} · ${Math.round(t * 100)}%`;
      if (t >= 1) {
        clearInterval(sim.timer);
        sim.timer = null;
        if (phase === 0) {
          try {
            await fd().api(`/api/shippers/deliveries/${delivery.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'PICKED_UP', note: 'Giả lập: đã lấy hàng' }) });
            await fd().api(`/api/shippers/deliveries/${delivery.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'DELIVERING', note: 'Giả lập: bắt đầu giao' }) });
          } catch (error) { fd().setStatus(error.message, true); }
          phase = 1;
          t = 0;
          sim.deliveryId = null;
          await fd().loadShipperDashboard();
          startSim({ ...delivery, status: 'DELIVERING' }, rp, rp, hp);
        } else {
          sim.deliveryId = null;
          if (note()) note().textContent = 'Đã đến nơi. Bấm "Đã giao" để hoàn tất chuyến.';
          fd().setStatus('Đã đến địa chỉ khách. Hãy xác nhận "Đã giao".');
        }
      }
    }, 1500);
  }

  // Chọn vị trí tài xế bằng bản đồ mock
  function mountLocationPicker() {
    const form = $('#shipperLocationForm');
    if (!form || $('#fdLocationPicker')) return;
    const host = document.createElement('div');
    host.id = 'fdLocationPicker';
    host.innerHTML = '<p class="muted">Hoặc chạm vào bản đồ để đặt vị trí hiện tại (mock).</p><div class="fd-map-wrap" data-fd="map"></div>';
    form.after(host);
    const picker = new MockMap(host.querySelector('[data-fd="map"]'), {
      onPick: point => {
        $('#shipperLatitude').value = point.lat.toFixed(6);
        $('#shipperLongitude').value = point.lng.toFixed(6);
        picker.setMarker('shipper', { point, kind: 'shipper', title: 'Vị trí của bạn' });
      }
    });
  }

  /* ---------- bản đồ vận hành admin ---------- */
  function renderAdminMap(container) {
    container.innerHTML = `
      <div class="fd-admin-map">
        <div class="fd-map-wrap" data-fd="map"></div>
        <div class="card-list" data-fd="list"></div>
      </div>`;
    const map = new MockMap(container.querySelector('[data-fd="map"]'));
    const list = container.querySelector('[data-fd="list"]');
    let timer = null;
    const refresh = async () => {
      if (!map.alive() || !container.closest('.is-subview-active')) { clearInterval(timer); return; }
      try {
        const { items } = await fd().api('/api/deliveries/active');
        const keys = new Set();
        const routes = [];
        items.forEach(d => {
          const rp = pointOf(d.pickupLatitude, d.pickupLongitude, `r${d.orderId}`);
          const hp = pointOf(d.deliveryLatitude, d.deliveryLongitude, `o${d.orderId}`);
          const sp = pointOf(d.shipperLatitude, d.shipperLongitude, `s${d.shipperId}`);
          map.setMarker(`r${d.id}`, { point: rp, kind: 'restaurant', title: `${d.restaurantName} (${d.orderCode})` });
          map.setMarker(`c${d.id}`, { point: hp, kind: 'customer', title: `Khách ${d.orderCode}` });
          map.setMarker(`s${d.id}`, { point: sp, kind: 'shipper', title: `${d.shipperName || 'Tài xế'} · ${d.orderCode}` });
          keys.add(`r${d.id}`).add(`c${d.id}`).add(`s${d.id}`);
          routes.push({ points: routePath(sp, ['ASSIGNED', 'ACCEPTED'].includes(d.status) ? rp : hp), color: '#ee4d2d' });
        });
        map.prune(keys);
        map.setRoutes(routes);
        list.innerHTML = items.length ? items.map(d => `
          <article class="order-card">
            <strong>${esc(d.orderCode)} · ${esc(fd().statusLabel(d.status))}</strong>
            <span>${esc(d.restaurantName)} → ${esc(d.deliveryAddress)}</span>
            <span>Tài xế: ${esc(d.shipperName || 'chưa có')} · ${fd().formatMoney(d.totalAmount)}</span>
          </article>`).join('') : '<div class="empty-state">Hiện không có chuyến giao nào đang chạy.</div>';
      } catch (error) {
        list.innerHTML = `<div class="error-box">${esc(error.message)}</div>`;
      }
    };
    refresh();
    timer = setInterval(refresh, 5000);
    return { refresh, stop: () => clearInterval(timer) };
  }

  window.FDLive = {
    onCustomerOrder,
    onRestaurantOrder,
    onShipperDeliveries,
    mountLocationPicker,
    renderAdminMap,
    stopAll() { stopTracking(); stopSim(); }
  };
}());
