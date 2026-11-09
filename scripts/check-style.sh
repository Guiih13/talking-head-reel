#!/usr/bin/env bash
# Check that a reel's timeline respects the house style before rendering.
#
#   check-style.sh [Reel.tsx=src/talk/Reel.tsx]
#
# Run from the Remotion project root. Fails (exit 1) on:
#   - any emoji character in the timeline (STYLE.md: no emoji anywhere)
# Warns on:
#   - overlay components defined inside the timeline file; they bypass the
#     style gates in style.tsx, so a card like that must be restyled by hand
#     (no emoji, no dark rounded boxes) or moved into reel-overlays.tsx
set -euo pipefail
f="${1:-src/talk/Reel.tsx}"
[ -f "$f" ] || { echo "not found: $f" >&2; exit 2; }
python3 -I - "$f" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
emoji = re.compile("[\U0001F300-\U0001FAFF☀-➿⭐❤️]")
bad = 0
for n, line in enumerate(src.split("\n"), 1):
    if emoji.search(line):
        bad += 1
        print(f"EMOJI  {sys.argv[1]}:{n}: {line.strip()[:90]}")
allowed = {"At"}
for m in re.finditer(r"^const (\w+): React\.FC", src, re.M):
    if m.group(1) not in allowed:
        print(f"WARN   {sys.argv[1]}: local component {m.group(1)} is not covered by the style gates; check it by eye")
print("style check:", "FAILED" if bad else "ok")
sys.exit(1 if bad else 0)
PY
