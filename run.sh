#!/bin/bash
# CheckMac — Kiểm tra chất lượng MacBook cũ
# Chạy: curl -fsSL https://raw.githubusercontent.com/dmdfami/checkmac/main/run.sh | bash

set -e

echo "🖥️  CheckMac — Đang chuẩn bị..."

# Check if node exists
if ! command -v node &>/dev/null; then
  echo "📦 Chưa có Node.js, đang cài qua fnm..."
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
  export PATH="$HOME/.local/share/fnm:$HOME/.fnm:$PATH"
  eval "$(fnm env 2>/dev/null || true)"
  fnm install --lts
  eval "$(fnm env 2>/dev/null || true)"
  echo "✅ Node.js đã cài xong: $(node -v)"
fi

# Clone and run
TMPDIR=$(mktemp -d)
git clone --depth 1 https://github.com/dmdfami/checkmac.git "$TMPDIR/checkmac" 2>/dev/null
node "$TMPDIR/checkmac/bin/checkmac.js"
rm -rf "$TMPDIR"
