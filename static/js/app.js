/**
 * 公共应用逻辑
 * 包含导航切换、Toast提示、日期格式化、API请求等通用功能
 */

// ========== 全局状态 ==========
let currentUser = null;
let currentPage = 'home';

// ========== 工具函数 ==========

/**
 * 显示Toast提示
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型: success/error/warning/info
 * @param {number} duration - 显示时长(毫秒)
 */
function showToast(message, type = 'info', duration = 3000) {
    // 获取或创建toast容器
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 图标映射
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${type === 'error' ? '错误' : type === 'success' ? '成功' : type === 'warning' ? '警告' : '提示'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-close" onclick="this.parentElement.remove()">✕</div>
    `;
    
    container.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * 格式化日期
 * @param {string|Date} date - 日期字符串或Date对象
 * @param {boolean} withTime - 是否包含时间
 * @returns {string}
 */
function formatDate(date, withTime = false) {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    if (!withTime) {
        return `${year}-${month}-${day}`;
    }
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化日期时间(简短格式)
 * @param {string|Date} date - 日期
 * @returns {string}
 */
function formatDateTimeShort(date) {
    if (!date) return '-';
    
    const d = new Date(date);
    const now = new Date();
    
    const isToday = d.toDateString() === now.toDateString();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (isToday) {
        return `今天 ${hours}:${minutes}`;
    }
    return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 统一的API请求封装
 * @param {string} url - 请求URL
 * @param {object} options - fetch选项
 * @returns {Promise}
 */
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }
    
    try {
        const response = await fetch(url, mergedOptions);
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            const error = new Error(data.detail || data.message || '请求失败');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('网络连接失败，请检查网络设置');
        }
        throw error;
    }
}

// ========== 导航功能 ==========

/**
 * 初始化导航
 */
function initNavigation() {
    // 高亮当前页面导航
    const currentPath = window.location.pathname;
    
    // 侧边栏导航
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath !== '/' && href !== '/' && currentPath.startsWith(href))) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // 底部导航
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath !== '/' && href !== '/' && currentPath.startsWith(href))) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * 切换页面
 * @param {string} page - 页面路径
 */
function navigateTo(page) {
    window.location.href = page;
}

// ========== 分页组件 ==========

/**
 * 渲染分页组件
 * @param {object} options - 分页选项
 * @param {number} options.currentPage - 当前页码
 * @param {number} options.totalPages - 总页数
 * @param {number} options.total - 总记录数
 * @param {Function} options.onPageChange - 页码变化回调
 * @param {string} options.containerId - 容器ID
 */
function renderPagination(options) {
    const {
        currentPage = 1,
        totalPages = 1,
        total = 0,
        onPageChange,
        containerId = 'pagination'
    } = options;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 上一页按钮
    html += `<button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">上一页</button>`;
    
    // 页码按钮
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-btn" disabled>...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-btn" disabled>...</span>`;
        }
        html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // 下一页按钮
    html += `<button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">下一页</button>`;
    
    // 页面信息
    html += `<span class="pagination-info">共 ${total} 条记录</span>`;
    
    container.innerHTML = html;
    
    // 绑定点击事件
    container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page && onPageChange) {
                onPageChange(page);
            }
        });
    });
}

// ========== 模态框功能 ==========

/**
 * 显示模态框
 * @param {string} modalId - 模态框ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 隐藏模态框
 * @param {string} modalId - 模态框ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * 初始化模态框
 */
function initModals() {
    // 点击遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // 关闭按钮
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// ========== 飞书环境检测 ==========

/**
 * 检测是否在飞书客户端内
 * @returns {boolean}
 */
function isFeishuClient() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('lark') || ua.includes('feishu');
}

/**
 * 检测是否为桌面端飞书（扫码不支持）
 * @returns {boolean}
 */
function isDesktopFeishuClient() {
    const ua = navigator.userAgent.toLowerCase();
    const isDesktopOS = ua.includes('windows') || ua.includes('macintosh') || ua.includes('x11');
    const isMobileOS = ua.includes('android') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('harmony');
    return isDesktopOS && !isMobileOS;
}

let feishuScanConfigPromise = null;
let feishuScanConfigUrl = '';

