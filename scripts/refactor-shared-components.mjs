import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const commonCssPath = "assets/css/sharer.css";
const htmlFiles = readdirSync(".").filter((file) => file.endsWith(".html"));

const sharedSelectors = new Set([
  ".sidebar-container",
  ".sidebar-container iframe",
  ".main-wrapper",
  ".search-panel",
  ".search-panel.open",
  ".search-panel-header",
  ".search-panel-header h2",
  ".search-close-btn",
  ".search-close-btn:hover",
  ".search-panel iframe",
  'html[data-theme="light"] .search-panel',
  ".back-btn",
  ".back-btn:hover",
  ".back-btn:active",
  ".header-title",
  ".skeleton",
  ".mobile-topbar-iframe-wrap",
  ".mobile-topbar-iframe-wrap iframe",
  ".sharer-profile-sheet-host[hidden]",
  ".sharer-profile-sheet-host .sps-backdrop",
  ".sharer-profile-sheet-host.sps-host-open .sps-backdrop",
  ".sharer-profile-sheet-host.sps-host-open .sps-panel",
  ".sharer-profile-sheet-host .sps-panel.sps-panel-expanded",
  ".sharer-profile-sheet-host .sps-panel.sps-panel-dragging",
  ".sharer-profile-sheet-host .sps-drag-area",
  ".sharer-profile-sheet-host .sps-drag-area:active",
  ".sharer-profile-sheet-host .sps-av",
  ".sharer-profile-sheet-host .sps-av img",
  ".sharer-profile-sheet-host .sps-logout",
]);

function normalize(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([:;,])\s*/g, "$1")
    .trim();
}

function collectSharedRuleKeys(css) {
  const keys = new Set();
  for (const match of css.matchAll(/([^{}@]+)\{([^{}]+)\}/g)) {
    const selector = normalize(match[1]);
    const declarations = normalize(match[2]);
    if (sharedSelectors.has(selector)) keys.add(`${selector}|||${declarations}`);
  }
  return keys;
}

const sharedRuleKeys = collectSharedRuleKeys(readFileSync(commonCssPath, "utf8"));
let totalRemoved = 0;

for (const file of htmlFiles) {
  const original = readFileSync(file, "utf8");
  let fileRemoved = 0;

  const updated = original.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (styleTag, attributes, css) => {
    const matches = [...css.matchAll(/([^{}@]+)\{([^{}]+)\}/g)];
    const removals = [];

    for (const match of matches) {
      const selector = normalize(match[1]);
      const declarations = normalize(match[2]);
      if (sharedRuleKeys.has(`${selector}|||${declarations}`)) {
        removals.push([match.index, match.index + match[0].length]);
      }
    }

    let nextCss = css;
    for (const [start, end] of removals.reverse()) {
      nextCss = nextCss.slice(0, start) + nextCss.slice(end);
    }
    fileRemoved += removals.length;
    return `<style${attributes}>${nextCss}</style>`;
  });

  if (updated !== original) {
    writeFileSync(file, updated);
    console.log(`${file}: 공통 규칙 ${fileRemoved}개 제거`);
    totalRemoved += fileRemoved;
  }
}

console.log(`완료: HTML 중복 공통 규칙 ${totalRemoved}개를 ${commonCssPath}로 통합했습니다.`);
