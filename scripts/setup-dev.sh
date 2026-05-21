#!/bin/bash
set -e

# OMO Config Web 开发环境设置脚本
# 用途: 检查依赖、安装 npm 包、初始化配置目录

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
section() { echo -e "${BLUE}==>${NC} $1"; }

# ==================== 前置检查 ====================

section "检查前置依赖..."

check_version() {
    local cmd="$1" min_version="$2"
    if ! command -v "$cmd" &>/dev/null; then
        error "未找到 $cmd，请先安装"
        exit 1
    fi
    local current_version
    current_version=$("$cmd" --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    if [[ "$current_version" -lt "$min_version" ]]; then
        error "$cmd 版本 >= $min_version 要求，当前: $current_version"
        exit 1
    fi
    info "$cmd ✓ (版本 $current_version)"
}

check_version "node" 18
check_version "pnpm" 9

# ==================== 安装依赖 ====================

section "安装项目依赖..."
cd "$SCRIPT_DIR"
pnpm install
info "依赖安装完成"

# ==================== 构建项目 ====================

section "构建项目..."
cd "$SCRIPT_DIR"
pnpm build
info "构建完成"

# ==================== 初始化配置目录 ====================

section "初始化配置目录..."

CONFIG_BASE="$HOME/.config/omo-config"
CURRENT_FILE="$CONFIG_BASE/.current"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"

mkdir -p "$CONFIG_BASE"

# 创建默认预设（如果不存在）
if [[ ! -d "$CONFIG_BASE/default" ]]; then
    info "创建默认预设配置..."
    mkdir -p "$CONFIG_BASE/default"
    echo '{}' > "$CONFIG_BASE/default/opencode.json"
    printf '{\n  // OMO Config Web 默认配置\n  "agents": {},\n  "categories": {},\n  "configProfiles": {}\n}\n' > "$CONFIG_BASE/default/oh-my-openagent.jsonc"
else
    info "默认预设已存在，跳过"
fi

# 设置默认为当前配置
if [[ ! -f "$CURRENT_FILE" ]]; then
    echo "default" > "$CURRENT_FILE"
    info "已设置默认预设为当前配置"
else
    info "当前配置标记已存在，跳过"
fi

# ==================== 可选：导入已有配置 ====================

import_if_exists() {
    local src="$1" dest="$2" label="$3"
    if [[ -f "$src" ]]; then
        echo -n -e "${YELLOW}检测到已有 $label ($src)，是否导入到默认预设？[y/N]${NC} "
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            cp "$src" "$dest"
            info "已导入 $label → $dest"
        else
            info "跳过导入"
        fi
    fi
}

import_if_exists "$OPENCODE_CONFIG_DIR/opencode.json" "$CONFIG_BASE/default/opencode.json" "opencode.json"
import_if_exists "$OPENCODE_CONFIG_DIR/oh-my-openagent.jsonc" "$CONFIG_BASE/default/oh-my-openagent.jsonc" "oh-my-openagent.jsonc"

# ==================== 注册全局命令 ====================

section "注册全局命令: omo-config"

BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/omo-config" << 'DEVBINSCRIPT'
#!/bin/bash
set -e

INSTALL_DIR="$SCRIPT_DIR"
CONFIG_BASE="$HOME/.config/omo-config"
OPENCODE_CONFIG_DIR="$HOME/.config/opencode"
BACKUP_DIR="$CONFIG_BASE/.backup"
PID_FILE="/tmp/omo-config.pid"
LOG_FILE="/tmp/omo-config.log"
CURRENT_FILE="$CONFIG_BASE/.current"
PORT="${PORT:-3000}"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
section() { echo -e "${BLUE}==>${NC} $1"; }

# 获取当前配置名称
get_current_config() {
    if [[ -f "$CURRENT_FILE" ]]; then
        cat "$CURRENT_FILE"
    else
        echo "default"
    fi
}

# 设置当前配置
set_current_config() {
    echo "$1" > "$CURRENT_FILE"
}

# 列出所有预设配置
cmd_list() {
    if [[ ! -d "$CONFIG_BASE" ]]; then
        echo "暂无预设配置"
        return
    fi

    local current
    current=$(get_current_config)

    echo "预设配置列表："
    echo ""
    for config_dir in "$CONFIG_BASE"/*/; do
        if [[ -d "$config_dir" ]] && [[ "$(basename "$config_dir")" != .* ]]; then
            local name
            name=$(basename "$config_dir")
            if [[ "$name" == "$current" ]]; then
                echo -e "  ${GREEN}* $name${NC} (当前)"
            else
                echo "    $name"
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
    local name="$1"
    if [[ -z "$name" ]]; then
        error "请指定配置名称: omo-config create <name>"
        exit 1
    fi

    if [[ -d "$CONFIG_BASE/$name" ]]; then
        error "配置 '$name' 已存在"
        exit 1
    fi

    mkdir -p "$CONFIG_BASE/$name"
    echo '{}' > "$CONFIG_BASE/$name/opencode.json"
    printf '{\n  // OMO Config Web 配置\n  "agents": {},\n  "categories": {},\n  "configProfiles": {}\n}\n' > "$CONFIG_BASE/$name/oh-my-openagent.jsonc"

    info "已创建配置: $name"
    info "使用 omo-config use $name 切换到该配置"
}

# 删除配置
cmd_delete() {
    local name="$1"
    if [[ -z "$name" ]]; then
        error "请指定配置名称: omo-config delete <name>"
        exit 1
    fi

    if [[ ! -d "$CONFIG_BASE/$name" ]]; then
        error "配置 '$name' 不存在"
        exit 1
    fi

    local current
    current=$(get_current_config)
    if [[ "$name" == "$current" ]]; then
        error "不能删除当前正在使用的配置"
        exit 1
    fi

    rm -rf "$CONFIG_BASE/$name"
    info "已删除配置: $name"
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

# 启动服务
cmd_start() {
    # 检查是否已在运行
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        info "服务已在运行 (PID: $(cat "$PID_FILE"))"
        info "访问地址: http://localhost:$PORT"
        exit 0
    fi

    section "启动 OMO Config Web (端口: $PORT)..."

    cd "$INSTALL_DIR"
    nohup npx next start --port "$PORT" > "$LOG_FILE" 2>&1 &
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
    if [[ -f "$PID_FILE" ]]; then
        kill "$(cat "$PID_FILE")" 2>/dev/null || true
        rm -f "$PID_FILE"
        info "服务已停止"
    else
        info "服务未运行"
    fi
}

# 查看状态
cmd_status() {
    local current
    current=$(get_current_config)

    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        info "服务运行中"
        info "PID: $(cat "$PID_FILE")"
        info "端口: $PORT"
        info "当前配置: $current"
    else
        info "服务未运行"
        info "当前配置: $current"
    fi
}

# 主逻辑
case "${1:-help}" in
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
        cmd_use "$2"
        ;;
    create)
        cmd_create "$2"
        ;;
    delete|rm)
        cmd_delete "$2"
        ;;
    current)
        echo "当前配置: $(get_current_config)"
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
        echo "示例:"
        echo "  omo-config create daily       # 创建名为 daily 的配置"
        echo "  omo-config use daily          # 切换到 daily 配置"
        echo "  omo-config start              # 启动服务"
        echo "  omo-config list               # 查看所有配置"
        ;;
    *)
        error "未知命令: $1"
        echo "运行 omo-config help 查看帮助"
        exit 1
        ;;
esac
DEVBINSCRIPT
chmod +x "$BIN_DIR/omo-config"
sed -i "s|\$SCRIPT_DIR|$SCRIPT_DIR|" "$BIN_DIR/omo-config"

# 检查 PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
    warn "$BIN_DIR 未在 PATH 中，请添加:"
    warn "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
    warn "  source ~/.bashrc"
fi

info "全局命令已注册: $BIN_DIR/omo-config"
# ==================== 完成 ====================

echo ""
info "开发环境设置完成！"
echo ""
info "下一步:"
info "  omo-config start          # 启动开发服务器"
info "  omo-config help           # 查看所有命令"
info "  omo-config list           # 管理预设配置"
echo ""
info "启动后访问: http://localhost:3000"
