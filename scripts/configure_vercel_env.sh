#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Please install Node.js first."
  exit 1
fi

read -r -p "Google Client ID: " GOOGLE_CLIENT_ID
read -r -s -p "Google Client Secret: " GOOGLE_CLIENT_SECRET
echo
read -r -p "Database URL (optional, press Enter to skip): " DATABASE_URL

add_env() {
  local key="$1"
  local value="$2"
  local target="$3"
  if [ -z "$value" ]; then
    return 0
  fi
  npm_config_cache=/tmp/codex-npm-cache npx --yes vercel@latest env rm "$key" "$target" --yes >/dev/null 2>&1 || true
  printf "%s\n" "$value" | npm_config_cache=/tmp/codex-npm-cache npx --yes vercel@latest env add "$key" "$target"
}

for target in production preview development; do
  add_env GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID" "$target"
  add_env GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET" "$target"
  add_env DATABASE_URL "$DATABASE_URL" "$target"
done

npm_config_cache=/tmp/codex-npm-cache npx --yes vercel@latest --prod --yes

echo
echo "Done. Production URL:"
echo "https://knowledge-deck-web.vercel.app"
