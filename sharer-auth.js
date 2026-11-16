// 로그인 세션. login.html / join.html 이 SharerAuth.setSession 을 호출하고,
// 나머지 페이지의 fetch 는 이 파일이 워커 토큰을 Authorization 에 붙인다.
(function () {
  const API_HOST = "https://sharer-api.alexeom97.workers.dev";
  const USER_KEY = "snsUser";
  const TOKEN_KEY = "snsToken";

  function readToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (_) { return ""; }
  }

  window.SharerAuth = {
    setSession(data) {
      const user = data && data.user && typeof data.user === "object" ? data.user : null;
      if (!user || !user.id) throw new Error("세션 정보가 없습니다.");
      const session = {
        id: user.id,
        nickname: user.nickname || user.id,
        profile_image: user.profile_image || null,
        isVerified: !!user.isVerified,
      };
      if (user.email) session.email = user.email;
      localStorage.setItem(USER_KEY, JSON.stringify(session));
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      else localStorage.removeItem(TOKEN_KEY);
    },
    clearSession() {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    },
    getToken: readToken,
  };

  // 기존 로그아웃은 snsUser 만 지운다. 토큰도 같이 지워서 로그아웃 후 요청이 이전 계정으로 나가지 않게 한다.
  const origRemove = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    origRemove.call(this, key);
    if (this === localStorage && key === USER_KEY) origRemove.call(this, TOKEN_KEY);
  };

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf(API_HOST) === 0) {
      const token = readToken();
      if (token) {
        const headers = new Headers(
          (init && init.headers) || (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined)
        );
        if (!headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
        if (typeof Request !== "undefined" && input instanceof Request && !(init && init.headers)) {
          input = new Request(input, { headers });
        } else {
          init = Object.assign({}, init, { headers });
        }
      }
    }
    return origFetch(input, init);
  };

  function dotInk(btn) {
    const read = (el) => {
      const m = getComputedStyle(el).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      const alpha = m[4] == null ? 1 : parseFloat(m[4]);
      if (alpha < 0.35) return null;
      return [+m[1], +m[2], +m[3]];
    };
    const rgb = read(btn) || read(document.body) || [0, 0, 0];
    const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    return lum > 150 ? "#111" : "#fff";
  }

  function ensureDotStyle() {
    if (document.getElementById("sharer-dot-style")) return;
    const style = document.createElement("style");
    style.id = "sharer-dot-style";
    style.textContent = "@keyframes sharerDot{0%,100%{opacity:.28}40%{opacity:1}}";
    document.head.appendChild(style);
  }

  function paintDots(btn, ink) {
    const dots = document.createElement("span");
    dots.className = "sharer-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;z-index:5;pointer-events:none;visibility:visible;";
    for (let n = 0; n < 3; n++) {
      const i = document.createElement("i");
      i.style.cssText = "display:block;width:6px;height:6px;border-radius:50%;background:" + ink + ";opacity:.28;animation:sharerDot 1.05s ease-in-out " + (n * 0.2) + "s infinite;";
      dots.appendChild(i);
    }
    btn.appendChild(dots);
    return dots;
  }

  window.SharerBusy = function (btn, on, done) {
    if (!btn) return;
    const restoreKids = () => {
      btn.querySelectorAll("[data-sharer-hide]").forEach((el) => {
        el.style.visibility = "";
        el.removeAttribute("data-sharer-hide");
      });
    };
    const wipe = () => {
      if (btn._sharerDoneTimer) { clearTimeout(btn._sharerDoneTimer); btn._sharerDoneTimer = 0; }
      btn.classList.remove("sharer-busy", "sharer-done");
      btn.disabled = false;
      btn.style.opacity = "";
      if (btn.dataset.sharerPos) { btn.style.position = ""; delete btn.dataset.sharerPos; }
      restoreKids();
      btn.querySelectorAll(":scope > .sharer-dots, :scope > .sharer-check").forEach((el) => el.remove());
    };
    if (on) {
      wipe();
      ensureDotStyle();
      if (getComputedStyle(btn).position === "static") {
        btn.dataset.sharerPos = "1";
        btn.style.position = "relative";
      }
      btn.style.setProperty("opacity", "1", "important");
      btn.classList.add("sharer-busy");
      btn.disabled = true;
      Array.from(btn.children).forEach((el) => {
        el.dataset.sharerHide = "1";
        el.style.visibility = "hidden";
      });
      paintDots(btn, dotInk(btn));
      return;
    }
    if (!done) { wipe(); return; }
    wipe();
  };
})();
