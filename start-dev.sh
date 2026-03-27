#!/bin/bash

# CoCo 开发环境启动脚本
# 同时启动：后端、前端、TypeScript监视、Electron

echo "🚀 Starting CoCo Development Environment..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping all services...${NC}"
    pkill -f "python main.py" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "tsc --watch" 2>/dev/null || true
    pkill -f "electron/dist/main.js" 2>/dev/null || true
    pkill -f "/electron/cli.js dist/main.js" 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# 清理之前的进程
echo -e "${YELLOW}🧹 Cleaning up previous processes...${NC}"
pkill -f "python main.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsc --watch" 2>/dev/null || true
pkill -f "electron/dist/main.js" 2>/dev/null || true
pkill -f "/electron/cli.js dist/main.js" 2>/dev/null || true
sleep 2

# 创建日志目录
mkdir -p "$ROOT_DIR/logs"

# 启动后端
echo -e "${BLUE}📦 [1/4] Starting Backend...${NC}"
cd "$ROOT_DIR/backend"
if [ ! -f .venv/bin/activate ]; then
    echo -e "${RED}❌ Missing backend virtualenv. Create it with: python3 -m venv backend/.venv${NC}"
    exit 1
fi
source .venv/bin/activate
export DATABASE_URL="sqlite:///$ROOT_DIR/backend/coco.db"
export UPLOAD_DIR="$ROOT_DIR/backend/uploads"
export SECRET_KEY="dev-secret-key"
export PORT="8000"
export HOST="127.0.0.1"
python main.py > "$ROOT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}   Backend PID: $BACKEND_PID${NC}"
sleep 3

# 检查后端是否启动
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    cat "$ROOT_DIR/logs/backend.log"
    exit 1
fi

# 启动前端开发服务器
echo -e "${BLUE}⚡ [2/4] Starting Frontend Dev Server...${NC}"
cd "$ROOT_DIR/frontend"
PORT=3000 HOSTNAME=127.0.0.1 npm run dev > "$ROOT_DIR/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}   Frontend PID: $FRONTEND_PID${NC}"
sleep 5

# 启动 TypeScript 监视
echo -e "${BLUE}🔧 [3/4] Starting TypeScript Watch...${NC}"
cd "$ROOT_DIR/electron"
npm run dev:watch > "$ROOT_DIR/logs/tsc.log" 2>&1 &
TSC_PID=$!
echo -e "${GREEN}   TypeScript Watch PID: $TSC_PID${NC}"
sleep 2

# 启动 Electron
echo -e "${BLUE}🖥️  [4/4] Starting Electron...${NC}"
export NODE_ENV="development"
"$ROOT_DIR/electron/node_modules/.bin/electron" "$ROOT_DIR/electron/dist/main.js" > "$ROOT_DIR/logs/electron.log" 2>&1 &
ELECTRON_PID=$!
echo -e "${GREEN}   Electron PID: $ELECTRON_PID${NC}"
sleep 3

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo -e "${YELLOW}📊 Service Status:${NC}"
echo "  Backend:    http://localhost:8000 (PID: $BACKEND_PID)"
echo "  Frontend:   http://localhost:3000 (PID: $FRONTEND_PID)"
echo "  TypeScript: Watching... (PID: $TSC_PID)"
echo "  Electron:   Running (PID: $ELECTRON_PID)"
echo ""
echo -e "${YELLOW}📝 Logs location:${NC}"
echo "  Backend:    $ROOT_DIR/logs/backend.log"
echo "  Frontend:   $ROOT_DIR/logs/frontend.log"
echo "  TypeScript: $ROOT_DIR/logs/tsc.log"
echo "  Electron:   $ROOT_DIR/logs/electron.log"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - 按 Ctrl+C 停止所有服务"
echo "  - 修改代码后自动重载"
echo ""

# 等待用户中断
wait $ELECTRON_PID
