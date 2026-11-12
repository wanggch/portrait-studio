#!/bin/zsh
set -e
cd "${0:A:h}"

# Prefer an installed LTS runtime without changing the system's Node installation.
for node_bin in "$HOME"/.nvm/versions/node/v22*/bin(N) "$HOME"/.nvm/versions/node/v24*/bin(N) "$HOME"/.nvm/versions/node/v20*/bin(N); do
  if "$node_bin/node" --version >/dev/null 2>&1; then
    export PATH="$node_bin:$PATH"
    break
  fi
done

if ! node --version >/dev/null 2>&1; then
  print '未找到可用的 Node.js。请安装 Node.js 22 或 24 LTS 后重试。'
  read '?按回车关闭…'
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm ci
fi

print '人像工坊启动中，请在浏览器打开：http://127.0.0.1:5173'
print '请保持此终端窗口打开；按 Control+C 停止。'
npm run dev
