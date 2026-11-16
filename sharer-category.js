/* sharer-category.js
 * 게시물 카테고리(텍스트/사진/짧은 동영상(GIF)/디데이/HTML5 게임) 공통 모듈
 * make.html / index.html / explore.html / view.html 에서 같이 사용합니다.
 * 필터 선택값은 홈·탐색이 같이 쓰도록 sessionStorage('sharerCategory') 에 저장됩니다.
 */
(function () {
  'use strict';

  var CATEGORIES = [
    { id: 'text',  label: '텍스트',            icon: '📝' },
    { id: 'photo', label: '사진',              icon: '📷' },
    { id: 'gif',   label: '짧은 동영상(GIF)',  icon: '🎞️' },
    { id: 'dday',  label: '디데이',            icon: '📅' },
    { id: 'game',  label: 'HTML5 게임',        icon: '🎮' }
  ];
  var FILTERS = [{ id: 'all', label: '전체', icon: '' }].concat(CATEGORIES);
  var DDAY_COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#4ade80', '#48a9f8', '#a78bfa', '#f472b6'];
  var GAME_MAX_BYTES = 400 * 1024;   // Worker 본문 제한(1MB) 안쪽
  var GIF_MAX_BYTES = 8 * 1024 * 1024;
  var STORE_KEY = 'sharerCategory';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function isCat(id) { return CATEGORIES.some(function (c) { return c.id === id; }); }
  function labelOf(id) {
    var f = FILTERS.filter(function (c) { return c.id === id; })[0];
    return f ? f.label : '';
  }
  function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : DDAY_COLORS[0]; }

  /* 이전 글(category 값이 없는 글)도 올바르게 분류 */
  function normalize(post) {
    if (post && isCat(post.category)) return post.category;
    var img = post && post.image_url ? String(post.image_url).trim() : '';
    if (!img) return 'text';
    return /\.gif(\?|,|$)/i.test(img) ? 'gif' : 'photo';
  }

  function getSaved() {
    try {
      var v = sessionStorage.getItem(STORE_KEY);
      if (FILTERS.some(function (f) { return f.id === v; })) return v;
    } catch (e) {}
    return 'all';
  }
  function save(v) { try { sessionStorage.setItem(STORE_KEY, v); } catch (e) {} }

  /* PostgREST 쿼리에 붙일 조각 ('전체' 는 아무것도 안 붙음 → 기존 쿼리와 동일) */
  function queryFor(v) {
    return (v && v !== 'all' && isCat(v)) ? '&category=eq.' + v : '';
  }

  /* ---------- 스타일 ---------- */
  function injectStyle() {
    if (document.getElementById('sc-style')) return;
    var st = document.createElement('style');
    st.id = 'sc-style';
    st.textContent = [
      '.sc-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:2px 0}',
      '.sc-chips::-webkit-scrollbar{display:none}',
      '.sc-chip{flex:0 0 auto;border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t2,#888);',
      'font:inherit;font-size:13px;font-weight:600;padding:7px 13px;border-radius:999px;cursor:pointer;white-space:nowrap;transition:all .15s}',
      '.sc-chip:hover{color:var(--t1,#fff);border-color:var(--border3,#333)}',
      '.sc-chip.active{background:var(--t1,#fff);color:var(--bg,#000);border-color:var(--t1,#fff)}',
      '.sc-filterbar{margin:0 0 14px}',
      '.sc-float{position:fixed;top:10px;left:72px;right:0;z-index:40;display:flex;justify-content:center;padding:0 12px;pointer-events:none}',
      '.sc-float .sc-chips{pointer-events:auto;max-width:100%;background:color-mix(in srgb,var(--bg,#000) 70%,transparent);',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:6px;border-radius:999px}',
      '@media (max-width:768px){.sc-float{left:0}}',
      '.sc-badge{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:6px;',
      'background:var(--bg4,#222);color:var(--t2,#888);vertical-align:middle}',
      '.sc-picker{margin:0 0 14px}',
      '.sc-panel{margin-top:12px;padding:14px;border:1px solid var(--border2,#2a2a2a);border-radius:14px;background:var(--bg2,#111);display:none}',
      '.sc-panel.show{display:block}',
      '.sc-label{font-size:12px;color:var(--t2,#888);margin:0 0 6px;display:block}',
      '.sc-input{width:100%;background:var(--bg3,#1a1a1a);border:1px solid var(--border2,#2a2a2a);color:var(--t1,#fff);border-radius:10px;',
      'padding:10px 12px;font:inherit;font-size:14px;outline:none}',
      '.sc-input:focus{border-color:var(--border3,#333)}',
      '.sc-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;min-height:180px;resize:vertical;white-space:pre}',
      '.sc-swatches{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}',
      '.sc-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;outline:none;padding:0}',
      '.sc-swatch.active{border-color:var(--t1,#fff);box-shadow:0 0 0 2px var(--bg,#000) inset}',
      '.sc-note{font-size:12px;color:var(--t2,#888);line-height:1.5;margin-top:8px}',
      '.sc-row{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px;flex-wrap:wrap}',
      '.sc-btn{border:1px solid var(--border2,#2a2a2a);background:var(--bg3,#1a1a1a);color:var(--t1,#fff);font:inherit;font-size:13px;',
      'font-weight:600;padding:8px 14px;border-radius:10px;cursor:pointer}',
      '.sc-btn:hover{background:var(--bg4,#222)}',
      '.sc-dday{margin:12px 0;border-radius:18px;padding:22px 18px;text-align:center;color:#fff;',
      'background:linear-gradient(135deg,var(--sc-c),color-mix(in srgb,var(--sc-c) 55%,#000))}',
      '.sc-dday-num{font-size:44px;font-weight:800;letter-spacing:-1px;line-height:1.1}',
      '.sc-dday-date{font-size:13px;opacity:.9;margin-top:6px}',
      '.sc-game{margin:12px 0;border-radius:16px;overflow:hidden;border:1px solid var(--border2,#2a2a2a);background:var(--bg2,#111)}',
      '.sc-game-ph{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:34px 16px;color:var(--t2,#888);font-size:14px}',
      '.sc-game-ph .big{font-size:40px}',
      '.sc-game-frame{display:block;width:100%;height:480px;border:0;background:#fff}',
      '.sc-game-bar{display:flex;justify-content:flex-end;padding:6px;background:var(--bg3,#1a1a1a)}',
      '.sc-game.explore .sc-game-frame{height:62vh}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- 필터 바 (홈·탐색 공통) ---------- */
  function filterBar(host, onChange, opts) {
    injectStyle();
    opts = opts || {};
    host.classList.add(opts.floating ? 'sc-float' : 'sc-filterbar');
    var current = getSaved();
    host.innerHTML = '<div class="sc-chips" role="tablist">' + FILTERS.map(function (f) {
      return '<button type="button" class="sc-chip' + (f.id === current ? ' active' : '') + '" data-f="' + f.id + '">' +
        (f.icon ? f.icon + ' ' : '') + esc(f.label) + '</button>';
    }).join('') + '</div>';
    host.addEventListener('click', function (e) {
      var b = e.target.closest('.sc-chip');
      if (!b) return;
      var id = b.getAttribute('data-f');
      if (id === current) return;
      current = id;
      save(id);
      [].forEach.call(host.querySelectorAll('.sc-chip'), function (x) {
        x.classList.toggle('active', x === b);
      });
      onChange && onChange(id);
    });
    return { get: function () { return current; } };
  }

  /* ---------- 디데이 ---------- */
  function ddayInfo(dateStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
    if (!m) return null;
    var target = new Date(+m[1], +m[2] - 1, +m[3]);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((target - today) / 86400000);
    var text = diff > 0 ? 'D-' + diff : diff === 0 ? 'D-Day' : 'D+' + (-diff);
    return { diff: diff, text: text, date: m[1] + '.' + m[2] + '.' + m[3] };
  }
  function ddayCard(post) {
    var info = ddayInfo(post.dday_date);
    if (!info) return '';
    injectStyle();
    return '<div class="sc-dday" style="--sc-c:' + safeColor(post.dday_color) + '">' +
      '<div class="sc-dday-num">' + info.text + '</div>' +
      '<div class="sc-dday-date">' + info.date + '</div></div>';
  }

  /* ---------- HTML5 게임 ---------- */
  function gameCard(post, cls) {
    injectStyle();
    return '<div class="sc-game ' + (cls || '') + '" data-game-id="' + esc(post.id) + '">' +
      '<div class="sc-game-ph"><div class="big">🎮</div><div>HTML5 게임</div>' +
      '<button type="button" class="sc-btn" data-sc-play="' + esc(post.id) + '">▶ 플레이</button></div></div>';
  }

  function withCsp(html) {
    var meta = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; ' +
      'script-src \'unsafe-inline\' \'unsafe-eval\'; style-src \'unsafe-inline\'; ' +
      'img-src data: blob:; media-src data: blob:; font-src data:; connect-src \'none\'; form-action \'none\'">';
    var m = /<head[^>]*>/i.exec(html) || /<html[^>]*>/i.exec(html);
    if (m) return html.slice(0, m.index + m[0].length) + meta + html.slice(m.index + m[0].length);
    return meta + html;
  }

  /* box 안에 샌드박스 iframe 으로 게임을 띄움 (apiFn: 페이지의 api 함수) */
  function mountGame(box, postId, apiFn) {
    injectStyle();
    box.innerHTML = '<div class="sc-game-ph">게임 불러오는 중…</div>';
    return apiFn('/post_games?post_id=eq.' + encodeURIComponent(postId) + '&select=html').then(function (rows) {
      var html = rows && rows[0] && rows[0].html;
      if (!html) { box.innerHTML = '<div class="sc-game-ph">게임을 불러올 수 없어요.</div>'; return; }
      var fr = document.createElement('iframe');
      fr.className = 'sc-game-frame';
      // allow-same-origin 없음 → 게임 코드는 사이트의 로그인 정보/쿠키/저장소에 접근 불가
      fr.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
      fr.setAttribute('allow', 'fullscreen');
      fr.setAttribute('referrerpolicy', 'no-referrer');
      fr.srcdoc = withCsp(html);
      var bar = document.createElement('div');
      bar.className = 'sc-game-bar';
      var fs = document.createElement('button');
      fs.type = 'button'; fs.className = 'sc-btn'; fs.textContent = '⛶ 전체화면';
      fs.onclick = function () { try { fr.requestFullscreen && fr.requestFullscreen(); } catch (e) {} };
      bar.appendChild(fs);
      box.innerHTML = '';
      box.appendChild(fr);
      box.appendChild(bar);
    }).catch(function () {
      box.innerHTML = '<div class="sc-game-ph">게임을 불러오지 못했어요.</div>';
    });
  }

  /* 탐색처럼 카드 클릭이 페이지 이동이 아닌 곳에서 ▶ 플레이 버튼 처리 */
  function bindPlay(apiFn) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sc-play]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      var box = b.closest('.sc-game');
      if (box) mountGame(box, b.getAttribute('data-sc-play'), apiFn);
    });
  }

  function badge(post) {
    var c = normalize(post);
    if (c === 'text') return '';
    var short = { photo: '사진', gif: 'GIF', dday: '디데이', game: '게임' }[c];
    return '<span class="sc-badge">' + short + '</span>';
  }

  /* 카테고리별 추가 영역(디데이 카드 / 게임 카드) */
  function extra(post, cls) {
    var c = normalize(post);
    if (c === 'dday') return ddayCard(post);
    if (c === 'game') return gameCard(post, cls);
    return '';
  }

  /* ---------- 작성 화면 선택기 ---------- */
  function picker(host, onChange) {
    injectStyle();
    host.classList.add('sc-picker');
    var state = { category: 'text', color: DDAY_COLORS[0], gameHtml: '' };

    host.innerHTML =
      '<div class="sc-chips">' + CATEGORIES.map(function (c) {
        return '<button type="button" class="sc-chip' + (c.id === 'text' ? ' active' : '') + '" data-c="' + c.id + '">' +
          c.icon + ' ' + esc(c.label) + '</button>';
      }).join('') + '</div>' +
      '<div class="sc-panel" data-p="dday">' +
        '<label class="sc-label">디데이 날짜</label>' +
        '<input type="date" class="sc-input" id="scDate">' +
        '<div class="sc-swatches">' + DDAY_COLORS.map(function (c, i) {
          return '<button type="button" class="sc-swatch' + (i === 0 ? ' active' : '') + '" data-color="' + c + '" style="background:' + c + '" aria-label="색상"></button>';
        }).join('') + '</div>' +
        '<div class="sc-note">아래 입력창에 쓴 내용이 디데이 제목이 돼요. (예: 수학여행)</div>' +
      '</div>' +
      '<div class="sc-panel" data-p="game">' +
        '<label class="sc-label">게임 HTML 코드 (하나의 HTML 파일)</label>' +
        '<textarea class="sc-input sc-code" id="scGameHtml" spellcheck="false" placeholder="<!DOCTYPE html>&#10;<html>...</html>"></textarea>' +
        '<div class="sc-row"><button type="button" class="sc-btn" id="scGameFileBtn">📂 HTML 파일 불러오기</button>' +
        '<span class="sc-note" id="scGameSize" style="margin:0">0KB / ' + (GAME_MAX_BYTES / 1024) + 'KB</span></div>' +
        '<input type="file" id="scGameFile" accept=".html,.htm,text/html" style="display:none">' +
        '<div class="sc-note">외부 CDN·이미지 링크·서버 통신은 보안상 차단돼요. 코드·스타일·이미지(data:)를 한 파일에 담아주세요. 게임은 격리된 창에서 실행돼요.</div>' +
      '</div>';

    var chips = host.querySelectorAll('.sc-chip[data-c]');
    var panels = host.querySelectorAll('.sc-panel');
    var ta = host.querySelector('#scGameHtml');
    var sizeEl = host.querySelector('#scGameSize');

    function bytes(s) { return new Blob([s]).size; }
    function refreshSize() {
      var b = bytes(ta.value);
      sizeEl.textContent = Math.ceil(b / 1024) + 'KB / ' + (GAME_MAX_BYTES / 1024) + 'KB';
      sizeEl.style.color = b > GAME_MAX_BYTES ? '#ff6b6b' : '';
    }
    function setCategory(id) {
      state.category = id;
      [].forEach.call(chips, function (c) { c.classList.toggle('active', c.getAttribute('data-c') === id); });
      [].forEach.call(panels, function (p) { p.classList.toggle('show', p.getAttribute('data-p') === id); });
      onChange && onChange(id);
    }

    host.addEventListener('click', function (e) {
      var c = e.target.closest('.sc-chip[data-c]');
      if (c) return setCategory(c.getAttribute('data-c'));
      var s = e.target.closest('.sc-swatch');
      if (s) {
        state.color = s.getAttribute('data-color');
        [].forEach.call(host.querySelectorAll('.sc-swatch'), function (x) { x.classList.toggle('active', x === s); });
      }
    });
    ta.addEventListener('input', refreshSize);
    host.querySelector('#scGameFileBtn').onclick = function () { host.querySelector('#scGameFile').click(); };
    host.querySelector('#scGameFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (f.size > GAME_MAX_BYTES) { alert('게임 파일은 ' + (GAME_MAX_BYTES / 1024) + 'KB 이하만 올릴 수 있어요.'); return; }
      var r = new FileReader();
      r.onload = function () { ta.value = String(r.result || ''); refreshSize(); };
      r.readAsText(f);
    };

    return {
      get category() { return state.category; },
      /* 카테고리별 추가 데이터. 문제가 있으면 Error(메시지) */
      getData: function () {
        var out = { category: state.category };
        if (state.category === 'dday') {
          var d = host.querySelector('#scDate').value;
          if (!d) throw new Error('디데이 날짜를 선택해주세요.');
          out.dday_date = d;
          out.dday_color = state.color;
        } else if (state.category === 'game') {
          var html = ta.value.trim();
          if (!html) throw new Error('게임 HTML 코드를 입력해주세요.');
          if (bytes(html) > GAME_MAX_BYTES) throw new Error('게임 코드는 ' + (GAME_MAX_BYTES / 1024) + 'KB 이하여야 해요.');
          out.gameHtml = html;
        }
        return out;
      }
    };
  }

  window.SharerCategory = {
    CATEGORIES: CATEGORIES, FILTERS: FILTERS, DDAY_COLORS: DDAY_COLORS,
    GAME_MAX_BYTES: GAME_MAX_BYTES, GIF_MAX_BYTES: GIF_MAX_BYTES,
    labelOf: labelOf, normalize: normalize, getSaved: getSaved, save: save, queryFor: queryFor,
    filterBar: filterBar, picker: picker, ddayInfo: ddayInfo, ddayCard: ddayCard,
    gameCard: gameCard, badge: badge, extra: extra, mountGame: mountGame, bindPlay: bindPlay
  };
})();
