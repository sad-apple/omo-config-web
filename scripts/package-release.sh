#!/bin/bash
set -e

# OMO Config Web 发布包打包脚本
# 用途: 将构建产物打包为适合分发的预构建包

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

RELEASE_TAG="${RELEASE_TAG:-$(git describe --tags --abbrev=0 2>/dev/null || echo 'v0.0.0')}"
PACKAGE_NAME="omo-config-${RELEASE_TAG}-linux-x64"
BUILD_DIR="$SCRIPT_DIR/.next/standalone"
OUTPUT_DIR="/tmp/$PACKAGE_NAME"

echo "打包版本: $RELEASE_TAG"
echo "包名称: $PACKAGE_NAME"

# 清理旧输出
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 复制构建产物
echo "复制构建产物..."
cp -r "$BUILD_DIR"/* "$OUTPUT_DIR/"

# 复制静态资源 (standalone 模式需要)
if [[ -d "$SCRIPT_DIR/.next/static" ]]; then
    mkdir -p "$OUTPUT_DIR/.next/static"
    cp -r "$SCRIPT_DIR/.next/static"/* "$OUTPUT_DIR/.next/static/"
fi

# 复制 public 目录
if [[ -d "$SCRIPT_DIR/public" ]]; then
    cp -r "$SCRIPT_DIR/public" "$OUTPUT_DIR/"
fi

# 复制 package.json (用于安装依赖)
cp "$SCRIPT_DIR/package.json" "$OUTPUT_DIR/"

# 复制安装脚本
cp "$SCRIPT_DIR/install.sh" "$OUTPUT_DIR/"
chmod +x "$OUTPUT_DIR/install.sh"

# 创建快速启动脚本
cat > "$OUTPUT_DIR/start.sh" << 'EOF'
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-3000}"
PID_FILE="$SCRIPT_DIR/.app.pid"
LOG_FILE="$SCRIPT_DIR/.app.log"

case "${1:-start}" in
    start)
        if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            echo "服务已在运行 (PID: $(cat "$PID_FILE"))"
            exit 0
        fi

        echo "启动 OMO Config Web (端口: $PORT)..."
        nohup node server.js --port "$PORT" > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"

        # 等待就绪
        for i in $(seq 1 15); do
            if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null | grep -q "200\|301\|302"; then
                echo "服务已就绪: http://localhost:$PORT"
                echo "PID: $(cat "$PID_FILE")"
                echo "日志: tail -f $LOG_FILE"
                exit 0
            fi
            sleep 2
        done
        echo "服务启动中，请查看日志: tail -f $LOG_FILE"
        ;;
    stop)
        if [[ -f "$PID_FILE" ]]; then
            kill "$(cat "$PID_FILE")" 2>/dev/null || true
            rm -f "$PID_FILE"
            echo "服务已停止"
        else
            echo "服务未运行"
        fi
        ;;
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    *)
        echo "用法: $0 {start|stop|restart}"
        exit 1
        ;;
esac
EOF
chmod +x "$OUTPUT_DIR/start.sh"

# 创建 README
cat > "$OUTPUT_DIR/README.md" << EOF
# OMO Config Web $RELEASE_TAG

## 快速启动

\`\`\`bash
# 安装运行时依赖
npm install --omit=dev

# 启动服务
./start.sh start

# 访问
# http://localhost:3000
\`\`\`

## 其他命令

\`\`\`bash
./start.sh stop      # 停止服务
./start.sh restart   # 重启服务
./install.sh status   # 查看状态
\`\`\`

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3000 | 服务端口 |
| OMO_CONFIG_DIR | ~/.config/opencode | 配置文件目录 |
EOF

# 打包
echo "压缩打包..."
cd /tmp
tar -czf "$SCRIPT_DIR/${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

echo "完成: $SCRIPT_DIR/${PACKAGE_NAME}.tar.gz"
echo "大小: $(du -h "$SCRIPT_DIR/${PACKAGE_NAME}.tar.gz" | cut -f1)"
