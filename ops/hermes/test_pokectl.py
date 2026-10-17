"""Offline checks for pokectl: no network, no Telegram, no Hermes. Run with:

    python3 ops/hermes/test_pokectl.py

These exist because a sync pass once went missing without any error: the code was written, tested
on its own, and never actually called by the sync.
"""

import argparse
import importlib.machinery
import importlib.util
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
loader = importlib.machinery.SourceFileLoader("pokectl", os.path.join(HERE, "pokectl"))
spec = importlib.util.spec_from_loader("pokectl", loader)
m = importlib.util.module_from_spec(spec)
loader.exec_module(m)

passed = failed = 0


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print("PASS", label)
    else:
        failed += 1
        print("FAIL", label, "->", detail)


# --- the sync runs every pass, in order ------------------------------------------------------
PASSES = [
    "queue_new_tickets", "report_finished", "queue_pm_tickets", "queue_engineering",
    "report_recommendations", "pickup_decisions", "ship_builds", "report_ship", "alert_blocked",
]
original = {name: getattr(m, name) for name in PASSES}
called = []
for name in PASSES:
    assert hasattr(m, name), f"missing function {name}"
    setattr(m, name, (lambda n: (lambda *a, **k: called.append(n)))(name))
m.cmd_sync(argparse.Namespace(dry_run=True, limit=5))
check("every pass is wired into the sync, in order", called == PASSES, called)
for name, fn in original.items():
    setattr(m, name, fn)

# --- ship messages ----------------------------------------------------------------------------
item = {
    "item_number": 21, "title": "Make the Feedback button easier to tap on phones",
    "change_summary": "Because someone found the Feedback button hard to tap on a phone, we would make it taller.",
    "pr_url": "https://github.com/x/y/pull/9", "ship_note": "Some note.",
}
live = m.compose_ship_message({**item, "ship_state": "live"})
check("live message names the item and says to refresh", "B-021 is live in production" in live and "Refresh the site" in live, live)
check("live message links the change and says how to undo", "pull/9" in live and "Instant Rollback" in live, live)
review = m.compose_ship_message({**item, "ship_state": "needs_review", "ship_note": "Touched 4 files."})
check("review message links the pull request and says what to do", "needs your review" in review and "pull/9" in review and "Merge it" in review, review)
failed_msg = m.compose_ship_message({**item, "ship_state": "failed", "ship_note": "The build did not pass."})
check("failure message says nothing changed", "could not be built" in failed_msg and "Nothing was changed on the live site" in failed_msg, failed_msg)
for label, text in (("live", live), ("review", review), ("failed", failed_msg)):
    check(f"{label} message has no em or en dash", not re.search("[–—]", text), text)

# --- the approval message depends on whether shipping is on ----------------------------------
approved = {**item, "decision": "yes", "status": "approved"}
off = m.compose_decision_message(approved, ship_on=False)
on = m.compose_decision_message(approved, ship_on=True)
check("approval says manual when shipping is off", "manual for now" in off, off)
check("approval says building when shipping is on", "Building it now" in on and "manual" not in on, on)
check("other decisions are unchanged by the switch", m.compose_decision_message({**item, "decision": "no", "status": "rejected"}, True).startswith("Rejected"))

# --- the switch needs both the flag and the token ---------------------------------------------
for key in ("POKECTL_SHIP", "GITHUB_DISPATCH_TOKEN"):
    os.environ.pop(key, None)
check("shipping is off by default", not m.ship_enabled())
os.environ["POKECTL_SHIP"] = "on"
check("the flag alone is not enough", not m.ship_enabled())
os.environ["GITHUB_DISPATCH_TOKEN"] = "x"
check("flag plus token turns it on", m.ship_enabled())
os.environ["POKECTL_SHIP"] = "off"
check("the flag set to off turns it off", not m.ship_enabled())

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
