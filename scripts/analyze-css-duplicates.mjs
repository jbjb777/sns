import { readdirSync, readFileSync } from "node:fs";

const files = readdirSync(".").filter((file) => file.endsWith(".html"));
const rules = new Map();

function normalize(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([:;,])\s*/g, "$1").trim();
}

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]);
  for (const css of styles) {
    for (const match of css.matchAll(/([^{}@]+)\{([^{}]+)\}/g)) {
      const selector = normalize(match[1]);
      const declarations = normalize(match[2]);
      if (!selector || !declarations || selector.includes("from ") || selector.includes("to ")) continue;
      const key = `${selector}|||${declarations}`;
      if (!rules.has(key)) rules.set(key, new Set());
      rules.get(key).add(file);
    }
  }
}

const duplicates = [...rules.entries()]
  .filter(([, owners]) => owners.size >= 3)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));

for (const [rule, owners] of duplicates) {
  const [selector, declarations] = rule.split("|||");
  console.log(`\n[${owners.size}] ${selector}\n  ${declarations}\n  ${[...owners].join(", ")}`);
}
