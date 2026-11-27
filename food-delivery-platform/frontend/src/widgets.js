/* Widgets: hero carousel, contact widget, notification bell. */
(function () {
  const $ = selector => document.querySelector(selector);
  const fd = () => window.FD;
  let heroTimer = null;

  /* ---------- hero carousel ---------- */
  function initHero() {
    const strip = $('#bannerStrip');
    const dots = $('#heroDots');
    if (!strip || !dots) return;
    const slides = Array.from(strip.children).filter(node => node.classList.contains('banner-slide'));
    if (!slides.length) return;
    dots.innerHTML = slides.length > 1 ? slides.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}" data-dot="${i}"></button>`).join('') : '';
    let index = 0;
    const go = next => {
      index = (next + slides.length) % slides.length;
      strip.scrollTo({ left: slides[index].offsetLeft - strip.offsetLeft, behavior: 'smooth' });
      dots.querySelectorAll('button').forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    };
    dots.querySelectorAll('button').forEach(dot => dot.addEventListener('click', () => { go(Number(dot.dataset.dot)); restart(); }));
    const restart = () => {
      clearInterval(heroTimer);
      if (slides.length > 1) heroTimer = setInterval(() => go(index + 1), 5000);
    };
    strip.addEventListener('scroll', () => {
      const nearest = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
      if (nearest !== index && slides[nearest]) {
        index = nearest;
        dots.querySelectorAll('button').forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      }
    }, { passive: true });
    go(0);
    restart();
  }

  /* ---------- contact widget ---------- */
  function initContact() {
    const panel = $('#contactPanel');
    const fab = $('#contactFab');
    if (!panel || !fab) return;
    const toggle = open => {
      panel.hidden = !open;
      fab.classList.toggle('is-open', open);
      fab.querySelector('.fab-icon').textContent = open ? '✕' : '💬';
    };
    fab.addEventListener('click', () => toggle(panel.hidden));
    $('#contactClose').addEventListener('click', () => toggle(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') toggle(false); });
    document.querySelectorAll('[data-open-support]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); toggle(true); }));

    $('#contactForm').addEventListener('submit', async event => {
      event.preventDefault();
      const message = $('#contactMessage').value.trim();
      if (!message) return;
      if (!fd().state.token) {
        toggle(false);
        const hotline = fd().state.storefront?.contact?.phone; // số hotline lấy từ cấu hình hệ thống (API storefront)
        fd().openAuth('login', `Đăng nhập để gửi yêu cầu hỗ trợ${hotline ? `, hoặc gọi hotline ${hotline}` : ''}.`);
        return;
      }
      const topic = $('#contactTopic');
      try {
        const ticket = await fd().api('/api/communications/support/tickets', {
          method: 'POST',
          body: JSON.stringify({
            subject: `Yêu cầu hỗ trợ: ${topic.options[topic.selectedIndex].text}`,
            category: topic.value,
            description: message
          })
        });
        $('#contactMessage').value = '';
        toggle(false);
        fd().toast(`Đã gửi yêu cầu ${ticket.ticketCode || ''}. Chúng tôi sẽ phản hồi sớm nhất.`);
      } catch (error) {
        fd().toast(error.message, true);
      }
    });
  }

  /* ---------- notifications ---------- */
  let notifTimer = null;

  function timeAgo(value) {
    const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return new Date(value).toLocaleDateString('vi-VN');
  }

  async function loadNotifs() {
    if (!fd().state.token) return;
    try {
      const result = await fd().api('/api/notifications');
      const items = result.items || [];
      const unread = items.filter(item => !item.isRead).length;
      const badge = $('#notifCount');
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.hidden = !unread;
      const panel = $('#notifPanel');
      panel.innerHTML = `
        <header><strong>Thông báo</strong><span class="muted">${unread} chưa đọc</span></header>
        <div class="notif-list">
          ${items.length ? items.slice(0, 15).map(item => `
            <button type="button" class="notif-item ${item.isRead ? '' : 'is-unread'}" data-notif="${item.id}">
              <strong>${fd().escapeHtml(item.title)}</strong>
              <span>${fd().escapeHtml(item.message || '')}</span>
              <small>${timeAgo(item.createdAt)}</small>
            </button>`).join('') : '<p class="empty-state">Bạn chưa có thông báo nào.</p>'}
        </div>`;
      panel.querySelectorAll('[data-notif]').forEach(button => button.addEventListener('click', async () => {
        await fd().api(`/api/notifications/${button.dataset.notif}/read`, { method: 'PATCH' }).catch(() => null);
        loadNotifs();
      }));
    } catch { /* bỏ qua */ }
  }

  function initNotifications() {
    const button = $('#notifButton');
    const panel = $('#notifPanel');
    button.addEventListener('click', event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) loadNotifs();
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('#notifPanel') && !event.target.closest('#notifButton')) panel.hidden = true;
    });
    const sync = () => {
      clearInterval(notifTimer);
      if (fd().state.token) {
        loadNotifs();
        notifTimer = setInterval(loadNotifs, 30000);
      }
    };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-auth'] });
    sync();
  }

  window.FDWidgets = { initHero };

  const start = () => { initContact(); initNotifications(); initHero(); };
  if (window.FD) start(); else window.addEventListener('load', start);
}());
