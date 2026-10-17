// Submits a set of realistic feedback tickets so the Support bot's work can be
// read in one sitting. Seed tickets are stored with app_mode "demo" so they are
// easy to tell apart from real feedback and to delete again.
//
//   node --env-file=.env.local scripts/seed-feedback.mjs            submit the set
//   node --env-file=.env.local scripts/seed-feedback.mjs --dry-run  list what would be sent
//   node --env-file=.env.local scripts/seed-feedback.mjs --delete   remove every seed ticket
//   node --env-file=.env.local scripts/seed-feedback.mjs --reset    delete, then submit again
//   add --email you@example.com to attach an address to every ticket (real replies go there)
//   add --only 3,7,14 to submit just those entries (1-based)
//
// Submitting costs the Support bot about 2 cents per ticket. Deleting needs the
// Supabase keys in .env.local; submitting only needs the production URL.

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const BASE = process.env.POKE_URL ?? "https://usability-script-improver.vercel.app";
const all = JSON.parse(fs.readFileSync(new URL("./seed-tickets.json", import.meta.url), "utf8"));
const only = option("--only")?.split(",").map((n) => Number(n.trim()));
const tickets = all.filter((_, i) => !only || only.includes(i + 1));
const email = option("--email");

async function deleteSeeds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Deleting needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("feedback").delete().eq("app_mode", "demo").select("ticket_number");
  if (error) throw new Error(`Delete failed: ${error.message}`);
  console.log(`deleted ${data.length} seed ticket(s)`);
}

async function submit() {
  console.log(`submitting ${tickets.length} ticket(s) to ${BASE}${email ? ` with email ${email}` : ""}\n`);
  for (const [i, t] of tickets.entries()) {
    if (flag("--dry-run")) {
      console.log(`${String(i + 1).padStart(2)}. [${t.kind}] ${t.label}: ${t.message.slice(0, 70)}`);
      continue;
    }
    const res = await fetch(`${BASE}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: t.kind,
        message: t.message,
        pageUrl: t.pageUrl ?? "",
        viewport: t.viewport ?? "",
        email: email ?? "",
        appMode: "demo",
      }),
    });
    const data = await res.json().catch(() => ({}));
    const id = data.ticketNumber ? `POKE-${String(data.ticketNumber).padStart(4, "0")}` : "(failed)";
    console.log(`${String(i + 1).padStart(2)}. ${id}  ${t.label}${res.ok ? "" : `  HTTP ${res.status} ${data.error ?? ""}`}`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

if (flag("--delete") || flag("--reset")) await deleteSeeds();
if (!flag("--delete")) await submit();
