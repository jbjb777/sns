import { readdirSync, readFileSync } from "node:fs";
import vm from "node:vm";

const files = readdirSync(".").filter((file) => file.endsWith(".html"));
let checked = 0;
let failures = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    const attributes = match[1];
    const code = match[2].trim();
    if (!code || /\bsrc\s*=/.test(attributes) || /type=["'](?:application\/ld\+json|application\/json)["']/.test(attributes)) return;
    try {
      new vm.Script(code, { filename: `${file}:inline-script-${index + 1}` });
      checked += 1;
    } catch (error) {
      failures += 1;
      console.error(error.message);
    }
  });
}

if (failures) process.exitCode = 1;
else console.log(`Inline JavaScript syntax audit passed (${checked} scripts)`);
