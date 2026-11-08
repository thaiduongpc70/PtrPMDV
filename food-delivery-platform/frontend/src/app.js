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
    selectedReviews: [],
    selectedMenuItem: null,
    selectedMenuRestaurantId: null,
    selectedOrder: null,
    addresses: [],
    cart: null,
    ownerRestaurants: [],
    ownerRestaurantId: null,
    ownerMenuItems: [],
    ownerMenuCategories: [],
    ownerToppingGroups: [],
    itemImageEditors: {
      create: { image: null, dataUrl: null },
      edit: { image: null, dataUrl: null }
    },
    catalogCategoryId: null,
    catalogCategoryName: 'Tất cả',
    subViews: {
      customer: 'catalog',
      restaurant: 'dashboard',
      shipper: 'profile',
      admin: 'overview',
      account: 'profile'
    },
    apiLog: []
  };

  Object.assign(state, {
    city: (() => { try { return localStorage.getItem('fd_city') || ''; } catch { return ''; } })(), // rỗng → lấy tỉnh có nhiều quán nhất từ DB
    cities: [], sort: 'featured', district: '', openNow: false, page: 1, totalRestaurants: 0, geo: null,
    collection: null, collections: [], showAllCollections: false
  });

  const $ = selector => document.querySelector(selector);

  function formatMoney(value) {
    return `${money.format(Number(value) || 0)} VND`;
  }

  function renderStars(value) {
    const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  const GRADIENTS = [
    ['#ee4d2d', '#ff8a3d'], ['#d7263d', '#ff7a59'], ['#f59e0b', '#fcd34d'],
    ['#16a34a', '#6ee7a0'], ['#7c3aed', '#c4b5fd'], ['#0ea5e9', '#7dd3fc']
  ];

  function gradientFor(seed) {
    const sum = String(seed || '').split('').reduce((total, char) => total + char.charCodeAt(0), 0);
    return GRADIENTS[sum % GRADIENTS.length];
  }

  function imageForFood(seed) {
    const [a, b] = gradientFor(seed);
    return `style="--g1:${a};--g2:${b}"`;
  }

  const EMOJI_RULES = [
    [/trà sữa|trân châu|milk tea/, '🧋'], [/cà phê|cafe|coffee|bạc xỉu/, '☕'], [/nước ép|sinh tố|nước cam|smoothie|cam ép|ép/, '🥤'],
    [/pizza/, '🍕'], [/cơm/, '🍚'], [/đồ chay|chay/, '🥗'], [/món việt|việt/, '🍛'], [/đồ uống|nước/, '🥤'], [/đồ ăn nhanh/, '🍔'], [/ăn vặt|vặt/, '🍟'], [/tráng miệng|dessert/, '🍰'], [/drink/, '🥤'], [/burger|hamburger/, '🍔'], [/bánh mì/, '🥖'], [/lẩu/, '🍲'], [/gỏi cuốn|nem|chả giò/, '🥟'], [/gỏi|salad|rau/, '🥗'],
    [/cháo|súp/, '🥣'], [/gà|chicken/, '🍗'], [/tokbokki|kimchi|hàn quốc/, '🌶️'], [/xiên|nướng|bbq|sườn|thịt/, '🍢'],
    [/phở|bún|mì|miến|hủ tiếu|nui|ramen/, '🍜'], [/sushi|cá|hải sản|tôm/, '🍣'], [/bánh xèo|bánh cuốn|nem|chả giò|gỏi cuốn|há cảo|xíu mại/, '🥟'], [/chè|kem|bánh ngọt|bánh flan|tráng miệng/, '🍰'],
    [/khoai|snack|ăn vặt|ăn nhanh/, '🍟']
  ];

  function foodEmoji(text) {
    const value = String(text || '').toLowerCase();
    const rule = EMOJI_RULES.find(([pattern]) => pattern.test(value));
    return rule ? rule[1] : '🍽️';
  }

  function ratingLine(item) {
    const total = Number(item.totalReviews) || 0;
    return total > 0 ? `<span class="rating-line" title="${total} đánh giá"><b>★ ${Number(item.rating).toFixed(1)}</b> (${total})</span>` : '';
  }

  function photo(name, imageUrl, cls = '', inner = '') {
    return `<div class="food-photo ${cls}" ${imageForFood(name)}><span class="food-emoji">${foodEmoji(name)}</span>${imageUrl ? `<img class="photo-img" src="${escapeHtml(imageUrl)}" alt="" loading="lazy">` : ''}${inner}</div>`;
  }

  document.addEventListener('error', event => {
    if (event.target?.classList?.contains('photo-img')) event.target.remove();
  }, true);

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
      ASSIGNED: 'Đã gán',
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
      REFUNDED: 'Đã hoàn tiền',
      OPEN: 'Mới mở',
      IN_PROGRESS: 'Đang xử lý',
      RESOLVED: 'Đã giải quyết',
      CLOSED: 'Đã đóng',
      LOW: 'Thấp',
      MEDIUM: 'Trung bình',
      HIGH: 'Cao',
      URGENT: 'Khẩn cấp'
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

  let refreshing = null;
  /** Đổi refresh token lấy cặp token mới (dùng chung một lời gọi khi nhiều request cùng hết hạn). */
  function refreshSession() {
    if (!state.refreshToken) return Promise.resolve(false);
    refreshing ??= fetch(`${apiBase}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: state.refreshToken }) })
      .then(async response => {
        if (!response.ok) return false;
        const result = await response.json();
        state.token = result.accessToken || '';
        state.refreshToken = result.refreshToken || state.refreshToken;
        localStorage.setItem('fd_access_token', state.token);
        localStorage.setItem('fd_refresh_token', state.refreshToken);
        return Boolean(state.token);
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
    return refreshing;
  }

  async function api(path, options = {}, retried = false) {
    const started = performance.now();
    const method = options.method || 'GET';
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: headers(options.headers || {})
    });
    if (response.status === 401 && state.token && state.refreshToken && !retried && !path.startsWith('/api/auth/')) {
      if (await refreshSession()) return api(path, options, true);
      clearSession();
      openAuth('login', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    }
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
    if (response.status === 401 && !state.token) {
      openAuth('login', 'Vui lòng đăng nhập để tiếp tục.');
      throw new Error('Vui lòng đăng nhập để tiếp tục.');
    }
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
    if (!message) return;
    if (!$('#authModal').hidden) {
      const node = $('#authStatus');
      node.textContent = message;
      node.classList.toggle('is-error', isError);
      return;
    }
    toast(message, isError);
  }

  function toast(message, isError = false) {
    const stack = $('#toastStack');
    if (!stack) return;
    const node = document.createElement('div');
    node.className = `toast ${isError ? 'is-error' : 'is-success'}`;
    node.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span><p>${escapeHtml(message)}</p>`;
    stack.appendChild(node);
    setTimeout(() => node.classList.add('is-leaving'), 3600);
    setTimeout(() => node.remove(), 4000);
  }

  function openAuth(tab = 'login', message = '') {
    $('#authModal').hidden = false;
    document.body.classList.add('modal-open');
    document.querySelectorAll('.auth-switch [data-auth-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.authTab === tab));
    $('.auth-switch').hidden = ['forgot', 'reset'].includes(tab);
    document.querySelectorAll('[data-auth-pane]').forEach(pane => { pane.hidden = pane.dataset.authPane !== tab; });
    const node = $('#authStatus');
    node.textContent = message;
    node.classList.remove('is-error');
    setTimeout(() => ({ login: $('#loginIdentifier'), register: $('#regFullName'), forgot: $('#forgotEmail'), reset: $('#resetToken') }[tab] || $('#loginIdentifier')).focus(), 30);
  }

  function closeAuth() {
    $('#authModal').hidden = true;
    document.body.classList.remove('modal-open');
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
    document.body.dataset.auth = state.user ? 'authenticated' : 'guest';
    document.body.dataset.role = state.user ? role.toLowerCase() : 'guest';
    const display = state.user ? (state.user.fullName || state.user.username || state.user.email || '') : '';
    $('#sessionPill').textContent = state.user ? `${display}` : 'Khách';
    $('#userAvatar').textContent = (display || '?').trim().slice(0, 1).toUpperCase();
    updateCartBadge();
    const headerLogoutButton = $('#headerLogoutButton');
    if (headerLogoutButton) headerLogoutButton.hidden = !state.user;
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
    if (!state.token || !state.user) return new Set(['customer']);
    return new Set([defaultScreenForRole(role), 'account', 'api']);
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
    closeAuth();
    toast(`Xin chào ${state.user?.fullName || state.user?.username || identifier}!`);
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
      await Promise.allSettled([loadAddresses(), loadCart(), loadCustomerOrders(), loadFavorites(), loadSupportTickets(), loadNotifications()]);
      showScreen('customer');
    } else if (role === 'RESTAURANT') {
      await loadOwnerRestaurants();
      await Promise.allSettled([loadRestaurantQueue(), loadNotifications()]);
      showScreen('restaurant');
    } else if (role === 'ADMIN') {
      await Promise.allSettled([loadAccountDashboard()]);
      showScreen('admin');
      window.FDAdmin?.load();
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
      ${state.user.email ? `<div class="email-verify">
        <div>Email: <b>${escapeHtml(state.user.email)}</b> ${state.user.emailVerifiedAt
          ? '<span class="status-chip is-ok">Đã xác minh</span>'
          : '<span class="status-chip is-warn">Chưa xác minh</span>'}</div>
        ${state.user.emailVerifiedAt ? '' : `
          <button class="secondary-button" type="button" id="emailVerifyRequest">Gửi mã xác minh</button>
          <form class="stacked-form compact-form" id="emailVerifyForm" hidden>
            <label>Mã xác minh <input name="token" required autocomplete="one-time-code" placeholder="Dán mã xác minh"></label>
            <p class="muted" id="emailVerifyNote"></p>
            <button class="primary-button" type="submit">Xác minh email</button>
          </form>`}
      </div>` : ''}
    ` : 'Chưa đăng nhập.';
  }

  async function loadPublicData() {
    await loadStorefront();
    await loadCities();
    await Promise.allSettled([loadCollections(), loadCategories(), loadDistricts(), searchCatalog()]);
  }

  /* ===== Trang chủ lấy toàn bộ số liệu từ DB: /api/catalog/storefront ===== */
  async function loadStorefront() {
    try {
      state.storefront = await api('/api/catalog/storefront');
    } catch {
      state.storefront = null;
      return;
    }
    const { stats, vouchers, categories, contact, loyalty } = state.storefront;
    const lead = vouchers.find(item => item.discountType === 'FREE_DELIVERY') || vouchers[0];
    $('#stripPromo').innerHTML = lead ? `🛵 ${escapeHtml(lead.name)} · nhập mã <b>${escapeHtml(lead.code)}</b>` : '';
    const hotline = [contact.phone ? `Hotline <b>${escapeHtml(contact.phone)}</b>` : '', contact.opens && contact.closes ? `${contact.opens} – ${contact.closes} hằng ngày` : ''].filter(Boolean);
    $('#stripContact').innerHTML = hotline.join(' · ');
    $('#footerPhone').innerHTML = contact.phone ? `📞 Hotline: <b>${escapeHtml(contact.phone)}</b>${contact.name ? ` (${escapeHtml(contact.name)})` : ''}` : '';
    $('#footerEmail').textContent = contact.email ? `✉️ ${contact.email}` : '';
    $('#footerHours').textContent = contact.opens && contact.closes ? `🕒 Quán mở cửa từ ${contact.opens} đến ${contact.closes}` : '';
    $('#footerAbout').textContent = `Nền tảng đặt món và giao đồ ăn: ${stats.restaurants} nhà hàng, ${stats.dishes} món và ${stats.combos} combo, đã giao thành công ${stats.deliveredOrders.toLocaleString('vi-VN')} đơn.`;
    const phoneRow = $('#contactPhoneRow');
    if (contact.phone) { phoneRow.hidden = false; phoneRow.href = `tel:${contact.phone}`; phoneRow.querySelector('small').textContent = `${contact.phone}${contact.opens ? ` · ${contact.opens} – ${contact.closes}` : ''}`; }
    const emailRow = $('#contactEmailRow');
    if (contact.email) { emailRow.hidden = false; emailRow.href = `mailto:${contact.email}`; emailRow.querySelector('small').textContent = contact.email; }
    const minutes = stats.avgDeliveryMinutes;
    $('#sfHeadline').textContent = minutes ? `Đặt đồ ăn, giao hàng trung bình ${minutes} phút` : 'Đặt đồ ăn, giao hàng nhanh';
    $('#sfSub').textContent = `Có ${stats.restaurants} địa điểm, ${stats.dishes} món và ${stats.combos} combo${contact.opens && contact.closes ? ` · mở cửa từ ${contact.opens} đến ${contact.closes}` : ''} · đã giao ${stats.deliveredOrders.toLocaleString('vi-VN')} đơn`;
    const promoLines = vouchers.slice(0, 2).map(item => `<b>${escapeHtml(item.code)}</b>: ${escapeHtml(item.name)}`);
    if (loyalty.cheapestReward) promoLines.push(`Tích điểm: ${loyalty.cheapestReward.pointsCost} điểm đổi ${escapeHtml(loyalty.cheapestReward.name)}`);
    $('#sfPromoLine').innerHTML = promoLines.join('<br>');
  }

  /* Chữ phụ của banner được dựng từ đúng dữ liệu mà banner trỏ tới (voucher, combo, điểm thưởng) */
  function bannerCopy(target) {
    const store = state.storefront;
    if (!store || !target) return { tag: 'Ưu đãi', text: '', action: 'Xem ngay' };
    if (target.startsWith('voucher:')) {
      const voucher = store.vouchers.find(item => item.code === target.slice(8));
      return { tag: 'Voucher', text: voucher ? `Mã ${voucher.code} · ${voucherConditions({ ...voucher, scope: 'PLATFORM' })}` : '', action: 'Sao chép mã' };
    }
    if (target.startsWith('restaurant:') && store.topCombo) {
      return { tag: 'Combo', text: `Chỉ ${formatMoney(store.topCombo.price)} thay vì ${formatMoney(store.topCombo.originalPrice)} khi mua lẻ`, action: 'Xem combo' };
    }
    if (target === 'offers') return { tag: 'Điểm thưởng', text: `Mỗi 1.000đ tiền món = ${store.loyalty.pointsPerThousand} điểm`, action: 'Xem quà đổi' };
    return { tag: 'Ưu đãi', text: '', action: 'Xem ngay' };
  }

  const TONES = { green: ['#0b7a75', '#12b886'], red: ['#d93b1b', '#ff8a3d'], amber: ['#b45309', '#f59e0b'], yellow: ['#c58a00', '#ffd43b'], blue: ['#1d4ed8', '#38bdf8'], purple: ['#5b2fc9', '#9b5de5'], orange: ['#ee4d2d', '#ff9a56'] };

  /* Bộ sưu tập = banner do admin tạo (ảnh thật) + các bộ tính từ DB (voucher, combo, đánh giá, danh mục...) */
  async function loadCollections() {
    const grid = $('#collectionGrid');
    try {
      const [banners, collections] = await Promise.all([api('/api/catalog/banners'), api(`/api/catalog/collections?city=${encodeURIComponent(state.city)}`)]);
      state.collections = [
        ...(banners.items || []).map(item => ({ kind: 'banner', title: item.title, subtitle: bannerCopy(item.targetUrl).text, imageUrl: item.imageUrl, target: item.targetUrl, emoji: '🎁', tone: 'orange' })),
        ...(collections.items || []).map(item => ({ kind: 'collection', ...item }))
      ];
      renderCollections();
    } catch (error) {
      grid.innerHTML = errorBox(error);
    }
  }

  function renderCollections() {
    const items = state.showAllCollections ? state.collections : state.collections.slice(0, 9);
    $('#toggleCollections').hidden = state.collections.length <= 9;
    $('#toggleCollections').textContent = state.showAllCollections ? 'Thu gọn' : 'Xem tất cả';
    $('#collectionGrid').innerHTML = items.map((item, index) => {
      const [c1, c2] = TONES[item.tone] || TONES.orange;
      const art = item.imageUrl ? `background:url('${escapeHtml(item.imageUrl)}') center/cover no-repeat, linear-gradient(135deg, ${c1}, ${c2})` : `background:linear-gradient(135deg, ${c1}, ${c2})`;
      return `<button type="button" class="sf-tile" data-collection-index="${state.showAllCollections ? index : index}">
        <span class="sf-tile-art" style="${art}"><i>${item.emoji}</i></span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${item.kind === 'banner' ? escapeHtml(item.subtitle || 'Ưu đãi') : `${item.count} địa điểm`}</small></button>`;
    }).join('');
    $('#collectionGrid').querySelectorAll('[data-collection-index]').forEach(button => button.addEventListener('click', () => openCollection(items[Number(button.dataset.collectionIndex)])));
  }

  function openCollection(item) {
    if (item.kind === 'banner') { applyBannerTarget(item.target); return; }
    state.collection = item;
    state.sort = item.filter.sort || 'featured';
    state.catalogCategoryId = item.filter.categoryId ? Number(item.filter.categoryId) : null;
    state.catalogCategoryName = item.filter.categoryId ? item.title : 'Tất cả';
    showSubView('customer', 'catalog');
    searchCatalog();
    loadCategories();
    $('#restaurantSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Combo dùng chung màn catalog với "Đồ ăn": gạch chân theo bộ sưu tập đang lọc.
  function syncStoreNav() {
    const onCatalog = state.subViews.customer === 'catalog';
    const comboOn = onCatalog && state.collection?.key === 'combo';
    document.querySelector('[data-sf-collection="combo"]')?.classList.toggle('is-active', comboOn);
    document.querySelector('.sf-nav [data-subview-target="customer:catalog"]')?.classList.toggle('is-active', onCatalog && !comboOn);
  }

  function renderActiveCollection() {
    syncStoreNav();
    const box = $('#activeCollection');
    box.hidden = !state.collection;
    box.innerHTML = state.collection ? `<span>Đang lọc: <b>${escapeHtml(state.collection.title)}</b></span><button type="button" class="sf-link" id="clearCollection">Bỏ lọc ✕</button>` : '';
    $('#clearCollection')?.addEventListener('click', () => { state.collection = null; state.catalogCategoryId = null; state.catalogCategoryName = 'Tất cả'; searchCatalog(); loadCategories(); });
  }

  function applyBannerTarget(target) {
    if (target?.startsWith('voucher:')) {
      const code = target.slice(8);
      navigator.clipboard?.writeText(code).catch(() => null);
      state.sort = 'promo';
      searchCatalog();
      $('#restaurantSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`Đã sao chép mã ${code}. Chọn quán và dán mã ở giỏ hàng.`);
      return;
    }
    if (target?.startsWith('restaurant:')) { selectRestaurant(Number(target.slice(11))); return; }
    if (target === 'offers') { showSubView('customer', 'offers'); return; }
    state.catalogCategoryId = null;
    state.catalogCategoryName = 'Tất cả';
    $('#catalogKeyword').value = '';
    document.querySelectorAll('[data-category-filter]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.categoryFilter === '');
    });
    searchCatalog();
    $('#categoryStrip')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus(target ? 'Đã mở ưu đãi. Danh sách nhà hàng vẫn hiển thị đầy đủ để bạn chọn.' : '');
  }

  async function loadCategories() {
    try {
      const result = await api('/api/catalog/restaurant-categories');
      const items = result.items || [];
      $('#categoryStrip').innerHTML = items.length
        ? `<button type="button" class="sf-chip ${state.catalogCategoryId ? '' : 'is-active'}" data-category-filter="">All</button>`
          + items.map(item => `<button type="button" class="sf-chip ${Number(item.id) === Number(state.catalogCategoryId) ? 'is-active' : ''}" data-category-filter="${item.id}" data-category-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`).join('')
        : '';
      document.querySelectorAll('[data-category-filter]').forEach(button => {
        button.addEventListener('click', () => {
          state.catalogCategoryId = button.dataset.categoryFilter ? Number(button.dataset.categoryFilter) : null;
          state.catalogCategoryName = button.dataset.categoryName || 'Tất cả';
          state.collection = null;
          document.querySelectorAll('[data-category-filter]').forEach(item => item.classList.toggle('is-active', item === button));
          searchCatalog();
        });
      });
    } catch (error) {
      $('#categoryStrip').innerHTML = errorBox(error);
    }
  }

  const HOME_PAGE_SIZE = 12;
  const SORT_TITLES = {
    featured: 'Quán nổi bật', nearest: 'Quán gần bạn', popular: 'Quán được đặt nhiều', top_rated: 'Quán đánh giá cao',
    fastest: 'Quán giao nhanh', promo: 'Quán đang có ưu đãi'
  };

  /* Vị trí dùng để tính khoảng cách: GPS (khi khách cho phép) > địa chỉ giao hàng > trung tâm tỉnh/thành. */
  function currentGeo() {
    if (state.geo) return state.geo;
    const address = state.addresses.find(item => item.isDefault && item.latitude != null) || state.addresses.find(item => item.latitude != null);
    if (address) return { lat: Number(address.latitude), lng: Number(address.longitude), label: 'địa chỉ giao hàng của bạn' };
    const province = state.cities.find(item => item.name === state.city);
    if (province?.center) return { lat: province.center[0], lng: province.center[1], label: `trung tâm ${state.city}` };
    return null;
  }

  function requestGps() {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, label: 'vị trí hiện tại của bạn' }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 300000 }
    ));
  }

  async function loadCities() {
    try {
      const result = await api('/api/catalog/cities');
      state.cities = result.items || [];
    } catch {
      state.cities = [];
    }
    // Tỉnh mặc định = tỉnh có nhiều quán nhất trong DB (danh sách đã xếp theo số quán); bỏ lựa chọn cũ nếu tỉnh đó chưa có quán
    const saved = state.cities.find(item => item.name === state.city);
    if (!saved || !saved.restaurantCount) state.city = state.cities.find(item => item.restaurantCount)?.name || state.cities[0]?.name || state.city;
    renderCityList();
  }

  function renderCityList() {
    const needle = ($('#citySearch').value || '').trim().toLowerCase();
    const items = state.cities.filter(item => !needle || item.name.toLowerCase().includes(needle));
    $('#cityList').innerHTML = items.length
      ? items.map(item => `<li role="option" aria-selected="${item.name === state.city}"><button type="button" data-city="${escapeHtml(item.name)}" class="${item.name === state.city ? 'is-active' : ''}">
          <span>${escapeHtml(item.name)}</span><small>${item.restaurantCount ? `${item.restaurantCount} quán` : 'Sắp ra mắt'}</small></button></li>`).join('')
      : '<li class="muted city-empty">Không tìm thấy tỉnh/thành phù hợp.</li>';
    $('#cityName').textContent = state.city;
  }

  async function loadDistricts() {
    try {
      const result = await api(`/api/catalog/districts?city=${encodeURIComponent(state.city)}`);
      const items = result.items || [];
      $('#districtFilter').innerHTML = `<option value="">Tất cả phường/xã</option>${items.map(item => `<option value="${escapeHtml(item.name)}" ${item.name === state.district ? 'selected' : ''}>${escapeHtml(item.name)} (${item.restaurantCount})</option>`).join('')}`;
    } catch {
      $('#districtFilter').innerHTML = '<option value="">Tất cả phường/xã</option>';
    }
  }

  async function chooseCity(name) {
    state.city = name;
    state.district = '';
    try { localStorage.setItem('fd_city', name); } catch { /* bỏ qua khi trình duyệt chặn lưu trữ */ }
    $('#cityPanel').hidden = true;
    $('#cityPill').setAttribute('aria-expanded', 'false');
    renderCityList();
    await Promise.all([loadDistricts(), searchCatalog()]);
  }

  function renderSortTabs() {
    document.querySelectorAll('#sortTabs [data-sort]').forEach(button => {
      const active = button.dataset.sort === state.sort;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  async function searchCatalog({ append = false } = {}) {
    if (!append) state.page = 1;
    if (state.sort === 'nearest' && !append && !state.geo) {
      const gps = await requestGps();
      if (gps) state.geo = gps;
    }
    let geo = currentGeo();
    if (state.sort === 'nearest' && !geo) {
      state.sort = 'featured';
      toast('Chưa xác định được vị trí của bạn nên hiển thị theo mức độ nổi bật.');
    }
    renderSortTabs();
    const keyword = $('#catalogKeyword').value.trim();
    const params = new URLSearchParams({ city: state.city, sort: state.sort, pageSize: String(HOME_PAGE_SIZE), pageNumber: String(state.page) });
    if (keyword) params.set('keyword', keyword);
    if (state.catalogCategoryId) params.set('categoryId', String(state.catalogCategoryId));
    if (state.district) params.set('district', state.district);
    if (state.openNow) params.set('openNow', '1');
    if (state.sort === 'promo') params.set('promo', '1');
    for (const [key, value] of Object.entries(state.collection?.filter ?? {})) if (!['sort', 'categoryId'].includes(key)) params.set(key, value);
    geo = currentGeo();
    if (geo) { params.set('lat', String(geo.lat)); params.set('lng', String(geo.lng)); }
    const menuParams = new URLSearchParams({ city: state.city, sort: 'popular', pageSize: '12' });
    if (keyword) menuParams.set('keyword', keyword);
    if (state.catalogCategoryId) menuParams.set('categoryId', String(state.catalogCategoryId));
    try {
      const [restaurants, menu] = await Promise.all([
        api(`/api/catalog/restaurants?${params}`),
        append ? Promise.resolve(null) : api(`/api/catalog/menu-items?${menuParams}`)
      ]);
      state.restaurants = append ? [...state.restaurants, ...(restaurants.items || [])] : (restaurants.items || []);
      state.totalRestaurants = restaurants.totalItems ?? state.restaurants.length;
      renderRestaurants();
      renderActiveCollection();
      if (menu) renderMenuList(menu.items || []);
    } catch (error) {
      $('#restaurantList').innerHTML = errorBox(error);
      if (!append) $('#menuList').innerHTML = errorBox(error);
    }
  }

  function soldLabel(count) {
    const number = Number(count) || 0;
    return number >= 1000 ? `${(number / 1000).toFixed(1).replace('.0', '')}k` : String(number);
  }

  /** Giới hạn km giao hàng lấy từ cấu hình hệ thống (API storefront), không ghi cứng. */
  const maxDeliveryKm = () => state.storefront?.delivery?.maxKm ?? null;
  const tooFar = km => km != null && maxDeliveryKm() != null && Number(km) > maxDeliveryKm();

  function renderRestaurants() {
    const geo = currentGeo();
    $('#restaurantHeading').textContent = `${SORT_TITLES[state.sort] || 'Nhà hàng'} · ${state.city}`;
    $('#restaurantCount').textContent = `${state.totalRestaurants} địa điểm${state.catalogCategoryId ? ` · ${state.catalogCategoryName}` : ''}${state.district ? ` · ${state.district}` : ''}`;
    $('#geoNote').textContent = geo ? `Khoảng cách tính từ ${geo.label}` : '';
    $('#loadMoreRestaurants').hidden = state.restaurants.length >= state.totalRestaurants;
    if (!state.restaurants.length) {
      const hasPartners = state.cities.find(item => item.name === state.city)?.restaurantCount > 0;
      const fallbackCity = state.cities.find(item => item.restaurantCount && item.name !== state.city)?.name || '';
      $('#restaurantList').innerHTML = hasPartners
        ? empty()
        : `<div class="empty-state coming-soon"><strong>FoodGo chưa có quán tại ${escapeHtml(state.city)}</strong><span>Chúng tôi sẽ sớm có mặt.${fallbackCity ? ` Hiện bạn có thể đặt món tại ${escapeHtml(fallbackCity)}.` : ''}</span>${fallbackCity ? `<button class="primary-button" type="button" data-city="${escapeHtml(fallbackCity)}">Xem quán tại ${escapeHtml(fallbackCity)}</button>` : ''}</div>`;
      return;
    }
    $('#restaurantList').innerHTML = state.restaurants.map(item => `
      <article class="sf-row ${item.isOpen === false ? 'is-closed' : ''} ${tooFar(item.distanceKm) ? 'is-far' : ''}" data-view-restaurant="${item.id}" tabindex="0">
        ${photo(item.name, item.coverUrl || item.logoUrl, 'sf-thumb')}
        <div class="sf-row-body">
          <strong class="sf-name">${Number(item.rating) >= 4 ? '<i class="sf-verified" title="Quán được đánh giá từ 4★">✔</i>' : ''}${escapeHtml(item.name)}</strong>
          <span class="sf-addr">${escapeHtml([item.address, item.district].filter(Boolean).join(', '))}</span>
          <div class="sf-meta">
            <span>★ ${Number(item.rating || 0).toFixed(1)} <small>(${soldLabel(item.totalReviews)})</small></span>
            <span>Tối thiểu ${Math.round(Number(item.minimumOrder || 0) / 1000)}k</span>
            <span>⏱ ${item.averagePrepareTime || 20} phút</span>
            ${item.distanceKm != null ? `<span>📍 ${item.distanceKm} km</span>` : ''}
            ${tooFar(item.distanceKm) ? `<span class="sf-far-tag" title="Đơn có quãng đường trên ${maxDeliveryKm()} km không được giao">⛔ Ngoài phạm vi giao (&gt; ${maxDeliveryKm()} km)</span>` : ''}
          </div>
          <div class="sf-tags">
            ${(item.promotions || []).map(promo => `<span class="sf-tag" title="Mã ${escapeHtml(promo.code)}">${escapeHtml(promo.label)}${promo.minimumOrder ? ` · đơn từ ${Math.round(promo.minimumOrder / 1000)}K` : ''}</span>`).join('')}
            ${item.isOpen === false ? '<span class="sf-tag is-gray">Đã đóng cửa</span>' : ''}
          </div>
        </div>
      </article>
    `).join('');
    document.querySelectorAll('[data-view-restaurant]').forEach(card => {
      card.addEventListener('click', () => selectRestaurant(Number(card.dataset.viewRestaurant)));
      card.addEventListener('keydown', event => { if (event.key === 'Enter') selectRestaurant(Number(card.dataset.viewRestaurant)); });
    });
  }

  function bindHomeControls() {
    $('#cityPill').addEventListener('click', event => {
      event.stopPropagation();
      const panel = $('#cityPanel');
      panel.hidden = !panel.hidden;
      $('#cityPill').setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) { $('#citySearch').value = ''; renderCityList(); $('#citySearch').focus(); }
    });
    $('#citySearch').addEventListener('input', renderCityList);
    document.addEventListener('click', event => {
      const choice = event.target.closest('[data-city]');
      if (choice) { chooseCity(choice.dataset.city); return; }
      if (!event.target.closest('.city-picker')) { $('#cityPanel').hidden = true; $('#cityPill').setAttribute('aria-expanded', 'false'); }
    });
    $('#sortTabs').addEventListener('click', event => {
      const button = event.target.closest('[data-sort]');
      if (!button) return;
      state.sort = button.dataset.sort;
      searchCatalog();
    });
    $('#districtFilter').addEventListener('change', event => { state.district = event.target.value; searchCatalog(); });
    $('#openNowFilter').addEventListener('change', event => { state.openNow = event.target.checked; searchCatalog(); });
    $('#loadMoreRestaurants').addEventListener('click', () => { state.page += 1; searchCatalog({ append: true }); });
    $('#useGpsButton').addEventListener('click', async () => {
      const gps = await requestGps();
      if (!gps) { toast('Không lấy được vị trí. Hãy cho phép truy cập vị trí trong trình duyệt.'); return; }
      state.geo = gps;
      searchCatalog();
    });
  }

  function renderMenuList(items) {
    $('#menuCount').textContent = `${state.catalogCategoryName || 'Tất cả'} · top ${items.length} món tại ${state.city}`;
    $('#menuList').innerHTML = items.length ? items.map(item => `
      <article class="food-card" data-search-item-restaurant="${item.restaurantId}" tabindex="0">
        ${photo(item.name, item.imageUrl, 'food-card-photo', item.discountPrice ? '<span class="photo-chip chip-sale">Giảm giá</span>' : '')}
        <div class="card-body">
          <strong class="clamp-2">${escapeHtml(item.name)}</strong>
          <span class="muted clamp-1">${escapeHtml(item.restaurantName || '')}</span>
          ${ratingLine(item)}
          <div class="price-row">
            <span class="price">${money.format(Number(item.effectivePrice) || 0)}đ${item.discountPrice ? `<s>${money.format(Number(item.basePrice) || 0)}đ</s>` : ''}</span>
            <button class="add-button" type="button" aria-label="Xem menu">+</button>
          </div>
        </div>
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-search-item-restaurant]').forEach(card => {
      card.addEventListener('click', () => selectRestaurant(Number(card.dataset.searchItemRestaurant)));
    });
  }

  async function selectRestaurant(restaurantId) {
    try {
      const [detail, menu, reviews] = await Promise.all([
        api(`/api/catalog/restaurants/${restaurantId}`),
        api(`/api/catalog/restaurants/${restaurantId}/menu`),
        api(`/api/catalog/restaurants/${restaurantId}/reviews?pageSize=8`)
      ]);
      state.selectedRestaurant = detail;
      state.selectedMenu = flattenMenu(menu);
      state.selectedReviews = reviews.items || [];
      $('#selectedRestaurantTitle').textContent = detail.name;
      renderRestaurantDetail(detail, menu, reviews);
      showSubView('customer', 'detail');
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

  function renderRestaurantDetail(detail, menuResponse, reviewResponse = { items: [] }) {
    const menuSections = buildMenuSections(menuResponse);
    const open = detail.isOpen !== false;
    const hours = detail.openingTime && detail.closingTime ? `${String(detail.openingTime).slice(0, 5)} - ${String(detail.closingTime).slice(0, 5)}` : '';
    $('#restaurantDetail').innerHTML = `
      <div class="sf-store">
        <header class="sf-store-head">
          ${photo(detail.name, detail.coverUrl || detail.logoUrl, 'sf-store-photo')}
          <div class="sf-store-info">
            <h2>${Number(detail.rating) >= 4 ? '<i class="sf-verified" title="Quán được đánh giá từ 4★">✔</i>' : ''}${escapeHtml(detail.name)}</h2>
            <p class="sf-store-cat">${escapeHtml(detail.categoryName || 'Nhà hàng')} · ${escapeHtml([detail.address, detail.district, detail.city].filter(Boolean).join(', '))}</p>
            <p class="sf-store-meta">
              <span class="sf-open ${open ? 'is-open' : 'is-closed'}">${open ? 'Đang mở cửa' : 'Đã đóng cửa'}</span>
              ${hours ? `<span>🕒 ${hours}</span>` : ''}
              <span>★ ${Number(detail.rating || 0).toFixed(1)} (${soldLabel(detail.totalReviews)} đánh giá)</span>
              <span>${soldLabel(detail.totalOrders)} đơn</span>
              <span>Tối thiểu ${formatMoney(detail.minimumOrder)}</span>
            </p>
            <div class="shop-vouchers" id="shopVouchers"></div>
          </div>
          <button class="sf-fav" type="button" data-favorite-restaurant="${detail.id}">♡ Lưu quán</button>
        </header>
        ${open ? '' : `<div class="sf-closed-banner">Quán đang đóng cửa${hours ? ` — mở cửa lại trong khung giờ ${hours}` : ''}. Bạn vẫn có thể xem thực đơn, nhưng chưa thể đặt món lúc này.</div>`}
        <div class="sf-store-body">
          <nav class="sf-store-nav" aria-label="Nhóm món">
            ${menuSections.map(section => `<a href="#menu-section-${section.id}">${escapeHtml(section.name)} <small>${section.items.length}</small></a>`).join('')}
          </nav>
          <div class="sf-store-menu">
            ${menuSections.length ? menuSections.map(section => `
              <section class="sf-menu-section" id="menu-section-${section.id}">
                <h3>${escapeHtml(section.name)} <small>${section.items.length} món</small></h3>
                ${section.description ? `<p class="muted">${escapeHtml(section.description)}</p>` : ''}
                ${section.items.map(item => renderDetailMenuItem(item, detail.id)).join('')}
              </section>`).join('') : empty()}
            ${renderRestaurantReviews(detail, reviewResponse)}
          </div>
          <aside class="sf-store-cart" id="miniCart" aria-label="Giỏ hàng"></aside>
        </div>
      </div>
    `;
    document.querySelectorAll('[data-open-item]').forEach(button => {
      button.addEventListener('click', () => openItemModal(Number(button.dataset.openItem), detail.id));
    });
    loadShopVouchers(detail.id);
    renderMiniCart();
    document.querySelector('[data-favorite-restaurant]')?.addEventListener('click', () => toggleFavoriteRestaurant(detail.id));
    document.querySelector('[data-open-customer-orders]')?.addEventListener('click', () => {
      showSubView('customer', 'orders');
      loadCustomerOrders();
    });
  }

  /* Giỏ hàng nhỏ bên phải trang quán (kiểu ShopeeFood): xem nhanh, tăng/giảm, sang bước đặt hàng */
  function renderMiniCart() {
    const box = $('#miniCart');
    if (!box) return;
    if (!state.user || roleOf(state.user) !== 'CUSTOMER') {
      box.innerHTML = '<h4>Giỏ hàng</h4><p class="muted">Đăng nhập tài khoản khách hàng để thêm món vào giỏ.</p><button class="sf-order-btn" type="button" data-mini-login>Đăng nhập</button>';
      box.querySelector('[data-mini-login]').addEventListener('click', () => openAuth('login'));
      return;
    }
    const cart = state.cart;
    const here = Number(state.selectedRestaurant?.id);
    if (!cart || !cart.items?.length) {
      box.innerHTML = '<h4>Giỏ hàng</h4><div class="sf-cart-empty">🛒<span>Chưa có món nào. Bấm + để thêm món.</span></div>';
      return;
    }
    if (Number(cart.restaurantId) !== here) {
      box.innerHTML = `<h4>Giỏ hàng</h4><p class="muted">Bạn đang có ${cart.items.length} món của <b>${escapeHtml(cart.restaurantName)}</b>. Mỗi đơn chỉ đặt từ một quán.</p><button class="sf-order-btn" type="button" data-mini-open>Xem giỏ hàng</button>`;
      box.querySelector('[data-mini-open]').addEventListener('click', () => showSubView('customer', 'cart'));
      return;
    }
    box.innerHTML = `
      <h4>Giỏ hàng · ${escapeHtml(cart.restaurantName)}</h4>
      <ul class="sf-cart-lines">${cart.items.map(item => `
        <li><div class="sf-qty"><button type="button" data-mini-qty="${item.id}:${Math.max(0, item.quantity - 1)}" aria-label="Giảm">−</button><b>${item.quantity}</b><button type="button" data-mini-qty="${item.id}:${item.quantity + 1}" aria-label="Tăng">+</button></div>
          <div class="sf-cart-name"><strong>${escapeHtml(item.name)}</strong>
            <small>${[item.variantName, ...(item.toppings || []).map(topping => topping.name)].filter(Boolean).map(escapeHtml).join(', ')}</small>
            ${item.note ? `<small>📝 ${escapeHtml(item.note)}</small>` : ''}</div>
          <span>${formatMoney(item.lineTotal)}</span></li>`).join('')}</ul>
      <div class="sf-cart-total"><span>Tạm tính</span><b>${formatMoney(cart.subtotal)}</b></div>
      ${cart.subtotal < Number(cart.minimumOrder || 0) ? `<p class="quote-warn">Cần thêm ${formatMoney(cart.minimumOrder - cart.subtotal)} để đạt đơn tối thiểu.</p>` : ''}
      <button class="sf-order-btn" type="button" data-mini-open>Đặt hàng</button>`;
    box.querySelectorAll('[data-mini-qty]').forEach(button => button.addEventListener('click', () => {
      const [id, quantity] = button.dataset.miniQty.split(':').map(Number);
      if (quantity <= 0) removeCartItem(id); else updateCartItem(id, quantity);
    }));
    box.querySelector('[data-mini-open]').addEventListener('click', () => showSubView('customer', 'cart'));
  }

  function renderRestaurantReviews(detail, reviewResponse) {
    const reviews = reviewResponse?.items || [];
    return `
      <section class="reviews-panel">
        <div class="section-heading">
          <div>
            <p>Đánh giá khách hàng</p>
            <h3>${renderStars(detail.rating)} ${Number(detail.rating || 0).toFixed(1)}/5</h3>
            <span>${detail.totalReviews || reviews.length || 0} lượt đánh giá đã ghi nhận từ đơn đã giao</span>
          </div>
          <button class="secondary-button" type="button" data-open-customer-orders>Đánh giá từ đơn hàng</button>
        </div>
        <div class="review-list">
          ${reviews.length ? reviews.map(review => `
            <article class="review-card">
              <div>
                <strong>${escapeHtml(review.customerName || 'Khách hàng')}</strong>
                <span class="star-line">${renderStars(review.rating)} <small>${escapeHtml(new Date(review.createdAt).toLocaleDateString('vi-VN'))}</small></span>
              </div>
              <p>${escapeHtml(review.comment || 'Khách hàng chưa để lại bình luận.')}</p>
              ${review.restaurantReply ? `<blockquote>${escapeHtml(review.restaurantReply)}</blockquote>` : ''}
            </article>
          `).join('') : '<div class="empty-state">Quán chưa có bình luận hiển thị. Hãy đặt và đánh giá sau khi đơn được giao.</div>'}
        </div>
      </section>
    `;
  }

  function buildMenuSections(menuResponse) {
    const sections = [];
    (menuResponse || []).forEach(menu => {
      (menu.categories || []).forEach(category => {
        const items = category.items || [];
        if (!items.length) return;
        sections.push({
          id: `${menu.id}-${category.id}`,
          menuName: menu.name,
          name: category.name,
          description: category.description,
          items: items.map(item => ({ ...item, categoryName: category.name }))
        });
      });
      const uncategorized = menu.uncategorizedItems || [];
      if (uncategorized.length) {
        sections.push({
          id: `${menu.id}-uncategorized`,
          menuName: menu.name,
          name: 'Món khác',
          description: 'Các món chưa phân nhóm',
          items: uncategorized.map(item => ({ ...item, categoryName: 'Món khác' }))
        });
      }
    });
    return sections;
  }

  function renderDetailMenuItem(item, restaurantId) {
    return `
      <article class="sf-item" data-open-item="${item.id}" tabindex="0">
        <div class="sf-item-info">
          <strong>${item.isCombo ? '<em class="sf-badge">Combo</em> ' : ''}${escapeHtml(item.name)}</strong>
          ${item.description ? `<p class="clamp-2">${escapeHtml(item.description)}</p>` : ''}
          ${ratingLine(item)}
          <span class="muted">${item.preparationTime || 0} phút · đã bán ${soldLabel(item.soldCount)}</span>
          <div class="sf-price"><b>${formatMoney(item.effectivePrice)}</b>${item.discountPrice ? `<s>${formatMoney(item.basePrice)}</s>` : ''}${item.isCombo && item.savings ? `<em class="combo-save">Tiết kiệm ${formatMoney(item.savings)}</em>` : ''}</div>
          <input type="hidden" data-restaurant-for="${item.id}" value="${restaurantId}">
        </div>
        <div class="sf-item-side">
          ${photo(item.name, item.imageUrl, 'sf-item-photo')}
          <button class="sf-add" type="button" aria-label="Thêm ${escapeHtml(item.name)}">+</button>
        </div>
      </article>
    `;
  }

  function openItemModal(menuItemId, restaurantId = state.selectedRestaurant?.id) {
    const item = state.selectedMenu.find(value => Number(value.id) === Number(menuItemId));
    if (!item) return;
    state.selectedMenuItem = item;
    state.selectedMenuRestaurantId = restaurantId;
    $('#itemModalRestaurant').textContent = state.selectedRestaurant?.name || 'Món ăn';
    $('#itemModalTitle').textContent = item.name;
    $('#itemModalDescription').textContent = item.description || `${item.categoryName || 'Menu'} · ${item.preparationTime || 0} phút chuẩn bị`;
    $('#itemModalPrice').innerHTML = `<strong>${formatMoney(item.effectivePrice)}</strong>${item.discountPrice ? `<span>Giá gốc ${formatMoney(item.basePrice)}</span>` : ''}`;
    $('#itemModalMedia').innerHTML = `${photo(item.name, item.imageUrl, 'modal-photo')}`;
    $('#itemModalGallery').innerHTML = `<button type="button" class="gallery-chip" data-favorite-item="${item.id}">♡ Lưu món</button>`;
    $('#itemModalMeta').innerHTML = [
      Number(item.totalReviews) ? `<span>★ ${Number(item.rating).toFixed(1)} (${item.totalReviews})</span>` : '',
      `<span>⏱ ${item.preparationTime || 15} phút chuẩn bị</span>`,
      `<span>🛒 Đã bán ${item.soldCount || 0}</span>`,
      item.isAvailable === false ? '<span class="status-chip is-warn">Tạm hết</span>' : ''
    ].filter(Boolean).join('');
    renderComboBox(item);
    $('#itemVariantOptions').innerHTML = renderVariantOptions(item);
    $('#itemToppingOptions').innerHTML = renderToppingOptions(item);
    $('#itemNote').value = '';
    $('#itemNoteChips').innerHTML = noteSuggestions(item).map(text => `<button type="button" class="note-chip" data-note-chip="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('');
    $('#itemQuantity').value = '1';
    $('#itemFormError').hidden = true;
    updateItemSelection();
    loadItemReviews(item);
    $('.item-modal-body')?.scrollTo?.({ top: 0 });
    $('#itemModal').hidden = false;
    document.body.classList.add('modal-open');
    document.querySelectorAll('#itemModal [data-open-item]').forEach(button => {
      button.addEventListener('click', () => openItemModal(Number(button.dataset.openItem), restaurantId));
    });
    document.querySelector('#itemModal [data-favorite-item]')?.addEventListener('click', () => toggleFavoriteItem(item.id));
  }

  async function loadItemReviews(item) {
    const box = $('#itemReviews');
    if (!Number(item.totalReviews)) { box.innerHTML = '<p class="muted">Món này chưa có đánh giá.</p>'; return; }
    box.innerHTML = '<p class="muted">Đang tải đánh giá...</p>';
    try {
      const data = await api(`/api/catalog/menu-items/${item.id}/reviews?pageSize=4`);
      if (state.selectedMenuItem?.id !== item.id) return;
      const { average, total, distribution } = data.summary;
      box.innerHTML = `
        <div class="review-summary">
          <div class="review-score"><strong>${average.toFixed(1)}</strong><span>★</span><small>${total} đánh giá</small></div>
          <div class="review-bars">
            ${[5, 4, 3, 2, 1].map(star => `<div class="review-bar"><span>${star}★</span><i><b style="width:${total ? Math.round(distribution[star] * 100 / total) : 0}%"></b></i><em>${distribution[star]}</em></div>`).join('')}
          </div>
        </div>
        <ul class="review-list">
          ${data.items.map(review => `
            <li><div><b>${escapeHtml(review.customerName)}</b> <span class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span></div>
            ${review.comment ? `<p>${escapeHtml(review.comment)}</p>` : ''}</li>`).join('')}
        </ul>`;
    } catch {
      box.innerHTML = '';
    }
  }

  function closeItemModal() {
    $('#itemModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function renderVariantOptions(item) {
    const variants = item.variants || [];
    if (!variants.length) return '';
    return `
      <section class="option-box" data-option-group="variant">
        <strong>Chọn size <span class="status-chip is-info">Chọn 1</span></strong>
        <div class="topping-list">
          <label><input type="radio" name="itemVariant" value="" checked><span>Mặc định</span><b>${formatMoney(0)}</b></label>
          ${variants.map(variant => `
            <label><input type="radio" name="itemVariant" value="${variant.id}" data-price="${Number(variant.priceAdjustment) || 0}"><span>${escapeHtml(variant.name)}</span><b>${Number(variant.priceAdjustment) ? `+${formatMoney(variant.priceAdjustment)}` : formatMoney(0)}</b></label>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderToppingOptions(item) {
    const groups = item.toppingGroups || [];
    if (!groups.length) return '';
    return groups.map(group => {
      const toppings = group.toppings || [];
      const min = Number(group.minSelect || 0) || (group.required ? 1 : 0);
      const max = Math.max(min, Number(group.maxSelect || toppings.length) || toppings.length);
      const hint = min > 0 ? (min === max ? `Chọn ${min}` : `Chọn ${min}-${max}`) : `Tuỳ chọn · tối đa ${max}`;
      return `
        <section class="option-box" data-option-group="topping" data-group-id="${group.id}" data-group-name="${escapeHtml(group.name)}" data-min="${min}" data-max="${max}">
          <strong>${escapeHtml(group.name)} ${min > 0 ? '<span class="status-chip is-danger">Bắt buộc</span>' : '<span class="status-chip is-muted">Tuỳ chọn</span>'}</strong>
          <span class="muted group-hint">${hint} · <span data-group-count>đã chọn 0/${max}</span></span>
          <div class="topping-list">
            ${toppings.map(topping => `
              <label>
                <input type="checkbox" data-modal-topping="${topping.id}" data-price="${Number(topping.price) || 0}">
                <span>${escapeHtml(topping.name)}</span>
                <b>${Number(topping.price) ? `+${formatMoney(topping.price)}` : 'Miễn phí'}</b>
              </label>
            `).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  function noteSuggestions(item) {
    const text = `${item.categoryName || ''} ${item.name || ''}`.toLowerCase();
    return /uống|trà|cà phê|cafe|sinh tố|nước|sữa|smoothie|matcha|latte/.test(text)
      ? ['Ít đá', 'Không đá', 'Ít đường', 'Ít ngọt', 'Không ống hút']
      : ['Không hành', 'Không rau mùi', 'Ít cay', 'Không cay', 'Để riêng nước chấm'];
  }

  /* Đọc lựa chọn hiện tại trong modal món và tính đơn giá/thành tiền tức thời. */
  function readItemSelection() {
    const item = state.selectedMenuItem;
    const variantInput = document.querySelector('input[name="itemVariant"]:checked');
    const variantId = variantInput?.value ? Number(variantInput.value) : null;
    const toppingInputs = Array.from(document.querySelectorAll('[data-modal-topping]:checked'));
    const quantity = Math.min(20, Math.max(1, Math.floor(Number($('#itemQuantity').value) || 1)));
    const unitPrice = Number(item.effectivePrice || 0) + Number(variantInput?.dataset.price || 0)
      + toppingInputs.reduce((sum, input) => sum + Number(input.dataset.price || 0), 0);
    return { variantId, toppingIds: toppingInputs.map(input => Number(input.dataset.modalTopping)), quantity, unitPrice, note: $('#itemNote').value.trim() };
  }

  function updateItemSelection(changed) {
    document.querySelectorAll('#itemToppingOptions [data-option-group="topping"]').forEach(group => {
      const max = Number(group.dataset.max);
      const boxes = Array.from(group.querySelectorAll('[data-modal-topping]'));
      // Nhóm chọn 1: chọn món mới thì bỏ món cũ (giống radio nhưng nhóm tuỳ chọn vẫn cho bỏ chọn).
      if (changed && max === 1 && changed.checked && boxes.includes(changed)) boxes.forEach(box => { if (box !== changed) box.checked = false; });
      const count = boxes.filter(box => box.checked).length;
      boxes.forEach(box => { box.disabled = !box.checked && count >= max; });
      group.querySelector('[data-group-count]').textContent = `đã chọn ${count}/${max}`;
      if (count >= Number(group.dataset.min)) group.classList.remove('has-error');
    });
    const quantityInput = $('#itemQuantity');
    quantityInput.value = String(Math.min(20, Math.max(1, Math.floor(Number(quantityInput.value) || 1))));
    const { unitPrice, quantity, note } = readItemSelection();
    $('#itemSubmit').textContent = `Thêm vào giỏ · ${formatMoney(unitPrice * quantity)}`;
    $('#itemNoteCount').textContent = `${note.length}/200`;
  }

  function validateItemSelection() {
    for (const group of document.querySelectorAll('#itemToppingOptions [data-option-group="topping"]')) {
      const count = group.querySelectorAll('[data-modal-topping]:checked').length;
      const min = Number(group.dataset.min);
      if (count < min) {
        group.classList.add('has-error');
        group.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        return `Vui lòng chọn ${min > 1 ? `ít nhất ${min} lựa chọn` : '1 lựa chọn'} cho "${group.dataset.groupName}".`;
      }
    }
    return null;
  }

  function bindItemModalControls() {
    $('#itemOptionForm').addEventListener('change', event => updateItemSelection(event.target));
    $('#itemNote').addEventListener('input', () => updateItemSelection());
    $('#itemQuantity').addEventListener('input', () => updateItemSelection());
    $('#itemQtyMinus').addEventListener('click', () => { $('#itemQuantity').value = String(Number($('#itemQuantity').value) - 1); updateItemSelection(); });
    $('#itemQtyPlus').addEventListener('click', () => { $('#itemQuantity').value = String(Number($('#itemQuantity').value) + 1); updateItemSelection(); });
    $('#itemNoteChips').addEventListener('click', event => {
      const chip = event.target.closest('[data-note-chip]');
      if (!chip) return;
      const noteInput = $('#itemNote');
      const parts = noteInput.value.split(',').map(part => part.trim()).filter(Boolean);
      const text = chip.dataset.noteChip;
      const next = parts.includes(text) ? parts.filter(part => part !== text) : [...parts, text];
      noteInput.value = next.join(', ').slice(0, 200);
      chip.classList.toggle('is-active', next.includes(text));
      updateItemSelection();
    });
  }

  async function addSelectedItemToCart(event) {
    event.preventDefault();
    const item = state.selectedMenuItem;
    if (!item) return;
    if (!state.user || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để thêm món vào giỏ.', true);
      return;
    }
    const errorBox = $('#itemFormError');
    const problem = validateItemSelection();
    errorBox.hidden = !problem;
    errorBox.textContent = problem || '';
    if (problem) return;
    const { variantId, quantity, toppingIds, note } = readItemSelection();
    try {
      state.cart = await api('/api/customer/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: Number(state.selectedMenuRestaurantId),
          menuItemId: Number(item.id),
          variantId,
          quantity,
          toppingIds,
          note: note || undefined
        })
      });
      renderCart();
      closeItemModal();
      setStatus('Đã thêm món vào giỏ hàng.');
      showSubView('customer', 'cart');
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = error.message;
    }
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
      showSubView('customer', 'cart');
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
      ? `${selected.addressLine}${selected.district ? `, ${selected.district}` : ''}`
      : (state.user ? 'Thêm địa chỉ giao hàng' : 'Chọn địa chỉ giao hàng');
    $('#checkoutAddress').innerHTML = state.addresses.length
      ? state.addresses.map(item => `<option value="${item.id}" ${item.isDefault ? 'selected' : ''}>${escapeHtml(item.label || 'Địa chỉ')} · ${escapeHtml(item.addressLine)}</option>`).join('')
      : '<option value="">Chưa có địa chỉ</option>';
  }

  async function createAddress(event) {
    event.preventDefault();
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để thêm địa chỉ.', true);
      return;
    }
    try {
      const address = await api('/api/customer/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: 'Nhà riêng',
          receiverName: $('#addressReceiverName').value.trim(),
          receiverPhone: $('#addressReceiverPhone').value.trim(),
          addressLine: $('#addressLine').value.trim(),
          ward: $('#addressWard').value.trim() || null,
          district: $('#addressDistrict').value.trim() || null,
          city: $('#addressCity').value.trim() || state.city,
          isDefault: state.addresses.length === 0
        })
      });
      state.addresses = [address, ...state.addresses.filter(item => item.id !== address.id)];
      renderAddresses();
      $('#checkoutAddress').value = String(address.id);
      $('#addressForm').reset();
      $('#addressCity').value = state.city;
      setStatus('Đã lưu địa chỉ giao hàng.');
    } catch (error) {
      setStatus(error.message, true);
    }
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

  function updateCartBadge() {
    const badge = $('#cartBadge');
    if (!badge) return;
    const count = (state.cart?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = !count;
  }

  /* ===== Ưu đãi: voucher, báo giá giỏ hàng, điểm thưởng, combo ===== */
  const SCOPE_LABELS = { PLATFORM: 'Toàn sàn', RESTAURANT: 'Của quán', PERSONAL: 'Của tôi' };

  function kLabel(value) { return `${Math.round(Number(value) / 1000)}K`; }

  function voucherValue(voucher) {
    return voucher.discountType === 'PERCENT' ? `${voucher.discountValue}%` : voucher.discountType === 'FREE_DELIVERY' ? 'FREESHIP' : kLabel(voucher.discountValue);
  }

  function voucherConditions(voucher) {
    const parts = [`Đơn từ ${formatMoney(voucher.minimumOrder)}`];
    if (voucher.discountType === 'PERCENT' && voucher.maxDiscount) parts.push(`giảm tối đa ${formatMoney(voucher.maxDiscount)}`);
    if (voucher.discountType === 'FREE_DELIVERY' && voucher.maxDiscount) parts.push(`giảm phí giao tối đa ${formatMoney(voucher.maxDiscount)}`);
    if (voucher.firstOrderOnly) parts.push('chỉ đơn đầu tiên');
    return parts.join(' · ');
  }

  function voucherExpiry(endAt) {
    return new Date(endAt).getFullYear() >= 2090 ? 'Không giới hạn thời gian' : `HSD ${new Date(endAt).toLocaleDateString('vi-VN')}`;
  }

  function voucherTicket(voucher, action = '') {
    return `
      <article class="voucher-ticket ${voucher.eligible === false ? 'is-disabled' : ''}">
        <div class="vt-left scope-${voucher.scope}"><strong>${escapeHtml(voucherValue(voucher))}</strong><small>${SCOPE_LABELS[voucher.scope] || ''}</small></div>
        <div class="vt-body">
          <b>${escapeHtml(voucher.name)}</b>
          <span>${escapeHtml(voucherConditions(voucher))}</span>
          <span class="muted">${voucher.restaurantName ? `${escapeHtml(voucher.restaurantName)} · ` : ''}${escapeHtml(voucherExpiry(voucher.endAt))} · Mã <code>${escapeHtml(voucher.code)}</code></span>
          ${voucher.eligible === false ? `<span class="vt-short">Mua thêm ${formatMoney(voucher.shortfall)} để dùng</span>` : ''}
          ${action}
        </div>
      </article>`;
  }

  async function loadQuote() {
    const box = $('#cartQuote');
    if (!box || !state.cart?.restaurantId) return;
    try {
      const quote = await api('/api/customer/orders/quote', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: state.cart.restaurantId,
          addressId: Number($('#checkoutAddress').value) || undefined,
          promotionCode: $('#promotionCode').value.trim() || undefined
        })
      });
      state.quote = quote;
      renderQuote(quote);
    } catch {
      box.innerHTML = `<div class="fee-row"><span>Tạm tính</span><b>${formatMoney(state.cart.subtotal)}</b></div>`;
    }
  }

  function renderQuote(quote) {
    const hints = [];
    if (quote.freeshipHint) {
      const percent = Math.min(100, Math.round(quote.subtotal * 100 / quote.freeshipHint.minimumOrder));
      hints.push(`<div class="quote-hint"><span>🛵 Mua thêm <b>${formatMoney(quote.freeshipHint.shortfall)}</b> để được freeship (đơn từ ${formatMoney(quote.freeshipHint.minimumOrder)})</span><i><b style="width:${percent}%"></b></i></div>`);
    }
    if (quote.discountHint) {
      hints.push(`<div class="quote-hint"><span>🎟️ Mua thêm <b>${formatMoney(quote.discountHint.shortfall)}</b> để dùng mã <code>${escapeHtml(quote.discountHint.code)}</code> (tiết kiệm ${formatMoney(quote.discountHint.discountAmount)})</span></div>`);
    }
    const voucherRow = quote.promotion
      ? `<button class="voucher-row is-applied" type="button" id="openVouchersButton"><span>🎟️ <b>${escapeHtml(quote.promotion.code)}</b> · ${escapeHtml(quote.promotion.name)}</span><span>Đổi ›</span></button>`
      : quote.bestVoucher
        ? `<div class="voucher-row"><span>🎟️ Gợi ý: <b>${escapeHtml(quote.bestVoucher.code)}</b> tiết kiệm ${formatMoney(quote.bestVoucher.discountAmount)}</span><span><button class="text-button" type="button" data-apply-code="${escapeHtml(quote.bestVoucher.code)}">Áp dụng</button> · <button class="text-button" type="button" id="openVouchersButton">Xem tất cả</button></span></div>`
        : '<button class="voucher-row" type="button" id="openVouchersButton"><span>🎟️ Chọn hoặc nhập mã giảm giá</span><span>›</span></button>';
    const warnings = [
      quote.promotionError ? `<div class="quote-warn">${escapeHtml(quote.promotionError)}</div>` : '',
      !quote.meetsMinimum ? `<div class="quote-warn">Quán yêu cầu đơn tối thiểu ${formatMoney(quote.minimumOrder)}.</div>` : '',
      quote.outOfRange ? `<div class="quote-warn">⛔ Địa chỉ cách quán ${quote.distanceKm} km, vượt giới hạn giao hàng ${quote.maxDeliveryKm} km — đơn này không được giao. Hãy chọn địa chỉ gần hơn hoặc quán khác.</div>` : ''
    ].join('');
    $('#cartQuote').innerHTML = `
      ${hints.join('')}${voucherRow}${warnings}
      <div class="fee-row"><span>Tạm tính</span><b>${formatMoney(quote.subtotal)}</b></div>
      <div class="fee-row"><span>Phí giao hàng${quote.distanceKm != null ? ` (${quote.distanceKm} km)` : ''}</span><b>${formatMoney(quote.deliveryFee)}</b></div>
      ${quote.discountAmount ? `<div class="fee-row is-discount"><span>Giảm giá</span><b>−${formatMoney(quote.discountAmount)}</b></div>` : ''}
      <div class="fee-row is-total"><span>Tổng cộng</span><b>${formatMoney(quote.totalAmount)}</b></div>
      ${quote.pointsToEarn ? `<small class="muted">⭐ Bạn sẽ nhận +${quote.pointsToEarn} điểm khi đơn giao thành công.</small>` : ''}`;
    const placeOrder = $('#checkoutForm [type="submit"]');
    if (placeOrder) { placeOrder.disabled = Boolean(quote.outOfRange); placeOrder.title = quote.outOfRange ? 'Địa chỉ ngoài phạm vi giao hàng' : ''; }
    $('#openVouchersButton')?.addEventListener('click', openVoucherModal);
    document.querySelectorAll('[data-apply-code]').forEach(button => button.addEventListener('click', () => applyVoucherCode(button.dataset.applyCode)));
  }

  function applyVoucherCode(code) {
    $('#promotionCode').value = code;
    closeVoucherModal();
    loadQuote();
  }

  async function openVoucherModal() {
    if (!state.cart?.restaurantId) return;
    $('#voucherModal').hidden = false;
    document.body.classList.add('modal-open');
    const body = $('#voucherModalBody');
    body.innerHTML = '<p class="muted">Đang tải voucher...</p>';
    try {
      const addressId = Number($('#checkoutAddress').value) || '';
      const result = await api(`/api/customer/vouchers?restaurantId=${state.cart.restaurantId}${addressId ? `&addressId=${addressId}` : ''}`);
      const usable = result.items.filter(item => item.eligible);
      const locked = result.items.filter(item => !item.eligible);
      body.innerHTML = `
        <form class="voucher-code-form" id="voucherCodeForm"><input id="voucherCodeInput" placeholder="Nhập mã giảm giá" maxlength="50" autocomplete="off"><button class="primary-button" type="submit">Áp dụng</button></form>
        <h4>Dùng được ngay (${usable.length})</h4>
        ${usable.length ? usable.map(item => voucherTicket(item, `<button class="primary-button compact-button" type="button" data-use-voucher="${escapeHtml(item.code)}">Dùng · tiết kiệm ${formatMoney(item.discountAmount)}</button>`)).join('') : '<p class="muted">Chưa có voucher phù hợp với giỏ hàng này.</p>'}
        ${locked.length ? `<h4>Chưa đủ điều kiện (${locked.length})</h4>${locked.map(item => voucherTicket(item)).join('')}` : ''}`;
      body.querySelectorAll('[data-use-voucher]').forEach(button => button.addEventListener('click', () => applyVoucherCode(button.dataset.useVoucher)));
      $('#voucherCodeForm').addEventListener('submit', event => {
        event.preventDefault();
        const code = $('#voucherCodeInput').value.trim().toUpperCase();
        if (code) applyVoucherCode(code);
      });
    } catch (error) {
      body.innerHTML = errorBox(error);
    }
  }

  function closeVoucherModal() {
    $('#voucherModal').hidden = true;
    if ($('#itemModal').hidden) document.body.classList.remove('modal-open');
  }

  async function loadOffers() {
    const box = $('#offersContent');
    if (!state.user || roleOf(state.user) !== 'CUSTOMER') {
      box.innerHTML = '<div class="empty-state">Đăng nhập tài khoản khách hàng để xem voucher và điểm thưởng.</div>';
      return;
    }
    box.innerHTML = '<p class="muted">Đang tải ưu đãi...</p>';
    try {
      const [loyalty, vouchers] = await Promise.all([api('/api/customer/loyalty'), api('/api/customer/vouchers')]);
      const mine = vouchers.items.filter(item => item.scope === 'PERSONAL');
      const platform = vouchers.items.filter(item => item.scope === 'PLATFORM');
      const shops = vouchers.items.filter(item => item.scope === 'RESTAURANT');
      box.innerHTML = `
        <section class="loyalty-card">
          <div><small>Điểm thưởng của bạn</small><strong>${Number(loyalty.points).toLocaleString('vi-VN')}</strong><span>điểm</span></div>
          <p>${escapeHtml(loyalty.earnRule)}.<br>Đã tích ${Number(loyalty.earnedTotal).toLocaleString('vi-VN')} · đã đổi ${Number(loyalty.redeemedTotal).toLocaleString('vi-VN')} điểm.</p>
        </section>
        <h4>🎁 Đổi điểm lấy quà</h4>
        <div class="reward-grid">${loyalty.rewards.map(reward => `
          <article class="reward-card">
            <b>${escapeHtml(reward.name)}</b>
            <span class="muted">${escapeHtml(reward.description || '')} · dùng trong ${reward.validDays} ngày</span>
            <button class="${reward.canRedeem ? 'primary-button' : 'secondary-button'} compact-button" type="button" data-redeem="${reward.id}" ${reward.canRedeem ? '' : 'disabled'}>
              ${reward.canRedeem ? `Đổi · ${reward.pointsCost.toLocaleString('vi-VN')} điểm` : `Cần thêm ${reward.missingPoints.toLocaleString('vi-VN')} điểm`}</button>
          </article>`).join('') || '<p class="muted">Hiện chưa có quà đổi điểm.</p>'}</div>
        ${mine.length ? `<h4>🎟️ Voucher của tôi (${mine.length})</h4><div class="voucher-grid">${mine.map(item => voucherTicket(item)).join('')}</div>` : ''}
        <h4>🌐 Voucher toàn sàn (${platform.length})</h4>
        <div class="voucher-grid">${platform.map(item => voucherTicket(item)).join('') || '<p class="muted">Chưa có voucher toàn sàn.</p>'}</div>
        <h4>🏪 Voucher của các quán (${shops.length})</h4>
        <div class="voucher-grid">${shops.slice(0, 12).map(item => voucherTicket(item)).join('')}</div>
        ${shops.length > 12 ? `<p class="muted">Và ${shops.length - 12} voucher khác, xem trong trang từng quán.</p>` : ''}
        <h4>Lịch sử điểm</h4>
        <ul class="point-history">${loyalty.history.map(row => `<li><span>${escapeHtml(row.description || row.type)}<small class="muted"> · ${escapeHtml(new Date(row.createdAt).toLocaleString('vi-VN'))}</small></span><b class="${row.points < 0 ? 'neg' : 'pos'}">${row.points > 0 ? '+' : ''}${row.points}</b></li>`).join('') || '<li class="muted">Chưa có giao dịch điểm.</li>'}</ul>`;
      box.querySelectorAll('[data-redeem]').forEach(button => button.addEventListener('click', () => redeemReward(Number(button.dataset.redeem))));
    } catch (error) {
      box.innerHTML = errorBox(error);
    }
  }

  async function redeemReward(rewardId) {
    try {
      const result = await api(`/api/customer/loyalty/rewards/${rewardId}/redeem`, { method: 'POST', body: JSON.stringify({}) });
      setStatus(`Đã đổi "${result.name}". Mã ${result.code} có hiệu lực ${result.validDays} ngày. Còn ${result.pointsLeft} điểm.`);
      loadOffers();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadShopVouchers(restaurantId) {
    const box = $('#shopVouchers');
    if (!box) return;
    try {
      const result = await api(`/api/catalog/promotions?restaurantId=${restaurantId}`);
      const items = (result.items || []).filter(item => item.restaurantId === restaurantId).slice(0, 4);
      const freeship = (result.items || []).filter(item => item.restaurantId === null && item.discountType === 'FREE_DELIVERY').slice(0, 1);
      const chips = [...items, ...freeship];
      box.innerHTML = chips.length
        ? chips.map(item => `<button type="button" class="shop-voucher" data-copy-code="${escapeHtml(item.code)}" title="Bấm để sao chép mã"><b>${escapeHtml(voucherValue(item))}</b><span>${escapeHtml(item.name)}<small>Đơn từ ${formatMoney(item.minimumOrder)} · Mã ${escapeHtml(item.code)}</small></span></button>`).join('')
        : '';
      box.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', () => {
        navigator.clipboard?.writeText(button.dataset.copyCode).catch(() => null);
        toast(`Đã sao chép mã ${button.dataset.copyCode}. Dán vào ô mã giảm giá ở giỏ hàng.`);
      }));
    } catch {
      box.innerHTML = '';
    }
  }

  function renderComboBox(item) {
    const box = $('#itemCombo');
    if (!item.isCombo || !item.components?.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = `
      <strong>🍱 Combo gồm</strong>
      <ul>${item.components.map(part => `<li><span>${part.quantity} × ${escapeHtml(part.name)}</span><b>${formatMoney(part.unitPrice * part.quantity)}</b></li>`).join('')}</ul>
      <div class="combo-total"><span>Mua lẻ ${formatMoney(item.originalPrice)}</span><b>Combo ${formatMoney(item.effectivePrice)} · tiết kiệm ${formatMoney(item.savings)}</b></div>`;
  }

  function renderCart() {
    updateCartBadge();
    renderMiniCart();
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
          ${(item.toppings || []).length ? `<span class="muted">${item.toppings.map(topping => `${escapeHtml(topping.name)}${Number(topping.price) ? ` +${formatMoney(topping.price)}` : ''}`).join(' · ')}</span>` : ''}
          <input class="cart-note" data-cart-note="${item.id}" maxlength="200" value="${escapeHtml(item.note || '')}" placeholder="Thêm ghi chú cho quán (không hành, ít cay...)" aria-label="Ghi chú món ${escapeHtml(item.name)}">
        </div>
        <div class="cart-actions">
          <b>${formatMoney(item.lineTotal)}</b>
          <button class="icon-button" type="button" data-cart-qty="${item.id}:${Math.max(1, item.quantity - 1)}">−</button>
          <button class="icon-button" type="button" data-cart-qty="${item.id}:${item.quantity + 1}">+</button>
          <button class="text-button danger-text" type="button" data-cart-remove="${item.id}">Xóa</button>
        </div>
      </div>
    `).join('');
    const fees = `
      <div id="cartQuote" class="cart-quote"><div class="fee-row"><span>Tạm tính</span><b>${formatMoney(cart.subtotal)}</b></div></div>
      <button class="secondary-button" type="button" id="clearCartButton">Xóa toàn bộ giỏ</button>
    `;
    $('#cartItems').innerHTML = rows + fees;
    bindCartActions();
    loadQuote();
  }

  function bindCartActions() {
    document.querySelectorAll('[data-cart-qty]').forEach(button => {
      button.addEventListener('click', () => {
        const [id, quantity] = button.dataset.cartQty.split(':');
        updateCartItem(id, Number(quantity));
      });
    });
    document.querySelectorAll('[data-cart-remove]').forEach(button => {
      button.addEventListener('click', () => removeCartItem(button.dataset.cartRemove));
    });
    $('#clearCartButton')?.addEventListener('click', clearCart);
    document.querySelectorAll('[data-cart-note]').forEach(input => {
      input.addEventListener('change', () => updateCartItemNote(input.dataset.cartNote, input.value.trim()));
    });
  }

  async function updateCartItemNote(cartItemId, note) {
    try {
      state.cart = await api(`/api/customer/cart/items/${cartItemId}`, { method: 'PATCH', body: JSON.stringify({ note }) });
      setStatus(note ? 'Đã lưu ghi chú món.' : 'Đã xoá ghi chú món.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function updateCartItem(cartItemId, quantity) {
    try {
      state.cart = await api(`/api/customer/cart/items/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity })
      });
      renderCart();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function removeCartItem(cartItemId) {
    try {
      await api(`/api/customer/cart/items/${cartItemId}`, { method: 'DELETE' });
      await loadCart();
      setStatus('Đã xóa món khỏi giỏ.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function clearCart() {
    if (!state.cart?.restaurantId) return;
    try {
      await api(`/api/customer/cart/${state.cart.restaurantId}`, { method: 'DELETE' });
      state.cart = null;
      renderCart();
      setStatus('Đã xóa toàn bộ giỏ.');
    } catch (error) {
      setStatus(error.message, true);
    }
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
          customerNote: $('#customerNote').value.trim() || undefined,
          shipperNote: $('#shipperNote').value.trim() || undefined,
          needUtensils: $('#needUtensils').checked,
          contactlessDelivery: $('#contactlessDelivery').checked
        })
      });
      state.cart = null;
      ['#customerNote', '#shipperNote', '#promotionCode'].forEach(selector => { $(selector).value = ''; });
      $('#needUtensils').checked = true;
      $('#contactlessDelivery').checked = false;
      renderCart();
      setStatus(`Đã tạo đơn ${order.orderCode} · Tổng ${formatMoney(order.totalAmount)}`);
      await loadCustomerOrders();
      showSubView('customer', 'orders');
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
        <button class="secondary-button" type="button" data-view-order="${order.id}">Xem chi tiết</button>
        ${['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status) && can('order.cancel') ? `<button type="button" data-cancel-order="${order.id}">Hủy đơn</button>` : ''}
      </article>
    `;
  }

  function bindCustomerOrderActions() {
    document.querySelectorAll('[data-cancel-order]').forEach(button => {
      button.addEventListener('click', () => cancelOrder(button.dataset.cancelOrder));
    });
    document.querySelectorAll('[data-view-order]').forEach(button => {
      button.addEventListener('click', () => viewCustomerOrder(button.dataset.viewOrder));
    });
  }

  async function createInvoice(orderId) {
    try {
      const invoice = await api(`/api/payments/orders/${orderId}/invoice`, { method: 'POST' });
      setStatus(`Đã tạo hóa đơn ${invoice.invoiceNumber}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createReview(orderId, target) {
    const rating = Number(window.prompt(`Chấm điểm ${target === 'shipper' ? 'tài xế' : 'nhà hàng'} từ 1 đến 5`, '5'));
    if (!rating) return;
    const comment = window.prompt('Nhập nhận xét ngắn', 'Dịch vụ tốt');
    try {
      await api(`/api/communications/orders/${orderId}/${target === 'shipper' ? 'shipper-review' : 'restaurant-review'}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined })
      });
      setStatus('Đã gửi đánh giá.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function openSupportForOrder(orderId, orderCode) {
    showSubView('customer', 'support');
    $('#supportOrderId').value = String(orderId);
    $('#supportSubject').value = `Vấn đề với đơn ${orderCode || `#${orderId}`}`;
    $('#supportDescription').focus();
  }

  async function viewCustomerOrder(orderId) {
    try {
      state.selectedOrder = await api(`/api/customer/orders/${orderId}`);
      renderOrderDetail(state.selectedOrder);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function renderOrderItemExtras(item) {
    const toppings = (item.toppings || []).map(topping => `${escapeHtml(topping.name)}${Number(topping.quantity) > 1 ? ` ×${topping.quantity}` : ''}`).join(', ');
    return `${toppings ? `<span class="muted">+ ${toppings}</span>` : ''}${item.note ? `<span class="note-line">📝 ${escapeHtml(item.note)}</span>` : ''}`;
  }

  function renderOrderPreferences(order) {
    const lines = [
      order.customerNote ? `📝 Ghi chú cho quán: ${escapeHtml(order.customerNote)}` : '',
      order.shipperNote ? `🛵 Ghi chú cho tài xế: ${escapeHtml(order.shipperNote)}` : '',
      order.needUtensils === false ? '🚫 Không lấy dụng cụ ăn uống' : '🥢 Có dụng cụ ăn uống',
      order.contactlessDelivery ? '📦 Giao không tiếp xúc' : ''
    ].filter(Boolean);
    return `<div class="order-prefs">${lines.map(line => `<span>${line}</span>`).join('')}</div>`;
  }

  function renderOrderDetail(order) {
    $('#customerOrders').innerHTML = `
      <article class="order-card order-detail-card">
        <button class="text-button" type="button" id="backToOrdersButton">← Quay lại danh sách</button>
        <strong>${escapeHtml(order.orderCode)} · ${escapeHtml(statusLabel(order.status))}</strong>
        <span>${escapeHtml(order.restaurantName)} · ${escapeHtml(paymentLabel(order.paymentMethod))} · ${escapeHtml(statusLabel(order.paymentStatus))}</span>
        <span>Giao đến: ${escapeHtml(order.receiverName || '')} · ${escapeHtml(order.deliveryAddress || '')}</span>
        <div class="cart-list">
          ${(order.items || []).map(item => `
            <div class="cart-row">
              <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${item.variantName ? `${escapeHtml(item.variantName)} · ` : ''}SL ${item.quantity}</span>${renderOrderItemExtras(item)}</div>
              <b>${formatMoney(item.totalPrice)}</b>
            </div>
          `).join('')}
        </div>
        ${renderOrderPreferences(order)}
        <div class="fee-row"><span>Tạm tính</span><b>${formatMoney(order.subtotal)}</b></div>
        <div class="fee-row"><span>Phí giao</span><b>${formatMoney(order.deliveryFee)}</b></div>
        <div class="fee-row"><span>Tổng thanh toán</span><b>${formatMoney(order.totalAmount)}</b></div>
        <div class="timeline">
          ${(order.statusHistory || []).filter((step, index, all) => index === 0 || step.newStatus !== all[index - 1].newStatus).map(step => `<span>${escapeHtml(statusLabel(step.newStatus))} · ${escapeHtml(new Date(step.createdAt).toLocaleString('vi-VN'))}</span>`).join('')}
        </div>
        <div class="button-row">
          <button class="secondary-button" type="button" data-support-order="${order.id}">Báo vấn đề</button>
        </div>
        ${renderOrderReviewForms(order)}
      </article>
    `;
    $('#backToOrdersButton').addEventListener('click', loadCustomerOrders);
    document.querySelector('[data-create-invoice]')?.addEventListener('click', () => createInvoice(order.id));
    document.querySelector('[data-review-restaurant]')?.addEventListener('click', () => createReview(order.id, 'restaurant'));
    document.querySelector('[data-review-shipper]')?.addEventListener('click', () => createReview(order.id, 'shipper'));
    document.querySelector('[data-support-order]')?.addEventListener('click', () => openSupportForOrder(order.id, order.orderCode));
    document.querySelectorAll('[data-review-form]').forEach(form => {
      form.addEventListener('submit', event => submitReviewForm(event, order.id, form.dataset.reviewForm));
    });
    window.FDLive?.onCustomerOrder(order);
  }

  function renderOrderReviewForms(order) {
    const disabledNote = order.status !== 'DELIVERED'
      ? '<span class="muted">Chỉ gửi đánh giá khi đơn đã giao thành công.</span>'
      : '';
    return `
      <div class="review-form-grid">
        ${['restaurant', 'shipper'].map(target => `
          <form class="stacked-form compact-form review-form" data-review-form="${target}">
            <strong>${target === 'shipper' ? 'Đánh giá tài xế' : 'Đánh giá nhà hàng'}</strong>
            ${disabledNote}
            <label>Số sao
              <select name="rating" ${order.status !== 'DELIVERED' ? 'disabled' : ''}>
                <option value="5">5 sao - Rất hài lòng</option>
                <option value="4">4 sao - Tốt</option>
                <option value="3">3 sao - Tạm ổn</option>
                <option value="2">2 sao - Chưa tốt</option>
                <option value="1">1 sao - Không hài lòng</option>
              </select>
            </label>
            <label>Bình luận <textarea name="comment" rows="2" ${order.status !== 'DELIVERED' ? 'disabled' : ''} placeholder="Nhập nhận xét thực tế về món, đóng gói, giao hàng..."></textarea></label>
            <button class="secondary-button" type="submit" ${order.status !== 'DELIVERED' ? 'disabled' : ''}>Gửi đánh giá</button>
          </form>
        `).join('')}
      </div>
    `;
  }

  async function submitReviewForm(event, orderId, target) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api(`/api/communications/orders/${orderId}/${target === 'shipper' ? 'shipper-review' : 'restaurant-review'}`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(data.get('rating')),
          comment: String(data.get('comment') || '').trim() || undefined
        })
      });
      form.reset();
      setStatus('Đã gửi đánh giá sao và bình luận.');
    } catch (error) {
      setStatus(error.message, true);
    }
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

  async function validatePromotionCode() {
    if (!state.cart?.restaurantId) {
      setStatus('Cần có giỏ hàng trước khi kiểm tra mã.', true);
      return;
    }
    const code = $('#promotionCode').value.trim();
    if (!code) {
      setStatus('Bạn chưa nhập mã khuyến mãi.', true);
      return;
    }
    try {
      const promotion = await api(`/api/customer/promotions/${state.cart.restaurantId}/validate`, {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: state.cart.subtotal || 0 })
      });
      const value = promotion.discountType === 'FREE_DELIVERY'
        ? 'miễn phí giao hàng'
        : promotion.discountType === 'PERCENT'
          ? `giảm ${promotion.discountValue}%`
          : `giảm ${formatMoney(promotion.discountValue)}`;
      setStatus(`Mã ${promotion.code} hợp lệ: ${value}.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function toggleFavoriteRestaurant(restaurantId) {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để lưu yêu thích.', true);
      return;
    }
    try {
      const result = await api(`/api/customer/favorites/restaurants/${restaurantId}`, { method: 'POST' });
      setStatus(result.isFavorite ? 'Đã lưu nhà hàng vào yêu thích.' : 'Đã bỏ lưu nhà hàng.');
      await loadFavorites();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function toggleFavoriteItem(itemId) {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để lưu món.', true);
      return;
    }
    try {
      const result = await api(`/api/customer/favorites/menu-items/${itemId}`, { method: 'POST' });
      setStatus(result.isFavorite ? 'Đã lưu món vào yêu thích.' : 'Đã bỏ lưu món.');
      await loadFavorites();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadFavorites() {
    if (!state.token || roleOf(state.user) !== 'CUSTOMER') return;
    const node = $('#favoritePanel');
    if (!node) return;
    try {
      const result = await api('/api/customer/favorites');
      const restaurants = result.restaurants || [];
      const menuItems = result.menuItems || [];
      node.innerHTML = `
        <article class="order-card"><strong>${restaurants.length} nhà hàng đã lưu</strong><span>${menuItems.length} món yêu thích</span></article>
        ${restaurants.map(item => `
          <article class="restaurant-card is-row" data-view-restaurant="${item.id}">
            ${photo(item.name, item.coverUrl || item.logoUrl, 'restaurant-cover')}
            <div class="card-body"><strong>${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.district || item.city || '')}</span><span class="rating-pill">★ ${Number(item.rating || 0).toFixed(1)}</span></div>
          </article>
        `).join('')}
        ${menuItems.map(item => `
          <article class="food-card is-row" data-search-item-restaurant="${item.restaurantId}">
            ${photo(item.name, item.imageUrl, 'food-card-photo')}
            <div class="card-body"><strong class="clamp-2">${escapeHtml(item.name)}</strong><span class="muted">${escapeHtml(item.restaurantName || '')}</span><span class="price">${formatMoney(item.effectivePrice)}</span></div>
          </article>
        `).join('')}
      `;
      node.querySelectorAll('[data-view-restaurant]').forEach(button => button.addEventListener('click', () => selectRestaurant(Number(button.dataset.viewRestaurant))));
      node.querySelectorAll('[data-search-item-restaurant]').forEach(button => button.addEventListener('click', () => selectRestaurant(Number(button.dataset.searchItemRestaurant))));
      if (!restaurants.length && !menuItems.length) node.innerHTML = empty();
    } catch (error) {
      node.innerHTML = errorBox(error);
    }
  }

  async function loadSupportTickets() {
    if (!state.token) return;
    const node = $('#supportTickets');
    if (!node) return;
    try {
      const result = await api('/api/communications/support/tickets');
      const items = result.items || [];
      node.innerHTML = items.length ? items.slice(0, 20).map(item => `
        <article class="order-card">
          <strong>${escapeHtml(item.ticketCode)} · ${escapeHtml(statusLabel(item.status))}</strong>
          <span>${escapeHtml(item.subject)} · ${escapeHtml(item.category)} · ${escapeHtml(item.priority)}</span>
          <span>${escapeHtml(item.description || '')}</span>
          <button class="secondary-button" type="button" data-support-reply="${item.id}">Thêm phản hồi</button>
        </article>
      `).join('') : empty();
      node.querySelectorAll('[data-support-reply]').forEach(button => {
        button.addEventListener('click', () => replySupportTicket(button.dataset.supportReply));
      });
    } catch (error) {
      node.innerHTML = errorBox(error);
    }
  }

  async function createSupportTicket(event) {
    event.preventDefault();
    if (!state.token) {
      setStatus('Cần đăng nhập để gửi hỗ trợ.', true);
      return;
    }
    try {
      const orderId = Number($('#supportOrderId').value || 0);
      await api('/api/communications/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          orderId: orderId || undefined,
          subject: $('#supportSubject').value.trim(),
          description: $('#supportDescription').value.trim(),
          category: $('#supportCategory').value,
          priority: 'MEDIUM'
        })
      });
      $('#supportTicketForm').reset();
      await loadSupportTickets();
      setStatus('Đã gửi ticket hỗ trợ.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function replySupportTicket(ticketId) {
    const message = window.prompt('Nhập phản hồi cho ticket');
    if (!message) return;
    try {
      await api(`/api/communications/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      await loadSupportTickets();
      setStatus('Đã gửi phản hồi ticket.');
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
      const U = window.FDUI;
      $('#shipperProfile').innerHTML = `
        <div class="profile-card">
          <span class="avatar big">${escapeHtml((profile.fullName || '?').trim().slice(0, 1).toUpperCase())}</span>
          <div class="profile-info"><strong>${escapeHtml(profile.fullName)}</strong><span class="muted">🛵 ${escapeHtml(profile.vehicleType)} · ${escapeHtml(profile.vehiclePlate || 'Chưa có biển số')}</span></div>
          ${U.chip(profile.availabilityStatus)}
        </div>
        <div class="stats-strip">
          <article class="stat-card"><span>Đánh giá</span><strong>★ ${Number(profile.rating || 0).toFixed(1)}</strong><small>${profile.totalReviews || 0} lượt</small></article>
          <article class="stat-card"><span>Chuyến đã giao</span><strong>${U.num(profile.totalDeliveries || 0)}</strong><small>Tổng cộng</small></article>
          <article class="stat-card"><span>Thu nhập tích lũy</span><strong>${U.vnd(profile.totalEarnings || 0)}</strong><small>Sau phí nền tảng</small></article>
        </div>`;
      document.querySelectorAll('[data-availability]').forEach(button => button.classList.toggle('is-active', button.dataset.availability === profile.availabilityStatus));
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
          ${item.receiverName ? `<span>👤 ${escapeHtml(item.receiverName)}${item.receiverPhone ? ` · ${escapeHtml(item.receiverPhone)}` : ''}</span>` : ''}
          ${item.shipperNote ? `<span class="note-line">📝 Khách nhắn: ${escapeHtml(item.shipperNote)}</span>` : ''}
          ${item.contactlessDelivery ? '<span class="note-line">📦 Giao không tiếp xúc, để trước cửa</span>' : ''}
          ${item.paymentMethod === 'COD' ? `<span class="note-line">💵 Thu hộ ${formatMoney(item.totalAmount)}</span>` : ''}
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
      window.FDLive?.onShipperDeliveries(items);
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

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setStatus('Trình duyệt không hỗ trợ lấy GPS.', true);
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      $('#shipperLatitude').value = position.coords.latitude.toFixed(6);
      $('#shipperLongitude').value = position.coords.longitude.toFixed(6);
      setStatus('Đã lấy vị trí từ trình duyệt.');
    }, error => setStatus(error.message, true), { enableHighAccuracy: true, timeout: 10000 });
  }

  async function updateShipperLocation(event) {
    event.preventDefault();
    try {
      await api('/api/shippers/locations', {
        method: 'POST',
        body: JSON.stringify({
          latitude: Number($('#shipperLatitude').value),
          longitude: Number($('#shipperLongitude').value)
        })
      });
      await loadShipperProfile();
      setStatus('Đã cập nhật vị trí tài xế.');
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
    if (current) {
      $('#restaurantProfileName').value = current.name || '';
      $('#restaurantProfilePhone').value = current.phone || '';
      $('#restaurantProfileMinimum').value = current.minimumOrder ?? '';
      $('#restaurantProfilePrep').value = current.averagePrepareTime ?? '';
      $('#restaurantProfileDescription').value = current.description || '';
    }
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
    const groups = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'SHIPPER_ASSIGNED'];
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
    document.querySelectorAll('[data-restaurant-order-detail]').forEach(button => {
      button.addEventListener('click', () => viewRestaurantOrder(Number(button.dataset.restaurantOrderDetail)));
    });
  }

  function renderRestaurantOrder(order) {
    const action = order.status === 'PENDING'
      ? ['confirm', 'Xác nhận đơn']
      : order.status === 'CONFIRMED'
        ? ['prepare', 'Bắt đầu nấu']
        : order.status === 'PREPARING'
          ? ['ready', 'Món đã xong']
          : null;
    const minutes = Math.max(0, Math.round((Date.now() - new Date(order.orderedAt || order.createdAt).getTime()) / 60000));
    return `
      <article class="order-card kitchen-card">
        <div class="kitchen-head"><strong>${escapeHtml(order.orderCode.slice(-8))}</strong><span class="muted">${minutes} phút trước</span></div>
        <span><b>${formatMoney(order.totalAmount)}</b> · ${escapeHtml(paymentLabel(order.paymentMethod))}</span>
        ${order.customerNote ? `<span class="note-line">📝 ${escapeHtml(order.customerNote)}</span>` : ''}
        <span class="muted">${order.needUtensils === false ? '🚫 Không lấy dụng cụ ăn uống' : '🥢 Lấy dụng cụ ăn uống'}</span>
        <div class="button-row">
          ${action ? `<button type="button" class="primary-button compact-button" data-order-id="${order.id}" data-order-action="${action[0]}">${action[1]}</button>` : '<span class="status-chip is-info">Chờ tài xế</span>'}
          ${order.status === 'PENDING' ? `<button type="button" class="secondary-button compact-button" data-order-id="${order.id}" data-order-action="reject">Từ chối</button>` : ''}
          <button class="secondary-button compact-button" type="button" data-restaurant-order-detail="${order.id}">Chi tiết</button>
        </div>
      </article>
    `;
  }

  async function viewRestaurantOrder(orderId) {
    try {
      const order = await api(`/api/restaurant/orders/${orderId}`);
      $('#restaurantOrderBoard').innerHTML = `
        <article class="order-card order-detail-card">
          <button class="text-button" type="button" id="backRestaurantOrdersButton">← Quay lại hàng đợi</button>
          <strong>${escapeHtml(order.orderCode)} · ${escapeHtml(statusLabel(order.status))}</strong>
          <span>Khách: ${escapeHtml(order.receiverName || '')} · ${escapeHtml(order.deliveryAddress || '')}</span>
          <span>${escapeHtml(paymentLabel(order.paymentMethod))} · ${escapeHtml(statusLabel(order.paymentStatus))}</span>
          ${(order.items || []).map(item => `
            <div class="cart-row">
              <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${item.variantName ? `${escapeHtml(item.variantName)} · ` : ''}SL ${item.quantity}</span>${renderOrderItemExtras(item)}</div>
              <b>${formatMoney(item.totalPrice)}</b>
            </div>
          `).join('')}
          ${renderOrderPreferences(order)}
          <div class="fee-row"><span>Tổng đơn</span><b>${formatMoney(order.totalAmount)}</b></div>
        </article>
      `;
      $('#backRestaurantOrdersButton').addEventListener('click', loadRestaurantQueue);
      window.FDLive?.onRestaurantOrder(order);
    } catch (error) {
      setStatus(error.message, true);
    }
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
      const [items, categories, toppingGroups] = await Promise.all([
        api(`/api/restaurant/restaurants/${restaurantId}/menu-items?pageSize=70`),
        api(`/api/restaurant/restaurants/${restaurantId}/menu-categories`),
        api(`/api/restaurant/restaurants/${restaurantId}/topping-groups`)
      ]);
      state.ownerMenuItems = items.items || [];
      state.ownerMenuCategories = categories.items || [];
      state.ownerToppingGroups = toppingGroups.items || [];
      renderOwnerMenu(state.ownerMenuItems);
      renderOwnerMenuControls();
    } catch (error) {
      $('#ownerMenuRows').innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderOwnerMenuControls() {
    const activeCategories = state.ownerMenuCategories.filter(item => String(item.status || 'ACTIVE') === 'ACTIVE');
    const categoryOptions = activeCategories.length
      ? activeCategories.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')
      : '<option value="">Chưa có nhóm món</option>';
    $('#newItemCategory').innerHTML = `<option value="">Không phân nhóm</option>${categoryOptions}`;
    $('#editItemCategory').innerHTML = `<option value="">Không phân nhóm</option>${categoryOptions}`;
    $('#variantItemSelect').innerHTML = state.ownerMenuItems.length
      ? state.ownerMenuItems.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')
      : '<option value="">Chưa có món</option>';
    $('#toppingGroupSelect').innerHTML = state.ownerToppingGroups.length
      ? state.ownerToppingGroups.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')
      : '<option value="">Chưa có nhóm topping</option>';
    const categoryRows = $('#ownerCategoryRows');
    if (categoryRows) {
      categoryRows.innerHTML = state.ownerMenuCategories.length ? state.ownerMenuCategories.map(item => `
        <article class="category-admin-card">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(statusLabel(item.status || 'ACTIVE'))} · thứ tự ${item.sortOrder ?? 0}</span>
          <div class="button-row">
            <button class="secondary-button small-action" type="button" data-edit-menu-category="${item.id}">Sửa nhóm</button>
            <button class="secondary-button small-action" type="button" data-toggle-menu-category="${item.id}:${item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${item.status === 'ACTIVE' ? 'Ẩn' : 'Bật'}</button>
          </div>
        </article>
      `).join('') : '';
      categoryRows.querySelectorAll('[data-edit-menu-category]').forEach(button => {
        button.addEventListener('click', () => editMenuCategory(Number(button.dataset.editMenuCategory)));
      });
      categoryRows.querySelectorAll('[data-toggle-menu-category]').forEach(button => {
        button.addEventListener('click', () => {
          const [categoryId, status] = button.dataset.toggleMenuCategory.split(':');
          updateMenuCategory(Number(categoryId), { status });
        });
      });
    }
  }

  function renderOwnerMenu(items) {
    $('#ownerMenuRows').innerHTML = items.length ? items.map(item => `
      <tr>
        <td>
          <div class="owner-menu-cell">
            ${photo(item.name, item.imageUrl, 'owner-menu-thumb')}
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="muted">${escapeHtml(item.description || '')}</span>
              <span class="muted">Đã bán ${item.soldCount || 0} · ${item.isFeatured ? 'Đang ghim nổi bật' : 'Món thường'}</span>
            </div>
          </div>
        </td>
        <td>${formatMoney(item.effectivePrice)}${item.discountPrice ? `<br><span class="muted">Gốc ${formatMoney(item.basePrice)}</span>` : ''}</td>
        <td>${item.preparationTime} phút<br><span class="muted">${escapeHtml(state.ownerMenuCategories.find(category => Number(category.id) === Number(item.categoryId))?.name || 'Chưa phân nhóm')}</span></td>
        <td>
          <span class="status-chip">${item.isAvailable ? 'Đang bán' : 'Tạm ẩn'}</span>
          <button class="secondary-button" type="button" data-toggle-menu-item="${item.id}:${item.isAvailable ? 'false' : 'true'}">${item.isAvailable ? 'Tạm ẩn' : 'Bật bán'}</button>
          <button class="secondary-button" type="button" data-edit-menu-item="${item.id}">Sửa chi tiết</button>
          <button class="secondary-button" type="button" data-feature-menu-item="${item.id}:${item.isFeatured ? 'false' : 'true'}">${item.isFeatured ? 'Bỏ nổi bật' : 'Nổi bật'}</button>
          <button class="text-button danger-text" type="button" data-delete-menu-item="${item.id}">Xóa</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="4">Chưa có món</td></tr>';
    document.querySelectorAll('[data-toggle-menu-item]').forEach(button => {
      button.addEventListener('click', () => {
        const [itemId, isAvailable] = button.dataset.toggleMenuItem.split(':');
        toggleMenuItemAvailability(Number(itemId), isAvailable === 'true');
      });
    });
    document.querySelectorAll('[data-edit-menu-item]').forEach(button => {
      button.addEventListener('click', () => openEditMenuItem(Number(button.dataset.editMenuItem)));
    });
    document.querySelectorAll('[data-feature-menu-item]').forEach(button => {
      button.addEventListener('click', () => {
        const [itemId, isFeatured] = button.dataset.featureMenuItem.split(':');
        patchOwnerMenuItem(Number(itemId), { isFeatured: isFeatured === 'true' }, 'Đã cập nhật trạng thái nổi bật.');
      });
    });
    document.querySelectorAll('[data-delete-menu-item]').forEach(button => {
      button.addEventListener('click', () => deleteOwnerMenuItem(Number(button.dataset.deleteMenuItem)));
    });
  }

  function openEditMenuItem(itemId) {
    const item = state.ownerMenuItems.find(value => Number(value.id) === Number(itemId));
    if (!item) return;
    $('#editItemId').value = String(item.id);
    $('#editItemName').value = item.name || '';
    $('#editItemCategory').value = item.categoryId ?? '';
    $('#editItemImage').value = item.imageUrl || '';
    $('#editItemPrice').value = item.basePrice ?? '';
    $('#editItemDiscount').value = item.discountPrice ?? '';
    $('#editItemPrep').value = item.preparationTime ?? 15;
    $('#editItemDescription').value = item.description || '';
    $('#editItemAvailable').checked = Boolean(item.isAvailable);
    $('#editItemFeatured').checked = Boolean(item.isFeatured);
    resetImageEditor('edit');
    $('#editItemForm').hidden = false;
    $('#editItemForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function closeEditMenuItem() {
    $('#editItemForm').hidden = true;
    $('#editItemForm').reset();
    resetImageEditor('edit');
  }

  async function updateMenuItemFromForm(event) {
    event.preventDefault();
    const itemId = Number($('#editItemId').value);
    if (!itemId) return;
    await patchOwnerMenuItem(itemId, buildMenuItemPayload('edit'), 'Đã cập nhật chi tiết món.');
    closeEditMenuItem();
  }

  function buildMenuItemPayload(prefix) {
    const isEdit = prefix === 'edit';
    const imageData = state.itemImageEditors[prefix]?.dataUrl;
    const imageUrl = $(isEdit ? '#editItemImage' : '#newItemImage').value.trim();
    const payload = {
      name: $(isEdit ? '#editItemName' : '#newItemName').value.trim(),
      categoryId: $(isEdit ? '#editItemCategory' : '#newItemCategory').value ? Number($(isEdit ? '#editItemCategory' : '#newItemCategory').value) : null,
      description: $(isEdit ? '#editItemDescription' : '#newItemDescription').value.trim() || null,
      basePrice: Number($(isEdit ? '#editItemPrice' : '#newItemPrice').value),
      discountPrice: $(isEdit ? '#editItemDiscount' : '#newItemDiscount').value === '' ? null : Number($(isEdit ? '#editItemDiscount' : '#newItemDiscount').value),
      preparationTime: Number($(isEdit ? '#editItemPrep' : '#newItemPrep').value),
      isAvailable: isEdit ? $('#editItemAvailable').checked : true,
      isFeatured: $(isEdit ? '#editItemFeatured' : '#newItemFeatured').checked
    };
    if (imageData) payload.imageData = imageData;
    else if (imageUrl) payload.imageUrl = imageUrl;
    else if (!isEdit) payload.imageUrl = null;
    return payload;
  }

  function bindImageEditor(prefix) {
    const ids = imageEditorIds(prefix);
    const fileInput = $(ids.file);
    if (!fileInput) return;
    fileInput.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return resetImageEditor(prefix);
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          state.itemImageEditors[prefix].image = image;
          renderImageEditor(prefix);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
    [ids.width, ids.height, ids.color, ids.zoom, ids.x, ids.y].forEach(selector => {
      $(selector)?.addEventListener('input', () => renderImageEditor(prefix));
    });
    renderImageEditor(prefix);
  }

  function imageEditorIds(prefix) {
    const base = prefix === 'edit' ? 'editItemImage' : 'newItemImage';
    return {
      file: `#${base}File`,
      width: `#${base}Width`,
      height: `#${base}Height`,
      color: `#${base}Color`,
      zoom: `#${base}Zoom`,
      x: `#${base}X`,
      y: `#${base}Y`,
      canvas: `#${base}Canvas`
    };
  }

  function resetImageEditor(prefix) {
    const editor = state.itemImageEditors[prefix];
    if (editor) {
      editor.image = null;
      editor.dataUrl = null;
    }
    const ids = imageEditorIds(prefix);
    if ($(ids.file)) $(ids.file).value = '';
    if ($(ids.zoom)) $(ids.zoom).value = '1';
    if ($(ids.x)) $(ids.x).value = '0';
    if ($(ids.y)) $(ids.y).value = '0';
    renderImageEditor(prefix);
  }

  function renderImageEditor(prefix) {
    const ids = imageEditorIds(prefix);
    const canvas = $(ids.canvas);
    const editor = state.itemImageEditors[prefix];
    if (!canvas || !editor) return;
    const outputWidth = Math.max(320, Math.min(1600, Number($(ids.width)?.value || 900)));
    const outputHeight = Math.max(240, Math.min(1200, Number($(ids.height)?.value || 680)));
    const previewWidth = 450;
    const previewHeight = Math.round(previewWidth * outputHeight / outputWidth);
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = $(ids.color)?.value || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!editor.image) {
      ctx.fillStyle = '#667085';
      ctx.font = '700 15px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Chọn file ảnh để crop/resize', canvas.width / 2, canvas.height / 2);
      editor.dataUrl = null;
      return;
    }
    const scale = Math.max(canvas.width / editor.image.width, canvas.height / editor.image.height) * Number($(ids.zoom)?.value || 1);
    const drawWidth = editor.image.width * scale;
    const drawHeight = editor.image.height * scale;
    const offsetX = Number($(ids.x)?.value || 0) / 100 * canvas.width;
    const offsetY = Number($(ids.y)?.value || 0) / 100 * canvas.height;
    const drawX = (canvas.width - drawWidth) / 2 + offsetX;
    const drawY = (canvas.height - drawHeight) / 2 + offsetY;
    ctx.drawImage(editor.image, drawX, drawY, drawWidth, drawHeight);

    const output = document.createElement('canvas');
    output.width = outputWidth;
    output.height = outputHeight;
    const out = output.getContext('2d');
    out.fillStyle = $(ids.color)?.value || '#ffffff';
    out.fillRect(0, 0, output.width, output.height);
    out.drawImage(canvas, 0, 0, output.width, output.height);
    editor.dataUrl = output.toDataURL('image/webp', 0.86);
  }

  async function quickEditMenuItem(itemId) {
    const item = state.ownerMenuItems.find(value => Number(value.id) === Number(itemId));
    if (!item) return;
    const basePrice = window.prompt('Giá cơ bản mới', String(item.basePrice));
    if (basePrice === null) return;
    const discountPrice = window.prompt('Giá khuyến mãi (để trống nếu không giảm)', item.discountPrice ? String(item.discountPrice) : '');
    if (discountPrice === null) return;
    const preparationTime = window.prompt('Thời gian chuẩn bị (phút)', String(item.preparationTime || 15));
    if (preparationTime === null) return;
    await patchOwnerMenuItem(itemId, {
      basePrice: Number(basePrice),
      discountPrice: discountPrice === '' ? null : Number(discountPrice),
      preparationTime: Number(preparationTime)
    }, 'Đã sửa nhanh món.');
  }

  async function patchOwnerMenuItem(itemId, patch, successMessage) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch)
      });
      await loadOwnerMenu();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteOwnerMenuItem(itemId) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId || !window.confirm('Xóa món này khỏi menu đang bán?')) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items/${itemId}`, { method: 'DELETE' });
      await loadOwnerMenu();
      setStatus('Đã xóa món khỏi menu.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function toggleMenuItemAvailability(itemId, isAvailable) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable })
      });
      await loadOwnerMenu();
      setStatus(isAvailable ? 'Đã bật bán món.' : 'Đã tạm ẩn món.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadRestaurantSettlements() {
    if (!state.token || roleOf(state.user) !== 'RESTAURANT') return;
    try {
      const [settlements, commissions] = await Promise.all([
        api('/api/settlements/restaurant/settlements'),
        api('/api/settlements/restaurant/commissions')
      ]);
      $('#restaurantSettlements').innerHTML = (settlements.items || []).length
        ? settlements.items.slice(0, 8).map(item => `<article class="order-card"><strong>${escapeHtml(item.restaurantName)}</strong><span>${escapeHtml(item.periodStart)} → ${escapeHtml(item.periodEnd)} · ${escapeHtml(statusLabel(item.status))}</span><span>Net: ${formatMoney(item.netAmount)} · Hoa hồng: ${formatMoney(item.commissionAmount)}</span></article>`).join('')
        : '<div class="empty-state">Chưa có kỳ đối soát.</div>';
      $('#restaurantCommissions').innerHTML = (commissions.items || []).length
        ? commissions.items.slice(0, 8).map(item => `<article class="order-card"><strong>${escapeHtml(item.orderCode)}</strong><span>${escapeHtml(item.restaurantName)} · ${formatMoney(item.commissionAmount)}</span></article>`).join('')
        : '<div class="empty-state">Chưa có commission.</div>';
    } catch (error) {
      $('#restaurantSettlements').innerHTML = errorBox(error);
    }
  }

  async function loadRestaurantPromotions() {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      const result = await api(`/api/restaurant/restaurants/${restaurantId}/promotions`);
      const items = result.items || [];
      $('#restaurantPromotions').innerHTML = items.length ? items.map(item => {
        const expired = new Date(item.endAt) < new Date();
        const used = item.usedCount || 0;
        const exhausted = item.usageLimit != null && used >= item.usageLimit;
        const percentUsed = item.usageLimit ? Math.min(100, Math.round(used * 100 / item.usageLimit)) : 0;
        return `
        <article class="order-card">
          <strong>${escapeHtml(item.code)} · ${escapeHtml(item.name)}</strong>
          <span>${item.discountType === 'PERCENT' ? `Giảm ${item.discountValue}%${item.maxDiscount ? ` tối đa ${formatMoney(item.maxDiscount)}` : ''}` : `Giảm trực tiếp ${formatMoney(item.discountValue)}`} · đơn từ ${formatMoney(item.minimumOrder)} · mỗi khách ${item.usagePerCustomer} lượt</span>
          <span class="muted">HSD ${escapeHtml(new Date(item.endAt).toLocaleDateString('vi-VN'))}${expired ? ' (đã hết hạn)' : ''} · đã dùng ${used}${item.usageLimit ? `/${item.usageLimit}` : ''}${exhausted ? ' (hết hạn ngạch)' : ''}</span>
          ${item.usageLimit ? `<i class="quota-bar"><b style="width:${percentUsed}%"></b></i>` : ''}
          <div class="button-row">
            <button class="secondary-button compact-button" type="button" data-extend-promotion="${item.id}:7:0">+7 ngày</button>
            <button class="secondary-button compact-button" type="button" data-extend-promotion="${item.id}:0:50">+50 lượt</button>
            <button class="secondary-button compact-button" type="button" data-promotion-status="${item.id}:${item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${item.status === 'ACTIVE' ? 'Tạm tắt' : 'Bật lại'}</button>
            <button class="text-button danger-text" type="button" data-delete-promotion="${item.id}">Xóa</button>
          </div>
        </article>`;
      }).join('') : empty();
      document.querySelectorAll('[data-promotion-status]').forEach(button => {
        button.addEventListener('click', () => {
          const [promotionId, status] = button.dataset.promotionStatus.split(':');
          updateRestaurantPromotion(Number(promotionId), { status });
        });
      });
      document.querySelectorAll('[data-extend-promotion]').forEach(button => {
        button.addEventListener('click', () => {
          const [promotionId, days, addQuota] = button.dataset.extendPromotion.split(':').map(Number);
          extendRestaurantPromotion(promotionId, days, addQuota);
        });
      });
      document.querySelectorAll('[data-delete-promotion]').forEach(button => {
        button.addEventListener('click', () => deleteRestaurantPromotion(Number(button.dataset.deletePromotion)));
      });
    } catch (error) {
      $('#restaurantPromotions').innerHTML = errorBox(error);
    }
    loadRestaurantCombos(restaurantId);
  }

  async function extendRestaurantPromotion(promotionId, days, addQuota) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/promotions/${promotionId}/extend`, { method: 'POST', body: JSON.stringify({ days, addQuota }) });
      await loadRestaurantPromotions();
      setStatus(days ? `Đã gia hạn voucher thêm ${days} ngày.` : `Đã tăng hạn ngạch thêm ${addQuota} lượt.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createRestaurantPromotion(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    const start = new Date();
    const days = Math.min(90, Math.max(1, Number($('#promotionDaysInput').value || 14)));
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    const isPercent = $('#promotionTypeInput').value === 'PERCENT';
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/promotions`, {
        method: 'POST',
        body: JSON.stringify({
          code: $('#promotionCodeInput').value.trim(),
          name: $('#promotionNameInput').value.trim(),
          discountType: $('#promotionTypeInput').value,
          discountValue: Number($('#promotionValueInput').value),
          minimumOrder: Number($('#promotionMinimumInput').value || 0),
          maxDiscount: isPercent && $('#promotionMaxInput').value ? Number($('#promotionMaxInput').value) : null,
          usageLimit: Number($('#promotionQuotaInput').value || 0),
          usagePerCustomer: Number($('#promotionPerCustomerInput').value || 1),
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: 'ACTIVE'
        })
      });
      $('#promotionForm').reset();
      $('#promotionValueInput').value = '10';
      $('#promotionMinimumInput').value = '50000';
      await loadRestaurantPromotions();
      setStatus('Đã tạo voucher nhà hàng.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  /* Combo: món bán trọn gói từ các món của quán, rẻ hơn mua lẻ */
  async function loadRestaurantCombos(restaurantId) {
    try {
      const result = await api(`/api/restaurant/restaurants/${restaurantId}/menu-items?pageSize=100`);
      const items = result.items || [];
      state.comboCandidates = items.filter(item => !item.itemType || item.itemType === 'DISH');
      $('#comboComponents').innerHTML = state.comboCandidates.map(item => `
        <label class="combo-pick"><input type="number" min="0" max="20" value="0" data-combo-item="${item.id}" data-price="${Number(item.effectivePrice)}"><span>${escapeHtml(item.name)}</span><b>${formatMoney(item.effectivePrice)}</b></label>`).join('');
      const combos = items.filter(item => item.itemType === 'COMBO');
      $('#restaurantCombos').innerHTML = combos.length ? combos.map(combo => `
        <article class="order-card"><strong>${escapeHtml(combo.name)}</strong>
          <span>${formatMoney(combo.effectivePrice)}${combo.discountPrice ? ` <s class="muted">${formatMoney(combo.basePrice)}</s>` : ''}</span>
          <span class="muted clamp-2">${escapeHtml(combo.description || '')}</span>
          <div class="button-row"><button class="text-button danger-text" type="button" data-delete-combo="${combo.id}">Xóa combo</button></div></article>`).join('') : '<p class="muted">Quán chưa có combo.</p>';
      document.querySelectorAll('[data-delete-combo]').forEach(button => button.addEventListener('click', async () => {
        try {
          await api(`/api/restaurant/restaurants/${restaurantId}/menu-items/${button.dataset.deleteCombo}`, { method: 'DELETE' });
          setStatus('Đã xóa combo.');
          loadRestaurantCombos(restaurantId);
        } catch (error) { setStatus(error.message, true); }
      }));
      updateComboPreview();
    } catch (error) {
      $('#restaurantCombos').innerHTML = errorBox(error);
    }
  }

  function readComboParts() {
    return Array.from(document.querySelectorAll('[data-combo-item]'))
      .map(input => ({ itemId: Number(input.dataset.comboItem), quantity: Number(input.value) || 0, price: Number(input.dataset.price) }))
      .filter(part => part.quantity > 0);
  }

  function updateComboPreview() {
    const parts = readComboParts();
    const original = parts.reduce((sum, part) => sum + part.price * part.quantity, 0);
    const percent = Math.min(50, Math.max(1, Number($('#comboDiscountInput').value || 10)));
    const price = Math.round(original * (1 - percent / 100) / 1000) * 1000;
    $('#comboPreview').textContent = parts.length >= 2
      ? `Mua lẻ ${formatMoney(original)} → giá combo ${formatMoney(price)} (khách tiết kiệm ${formatMoney(original - price)})`
      : 'Chọn ít nhất 2 món (hoặc 1 món với số lượng ≥ 2) để tạo combo.';
  }

  async function createRestaurantCombo(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    const parts = readComboParts();
    const count = parts.reduce((sum, part) => sum + part.quantity, 0);
    if (!restaurantId || parts.length === 0 || count < 2) { setStatus('Combo cần ít nhất 2 phần (từ 2 món hoặc 1 món số lượng 2).', true); return; }
    const original = parts.reduce((sum, part) => sum + part.price * part.quantity, 0);
    const percent = Math.min(50, Math.max(1, Number($('#comboDiscountInput').value || 10)));
    const price = Math.round(original * (1 - percent / 100) / 1000) * 1000;
    const names = parts.map(part => `${part.quantity} ${state.comboCandidates.find(item => Number(item.id) === part.itemId)?.name}`).join(', ');
    try {
      const base = `/api/restaurant/restaurants/${restaurantId}`;
      const categories = await api(`${base}/menu-categories`);
      let category = (categories.items || categories).find(item => item.name === 'Combo ưu đãi');
      if (!category) {
        const menus = await api(`${base}/menus`);
        category = await api(`${base}/menu-categories`, { method: 'POST', body: JSON.stringify({ menuId: (menus.items || menus)[0].id, name: 'Combo ưu đãi', description: 'Mua theo combo rẻ hơn mua lẻ', sortOrder: 0 }) });
      }
      const item = await api(`${base}/menu-items`, {
        method: 'POST',
        body: JSON.stringify({ categoryId: category.id, name: $('#comboNameInput').value.trim(), basePrice: original, discountPrice: price, isAvailable: true, isFeatured: true, preparationTime: 20, description: `Gồm: ${names}. Tiết kiệm ${(original - price).toLocaleString('vi-VN')}đ so với mua lẻ.` })
      });
      await api(`${base}/menu-items/${item.id}/combo`, { method: 'PUT', body: JSON.stringify({ components: parts.map(part => ({ itemId: part.itemId, quantity: part.quantity })) }) });
      $('#comboForm').reset();
      await loadRestaurantCombos(restaurantId);
      setStatus('Đã tạo combo.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function updateRestaurantPromotion(promotionId, patch) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      const current = await api(`/api/restaurant/restaurants/${restaurantId}/promotions`);
      const promotion = (current.items || []).find(item => Number(item.id) === Number(promotionId));
      await api(`/api/restaurant/restaurants/${restaurantId}/promotions/${promotionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...promotion, ...patch })
      });
      await loadRestaurantPromotions();
      setStatus('Đã cập nhật voucher.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteRestaurantPromotion(promotionId) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/promotions/${promotionId}`, { method: 'DELETE' });
      await loadRestaurantPromotions();
      setStatus('Đã xóa voucher.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function updateRestaurantProfile(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    const current = state.ownerRestaurants.find(item => Number(item.id) === restaurantId);
    if (!restaurantId || !current) return;
    try {
      const updated = await api(`/api/restaurant/restaurants/${restaurantId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: $('#restaurantProfileName').value.trim(),
          phone: $('#restaurantProfilePhone').value.trim() || current.phone || null,
          description: $('#restaurantProfileDescription').value.trim() || null,
          minimumOrder: Number($('#restaurantProfileMinimum').value || current.minimumOrder || 0),
          averagePrepareTime: Number($('#restaurantProfilePrep').value || current.averagePrepareTime || 20)
        })
      });
      state.ownerRestaurants = state.ownerRestaurants.map(item => Number(item.id) === Number(updated.id) ? { ...item, ...updated } : item);
      renderOwnerRestaurants();
      setStatus('Đã cập nhật hồ sơ vận hành nhà hàng.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createMenuCategory(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-categories`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#newMenuCategoryName').value.trim(),
          description: 'Nhóm món tạo từ trang quản lý',
          sortOrder: state.ownerMenuCategories.length + 1,
          status: 'ACTIVE'
        })
      });
      $('#createMenuCategoryForm').reset();
      await loadOwnerMenu();
      setStatus('Đã tạo nhóm món.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function editMenuCategory(categoryId) {
    const current = state.ownerMenuCategories.find(item => Number(item.id) === Number(categoryId));
    if (!current) return;
    const name = window.prompt('Tên nhóm món', current.name);
    if (!name) return;
    const sortOrder = window.prompt('Thứ tự hiển thị', String(current.sortOrder ?? 1));
    if (sortOrder === null) return;
    await updateMenuCategory(categoryId, {
      name,
      sortOrder: Number(sortOrder)
    });
  }

  async function updateMenuCategory(categoryId, patch) {
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    const current = state.ownerMenuCategories.find(item => Number(item.id) === Number(categoryId));
    if (!restaurantId || !current) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          menuId: current.menuId ?? null,
          name: current.name,
          description: current.description || null,
          sortOrder: current.sortOrder ?? 0,
          status: current.status || 'ACTIVE',
          ...patch
        })
      });
      await loadOwnerMenu();
      setStatus('Đã cập nhật nhóm món.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createToppingGroup(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/topping-groups`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#newToppingGroupName').value.trim(),
          minSelect: 0,
          maxSelect: 3,
          required: false
        })
      });
      $('#createToppingGroupForm').reset();
      await loadOwnerMenu();
      setStatus('Đã tạo nhóm topping.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createTopping(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    const groupId = Number($('#toppingGroupSelect').value);
    if (!restaurantId || !groupId) {
      setStatus('Cần chọn nhóm topping.', true);
      return;
    }
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/topping-groups/${groupId}/toppings`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#newToppingName').value.trim(),
          price: Number($('#newToppingPrice').value || 0),
          status: 'ACTIVE'
        })
      });
      $('#createToppingForm').reset();
      $('#newToppingPrice').value = '7000';
      await loadOwnerMenu();
      setStatus('Đã thêm topping.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createItemVariant(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    const itemId = Number($('#variantItemSelect').value);
    if (!restaurantId || !itemId) {
      setStatus('Cần chọn món để thêm variant.', true);
      return;
    }
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items/${itemId}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#newVariantName').value.trim(),
          priceAdjustment: Number($('#newVariantPrice').value || 0),
          status: 'ACTIVE'
        })
      });
      $('#createVariantForm').reset();
      $('#newVariantPrice').value = '10000';
      await loadOwnerMenu();
      setStatus('Đã thêm variant cho món.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createMenuItem(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/menu-items`, {
        method: 'POST',
        body: JSON.stringify(buildMenuItemPayload('create'))
      });
      $('#createItemForm').hidden = true;
      $('#createItemForm').reset();
      $('#newItemPrice').value = '45000';
      $('#newItemPrep').value = '15';
      resetImageEditor('create');
      await loadOwnerMenu();
      setStatus('Đã tạo món mới.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadAccountDashboard() {
    if (!state.token) return;
    await Promise.allSettled([loadSessionPermissions(), loadWallet()]);
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

  function defaultSubView(screen) {
    return {
      customer: 'catalog',
      restaurant: 'dashboard',
      shipper: 'profile',
      admin: 'overview',
      account: 'profile'
    }[screen] || '';
  }

  function showSubView(screen, view) {
    if (!screen || !view) return;
    state.subViews[screen] = view;
    document.body.classList.toggle('sf-landing', screen === 'customer' && view === 'catalog');
    const key = `${screen}:${view}`;
    document.querySelectorAll(`[data-view-panel^="${screen}:"]`).forEach(panel => {
      panel.classList.toggle('is-subview-active', panel.dataset.viewPanel === key);
    });
    document.querySelectorAll(`[data-subview-target^="${screen}:"]`).forEach(button => {
      button.classList.toggle('is-active', button.dataset.subviewTarget === key);
    });
    if (screen === 'restaurant' && view === 'settlement') loadRestaurantSettlements();
    if (screen === 'restaurant' && view === 'promotions') loadRestaurantPromotions();
    if (screen === 'customer' && view === 'favorites') loadFavorites();
    if (screen === 'customer' && view === 'offers') loadOffers();
    if (screen === 'customer' && view === 'stats') (state.user && roleOf(state.user) === 'CUSTOMER' ? window.FDAN?.customer($('#customerStats')) : ($('#customerStats').innerHTML = '<div class="empty-state">Đăng nhập tài khoản khách hàng để xem thống kê chi tiêu.</div>'));
    if (screen === 'shipper' && view === 'earnings') window.FDAN?.shipper($('#shipperAnalytics'));
    if (screen === 'customer' && view === 'support') loadSupportTickets();
    syncStoreNav();
    document.dispatchEvent(new CustomEvent('fd:subview', { detail: { screen, view } }));
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
    showSubView(target, state.subViews[target] || defaultSubView(target));
    document.dispatchEvent(new CustomEvent('fd:screen', { detail: { screen: target } }));
    if (target === 'account' && state.token) loadAccountDashboard();
  }

  function bind() {
    document.querySelectorAll('[data-screen-target]').forEach(button => {
      button.addEventListener('click', () => showScreen(button.dataset.screenTarget));
    });
    document.querySelectorAll('[data-subview-target]').forEach(button => {
      button.addEventListener('click', () => {
        const [screen, view] = button.dataset.subviewTarget.split(':');
        showSubView(screen, view);
      });
    });
    $('#loginForm').addEventListener('submit', event => {
      event.preventDefault();
      login($('#loginIdentifier').value.trim(), $('#loginPassword').value).catch(error => setStatus({
        'Account is PENDING': 'Hồ sơ đối tác của bạn đang chờ quản trị viên duyệt. Vui lòng quay lại sau.',
        'Account is INACTIVE': 'Hồ sơ chưa được chấp thuận hoặc tài khoản đang tạm ngưng. Liên hệ ' + (state.storefront?.contact?.email || 'quản trị viên') + ' để biết thêm.',
        'Account is LOCKED': 'Tài khoản đã bị khóa. Liên hệ ' + (state.storefront?.contact?.email || 'quản trị viên') + ' để được hỗ trợ.'
      }[error.message] || error.message, true));
    });
    $('#registerForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const result = await api('/api/auth/register/customer', {
          method: 'POST',
          body: JSON.stringify({
            fullName: $('#regFullName').value.trim(),
            username: $('#regUsername').value.trim(),
            phone: $('#regPhone').value.trim() || undefined,
            email: $('#regEmail').value.trim(),
            password: $('#regPassword').value
          })
        });
        saveSession(result);
        await loadSessionPermissions();
        renderSession();
        closeAuth();
        toast('Tạo tài khoản thành công. Chào mừng bạn đến với FoodGo!');
        await bootstrapForRole();
      } catch (error) {
        setStatus(error.message, true);
      }
    });
    document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); openAuth(button.dataset.authTab); }));
    $('#forgotLink').addEventListener('click', event => { event.preventDefault(); openAuth('forgot'); });
    $('#haveTokenLink').addEventListener('click', event => { event.preventDefault(); openAuth('reset'); });
    $('#forgotForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const result = await api('/api/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email: $('#forgotEmail').value.trim() }) });
        setStatus(`${result.message === 'If the email exists, a password reset token has been created' ? 'Nếu email tồn tại, mã đặt lại mật khẩu đã được tạo và gửi tới hộp thư của bạn.' : result.message} Nhập mã ở bước tiếp theo.`);
        openAuth('reset');
      } catch (error) { setStatus(error.message, true); }
    });
    $('#resetForm').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ token: $('#resetToken').value.trim(), password: $('#resetPassword').value }) });
        openAuth('login', 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.');
      } catch (error) { setStatus(error.message, true); }
    });
    $('#openLoginButton').addEventListener('click', () => openAuth('login'));
    $('#openRegisterButton').addEventListener('click', () => openAuth('register'));
    $('#closeAuthModal').addEventListener('click', closeAuth);
    $('#authModal').addEventListener('click', event => { if (event.target.id === 'authModal') closeAuth(); });
    document.querySelectorAll('[data-home]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      showScreen(defaultScreenForRole());
      if (!state.user || roleOf(state.user) === 'CUSTOMER') showSubView('customer', 'catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    document.querySelectorAll('[data-quick-search]').forEach(button => button.addEventListener('click', () => {
      $('#catalogKeyword').value = button.dataset.quickSearch;
      searchCatalog();
      $('#restaurantList').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    $('#userMenuButton').addEventListener('click', event => {
      event.stopPropagation();
      $('#userDropdown').hidden = !$('#userDropdown').hidden;
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('.user-menu')) $('#userDropdown').hidden = true;
    });
    const logout = async () => {
      if (state.refreshToken) {
        await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: state.refreshToken }) }).catch(() => null);
      }
      clearSession();
      toast('Đã đăng xuất.');
      showScreen('customer');
      showSubView('customer', 'catalog');
    };
    $('#logoutButton').addEventListener('click', logout);
    $('#headerLogoutButton')?.addEventListener('click', logout);
    $('#loadMeButton').addEventListener('click', () => loadMe());
    $('#sessionDetail').addEventListener('click', async event => {
      if (!event.target.closest('#emailVerifyRequest')) return;
      try {
        const result = await api('/api/auth/email/verification/request', { method: 'POST', body: JSON.stringify({ email: state.user.email }) });
        const form = $('#emailVerifyForm');
        form.hidden = false;
        // Chưa nối dịch vụ gửi email thật: máy chủ trả mã trực tiếp (giống mã đặt lại mật khẩu)
        if (result.verificationToken) form.elements.token.value = result.verificationToken;
        $('#emailVerifyNote').textContent = result.verificationToken
          ? 'Hệ thống chưa kết nối dịch vụ gửi email thật nên mã được điền sẵn ở trên. Bấm "Xác minh email" để hoàn tất.'
          : 'Nếu email tồn tại, mã xác minh đã được tạo. Nhập mã nhận được để xác minh.';
      } catch (error) { toast(error.message, true); }
    });
    $('#sessionDetail').addEventListener('submit', async event => {
      if (event.target.id !== 'emailVerifyForm') return;
      event.preventDefault();
      try {
        const result = await api('/api/auth/email/verification/confirm', { method: 'POST', body: JSON.stringify({ token: event.target.elements.token.value.trim() }) });
        state.user = { ...state.user, ...result.user };
        renderSession();
        toast('Email đã được xác minh.');
      } catch (error) { toast(error.message, true); }
    });
    bindHomeControls();
    $('#toggleCollections').addEventListener('click', () => { state.showAllCollections = !state.showAllCollections; renderCollections(); });
    document.querySelector('[data-sf-search]')?.addEventListener('click', () => {
      showSubView('customer', 'catalog');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      $('#catalogKeyword').focus();
    });
    document.querySelector('.sf-nav [data-subview-target="customer:catalog"]')?.addEventListener('click', () => {
      if (!state.collection) return;
      state.collection = null; state.catalogCategoryId = null; state.catalogCategoryName = 'Tất cả'; state.sort = 'featured';
      searchCatalog(); loadCategories();
    });
    document.querySelector('[data-sf-collection="combo"]')?.addEventListener('click', () => {
      const combo = state.collections.find(item => item.key === 'combo');
      if (combo) openCollection(combo); else showSubView('customer', 'catalog');
    });
    $('#comboForm').addEventListener('submit', createRestaurantCombo);
    $('#comboForm').addEventListener('input', updateComboPreview);
    $('#closeVoucherModal').addEventListener('click', closeVoucherModal);
    $('#voucherModal').addEventListener('click', event => { if (event.target.id === 'voucherModal') closeVoucherModal(); });
    $('#checkoutAddress').addEventListener('change', loadQuote);
    $('#promotionCode').addEventListener('change', loadQuote);
    $('#loadOffersButton').addEventListener('click', loadOffers);
    $('#searchForm').addEventListener('submit', event => {
      event.preventDefault();
      searchCatalog();
      showSubView('customer', 'catalog');
    });
    $('#refreshCustomerButton').addEventListener('click', () => Promise.allSettled([loadPublicData(), loadAddresses(), loadCart(), loadCustomerOrders()]));
    $('#addressForm').addEventListener('submit', createAddress);
    $('#loadCartButton').addEventListener('click', () => {
      showSubView('customer', 'cart');
      loadCart();
    });
    $('#checkoutForm').addEventListener('submit', checkout);
    $('#validatePromotionButton')?.addEventListener('click', validatePromotionCode);
    $('#itemOptionForm').addEventListener('submit', addSelectedItemToCart);
    bindItemModalControls();
    $('#closeItemModal').addEventListener('click', closeItemModal);
    $('#itemModal').addEventListener('click', event => {
      if (event.target.id === 'itemModal') closeItemModal();
    });
    $('#loadCustomerOrdersButton').addEventListener('click', () => {
      showSubView('customer', 'orders');
      loadCustomerOrders();
    });
    $('#loadFavoritesButton')?.addEventListener('click', () => {
      showSubView('customer', 'favorites');
      loadFavorites();
    });
    $('#loadSupportButton')?.addEventListener('click', () => {
      showSubView('customer', 'support');
      loadSupportTickets();
    });
    $('#supportTicketForm')?.addEventListener('submit', createSupportTicket);
    $('#refreshRestaurantButton').addEventListener('click', () => loadOwnerRestaurants());
    $('#ownerRestaurantSelect').addEventListener('change', event => {
      state.ownerRestaurantId = Number(event.target.value);
      renderOwnerRestaurants();
      if (state.subViews.restaurant === 'menu') loadOwnerMenu();
      if (state.subViews.restaurant === 'promotions') loadRestaurantPromotions();
    });
    $('#loadRestaurantQueueButton').addEventListener('click', () => {
      showSubView('restaurant', 'orders');
      loadRestaurantQueue();
    });
    $('#loadOwnerMenuButton').addEventListener('click', () => {
      showSubView('restaurant', 'menu');
      loadOwnerMenu();
    });
    $('#toggleCreateItemButton').addEventListener('click', () => {
      $('#createItemForm').hidden = !$('#createItemForm').hidden;
    });
    $('#createItemForm').addEventListener('submit', createMenuItem);
    $('#editItemForm')?.addEventListener('submit', updateMenuItemFromForm);
    $('#cancelEditItemButton')?.addEventListener('click', closeEditMenuItem);
    bindImageEditor('create');
    bindImageEditor('edit');
    $('#restaurantProfileForm')?.addEventListener('submit', updateRestaurantProfile);
    $('#createMenuCategoryForm')?.addEventListener('submit', createMenuCategory);
    $('#createToppingGroupForm')?.addEventListener('submit', createToppingGroup);
    $('#createToppingForm')?.addEventListener('submit', createTopping);
    $('#createVariantForm')?.addEventListener('submit', createItemVariant);
    $('#loadRestaurantPromotionsButton')?.addEventListener('click', loadRestaurantPromotions);
    $('#promotionForm')?.addEventListener('submit', createRestaurantPromotion);
    $('#refreshShipperButton').addEventListener('click', () => loadShipperDashboard());
    document.querySelectorAll('[data-availability]').forEach(button => {
      button.addEventListener('click', () => updateAvailability(button.dataset.availability));
    });
    $('#useBrowserLocationButton')?.addEventListener('click', useBrowserLocation);
    $('#shipperLocationForm')?.addEventListener('submit', updateShipperLocation);
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

  window.FD = { loadAddresses, loadOwnerRestaurants, api, state, escapeHtml, formatMoney, statusLabel, setStatus, toast, openAuth, roleOf, roleLabel, showScreen, showSubView, photo, foodEmoji, activityLabel, paymentLabel, loadOwnerMenu,  viewCustomerOrder, viewRestaurantOrder, loadShipperDashboard };
  bind();
  window.FDLive?.mountLocationPicker();
  renderSession();
  loadPublicData();
  if (state.token) loadMe();
}());
