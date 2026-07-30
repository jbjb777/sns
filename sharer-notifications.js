/* 페이지 이동 후에도 유지되는 Sharer 공통 인앱 알림 및 DM 감지기 */
(function () {
  'use strict';

  const API_BASE = 'https://sharer-api.alexeom97.workers.dev/api';
  const QUEUE_KEY = 'sharer:toast-queue:v1';
  const CURSOR_PREFIX = 'sharer:dm-cursors:v1:';
  const READY_PREFIX = 'sharer:dm-ready:v1:';
  const TOAST_MAX_AGE = 7000;
  let toastHost, activeToast, dmTimer, isPolling = false;

  const getUser = () => { try { return JSON.parse(localStorage.getItem('snsUser') || 'null'); } catch (_) { return null; } };
  const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
  const queue = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && Date.now() - item.createdAt < TOAST_MAX_AGE) : [];
    } catch (_) { return []; }
  };
  const saveQueue = items => { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-8))); } catch (_) {} };

  function ensureHost() {
    if (toastHost || !document.body) return toastHost;
    toastHost = document.createElement('div');
    toastHost.id = 'sharerNotificationHost';
    toastHost.setAttribute('aria-live', 'polite');
    toastHost.innerHTML = `<style>
      #sharerNotificationHost{position:fixed;top:max(12px,env(safe-area-inset-top));left:50%;z-index:2147483647;width:min(420px,calc(100vw - 24px));pointer-events:none;transform:translateX(-50%);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",sans-serif}
      .sharer-toast{display:flex;align-items:center;gap:11px;width:100%;margin-bottom:9px;padding:13px 14px;border:1px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(28,28,30,.92);color:#fff;box-shadow:0 16px 42px rgba(0,0,0,.32);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);pointer-events:auto;opacity:0;transform:translateY(-28px) scale(.97);transition:opacity .28s ease,transform .34s cubic-bezier(.22,1,.36,1)}
      .sharer-toast.show{opacity:1;transform:translateY(0) scale(1)}.sharer-toast.leave{opacity:0;transform:translateY(-18px) scale(.98)}
      .sharer-toast__icon{width:30px;height:30px;flex:0 0 30px;display:block;object-fit:contain;border-radius:50%;background:rgba(255,255,255,.13)}
      .sharer-toast__body{min-width:0;flex:1}.sharer-toast__title{font-size:13px;font-weight:750;line-height:1.25}.sharer-toast__text{margin-top:2px;font-size:13px;line-height:1.35;color:rgba(255,255,255,.78);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sharer-toast__close{width:28px;height:28px;flex:0 0 28px;border:0;border-radius:50%;background:transparent;color:rgba(255,255,255,.72);font-size:20px;line-height:1;cursor:pointer}.sharer-toast__close:hover{background:rgba(255,255,255,.12);color:#fff}
      html[data-theme="light"] .sharer-toast{background:rgba(255,255,255,.94);border-color:rgba(0,0,0,.09);color:#101114;box-shadow:0 14px 35px rgba(0,0,0,.15)}html[data-theme="light"] .sharer-toast__text,html[data-theme="light"] .sharer-toast__close{color:rgba(0,0,0,.58)}html[data-theme="light"] .sharer-toast__close:hover{background:rgba(0,0,0,.07);color:#000}
      @media(max-width:768px){#sharerNotificationHost{top:max(8px,env(safe-area-inset-top));width:calc(100vw - 18px)}.sharer-toast{border-radius:16px;padding:12px 13px}}
    </style>`;
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function dismiss(toast, id) {
    if (!toast || toast.dataset.closing) return;
    toast.dataset.closing = '1';
    toast.classList.add('leave');
    saveQueue(queue().filter(item => item.id !== id));
    setTimeout(() => { toast.remove(); if (activeToast === toast) activeToast = null; showNext(); }, 280);
  }

  function showNext() {
    if (activeToast || !document.body) return;
    const items = queue();
    // DM 안에서 현재 보고 있는 방의 메시지는 이미 화면에 있으므로 배너를 띄우지 않는다.
    const visibleItems = items.filter(item => !item.roomId || !isOpenDmRoom(item.roomId));
    if (visibleItems.length !== items.length) saveQueue(visibleItems);
    const item = visibleItems[0];
    if (!item) return;
    const toast = document.createElement('div');
    toast.className = `sharer-toast sharer-toast--${item.type || 'info'}`;
    toast.setAttribute('role', 'status');
    const iconName = item.type === 'success' ? 'success' : item.type === 'error' ? 'error' : item.type === 'message' ? 'message' : 'info';
    toast.innerHTML = `<img class="sharer-toast__icon" src="notification-icons/${iconName}.png" alt=""><div class="sharer-toast__body"><div class="sharer-toast__title">${escapeText(item.title || 'Sharer')}</div><div class="sharer-toast__text">${escapeText(item.message)}</div></div><button class="sharer-toast__close" aria-label="닫기">×</button>`;
    ensureHost().appendChild(toast);
    activeToast = toast;
    requestAnimationFrame(() => toast.classList.add('show'));
    toast.querySelector('.sharer-toast__close').addEventListener('click', event => { event.stopPropagation(); dismiss(toast, item.id); });
    if (item.roomId) toast.addEventListener('click', () => { dismiss(toast, item.id); location.href = `dm.html?room=${encodeURIComponent(item.roomId)}`; });
    setTimeout(() => dismiss(toast, item.id), item.duration || 4500);
  }

  function notify(message, options) {
    const opts = typeof options === 'string' ? { type: options } : (options || {});
    if (!message) return;
    if (window.top !== window) {
      try { window.parent.postMessage({ type: 'sharer-global-notification', message, options: opts }, '*'); return; } catch (_) {}
    }
    const item = { id: opts.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`, message: String(message), title: opts.title || (opts.type === 'message' ? '새 메시지' : '안내'), type: opts.type || 'info', roomId: opts.roomId || '', createdAt: Date.now(), duration: opts.duration || 4500 };
    const items = queue();
    if (!items.some(old => old.id === item.id || (old.message === item.message && Date.now() - old.createdAt < 800))) { items.push(item); saveQueue(items); showNext(); }
  }

  async function request(path) {
    const response = await fetch(API_BASE + path, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  const loadCursors = userId => { try { return JSON.parse(localStorage.getItem(CURSOR_PREFIX + userId) || '{}'); } catch (_) { return {}; } };
  const saveCursors = (userId, cursors) => { try { localStorage.setItem(CURSOR_PREFIX + userId, JSON.stringify(cursors)); } catch (_) {} };

  function isOpenDmRoom(roomId) {
    if (!/\/dm\.html$/.test(location.pathname)) return false;
    return Array.from(document.querySelectorAll('.room-item.active')).some(element => element.dataset.roomId === String(roomId));
  }

  async function pollDirectMessages() {
    const user = getUser();
    if (!user?.id || document.hidden || isPolling) return;
    isPolling = true;
    try {
      const memberships = await request(`/dm_room_members?user_id=eq.${encodeURIComponent(user.id)}&select=room_id`);
      const roomIds = [...new Set((memberships || []).map(item => item.room_id).filter(Boolean))];
      const cursors = loadCursors(user.id);
      const initialized = localStorage.getItem(READY_PREFIX + user.id) === '1';
      const newMessages = [];
      for (const roomId of roomIds) {
        const messages = await request(`/dm_messages?room_id=eq.${encodeURIComponent(roomId)}&order=created_at.desc&limit=1&select=id,room_id,sender_id,content,created_at`);
        const latest = messages && messages[0];
        if (!latest) continue;
        const previous = cursors[roomId];
        if (initialized && previous && latest.id !== previous.id && new Date(latest.created_at).getTime() > (previous.createdAt || 0)) newMessages.push(latest);
        cursors[roomId] = { id: latest.id, createdAt: new Date(latest.created_at).getTime() || Date.now() };
      }
      saveCursors(user.id, cursors);
      localStorage.setItem(READY_PREFIX + user.id, '1');
      for (const message of newMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
        if (message.sender_id === user.id || !message.content || message.content.startsWith('[SYSTEM] ') || message.content.startsWith('[EMOTION]')) continue;
        let sender = '새 메시지';
        try { const people = await request(`/users?id=eq.${encodeURIComponent(message.sender_id)}&select=nickname&limit=1`); sender = people?.[0]?.nickname || sender; } catch (_) {}
        if (!isOpenDmRoom(message.room_id)) {
          notify(message.content, { type: 'message', title: sender, roomId: message.room_id, id: `dm-${message.id}`, duration: 6000 });
        }
      }
    } catch (error) { console.warn('[notifications] DM polling failed', error); }
    finally { isPolling = false; }
  }

  function start() {
    showNext(); pollDirectMessages();
    dmTimer = setInterval(pollDirectMessages, 3000);
    window.addEventListener('focus', pollDirectMessages);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { showNext(); pollDirectMessages(); } });
    window.addEventListener('message', event => { const data = event.data || {}; if (data.type === 'sharer-global-notification') notify(data.message, data.options); });
  }

  window.SharerNotify = notify;
  window.alert = message => notify(String(message || ''), { type: 'error', title: '안내' });
  window.addEventListener('storage', event => { if (event.key === QUEUE_KEY) showNext(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
