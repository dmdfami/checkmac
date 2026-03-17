#!/bin/bash
# CheckMac — Kiểm tra chất lượng MacBook cũ
# Chạy: curl -sL checkmac.run | bash (hoặc URL đầy đủ bên dưới)
# curl -sL https://raw.githubusercontent.com/dmdfami/checkmac/main/run.sh | bash

set -e

echo ""
echo "🖥️  CheckMac — Kiểm tra chất lượng MacBook"
echo "============================================"
echo ""

# 1. Xcode Command Line Tools (cần cho git, curl đã có sẵn trên macOS)
if ! command -v git &>/dev/null; then
  echo "📦 Đang cài Git (Xcode CLT)..."
  xcode-select --install 2>/dev/null || true
  # Wait for installation
  until command -v git &>/dev/null; do
    sleep 3
  done
  echo "✅ Git đã cài xong"
fi

# 2. Node.js — cài qua fnm (nhanh nhất, không cần brew)
if ! command -v node &>/dev/null; then
  echo "📦 Chưa có Node.js — đang cài (khoảng 30 giây)..."

  # Cài fnm (Fast Node Manager)
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell 2>/dev/null

  # Setup PATH cho cả bash và zsh
  export PATH="$HOME/.local/share/fnm:$HOME/.fnm:$PATH"
  eval "$(
    [ -f "$HOME/.local/share/fnm/fnm" ] && "$HOME/.local/share/fnm/fnm" env 2>/dev/null ||
    [ -f "$HOME/.fnm/fnm" ] && "$HOME/.fnm/fnm" env 2>/dev/null ||
    true
  )"

  # Cài Node LTS
  fnm install --lts 2>/dev/null
  eval "$(
    [ -f "$HOME/.local/share/fnm/fnm" ] && "$HOME/.local/share/fnm/fnm" env 2>/dev/null ||
    [ -f "$HOME/.fnm/fnm" ] && "$HOME/.fnm/fnm" env 2>/dev/null ||
    true
  )"

  if ! command -v node &>/dev/null; then
    echo "❌ Không cài được Node.js tự động."
    echo "   Hãy cài thủ công: https://nodejs.org"
    exit 1
  fi

  echo "✅ Node.js $(node -v) đã cài xong"
fi

echo "🔍 Đang tải và chạy kiểm tra..."
echo ""

# 3. Clone repo và chạy
CMTMP=$(mktemp -d)
trap "rm -rf $CMTMP" EXIT
git clone --depth 1 --quiet https://github.com/dmdfami/checkmac.git "$CMTMP/checkmac"
node "$CMTMP/checkmac/bin/checkmac.js"
