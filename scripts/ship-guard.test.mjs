import test from "node:test";
import assert from "node:assert/strict";
import { checkChange } from "./ship-guard.mjs";

const file = (path, over = {}) => ({ path, status: "M", added: 2, deleted: 1, addedLines: ["<p>hello</p>"], ...over });

test("a small change in a component is ok", () => {
  assert.equal(checkChange([file("src/components/poke-shell.tsx")]).verdict, "ok");
});
test("home page, layout, globals, and demo are allowed", () => {
  for (const p of ["src/app/page.tsx", "src/app/layout.tsx", "src/app/globals.css", "src/app/demo/page.tsx"]) {
    assert.equal(checkChange([file(p)]).verdict, "ok", p);
  }
});
test("forbidden places are rejected outright", () => {
  for (const p of [
    "package.json", "package-lock.json", ".github/workflows/ship.yml", "supabase/migrations/0011.sql", "ops/hermes/pokectl",
    "scripts/ship-guard.mjs", "src/app/api/agent/tickets/route.ts", "src/app/decide/[token]/page.tsx", "src/lib/backlog.ts",
    "next.config.ts", ".env.local", "docs/agents/README.md", "src/components/../lib/x.ts",
  ]) {
    assert.equal(checkChange([file(p)]).verdict, "reject", p);
  }
});
test("deleting or renaming a file is rejected", () => {
  assert.equal(checkChange([file("src/components/a.tsx", { status: "D" })]).verdict, "reject");
  assert.equal(checkChange([file("src/components/a.tsx", { status: "R" })]).verdict, "reject");
});
test("an empty change is rejected", () => {
  assert.equal(checkChange([]).verdict, "reject");
});
test("a rejected file wins over everything else", () => {
  const r = checkChange([file("src/components/a.tsx"), file("package.json")]);
  assert.equal(r.verdict, "reject");
});
test("too many files or lines goes to review, not reject", () => {
  const four = ["a", "b", "c", "d"].map((n) => file(`src/components/${n}.tsx`));
  assert.equal(checkChange(four).verdict, "review");
  assert.equal(checkChange([file("src/components/a.tsx", { added: 50, deleted: 20 })]).verdict, "review");
  assert.equal(checkChange([file("src/components/a.tsx", { added: 40, deleted: 20 })]).verdict, "ok");
});
test("a shared primitive goes to review", () => {
  assert.equal(checkChange([file("src/components/ui/button.tsx")]).verdict, "review");
});
test("risky added code goes to review", () => {
  for (const line of ['const k = process.env.SECRET;', 'fetch("https://evil.example")', "eval(code)", "el.innerHTML; dangerouslySetInnerHTML={{__html: x}}", "document.cookie", "<script src='x'>"]) {
    assert.equal(checkChange([file("src/components/a.tsx", { addedLines: [line] })]).verdict, "review", line);
  }
});
test("ordinary markup and class changes are not flagged", () => {
  const lines = ['<Dialog.Trigger className="min-h-11 px-2.5">', "  Demo: canned data, no API calls", "{sending ? \"Sending…\" : \"Send it\"}"];
  assert.equal(checkChange([file("src/components/a.tsx", { addedLines: lines })]).verdict, "ok");
});
