#!/bin/bash
# 编译 static/widget.jsx -> static/widget.js（构建期一次，产物入库）。
# 用法：./compile-widget.sh
# 依赖：node + @babel/standalone（若缺，自动 npm install --no-save 到临时目录）。
set -e
cd "$(dirname "$0")"

BABEL=""
for p in \
  "$(pwd)/node_modules/@babel/standalone/babel.js" \
  "/mnt/d/Workplace/node_modules/@babel/standalone/babel.js" \
  "$HOME/node_modules/@babel/standalone/babel.js"; do
  if [ -f "$p" ]; then BABEL="$p"; break; fi
done

if [ -z "$BABEL" ]; then
  echo "[compile-widget] @babel/standalone not found, installing to $(pwd)/node_modules ..."
  npm install --no-save --prefix "$(pwd)" @babel/standalone@7.28.5 >/dev/null 2>&1 || true
  BABEL="$(pwd)/node_modules/@babel/standalone/babel.js"
fi

if [ ! -f "$BABEL" ]; then
  echo "[compile-widget] ERROR: @babel/standalone missing at $BABEL" >&2
  exit 1
fi

node -e "
const babel = require(process.argv[1]);
const fs = require('fs');
const src = fs.readFileSync('static/widget.jsx', 'utf8');
const out = babel.transform(src, { presets: ['react'], filename: 'widget.jsx' }).code;
fs.writeFileSync('static/widget.js', out);
console.log('[compile-widget] OK static/widget.js bytes:', out.length);
" "$BABEL"
