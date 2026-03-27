#!/bin/bash
echo "🔄 Quick Rebuild for Development..."
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_DIR="$ROOT_DIR/electron"

cd "$ELECTRON_DIR"

echo "Step 1: Building TypeScript..."
npm run build 2>&1 | grep -E "error|Build|done" || echo "✓ TypeScript compiled"

echo ""
echo "Step 2: Packaging App (this may take 30-60s)..."
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder build --mac --dir 2>&1 | tail -5

echo ""
echo "Step 3: Copying logo to dist-electron..."
cp "$ELECTRON_DIR/logo.svg" "$ELECTRON_DIR/dist-electron/logo.svg" 2>/dev/null || true
echo "✓ Logo copied"

echo ""
echo "✅ Done! Starting app..."
open "$ELECTRON_DIR/dist-electron/mac-arm64/CoCo.app"

echo ""
echo "💡 Tips:"
echo "  - 修改代码后重新运行 ./rebuild.sh"
