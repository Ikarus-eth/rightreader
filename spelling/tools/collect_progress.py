#!/usr/bin/env python3
"""Copy encrypted progress files from the ntfy.sh channel to the progress-data branch checkout.

Usage: collect_progress.py <topic> <data-dir>
Keeps the newest file per device in devices/<device>.enc.json and the newest overall in
latest.enc.json. Files stay encrypted; this script cannot read them. Remembers the last
message it saw in state.json so each run only looks at new messages.
"""
import json, re, sys, urllib.request
from pathlib import Path

topic, data = sys.argv[1], Path(sys.argv[2])
(data / "devices").mkdir(parents=True, exist_ok=True)
state_path = data / "state.json"
state = json.loads(state_path.read_text()) if state_path.exists() else {}
since = state.get("since") or "12h"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "spelling-progress-collector"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

lines = get(f"https://ntfy.sh/{topic}/json?poll=1&since={since}").decode().splitlines()
msgs = [json.loads(l) for l in lines if l.strip()]
msgs = [m for m in msgs if m.get("event") == "message"]
changed = 0
for m in msgs:
    att = m.get("attachment") or {}
    if not att.get("url"):
        continue
    try:
        env = json.loads(get(att["url"]))
    except Exception as e:
        print("skip", m.get("id"), "unreadable:", e); continue
    if env.get("format") != "spelling-progress-v1" or not all(k in env for k in ("epk", "iv", "ct", "savedAt", "device")):
        print("skip", m.get("id"), "not a progress file"); continue
    dev = re.sub(r"[^a-z0-9-]", "", str(env["device"]).lower())[:40] or "unknown"
    dest = data / "devices" / f"{dev}.enc.json"
    old = json.loads(dest.read_text()) if dest.exists() else None
    if old and old.get("savedAt", "") >= env["savedAt"]:
        continue
    dest.write_text(json.dumps(env, indent=1))
    changed += 1
    print("updated", dev, env["savedAt"])
if msgs:
    state["since"] = msgs[-1]["id"]
newest = max((json.loads(p.read_text()) for p in (data / "devices").glob("*.enc.json")), key=lambda e: e["savedAt"], default=None)
if newest:
    (data / "latest.enc.json").write_text(json.dumps(newest, indent=1))
state_path.write_text(json.dumps(state, indent=1))
print(f"{len(msgs)} new messages, {changed} device files updated")
