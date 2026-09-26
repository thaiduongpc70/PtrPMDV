(function () {
  const roleData = {
    customer: {
      label: 'Customer',
      count: 6,
      scope: 'Orders',
      status: 'Active',
      title: 'Customer account',
      identifier: 'demo.customer',
      password: 'FoodDemo!2026',
      initials: 'DN',
      profile: {
        fullName: 'Duong Nguyen',
        email: 'duong@example.com',
        phone: '0901234567',
        address: '12 Nguyen Trai',
        city: 'Ho Chi Minh',
        gender: 'MALE'
      },
      fields: [
        ['fullName', 'Full name', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Phone', 'tel'],
        ['address', 'Default address', 'text'],
        ['city', 'City', 'text'],
        ['gender', 'Gender', 'select']
      ],
      permissions: ['auth.login', 'profile.update', 'address.manage', 'order.create', 'review.create', 'payment.create'],
      queue: [
        ['Pho thin combo', 'Draft cart', 'Customer'],
        ['District 1 address', 'Default', 'Customer'],
        ['Email verification', 'Pending', 'System']
      ]
    },
    restaurant: {
      label: 'Restaurant',
      count: 7,
      scope: 'Menu',
      status: 'Open',
      title: 'Restaurant operator',
      identifier: 'demo.restaurant',
      password: 'FoodDemo!2026',
      initials: 'BX',
      profile: {
        fullName: 'Bep Xanh',
        email: 'owner@bepxanh.vn',
        phone: '02839990000',
        address: '45 Le Loi',
        city: 'Ho Chi Minh',
        gender: 'OTHER'
      },
      fields: [
        ['fullName', 'Restaurant name', 'text'],
        ['email', 'Owner email', 'email'],
        ['phone', 'Phone', 'tel'],
        ['address', 'Pickup address', 'text'],
        ['city', 'City', 'text'],
        ['gender', 'Contact type', 'select']
      ],
      permissions: ['restaurant.view', 'restaurant.update', 'menu.manage', 'order.accept', 'promotion.manage', 'settlement.view', 'image.manage'],
      queue: [
        ['Lunch menu', 'Published', 'Kitchen'],
        ['Operating hours', 'Updated', 'Manager'],
        ['Cover photo', 'Review', 'Owner']
      ]
    },
    shipper: {
      label: 'Shipper',
      count: 5,
      scope: 'Delivery',
      status: 'Online',
      title: 'Shipper profile',
      identifier: 'demo.shipper',
      password: 'FoodDemo!2026',
      initials: 'SP',
      profile: {
        fullName: 'Tran Phong',
        email: 'phong.shipper@example.com',
        phone: '0907654321',
        address: 'Hub Thu Duc',
        city: 'Ho Chi Minh',
        gender: 'MALE'
      },
      fields: [
        ['fullName', 'Full name', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Phone', 'tel'],
        ['address', 'Active hub', 'text'],
        ['city', 'City', 'text'],
        ['gender', 'Gender', 'select']
      ],
      permissions: ['delivery.view', 'delivery.accept', 'delivery.update', 'location.update', 'earning.view'],
      queue: [
        ['Order FD-1024', 'Assigned', 'Dispatcher'],
        ['GPS heartbeat', 'Live', 'Device'],
        ['Cash handoff', 'Due', 'Finance']
      ]
    },
    admin: {
      label: 'Admin',
      count: 9,
      scope: 'Platform',
      status: 'Secure',
      title: 'Admin console',
      identifier: 'demo.admin',
      password: 'FoodDemo!2026',
      initials: 'AD',
      profile: {
        fullName: 'Platform Admin',
        email: 'admin@fooddelivery.local',
        phone: '0900000000',
        address: 'Operations center',
        city: 'Ho Chi Minh',
        gender: 'OTHER'
      },
      fields: [
        ['fullName', 'Display name', 'text'],
        ['email', 'Admin email', 'email'],
        ['phone', 'Phone', 'tel'],
        ['address', 'Office', 'text'],
        ['city', 'City', 'text'],
        ['gender', 'Contact type', 'select']
      ],
      permissions: ['user.manage', 'role.manage', 'restaurant.manage', 'shipper.manage', 'audit.view', 'system.setting', 'promotion.manage', 'refund.manage', 'report.view'],
      queue: [
        ['Restaurant approval', 'Review', 'Admin'],
        ['Permission matrix', 'Synced', 'RBAC'],
        ['Audit export', 'Ready', 'System']
      ]
    }
  };

  const roleSelector = document.querySelector('#roleSelector');
  const metricScope = document.querySelector('#metricScope');
  const metricStatus = document.querySelector('#metricStatus');
  const metricPermissions = document.querySelector('#metricPermissions');
  const statusPill = document.querySelector('#statusPill');
  const profileTitle = document.querySelector('#profile-title');
  const profileName = document.querySelector('#profileName');
  const profileEmail = document.querySelector('#profileEmail');
  const profileForm = document.querySelector('#profileForm');
  const permissionList = document.querySelector('#permissionList');
  const queueRows = document.querySelector('#queueRows');
  const authIdentifier = document.querySelector('#authIdentifier');
  const authPassword = document.querySelector('#authPassword');
  const authFullName = document.querySelector('#authFullName');
  const authPhone = document.querySelector('#authPhone');
  const authSubmitText = document.querySelector('#authSubmitText');
  const authStatus = document.querySelector('#authStatus');
  const authForm = document.querySelector('#authForm');
  const sessionCard = document.querySelector('#sessionCard');
  const sessionAccount = document.querySelector('#sessionAccount');
  const sessionRole = document.querySelector('#sessionRole');
  const switchAccountButton = document.querySelector('#switchAccountButton');
  const logoutButton = document.querySelector('#logoutButton');
  const accountLogoutButton = document.querySelector('#accountLogoutButton');
  const backToWorkspaceButton = document.querySelector('#backToWorkspaceButton');
  const profileStatus = document.querySelector('#profileStatus');
  const avatarInitials = document.querySelector('#avatarInitials');
  const segments = document.querySelectorAll('[data-mode]');
  const root = document.body;
  const orderingPanel = document.querySelector('#orderingPanel');
  const orderingStatus = document.querySelector('#orderingStatus');
  const orderingMessage = document.querySelector('#orderingMessage');
  const restaurantResults = document.querySelector('#restaurantResults');
  const menuResults = document.querySelector('#menuResults');
  const cartItems = document.querySelector('#cartItems');
  const cartSubtotal = document.querySelector('#cartSubtotal');
  const restaurantQueue = document.querySelector('#restaurantQueue');
  const restaurantQueueRows = document.querySelector('#restaurantQueueRows');
  const customerOrders = document.querySelector('#customerOrders');
  const customerOrderRows = document.querySelector('#customerOrderRows');
  const imagePanel = document.querySelector('#imagePanel');
  const imageCanvas = document.querySelector('#imageCanvas');
  const imageFile = document.querySelector('#imageFile');
  const imageZoom = document.querySelector('#imageZoom');
  const imageStatus = document.querySelector('#imageStatus');
  const authLayer = document.querySelector('#authLayer');
  const appLayer = document.querySelector('#appLayer');
  const appNav = document.querySelector('#appNav');
  const accountButton = document.querySelector('#accountButton');
  const workspace = document.querySelector('#workspace');
  const screenPanels = document.querySelectorAll('[data-screen-panel]');
  let imageState = { source: null, rotation: 0, zoom: 1 };
  const apiBase = document.body.dataset.apiBase || 'http://localhost:3000';
  let selectedRestaurantId = null;
  let localCart = [];

  let currentRole = 'customer';
  let authMode = 'login';
  let currentScreen = 'home';
  let sessionUser = null;

  function init() {
    root.dataset.view = 'auth';
    root.dataset.authMode = authMode;
    roleSelector.innerHTML = Object.entries(roleData).map(([key, role]) => (
      `<button class="role-button" type="button" data-role-key="${key}">
        <span class="role-dot" aria-hidden="true"></span>
        <span class="role-name">${role.label}</span>
        <span class="role-count">${role.count}</span>
      </button>`
    )).join('');

    roleSelector.addEventListener('click', event => {
      const button = event.target.closest('[data-role-key]');
      if (button) {
        setRole(button.dataset.roleKey);
      }
    });

    segments.forEach(button => {
      button.addEventListener('click', () => setAuthMode(button.dataset.mode));
    });

    appNav.querySelectorAll('[data-screen]').forEach(button => {
      button.addEventListener('click', () => setScreen(button.dataset.screen));
    });
    accountButton.addEventListener('click', () => setScreen('account'));
    document.querySelector('.brand').addEventListener('click', event => {
      event.preventDefault();
      if (sessionUser) setScreen('home');
    });

    authForm.addEventListener('submit', async event => {
      event.preventDefault();
      const role = roleData[currentRole];
      try {
        const isRegister = authMode === 'register';
        const payload = isRegister
          ? { username: authIdentifier.value, email: authIdentifier.value, password: authPassword.value, fullName: authFullName.value, phone: authPhone.value }
          : { emailOrUsername: authIdentifier.value, password: authPassword.value };
        const result = await apiFetch(isRegister ? '/api/auth/register/customer' : '/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
        saveSession(result);
        setAuthenticated(result.user);
        authStatus.textContent = `${role.label} session ready`;
        if (currentRole === 'customer') { loadCatalog(); loadCustomerOrders(); }
        if (currentRole === 'restaurant') loadRestaurantQueue();
      } catch (error) {
        authStatus.textContent = error.message;
      }
    });

    switchAccountButton.addEventListener('click', () => {
      clearSession();
      authStatus.textContent = 'Choose an account to sign in.';
    });

    logoutButton.addEventListener('click', logout);
    accountLogoutButton.addEventListener('click', logout);
    backToWorkspaceButton.addEventListener('click', () => setScreen('home'));

    document.querySelector('#saveProfileButton').addEventListener('click', () => {
      const role = roleData[currentRole];
      profileStatus.textContent = `${role.label} profile saved`;
    });

    document.querySelector('#discardProfileButton').addEventListener('click', () => {
      renderProfile(roleData[currentRole]);
      profileStatus.textContent = 'Profile restored';
    });

    document.querySelector('#verifyEmailButton').addEventListener('click', () => {
      profileStatus.textContent = 'Verification token requested';
    });

    document.querySelector('#resetPasswordButton').addEventListener('click', () => {
      authStatus.textContent = 'Password reset token requested';
    });

    document.querySelector('#searchCatalogButton').addEventListener('click', () => loadCatalog());
    document.querySelector('#catalogSearch').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); loadCatalog(); }
    });
    document.querySelector('#checkoutForm').addEventListener('submit', submitCheckout);
    document.querySelector('#loadOrdersButton').addEventListener('click', loadCustomerOrders);
    document.querySelector('#refreshQueueButton').addEventListener('click', loadRestaurantQueue);
    imageFile.addEventListener('change', loadImageFile);
    imageZoom.addEventListener('input', () => { imageState.zoom = Number(imageZoom.value); drawImage(); });
    document.querySelector('#rotateImageButton').addEventListener('click', () => { imageState.rotation = (imageState.rotation + 90) % 360; drawImage(); });
    document.querySelector('#resetImageButton').addEventListener('click', resetImage);
    document.querySelector('#uploadImageButton').addEventListener('click', uploadImage);

    setRole(currentRole);
    restoreSession();
  }

  function setRole(roleKey) {
    currentRole = roleKey;
    const role = roleData[roleKey];
    root.dataset.role = roleKey;

    document.querySelectorAll('[data-role-key]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.roleKey === roleKey);
    });

    metricScope.textContent = role.scope;
    metricStatus.textContent = role.status;
    metricPermissions.textContent = String(role.permissions.length);
    statusPill.textContent = role.label;
    profileTitle.textContent = role.title;
    avatarInitials.textContent = role.initials;

    authIdentifier.value = role.identifier;
    authPassword.value = role.password;
    authFullName.value = role.profile.fullName;
    authPhone.value = role.profile.phone;

    renderProfile(role);
    renderPermissions(role);
    renderQueue(role);
    renderOrderingMode(roleKey);
    authStatus.textContent = '';
    profileStatus.textContent = '';
    if (sessionUser) {
      sessionRole.textContent = `${role.label} workspace is ready.`;
      refreshScreenPanels();
    }
  }

  function setScreen(screen) {
    currentScreen = screen;
    workspace.dataset.screen = screen;
    appNav.querySelectorAll('[data-screen]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.screen === screen);
    });
    refreshScreenPanels();
  }

  function refreshScreenPanels() {
    screenPanels.forEach(panel => {
      const matchesScreen = panel.dataset.screenPanel === currentScreen;
      const restaurantOnly = panel.id === 'imagePanel' && currentRole !== 'restaurant';
      panel.hidden = !matchesScreen || restaurantOnly;
    });
  }

  function setAuthMode(mode) {
    authMode = mode;
    root.dataset.authMode = mode;
    segments.forEach(button => {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
    authSubmitText.textContent = mode === 'register' ? 'Create account' : 'Sign in';
    authPassword.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    authStatus.textContent = '';
  }

  function renderProfile(role) {
    profileName.textContent = role.profile.fullName;
    profileEmail.textContent = role.profile.email;
    profileForm.innerHTML = role.fields.map(([name, label, type]) => {
      if (type === 'select') {
        return `<label>${label}
          <select name="${name}" data-profile-field="${name}">
            ${['MALE', 'FEMALE', 'OTHER'].map(option => (
              `<option value="${option}"${role.profile[name] === option ? ' selected' : ''}>${option}</option>`
            )).join('')}
          </select>
        </label>`;
      }

      return `<label>${label}
        <input name="${name}" type="${type}" value="${escapeAttribute(role.profile[name])}" data-profile-field="${name}">
      </label>`;
    }).join('');

    profileForm.querySelectorAll('[data-profile-field]').forEach(input => {
      input.addEventListener('input', updateProfilePreview);
    });
  }

  function updateProfilePreview() {
    const nameInput = profileForm.querySelector('[name="fullName"]');
    const emailInput = profileForm.querySelector('[name="email"]');
    profileName.textContent = nameInput.value || roleData[currentRole].profile.fullName;
    profileEmail.textContent = emailInput.value || roleData[currentRole].profile.email;
  }

  function renderPermissions(role) {
    permissionList.innerHTML = role.permissions.map(permission => (
      `<span class="permission-chip">${permission}</span>`
    )).join('');
  }

  function renderQueue(role) {
    queueRows.innerHTML = role.queue.map(([item, state, owner]) => (
      `<tr>
        <td>${item}</td>
        <td><span class="queue-state">${state}</span></td>
        <td>${owner}</td>
      </tr>`
    )).join('');
  }

  function escapeAttribute(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function authHeaders() {
    const token = localStorage.getItem('food_delivery_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function saveSession(result) {
    if (result.accessToken) localStorage.setItem('food_delivery_access_token', result.accessToken);
    if (result.refreshToken) localStorage.setItem('food_delivery_refresh_token', result.refreshToken);
  }

  function setAuthenticated(user) {
    sessionUser = user || {};
    const resolvedRole = resolveRoleKey(sessionUser);
    if (resolvedRole && resolvedRole !== currentRole) {
      setRole(resolvedRole);
    }
    root.dataset.view = 'app';
    authLayer.hidden = true;
    appLayer.hidden = false;
    authForm.hidden = true;
    document.querySelector('.segmented').hidden = true;
    sessionCard.hidden = false;
    const accountName = sessionUser.username || sessionUser.email || authIdentifier.value;
    sessionAccount.textContent = `Signed in as ${accountName}`;
    sessionRole.textContent = `${roleData[currentRole].label} workspace is ready.`;
    setScreen(currentRole === 'customer' || currentRole === 'restaurant' ? 'orders' : 'home');
  }

  function resolveRoleKey(user) {
    const roleValue = typeof user?.role === 'string'
      ? user.role
      : user?.role?.name || user?.role?.code || '';
    const normalizedRole = String(roleValue).toLowerCase();
    return Object.keys(roleData).find(roleKey => normalizedRole.includes(roleKey)) || null;
  }

  function clearSession() {
    localStorage.removeItem('food_delivery_access_token');
    localStorage.removeItem('food_delivery_refresh_token');
    sessionUser = null;
    root.dataset.view = 'auth';
    authLayer.hidden = false;
    appLayer.hidden = true;
    authForm.hidden = false;
    document.querySelector('.segmented').hidden = false;
    sessionCard.hidden = true;
    customerOrders.hidden = true;
    restaurantQueue.hidden = true;
    imagePanel.hidden = true;
    orderingMessage.textContent = '';
    setScreen('home');
  }

  async function logout() {
    const refreshToken = localStorage.getItem('food_delivery_refresh_token');
    try {
      if (refreshToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch {
      // Clear the local session even if the server cannot revoke the token.
    } finally {
      clearSession();
      authStatus.textContent = 'Signed out.';
    }
  }

  async function restoreSession() {
    if (!localStorage.getItem('food_delivery_access_token')) return;
    try {
      const user = await apiFetch('/api/auth/me');
      setAuthenticated(user);
      if (currentRole === 'customer') { loadCatalog(); loadCustomerOrders(); }
      if (currentRole === 'restaurant') loadRestaurantQueue();
    } catch {
      clearSession();
    }
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
    return payload;
  }

  function renderOrderingMode(roleKey) {
    if (!orderingPanel) return;
    restaurantQueue.hidden = roleKey !== 'restaurant';
    customerOrders.hidden = roleKey !== 'customer';
    document.querySelector('#checkoutForm').hidden = roleKey !== 'customer';
    orderingStatus.textContent = roleKey === 'restaurant' ? 'Kitchen' : roleKey === 'customer' ? 'Customer' : 'Catalog';
    refreshScreenPanels();
    if (sessionUser && roleKey === 'restaurant') loadRestaurantQueue();
    if (sessionUser && roleKey === 'customer') { loadCatalog(); renderLocalCart(); }
  }

  async function loadCatalog() {
    const keyword = document.querySelector('#catalogSearch').value.trim();
    orderingMessage.textContent = '';
    try {
      const [restaurants, menu] = await Promise.all([
        apiFetch(`/api/catalog/restaurants?keyword=${encodeURIComponent(keyword)}`),
        apiFetch(`/api/catalog/menu-items?keyword=${encodeURIComponent(keyword)}&sort=featured`)
      ]);
      renderRestaurants(restaurants.items || []);
      renderMenuItems(menu.items || []);
      orderingStatus.textContent = `${restaurants.totalItems ?? 0} restaurants`;
    } catch (error) {
      orderingStatus.textContent = 'Offline preview';
      orderingMessage.textContent = error.message;
      renderRestaurants([]);
      renderMenuItems([]);
    }
  }

  function renderRestaurants(items) {
    restaurantResults.innerHTML = items.length ? items.map(restaurant => `<article class="catalog-card"><div class="catalog-card-main"><strong>${escapeHtml(restaurant.name)}</strong><span>${escapeHtml(restaurant.district || restaurant.city || 'Open restaurant')} - ${Number(restaurant.rating || 0).toFixed(1)} stars</span></div><button class="secondary-button" type="button" data-restaurant-id="${restaurant.id}">View menu</button></article>`).join('') : '<p class="empty-state">No restaurants match this search.</p>';
    restaurantResults.querySelectorAll('[data-restaurant-id]').forEach(button => button.addEventListener('click', () => loadRestaurantMenu(button.dataset.restaurantId)));
  }

  function renderMenuItems(items) {
    menuResults.innerHTML = items.length ? items.map(item => `<article class="catalog-card"><div class="catalog-card-main"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.restaurantName || 'Menu')} - ${formatMoney(item.effectivePrice)}</span></div><button class="primary-button" type="button" data-add-item="${item.id}" data-restaurant-id="${item.restaurantId}" data-item-name="${escapeAttribute(item.name)}" data-item-price="${item.effectivePrice}">Add</button></article>`).join('') : '<p class="empty-state">Search for a dish or open a restaurant menu.</p>';
    menuResults.querySelectorAll('[data-add-item]').forEach(button => button.addEventListener('click', () => addLocalItem(button.dataset)));
  }

  async function loadRestaurantMenu(restaurantId) {
    selectedRestaurantId = Number(restaurantId);
    try {
      const menu = await apiFetch(`/api/catalog/restaurants/${restaurantId}/menu`);
      const items = (menu || []).flatMap(menuItem => (menuItem.categories || []).flatMap(category => category.items || []).concat(menuItem.uncategorizedItems || []));
      renderMenuItems(items.map(item => ({ ...item, restaurantId: selectedRestaurantId, restaurantName: menu[0]?.name || 'Menu' })));
      orderingStatus.textContent = 'Menu loaded';
    } catch (error) { orderingMessage.textContent = error.message; }
  }

  function addLocalItem(data) {
    const restaurantId = Number(data.restaurantId) || selectedRestaurantId;
    if (localCart.length > 0 && localCart[0].restaurantId !== restaurantId) {
      localCart = [];
      orderingMessage.textContent = 'Cart changed to the selected restaurant.';
    }
    selectedRestaurantId = restaurantId;
    const existing = localCart.find(item => item.menuItemId === Number(data.addItem));
    if (existing) existing.quantity += 1;
    else localCart.push({ menuItemId: Number(data.addItem), restaurantId: selectedRestaurantId, name: data.itemName, unitPrice: Number(data.itemPrice), quantity: 1 });
    renderLocalCart();
    orderingMessage.textContent = 'Added to cart. Checkout recalculates prices on the server.';
  }

  function renderLocalCart() {
    const subtotal = localCart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    cartSubtotal.textContent = formatMoney(subtotal);
    cartItems.innerHTML = localCart.length ? localCart.map((item, index) => `<div class="cart-row"><div><strong>${escapeHtml(item.name)}</strong><small>${formatMoney(item.unitPrice)}</small></div><div class="quantity-control"><button type="button" data-decrease="${index}" aria-label="Decrease quantity">-</button><span>${item.quantity}</span><button type="button" data-increase="${index}" aria-label="Increase quantity">+</button></div><strong>${formatMoney(item.unitPrice * item.quantity)}</strong></div>`).join('') : '<p class="empty-state">Choose a dish to start an order.</p>';
    cartItems.querySelectorAll('[data-increase]').forEach(button => button.addEventListener('click', () => { localCart[Number(button.dataset.increase)].quantity += 1; renderLocalCart(); }));
    cartItems.querySelectorAll('[data-decrease]').forEach(button => button.addEventListener('click', () => { const index = Number(button.dataset.decrease); localCart[index].quantity -= 1; if (localCart[index].quantity <= 0) localCart.splice(index, 1); renderLocalCart(); }));
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (!localCart.length) { orderingMessage.textContent = 'Your cart is empty.'; return; }
    if (!authHeaders().Authorization) { orderingMessage.textContent = 'Sign in to submit checkout.'; return; }
    try {
      for (const item of localCart) await apiFetch('/api/customer/cart/items', { method: 'POST', body: JSON.stringify({ restaurantId: item.restaurantId, menuItemId: item.menuItemId, quantity: item.quantity }) });
      const order = await apiFetch('/api/customer/orders/checkout', { method: 'POST', headers: { 'Idempotency-Key': `web-${Date.now()}` }, body: JSON.stringify({ restaurantId: localCart[0].restaurantId, addressId: Number(document.querySelector('#checkoutAddressId').value), paymentMethod: document.querySelector('#checkoutPayment').value, promotionCode: document.querySelector('#checkoutPromotion').value.trim() || undefined }) });
      localCart = [];
      renderLocalCart();
      orderingMessage.textContent = `Order ${order.orderCode} created. Watch notifications for status updates.`;
      loadCustomerOrders();
    } catch (error) { orderingMessage.textContent = error.message; }
  }

  async function loadCustomerOrders() {
    if (!authHeaders().Authorization) { orderingMessage.textContent = 'Sign in to view orders.'; return; }
    try { const result = await apiFetch('/api/customer/orders'); customerOrderRows.innerHTML = (result.items || []).map(order => `<div class="order-row"><div><strong>${escapeHtml(order.orderCode)}</strong><span>${escapeHtml(order.restaurantName)} - ${formatMoney(order.totalAmount)}</span></div><span>${escapeHtml(order.status)}</span></div>`).join('') || '<p class="empty-state">No orders yet.</p>'; customerOrders.hidden = false; } catch (error) { orderingMessage.textContent = error.message; }
  }

  async function loadRestaurantQueue() {
    if (!authHeaders().Authorization) { orderingMessage.textContent = 'Sign in as a restaurant operator to view the kitchen queue.'; return; }
    try {
      const result = await apiFetch('/api/restaurant/orders');
      restaurantQueueRows.innerHTML = (result.items || []).map(order => `<tr><td>${escapeHtml(order.orderCode)}</td><td><span class="queue-state">${escapeHtml(order.status)}</span></td><td>${queueAction(order)}</td></tr>`).join('') || '<tr><td colspan="3">No orders in the queue.</td></tr>';
      restaurantQueueRows.querySelectorAll('[data-order-action]').forEach(button => button.addEventListener('click', () => advanceRestaurantOrder(button.dataset.orderId, button.dataset.orderAction)));
    } catch (error) { orderingMessage.textContent = error.message; }
  }

  function queueAction(order) {
    const next = { PENDING: ['confirm', 'Confirm'], CONFIRMED: ['prepare', 'Start preparing'], PREPARING: ['ready', 'Mark ready'] }[order.status];
    return next ? `<button class="secondary-button" type="button" data-order-id="${order.id}" data-order-action="${next[0]}">${next[1]}</button>` : '<span class="empty-state">Waiting</span>';
  }

  async function advanceRestaurantOrder(orderId, action) {
    try { await apiFetch(`/api/restaurant/orders/${orderId}/${action}`, { method: 'POST', body: JSON.stringify({}) }); loadRestaurantQueue(); } catch (error) { orderingMessage.textContent = error.message; }
  }

  function loadImageFile() {
    const file = imageFile.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { imageStatus.textContent = 'Use a JPEG, PNG or WebP image up to 5 MB.'; return; }
    const reader = new FileReader();
    reader.onload = () => { const image = new Image(); image.onload = () => { imageState.source = image; imageState.rotation = 0; imageState.zoom = 1; imageZoom.value = '1'; drawImage(); imageStatus.textContent = 'Preview ready'; }; image.src = reader.result; };
    reader.readAsDataURL(file);
  }

  function resetImage() { imageState.rotation = 0; imageState.zoom = 1; imageZoom.value = '1'; drawImage(); imageStatus.textContent = ''; }

  function drawImage() {
    const context = imageCanvas.getContext('2d');
    context.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    context.fillStyle = '#12202a'; context.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    const source = imageState.source;
    if (!source) return;
    const radians = imageState.rotation * Math.PI / 180;
    const scale = Math.max(imageCanvas.width / source.width, imageCanvas.height / source.height) * imageState.zoom;
    context.save(); context.translate(imageCanvas.width / 2, imageCanvas.height / 2); context.rotate(radians); context.drawImage(source, -source.width * scale / 2, -source.height * scale / 2, source.width * scale, source.height * scale); context.restore();
  }

  async function uploadImage() {
    if (!imageState.source) { imageStatus.textContent = 'Choose an image first.'; return; }
    const restaurantId = Number(document.querySelector('#imageRestaurantId').value);
    if (!restaurantId || !authHeaders().Authorization) { imageStatus.textContent = 'Sign in and enter a restaurant ID.'; return; }
    try {
      const dataUrl = imageCanvas.toDataURL('image/jpeg', 0.88);
      const result = await apiFetch(`/api/restaurant/restaurants/${restaurantId}/images`, { method: 'POST', body: JSON.stringify({ imageData: dataUrl, imageType: document.querySelector('#imageType').value }) });
      imageStatus.textContent = `Uploaded ${result.imageType || 'image'}`;
    } catch (error) { imageStatus.textContent = error.message; }
  }

  function formatMoney(value) { return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} VND`; }
  function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }

  init();
}());
