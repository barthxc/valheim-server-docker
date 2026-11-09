#!/usr/bin/env bash
# First-time setup: creates .env and valheim.env from the examples, with random passwords,
# the right PROJECT_DIR and your LAN IP. Never overwrites files that already exist.
# Works on Linux, macOS, WSL and Git Bash (Windows). On Windows PowerShell use setup.ps1.
set -euo pipefail
cd "$(dirname "$0")"

rand() { if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"; else LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c $(($1 * 2)); fi; }
# set_var KEY VALUE FILE  -> replaces the line KEY=...
set_var() { local tmp; tmp="$(mktemp)"; awk -v k="$1" -v v="$2" 'BEGIN{FS="="} $1==k{print k"="v; next} {print}' "$3" > "$tmp" && cat "$tmp" > "$3" && rm -f "$tmp"; }

os="$(uname -s)"

# Path of this folder as the Docker daemon sees it
if [[ "$os" =~ MINGW|MSYS|CYGWIN ]]; then
  win="$(pwd -W)"                                    # Git Bash: C:/Users/...
  drive="$(printf '%s' "${win:0:1}" | tr 'A-Z' 'a-z')"
  project_dir="/run/desktop/mnt/host/${drive}${win:2}"
else
  here="$(pwd)"
  case "$here" in
    /mnt/[a-z]/*) project_dir="/run/desktop/mnt/host/${here#/mnt/}" ;;  # WSL on a Windows drive (Docker Desktop)
    *) project_dir="$here" ;;                                           # Linux / macOS / WSL home
  esac
fi

# LAN IP (best effort; you can edit LOCAL_ADDRESS later)
ip=""
case "$os" in
  Darwin) ip="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)" ;;
  MINGW*|MSYS*|CYGWIN*)
    ip="$(ipconfig 2>/dev/null | tr -d '\r' | grep -a 'IPv4' | sed -E 's/.*: *([0-9.]+).*/\1/' \
          | grep -v -E '^(127\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)' | head -n1 || true)" ;;
  *) ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)" ;;
esac

if [ -f .env ]; then
  echo "- .env already exists, leaving it untouched"
else
  cp .env.example .env
  panel_pass="$(rand 6)"
  set_var PROJECT_DIR "$project_dir" .env
  set_var RCON_PASSWORD "$(rand 16)" .env
  set_var PANEL_PASSWORD "$panel_pass" .env
  if [ -n "$ip" ]; then set_var LOCAL_ADDRESS "$ip:2456" .env; fi
  echo "- Created .env  (PROJECT_DIR=$project_dir, LOCAL_ADDRESS=${ip:-?}:2456)"
  echo "  Panel password: $panel_pass   (change it in .env if you like)"
fi

if [ -f valheim.env ]; then
  echo "- valheim.env already exists, leaving it untouched"
else
  cp valheim.env.example valheim.env
  game_pass="$(rand 4)"
  set_var SERVER_PASS "$game_pass" valheim.env
  echo "- Created valheim.env  (game password: $game_pass)"
fi

mkdir -p data/config data/opt
port="$(grep -E '^PANEL_PORT=' .env | cut -d= -f2 | tr -d '\r')"
echo
echo "Next steps:"
echo "  1. Review .env and valheim.env (server name, world, time zone...)"
echo "  2. docker compose up -d --build"
echo "  3. Open http://localhost:${port:-8082}"
