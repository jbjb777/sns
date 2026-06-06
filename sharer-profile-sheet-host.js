//아dk
(function setupSharerProfileSheetHost() {
  const HID = 'sharerProfileSheetHost';
  let escHandler = null;
  let discordJoinStylesInjected = false;

  function ensureDiscordJoinStyles() {
    if (discordJoinStylesInjected) return;
    discordJoinStylesInjected = true;
    const st = document.createElement('style');
    st.setAttribute('data-sps-discord-join', '');
    st.textContent =
      '.sharer-profile-sheet-host .sps-discord-join{' +
      'width:100%;box-sizing:border-box;margin-top:10px;padding:14px 16px;' +
      'border:1px solid rgba(88,101,242,0.9);border-radius:14px;background:transparent;' +
      'color:#aeb7ff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;' +
      'display:flex;align-items:center;justify-content:center;gap:10px;' +
      '}' +
      '.sharer-profile-sheet-host .sps-discord-join img{' +
      'width:22px;height:22px;flex-shrink:0;object-fit:contain;' +
      '}'+'.sharer-profile-sheet-host .sps-set{' +
      'width:100%;box-sizing:border-box;margin-top:10px;padding:14px 16px;' +
      'border:1px solid rgba(145,145,145,0.4);border-radius:14px;background:transparent;' +
      'color:#a5a5a5;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;' +
      'display:flex;align-items:center;justify-content:center;gap:10px;' +
      '}' +
      '.sharer-profile-sheet-host .sps-set img{' +
      'width:22px;height:22px;flex-shrink:0;object-fit:contain;' +
      '}' +
      // 라이트 모드일 때 설정 버튼 스타일 변경
      'body.light-mode .sharer-profile-sheet-host .sps-set{' +
      'border-color:rgba(0,0,0,0.15);color:#333;' +
      '}';
    document.head.appendChild(st);
  }

  function q(id) {
    return document.getElementById(id);
  }

  function finalizeClose(host) {
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    if (!host) return;
    host.hidden = true;
    host.setAttribute('hidden', '');
    host.innerHTML = '';
    host.className = 'sharer-profile-sheet-host';
  }

  function animateClose(host, afterDone) {
    if (!host || host.hidden) {
      if (afterDone) afterDone();
      return;
    }
    if (escHandler) {
      document.removeEventListener('keydown', escHandler);
      escHandler = null;
    }
    const panel = host.querySelector('.sps-panel');
    host.classList.remove('sps-host-open');
    if (!panel) {
      finalizeClose(host);
      if (afterDone) afterDone();
      return;
    }
    panel.classList.remove('sps-panel-expanded');
    panel.classList.remove('sps-panel-dragging');
    panel.style.transform = '';
    delete panel.dataset.pull;
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      panel.removeEventListener('transitionend', onEnd);
      clearTimeout(tid);
      finalizeClose(host);
      if (afterDone) afterDone();
    };
    const onEnd = (e) => {
      if (e.target === panel && e.propertyName === 'transform') cleanup();
    };
    panel.addEventListener('transitionend', onEnd);
    const tid = setTimeout(cleanup, 520);
  }

  function wireDragAndActions(
  host,
  panel,
  dragArea,
  prof,
  lo,
  setBtn,
  discordJoin,
  id,
  nick
) {
    const profileUrl =
      'https://sharer.r-e.kr/user.html?id=' +
      encodeURIComponent(id) +
      '&nickname=' +
      encodeURIComponent(nick);

    let expanded = false;
    let dragActive = false;
    let startY = 0;

    const dismissPx = () => Math.min(window.innerHeight * 0.24, 150);
    const expandPx = () => -56;
    const collapsePx = () => 92;

    function setExpanded(v) {
      expanded = !!v;
      panel.classList.toggle('sps-panel-expanded', expanded);
    }

    function endDrag(e) {
      if (!dragActive) return;
      dragActive = false;
      try {
        if (e && e.pointerId != null) dragArea.releasePointerCapture(e.pointerId);
      } catch (_) {}
      panel.classList.remove('sps-panel-dragging');
      const ty = parseFloat(panel.dataset.pull || '0') || 0;
      panel.style.transform = '';
      delete panel.dataset.pull;

      const dPx = dismissPx();
      const exPx = expandPx();
      const colPx = collapsePx();

      if (ty > dPx) {
        animateClose(host, null);
        return;
      }
      if (!expanded && ty < exPx) {
        setExpanded(true);
        host.classList.add('sps-host-open');
        return;
      }
      if (expanded && ty > colPx && ty <= dPx) {
        setExpanded(false);
        host.classList.add('sps-host-open');
        return;
      }
      host.classList.add('sps-host-open');
    }

    dragArea.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragActive = true;
      startY = e.clientY;
      panel.classList.add('sps-panel-dragging');
      try {
        dragArea.setPointerCapture(e.pointerId);
      } catch (_) {}
    });
    dragArea.addEventListener('pointermove', (e) => {
      if (!dragActive) return;
      e.preventDefault();
      const dy = e.clientY - startY;
      const minTy = expanded
        ? -Math.min(140, window.innerHeight * 0.14)
        : -Math.min(110, window.innerHeight * 0.12);
      const maxTy = window.innerHeight * 0.55;
      const ty = Math.max(minTy, Math.min(maxTy, dy));
      panel.dataset.pull = String(ty);
      panel.style.transform = 'translateY(' + ty + 'px)';
    });
    dragArea.addEventListener('pointerup', endDrag);
    dragArea.addEventListener('pointercancel', endDrag);
    dragArea.addEventListener('lostpointercapture', endDrag);

    prof.onclick = () => {
      animateClose(host, () => {
        location.href = profileUrl;
      });
    };
    lo.onclick = () => {
      animateClose(host, () => {
        if (typeof window.onSharerProfileLogout === 'function') {
          window.onSharerProfileLogout();
        }
      });
    };
    discordJoin.onclick = () => {
      animateClose(host, () => {
        window.open('https://discord.gg/8s6XuWkfQb', '_blank');
      });
    };
    setBtn.onclick = () => {
      animateClose(host, () => {
        window.location.href = 'https://sharer.r-e.kr/set.html';
      });
    };

  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || d.type !== 'sharerProfileSheet') return;
    const host = q(HID);
    if (!host) return;

    if (!d.open) {
      if (!host.hidden && host.querySelector('.sps-panel')) animateClose(host, null);
      else finalizeClose(host);
      return;
    }

    const u = d.user || {};
    const id = u.id;
    const nick = (u.nickname || '').toString();
    const pimg = (u.profile_image || '').toString();
    if (!id || !nick) return;

    ensureDiscordJoinStyles();

    finalizeClose(host);
    host.removeAttribute('hidden');
    host.hidden = false;
    host.className = 'sharer-profile-sheet-host';

    const bd = document.createElement('div');
    bd.className = 'sps-backdrop';
    bd.onclick = () => animateClose(host, null);

    const panel = document.createElement('div');
    panel.className = 'sps-panel';

    const dragArea = document.createElement('div');
    dragArea.className = 'sps-drag-area';
    const grab = document.createElement('div');
    grab.className = 'sps-grab';
    dragArea.appendChild(grab);

    const prof = document.createElement('div');
    prof.className = 'sps-profile';
    prof.setAttribute('role', 'button');
    prof.tabIndex = 0;
    const av = document.createElement('div');
    av.className = 'sps-av';
    if (pimg.trim()) {
      const im = document.createElement('img');
      im.src = pimg + (pimg.includes('?') ? '&' : '?') + 'v=' + Date.now();
      im.alt = nick;
      im.onerror = () => {
        av.textContent = (nick.charAt(0) || '?').toUpperCase();
      };
      av.appendChild(im);
    } else {
      av.textContent = (nick.charAt(0) || '?').toUpperCase();
    }
    const nm = document.createElement('span');
    nm.className = 'sps-name';
    nm.textContent = nick;
    prof.appendChild(av);
    prof.appendChild(nm);

    const lo = document.createElement('button');
    lo.type = 'button';
    lo.className = 'sps-logout';
    lo.textContent = '로그아웃';

    const discordJoin = document.createElement('button');
    discordJoin.type = 'button';
    discordJoin.className = 'sps-discord-join';
    const dIcon = document.createElement('img');
    dIcon.src = 'discord.png';
    dIcon.alt = '';
    const dLabel = document.createElement('span');
    dLabel.textContent = '디스코드 참여';
    discordJoin.appendChild(dIcon);
    discordJoin.appendChild(dLabel);
// 설정 버튼 엘리먼트 생성
    const setBtn = document.createElement('button');
    setBtn.type = 'button';
    setBtn.className = 'sps-set';
    
    const sIcon = document.createElement('img');
    // 현재 접속한 테마 상태(라이트모드 여부)에 맞춰 이미지 분기 처리
    const isLight = document.body.classList.contains('light-mode');
    sIcon.src = isLight ? 'setX.svg' : 'set.svg';
    sIcon.alt = '';
    
    const sLabel = document.createElement('span');
    sLabel.textContent = '설정';
    
    setBtn.appendChild(sIcon);
    setBtn.appendChild(sLabel);
    panel.appendChild(dragArea);
    panel.appendChild(prof);

    panel.appendChild(discordJoin);
    panel.appendChild(setBtn);
    panel.appendChild(lo);



    host.appendChild(bd);
    host.appendChild(panel);

    wireDragAndActions(
      host,
      panel,
      dragArea,
      prof,
      lo,
      setBtn,
      discordJoin,
      id,
      nick
    );

    escHandler = (e) => {
      if (e.key === 'Escape') animateClose(host, null);
    };
    document.addEventListener('keydown', escHandler);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        host.classList.add('sps-host-open');
      });
    });
  });
})();
