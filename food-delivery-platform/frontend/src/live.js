/* Live layer: bản đồ thật (Leaflet + OpenStreetMap) với toạ độ lưu trong DB, theo dõi đơn, chat, thanh toán, hoá đơn, điều phối shipper.
   Mọi dữ liệu đi qua API thật qua window.FD; vị trí tài xế là GPS thật của thiết bị. */
(function () {
  const HCM_CENTER = [10.7769, 106.7009];
  const $ = selector => document.querySelector(selector);
  const fd = () => window.FD;
  const esc = value => fd().escapeHtml(value);

  /* ---------- toạ độ: chỉ dùng toạ độ thật lưu trong DB, không có toạ độ bịa ---------- */
  function pointOf(lat, lng) {
    const la = Number(lat);
    const ln = Number(lng);
    return lat !== null && lat !== undefined && lng !== null && lng !== undefined && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? { lat: la, lng: ln } : null;
  }

  function haversineKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  /* ---------- bản đồ thật: Leaflet + OpenStreetMap ---------- */
  const ICONS = { restaurant: '🍜', customer: '🏠', shipper: '🛵' };

  class RealMap {
    constructor(container, { onPick } = {}) {
      this.container = container;
      this.markers = new Map();
      this.routeLayer = null;
      this.fitted = false;
      container.classList.add('fd-map');
      this.map = window.L.map(container, { zoomControl: true, attributionControl: true }).setView(HCM_CENTER, 12);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
      if (onPick) {
        container.classList.add('is-pickable');
        this.map.on('click', event => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }));
      }
      // Bản đồ nằm trong panel có thể đang ẩn lúc tạo: tính lại kích thước khi hiện
      setTimeout(() => this.map.invalidateSize(), 120);
    }

    setRoutes(routes) {
      this.routeLayer?.remove();
      this.routeLayer = window.L.layerGroup(routes.filter(route => route.points.length > 1).map(route => window.L.polyline(route.points.map(p => [p.lat, p.lng]), {
        color: route.color || '#0f766e', weight: 4, opacity: 0.85, dashArray: route.dashed ? '2 9' : null, lineCap: 'round'
      }))).addTo(this.map);
    }

    setMarker(key, { point, kind, title }) {
      const current = this.markers.get(key);
      if (!point) { current?.remove(); this.markers.delete(key); return; }
      if (current) {
        current.setLatLng([point.lat, point.lng]);
        current.getElement()?.setAttribute('title', title || '');
        return;
      }
      const icon = window.L.divIcon({ className: '', html: `<div class="fd-pin fd-pin-${kind}" title="${esc(title || '')}">${ICONS[kind] || '📍'}</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      const marker = window.L.marker([point.lat, point.lng], { icon, title: title || '' }).addTo(this.map);
      this.markers.set(key, marker);
    }

    /** Thu phóng vừa khít các điểm đang có (chỉ khi tập điểm thay đổi, không giật bản đồ mỗi lần tài xế di chuyển). */
    fit() {
      const points = [...this.markers.values()].map(marker => marker.getLatLng());
      if (!points.length) return;
      const signature = points.length;
      if (this.fitted === signature) return;
      this.fitted = signature;
      this.map.fitBounds(window.L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
    }

    prune(keys) {
      for (const [key, marker] of this.markers) {
        if (!keys.has(key)) { marker.remove(); this.markers.delete(key); }
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
    const map = new RealMap(root.querySelector('[data-fd="map"]'));
    const etaEl = root.querySelector('[data-fd="eta"]');
    const chip = root.querySelector('[data-fd="live-chip"]');
    const stepsEl = root.querySelector('[data-fd="steps"]');
    const restaurantPoint = pointOf(order.pickupLatitude, order.pickupLongitude);
    const homePoint = pointOf(order.deliveryLatitude, order.deliveryLongitude);

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

      const rp = pointOf(delivery?.pickupLatitude, delivery?.pickupLongitude) || restaurantPoint;
      const hp = pointOf(delivery?.deliveryLatitude, delivery?.deliveryLongitude) || homePoint;
      map.setMarker('restaurant', { point: rp, kind: 'restaurant', title: order.restaurantName || 'Nhà hàng' });
      map.setMarker('customer', { point: hp, kind: 'customer', title: 'Địa chỉ giao hàng' });

      const routes = rp && hp ? [{ points: [rp, hp], color: '#94a3b8', dashed: true }] : [];
      let message = 'Đang chờ nhà hàng xử lý đơn.';
      chip.textContent = fd().statusLabel(status);

      if (delivery && delivery.shipperId) {
        const toRestaurant = ['ASSIGNED', 'ACCEPTED'].includes(delivery.status);
        const shipper = latest ? pointOf(latest.latitude, latest.longitude) : null;
        map.setMarker('shipper', { point: shipper, kind: 'shipper', title: delivery.shipperName || 'Tài xế' });
        const target = toRestaurant ? rp : hp;
        if (delivery.status === 'DELIVERED') {
          message = `Đơn đã được ${esc(delivery.shipperName || 'tài xế')} giao thành công.`;
        } else if (shipper && target) {
          routes.push({ points: [shipper, target], color: '#0f766e' });
          message = `${esc(delivery.shipperName || 'Tài xế')} ${toRestaurant ? 'đang đến nhà hàng lấy món' : 'đang giao đến bạn'} · cách ${haversineKm(shipper, target).toFixed(1)} km, ước tính còn ${eta(shipper, target)} phút · vị trí GPS lúc ${new Date(latest.recordedAt).toLocaleTimeString('vi-VN')}`;
        } else {
          message = `${esc(delivery.shipperName || 'Tài xế')} đã nhận đơn nhưng chưa chia sẻ vị trí GPS.`;
        }
      } else {
        map.setMarker('shipper', { point: null });
        if (status === 'CANCELLED') message = 'Đơn đã bị hủy.';
        else if (['READY_FOR_PICKUP', 'SHIPPER_ASSIGNED'].includes(status)) message = 'Món đã sẵn sàng, đang chờ tài xế nhận đơn.';
      }
      map.fit();
      map.setRoutes(routes);
      etaEl.innerHTML = message;
    };

    await tick();
    trackTimer = setInterval(tick, 4000);
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

  /* ---------- thanh toán (sandbox, chưa nối cổng thật) & hoá đơn ---------- */
  function paymentMarkup(order) {
    const online = order.paymentMethod !== 'COD';
    const unpaid = online && ['PENDING', 'FAILED', 'PROCESSING'].includes(order.paymentStatus);
    if (!unpaid) {
      return `<section class="fd-block"><div class="fd-block-head"><strong>Thanh toán</strong>
        <span class="status-chip">${esc(fd().statusLabel(order.paymentStatus))}</span></div>
        <p class="muted">${online ? 'Đã thanh toán qua cổng thanh toán thử nghiệm.' : 'Thanh toán tiền mặt khi nhận hàng (COD).'}</p></section>`;
    }
    return `
      <section class="fd-block fd-gateway">
        <div class="fd-block-head"><strong>Cổng thanh toán thử nghiệm (sandbox)</strong><span class="status-chip">Chờ thanh toán</span></div>
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
  const gps = { watchId: null, deliveryId: null, point: null, lastSent: 0 };
  let shipperMap = null;

  function stopGps() {
    if (gps.watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gps.watchId);
    gps.watchId = null;
    gps.deliveryId = null;
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
      stopGps();
      host.innerHTML = '<section class="panel fd-block"><strong>Bản đồ chuyến giao</strong><p class="muted">Chưa có chuyến giao đang thực hiện. Nhận một đề nghị giao hàng để bắt đầu.</p></section>';
      shipperMap = null;
      return;
    }

    const rp = pointOf(active.pickupLatitude, active.pickupLongitude);
    const hp = pointOf(active.deliveryLatitude, active.deliveryLongitude);
    const toRestaurant = ['ASSIGNED', 'ACCEPTED'].includes(active.status);
    let profile = null;
    try { profile = await fd().api('/api/shippers/profile'); } catch { /* bỏ qua */ }
    const here = gps.point || pointOf(profile?.currentLatitude, profile?.currentLongitude);

    host.innerHTML = `
      <section class="panel fd-block">
        <div class="fd-block-head"><strong>Chuyến ${esc(active.orderCode || active.id)}</strong><span class="status-chip">${esc(fd().statusLabel(active.status))}</span></div>
        <div class="fd-map-wrap" data-fd="map"></div>
        <p class="muted">${toRestaurant ? 'Đến nhà hàng lấy món' : 'Giao đến khách'} · ${esc(toRestaurant ? active.pickupAddress : active.deliveryAddress)}</p>
        <div class="button-row">
          <button class="primary-button" type="button" data-fd="gps">${gps.deliveryId === active.id ? 'Dừng chia sẻ vị trí' : 'Chia sẻ vị trí GPS của tôi'}</button>
        </div>
        <p class="muted" data-fd="gps-note">${here ? `Vị trí gần nhất đã ghi nhận trong hệ thống.` : 'Chưa có vị trí. Bấm "Chia sẻ vị trí GPS" để khách thấy bạn trên bản đồ.'}</p>
      </section>`;
    shipperMap = new RealMap(host.querySelector('[data-fd="map"]'));
    shipperMap.setMarker('restaurant', { point: rp, kind: 'restaurant', title: active.restaurantName || 'Nhà hàng' });
    shipperMap.setMarker('customer', { point: hp, kind: 'customer', title: 'Khách hàng' });
    shipperMap.setMarker('shipper', { point: here, kind: 'shipper', title: 'Bạn' });
    shipperMap.setRoutes([...(here && (toRestaurant ? rp : hp) ? [{ points: [here, toRestaurant ? rp : hp], color: '#0f766e' }] : []), ...(rp && hp ? [{ points: [rp, hp], color: '#94a3b8', dashed: true }] : [])]);
    shipperMap.fit();
    host.querySelector('[data-fd="gps"]').addEventListener('click', () => (gps.deliveryId === active.id ? (stopGps(), onShipperDeliveries(items)) : startGps(active)));
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

  /* Chia sẻ GPS thật của thiết bị: mỗi khi trình duyệt báo vị trí mới (tối đa 1 lần/5 giây) gửi lên /api/shippers/locations */
  function startGps(delivery) {
    stopGps();
    const note = () => $('#fdShipperLive [data-fd="gps-note"]');
    if (!navigator.geolocation) { fd().setStatus('Thiết bị không hỗ trợ định vị GPS.', true); return; }
    gps.deliveryId = delivery.id;
    const button = $('#fdShipperLive [data-fd="gps"]');
    if (button) button.textContent = 'Dừng chia sẻ vị trí';
    gps.watchId = navigator.geolocation.watchPosition(async position => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      gps.point = point;
      shipperMap?.setMarker('shipper', { point, kind: 'shipper', title: 'Bạn' });
      shipperMap?.fit();
      if (Date.now() - gps.lastSent < 5000) return;
      gps.lastSent = Date.now();
      try {
        await fd().api('/api/shippers/locations', {
          method: 'POST',
          body: JSON.stringify({
            deliveryId: delivery.id, latitude: Number(point.lat.toFixed(6)), longitude: Number(point.lng.toFixed(6)),
            speed: position.coords.speed ? Number((position.coords.speed * 3.6).toFixed(1)) : 0, accuracy: position.coords.accuracy ? Number(position.coords.accuracy.toFixed(1)) : undefined,
            heading: position.coords.heading ?? undefined
          })
        });
        if (note()) note().textContent = `Đã gửi vị trí lúc ${new Date().toLocaleTimeString('vi-VN')} (sai số ${Math.round(position.coords.accuracy || 0)} m).`;
      } catch { /* mất mạng tạm thời */ }
    }, error => {
      if (note()) note().textContent = `Không lấy được GPS: ${error.message}`;
      stopGps();
    }, { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 });
  }

  // Chọn vị trí tài xế: chạm bản đồ hoặc lấy GPS thiết bị
  function mountLocationPicker() {
    const form = $('#shipperLocationForm');
    if (!form || $('#fdLocationPicker')) return;
    const host = document.createElement('div');
    host.id = 'fdLocationPicker';
    host.innerHTML = '<p class="muted">Chạm vào bản đồ để đặt vị trí, hoặc dùng GPS của thiết bị.</p><div class="button-row"><button class="secondary-button compact-button" type="button" data-fd="locate">🎯 Dùng vị trí GPS hiện tại</button></div><div class="fd-map-wrap" data-fd="map"></div>';
    form.after(host);
    const place = point => {
      $('#shipperLatitude').value = point.lat.toFixed(6);
      $('#shipperLongitude').value = point.lng.toFixed(6);
      picker.setMarker('shipper', { point, kind: 'shipper', title: 'Vị trí của bạn' });
    };
    const picker = new RealMap(host.querySelector('[data-fd="map"]'), { onPick: place });
    host.querySelector('[data-fd="locate"]').addEventListener('click', () => {
      navigator.geolocation?.getCurrentPosition(position => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; place(point); picker.map.setView([point.lat, point.lng], 15); }, error => fd().setStatus(`Không lấy được GPS: ${error.message}`, true), { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  /* ---------- bản đồ vận hành admin ---------- */
  function renderAdminMap(container) {
    container.innerHTML = `
      <div class="fd-admin-map">
        <div class="fd-map-wrap" data-fd="map"></div>
        <div class="card-list" data-fd="list"></div>
      </div>`;
    const map = new RealMap(container.querySelector('[data-fd="map"]'));
    const list = container.querySelector('[data-fd="list"]');
    let timer = null;
    const refresh = async () => {
      if (!map.alive() || !container.closest('.is-subview-active')) { clearInterval(timer); return; }
      try {
        const { items } = await fd().api('/api/deliveries/active');
        const keys = new Set();
        const routes = [];
        items.forEach(d => {
          const rp = pointOf(d.pickupLatitude, d.pickupLongitude);
          const hp = pointOf(d.deliveryLatitude, d.deliveryLongitude);
          const sp = pointOf(d.shipperLatitude, d.shipperLongitude);
          map.setMarker(`r${d.id}`, { point: rp, kind: 'restaurant', title: `${d.restaurantName} (${d.orderCode})` });
          map.setMarker(`c${d.id}`, { point: hp, kind: 'customer', title: `Khách ${d.orderCode}` });
          map.setMarker(`s${d.id}`, { point: sp, kind: 'shipper', title: `${d.shipperName || 'Tài xế'} · ${d.orderCode}` });
          keys.add(`r${d.id}`).add(`c${d.id}`).add(`s${d.id}`);
          const target = ['ASSIGNED', 'ACCEPTED'].includes(d.status) ? rp : hp;
          if (sp && target) routes.push({ points: [sp, target], color: '#ee4d2d' });
        });
        map.prune(keys);
        map.setRoutes(routes);
        map.fit();
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

  function createPicker(container, initial, onPick) {
    const map = new RealMap(container, {
      onPick: point => {
        map.setMarker('customer', { point, kind: 'customer', title: 'Vị trí đã chọn' });
        onPick(point);
      }
    });
    if (initial) map.setMarker('customer', { point: initial, kind: 'customer', title: 'Vị trí đã chọn' });
    return map;
  }

  window.FDLive = {
    createPicker,
    onCustomerOrder,
    onRestaurantOrder,
    onShipperDeliveries,
    mountLocationPicker,
    renderAdminMap,
    stopAll() { stopTracking(); stopGps(); }
  };
}());
