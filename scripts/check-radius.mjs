import { execSync } from "node:child_process";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

function getFilesRecursive(dir, extensions = [".ts", ".tsx", ".js", ".jsx", ".css"]) {
  const files = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
      files.push(...getFilesRecursive(fullPath, extensions));
    } else if (stat.isFile() && extensions.some((ext) => entry.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function grepInFile(filePath, pattern) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const matches = [];

  const regex = new RegExp(pattern);

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      matches.push(`${filePath}:${i + 1}: ${lines[i].trim()}`);
    }
  }

  return matches;
}

const pattern = "rounded-(sm|md|lg|xl|2xl|3xl|4xl)|rounded-\\[";
const srcDir = join(process.cwd(), "src");
const files = getFilesRecursive(srcDir);
const hits = [];

for (const file of files) {
  const fileHits = grepInFile(file, pattern);
  if (fileHits.length > 0) {
    hits.push(...fileHits);
  }
}

if (hits.length > 0) {
  console.error(
    "Lyra preset b3lCJ1rU0 defines Radius: None — only rounded-none/rounded-full are allowed:\n" +
      hits.join("\n"),
  );
  process.exit(1);
}