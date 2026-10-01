#!/bin/sh
# Publica a edição Mateus (branch mateus) no Cloudflare: Worker de assets estáticos "adm-av1-mateus".
# Sobe só index.html, css/ e js/ — nada de README, .git ou script.
set -e
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
git -C "$RAIZ" worktree add -q "$TMP/wt" mateus
mkdir "$TMP/out" "$TMP/cwd"
cp -R "$TMP/wt/index.html" "$TMP/wt/css" "$TMP/wt/js" "$TMP/out/"
git -C "$RAIZ" worktree remove --force "$TMP/wt"
cd "$TMP/cwd" && npx -y wrangler@4 deploy --assets "$TMP/out" --name adm-av1-mateus --compatibility-date 2026-10-01
rm -rf "$TMP"