/**
 * 初始化飞书JSAPI配置（scanCode需要先config）
 * @returns {Promise<void>}
 */
async function ensureFeishuScanConfigured() {
    const currentUrl = window.location.href.split('#')[0];
    if (feishuScanConfigPromise && feishuScanConfigUrl === currentUrl) {
        return feishuScanConfigPromise;
    }

    feishuScanConfigUrl = currentUrl;
    feishuScanConfigPromise = (async () => {
        const response = await fetch(`/api/feishu/scan-config?page_url=${encodeURIComponent(currentUrl)}`, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('获取扫码配置失败');
        }

        const cfg = await response.json();

        if (!cfg?.signature) {
            throw new Error('飞书扫码签名为空，请检查后端应用配置');
        }

        await new Promise((resolve, reject) => {
            const configAPI = window.h5sdk?.config || window.tt?.config;
            if (!configAPI) {
                reject(new Error('当前环境不支持飞书JSAPI配置'));
                return;
            }

            try {
                configAPI({
                    appId: cfg.app_id,
                    timestamp: String(cfg.timestamp),
                    nonceStr: cfg.nonceStr,
                    signature: cfg.signature,
                    jsApiList: ['scanCode']
                });
            } catch (err) {
                reject(new Error('飞书JSAPI配置调用失败: ' + err.message));
                return;
            }

            let settled = false;
            const done = () => {
                if (settled) return;
                settled = true;
                resolve();
            };
            const fail = (err) => {
                if (settled) return;
                settled = true;
                reject(new Error(err?.errMsg || err?.message || '飞书JSAPI配置失败'));
            };

            if (window.h5sdk && typeof window.h5sdk.ready === 'function') {
                window.h5sdk.ready(done);
                window.h5sdk.error && window.h5sdk.error(fail);
            } else if (window.tt && typeof window.tt.ready === 'function') {
                window.tt.ready(done);
                window.tt.error && window.tt.error(fail);
            }

            setTimeout(done, 2000);
        });
    })().catch((err) => {
        feishuScanConfigPromise = null;
        throw err;
    });

    return feishuScanConfigPromise;
}

/**
 * 获取飞书授权码
 * @returns {Promise<string>}
 */
async function getFeishuAuthCode() {
    return new Promise((resolve, reject) => {
        if (!window.tt) {
            reject(new Error('飞书JSAPI未加载'));
            return;
        }
        
        window.h5sdk.ready(() => {
            tt.requestAccess({
                appID: 'your_feishu_app_id',
                success: (res) => resolve(res.code),
                fail: (err) => reject(err)
            });
        });
    });
}

/**
 * 调用飞书扫码
 * @returns {Promise<string>} 扫码结果
 */
async function scanWithFeishu() {
    if (!isFeishuClient()) {
        throw new Error('请在飞书客户端中打开后扫码');
    }

    if (!window.tt || typeof tt.scanCode !== 'function') {
        throw new Error('当前环境不支持扫码能力');
    }

    if (isDesktopFeishuClient()) {
        throw new Error('飞书 PC 端不支持扫码，请直接使用扫描枪或输入设备编号');
    }

    await ensureFeishuScanConfigured();

    return new Promise((resolve, reject) => {
        tt.scanCode({
            scanType: ['qrCode', 'barCode', 'datamatrix', 'pdf417'],
            barCodeInput: true,
            success: (res) => resolve(res.result),
            fail: (err) => {
                const errno = Number(err?.errno ?? err?.errorCode ?? -1);
                const errMsg = String(err?.errMsg || err?.message || '');
                let errorMessage = errMsg || '扫码失败';

                if (errno === 103) {
                    errorMessage = '当前客户端版本或平台不支持扫码，请升级手机飞书后重试';
                } else if (/cancel|取消/i.test(errMsg)) {
                    errorMessage = '已取消扫码';
                } else if (/no auth permisson|please call config/i.test(errMsg)) {
                    errorMessage = '扫码权限未初始化，请刷新页面重试';
                } else if (/signature is expired|过期/i.test(errMsg)) {
                    errorMessage = '签名已过期，请刷新页面后重试';
                }

                reject(new Error(errorMessage));
            }
        });
    });
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
    // 初始化导航
    initNavigation();
    
    // 初始化模态框
    initModals();
});
