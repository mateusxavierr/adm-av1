#!/bin/sh
# Publica a edição Mateus (branch mateus) no Cloudflare: Worker com senha (cloudflare/worker.js) na frente dos arquivos.
# O nome do Worker (= endereço secreto) mora em .worker-nome, que só existe na branch mateus (repo privado).
# Sobe só index.html, css/ e js/ como site — nada de README, .git ou script.
# Senha: npx wrangler secret put SENHA --name "$(git show mateus:.worker-nome)"
set -e
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
git -C "$RAIZ" worktree add -q "$TMP/wt" mateus
NOME=$(cat "$TMP/wt/.worker-nome")
mkdir "$TMP/out" "$TMP/cwd"
cp -R "$TMP/wt/index.html" "$TMP/wt/css" "$TMP/wt/js" "$TMP/out/"
cp "$TMP/wt/cloudflare/worker.js" "$TMP/cwd/worker.js"
git -C "$RAIZ" worktree remove --force "$TMP/wt"
cat > "$TMP/cwd/wrangler.jsonc" <<JSON
{ "name": "$NOME", "main": "worker.js", "compatibility_date": "2026-10-01",
  "workers_dev": true, "preview_urls": false,
  "assets": { "directory": "../out", "binding": "ASSETS", "run_worker_first": true } }
JSON
cd "$TMP/cwd" && npx -y wrangler@4 deploy
rm -rf "$TMP"
