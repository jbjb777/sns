# Sharer

대한민국의 **엄정빈**이라는 중2가 만든 **소셜 네트워킹 플렛폼**

## 링크


<a href="https://sharer.r-e.kr">
  <img src="https://sharer.r-e.kr/logo.svg" width="50" alt="Sharer">
</a>

**Sharer**


> [개인정보 처리방침](https://sharer.r-e.kr/privacy) | [이용 약관](https://sharer.r-e.kr/policy)

## 개발 안내

- 브라우저용 프로젝트 문서: [DOC/index.html](DOC/index.html)
- 제품 요구사항과 작업 순서: [PRD](DOC/prd.html), [PLAN](DOC/plan.html)
- 현재 구조와 이슈: [아키텍처](DOC/architecture.html), [기술 이슈](DOC/issues.html)
- 보안 및 기여 규칙: [PR 보안 가이드](DOC/security.html), [CONTRIBUTING.md](CONTRIBUTING.md)
- Cloudflare Worker: [cloudflare/sharer-api](cloudflare/sharer-api)

## 프런트엔드 스타일

- 공통 색상 토큰, reset, 폼 기본값, focus와 NProgress: [`assets/css/sharer.css`](assets/css/sharer.css)
- 공통 앱 UI(사이드바, 메인 래퍼, 검색 패널, 뒤로가기 버튼, 스켈레톤, 모바일 상단 바, 프로필 시트 동작): 같은 공통 CSS
- 페이지별 고유 레이아웃과 애니메이션: 각 HTML의 인라인 `<style>`
- 새 페이지는 공통 CSS를 먼저 불러온 뒤 페이지 전용 CSS를 작성한다.

```html
<link rel="stylesheet" href="assets/css/sharer.css?v=20260719.2">
```

```bash
node scripts/refactor-common-css.mjs
node scripts/audit-html.mjs
```

현재 기준선에는 인증/인가 관련 P0 이슈가 있으므로 `DOC/issues.html`을 확인하고 신규 기능이나 공개 배포 범위를 확대하지 않는다.
