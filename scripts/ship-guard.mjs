// The deterministic safety gate for automatic shipping. It runs after the model has edited files
// and before anything is pushed, and it does not trust the model: it only looks at the staged diff.
//
// Verdicts:
//   ok      the change is inside the allowed area and small, so it may auto-merge if everything else is green
//   review  the change is allowed but unusual (large, touches a shared primitive, or contains risky
//           code), so a pull request is opened and a human merges it
//   reject  the change touches something the bot must never touch, or deletes or renames files, so
//           nothing is pushed at all
//
// Usage in the workflow:  git add -A && node scripts/ship-guard.mjs   (exit 0 ok, 10 review, 20 reject)

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const LIMITS = { maxFiles: 3, maxChangedLines: 60 };

// Where an automatic change may land: visible interface code only.
const ALLOWED = [
  /^src\/components\/(?!ui\/)[\w./-]+\.tsx?$/,
  /^src\/app\/(page|layout)\.tsx$/,
  /^src\/app\/globals\.css$/,
  /^src\/app\/demo\/[\w./-]+\.tsx?$/,
];

// Shared primitives affect every screen, so a change there needs a human.
const NEEDS_REVIEW = [/^src\/components\/ui\//];

// Added lines containing these get a human reviewer. A visible-interface fix never needs them.
const RISKY_CODE = [
  /process\.env/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /\beval\s*\(/,
  /new\s+Function/,
  /dangerouslySetInnerHTML/,
  /child_process/,
  /document\.cookie/,
  /localStorage|sessionStorage/,
  /window\.location\s*=/,
  /<script/i,
];

/** files: [{ path, status: "A"|"M"|"D"|"R", added: number, deleted: number, addedLines: string[] }] */
export function checkChange(files, limits = LIMITS) {
  const reject = [];
  const review = [];

  if (files.length === 0) return { verdict: "reject", reasons: ["The change is empty: no files were modified."] };

  for (const f of files) {
    if (f.path.includes("..") || f.path.startsWith("/") || f.path.includes("\\")) reject.push(`Path ${f.path} is not a plain path inside the project.`);
    else if (f.status === "D") reject.push(`Deleted ${f.path}. Deleting files is never automatic.`);
    else if (f.status === "R") reject.push(`Renamed ${f.path}. Renaming files is never automatic.`);
    else if (!ALLOWED.some((re) => re.test(f.path)) && !NEEDS_REVIEW.some((re) => re.test(f.path))) {
      reject.push(`Touched ${f.path}, which is outside the area automatic changes may edit.`);
    } else if (NEEDS_REVIEW.some((re) => re.test(f.path))) {
      review.push(`Touched ${f.path}, a shared building block used across the app.`);
    }
    for (const line of f.addedLines ?? []) {
      const hit = RISKY_CODE.find((re) => re.test(line));
      if (hit) {
        review.push(`Added code in ${f.path} that matches a risky pattern (${hit.source}).`);
        break;
      }
    }
  }

  if (files.length > limits.maxFiles) review.push(`Touched ${files.length} files, over the limit of ${limits.maxFiles}.`);
  const changed = files.reduce((n, f) => n + f.added + f.deleted, 0);
  if (changed > limits.maxChangedLines) review.push(`Changed ${changed} lines, over the limit of ${limits.maxChangedLines}.`);

  if (reject.length > 0) return { verdict: "reject", reasons: reject };
  if (review.length > 0) return { verdict: "review", reasons: review };
  return { verdict: "ok", reasons: [] };
}

/** Reads the staged diff from git. */
export function stagedFiles(cwd = process.cwd()) {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });

  const status = new Map();
  for (const line of git("diff", "--cached", "--name-status", "-M").split("\n").filter(Boolean)) {
    const [code, ...paths] = line.split("\t");
    status.set(paths[paths.length - 1], code[0]);
  }

  const files = [];
  for (const line of git("diff", "--cached", "--numstat", "-M").split("\n").filter(Boolean)) {
    const [added, deleted, rawPath] = line.split("\t");
    // A rename prints as "old => new" or "{a => b}/x"; the status map is keyed by the new path.
    const path = rawPath.includes("=>") ? [...status.keys()].find((p) => status.get(p) === "R") ?? rawPath : rawPath;
    const binary = added === "-";
    files.push({
      path,
      status: binary ? "R" : (status.get(path) ?? "M"),
      added: binary ? 0 : Number(added),
      deleted: binary ? 0 : Number(deleted),
      addedLines: [],
    });
  }

  const patch = git("diff", "--cached", "--unified=0", "--no-color", "-M");
  let current = null;
  for (const line of patch.split("\n")) {
    const header = /^diff --git a\/.+ b\/(.+)$/.exec(line);
    if (header) {
      current = files.find((f) => f.path === header[1]) ?? null;
    } else if (current && line.startsWith("+") && !line.startsWith("+++")) {
      current.addedLines.push(line.slice(1));
    }
  }
  return files;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = checkChange(stagedFiles());
  console.log(JSON.stringify(result));
  process.exit(result.verdict === "ok" ? 0 : result.verdict === "review" ? 10 : 20);
}
