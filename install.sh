#!/bin/bash
set -e

# OMO Config Web 全局安装脚本
# 用途: 从 GitHub Releases 下载预构建包并全局安装，支持多预设配置管理

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
section() { echo -e "${BLUE}==>${NC} $1"; }

# 配置
REPO="${REPO:-sad-apple/omo-config-web}"
INSTALL_DIR="$HOME/.local/share/omo-config"
BIN_DIR="$HOME/.local/bin"
CONFIG_BASE="$HOME/.config/omo-config"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
BACKUP_DIR="$CONFIG_BASE/.backup"
PID_FILE="/tmp/omo-config.pid"
LOG_FILE="/tmp/omo-config.log"
PORT="${PORT:-3000}"
CURRENT_FILE="$CONFIG_BASE/.current"

# ==================== 从 Releases 安装/更新 ====================

install_from_release() {
    local version="${1:-latest}"
    local download_url

    section "获取最新版本..."

    if [[ "$version" == "latest" ]]; then
        download_url=$(curl -fsSL --max-time 60 "https://api.github.com/repos/$REPO/releases/latest" | \
            grep "browser_download_url.*linux-x64.tar.gz" | cut -d'"' -f4)
    else
        download_url="https://github.com/$REPO/releases/download/$version/omo-config-${version}-linux-x64.tar.gz"
    fi

    if [[ -z "$download_url" ]]; then
        error "未找到版本 $version 的下载链接"
        exit 1
    fi

    local filename
    filename=$(basename "$download_url")
    local tag_version
    tag_version=$(echo "$filename" | grep -oP 'v[0-9]+\.[0-9]+\.[0-9]+')

    info "下载 $tag_version ..."
    curl -fSL --max-time 60 "$download_url" -o "/tmp/$filename"

    # Verify download integrity
    local expected_checksum
    expected_checksum=$(curl -fsSL --max-time 30 "https://api.github.com/repos/$REPO/releases/latest" | \
        grep -oP '"shasum":\\s*"[^"]+"' | head -1 | cut -d'"' -f4 || echo "")

    if [[ -n "$expected_checksum" ]]; then
        local actual_checksum
        actual_checksum=$(sha256sum "/tmp/$filename" | cut -d' ' -f1)
        if [[ "$actual_checksum" != "$expected_checksum" ]]; then
            error "下载文件校验失败！"
            error "期望: $expected_checksum"
            error "实际: $actual_checksum"
            rm -f "/tmp/$filename"
            exit 1
        fi
        info "下载文件校验通过"
    else
        warn "无法获取校验和，跳过验证"
    fi

    section "安装到 $INSTALL_DIR ..."
    mkdir -p "$INSTALL_DIR"
    tar -xzf "/tmp/$filename" -C "$INSTALL_DIR" --strip-components=1
    rm -f "/tmp/$filename"

    # 安装运行时依赖
    cd "$INSTALL_DIR"
    info "安装运行时依赖..."
    if command -v npm &>/dev/null; then
        npm install --omit=dev --no-audit --no-fund
    else
        error "未找到 npm，请先安装 Node.js"
        exit 1
    fi

    # 初始化配置目录
    section "初始化配置目录..."
    mkdir -p "$CONFIG_BASE"
    mkdir -p "$CONFIG_BASE"
    # 创建默认预设（如果不存在）
    if [[ ! -d "$CONFIG_BASE/default" ]]; then
        info "创建默认预设配置..."
        mkdir -p "$CONFIG_BASE/default"
        echo '{}' > "$CONFIG_BASE/default/opencode.json"
        printf '{\n  // OMO Config Web 默认配置\n  "agents": {},\n  "categories": {},\n  "configProfiles": {}\n}\n' > "$CONFIG_BASE/default/oh-my-openagent.jsonc"
    fi

    # 设置默认为当前配置
    if [[ ! -f "$CURRENT_FILE" ]]; then
        echo "default" > "$CURRENT_FILE"
    fi

    # 创建全局命令
    section "创建全局命令: omo-config"
    mkdir -p "$BIN_DIR"
    cat > "$BIN_DIR/omo-config" << BINSCRIPT
#!/bin/bash
set -e

INSTALL_DIR="$INSTALL_DIR"
CONFIG_BASE="$HOME/.config/omo-config"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
BACKUP_DIR="$CONFIG_BASE/.backup"
PID_FILE="/tmp/omo-config.pid"
LOG_FILE="/tmp/omo-config.log"
CURRENT_FILE="$CONFIG_BASE/.current"
PORT="\${PORT:-3000}"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "\${GREEN}[INFO]\${NC} \$1"; }
warn()  { echo -e "\${YELLOW}[WARN]\${NC} \$1"; }
error() { echo -e "\${RED}[ERROR]\${NC} \$1"; }
section() { echo -e "\${BLUE}==>\${NC} \$1"; }

