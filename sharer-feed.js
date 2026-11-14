/* sharer-feed.js — 홈을 가로 열로 배치 (최대 3개)
 * 설정:
 *   { v:2, columns:[{ id:'all', w:'wide' }, { id:'search', w:'mid' }] }
 *   id: all | text | photo | gif | game | dday | recommend | search | notify
 *   w : narrow | mid | wide
 * 저장: localStorage('sharerFeedLayout') + 로그인 시 users.feed_layout
 * 예전 { feeds, layout, recommend } 설정도 열로 옮긴다.
 */
(function () {
  'use strict';
  var MAX = 3;
  var LS = 'sharerFeedLayout';
  var WIDTHS = [
    { id: 'narrow', label: '좁게', grow: 0.72 },
    { id: 'mid', label: '보통', grow: 1 },
    { id: 'wide', label: '넓게', grow: 1.4 }
  ];

  function feedIds() {
    var extra = (window.SharerCategory && SharerCategory.CATEGORIES) || [
      { id: 'text' }, { id: 'photo' }, { id: 'gif' }, { id: 'dday' }, { id: 'game' }
    ];
    return ['all'].concat(extra.map(function (c) { return c.id; }));
  }
  function kinds() {
    var labels = {
      all: '전체', text: '텍스트', photo: '사진', gif: '짧은 동영상',
      game: '게임', dday: '디데이', recommend: '추천 사용자', search: '검색', notify: '알림'
    };
    return feedIds().concat(['recommend', 'search', 'notify']).map(function (id) {
      return { id: id, label: labels[id] || id, feed: feedIds().indexOf(id) >= 0 };
    });
  }
  function kindOf(id) {
    return kinds().filter(function (k) { return k.id === id; })[0] || null;
  }
  function labelOf(id) {
    var k = kindOf(id);
    return k ? k.label : '';
  }
  function isFeed(id) { return feedIds().indexOf(id) >= 0; }
  function widthOf(id) {
    return WIDTHS.filter(function (w) { return w.id === id; })[0] || WIDTHS[1];
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function defaults() {
    return { v: 2, columns: [{ id: 'all', w: 'wide' }, { id: 'search', w: 'mid' }] };
  }

  function column(id, w) {
    return { id: kindOf(id) ? id : 'all', w: widthOf(w).id };
  }

  function normalize(raw) {
    var src = [];
    if (raw && Array.isArray(raw.columns)) {
      src = raw.columns.map(function (c) { return { id: c && c.id, w: c && c.w }; });
    } else if (raw && Array.isArray(raw.feeds)) {
      src = raw.feeds.map(function (f) { return { id: f && f.c, w: 'mid' }; });
      var pos = raw.recommend && raw.recommend.pos;
      if (pos && pos !== 'hidden') src.push({ id: 'recommend', w: 'narrow' });
    }
    var seen = {};
    var columns = [];
    src.forEach(function (c) {
      if (!c || !kindOf(c.id) || seen[c.id] || columns.length >= MAX) return;
      seen[c.id] = 1;
      columns.push(column(c.id, c.w));
    });
    if (!columns.length) return defaults();
    return { v: 2, columns: columns };
  }

  function getLocal() {
    try { return normalize(JSON.parse(localStorage.getItem(LS))); } catch (e) { return defaults(); }
  }
  function saveLocal(cfg) { try { localStorage.setItem(LS, JSON.stringify(normalize(cfg))); } catch (e) {} }

  function loadRemote(api, userId) {
    if (!userId) return Promise.resolve(null);
    return api('/users?id=eq.' + encodeURIComponent(userId) + '&select=feed_layout').then(function (rows) {
      var v = rows && rows[0] && rows[0].feed_layout;
      return v ? normalize(v) : null;
    }).catch(function () { return null; });
  }
  function saveRemote(api, userId, cfg) {
    if (!userId) return Promise.resolve(false);
    return api('/users?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH', body: JSON.stringify({ feed_layout: normalize(cfg) }), headers: { Prefer: 'return=minimal' }
    }).then(function () { return true; }).catch(function () { return false; });
  }

  function unused(cfg, except) {
    var taken = cfg.columns.map(function (c) { return c.id; }).filter(function (id) { return id !== except; });
    return kinds().filter(function (k) { return taken.indexOf(k.id) < 0; });
  }
  function nextFree(cfg) {
    var order = ['search', 'recommend', 'notify', 'text', 'photo', 'gif', 'game', 'dday', 'all'];
    var free = unused(cfg, null).map(function (k) { return k.id; });
    for (var i = 0; i < order.length; i++) if (free.indexOf(order[i]) >= 0) return order[i];
    return free[0] || null;
  }

  function injectStyle() {
    if (document.getElementById('sf-style')) return;
    var st = document.createElement('style');
    st.id = 'sf-style';
    st.textContent = [
      '.feed-board{display:flex;align-items:stretch;gap:0;width:100%;height:100%;min-height:0;overflow-x:auto;overflow-y:hidden}',
      '.feed-board.count-1{justify-content:center}',
      '.sf-col{min-width:280px;height:100%;display:flex;flex-direction:column;border-right:1px solid var(--border,#1e1e1e);background:var(--bg,#000)}',
      '.feed-board.count-1 .sf-col{border-right:none;width:min(640px,100%)}',
      '.sf-col.w-narrow{flex:0.72 1 0;max-width:420px}',
      '.sf-col.w-mid{flex:1 1 0;max-width:560px}',
      '.sf-col.w-wide{flex:1.4 1 0;max-width:680px}',
      '.sf-col-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 10px;flex:0 0 auto}',
      '.sf-col-head h2{font-size:16px;font-weight:700;letter-spacing:-0.3px}',
      '.sf-col-menu{width:34px;height:34px;border-radius:10px;border:1px solid var(--border2,#2a2a2a);background:var(--bg2,#111);color:var(--t1,#fff);cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.sf-col-menu:hover,.sf-col-menu.open{background:var(--bg4,#222)}',
      '.sf-col-body{flex:1;min-height:0;overflow-y:auto;padding:0 16px 28px}',
      '.sf-add{flex:0 0 64px;margin:12px 10px;border:1px dashed var(--border2,#2a2a2a);border-radius:16px;background:transparent;color:var(--t2,#888);cursor:pointer;font:inherit;font-size:13px;font-weight:600}',
      '.sf-add:hover{color:var(--t1,#fff);border-color:var(--t2,#888)}',
      '.sf-menu{position:fixed;z-index:80;min-width:220px;max-width:260px;padding:6px;background:var(--bg2,#161616);border:1px solid var(--border2,#2a2a2a);border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.45)}',
      '.sf-menu button{display:flex;width:100%;text-align:left;align-items:center;justify-content:space-between;gap:8px;background:transparent;border:0;color:var(--t1,#fff);font:inherit;font-size:14px;padding:9px 10px;border-radius:10px;cursor:pointer}',
      '.sf-menu button:hover{background:var(--bg4,#222)}',
      '.sf-menu button.on{font-weight:700}',
      '.sf-menu .sf-rule{height:1px;background:var(--border,#1e1e1e);margin:4px 6px}',
      '.sf-menu .sf-widths{display:flex;gap:4px;padding:4px}',
      '.sf-menu .sf-widths button{justify-content:center;border:1px solid var(--border2,#2a2a2a);border-radius:999px;padding:6px 0}',
      '.sf-menu .sf-widths button.on{background:var(--t1,#fff);color:var(--bg,#000)}',
      '.sf-check{font-size:12px;color:var(--t2,#888)}',
      '.sf-search{width:100%;background:var(--bg3,#1a1a1a);border:1px solid var(--border2,#2a2a2a);color:var(--t1,#fff);border-radius:999px;padding:11px 14px;font:inherit;font-size:14px;outline:none;margin:4px 0 14px}',
      '.sf-search:focus{border-color:var(--border3,#333)}',
      '.sf-sec-label{font-size:12px;font-weight:700;color:var(--t2,#888);margin:4px 0 8px}',
      '.sf-user{display:flex;gap:10px;align-items:center;padding:8px 4px;cursor:pointer;border-radius:12px}',
      '.sf-user:hover{background:var(--bg3,#1a1a1a)}',
      '.sf-user-av{width:40px;height:40px;border-radius:50%;overflow:hidden;background:var(--bg4,#222);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;color:var(--t1,#fff)}',
      '.sf-user-av img{width:100%;height:100%;object-fit:cover;display:block}',
      '.sf-user-name{font-size:14px;font-weight:650;color:var(--t1,#fff)}',
      '.sf-user-sub{font-size:12px;color:var(--t2,#888);margin-top:2px}',
      '.sf-empty,.sf-note{color:var(--t2,#888);font-size:13px;line-height:1.5}',
      '.sf-empty{text-align:center;padding:28px 8px}',
      '.sf-note{padding:0 2px 12px}',
      '.sf-hit{padding:12px 2px;border-bottom:1px solid var(--border,#1e1e1e);cursor:pointer}',
      '.sf-hit:hover{background:var(--bg2,#111)}',
      '.sf-hit-title{font-size:14px;font-weight:650}',
      '.sf-hit-sub{font-size:13px;color:var(--t2,#888);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.sf-noti{padding:12px 2px;border-bottom:1px solid var(--border,#1e1e1e);cursor:pointer}',
      '.sf-noti:hover{background:var(--bg2,#111)}',
      '.sf-noti-detail{font-size:14px;line-height:1.45}',
      '.sf-noti-time{font-size:12px;color:var(--t3,#444);margin-top:4px}',
      '@media (max-width:768px){.feed-board{scroll-snap-type:x mandatory}.sf-col{flex:0 0 100% !important;max-width:none !important;min-width:100%;scroll-snap-align:start}.sf-add{display:none}}'
    ].join('');
    document.head.appendChild(st);
  }

  var menuEl = null;
  function closeMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; }
    document.querySelectorAll('.sf-col-menu.open').forEach(function (b) { b.classList.remove('open'); });
  }

  function openMenu(btn, cfg, index, onChange) {
    closeMenu();
    btn.classList.add('open');
    var col = cfg.columns[index];
    var menu = document.createElement('div');
    menu.className = 'sf-menu';
    menuEl = menu;
    var items = kinds().map(function (k) {
      var taken = cfg.columns.some(function (c, i) { return i !== index && c.id === k.id; });
      if (taken) return '';
      var on = k.id === col.id;
      return '<button type="button" data-act="kind" data-id="' + k.id + '"' + (on ? ' class="on"' : '') + '>' +
        esc(k.label) + (on ? '<span class="sf-check">표시 중</span>' : '') + '</button>';
    }).join('');
    var widths = WIDTHS.map(function (w) {
      return '<button type="button" data-act="width" data-w="' + w.id + '"' + (col.w === w.id ? ' class="on"' : '') + '>' + esc(w.label) + '</button>';
    }).join('');
    var extra = '';
    if (cfg.columns.length < MAX && nextFree(cfg)) extra += '<button type="button" data-act="add">열 추가</button>';
    if (cfg.columns.length > 1) extra += '<button type="button" data-act="close">이 열 닫기</button>';
    menu.innerHTML = items + '<div class="sf-rule"></div><div class="sf-widths">' + widths + '</div>' +
      (extra ? '<div class="sf-rule"></div>' + extra : '');
    document.body.appendChild(menu);
    var r = btn.getBoundingClientRect();
    var mw = menu.offsetWidth;
    var left = Math.min(window.innerWidth - mw - 8, Math.max(8, r.right - mw));
    var top = r.bottom + 8;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 8);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var next = normalize(JSON.parse(JSON.stringify(cfg)));
      var act = b.getAttribute('data-act');
      var meta = { widthOnly: false };
      if (act === 'kind') {
        next.columns[index].id = b.getAttribute('data-id');
      } else if (act === 'width') {
        next.columns[index].w = b.getAttribute('data-w');
        meta.widthOnly = next.columns.every(function (c, i) { return c.id === cfg.columns[i].id; });
      } else if (act === 'add') {
        var id = nextFree(next);
        if (!id) return;
        next.columns.push(column(id, 'mid'));
      } else if (act === 'close') {
        next.columns.splice(index, 1);
      }
      closeMenu();
      onChange(normalize(next), meta);
    });
  }

  function applyWidths(host, cfg) {
    cfg = normalize(cfg);
    host._sfCfg = cfg;
    host.className = 'feed-board count-' + cfg.columns.length;
    var cols = host.querySelectorAll('.sf-col');
    cfg.columns.forEach(function (c, i) {
      if (!cols[i]) return;
      cols[i].classList.remove('w-narrow', 'w-mid', 'w-wide');
      cols[i].classList.add('w-' + widthOf(c.w).id);
      var title = cols[i].querySelector('h2');
      if (title) title.textContent = labelOf(c.id);
    });
  }

  function mount(host, cfg, onChange) {
    injectStyle();
    closeMenu();
    cfg = normalize(cfg);
    host._sfCfg = cfg;
    host.className = 'feed-board count-' + cfg.columns.length;
    var html = cfg.columns.map(function (c, i) {
      return '<section class="sf-col w-' + widthOf(c.w).id + '" data-i="' + i + '">' +
        '<header class="sf-col-head"><h2>' + esc(labelOf(c.id)) + '</h2>' +
        '<button type="button" class="sf-col-menu" aria-label="이 열 바꾸기" data-i="' + i + '">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="2" width="5" height="12" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9.5" y="2" width="5" height="12" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>' +
        '</button></header><div class="sf-col-body" data-sf-body></div></section>';
    }).join('');
    if (cfg.columns.length < MAX) html += '<button type="button" class="sf-add" data-act="add">+ 열</button>';
    host.innerHTML = html;
    host.onclick = function (e) {
      var menuBtn = e.target.closest('.sf-col-menu');
      if (menuBtn) {
        e.stopPropagation();
        var i = parseInt(menuBtn.getAttribute('data-i'), 10);
        if (menuEl && menuBtn.classList.contains('open')) closeMenu();
        else openMenu(menuBtn, host._sfCfg, i, onChange);
        return;
      }
      if (e.target.closest('.sf-add')) {
        var live = host._sfCfg;
        var id = nextFree(live);
        if (!id) return;
        var next = normalize(JSON.parse(JSON.stringify(live)));
        next.columns.push(column(id, 'mid'));
        onChange(normalize(next), { widthOnly: false });
      }
    };
  }

  document.addEventListener('click', function (e) {
    if (!menuEl) return;
    if (e.target.closest('.sf-menu') || e.target.closest('.sf-col-menu')) return;
    closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  window.SharerFeed = {
    MAX: MAX,
    defaults: defaults,
    normalize: normalize,
    labelOf: labelOf,
    isFeed: isFeed,
    getLocal: getLocal,
    saveLocal: saveLocal,
    loadRemote: loadRemote,
    saveRemote: saveRemote,
    mount: mount,
    applyWidths: applyWidths,
    closeMenu: closeMenu
  };
})();
