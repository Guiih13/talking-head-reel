#!/usr/bin/env bash
# Deliver a finished reel and tidy the inbox.
#
#   finish.sh <source.MOV> <reel.mp4> [name]
#
# - copies the reel to  $REELS_DIR/finished/<name>-reel.mp4
# - MOVES the original recording out of the inbox into
#   $REELS_DIR/archive/<YYYY-MM-DD>-<name>/  (nothing is ever deleted, and a
#   later re-cut ("swap the closing take") reads the original from there)
# - refuses to overwrite anything that already exists
#
# REELS_DIR defaults to ~/Reels (inbox/, finished/, archive/ live inside it).
set -euo pipefail
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then echo "usage: finish.sh <source.MOV> <reel.mp4> [name]" >&2; exit 2; fi
src="$1"; reel="$2"
root="${REELS_DIR:-$HOME/Reels}"
name="${3:-$(basename "${src%.*}")}"
[ -f "$src" ] || { echo "source not found: $src" >&2; exit 1; }
[ -s "$reel" ] || { echo "reel missing or empty: $reel" >&2; exit 1; }
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$reel" | grep -q . \
  || { echo "reel has no audio stream; not archiving the original" >&2; exit 1; }

fin="$root/finished"; arc="$root/archive/$(date +%F)-$name"
mkdir -p "$fin" "$arc"
dest="$fin/$name-reel.mp4"
[ ! -e "$dest" ] || { echo "already exists: $dest (pass a different name)" >&2; exit 1; }
[ ! -e "$arc/$(basename "$src")" ] || { echo "already archived: $arc/$(basename "$src")" >&2; exit 1; }

cp "$reel" "$dest"
mv "$src" "$arc/"
echo "reel     -> $dest"
echo "original -> $arc/$(basename "$src")"