# 获取当前配置名称
get_current_config() {
    if [[ -f "\$CURRENT_FILE" ]]; then
        cat "\$CURRENT_FILE"
    else
        echo "default"
    fi
}

# 设置当前配置
set_current_config() {
    echo "\$1" > "\$CURRENT_FILE"
}

# 列出所有预设配置
cmd_list() {
    if [[ ! -d "\$CONFIG_BASE" ]]; then
        echo "暂无预设配置"
        return
    fi

    local current
    current=\$(get_current_config)

    echo "预设配置列表："
    echo ""
    for config_dir in "\$CONFIG_BASE"/*/; do
        if [[ -d "\$config_dir" ]] && [[ "\$(basename "\$config_dir")" != .* ]]; then
            local name
            name=\$(basename "\$config_dir")
            if [[ "\$name" == "\$current" ]]; then
                echo -e "  \${GREEN}* \$name\${NC} (当前)"
            else
                echo "    \$name"
            fi
        fi
    done
}

# 切换到指定配置
cmd_use() {
    local name="$1"
    if [[ -z "$name" ]]; then
        error "请指定配置名称: omo-config use <name>"
        exit 1
    fi

    if [[ ! -d "$CONFIG_BASE/$name" ]]; then
        error "配置 '$name' 不存在"
        exit 1
    fi

    # 先应用配置（含变更检测和自动备份）
    apply_config "$name"

    # 再标记为当前配置
    set_current_config "$name"
    info "已切换到配置: $name"
}

# 创建新配置
cmd_create() {
    local name="\$1"
    if [[ -z "\$name" ]]; then
        error "请指定配置名称: omo-config create <name>"
        exit 1
    fi

    if [[ -d "\$CONFIG_BASE/\$name" ]]; then
        error "配置 '\$name' 已存在"
        exit 1
    fi

    mkdir -p "\$CONFIG_BASE/\$name"
    echo '{}' > "\$CONFIG_BASE/\$name/opencode.json"
    printf '{\n  // OMO Config Web 配置\n  "agents": {},\n  "categories": {},\n  "configProfiles": {}\n}\n' > "\$CONFIG_BASE/\$name/oh-my-openagent.jsonc"

    info "已创建配置: \$name"
    info "使用 omo-config use \$name 切换到该配置"
}

# 删除配置
cmd_delete() {
    local name="\$1"
    if [[ -z "\$name" ]]; then
        error "请指定配置名称: omo-config delete <name>"
        exit 1
    fi

    if [[ ! -d "\$CONFIG_BASE/\$name" ]]; then
        error "配置 '\$name' 不存在"
        exit 1
    fi

    local current
    current=\$(get_current_config)
    if [[ "\$name" == "\$current" ]]; then
        error "不能删除当前正在使用的配置"
        exit 1
    fi

    rm -rf "\$CONFIG_BASE/\$name"
    info "已删除配置: \$name"
}

# 安全应用配置：校验变更、用户确认、自动备份、原子复制
apply_config() {
    local name="$1"
    local config_dir="$CONFIG_BASE/$name"

    if [[ ! -d "$config_dir" ]]; then
        error "配置 '$name' 不存在"
        exit 1
    fi

    # 确保目标目录存在
    mkdir -p "$OPENCODE_CONFIG_DIR"

    # 检查运行时配置是否被修改过
    local changed_files=()
    for file in opencode.json oh-my-openagent.jsonc; do
        local runtime_file="$OPENCODE_CONFIG_DIR/$file"
        local preset_file="$config_dir/$file"

        if [[ -f "$runtime_file" ]]; then
            if ! cmp -s "$runtime_file" "$preset_file" 2>/dev/null; then
                changed_files+=("$file")
            fi
        fi
    done

    # 如果有变更，提示用户确认
    if [[ ${#changed_files[@]} -gt 0 ]]; then
        warn "检测到以下运行时配置已被修改："
        for f in "${changed_files[@]}"; do
            echo "  - $f"
        done
        echo ""
        echo "切换到预设 '$name' 将覆盖这些文件。"
        echo "旧文件将自动备份到 $BACKUP_DIR/"
        echo ""
        read -p "是否继续？(y/N) " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            info "已取消切换"
            return 1
        fi

        # 用户确认后，执行备份
        local backup_timestamp
        backup_timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_path="$BACKUP_DIR/$backup_timestamp"
        mkdir -p "$backup_path"

        for file in "${changed_files[@]}"; do
            local runtime_file="$OPENCODE_CONFIG_DIR/$file"
            if [[ -f "$runtime_file" ]]; then
                cp "$runtime_file" "$backup_path/$file"
            fi
        done

        info "已备份运行时配置到: $backup_path"
    fi

    # 复制预设配置到运行时目录
    cp "$config_dir/opencode.json" "$OPENCODE_CONFIG_DIR/opencode.json"
    cp "$config_dir/oh-my-openagent.jsonc" "$OPENCODE_CONFIG_DIR/oh-my-openagent.jsonc"

    info "已应用配置 '$name' 到 $OPENCODE_CONFIG_DIR"
}

# 启动服务（不自动复制配置）
cmd_start() {
    # 检查是否已在运行
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        info "服务已在运行 (PID: $(cat "$PID_FILE"))"
        info "访问地址: http://localhost:$PORT"
        exit 0
    fi

    section "启动 OMO Config Web (端口: $PORT)..."

    cd "$INSTALL_DIR"
    nohup node server.js --port "$PORT" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    # 等待就绪
    for i in $(seq 1 15); do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" 2>/dev/null | grep -q "200\|301\|302"; then
            info "服务已就绪: http://localhost:$PORT"
            info "PID: $(cat "$PID_FILE")"
            info "日志: tail -f $LOG_FILE"
            exit 0
        fi
        sleep 2
    done
    warn "服务启动中，请查看日志: tail -f $LOG_FILE"
}

# 停止服务
cmd_stop() {
    if [[ -f "\$PID_FILE" ]]; then
        kill "\$(cat "\$PID_FILE")" 2>/dev/null || true
        rm -f "\$PID_FILE"
        info "服务已停止"
    else
        info "服务未运行"
    fi
}

# 查看状态
cmd_status() {
    local current
    current=\$(get_current_config)

    if [[ -f "\$PID_FILE" ]] && kill -0 "\$(cat "\$PID_FILE")" 2>/dev/null; then
        info "服务运行中"
        info "PID: \$(cat "\$PID_FILE")"
        info "端口: \$PORT"
        info "当前配置: \$current"
    else
        info "服务未运行"
        info "当前配置: \$current"
    fi
}

# 更新到最新版本
cmd_update() {
    local version="\${1:-latest}"

    section "更新 OMO Config Web..."

    if [[ "\$version" == "latest" ]]; then
        DOWNLOAD_URL=$(curl -fsSL --max-time 60 "https://api.github.com/repos/$REPO/releases/latest" | \
            grep "browser_download_url.*linux-x64.tar.gz" | cut -d'"' -f4)
    else
        DOWNLOAD_URL="https://github.com/$REPO/releases/download/\$version/omo-config-\$version-linux-x64.tar.gz"
    fi

    if [[ -z "\$DOWNLOAD_URL" ]]; then
        error "未找到版本 \$version 的下载链接"
        exit 1
    fi

    FILENAME=\$(basename "\$DOWNLOAD_URL")
    TAG_VERSION=\$(echo "\$FILENAME" | grep -oP 'v[0-9]+\.[0-9]+\.[0-9]+')

    info "下载 \$TAG_VERSION ..."
    curl -fSL --max-time 60 "$DOWNLOAD_URL" -o "/tmp/$FILENAME"

    # Verify download integrity
    local expected_checksum
    expected_checksum=$(curl -fsSL --max-time 30 "https://api.github.com/repos/$REPO/releases/latest" | \
        grep -oP '"shasum":\\s*"[^"]+"' | head -1 | cut -d'"' -f4 || echo "")

    if [[ -n "$expected_checksum" ]]; then
        local actual_checksum
        actual_checksum=$(sha256sum "/tmp/$FILENAME" | cut -d' ' -f1)
        if [[ "$actual_checksum" != "$expected_checksum" ]]; then
            error "下载文件校验失败！"
            error "期望: $expected_checksum"
            error "实际: $actual_checksum"
            rm -f "/tmp/$FILENAME"
            exit 1
        fi
        info "下载文件校验通过"
    else
        warn "无法获取校验和，跳过验证"
    fi

    info "更新到 \$INSTALL_DIR ..."
    mkdir -p "\$INSTALL_DIR"
    tar -xzf "/tmp/\$FILENAME" -C "\$INSTALL_DIR" --strip-components=1
    rm -f "/tmp/\$FILENAME"

    cd "\$INSTALL_DIR"
    npm install --omit=dev --no-audit --no-fund

    info "更新完成！"
    info "重启服务: omo-config restart"
}

# 卸载
cmd_uninstall() {
    if [[ -f "\$PID_FILE" ]]; then
        kill "\$(cat "\$PID_FILE")" 2>/dev/null || true
        rm -f "\$PID_FILE"
    fi

    rm -rf "\$INSTALL_DIR"
    rm -f "\$BIN_DIR/omo-config"

    info "卸载完成"
    info "配置数据保留在 \$CONFIG_BASE，如需删除请手动执行: rm -rf \$CONFIG_BASE"
}

# 主逻辑
case "\${1:-help}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_stop
        sleep 1
        cmd_start
        ;;
    status)
        cmd_status
        ;;
    list|ls)
        cmd_list
        ;;
    use)
        cmd_use "\$2"
        ;;
    create)
        cmd_create "\$2"
        ;;
    delete|rm)
        cmd_delete "\$2"
        ;;
    current)
        echo "当前配置: \$(get_current_config)"
        ;;
    update)
        cmd_update "\$2"
        ;;
    uninstall)
        cmd_uninstall
        ;;
    help|--help|-h)
        echo "用法: omo-config <command> [args]"
        echo ""
        echo "配置管理:"
        echo "  list, ls              列出所有预设配置"
        echo "  use <name>            切换到指定配置"
        echo "  create <name>         创建新配置"
        echo "  delete, rm <name>     删除配置"
        echo "  current               显示当前使用的配置"
        echo ""
        echo "服务管理:"
        echo "  start                 启动服务"
        echo "  stop                  停止服务"
        echo "  restart               重启服务"
        echo "  status                查看服务状态"
        echo ""
        echo "其他:"
        echo "  update [version]      更新到最新版本"
        echo "  uninstall             卸载"
        echo "  help                  显示帮助"
        echo ""
        echo "示例:"
        echo "  omo-config create daily       # 创建名为 daily 的配置"
        echo "  omo-config use daily          # 切换到 daily 配置"
        echo "  omo-config start              # 启动服务"
        echo "  omo-config list               # 查看所有配置"
        ;;
    *)
        error "未知命令: \$1"
        echo "运行 omo-config help 查看帮助"
        exit 1
        ;;
esac
BINSCRIPT
    chmod +x "$BIN_DIR/omo-config"

    info "安装完成！"
    info "运行 omo-config help 查看帮助"
    info "运行 omo-config start 启动服务"
}

# ==================== 卸载 ====================

uninstall() {
    # 停止服务
    if [[ -f "$PID_FILE" ]]; then
        kill "$(cat "$PID_FILE")" 2>/dev/null || true
        rm -f "$PID_FILE"
    fi

    # 删除安装文件
    rm -rf "$INSTALL_DIR"
    rm -f "$BIN_DIR/omo-config"

    info "卸载完成"
    info "配置数据保留在 $CONFIG_BASE，如需删除请手动执行: rm -rf $CONFIG_BASE"
}

# ==================== 主逻辑 ====================

case "${1:-update}" in
    update)
        install_from_release "${2:-latest}"
        ;;
    uninstall)
        uninstall
        ;;
    start|stop|restart|status|list|ls|use|create|delete|rm|current|help|--help|-h)
        if [[ -x "$BIN_DIR/omo-config" ]]; then
            "$BIN_DIR/omo-config" "$@"
        else
            error "未安装 omo-config，请先运行: bash install.sh update"
            exit 1
        fi
        ;;
    *)
        echo "用法: $0 {update|uninstall|start|stop|restart|status|list|use|create|delete|current|help}"
        echo ""
        echo "  update [VERSION]   - 从 GitHub Releases 下载并全局安装 (默认最新版本)"
        echo "  uninstall          - 卸载"
        echo "  start                启动服务"
        echo "  stop               - 停止服务"
        echo "  restart            - 重启服务"
        echo "  status             - 查看服务状态"
        echo "  list               - 列出所有预设配置"
        echo "  use <NAME>         - 切换到指定配置"
        echo "  create <NAME>      - 创建新配置"
        echo "  delete <NAME>      - 删除配置"
        echo "  current            - 显示当前配置"
        echo "  help               - 显示帮助"
        echo ""
        echo "示例:"
        echo "  bash install.sh update              # 安装/更新到最新版本"
        echo "  omo-config create daily         # 创建配置"
        exit 1
        ;;
esac
