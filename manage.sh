#!/bin/bash

# 飞书器材管理系统管理脚本
# 使用方法: ./manage.sh {start|stop|status|restart}

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
APP_NAME="feishu-equipment-mgmt"

# PID 文件
BACKEND_PID_FILE="$PROJECT_DIR/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_DIR/.frontend.pid"

# 日志文件
BACKEND_LOG="$PROJECT_DIR/backend.log"
FRONTEND_LOG="$PROJECT_DIR/frontend.log"
BACKEND_LOG_WATCH_PID_FILE="$PROJECT_DIR/.backend_log_watch.pid"
FRONTEND_LOG_WATCH_PID_FILE="$PROJECT_DIR/.frontend_log_watch.pid"

# 端口配置
BACKEND_PORT=8001
FRONTEND_PORT=8000

# 日志轮转配置（可通过环境变量覆盖）
LOG_MAX_SIZE_MB="${LOG_MAX_SIZE_MB:-20}"
LOG_KEEP_COUNT="${LOG_KEEP_COUNT:-5}"
LOG_CHECK_INTERVAL="${LOG_CHECK_INTERVAL:-30}"
ENV_FILE="$PROJECT_DIR/.env"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印信息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 加载 .env（若存在）
load_env_file() {
    if [ -f "$ENV_FILE" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # 去掉首尾空白
            line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
            # 忽略空行和注释
            [ -z "$line" ] && continue
            case "$line" in
                \#*) continue ;;
            esac
            # 解析 KEY = VALUE
            if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                # 去掉包裹引号
                value="${value%\"}"
                value="${value#\"}"
                value="${value%\'}"
                value="${value#\'}"
                export "$key=$value"
            fi
        done < "$ENV_FILE"
    fi
}

# 校验飞书配置
check_feishu_env() {
    # 兼容旧变量名 APP_ID/APP_SECRET
    if [ -z "${FEISHU_APP_ID:-}" ] && [ -n "${APP_ID:-}" ]; then
        export FEISHU_APP_ID="$APP_ID"
    fi
    if [ -z "${FEISHU_APP_SECRET:-}" ] && [ -n "${APP_SECRET:-}" ]; then
        export FEISHU_APP_SECRET="$APP_SECRET"
    fi

    if [ -z "${FEISHU_APP_ID:-}" ] || [ -z "${FEISHU_APP_SECRET:-}" ]; then
        error "缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET，请在环境变量或 .env 中配置"
        exit 1
    fi
}

# 获取文件大小（字节）
get_file_size_bytes() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo 0
        return
    fi
    local size
    size=$(wc -c < "$file" 2>/dev/null)
    echo "${size:-0}"
}

# 日志轮转：copytruncate，避免影响正在写入的进程
rotate_log_if_needed() {
    local log_file=$1
    local max_size_mb=$2
    local keep_count=$3

    if [ ! -f "$log_file" ]; then
        return
    fi

    local max_bytes=$((max_size_mb * 1024 * 1024))
    local current_size
    current_size=$(get_file_size_bytes "$log_file")

    if [ "$current_size" -lt "$max_bytes" ]; then
        return
    fi

    local i
    for ((i=keep_count; i>=2; i--)); do
        local prev="$log_file.$((i-1))"
        local curr="$log_file.$i"
        if [ -f "$prev" ]; then
            mv -f "$prev" "$curr"
        fi
    done

    cp "$log_file" "$log_file.1"
    : > "$log_file"
    info "日志已轮转: $log_file (>= ${max_size_mb}MB, 保留 ${keep_count} 份)"
}

# 启动日志监控进程
start_log_watcher() {
    local name=$1
    local log_file=$2
    local pid_file=$3

    if [ -f "$pid_file" ]; then
        local watch_pid
        watch_pid=$(cat "$pid_file")
        if ps -p "$watch_pid" > /dev/null 2>&1; then
            return
        fi
    fi

    nohup "$0" __watch_log "$log_file" "$LOG_MAX_SIZE_MB" "$LOG_KEEP_COUNT" "$LOG_CHECK_INTERVAL" > /dev/null 2>&1 &
    echo $! > "$pid_file"
    info "${name}日志监控已启动 (max=${LOG_MAX_SIZE_MB}MB, keep=${LOG_KEEP_COUNT}, interval=${LOG_CHECK_INTERVAL}s)"
}

# 停止日志监控进程
stop_log_watcher() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local watch_pid
        watch_pid=$(cat "$pid_file")
        if ps -p "$watch_pid" > /dev/null 2>&1; then
            kill "$watch_pid" 2>/dev/null
        fi
        rm -f "$pid_file"
    fi
}

