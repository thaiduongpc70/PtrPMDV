/* Partner onboarding: "Trở thành tài xế" / "Đăng ký nhà hàng". Applications wait for admin approval. */
(function () {
  const U = window.FDUI;
  const fd = () => window.FD;
  const { esc, modal } = U;

  const field = (name, label, { type = 'text', required = true, placeholder = '', value = '', attrs = '', wide = false } = {}) =>
    `<label class="${wide ? 'wide-field' : ''}">${label}<input name="${name}" type="${type}" ${required ? 'required' : ''} placeholder="${esc(placeholder)}" value="${esc(value)}" ${attrs}></label>`;

  const accountFields = `
    ${field('username', 'Tên đăng nhập', { placeholder: 'vd: taixe.minh', attrs: 'minlength="3" maxlength="100" pattern="[a-zA-Z0-9_.\\-]{3,100}" autocomplete="username"' })}
    ${field('phone', 'Số điện thoại', { type: 'tel', placeholder: '09xx xxx xxx', attrs: 'pattern="[0-9 +]{8,20}" title="8–20 chữ số" autocomplete="tel"' })}
    ${field('email', 'Email', { type: 'email', placeholder: 'ban@email.com', attrs: 'autocomplete="email"' })}
    ${field('password', 'Mật khẩu', { type: 'password', placeholder: 'Tối thiểu 8 ký tự', attrs: 'minlength="8" autocomplete="new-password"' })}`;

  const commitRow = `<div class="commit-row wide-field">
      <button type="button" class="secondary-button" data-read-commit>📄 Đọc cam kết</button>
      <label class="checkbox-field commit-agree"><input type="checkbox" name="agree" tabindex="-1" required> <span data-commit-status>Chưa đọc cam kết — bấm "Đọc cam kết", kéo xuống cuối rồi đồng ý.</span></label>
    </div>`;

  const actions = label => `<div class="button-row m-actions wide-field"><button type="button" class="secondary-button" data-close>Hủy</button><button class="primary-button" type="submit">${label}</button></div>`;

  function shipperForm() {
    return `
      <p class="muted partner-intro">Tự do giờ giấc, thu nhập theo từng đơn. Điền thông tin, chúng tôi sẽ xét duyệt hồ sơ trong 24 giờ làm việc.</p>
      <form class="stacked-form compact-form" id="partnerForm">
        <h4 class="form-section wide-field">Thông tin cá nhân</h4>
        ${field('fullName', 'Họ và tên', { placeholder: 'Nguyễn Văn A' })}
        ${field('identityNumber', 'Số CCCD / CMND', { placeholder: '079xxxxxxxxx', attrs: 'pattern="[0-9A-Za-z]{9,15}" title="9–15 ký tự chữ hoặc số"' })}
        ${field('city', 'Khu vực hoạt động', { value: fd().state.city || '', required: false })}
        <h4 class="form-section wide-field">Phương tiện</h4>
        <label>Loại phương tiện
          <select name="vehicleType"><option value="MOTORBIKE">Xe máy</option><option value="BICYCLE">Xe đạp</option><option value="CAR">Ô tô</option></select>
        </label>
        ${field('vehiclePlate', 'Biển số xe', { placeholder: '59A1-123.45', required: false, attrs: 'data-vehicle-field' })}
        ${field('drivingLicense', 'Số GPLX', { placeholder: 'Số giấy phép lái xe', required: false, attrs: 'data-vehicle-field', wide: true })}
        <h4 class="form-section wide-field">Tài khoản đăng nhập</h4>
        ${accountFields}
        ${commitRow}
        <p class="status-line wide-field" data-error role="alert"></p>
        ${actions('Gửi hồ sơ tài xế')}
      </form>`;
  }

  async function restaurantForm() {
    let categories = [];
    try { categories = (await fd().api('/api/catalog/restaurant-categories')).items || []; } catch { /* optional */ }
    return `
      <p class="muted partner-intro">Đưa quán của bạn đến hàng nghìn khách hàng. Đăng ký miễn phí — hoa hồng được thỏa thuận khi duyệt hồ sơ.</p>
      <form class="stacked-form compact-form" id="partnerForm">
        <h4 class="form-section wide-field">Thông tin quán</h4>
        ${field('restaurantName', 'Tên nhà hàng', { placeholder: 'vd: Bún Bò Cô Ba', wide: true })}
        <label>Loại hình
          <select name="categoryId"><option value="">— Chọn danh mục —</option>${categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        </label>
        ${field('restaurantPhone', 'Hotline quán', { type: 'tel', required: false, placeholder: 'Để trống nếu dùng SĐT bên dưới' })}
        ${field('address', 'Số nhà, tên đường', { placeholder: '25 Nguyễn Huệ', wide: true })}
        ${field('ward', 'Phường / Xã', { required: false })}
        ${field('district', 'Phường / Xã', { required: false })}
        ${field('city', 'Tỉnh / Thành phố', { value: fd().state.city || '' })}
        ${field('businessLicense', 'Mã số hộ kinh doanh / GPKD', { required: false })}
        ${field('openingTime', 'Giờ mở cửa', { type: 'time', value: '08:00', required: false })}
        ${field('closingTime', 'Giờ đóng cửa', { type: 'time', value: '22:00', required: false })}
        ${field('minimumOrder', 'Đơn tối thiểu (đ)', { type: 'number', value: '0', required: false, attrs: 'min="0" step="1000"' })}
        <label class="wide-field">Giới thiệu ngắn<textarea name="description" rows="2" maxlength="2000" placeholder="Món đặc trưng, điểm mạnh của quán"></textarea></label>
        <h4 class="form-section wide-field">Chủ quán &amp; tài khoản</h4>
        ${field('ownerName', 'Họ tên chủ quán', { wide: true })}
        ${accountFields}
        ${commitRow}
        <p class="status-line wide-field" data-error role="alert"></p>
        ${actions('Gửi hồ sơ nhà hàng')}
      </form>`;
  }

  function done(dialog, kind, result) {
    dialog.body.innerHTML = `
      <div class="partner-done">
        <div class="partner-done-icon">✅</div>
        <h3>Đã gửi hồ sơ ${kind === 'shipper' ? 'tài xế' : 'nhà hàng'}!</h3>
        <p>Mã hồ sơ <b>#${esc(result.applicationId)}</b>. ${esc(result.message)}</p>
        <p class="muted">Bạn có thể đăng nhập bằng tài khoản vừa tạo để kiểm tra — hệ thống sẽ báo trạng thái hồ sơ cho tới khi được duyệt.</p>
        <div class="button-row m-actions"><button class="primary-button" type="button" data-close>Đã hiểu</button></div>
      </div>`;
  }

  async function open(kind) {
    const isShipper = kind === 'shipper';
    const dialog = modal(isShipper ? 'Trở thành tài xế FoodGo' : 'Đăng ký nhà hàng đối tác', '<div class="empty-state">Đang tải…</div>', { wide: true });
    dialog.body.innerHTML = isShipper ? shipperForm() : await restaurantForm();
    const form = dialog.body.querySelector('#partnerForm');
    const error = form.querySelector('[data-error]');

    if (isShipper) {
      const sync = () => {
        const bicycle = form.vehicleType.value === 'BICYCLE';
        form.querySelectorAll('[data-vehicle-field]').forEach(input => { input.required = !bicycle; input.disabled = bicycle; });
      };
      form.vehicleType.addEventListener('change', sync);
      sync();
    }

    // Cam kết: hộp kiểm chỉ được tích sau khi đọc hết bản cam kết (không cho tích tay)
    let commitment = null;
    const agree = form.querySelector('[name="agree"]');
    const status = form.querySelector('[data-commit-status]');
    agree.addEventListener('click', event => event.preventDefault());
    form.querySelector('[data-read-commit]').addEventListener('click', async () => {
      const result = await window.FDCommit.read(kind);
      if (!result) return;
      commitment = result;
      agree.checked = true;
      status.textContent = `✔ Đã đọc và đồng ý bản cam kết (phiên bản ${result.version}).`;
      error.textContent = '';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      error.textContent = '';
      if (!commitment) {
        error.textContent = 'Vui lòng bấm "Đọc cam kết", kéo xuống cuối và đồng ý trước khi gửi hồ sơ.';
        error.classList.add('is-error');
        form.querySelector('[data-read-commit]').focus();
        return;
      }
      const body = Object.fromEntries([...new FormData(form)].filter(([key, value]) => key !== 'agree' && String(value).trim() !== ''));
      if (body.minimumOrder) body.minimumOrder = Number(body.minimumOrder);
      body.commitment = commitment;
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const result = await fd().api(`/api/partners/register/${kind}`, { method: 'POST', body: JSON.stringify(body) });
        done(dialog, kind, result);
        fd().toast('Đã gửi hồ sơ. Vui lòng chờ quản trị viên duyệt.');
      } catch (err) {
        error.textContent = err.message;
        error.classList.add('is-error');
        submit.disabled = false;
      }
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-partner]');
    if (!trigger) return;
    event.preventDefault();
    const authModal = document.getElementById('authModal');
    if (authModal && !authModal.hidden) document.getElementById('closeAuthModal')?.click();
    open(trigger.dataset.partner);
  });

  window.FDPartner = { open };
}());
