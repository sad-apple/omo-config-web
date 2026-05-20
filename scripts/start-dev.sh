#!/bin/bash

# OMO Config Web 启动脚本
# 用途: 后台启动开发服务器

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 停止已存在的进程
echo "正在停止已存在的 OMO Config Web 进程..."
pkill -f "next dev" 2>/dev/null
sleep 2

# 清理可能的锁文件
rm -f .next/dev.lock 2>/dev/null

# 在后台启动开发服务器
echo "正在后台启动 OMO Config Web 开发服务器..."
cd "$SCRIPT_DIR"
nohup pnpm dev > .next/dev.log 2>&1 &

# 获取进程ID
PID=$!
echo $PID > .next/dev.pid

echo "OMO Config Web 开发服务器已在后台启动 (PID: $PID)"
echo "访问地址: http://localhost:3000"
echo "日志文件: .next/dev.log"