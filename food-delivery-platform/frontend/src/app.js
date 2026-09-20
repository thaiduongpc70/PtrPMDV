(function () {
  const roleData = {
    customer: {
      label: 'Customer',
      count: 6,
      scope: 'Orders',
      status: 'Active',
      title: 'Customer account',
      identifier: 'duong@example.com',
      password: 'customer-pass',
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
      identifier: 'owner@bepxanh.vn',
      password: 'restaurant-pass',
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
      identifier: 'shipper01',
      password: 'shipper-pass',
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
      identifier: 'admin',
      password: 'admin-pass',
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
  const profileStatus = document.querySelector('#profileStatus');
  const avatarInitials = document.querySelector('#avatarInitials');
  const segments = document.querySelectorAll('[data-mode]');
  const root = document.body;

  let currentRole = 'customer';
  let authMode = 'login';

  function init() {
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

    document.querySelector('#authForm').addEventListener('submit', event => {
      event.preventDefault();
      const role = roleData[currentRole];
      authStatus.textContent = `${role.label} session ready`;
    });

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

    setRole(currentRole);
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
    authStatus.textContent = '';
    profileStatus.textContent = '';
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

  init();
}());
