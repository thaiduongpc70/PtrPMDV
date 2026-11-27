/* Address book: choose / add / edit / delete delivery addresses (map picker is OpenStreetMap). */
(function () {
  const U = window.FDUI;
  const fd = () => window.FD;
  const { esc, modal, act } = U;
  const api = (path, options) => fd().api(path, options);
  const json = body => ({ body: JSON.stringify(body) });
  const $ = selector => document.querySelector(selector);
  const LABELS = ['Nhà riêng', 'Văn phòng', 'Khác'];
  let dialog = null;

  function isCustomer() {
    return fd().state.token && fd().roleOf(fd().state.user) === 'CUSTOMER';
  }

  function open() {
    if (!fd().state.token) { fd().openAuth('login', 'Đăng nhập để chọn địa chỉ giao hàng.'); return; }
    if (!isCustomer()) { fd().toast('Chỉ tài khoản khách hàng mới có sổ địa chỉ.', true); return; }
    dialog = modal('Địa chỉ giao hàng', '<div class="empty-state">Đang tải…</div>', { wide: true });
    showList();
  }

  async function reload() {
    await fd().loadAddresses();
  }

  function showList() {
    const items = fd().state.addresses;
    dialog.body.innerHTML = `
      <div class="address-list">
        ${items.length ? items.map(a => `
          <article class="address-card ${a.isDefault ? 'is-default' : ''}">
            <div class="address-main">
              <div class="address-title"><strong>${esc(a.label || 'Địa chỉ')}</strong>${a.isDefault ? '<span class="status-chip">Mặc định · đang giao tới đây</span>' : ''}</div>
              <span>${esc(a.receiverName)} · ${esc(a.receiverPhone)}</span>
              <span class="muted">${esc([a.addressLine, a.ward, a.district, a.city].filter(Boolean).join(', '))}</span>
            </div>
            <div class="button-row">
              ${a.isDefault ? '' : `<button class="primary-button compact-button" type="button" data-act="default" data-id="${a.id}">Giao tới đây</button>`}
              <button class="secondary-button compact-button" type="button" data-act="edit" data-id="${a.id}">Sửa</button>
              ${a.isDefault && items.length > 1 ? '' : `<button class="text-button danger-text" type="button" data-act="remove" data-id="${a.id}">Xóa</button>`}
            </div>
          </article>`).join('') : '<div class="empty-state">Bạn chưa có địa chỉ nào. Hãy thêm địa chỉ đầu tiên để đặt món.</div>'}
      </div>
      <div class="button-row m-actions"><button class="primary-button" type="button" data-act="add">＋ Thêm địa chỉ mới</button></div>`;
    dialog.body.onclick = async event => {
      const button = event.target.closest('[data-act]');
      if (!button) return;
      const id = Number(button.dataset.id);
      if (button.dataset.act === 'add') showForm(null);
      if (button.dataset.act === 'edit') showForm(items.find(a => a.id === id));
      if (button.dataset.act === 'default') {
        if (await act(() => api(`/api/customer/addresses/${id}/default`, { method: 'POST' }), 'Đã đổi địa chỉ giao hàng.')) { await reload(); showList(); }
      }
      if (button.dataset.act === 'remove') {
        const confirmed = await U.confirmBox('Xóa địa chỉ này?', 'Xóa');
        if (confirmed) await act(() => api(`/api/customer/addresses/${id}`, { method: 'DELETE' }), 'Đã xóa địa chỉ.');
        await reload();
        dialog = modal('Địa chỉ giao hàng', '');
        showList();
      }
    };
  }

  function showForm(address) {
    const known = fd().state.addresses.find(item => item.isDefault) || fd().state.addresses[0] || {};
    const a = address || { label: 'Nhà riêng', receiverName: known.receiverName || fd().state.user?.fullName || '', receiverPhone: known.receiverPhone || fd().state.user?.phone || '', city: known.city || fd().state.city || '', isDefault: !fd().state.addresses.length };
    dialog.body.innerHTML = `
      <form class="stacked-form compact-form" id="addressDialogForm">
        <label>Loại địa chỉ<select name="label">${LABELS.map(l => `<option ${l === a.label ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Tên người nhận<input name="receiverName" required maxlength="150" value="${esc(a.receiverName)}" placeholder="Nguyễn Văn A"></label>
        <label>Số điện thoại<input name="receiverPhone" required value="${esc(a.receiverPhone)}" placeholder="0901234567"></label>
        <label class="wide-field">Số nhà, tên đường<input name="addressLine" required maxlength="255" value="${esc(a.addressLine || '')}" placeholder="25 Nguyễn Văn Nguyễn"></label>
        <label>Phường / Xã<input name="ward" value="${esc(a.ward || '')}"></label>
        <label>Phường / Xã<input name="district" value="${esc(a.district || '')}"></label>
        <label>Tỉnh / Thành phố<input name="city" required value="${esc(a.city || fd().state.city || '')}"></label>
        <div class="wide-field address-map">
          <div class="fd-block-head"><strong>Ghim vị trí trên bản đồ</strong><span class="muted" id="pickedCoords">${a.latitude ? `${Number(a.latitude).toFixed(5)}, ${Number(a.longitude).toFixed(5)}` : 'Chạm vào bản đồ để chọn vị trí'}</span></div>
          <div class="fd-map-wrap" id="addressMap"></div>
        </div>
        <label class="checkbox-field wide-field"><input type="checkbox" name="isDefault" ${a.isDefault ? 'checked' : ''} ${a.isDefault && address ? 'disabled' : ''}> Đặt làm địa chỉ giao hàng mặc định</label>
        <div class="button-row m-actions wide-field"><button type="button" class="secondary-button" data-back>← Quay lại</button><button class="primary-button" type="submit">${address ? 'Lưu thay đổi' : 'Lưu địa chỉ'}</button></div>
      </form>`;
    let coords = a.latitude ? { lat: Number(a.latitude), lng: Number(a.longitude) } : null;
    window.FDLive.createPicker($('#addressMap'), coords, point => {
      coords = point;
      $('#pickedCoords').textContent = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
    });
    dialog.body.querySelector('[data-back]').addEventListener('click', showList);
    $('#addressDialogForm').addEventListener('submit', async event => {
      event.preventDefault();
      const f = new FormData(event.target);
      const payload = {
        label: f.get('label'), receiverName: f.get('receiverName').trim(), receiverPhone: f.get('receiverPhone').trim(),
        addressLine: f.get('addressLine').trim(), ward: f.get('ward').trim() || null, district: f.get('district').trim() || null,
        city: f.get('city').trim() || fd().state.city, isDefault: f.get('isDefault') === 'on' || Boolean(a.isDefault),
        latitude: coords ? Number(coords.lat.toFixed(7)) : null, longitude: coords ? Number(coords.lng.toFixed(7)) : null
      };
      const saved = await act(() => (address
        ? api(`/api/customer/addresses/${address.id}`, { method: 'PATCH', ...json(payload) })
        : api('/api/customer/addresses', { method: 'POST', ...json(payload) })), address ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.');
      if (saved) { await reload(); showList(); }
    });
  }

  function bind() {
    $('#loadAddressesButton')?.addEventListener('click', open);
    document.addEventListener('click', event => {
      if (event.target.closest('[data-change-address]')) open();
    });
  }

  window.FDAddress = { open };
  bind();
}());