# 日志监控子命令
watch_log_loop() {
    local log_file=$1
    local max_size_mb=$2
    local keep_count=$3
    local interval=$4

    while true; do
        rotate_log_if_needed "$log_file" "$max_size_mb" "$keep_count"
        sleep "$interval"
    done
}

# 检查虚拟环境
check_venv() {
    if [ ! -d "$VENV_DIR" ]; then
        warning "虚拟环境不存在，正在创建..."
        create_venv
    fi
}

# 创建虚拟环境
create_venv() {
    info "创建虚拟环境..."
    python3 -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        error "创建虚拟环境失败"
        exit 1
    fi
    success "虚拟环境创建成功"
    
    info "安装依赖..."
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip -q
    pip install -r "$PROJECT_DIR/requirements.txt" -q
    
    
    success "依赖安装完成"
}

# 激活虚拟环境
activate_venv() {
    source "$VENV_DIR/bin/activate"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 杀死占用端口的进程
kill_port() {
    local port=$1
    local pid=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$pid" ]; then
        info "释放端口 $port (PID: $pid)..."
        kill -9 $pid 2>/dev/null
    fi
}

# 启动后端服务
start_backend() {
    info "启动后端服务 (端口: $BACKEND_PORT)..."
    
    # 检查是否已在运行
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            warning "后端服务已经在运行 (PID: $PID)"
            return
        fi
    fi
    
    # 检查端口占用
    if check_port $BACKEND_PORT; then
        warning "端口 $BACKEND_PORT 被占用，尝试释放..."
        kill_port $BACKEND_PORT
        sleep 1
    fi
    
    # 检查虚拟环境
    check_venv
    activate_venv
    load_env_file
    check_feishu_env
    
    cd "$PROJECT_DIR"
    
    # 后台启动后端
    nohup python3 main.py $BACKEND_PORT > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    start_log_watcher "后端" "$BACKEND_LOG" "$BACKEND_LOG_WATCH_PID_FILE"
    
    # 等待服务启动
    sleep 3
    
    # 检查是否启动成功
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        success "后端服务启动成功！"
        info "后端地址: http://localhost:$BACKEND_PORT"
        info "API 文档: http://localhost:$BACKEND_PORT/docs"
    else
        error "后端服务启动可能失败，请检查日志: $BACKEND_LOG"
        tail -20 "$BACKEND_LOG"
    fi
}

# 启动前端服务
start_frontend() {
    info "启动前端服务 (端口: $FRONTEND_PORT)..."
    
    # 检查是否已在运行
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            warning "前端服务已经在运行 (PID: $PID)"
            return
        fi
    fi
    
    # 检查端口占用
    if check_port $FRONTEND_PORT; then
        warning "端口 $FRONTEND_PORT 被占用，尝试释放..."
        kill_port $FRONTEND_PORT
        sleep 1
    fi
    
    cd "$PROJECT_DIR/frontend"
    
    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        info "安装前端依赖..."
        npm install
    fi
    
    # 后台启动前端
    nohup npm run dev -- --port $FRONTEND_PORT --host > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
    start_log_watcher "前端" "$FRONTEND_LOG" "$FRONTEND_LOG_WATCH_PID_FILE"
    
    # 等待服务启动
    sleep 5
    
    # 检查是否启动成功
    if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        success "前端服务启动成功！"
        info "前端地址: http://localhost:$FRONTEND_PORT"
    else
        error "前端服务启动可能失败，请检查日志: $FRONTEND_LOG"
        tail -20 "$FRONTEND_LOG"
    fi
}

# 启动所有服务
start() {
    info "启动飞书器材管理系统..."
    echo ""
    
    # 启动后端
    start_backend
    echo ""
    
    # 启动前端
    start_frontend
    echo ""
    
    success "所有服务已启动！"
    echo ""
    echo "========================================"
    echo "🌐 前端访问: http://localhost:$FRONTEND_PORT"
    echo "🔧 后端访问: http://localhost:$BACKEND_PORT"
    echo "📚 API 文档: http://localhost:$BACKEND_PORT/docs"
    echo "========================================"
}

# 查看状态
status() {
    local backend_running=false
    local frontend_running=false
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            backend_running=true
        fi
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            frontend_running=true
        fi
    fi
    
    echo "服务状态:"
    echo ""
    
    if $backend_running; then
        success "后端服务: 运行中 (端口: $BACKEND_PORT)"
        if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
            info "健康检查: ✅ 正常"
        else
            warning "健康检查: ❌ 异常"
        fi
    else
        error "后端服务: 未运行"
    fi
    
    if $frontend_running; then
        success "前端服务: 运行中 (端口: $FRONTEND_PORT)"
    else
        error "前端服务: 未运行"
    fi
    
    echo ""
    
    # 显示最近的日志
    if $backend_running && [ -f "$BACKEND_LOG" ]; then
        info "后端最近日志:"
        tail -3 "$BACKEND_LOG"
        echo ""
    fi
    
    if $frontend_running && [ -f "$FRONTEND_LOG" ]; then
        info "前端最近日志:"
        tail -3 "$FRONTEND_LOG"
    fi
}

# 停止所有服务
stop() {
    info "停止所有服务..."
    
    # 停止后端
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            info "停止后端服务 (PID: $PID)..."
            kill "$PID" 2>/dev/null
            sleep 2
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID" 2>/dev/null
            fi
            success "后端服务已停止"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # 停止前端
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            info "停止前端服务 (PID: $PID)..."
            kill "$PID" 2>/dev/null
            sleep 2
            if ps -p "$PID" > /dev/null 2>&1; then
                kill -9 "$PID" 2>/dev/null
            fi
            success "前端服务已停止"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # 确保端口被释放
    kill_port $BACKEND_PORT 2>/dev/null
    kill_port $FRONTEND_PORT 2>/dev/null
    stop_log_watcher "$BACKEND_LOG_WATCH_PID_FILE"
    stop_log_watcher "$FRONTEND_LOG_WATCH_PID_FILE"
    
    success "所有服务已停止"
}

# 重启服务
restart() {
    info "重启服务..."
    stop
    sleep 2
    start
}

# 查看后端日志
logs() {
    if [ -f "$BACKEND_LOG" ]; then
        tail -f "$BACKEND_LOG"
    else
        error "后端日志文件不存在"
    fi
}

# 查看前端日志
logs_frontend() {
    if [ -f "$FRONTEND_LOG" ]; then
        tail -f "$FRONTEND_LOG"
    else
        error "前端日志文件不存在"
    fi
}

# 初始化数据库
init() {
    check_venv
    activate_venv
    
    info "初始化数据库..."
    cd "$PROJECT_DIR"
    python3 -c "
import asyncio
from database import init_db
asyncio.run(init_db())
print('✅ 数据库初始化完成')
"
}

# 显示帮助
help() {
    echo "飞书器材管理系统管理脚本"
    echo ""
    echo "用法: ./manage.sh [命令]"
    echo ""
    echo "命令:"
    echo "  start           启动前端(8000)和后端(8001)服务"
    echo "  stop            停止所有服务"
    echo "  restart         重启所有服务"
    echo "  status          查看服务状态"
    echo "  logs            查看后端实时日志"
    echo "  logs-frontend   查看前端实时日志"
    echo "  rotate-logs     立即执行一次日志轮转检查"
    echo "  init            初始化数据库"
    echo "  help            显示帮助信息"
    echo ""
    echo "端口配置:"
    echo "  前端: $FRONTEND_PORT"
    echo "  后端: $BACKEND_PORT"
    echo ""
    echo "日志轮转配置(环境变量可覆盖):"
    echo "  LOG_MAX_SIZE_MB=$LOG_MAX_SIZE_MB"
    echo "  LOG_KEEP_COUNT=$LOG_KEEP_COUNT"
    echo "  LOG_CHECK_INTERVAL=$LOG_CHECK_INTERVAL"
    echo ""
    echo "飞书配置来源:"
    echo "  环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET 或 $ENV_FILE"
    echo ""
    echo "示例:"
    echo "  ./manage.sh start    # 启动前后端服务"
    echo "  ./manage.sh status   # 查看服务状态"
    echo "  ./manage.sh logs     # 查看后端日志"
}

# 主逻辑
case "${1:-help}" in
    __watch_log)
        watch_log_loop "$2" "$3" "$4" "$5"
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    logs-frontend)
        logs_frontend
        ;;
    rotate-logs)
        rotate_log_if_needed "$BACKEND_LOG" "$LOG_MAX_SIZE_MB" "$LOG_KEEP_COUNT"
        rotate_log_if_needed "$FRONTEND_LOG" "$LOG_MAX_SIZE_MB" "$LOG_KEEP_COUNT"
        ;;
    init)
        init
        ;;
    help|--help|-h)
        help
        ;;
    *)
        error "未知命令: $1"
        help
        exit 1
        ;;
esac
