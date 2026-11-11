#!/bin/zsh
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node scripts/serve.mjs --open
elif command -v python3 >/dev/null 2>&1; then
  open http://127.0.0.1:4173
  exec python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
else
  print '运行需要 Node.js 20.19+ 或 Python 3。安装后重新打开此文件。'
  read -r '?按回车关闭。'
fi
