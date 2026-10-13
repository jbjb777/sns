/* sharer-feed.js — 홈 피드 맞춤설정 (피드 최대 3개 배치)
 * 설정 모양:
 *   { v:1,
 *     feeds:[{c:'all'},{c:'game'},{c:'photo'}],      // 1~3개, c = 'all' 또는 카테고리 id (중복 불가)
 *     layout:'tabs' | 'columns',                      // 탭으로 전환 / 나란히(넓은 화면)
 *     recommend:{ pos:'side'|'top'|'inline'|'hidden', every:8 } }  // 추천 사용자 위치
 * 저장: localStorage('sharerFeedLayout') + 로그인 상태면 users.feed_layout(jsonb)
 */
(function () {
  'use strict';
  var MAX = 3;
  var LS = 'sharerFeedLayout';
  var POS = [
    { id: 'side',   label: '오른쪽 옆 (PC)' },
    { id: 'top',    label: '피드 위 가로 목록' },
    { id: 'inline', label: '피드 중간에 끼워넣기' },
    { id: 'hidden', label: '숨기기' }
  ];
  var EVERY = [5, 8, 12];

  function cats() {
    return [{ id: 'all', label: '전체' }].concat(
      (window.SharerCategory ? SharerCategory.CATEGORIES : []).map(function (c) { return { id: c.id, label: c.label }; })
    );
  }
  function labelOf(id) {
    var f = cats().filter(function (c) { return c.id === id; })[0];
    return f ? f.label : '';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function defaults() {
    return { v: 1, feeds: [{ c: 'all' }], layout: 'tabs', recommend: { pos: 'side', every: 8 } };
  }

  /* 어떤 값이 들어와도 안전한 설정으로 정리 */
  function normalize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    var valid = cats().map(function (c) { return c.id; });
    var seen = {};
    var feeds = [];
    (Array.isArray(raw.feeds) ? raw.feeds : []).forEach(function (f) {
      var c = f && f.c;
      if (valid.indexOf(c) >= 0 && !seen[c] && feeds.length < MAX) { seen[c] = 1; feeds.push({ c: c }); }
    });
    if (!feeds.length) feeds = d.feeds;
    var layout = raw.layout === 'columns' ? 'columns' : 'tabs';
    var rec = raw.recommend || {};
    var pos = POS.some(function (p) { return p.id === rec.pos; }) ? rec.pos : 'side';
    var every = EVERY.indexOf(rec.every) >= 0 ? rec.every : 8;
    return { v: 1, feeds: feeds, layout: layout, recommend: { pos: pos, every: every } };
  }

  function getLocal() {
    try { return normalize(JSON.parse(localStorage.getItem(LS))); } catch (e) { return defaults(); }
  }
  function saveLocal(cfg) { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) {} }

  function loadRemote(api, userId) {
    if (!userId) return Promise.resolve(null);
    return api('/users?id=eq.' + encodeURIComponent(userId) + '&select=feed_layout').then(function (rows) {
      var v = rows && rows[0] && rows[0].feed_layout;
      return v ? normalize(v) : null;
    }).catch(function () { return null; });   // 컬럼이 아직 없으면 조용히 무시
  }
  function saveRemote(api, userId, cfg) {
    if (!userId) return Promise.resolve(false);
    return api('/users?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH', body: JSON.stringify({ feed_layout: cfg }), headers: { Prefer: 'return=minimal' }
    }).then(function () { return true; }).catch(function () { return false; });
  }

  /* ---------- 스타일 ---------- */
  function injectStyle() {
    if (document.getElementById('sf-style')) return;
    var st = document.createElement('style');
    st.id = 'sf-style';
    st.textContent = [
      '.sf-tabs{display:flex;align-items:center;gap:8px;margin:0 0 14px}',
      '.sf-tabs .sf-scroll{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;flex:1}',
      '.sf-tabs .sf-scroll::-webkit-scrollbar{display:none}',
      '.sf-tab{flex:0 0 auto;border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t2,#888);font:inherit;font-size:13px;font-weight:600;padding:7px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}',
      '.sf-tab.active{background:var(--t1,#fff);color:var(--bg,#000);border-color:var(--t1,#fff)}',
      '.sf-gear{flex:0 0 auto;width:34px;height:34px;border-radius:50%;border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t1,#fff);cursor:pointer;font-size:15px}',
      '.sf-gear:hover{background:var(--bg4,#222)}',
      '.sf-columns{display:grid;gap:16px;align-items:start}',
      '.sf-col-head{font-size:13px;font-weight:700;color:var(--t2,#888);margin:0 0 10px;padding-left:2px}',
      '.sf-rec-strip{margin:0 0 14px;padding:12px;border:1px solid var(--border,#1e1e1e);border-radius:18px;background:var(--bg2,#111)}',
      '.sf-rec-title{font-size:12px;font-weight:700;color:var(--t2,#888);margin:0 0 10px}',
      '.sf-rec-row{display:flex;gap:14px;overflow-x:auto;scrollbar-width:none}',
      '.sf-rec-row::-webkit-scrollbar{display:none}',
      '.sf-rec-item{flex:0 0 auto;width:68px;text-align:center;cursor:pointer}',
      '.sf-rec-av{width:52px;height:52px;border-radius:50%;margin:0 auto 6px;background:var(--bg4,#222);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--t1,#fff);overflow:hidden}',
      '.sf-rec-av img{width:100%;height:100%;object-fit:cover}',
      '.sf-rec-nick{font-size:11px;color:var(--t2,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sf-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}',
      '.sf-box{width:100%;max-width:440px;max-height:90vh;overflow-y:auto;background:var(--bg2,#111);color:var(--t1,#fff);border:1px solid var(--border2,#2a2a2a);border-radius:20px;padding:22px}',
      '.sf-box h3{font-size:17px;margin:0 0 4px}',
      '.sf-box .sf-sub{font-size:12px;color:var(--t2,#888);margin:0 0 16px}',
      '.sf-sec{margin:0 0 18px}',
      '.sf-sec-title{font-size:12px;font-weight:700;color:var(--t2,#888);margin:0 0 8px}',
      '.sf-row{display:flex;align-items:center;gap:8px;margin:0 0 8px}',
      '.sf-row select{flex:1;background:var(--bg3,#1a1a1a);color:var(--t1,#fff);border:1px solid var(--border2,#2a2a2a);border-radius:10px;padding:9px 10px;font:inherit;font-size:14px}',
      '.sf-mini{width:32px;height:32px;border-radius:8px;border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t1,#fff);cursor:pointer;font:inherit}',
      '.sf-mini:disabled{opacity:.35;cursor:default}',
      '.sf-btn{border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t1,#fff);font:inherit;font-size:13px;font-weight:600;padding:9px 14px;border-radius:10px;cursor:pointer}',
      '.sf-btn.primary{background:var(--t1,#fff);color:var(--bg,#000);border-color:var(--t1,#fff)}',
      '.sf-actions{display:flex;gap:8px;justify-content:space-between;margin-top:6px;flex-wrap:wrap}',
      '.sf-radio{display:flex;flex-direction:column;gap:6px}',
      '.sf-radio label{display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer}',
      '@media (max-width:900px){.sf-columns{display:block}.sf-columns>.sf-col{margin-bottom:24px}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- 탭 바 (피드가 1개면 탭 없이 ⚙ 만 표시) ---------- */
  function tabBar(host, cfg, activeIdx, handlers) {
    injectStyle();
    var tabs = cfg.feeds.length > 1 && cfg.layout === 'tabs'
      ? '<div class="sf-scroll">' + cfg.feeds.map(function (f, i) {
          return '<button type="button" class="sf-tab' + (i === activeIdx ? ' active' : '') + '" data-i="' + i + '">' + esc(labelOf(f.c)) + '</button>';
        }).join('') + '</div>'
      : '<div class="sf-scroll"></div>';
    host.className = 'sf-tabs';
    host.innerHTML = tabs + '<button type="button" class="sf-gear" title="피드 맞춤 설정" aria-label="피드 맞춤 설정">⚙</button>';
    host.onclick = function (e) {
      var t = e.target.closest('.sf-tab');
      if (t) return handlers.onSelect(parseInt(t.getAttribute('data-i'), 10));
      if (e.target.closest('.sf-gear')) handlers.onSettings();
    };
  }

  /* ---------- 추천 사용자 가로 목록 ---------- */
  function recStrip(users, onClick) {
    injectStyle();
    var items = users.map(function (u) {
      var av = u.profile_image
        ? '<img src="' + esc(u.profile_image) + '" alt="">'
        : esc((u.nickname || '?').charAt(0).toUpperCase());
      return '<div class="sf-rec-item" data-uid="' + esc(u.id) + '" data-nick="' + esc(u.nickname) + '">' +
        '<div class="sf-rec-av">' + av + '</div><div class="sf-rec-nick">' + esc(u.nickname) + '</div></div>';
    }).join('');
    var el = document.createElement('div');
    el.className = 'sf-rec-strip';
    el.innerHTML = '<div class="sf-rec-title">추천 프로필</div><div class="sf-rec-row">' + items + '</div>';
    el.addEventListener('click', function (e) {
      var it = e.target.closest('.sf-rec-item');
      if (it) onClick(it.getAttribute('data-uid'), it.getAttribute('data-nick'));
    });
    return el;
  }

  /* ---------- 설정 창 ---------- */
  function openEditor(current, onSave) {
    injectStyle();
    var cfg = normalize(JSON.parse(JSON.stringify(current)));
    var modal = document.createElement('div');
    modal.className = 'sf-modal';
    document.body.appendChild(modal);

    function used() { return cfg.feeds.map(function (f) { return f.c; }); }

    function render() {
      var rows = cfg.feeds.map(function (f, i) {
        var opts = cats().filter(function (c) { return c.id === f.c || used().indexOf(c.id) < 0; })
          .map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.c ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('');
        return '<div class="sf-row" data-i="' + i + '">' +
          '<select class="sf-sel">' + opts + '</select>' +
          '<button type="button" class="sf-mini" data-act="up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="sf-mini" data-act="down"' + (i === cfg.feeds.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="sf-mini" data-act="del"' + (cfg.feeds.length === 1 ? ' disabled' : '') + '>✕</button></div>';
      }).join('');
      var canAdd = cfg.feeds.length < MAX && cats().some(function (c) { return used().indexOf(c.id) < 0; });
      var posRadios = POS.map(function (p) {
        return '<label><input type="radio" name="sfpos" value="' + p.id + '"' + (cfg.recommend.pos === p.id ? ' checked' : '') + '> ' + esc(p.label) + '</label>';
      }).join('');
      var everyOpts = EVERY.map(function (n) { return '<option value="' + n + '"' + (cfg.recommend.every === n ? ' selected' : '') + '>' + n + '개마다</option>'; }).join('');
      modal.innerHTML =
        '<div class="sf-box" role="dialog" aria-label="피드 맞춤 설정">' +
        '<h3>피드 맞춤 설정</h3><p class="sf-sub">피드는 최대 ' + MAX + '개까지 배치할 수 있어요.</p>' +
        '<div class="sf-sec"><div class="sf-sec-title">내 피드 (' + cfg.feeds.length + '/' + MAX + ')</div>' + rows +
          '<button type="button" class="sf-btn" data-act="add"' + (canAdd ? '' : ' disabled style="opacity:.35"') + '>＋ 피드 추가</button></div>' +
        '<div class="sf-sec"><div class="sf-sec-title">배치 방식</div><div class="sf-radio">' +
          '<label><input type="radio" name="sflay" value="tabs"' + (cfg.layout === 'tabs' ? ' checked' : '') + '> 탭으로 전환</label>' +
          '<label><input type="radio" name="sflay" value="columns"' + (cfg.layout === 'columns' ? ' checked' : '') + '> 나란히 보기 (넓은 화면에서만, 좁으면 세로로)</label></div></div>' +
        '<div class="sf-sec"><div class="sf-sec-title">추천 사용자 위치</div><div class="sf-radio">' + posRadios + '</div>' +
          '<div class="sf-row" style="margin-top:8px"><select class="sf-every"' + (cfg.recommend.pos === 'inline' ? '' : ' disabled') + '>' + everyOpts + '</select></div></div>' +
        '<div class="sf-actions"><button type="button" class="sf-btn" data-act="reset">기본값</button>' +
        '<span><button type="button" class="sf-btn" data-act="cancel">취소</button> <button type="button" class="sf-btn primary" data-act="save">저장</button></span></div></div>';
    }

    function close() { modal.remove(); }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) return close();
      var b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      var row = b.closest('.sf-row');
      var i = row ? parseInt(row.getAttribute('data-i'), 10) : -1;
      if (act === 'up' && i > 0) { var t = cfg.feeds[i]; cfg.feeds[i] = cfg.feeds[i - 1]; cfg.feeds[i - 1] = t; render(); }
      else if (act === 'down' && i < cfg.feeds.length - 1) { var t2 = cfg.feeds[i]; cfg.feeds[i] = cfg.feeds[i + 1]; cfg.feeds[i + 1] = t2; render(); }
      else if (act === 'del' && cfg.feeds.length > 1) { cfg.feeds.splice(i, 1); render(); }
      else if (act === 'add' && cfg.feeds.length < MAX) {
        var free = cats().filter(function (c) { return used().indexOf(c.id) < 0; })[0];
        if (free) { cfg.feeds.push({ c: free.id }); render(); }
      }
      else if (act === 'reset') { cfg = defaults(); render(); }
      else if (act === 'cancel') close();
      else if (act === 'save') { close(); onSave(normalize(cfg)); }
    });
    modal.addEventListener('change', function (e) {
      var t = e.target;
      if (t.classList.contains('sf-sel')) {
        var i = parseInt(t.closest('.sf-row').getAttribute('data-i'), 10);
        cfg.feeds[i] = { c: t.value };
      } else if (t.name === 'sflay') cfg.layout = t.value;
      else if (t.name === 'sfpos') { cfg.recommend.pos = t.value; render(); }
      else if (t.classList.contains('sf-every')) cfg.recommend.every = parseInt(t.value, 10);
    });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
    });
    render();
  }

  window.SharerFeed = {
    MAX: MAX, POS: POS, defaults: defaults, normalize: normalize, labelOf: labelOf,
    getLocal: getLocal, saveLocal: saveLocal, loadRemote: loadRemote, saveRemote: saveRemote,
    tabBar: tabBar, recStrip: recStrip, openEditor: openEditor
  };
})();
