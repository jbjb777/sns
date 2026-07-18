import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { execFileSync } from "node:child_process";

const commonHref = "assets/css/sharer.css";
const commonProperties = new Map([
  ["--bg", new Set(["#000", "#000000", "#fafafa"])],
  ["--bg2", new Set(["#111", "#111111", "#ffffff", "#fff"])],
  ["--bg3", new Set(["#1a1a1a", "#f0f0f0"])],
  ["--bg4", new Set(["#222", "#222222", "#e4e4e4"])],
  ["--border", new Set(["#1e1e1e", "#dbdbdb"])],
  ["--border2", new Set(["#2a2a2a", "#cccccc", "#ccc"])],
  ["--border3", new Set(["#333", "#333333", "#a3a3a3"])],
  ["--t1", new Set(["#fff", "#ffffff", "#000", "#000000"])],
  ["--t2", new Set(["#888", "#888888", "#737373"])],
  ["--t3", new Set(["#444", "#444444", "#a8a8a8"])],
  ["--pink", new Set(["#ff6b6b"])],
  ["--green", new Set(["#4ade80"])],
  ["--blue", new Set(["#3e3bf6"])],
  ["--r1", new Set(["10px"])],
  ["--r2", new Set(["14px"])],
  ["--r3", new Set(["20px"])],
  ["--r4", new Set(["28px"])],
]);

function removeSharedDeclarations(block) {
  return block.replace(
    /[ \t]*(--[\w-]+)\s*:\s*([^;]+);[ \t]*(?:\n|$)?/g,
    (full, property, rawValue) => {
      const values = commonProperties.get(property);
      const value = rawValue.trim().toLowerCase();
      return values?.has(value) ? "" : full;
    },
  );
}

function cleanTokenBlocks(html) {
  const selectors = [/^[ \t]*:root\s*\{([\s\S]*?)\}/gm, /^[ \t]*html\[data-theme=["']light["']\]\s*\{([\s\S]*?)\}/gm];
  for (const selector of selectors) {
    html = html.replace(selector, (full, body) => {
      const cleaned = removeSharedDeclarations(body).replace(/[ \t]+\n/g, "\n");
      const meaningful = cleaned.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (!meaningful) return "";
      return full.replace(body, cleaned);
    });
  }
  return html;
}

function cleanExactSharedRules(html) {
  return html
    .replace(/\s*\*,\s*\*::before,\s*\*::after\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*box-sizing:\s*border-box;\s*\}/g, "")
    .replace(/\s*\*\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*box-sizing:\s*border-box;\s*\}/g, "")
    .replace(/\s*html\s*\{\s*scroll-behavior:\s*smooth;\s*\}/g, "")
    .replace(/\s*#nprogress \.bar\s*\{\s*background:\s*var\(--t1\)\s*!important;\s*height:\s*2px\s*!important;\s*\}/g, "")
    .replace(/\s*#nprogress \.peg\s*\{\s*display:\s*none\s*!important;\s*\}/g, "")
    .replace(/\s*#nprogress \.spinner\s*\{\s*display:\s*none\s*!important;\s*\}/g, "");
}

for (const file of readdirSync(".").filter((name) => extname(name) === ".html")) {
  const fromHead = process.argv.includes("--from-head");
  let html = fromHead
    ? execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" })
    : readFileSync(file, "utf8");
  if (!html.includes("<style")) continue;
  if (!html.includes(`href="${commonHref}"`)) {
    html = html.replace(/<style(\s[^>]*)?>/, `<link rel="stylesheet" href="${commonHref}">\n  <style$1>`);
  }
  html = cleanTokenBlocks(html);
  html = cleanExactSharedRules(html);
  html = html.replace(/<style([^>]*)>\s*\n{3,}/, "<style$1>\n");
  writeFileSync(file, html);
  console.log(`updated ${file}`);
}
