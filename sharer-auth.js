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
})();
