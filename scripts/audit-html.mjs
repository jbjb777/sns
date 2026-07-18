import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const files = readdirSync(".").filter((name) => extname(name) === ".html");
let problems = 0;

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => !id.includes("${") && ids.indexOf(id) !== index))];
  const references = [...html.matchAll(/\s(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  const missing = references.filter((reference) => {
    if (!reference || reference.includes("${") || /^(?:https?:|\/\/|#|data:|mailto:|javascript:|\/cdn-cgi\/)/.test(reference)) return false;
    const cleanPath = decodeURIComponent(reference.split(/[?#]/)[0]).replace(/^\//, "");
    return cleanPath && !existsSync(resolve(cleanPath));
  });
  if (duplicates.length || missing.length) {
    problems += duplicates.length + missing.length;
    console.log(file, { duplicateIds: duplicates, missingLocalFiles: [...new Set(missing)] });
  }
}

if (problems) process.exitCode = 1;
else console.log(`HTML audit passed (${files.length} files)`);
