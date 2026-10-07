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
      restaurant: 'branches',
      shipper: 'profile',
      admin: 'restaurants',
      account: 'profile'
    },
    apiLog: []
  };

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

  function imageForFood(seed, imageUrl = '') {
    if (imageUrl) {
      return `style="background-image: linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.38)), url('${escapeHtml(imageUrl)}')"`;
    }
    const palette = [
      ['#0f766e', '#14b8a6'],
      ['#b45309', '#f59e0b'],
      ['#be123c', '#fb7185'],
      ['#4338ca', '#818cf8'],
      ['#15803d', '#86efac']
    ];
    const pair = palette[Math.abs(String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length];
    return `style="background: radial-gradient(circle at 25% 20%, rgba(255,255,255,.35), transparent 28%), linear-gradient(135deg, ${pair[0]}, ${pair[1]})"`;
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
    document.body.dataset.auth = state.user ? 'authenticated' : 'guest';
    $('#sessionPill').textContent = state.user
      ? `${state.user.username || state.user.email} · ${roleLabel(role)}`
      : 'Chưa đăng nhập';
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
      await Promise.allSettled([loadAddresses(), loadCart(), loadCustomerOrders(), loadFavorites(), loadSupportTickets(), loadNotifications()]);
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
        <article class="banner-card banner-card-rich" ${imageForFood(item.title, item.imageUrl)}>
          <div>
            <span>Ưu đãi hôm nay</span>
            <strong>${escapeHtml(item.title)}</strong>
            <p>Chọn nhanh nhà hàng phù hợp, thêm món và checkout trong một luồng.</p>
          </div>
          <button class="light-button secondary-button" type="button" data-banner-target="${escapeHtml(item.targetUrl || '')}">Khám phá</button>
        </article>
      `).join('') : `
        <article class="banner-card banner-card-rich">
          <div>
            <span>Food Delivery</span>
            <strong>Chọn món theo danh mục, đặt hàng và theo dõi đơn thật.</strong>
            <p>Dữ liệu hiện có 20 nhà hàng và hàng nghìn món theo nhiều nhóm.</p>
          </div>
        </article>
      `;
      document.querySelectorAll('[data-banner-target]').forEach(button => {
        button.addEventListener('click', () => applyBannerTarget(button.dataset.bannerTarget));
      });
    } catch (error) {
      $('#bannerStrip').innerHTML = errorBox(error);
    }
  }

  function applyBannerTarget(target) {
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
        ? `<button type="button" class="category-chip ${state.catalogCategoryId ? '' : 'is-active'}" data-category-filter="">Tất cả</button>`
          + items.map(item => `<button type="button" class="category-chip ${Number(item.id) === Number(state.catalogCategoryId) ? 'is-active' : ''}" data-category-filter="${item.id}" data-category-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`).join('')
        : '<span class="category-chip">Chưa có danh mục</span>';
      document.querySelectorAll('[data-category-filter]').forEach(button => {
        button.addEventListener('click', () => {
          state.catalogCategoryId = button.dataset.categoryFilter ? Number(button.dataset.categoryFilter) : null;
          state.catalogCategoryName = button.dataset.categoryName || 'Tất cả';
          document.querySelectorAll('[data-category-filter]').forEach(item => item.classList.toggle('is-active', item === button));
          searchCatalog();
        });
      });
    } catch (error) {
      $('#categoryStrip').innerHTML = errorBox(error);
    }
  }

  async function searchCatalog() {
    const keyword = $('#catalogKeyword').value.trim();
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (state.catalogCategoryId) params.set('categoryId', String(state.catalogCategoryId));
    const query = params.toString() ? `?${params}` : '';
    const menuParams = new URLSearchParams(params);
    menuParams.set('sort', 'featured');
    try {
      const [restaurants, menu] = await Promise.all([
        api(`/api/catalog/restaurants${query}`),
        api(`/api/catalog/menu-items?${menuParams}`)
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
    $('#restaurantCount').textContent = `${state.catalogCategoryName || 'Tất cả'} · ${total} kết quả`;
    $('#restaurantList').innerHTML = state.restaurants.length ? state.restaurants.map(item => `
      <article class="restaurant-card restaurant-card-rich" data-view-restaurant="${item.id}">
        <div class="food-photo restaurant-photo" ${imageForFood(item.name, item.logoUrl || item.coverUrl)}>${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.district || item.city)} · ${Number(item.rating || 0).toFixed(1)} sao · ${item.averagePrepareTime || 0} phút</span>
          <span>Đơn tối thiểu ${formatMoney(item.minimumOrder)}</span>
        </div>
        <button class="secondary-button" type="button">Xem</button>
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-view-restaurant]').forEach(button => {
      button.addEventListener('click', () => selectRestaurant(Number(button.dataset.viewRestaurant)));
    });
  }

  function renderMenuList(items) {
    $('#menuCount').textContent = `${state.catalogCategoryName || 'Tất cả'} · ${items.length} món`;
    $('#menuList').innerHTML = items.length ? items.map(item => `
      <article class="menu-card menu-card-rich" data-search-item-restaurant="${item.restaurantId}">
        <div class="food-photo menu-photo" ${imageForFood(item.name, item.imageUrl)}>${escapeHtml(item.name.slice(0, 1).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.restaurantName || '')} · ${item.preparationTime || 0} phút · bán ${item.soldCount || 0}</span>
          <span>${formatMoney(item.effectivePrice)}</span>
        </div>
        <button class="secondary-button" type="button">Mở menu</button>
      </article>
    `).join('') : empty();
    document.querySelectorAll('[data-search-item-restaurant]').forEach(button => {
      button.addEventListener('click', () => selectRestaurant(Number(button.dataset.searchItemRestaurant)));
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
    const items = state.selectedMenu;
    const popular = items.filter(item => item.isFeatured).slice(0, 6);
    const quickItems = popular.length ? popular : items.slice(0, 6);
    const menuSections = buildMenuSections(menuResponse);
    $('#restaurantDetail').innerHTML = `
      <div class="restaurant-hero" ${imageForFood(detail.name, detail.images?.[0]?.imageUrl)}>
        <div>
          <span class="hero-kicker">${escapeHtml(detail.categoryName || 'Nhà hàng')}</span>
          <strong>${escapeHtml(detail.name)}</strong>
          <span>${escapeHtml(detail.address)}, ${escapeHtml(detail.district || '')}, ${escapeHtml(detail.city)}</span>
          <span>Giờ mở cửa ${escapeHtml(detail.openingTime || '--')} - ${escapeHtml(detail.closingTime || '--')} · ${Number(detail.rating || 0).toFixed(1)} sao · ${detail.averagePrepareTime || 0} phút</span>
        </div>
        <button class="secondary-button light-button" type="button" data-favorite-restaurant="${detail.id}">Lưu nhà hàng</button>
      </div>
      <div class="restaurant-meta-grid">
        <article><strong>${items.length}</strong><span>món đang bán</span></article>
        <article><strong>${menuSections.length}</strong><span>nhóm menu</span></article>
        <article><strong>${formatMoney(detail.minimumOrder)}</strong><span>đơn tối thiểu</span></article>
        <article><strong>${detail.totalOrders || 0}</strong><span>đơn đã phục vụ</span></article>
      </div>
      <div class="menu-quick-nav">
        ${menuSections.map(section => `<a href="#menu-section-${section.id}">${escapeHtml(section.name)} <small>${section.items.length}</small></a>`).join('')}
      </div>
      <section class="featured-menu-section">
        <div class="section-heading">
          <div>
            <p>Món nổi bật</p>
            <h3>Gợi ý nên thử</h3>
          </div>
          <span>${quickItems.length} món</span>
        </div>
        <div class="fake-gallery">
          ${quickItems.map(item => `<button type="button" class="gallery-chip" data-open-item="${item.id}">${escapeHtml(item.name)}</button>`).join('')}
        </div>
      </section>
      <div class="restaurant-menu-sections">
        ${menuSections.length ? menuSections.map(section => `
          <section class="menu-section" id="menu-section-${section.id}">
            <div class="section-heading">
              <div>
                <p>${escapeHtml(section.menuName || 'Menu')}</p>
                <h3>${escapeHtml(section.name)}</h3>
                ${section.description ? `<span>${escapeHtml(section.description)}</span>` : ''}
              </div>
              <span>${section.items.length} món</span>
            </div>
            <div class="menu-grid">
              ${section.items.map(item => renderDetailMenuItem(item, detail.id)).join('')}
            </div>
          </section>
        `).join('') : empty()}
      </div>
      ${renderRestaurantReviews(detail, reviewResponse)}
    `;
    document.querySelectorAll('[data-open-item]').forEach(button => {
      button.addEventListener('click', () => openItemModal(Number(button.dataset.openItem), detail.id));
    });
    document.querySelector('[data-favorite-restaurant]')?.addEventListener('click', () => toggleFavoriteRestaurant(detail.id));
    document.querySelector('[data-open-customer-orders]')?.addEventListener('click', () => {
      showSubView('customer', 'orders');
      loadCustomerOrders();
    });
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
      <article class="food-tile" data-open-item="${item.id}">
        <div class="food-photo food-tile-photo" ${imageForFood(item.name, item.imageUrl)}>
          <span>${item.isFeatured ? 'Nổi bật' : escapeHtml(item.categoryName || 'Menu')}</span>
        </div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.preparationTime || 0} phút · đã bán ${item.soldCount || 0}</span>
          <b>${formatMoney(item.effectivePrice)}</b>
          <input type="hidden" data-restaurant-for="${item.id}" value="${restaurantId}">
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
    $('#itemModalMedia').innerHTML = `<div class="food-photo modal-photo" ${imageForFood(item.name, item.imageUrl)}><span>${escapeHtml(item.name)}</span></div>`;
    $('#itemModalGallery').innerHTML = `
      <button type="button" class="gallery-chip" data-favorite-item="${item.id}">Lưu món</button>
      ${[item, ...state.selectedMenu.filter(value => value.id !== item.id).slice(0, 4)]
        .map(value => `<button type="button" class="gallery-chip" data-open-item="${value.id}">${escapeHtml(value.name)}</button>`)
        .join('')}
    `;
    $('#itemVariantOptions').innerHTML = renderVariantOptions(item);
    $('#itemToppingOptions').innerHTML = renderToppingOptions(item);
    $('#itemQuantity').value = '1';
    $('#itemModal').hidden = false;
    document.body.classList.add('modal-open');
    document.querySelectorAll('#itemModal [data-open-item]').forEach(button => {
      button.addEventListener('click', () => openItemModal(Number(button.dataset.openItem), restaurantId));
    });
    document.querySelector('#itemModal [data-favorite-item]')?.addEventListener('click', () => toggleFavoriteItem(item.id));
  }

  function closeItemModal() {
    $('#itemModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function renderVariantOptions(item) {
    const variants = item.variants || [];
    if (!variants.length) return '<div class="option-box"><strong>Size</strong><span class="muted">Mặc định</span></div>';
    return `
      <div class="option-box">
        <strong>Chọn size</strong>
        <select id="itemVariant">
          <option value="">Mặc định +0</option>
          ${variants.map(variant => `<option value="${variant.id}">${escapeHtml(variant.name)} +${formatMoney(variant.priceAdjustment)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  function renderToppingOptions(item) {
    const groups = item.toppingGroups || [];
    if (!groups.length) return '<div class="option-box"><strong>Topping</strong><span class="muted">Món này chưa có topping thêm.</span></div>';
    return groups.map(group => `
      <div class="option-box">
        <strong>${escapeHtml(group.name)} ${group.required ? '<span class="status-chip">Bắt buộc</span>' : ''}</strong>
        <span class="muted">Chọn ${group.minSelect || 0}-${group.maxSelect || (group.toppings || []).length}</span>
        <div class="topping-list">
          ${(group.toppings || []).map(topping => `
            <label>
              <input type="checkbox" data-modal-topping="${topping.id}" data-topping-group="${group.id}">
              <span>${escapeHtml(topping.name)}</span>
              <b>+${formatMoney(topping.price)}</b>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  async function addSelectedItemToCart(event) {
    event.preventDefault();
    const item = state.selectedMenuItem;
    if (!item) return;
    if (!state.user || roleOf(state.user) !== 'CUSTOMER') {
      setStatus('Cần đăng nhập tài khoản khách hàng để thêm món vào giỏ.', true);
      return;
    }
    const variantValue = $('#itemVariant')?.value || null;
    const quantity = Number($('#itemQuantity')?.value || 1);
    const toppingIds = Array.from(document.querySelectorAll('[data-modal-topping]:checked')).map(input => Number(input.dataset.modalTopping));
    try {
      state.cart = await api('/api/customer/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: Number(state.selectedMenuRestaurantId),
          menuItemId: Number(item.id),
          variantId: variantValue ? Number(variantValue) : null,
          quantity,
          toppingIds
        })
      });
      renderCart();
      closeItemModal();
      setStatus('Đã thêm món vào giỏ hàng.');
      showSubView('customer', 'cart');
    } catch (error) {
      setStatus(error.message, true);
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
      ? `${selected.receiverName} · ${selected.addressLine}, ${selected.district || ''}, ${selected.city}`
      : 'Chưa có địa chỉ';
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
          city: $('#addressCity').value.trim() || 'TP.HCM',
          isDefault: state.addresses.length === 0
        })
      });
      state.addresses = [address, ...state.addresses.filter(item => item.id !== address.id)];
      renderAddresses();
      $('#checkoutAddress').value = String(address.id);
      $('#addressForm').reset();
      $('#addressCity').value = 'TP.HCM';
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
          ${(item.toppings || []).length ? `<span class="muted">${item.toppings.map(topping => `${escapeHtml(topping.name)} +${formatMoney(topping.price)}`).join(' · ')}</span>` : ''}
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
      <div class="fee-row"><span>Tạm tính</span><b>${formatMoney(cart.subtotal)}</b></div>
      <div class="fee-row"><span>Phí giao hàng, dịch vụ và thuế sẽ được tính khi đặt hàng</span><b>Tự động</b></div>
      <button class="secondary-button" type="button" id="clearCartButton">Xóa toàn bộ giỏ</button>
    `;
    $('#cartItems').innerHTML = rows + fees;
    bindCartActions();
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
          customerNote: $('#customerNote').value.trim() || undefined
        })
      });
      state.cart = null;
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
              <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${item.variantName ? `${escapeHtml(item.variantName)} · ` : ''}SL ${item.quantity}</span></div>
              <b>${formatMoney(item.totalPrice)}</b>
            </div>
          `).join('')}
        </div>
        <div class="fee-row"><span>Tạm tính</span><b>${formatMoney(order.subtotal)}</b></div>
        <div class="fee-row"><span>Phí giao</span><b>${formatMoney(order.deliveryFee)}</b></div>
        <div class="fee-row"><span>Tổng thanh toán</span><b>${formatMoney(order.totalAmount)}</b></div>
        <div class="timeline">
          ${(order.statusHistory || []).map(step => `<span>${escapeHtml(statusLabel(step.newStatus))} · ${escapeHtml(new Date(step.createdAt).toLocaleString('vi-VN'))}</span>`).join('')}
        </div>
        <div class="button-row">
          <button class="secondary-button" type="button" data-create-invoice="${order.id}">Tạo hóa đơn</button>
          <button class="secondary-button" type="button" data-review-restaurant="${order.id}">Đánh giá nhà hàng</button>
          <button class="secondary-button" type="button" data-review-shipper="${order.id}">Đánh giá tài xế</button>
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
          <article class="restaurant-card restaurant-card-rich" data-view-restaurant="${item.id}">
            <div class="food-photo restaurant-photo" ${imageForFood(item.name)}>${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
            <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.district || item.city || '')} · ${Number(item.rating || 0).toFixed(1)} sao</span></div>
            <button class="secondary-button" type="button">Xem lại</button>
          </article>
        `).join('')}
        ${menuItems.map(item => `
          <article class="menu-card menu-card-rich" data-search-item-restaurant="${item.restaurantId}">
            <div class="food-photo menu-photo" ${imageForFood(item.name, item.imageUrl)}>${escapeHtml(item.name.slice(0, 1).toUpperCase())}</div>
            <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.restaurantName || '')}</span><span>${formatMoney(item.effectivePrice)}</span></div>
            <button class="secondary-button" type="button">Mở nhà hàng</button>
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
        <button class="secondary-button" type="button" data-restaurant-order-detail="${order.id}">Chi tiết</button>
        ${action ? `<button type="button" data-order-id="${order.id}" data-order-action="${action[0]}">${action[1]}</button>` : '<span class="status-chip">Chờ shipper</span>'}
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
              <div><strong>${escapeHtml(item.name)}</strong><span class="muted">${item.variantName ? `${escapeHtml(item.variantName)} · ` : ''}SL ${item.quantity}</span></div>
              <b>${formatMoney(item.totalPrice)}</b>
            </div>
          `).join('')}
          <div class="fee-row"><span>Tổng đơn</span><b>${formatMoney(order.totalAmount)}</b></div>
        </article>
      `;
      $('#backRestaurantOrdersButton').addEventListener('click', loadRestaurantQueue);
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
            <div class="food-photo owner-menu-thumb" ${imageForFood(item.name, item.imageUrl)}>${escapeHtml(item.name.slice(0, 1).toUpperCase())}</div>
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
      $('#restaurantPromotions').innerHTML = items.length ? items.map(item => `
        <article class="order-card">
          <strong>${escapeHtml(item.code)} · ${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.discountType)} · ${item.discountType === 'PERCENT' ? `${item.discountValue}%` : formatMoney(item.discountValue)} · tối thiểu ${formatMoney(item.minimumOrder)}</span>
          <span>${escapeHtml(statusLabel(item.status))} · đã dùng ${item.usedCount || 0}</span>
          <div class="button-row">
            <button class="secondary-button" type="button" data-promotion-status="${item.id}:${item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}">${item.status === 'ACTIVE' ? 'Tạm tắt' : 'Bật lại'}</button>
            <button class="text-button danger-text" type="button" data-delete-promotion="${item.id}">Xóa</button>
          </div>
        </article>
      `).join('') : empty();
      document.querySelectorAll('[data-promotion-status]').forEach(button => {
        button.addEventListener('click', () => {
          const [promotionId, status] = button.dataset.promotionStatus.split(':');
          updateRestaurantPromotion(Number(promotionId), { status });
        });
      });
      document.querySelectorAll('[data-delete-promotion]').forEach(button => {
        button.addEventListener('click', () => deleteRestaurantPromotion(Number(button.dataset.deletePromotion)));
      });
    } catch (error) {
      $('#restaurantPromotions').innerHTML = errorBox(error);
    }
  }

  async function createRestaurantPromotion(event) {
    event.preventDefault();
    const restaurantId = Number($('#ownerRestaurantSelect').value || state.ownerRestaurantId);
    if (!restaurantId) return;
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    try {
      await api(`/api/restaurant/restaurants/${restaurantId}/promotions`, {
        method: 'POST',
        body: JSON.stringify({
          code: $('#promotionCodeInput').value.trim(),
          name: $('#promotionNameInput').value.trim(),
          discountType: $('#promotionTypeInput').value,
          discountValue: Number($('#promotionValueInput').value),
          minimumOrder: Number($('#promotionMinimumInput').value || 0),
          maxDiscount: $('#promotionTypeInput').value === 'PERCENT' ? 50000 : null,
          usageLimit: 500,
          usagePerCustomer: 3,
          startAt: start.toISOString().slice(0, 19).replace('T', ' '),
          endAt: end.toISOString().slice(0, 19).replace('T', ' '),
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

  async function loadAdminDashboard() {
    if (!state.token || roleOf(state.user) !== 'ADMIN') return;
    const [dashboard, restaurants, audit, users] = await Promise.allSettled([
      api('/api/admin/dashboard'),
      api('/api/admin/restaurants'),
      api('/api/admin/audit-logs'),
      api('/api/accounts/admin/users')
    ]);
    if (dashboard.status === 'fulfilled') {
      renderAdminStats(dashboard.value);
      renderAdminOperations(dashboard.value);
    } else {
      $('#adminStats').innerHTML = errorBox(dashboard.reason);
    }
    if (restaurants.status === 'fulfilled') {
      const items = restaurants.value.items || [];
      $('#adminRestaurants').innerHTML = items.length ? items.slice(0, 12).map(item => `
        <article class="restaurant-card restaurant-card-rich">
          <div class="food-photo restaurant-photo" ${imageForFood(item.name, item.logoUrl || item.coverImageUrl)}>${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(item.city || '')}</span>
            <span>Hoa hồng ${Number(item.commissionRate || 0).toFixed(1)}% · Đánh giá ${Number(item.rating || 0).toFixed(1)}</span>
          </div>
          <div class="button-row">
            <button class="secondary-button" type="button" data-admin-restaurant-detail="${item.id}">Chi tiết</button>
            <button class="secondary-button" type="button" data-restaurant-commission="${item.id}:${item.commissionRate || 0}">Hoa hồng</button>
            <button class="secondary-button" type="button" data-restaurant-state="${item.id}:ACTIVE">Duyệt</button>
            <button class="secondary-button" type="button" data-restaurant-state="${item.id}:INACTIVE">Tạm ngưng</button>
          </div>
        </article>
      `).join('') : empty();
      bindRestaurantStateActions();
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
    if (dashboard.status !== 'fulfilled') renderAdminOperations(null);
  }

  function renderAdminStats(dashboard) {
    const overview = dashboard.overview || {};
    $('#adminStats').innerHTML = `
      <article class="stat-card"><span>GMV hôm nay</span><strong>${formatMoney(overview.todayGmv)}</strong><small>${overview.todayOrders || 0} đơn mới</small></article>
      <article class="stat-card"><span>Doanh thu đã thanh toán</span><strong>${formatMoney(overview.paidRevenue)}</strong><small>${overview.totalOrders || 0} đơn toàn hệ thống</small></article>
      <article class="stat-card"><span>Nhà hàng active</span><strong>${overview.activeRestaurants || 0}</strong><small>${overview.pendingRestaurants || 0} đang chờ duyệt</small></article>
      <article class="stat-card"><span>Tài khoản active</span><strong>${overview.activeUsers || 0}</strong><small>${overview.totalUsers || 0} tài khoản tổng</small></article>
    `;
  }

  function renderAdminOperations(dashboard) {
    const recentOrders = dashboard?.recentOrders || [];
    const support = dashboard?.supportStatus || [];
    $('#adminOps').innerHTML = `
      <article class="order-card"><strong>Đơn gần đây</strong><span>${recentOrders.length ? recentOrders.map(order => `${order.orderCode}: ${statusLabel(order.status)}`).join(' · ') : 'Chưa có đơn'}</span></article>
      <article class="order-card"><strong>Helpdesk</strong><span>${support.length ? support.map(item => `${statusLabel(item.status)}: ${item.total}`).join(' · ') : 'Chưa có ticket'}</span></article>
      <article class="order-card"><strong>Đối soát</strong><span>Tạo kỳ payout cho nhà hàng từ đơn đã giao.</span><button class="secondary-button" type="button" id="generateSettlementButton">Generate kỳ này</button></article>
      <article class="order-card"><strong>Import / Export</strong><span>Tạo job xuất đơn/doanh thu/shipper/settlement.</span><div class="button-row"><button class="secondary-button" type="button" data-export-type="ORDERS">Xuất đơn</button><button class="secondary-button" type="button" data-export-type="REVENUE">Xuất doanh thu</button><button class="secondary-button" type="button" id="runBackgroundJobsButton">Chạy job nền</button><button class="secondary-button" type="button" data-screen-target-inline="api">Xem log phiên</button></div></article>
      <div id="adminSupportTickets"></div>
      <div id="adminJobPanel"></div>
      <article class="order-card"><strong>Swagger API</strong><span>Mở tài liệu API để test endpoint vận hành.</span><a class="secondary-link" href="/api/docs" target="_blank" rel="noreferrer">Mở Swagger</a></article>
    `;
    document.querySelectorAll('[data-screen-target-inline]').forEach(button => {
      button.addEventListener('click', () => showScreen(button.dataset.screenTargetInline));
    });
    document.querySelectorAll('[data-export-type]').forEach(button => {
      button.addEventListener('click', () => createAdminExport(button.dataset.exportType));
    });
    $('#generateSettlementButton')?.addEventListener('click', generateAdminSettlement);
    $('#runBackgroundJobsButton')?.addEventListener('click', runBackgroundJobs);
    loadAdminSupportTickets();
    loadAdminJobs();
  }

  async function loadAdminSupportTickets() {
    const node = $('#adminSupportTickets');
    if (!node || roleOf(state.user) !== 'ADMIN') return;
    try {
      const result = await api('/api/communications/support/tickets');
      const items = result.items || [];
      node.innerHTML = items.length ? `
        <article class="order-card">
          <strong>Ticket cần xử lý</strong>
          <span>${items.filter(item => !['RESOLVED', 'CLOSED'].includes(item.status)).length} ticket đang mở</span>
        </article>
        ${items.slice(0, 8).map(item => `
          <article class="order-card">
            <strong>${escapeHtml(item.ticketCode)} · ${escapeHtml(statusLabel(item.status))}</strong>
            <span>${escapeHtml(item.username || '')} · ${escapeHtml(item.subject)} · ${escapeHtml(item.category)}</span>
            <div class="button-row">
              <button class="secondary-button" type="button" data-ticket-status="${item.id}:IN_PROGRESS">Đang xử lý</button>
              <button class="secondary-button" type="button" data-ticket-status="${item.id}:RESOLVED">Đã giải quyết</button>
              <button class="secondary-button" type="button" data-ticket-status="${item.id}:CLOSED">Đóng</button>
            </div>
          </article>
        `).join('')}
      ` : '<div class="empty-state">Chưa có ticket hỗ trợ.</div>';
      node.querySelectorAll('[data-ticket-status]').forEach(button => {
        button.addEventListener('click', () => {
          const [ticketId, status] = button.dataset.ticketStatus.split(':');
          updateSupportTicket(ticketId, status);
        });
      });
    } catch (error) {
      node.innerHTML = errorBox(error);
    }
  }

  async function updateSupportTicket(ticketId, status) {
    try {
      await api(`/api/communications/support/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadAdminSupportTickets();
      setStatus('Đã cập nhật ticket.');
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function createAdminExport(exportType) {
    try {
      const result = await api('/api/jobs/exports', {
        method: 'POST',
        body: JSON.stringify({ exportType, format: 'CSV', filters: {} })
      });
      setStatus(`Đã tạo file export ${exportType} #${result.id}.`);
      await loadAdminJobs();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function loadAdminJobs() {
    const node = $('#adminJobPanel');
    if (!node || roleOf(state.user) !== 'ADMIN') return;
    try {
      const [exports, imports, background] = await Promise.allSettled([
        api('/api/jobs/exports'),
        api('/api/jobs/imports'),
        api('/api/jobs/background')
      ]);
      const exportItems = exports.status === 'fulfilled' ? exports.value.items || [] : [];
      const importItems = imports.status === 'fulfilled' ? imports.value.items || [] : [];
      const backgroundItems = background.status === 'fulfilled' ? background.value.items || [] : [];
      node.innerHTML = `
        <article class="order-card">
          <strong>Job dữ liệu</strong>
          <span>${exportItems.length} export · ${importItems.length} import · ${backgroundItems.length} job nền</span>
        </article>
        ${exportItems.slice(0, 5).map(item => `
          <article class="order-card">
            <strong>${escapeHtml(item.exportType)} · ${escapeHtml(statusLabel(item.status))}</strong>
            <span>${escapeHtml(item.format)} · ${escapeHtml(new Date(item.createdAt).toLocaleString('vi-VN'))}</span>
            ${item.fileUrl ? `<a class="secondary-link" href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noreferrer">Tải file</a>` : ''}
          </article>
        `).join('')}
      `;
    } catch (error) {
      node.innerHTML = errorBox(error);
    }
  }

  async function runBackgroundJobs() {
    try {
      const result = await api('/api/jobs/background/run', { method: 'POST' });
      await loadAdminJobs();
      setStatus(`Đã chạy ${result.completedJobIds?.length || 0} job nền.`);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function generateAdminSettlement() {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const periodStart = window.prompt('Ngày bắt đầu kỳ đối soát (YYYY-MM-DD)', startDate);
    if (!periodStart) return;
    const periodEnd = window.prompt('Ngày kết thúc kỳ đối soát (YYYY-MM-DD)', end);
    if (!periodEnd) return;
    try {
      const result = await api('/api/settlements/admin/settlements/generate', {
        method: 'POST',
        body: JSON.stringify({ periodStart, periodEnd })
      });
      setStatus(`Đã tạo ${result.totalItems || 0} kỳ đối soát.`);
      await loadAdminDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function bindRestaurantStateActions() {
    document.querySelectorAll('[data-admin-restaurant-detail]').forEach(button => {
      button.addEventListener('click', () => viewAdminRestaurant(Number(button.dataset.adminRestaurantDetail)));
    });
    document.querySelectorAll('[data-restaurant-commission]').forEach(button => {
      button.addEventListener('click', () => {
        const [id, currentRate] = button.dataset.restaurantCommission.split(':');
        updateRestaurantCommission(id, currentRate);
      });
    });
    document.querySelectorAll('[data-restaurant-state]').forEach(button => {
      button.addEventListener('click', () => {
        const [id, status] = button.dataset.restaurantState.split(':');
        updateRestaurantState(id, status);
      });
    });
  }

  async function updateRestaurantState(id, status) {
    try {
      await api(`/api/admin/restaurants/${id}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setStatus(`Đã cập nhật nhà hàng #${id} thành ${statusLabel(status)}.`);
      await loadAdminDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function updateRestaurantCommission(id, currentRate) {
    const commissionRate = window.prompt('Nhập hoa hồng nhà hàng (%)', String(currentRate || 15));
    if (commissionRate === null) return;
    try {
      await api(`/api/admin/restaurants/${id}/state`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate: Number(commissionRate) })
      });
      setStatus(`Đã cập nhật hoa hồng nhà hàng #${id}.`);
      await loadAdminDashboard();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function viewAdminRestaurant(id) {
    try {
      const item = await api(`/api/admin/restaurants/${id}`);
      $('#adminRestaurants').innerHTML = `
        <article class="restaurant-card restaurant-card-rich admin-detail-card">
          <div class="food-photo restaurant-photo" ${imageForFood(item.name, item.images?.[0]?.imageUrl)}>${escapeHtml(item.name.slice(0, 2).toUpperCase())}</div>
          <div>
            <button class="text-button" type="button" id="backToAdminRestaurants">← Quay lại danh sách</button>
            <strong>${escapeHtml(item.name)} · ${escapeHtml(statusLabel(item.status))}</strong>
            <span>Chủ quán: ${escapeHtml(item.ownerUsername || '')} · ${escapeHtml(item.ownerEmail || '')}</span>
            <span>${escapeHtml(item.address || '')}, ${escapeHtml(item.district || '')}, ${escapeHtml(item.city || '')}</span>
            <span>Đánh giá ${Number(item.rating || 0).toFixed(1)}/5 · ${item.totalReviews || 0} review · ${item.totalOrders || 0} đơn · GMV ${formatMoney(item.totalRevenue)}</span>
            <span>Hoa hồng ${Number(item.commissionRate || 0).toFixed(1)}% · Mở cửa ${escapeHtml(item.openingTime || '--')} - ${escapeHtml(item.closingTime || '--')}</span>
          </div>
          <div class="button-row">
            <button class="secondary-button" type="button" data-restaurant-commission="${item.id}:${item.commissionRate || 0}">Chỉnh hoa hồng</button>
            <button class="secondary-button" type="button" data-restaurant-state="${item.id}:ACTIVE">Duyệt/khôi phục</button>
            <button class="secondary-button" type="button" data-restaurant-state="${item.id}:SUSPENDED">Tạm khóa</button>
          </div>
        </article>
      `;
      $('#backToAdminRestaurants')?.addEventListener('click', loadAdminDashboard);
      bindRestaurantStateActions();
    } catch (error) {
      setStatus(error.message, true);
    }
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
    const html = items.length ? items.slice(0, 50).map(item => `
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
    ['#userManagement', '#accountUserManagement'].forEach(selector => {
      const node = $(selector);
      if (node) node.innerHTML = html;
    });
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

  function defaultSubView(screen) {
    return {
      customer: 'catalog',
      restaurant: 'branches',
      shipper: 'profile',
      admin: 'restaurants',
      account: 'profile'
    }[screen] || '';
  }

  function showSubView(screen, view) {
    if (!screen || !view) return;
    state.subViews[screen] = view;
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
    if (screen === 'customer' && view === 'support') loadSupportTickets();
    if (screen === 'admin' && view === 'ops') {
      loadAdminSupportTickets();
      loadAdminJobs();
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
    showSubView(target, state.subViews[target] || defaultSubView(target));
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
      login($('#loginIdentifier').value, $('#loginPassword').value).catch(error => setStatus(error.message, true));
    });
    const logout = async () => {
      if (state.refreshToken) {
        await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: state.refreshToken }) }).catch(() => null);
      }
      clearSession();
      setStatus('Đã đăng xuất.');
      showScreen('customer');
      showSubView('customer', 'catalog');
    };
    $('#logoutButton').addEventListener('click', logout);
    $('#headerLogoutButton')?.addEventListener('click', logout);
    $('#loadMeButton').addEventListener('click', () => loadMe());
    $('#searchForm').addEventListener('submit', event => {
      event.preventDefault();
      searchCatalog();
      showSubView('customer', 'catalog');
    });
    $('#refreshCustomerButton').addEventListener('click', () => Promise.allSettled([loadPublicData(), loadAddresses(), loadCart(), loadCustomerOrders()]));
    $('#loadAddressesButton').addEventListener('click', () => loadAddresses());
    $('#addressForm').addEventListener('submit', createAddress);
    $('#loadCartButton').addEventListener('click', () => {
      showSubView('customer', 'cart');
      loadCart();
    });
    $('#checkoutForm').addEventListener('submit', checkout);
    $('#validatePromotionButton')?.addEventListener('click', validatePromotionCode);
    $('#itemOptionForm').addEventListener('submit', addSelectedItemToCart);
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
    $('#loadAdminButton').addEventListener('click', () => loadAdminDashboard());
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

  bind();
  renderSession();
  loadPublicData();
  if (state.token) loadMe();
}());
