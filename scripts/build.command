#!/bin/bash
# Double-click: build and open the fictional demo. Private builds use --config.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
if command -v uv >/dev/null 2>&1; then
  uv run build.py --demo && open dist/demo/overworld.html
elif python3 -c 'import yaml' >/dev/null 2>&1; then
  python3 build.py --demo && open dist/demo/overworld.html
else
  echo 'Install uv (https://docs.astral.sh/uv/), or install PyYAML for python3, then reopen this file.'
  exit 1
fi
