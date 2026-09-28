(function () {
  const apiBase = document.body.dataset.apiBase || window.location.origin;
  const money = new Intl.NumberFormat('vi-VN');

  const state = {
    user: null,
    permissions: [],
    token: localStorage.getItem('fd_access_token') || '',
    refreshToken: localStorage.getItem('fd_refresh_token') || '',
    restaurants: [],
    selectedRestaurant: null,
    selectedMenu: [],
    selectedMenuItem: null,
    addresses: [],
    cart: null,
    ownerRestaurants: [],
    ownerRestaurantId: null,
    apiLog: []
  };

  const $ = selector => document.querySelector(selector);

  function formatMoney(value) {
    return `${money.format(Number(value) || 0)} VND`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function roleOf(user) {
    const raw = typeof user?.role === 'string'
      ? user.role
      : user?.role?.name || user?.role?.code || '';
    return String(raw).toUpperCase();
  }

  function roleLabel(role) {
    return {
      ADMIN: 'Quản trị viên',
      RESTAURANT: 'Nhà hàng',
      SHIPPER: 'Tài xế',
      CUSTOMER: 'Khách hàng'
    }[String(role || '').toUpperCase()] || 'Người dùng';
  }

  function statusLabel(status) {
    return {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      PREPARING: 'Đang chuẩn bị',
      READY_FOR_PICKUP: 'Sẵn sàng lấy hàng',
      SHIPPER_ASSIGNED: 'Đã có tài xế',
      PICKED_UP: 'Đã lấy hàng',
      DELIVERING: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
      FAILED: 'Thất bại',
      OFFERED: 'Đang chờ phản hồi',
      ACCEPTED: 'Đã nhận',
      REJECTED: 'Đã từ chối',
      EXPIRED: 'Đã hết hạn',
      OFFLINE: 'Ngoại tuyến',
      AVAILABLE: 'Sẵn sàng',
      BUSY: 'Đang bận',
      SUSPENDED: 'Tạm khóa',
      ACTIVE: 'Đang hoạt động',
      INACTIVE: 'Ngừng hoạt động',
      LOCKED: 'Đã khóa',
      PAID: 'Đã thanh toán',
      PROCESSING: 'Đang xử lý',
      REFUNDED: 'Đã hoàn tiền'
    }[String(status || '').toUpperCase()] || status || 'Chưa rõ';
  }

  function activityLabel(action) {
    const normalized = String(action || '').toUpperCase();
    if (normalized.includes('ORDER')) return 'Cập nhật đơn hàng';
    if (normalized.includes('RESTAURANT')) return 'Cập nhật nhà hàng';
    if (normalized.includes('MENU')) return 'Cập nhật thực đơn';
    if (normalized.includes('DELIVERY')) return 'Cập nhật giao hàng';
    if (normalized.includes('PAYMENT') || normalized.includes('COD')) return 'Cập nhật thanh toán';
    if (normalized.includes('USER')) return 'Cập nhật tài khoản';
    if (normalized.includes('SUPPORT')) return 'Cập nhật hỗ trợ';
    if (normalized.includes('CHAT')) return 'Tin nhắn mới';
    return 'Hoạt động hệ thống';
  }

  function paymentLabel(method) {
    return {
      COD: 'Tiền mặt khi nhận hàng',
      BANK_TRANSFER: 'Chuyển khoản',
      MOMO: 'MoMo',
      VNPAY: 'VNPay',
      ZALOPAY: 'ZaloPay',
      CARD: 'Thẻ ngân hàng',
      WALLET: 'Ví cá nhân'
    }[String(method || '').toUpperCase()] || method || 'Chưa chọn';
  }

  function friendlyAction(method, path) {
    if (path.includes('/auth/login')) return 'Đăng nhập';
    if (path.includes('/auth/logout')) return 'Đăng xuất';
    if (path.includes('/accounts/session')) return 'Tải thông tin tài khoản';
    if (path.includes('/catalog/restaurants')) return 'Tải nhà hàng';
    if (path.includes('/catalog/menu-items')) return 'Tải món ăn';
    if (path.includes('/customer/cart')) return method === 'POST' ? 'Thêm vào giỏ hàng' : 'Tải giỏ hàng';
    if (path.includes('/customer/orders/checkout')) return 'Đặt hàng';
    if (path.includes('/customer/orders')) return 'Tải đơn hàng';
    if (path.includes('/restaurant/orders')) return 'Cập nhật đơn nhà hàng';
    if (path.includes('/shippers/assignments')) return 'Xử lý đề nghị giao hàng';
    if (path.includes('/shippers/deliveries')) return 'Cập nhật chuyến giao';
    if (path.includes('/shippers/earnings')) return 'Tải thu nhập tài xế';
    if (path.includes('/payments/wallet')) return 'Tải ví cá nhân';
    if (path.includes('/admin')) return 'Tải dữ liệu quản trị';
    return 'Đồng bộ dữ liệu';
  }

  function headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...extra
    };
  }

  async function api(path, options = {}) {
    const started = performance.now();
    const method = options.method || 'GET';
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: headers(options.headers || {})
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    logApi({ method, path, status: response.status, ms: Math.round(performance.now() - started), payload });
    if (!response.ok) {
      const message = payload?.message || payload?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function logApi(entry) {
    state.apiLog.unshift({
      time: new Date().toLocaleTimeString('vi-VN'),
      ...entry
    });
    state.apiLog = state.apiLog.slice(0, 80);
    renderApiLog();
  }

  function renderApiLog() {
    const node = $('#apiLog');
    if (!node) return;
    node.textContent = state.apiLog.length
      ? state.apiLog.map(item => {
        const result = item.status >= 200 && item.status < 300 ? 'Thành công' : 'Không thành công';
        return `[${item.time}] ${friendlyAction(item.method, item.path)} - ${result} (${item.ms}ms)`;
      }).join('\n\n')
      : 'Chưa có hoạt động.';
  }

  function setStatus(message, isError = false) {
    const node = $('#authStatus');
    node.textContent = message || '';
    node.style.color = isError ? 'var(--danger)' : 'var(--success)';
  }

  function empty() {
    return $('#emptyTemplate').content.firstElementChild.cloneNode(true).outerHTML;
  }

  function errorBox(error) {
    return `<div class="error-box">${escapeHtml(error.message || error)}</div>`;
  }

  function saveSession(result) {
    state.token = result.accessToken || '';
    state.refreshToken = result.refreshToken || '';
    state.user = result.user || null;
    localStorage.setItem('fd_access_token', state.token);
    localStorage.setItem('fd_refresh_token', state.refreshToken);
    renderSession();
  }

  function clearSession() {
    state.token = '';
    state.refreshToken = '';
    state.user = null;
    localStorage.removeItem('fd_access_token');
    localStorage.removeItem('fd_refresh_token');
    renderSession();
  }

  function renderSession() {
    const role = roleOf(state.user);
    $('#sessionPill').textContent = state.user
      ? `${state.user.username || state.user.email} · ${roleLabel(role)}`
      : 'Chưa đăng nhập';
    renderRoleNavigation();
    renderSessionDetail();
  }

  function can(permission) {
    return state.permissions.includes(permission) || roleOf(state.user) === 'ADMIN';
  }

  function defaultScreenForRole(role = roleOf(state.user)) {
    return {
      CUSTOMER: 'customer',
      RESTAURANT: 'restaurant',
      SHIPPER: 'shipper',
      ADMIN: 'admin'
    }[role] || 'customer';
  }

  function allowedScreensForRole(role = roleOf(state.user)) {
    return new Set([defaultScreenForRole(role)]);
  }

  function renderRoleNavigation() {
    const role = roleOf(state.user);
    const allowedScreens = allowedScreensForRole(role);
    document.querySelectorAll('[data-screen-target]').forEach(button => {
      const screen = button.dataset.screenTarget;
      button.hidden = !allowedScreens.has(screen);
      button.classList.toggle('is-active', screen === document.body.dataset.screen && !button.hidden);
    });
    if (!allowedScreens.has(document.body.dataset.screen)) {
      showScreen(defaultScreenForRole(role));
    }
  }

  async function login(identifier, password) {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername: identifier, password })
    });
    saveSession(result);
    await loadSessionPermissions();
    renderSession();
    setStatus(`Đã đăng nhập ${identifier}`);
    await bootstrapForRole();
  }

  async function loadMe() {
    if (!state.token) return;
    try {
      state.user = await api('/api/auth/me');
      await loadSessionPermissions();
      renderSession();
      await bootstrapForRole();
    } catch (error) {
      clearSession();
      setStatus(`Phiên đăng nhập hết hạn: ${error.message}`, true);
    }
  }

  async function bootstrapForRole() {
    const role = roleOf(state.user);
    await loadPublicData();
    if (role === 'CUSTOMER') {
      await Promise.allSettled([loadAddresses(), loadCart(), loadCustomerOrders(), loadNotifications()]);
      showScreen('customer');
    } else if (role === 'RESTAURANT') {
      await loadOwnerRestaurants();
      await Promise.allSettled([loadRestaurantQueue(), loadNotifications()]);
      showScreen('restaurant');
    } else if (role === 'ADMIN') {
      await Promise.allSettled([loadAdminDashboard(), loadAccountDashboard()]);
      showScreen('admin');
    } else if (role === 'SHIPPER') {
      await loadShipperDashboard();
      showScreen('shipper');
    }
  }

  async function loadSessionPermissions() {
    const result = await api('/api/accounts/session');
    state.permissions = result.permissions || [];
    state.user = result.user || state.user;
  }

  function renderSessionDetail() {
    const role = roleOf(state.user);
    const node = $('#sessionDetail');
    if (!node) return;
    node.innerHTML = state.user ? `
      <strong>${escapeHtml(state.user.username || state.user.email)}</strong><br>
      Vai trò: ${escapeHtml(roleLabel(role))}<br>
      Trạng thái: ${escapeHtml(statusLabel(state.user.status))}<br>
      Quyền truy cập: ${state.permissions.length ? 'Đã được cấu hình' : 'Chưa tải'}
    ` : 'Chưa đăng nhập.';
  }

  async function loadPublicData() {
    await Promise.allSettled([loadBanners(), loadCategories(), searchCatalog()]);
  }

  async function loadBanners() {
    try {
      const result = await api('/api/catalog/banners');
      const items = result?.items || [];
      $('#bannerStrip').innerHTML = items.length ? items.map(item => `
        <article class="banner-card">
          <span>${escapeHtml(statusLabel(item.status || 'ACTIVE'))}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </article>
      `).join('') : `
        <article class="banner-card">
          <span>Ưu đãi</span>
          <strong>Chưa có chương trình nổi bật.</strong>
        </article>
      `;
    } catch (error) {
      $('#bannerStrip').innerHTML = errorBox(error);
    }
  }

  async function loadCategories() {
    try {
      const result = await api('/api/catalog/restaurant-categories');
      const items = result.items || [];
      $('#categoryStrip').innerHTML = items.length
        ? items.map(item => `<span class="category-chip">${escapeHtml(item.name)}</span>`).join('')
        : '<span class="category-chip">Chưa có danh mục</span>';
    } catch (error) {
      $('#categoryStrip').innerHTML = errorBox(error);
    }
  }

  async function searchCatalog() {
    const keyword = $('#catalogKeyword').value.trim();
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    try {
      const [restaurants, menu] = await Promise.all([
        api(`/api/catalog/restaurants${query}`),
        api(`/api/catalog/menu-items${keyword ? `?keyword=${encodeURIComponent(keyword)}&sort=featured` : '?sort=featured'}`)
      ]);
      state.restaurants = restaurants.items || [];
      renderRestaurants(restaurants.totalItems ?? state.restaurants.length);
      renderMenuList(menu.items || []);
    } catch (error) {
      $('#restaurantList').innerHTML = errorBox(error);
      $('#menuList').innerHTML = errorBox(error);
    }
  }

  function renderRestaurants(total) {
    $('#restaurantCount').textContent = `${total} kết quả`;
    $('#restaurantList').innerHTML = state.restaurants.length ? state.restaurants.map(item => `
      <article class="restaurant-card">
        <div class="thumb">${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.district || item.city)} · ${Number(item.rating || 0).toFixed(1)} sao · ${item.averagePrepareTime || 0} phút</span>
          <span>Đơn tối thiểu ${formatMoney(item.minimumOrder)}</span>
        </div>
        <button class="secondary-button" type="button" data-view-restaurant="${item.id}">Xem</button>
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-view-restaurant]').forEach(button => {
      button.addEventListener('click', () => selectRestaurant(Number(button.dataset.viewRestaurant)));
    });
  }

  function renderMenuList(items) {
    $('#menuCount').textContent = `${items.length} món`;
    $('#menuList').innerHTML = items.length ? items.map(item => `
      <article class="menu-card">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.restaurantName || '')} · ${item.preparationTime || 0} phút · bán ${item.soldCount || 0}</span>
          <span>${formatMoney(item.effectivePrice)}</span>
        </div>
        <button class="secondary-button" type="button" data-search-item-restaurant="${item.restaurantId}">Mở menu</button>
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-search-item-restaurant]').forEach(button => {
      button.addEventListener('click', () => selectRestaurant(Number(button.dataset.searchItemRestaurant)));
    });
  }

  async function selectRestaurant(restaurantId) {
    try {
      const [detail, menu] = await Promise.all([
        api(`/api/catalog/restaurants/${restaurantId}`),
        api(`/api/catalog/restaurants/${restaurantId}/menu`)
      ]);
      state.selectedRestaurant = detail;
      state.selectedMenu = flattenMenu(menu);
      $('#selectedRestaurantTitle').textContent = detail.name;
      renderRestaurantDetail(detail, state.selectedMenu);
    } catch (error) {
      $('#restaurantDetail').innerHTML = errorBox(error);
    }
  }

  function flattenMenu(menuResponse) {
    return (menuResponse || []).flatMap(menu => [
      ...(menu.categories || []).flatMap(category => (category.items || []).map(item => ({
        ...item,
        categoryName: category.name
      }))),
      ...(menu.uncategorizedItems || [])
    ]);
  }

  function renderRestaurantDetail(detail, items) {
    $('#restaurantDetail').innerHTML = `
      <div class="muted-block">
        <strong>${escapeHtml(detail.name)}</strong><br>
        ${escapeHtml(detail.address)}, ${escapeHtml(detail.district || '')}, ${escapeHtml(detail.city)}<br>
        Giờ mở cửa: ${escapeHtml(detail.openingTime || '--')} - ${escapeHtml(detail.closingTime || '--')} · Đánh giá ${Number(detail.rating || 0).toFixed(1)}
      </div>
      <div class="card-list">
        ${items.length ? items.slice(0, 30).map(item => renderDetailMenuItem(item, detail.id)).join('') : empty()}
      </div>
    `;
    document.querySelectorAll('[data-add-cart]').forEach(button => {
      button.addEventListener('click', () => addItemFromDetail(Number(button.dataset.addCart)));
    });
  }

  function renderDetailMenuItem(item, restaurantId) {
    const variantOptions = (item.variants || []).map(variant => `<option value="${variant.id}">${escapeHtml(variant.name)} +${formatMoney(variant.priceAdjustment)}</option>`).join('');
    const toppingOptions = (item.toppingGroups || []).flatMap(group => (group.toppings || []).map(topping => `
      <label class="muted">
        <input type="checkbox" data-topping-for="${item.id}" value="${topping.id}"> ${escapeHtml(group.name)}: ${escapeHtml(topping.name)} +${formatMoney(topping.price)}
      </label>
    `)).join('');
    return `
      <article class="menu-card">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.categoryName || 'Menu')} · ${item.preparationTime || 0} phút · ${formatMoney(item.effectivePrice)}</span>
          <input type="hidden" data-restaurant-for="${item.id}" value="${restaurantId}">
          ${variantOptions ? `<select data-variant-for="${item.id}"><option value="">Size mặc định</option>${variantOptions}</select>` : ''}
          ${toppingOptions ? `<div>${toppingOptions}</div>` : ''}
        </div>
        <div class="menu-actions">
          <select data-quantity-for="${item.id}">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
          <button class="primary-button" type="button" data-add-cart="${item.id}">Thêm</button>
        </div>
      </article>
    `;
  }

  async function addItemFromDetail(menuItemId) {
    if (!state.user || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để thêm món vào giỏ.', true);
      return;
    }
    const restaurantId = Number(document.querySelector(`[data-restaurant-for="${menuItemId}"]`).value);
    const variantValue = document.querySelector(`[data-variant-for="${menuItemId}"]`)?.value || null;
    const quantity = Number(document.querySelector(`[data-quantity-for="${menuItemId}"]`)?.value || 1);
    const toppingIds = Array.from(document.querySelectorAll(`[data-topping-for="${menuItemId}"]:checked`)).map(input => Number(input.value));
    try {
      state.cart = await api('/api/customer/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          menuItemId,
          variantId: variantValue ? Number(variantValue) : null,
          quantity,
          toppingIds
        })
      });
      renderCart();
      setStatus('Đã thêm món vào giỏ hàng.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadAddresses() {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') return;
    try {
      const result = await api('/api/customer/addresses');
      state.addresses = result.items || [];
      renderAddresses();
    } catch (error) {
      $('#defaultAddressText').textContent = error.message;
    }
  }

  function renderAddresses() {
    const selected = state.addresses.find(item => item.isDefault) || state.addresses[0];
    $('#defaultAddressText').textContent = selected
      ? `${selected.receiverName} · ${selected.addressLine}, ${selected.district || ''}, ${selected.city}`
      : 'Chưa có địa chỉ';
    $('#checkoutAddress').innerHTML = state.addresses.length
      ? state.addresses.map(item => `<option value="${item.id}" ${item.isDefault ? 'selected' : ''}>${escapeHtml(item.label || 'Địa chỉ')} · ${escapeHtml(item.addressLine)}</option>`).join('')
      : '<option value="">Chưa có địa chỉ</option>';
  }

  async function loadCart() {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') return;
    try {
      state.cart = await api('/api/customer/cart');
      renderCart();
    } catch (error) {
      $('#cartItems').innerHTML = errorBox(error);
    }
  }

  function renderCart() {
    const cart = state.cart;
    if (!cart || !cart.items || cart.items.length === 0) {
      $('#cartTitle').textContent = 'Giỏ trống';
      $('#cartItems').innerHTML = empty();
      return;
    }
    $('#cartTitle').textContent = `${cart.restaurantName} · ${formatMoney(cart.subtotal)}`;
    const rows = cart.items.map(item => `
      <div class="cart-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span class="muted">${item.variantName ? `${escapeHtml(item.variantName)} · ` : ''}SL ${item.quantity}</span>
        </div>
        <b>${formatMoney(item.lineTotal)}</b>
      </div>
    `).join('');
    const fees = `
      <div class="fee-row"><span>Tạm tính</span><b>${formatMoney(cart.subtotal)}</b></div>
      <div class="fee-row"><span>Phí giao hàng, dịch vụ và thuế sẽ được tính khi đặt hàng</span><b>Tự động</b></div>
    `;
    $('#cartItems').innerHTML = rows + fees;
  }

  async function checkout(event) {
    event.preventDefault();
    if (!state.cart?.restaurantId) {
      setStatus('Giỏ hàng trống hoặc chưa tải.', true);
      return;
    }
    const addressId = Number($('#checkoutAddress').value);
    if (!addressId) {
      setStatus('Chưa có địa chỉ giao hàng.', true);
      return;
    }
    try {
      const order = await api('/api/customer/orders/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': `web-${Date.now()}` },
        body: JSON.stringify({
          restaurantId: state.cart.restaurantId,
          addressId,
          paymentMethod: $('#paymentMethod').value,
          promotionCode: $('#promotionCode').value.trim() || undefined,
          customerNote: $('#customerNote').value.trim() || undefined
        })
      });
      state.cart = null;
      renderCart();
      setStatus(`Đã tạo đơn ${order.orderCode} · Tổng ${formatMoney(order.totalAmount)}`);
      await loadCustomerOrders();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadCustomerOrders() {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') return;
    try {
      const result = await api('/api/customer/orders');
      const items = result.items || [];
      $('#customerOrders').innerHTML = items.length ? items.map(renderOrderSummary).join('') : empty();
      bindCustomerOrderActions();
    } catch (error) {
      $('#customerOrders').innerHTML = errorBox(error);
    }
  }

  function renderOrderSummary(order) {
    return `
      <article class="order-card">
        <strong>${escapeHtml(order.orderCode)}</strong>
        <span>${escapeHtml(order.restaurantName)} · ${escapeHtml(statusLabel(order.status))} · ${escapeHtml(paymentLabel(order.paymentMethod))}</span>
        <span>Tổng: ${formatMoney(order.totalAmount)} · Phí giao: ${formatMoney(order.deliveryFee)} · Giảm: ${formatMoney(order.discountAmount)}</span>
        ${['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && can('order.cancel') ? `<button type="button" data-cancel-order="${order.id}">Hủy đơn</button>` : ''}
      </article>
    `;
  }

  function bindCustomerOrderActions() {
    document.querySelectorAll('[data-cancel-order]').forEach(button => {
      button.addEventListener('click', () => cancelOrder(button.dataset.cancelOrder));
    });
  }

  async function cancelOrder(orderId) {
    try {
      await api(`/api/payments/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reasonCode: 'CUSTOMER_CHANGED_MIND', reason: 'Hủy từ giao diện web' })
      });
      await loadCustomerOrders();
      setStatus('Đã hủy đơn.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadNotifications() {
    if (!state.token) return;
    await api('/api/notifications').catch(() => null);
  }

  async function loadShipperDashboard() {
    if (!state.token || roleOf(state.user) !== 'SHIPPER') return;
    await Promise.allSettled([loadShipperProfile(), loadShipperAssignments(), loadShipperDeliveries(), loadShipperEarnings()]);
  }

  async function loadShipperProfile() {
    try {
      const profile = await api('/api/shippers/profile');
      $('#shipperProfile').innerHTML = `
        <strong>${escapeHtml(profile.fullName)}</strong><br>
        Trạng thái: ${escapeHtml(statusLabel(profile.availabilityStatus))}<br>
        Xe: ${escapeHtml(profile.vehicleType)} ${escapeHtml(profile.vehiclePlate || '')}<br>
        Đánh giá: ${Number(profile.rating || 0).toFixed(1)} · ${profile.totalDeliveries || 0} chuyến
      `;
    } catch (error) {
      $('#shipperProfile').innerHTML = errorBox(error);
    }
  }

  async function updateAvailability(status) {
    try {
      await api('/api/shippers/availability', {
        method: 'PATCH',
        body: JSON.stringify({ availabilityStatus: status })
      });
      await loadShipperProfile();
      setStatus(`Đã chuyển trạng thái ${statusLabel(status)}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadShipperAssignments() {
    try {
      const result = await api('/api/shippers/assignments');
      const items = result.items || [];
      $('#shipperAssignments').innerHTML = items.length ? items.map(item => `
        <article class="order-card">
          <strong>${escapeHtml(item.orderCode)}</strong>
          <span>${escapeHtml(item.restaurantName)} · ${formatMoney(item.totalAmount)} · ${escapeHtml(statusLabel(item.status))}</span>
          <span>${escapeHtml(item.deliveryAddress || '')}</span>
          ${item.status === 'OFFERED' ? `
            <div class="button-row">
              <button class="secondary-button" type="button" data-accept-assignment="${item.id}">Nhận</button>
              <button class="secondary-button" type="button" data-reject-assignment="${item.id}">Từ chối</button>
            </div>
          ` : ''}
        </article>
      `).join('') : empty();
      document.querySelectorAll('[data-accept-assignment]').forEach(button => {
        button.addEventListener('click', () => respondAssignment(button.dataset.acceptAssignment, 'accept'));
      });
      document.querySelectorAll('[data-reject-assignment]').forEach(button => {
        button.addEventListener('click', () => respondAssignment(button.dataset.rejectAssignment, 'reject'));
      });
    } catch (error) {
      $('#shipperAssignments').innerHTML = errorBox(error);
    }
  }

  async function respondAssignment(id, action) {
    try {
      await api(`/api/shippers/assignments/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(action === 'reject' ? { reason: 'Từ chối từ web' } : {})
      });
      await loadShipperDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadShipperDeliveries() {
    try {
      const result = await api('/api/shippers/deliveries');
      const items = result.items || [];
      $('#shipperDeliveries').innerHTML = items.length ? items.map(item => `
        <article class="order-card">
          <strong>${escapeHtml(item.orderCode || `Chuyến giao #${item.id}`)}</strong>
          <span>${escapeHtml(item.restaurantName || '')} · ${escapeHtml(statusLabel(item.status))} · ${formatMoney(item.deliveryFee)}</span>
          <span>${escapeHtml(item.pickupAddress)} → ${escapeHtml(item.deliveryAddress)}</span>
          <div class="button-row">
            <button class="secondary-button" type="button" data-delivery-status="${item.id}:PICKED_UP">Đã lấy hàng</button>
            <button class="secondary-button" type="button" data-delivery-status="${item.id}:DELIVERING">Đang giao</button>
            <button class="secondary-button" type="button" data-delivery-status="${item.id}:DELIVERED">Đã giao</button>
          </div>
        </article>
      `).join('') : empty();
      document.querySelectorAll('[data-delivery-status]').forEach(button => {
        button.addEventListener('click', () => {
          const [id, status] = button.dataset.deliveryStatus.split(':');
          updateDeliveryStatus(id, status);
        });
      });
    } catch (error) {
      $('#shipperDeliveries').innerHTML = errorBox(error);
    }
  }

  async function updateDeliveryStatus(id, status) {
    try {
      await api(`/api/shippers/deliveries/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, note: `Cập nhật ${statusLabel(status)}` })
      });
      await loadShipperDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadShipperEarnings() {
    try {
      const result = await api('/api/shippers/earnings');
      $('#shipperEarnings').innerHTML = `
        <article class="order-card">
          <strong>Tổng thu nhập: ${formatMoney(result.totalEarnings || 0)}</strong>
          <span>${(result.items || []).length} dòng thu nhập · ${(result.withdrawals || []).length} yêu cầu rút</span>
        </article>
      `;
    } catch (error) {
      $('#shipperEarnings').innerHTML = errorBox(error);
    }
  }

  async function loadOwnerRestaurants() {
    if (!state.token || roleOf(state.user) !== 'RESTAURANT') return;
    try {
      const result = await api('/api/restaurant/restaurants');
      state.ownerRestaurants = result.items || [];
      state.ownerRestaurantId = state.ownerRestaurantId || state.ownerRestaurants[0]?.id || null;
      renderOwnerRestaurants();
    } catch (error) {
      $('#ownerRestaurantSummary').innerHTML = errorBox(error);
    }
  }

  function renderOwnerRestaurants() {
    $('#ownerRestaurantSelect').innerHTML = state.ownerRestaurants.length
      ? state.ownerRestaurants.map(item => `<option value="${item.id}" ${item.id === state.ownerRestaurantId ? 'selected' : ''}>${escapeHtml(item.name)} · ${escapeHtml(statusLabel(item.status))}</option>`).join('')
      : '<option value="">Chưa có nhà hàng</option>';
    const current = state.ownerRestaurants.find(item => item.id === state.ownerRestaurantId);
    $('#ownerRestaurantSummary').innerHTML = current
      ? `<strong>${escapeHtml(current.name)}</strong><br><span>${escapeHtml(current.address || '')} · ${escapeHtml(current.city || '')}</span>`
      : 'Chưa chọn nhà hàng.';
  }

  async function loadRestaurantQueue() {
    if (!state.token || roleOf(state.user) !== 'RESTAURANT') return;
    try {
      const result = await api('/api/restaurant/orders');
      renderRestaurantBoard(result.items || []);
    } catch (error) {
      $('#restaurantOrderBoard').innerHTML = errorBox(error);
    }
  }

  function renderRestaurantBoard(orders) {
    const groups = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'];
    $('#restaurantOrderBoard').innerHTML = groups.map(status => {
      const items = orders.filter(order => order.status === status);
      return `
        <section class="order-column">
          <h3>${statusLabel(status)} (${items.length})</h3>
          ${items.length ? items.map(renderRestaurantOrder).join('') : '<div class="empty-state">Trống</div>'}
        </section>
      `;
    }).join('');
    document.querySelectorAll('[data-order-action]').forEach(button => {
      button.addEventListener('click', () => transitionOrder(Number(button.dataset.orderId), button.dataset.orderAction));
    });
  }

  function renderRestaurantOrder(order) {
    const action = order.status === 'PENDING'
      ? ['confirm', 'Xác nhận']
      : order.status === 'CONFIRMED'
        ? ['prepare', 'Bắt đầu nấu']
        : order.status === 'PREPARING'
          ? ['ready', 'Sẵn sàng']
          : null;
    return `
      <article class="order-card">
        <strong>${escapeHtml(order.orderCode)}</strong>
        <span>${escapeHtml(paymentLabel(order.paymentMethod))} · ${formatMoney(order.totalAmount)}</span>
        <span>${escapeHtml(order.customerNote || 'Không có ghi chú')}</span>
        ${action ? `<button type="button" data-order-id="${order.id}" data-order-action="${action[0]}">${action[1]}</button>` : '<span class="status-chip">Chờ shipper</span>'}
      </article>
    `;
  }

  async function transitionOrder(orderId, action) {
    try {
      await api(`/api/restaurant/orders/${orderId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ note: `Cập nhật từ web: ${action}` })
      });
      await loadRestaurantQueue();
      setStatus('Đã cập nhật trạng thái đơn.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadOwnerMenu() {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    state.ownerRestaurantId = restaurantId;
    try {
      const result = await api(`/api/restaurant/restaurants/${restaurantId}/menu-items?pageSize=50`);
      renderOwnerMenu(result.items || []);
    } catch (error) {
      $('#ownerMenuRows').innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderOwnerMenu(items) {
    $('#ownerMenuRows').innerHTML = items.length ? items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.description || '')}</span></td>
        <td>${formatMoney(item.effectivePrice)}</td>
        <td>${item.preparationTime} phút</td>
        <td><span class="status-chip">${item.isAvailable ? 'Đang bán' : 'Tạm ẩn'}</span></td>
      </tr>
    `).join('') : '<tr><td colspan="4">Chưa có món</td></tr>';
  }

  async function createMenuItem(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#newItemName').value.trim(),
          basePrice: Number($('#newItemPrice').value),
          preparationTime: Number($('#newItemPrep').value),
          isAvailable: true,
          isFeatured: false
        })
      });
      $('#createItemForm').hidden = true;
      await loadOwnerMenu();
      setStatus('Đã tạo món mới.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadAdminDashboard() {
    if (!state.token || roleOf(state.user) !== 'ADMIN') return;
    const [restaurants, audit, users] = await Promise.allSettled([
      api('/api/admin/restaurants'),
      api('/api/admin/audit-logs'),
      api('/api/accounts/admin/users')
    ]);
    if (restaurants.status === 'fulfilled') {
      const items = restaurants.value.items || [];
      $('#adminRestaurants').innerHTML = items.length ? items.slice(0, 12).map(item => `
        <article class="restaurant-card">
          <div class="thumb">${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(item.city || '')}</span>
          </div>
          <span class="status-chip">${item.id}</span>
        </article>
      `).join('') : empty();
    } else {
      $('#adminRestaurants').innerHTML = errorBox(restaurants.reason);
    }
    if (audit.status === 'fulfilled') {
      const items = audit.value.items || [];
      $('#auditLogs').innerHTML = items.length ? items.slice(0, 12).map(item => `
        <article class="log-card">
          <strong>${escapeHtml(activityLabel(item.action || item.auditAction))}</strong>
          <span>${escapeHtml(item.username || 'Hệ thống')} · ${escapeHtml(new Date(item.createdAt).toLocaleString('vi-VN'))}</span>
        </article>
      `).join('') : empty();
    } else {
      $('#auditLogs').innerHTML = errorBox(audit.reason);
    }
    if (users.status === 'fulfilled') {
      renderUsers(users.value.items || []);
    } else {
      $('#userManagement').innerHTML = errorBox(users.reason);
    }
    $('#adminOps').innerHTML = `
      <article class="order-card"><strong>Vận hành giao hàng</strong><span>Theo dõi tài xế, chuyến giao, thanh toán và đối soát.</span></article>
      <article class="order-card"><strong>Phân quyền</strong><span>Mỗi vai trò chỉ nhìn thấy khu vực và thao tác phù hợp.</span></article>
    `;
  }

  async function loadAccountDashboard() {
    if (!state.token) return;
    await Promise.allSettled([loadSessionPermissions(), loadWallet(), roleOf(state.user) === 'ADMIN' ? loadUsers() : Promise.resolve()]);
    renderSession();
  }

  async function loadWallet() {
    try {
      const result = await api('/api/payments/wallet');
      $('#walletPanel').innerHTML = `
        <article class="order-card">
          <strong>Số dư: ${formatMoney(result.wallet?.balance || 0)}</strong>
          <span>${(result.transactions || []).length} giao dịch gần đây · ${escapeHtml(result.wallet?.status || '')}</span>
        </article>
      `;
    } catch (error) {
      $('#walletPanel').innerHTML = errorBox(error);
    }
  }

  async function depositWallet(event) {
    event.preventDefault();
    try {
      await api('/api/payments/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number($('#walletDepositAmount').value) })
      });
      await loadWallet();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadUsers() {
    if (!can('user.view')) {
      $('#userManagement').innerHTML = '<div class="empty-state">Tài khoản hiện tại không có quyền xem danh sách người dùng.</div>';
      return;
    }
    try {
      const result = await api('/api/accounts/admin/users');
      renderUsers(result.items || []);
    } catch (error) {
      $('#userManagement').innerHTML = errorBox(error);
    }
  }

  function renderUsers(items) {
    const node = $('#userManagement');
    if (!node) return;
    node.innerHTML = items.length ? items.slice(0, 50).map(item => `
      <article class="order-card">
        <strong>${escapeHtml(item.username)}</strong>
        <span>${escapeHtml(item.email)} · ${escapeHtml(roleLabel(item.role))} · ${escapeHtml(statusLabel(item.status))}</span>
        ${can('user.manage') ? `
          <div class="button-row">
            <button class="secondary-button" type="button" data-user-status="${item.id}:ACTIVE">Mở</button>
            <button class="secondary-button" type="button" data-user-status="${item.id}:LOCKED">Khóa</button>
            <button class="secondary-button" type="button" data-user-status="${item.id}:INACTIVE">Tạm ngưng</button>
          </div>
        ` : ''}
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-user-status]').forEach(button => {
      button.addEventListener('click', () => {
        const [id, status] = button.dataset.userStatus.split(':');
        updateUserStatus(id, status);
      });
    });
  }

  async function updateUserStatus(id, status) {
    try {
      await api(`/api/accounts/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadUsers();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function showScreen(screen) {
    const allowedScreens = allowedScreensForRole();
    const target = allowedScreens.has(screen) ? screen : defaultScreenForRole();
    document.body.dataset.screen = target;
    document.querySelectorAll('[data-screen-panel]').forEach(panel => {
      panel.classList.toggle('is-active', panel.dataset.screenPanel === target);
    });
    document.querySelectorAll('[data-screen-target]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.screenTarget === target && !button.hidden);
    });
    if (target === 'account' && state.token) loadAccountDashboard();
  }

  function bind() {
    document.querySelectorAll('[data-screen-target]').forEach(button => {
      button.addEventListener('click', () => showScreen(button.dataset.screenTarget));
    });
    $('#loginForm').addEventListener('submit', event => {
      event.preventDefault();
      login($('#loginIdentifier').value, $('#loginPassword').value).catch(error => setStatus(error.message, true));
    });
    $('#logoutButton').addEventListener('click', async () => {
      if (state.refreshToken) {
        await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: state.refreshToken }) }).catch(() => null);
      }
      clearSession();
      setStatus('Đã đăng xuất.');
    });
    $('#loadMeButton').addEventListener('click', () => loadMe());
    $('#searchForm').addEventListener('submit', event => {
      event.preventDefault();
      searchCatalog();
    });
    $('#refreshCustomerButton').addEventListener('click', () => Promise.allSettled([loadPublicData(), loadAddresses(), loadCart(), loadCustomerOrders()]));
    $('#loadAddressesButton').addEventListener('click', () => loadAddresses());
    $('#loadCartButton').addEventListener('click', () => loadCart());
    $('#checkoutForm').addEventListener('submit', checkout);
    $('#loadCustomerOrdersButton').addEventListener('click', () => loadCustomerOrders());
    $('#refreshRestaurantButton').addEventListener('click', () => loadOwnerRestaurants());
    $('#ownerRestaurantSelect').addEventListener('change', event => {
      state.ownerRestaurantId = Number(event.target.value);
      renderOwnerRestaurants();
    });
    $('#loadRestaurantQueueButton').addEventListener('click', () => loadRestaurantQueue());
    $('#loadOwnerMenuButton').addEventListener('click', () => loadOwnerMenu());
    $('#toggleCreateItemButton').addEventListener('click', () => {
      $('#createItemForm').hidden = !$('#createItemForm').hidden;
    });
    $('#createItemForm').addEventListener('submit', createMenuItem);
    $('#loadAdminButton').addEventListener('click', () => loadAdminDashboard());
    $('#refreshShipperButton').addEventListener('click', () => loadShipperDashboard());
    document.querySelectorAll('[data-availability]').forEach(button => {
      button.addEventListener('click', () => updateAvailability(button.dataset.availability));
    });
    $('#withdrawForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/shippers/withdrawals', {
          method: 'POST',
          body: JSON.stringify({
            amount: Number($('#withdrawAmount').value),
            bankName: $('#withdrawBank').value,
            bankAccount: $('#withdrawAccount').value
          })
        });
        await loadShipperEarnings();
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    $('#refreshAccountButton').addEventListener('click', () => loadAccountDashboard());
    $('#walletDepositForm').addEventListener('submit', depositWallet);
    $('#clearLogButton').addEventListener('click', () => {
      state.apiLog = [];
      renderApiLog();
    });
  }

  bind();
  renderSession();
  loadPublicData();
  if (state.token) loadMe();
}());
