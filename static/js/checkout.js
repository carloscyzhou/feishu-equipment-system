/**
 * 出入库页面逻辑
 */

// 当前模式: 'checkout'(出库) 或 'checkin'(入库)
let currentMode = 'checkout';
let scannedItems = [];
let currentUser = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    loadUserInfo();
    setupDateDefaults();
});

// 页面初始化
async function initPage() {
    // 检查是否在飞书环境中
    if (!isFeishuClient()) {
        showToast('请在飞书客户端中打开此页面');
        return;
    }
    
    // 初始化飞书SDK
    await initFeishuSDK();
}

// 检查是否在飞书客户端
function isFeishuClient() {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('lark') || ua.includes('feishu');
}

// 初始化飞书SDK
async function initFeishuSDK() {
    try {
        await new Promise((resolve, reject) => {
            if (window.h5sdk) {
                window.h5sdk.ready(() => {
                    console.log('飞书SDK已就绪');
                    resolve();
                });
                window.h5sdk.error((err) => {
                    console.error('飞书SDK初始化失败:', err);
                    reject(err);
                });
            } else {
                // SDK未加载，等待加载
                setTimeout(() => {
                    if (window.h5sdk) {
                        window.h5sdk.ready(() => resolve());
                    } else {
                        reject(new Error('飞书SDK未加载'));
                    }
                }, 1000);
            }
        });
    } catch (err) {
        console.error('SDK初始化失败:', err);
        showToast('飞书SDK初始化失败，部分功能可能不可用');
    }
}

// 切换模式
function switchMode(mode) {
    currentMode = mode;
    
    // 更新按钮样式
    document.getElementById('checkoutMode').classList.toggle('active', mode === 'checkout');
    document.getElementById('checkinMode').classList.toggle('active', mode === 'checkin');
    
    // 显示/隐藏出库表单
    const checkoutForm = document.getElementById('checkoutForm');
    if (mode === 'checkout') {
        checkoutForm.style.display = 'block';
    } else {
        checkoutForm.style.display = 'none';
    }
    
    // 更新提交按钮文字
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = mode === 'checkout' ? '确认出库' : '确认入库';
    
    // 清空已扫描列表
    scannedItems = [];
    renderScannedItems();
}

// 设置默认日期
function setupDateDefaults() {
    const returnDate = document.getElementById('returnDate');
    if (returnDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        returnDate.value = tomorrow.toISOString().split('T')[0];
    }
}

// 开始扫码
async function startScan() {
    try {
        // 使用 app.js 中封装的扫码函数，会自动处理 tt.config 配置
        const result = await scanWithFeishu();
        console.log('扫码结果:', result);
        handleScanResult(result);
    } catch (err) {
        console.error('扫码失败:', err);
        const errorMsg = err?.message || '扫码失败';
        showToast(errorMsg);
    }
}

// 处理扫码结果
async function handleScanResult(qrCode) {
    try {
        showLoading('正在查询器材信息...');
        
        const response = await fetch(`/api/scan/process?qr_code=${encodeURIComponent(qrCode)}&mode=${currentMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        hideLoading();
        
        if (!result.success) {
            showToast(result.message || '扫码处理失败');
            return;
        }
        
        const equipment = result.equipment;
        
        // 检查是否已扫描
        if (scannedItems.find(item => item.id === equipment.id)) {
            showToast('该器材已在扫描列表中');
            return;
        }
        
        // 根据模式检查是否可以继续
        if (!result.can_proceed) {
            showToast(result.message);
            // 如果是入库模式且器材已在库，不添加到列表
            if (currentMode === 'checkin' && equipment.status === 0) {
                return;
            }
            // 如果是出库模式且器材已借出，可以添加到列表（用于显示）
            if (currentMode === 'checkout' && equipment.status === 1) {
                scannedItems.push({
                    ...equipment,
                    canProceed: false,
                    message: result.message
                });
                renderScannedItems();
                return;
            }
        }
        
        // 添加到扫描列表
        scannedItems.push({
            ...equipment,
            canProceed: true,
            message: result.message
        });
        
        renderScannedItems();
        showToast('扫描成功: ' + equipment.model_name);
        
    } catch (err) {
        hideLoading();
        console.error('处理扫码结果失败:', err);
        showToast('查询器材信息失败，请重试');
    }
}

// 渲染已扫描列表
function renderScannedItems() {
    const container = document.getElementById('scannedItems');
    const countEl = document.getElementById('scanCount');
    const submitBtn = document.getElementById('submitBtn');
    
    // 更新数量
    countEl.textContent = scannedItems.length;
    
    // 更新提交按钮状态
    const validItems = scannedItems.filter(item => item.canProceed !== false);
    submitBtn.disabled = validItems.length === 0;
    
    if (scannedItems.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无扫描记录，请点击上方按钮扫码</div>';
        return;
    }
    
    container.innerHTML = scannedItems.map((item, index) => `
        <div class="scanned-item" style="${item.canProceed === false ? 'opacity: 0.6; border-color: var(--danger);' : ''}">
            <div class="info">
                <div class="name">
                    ${item.model_name}
                    ${item.serial_number ? `<span class="text-secondary">(${item.serial_number})</span>` : ''}
                </div>
                <div class="meta">
                    ${currentMode === 'checkin' && item.current_user_name ? `
                        <div class="borrower-info">
                            <span>借用人: ${item.current_user_name}</span>
                            ${item.checkout_time ? `<span>| 借出时间: ${formatDate(item.checkout_time)}</span>` : ''}
                            ${item.purpose ? `<span>| 用途: ${item.purpose}</span>` : ''}
                        </div>
                    ` : ''}
                    ${currentMode === 'checkout' && item.status === 1 ? `
                        <span style="color: var(--danger);">⚠️ 该器材已借出</span>
                    ` : ''}
                </div>
            </div>
            <button class="remove-btn" onclick="removeItem(${index})">删除</button>
        </div>
    `).join('');
}

// 删除已扫描项
function removeItem(index) {
    scannedItems.splice(index, 1);
    renderScannedItems();
}

// 提交操作
async function submitOperation() {
    // 过滤出有效的器材
    const validItems = scannedItems.filter(item => item.canProceed !== false);
    
    if (validItems.length === 0) {
        showToast('没有可操作的器材');
        return;
    }
    
    const equipmentIds = validItems.map(item => item.id);
    
    try {
        showLoading(currentMode === 'checkout' ? '正在出库...' : '正在入库...');
        
        let response;
        
        if (currentMode === 'checkout') {
            // 出库操作
            const purpose = document.getElementById('purpose').value.trim();
            const returnDate = document.getElementById('returnDate').value;
            const returnTime = document.getElementById('returnTime').value;
            
            if (!purpose) {
                hideLoading();
                showToast('请填写出库用途');
                return;
            }
            
            let expectedReturnAt = null;
            if (returnDate) {
                expectedReturnAt = new Date(`${returnDate}T${returnTime || '18:00'}`).toISOString();
            }
            
            response = await fetch(`/api/checkout?user_id=${currentUser?.id || 1}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipment_ids: equipmentIds,
                    purpose: purpose,
                    expected_return_at: expectedReturnAt
                })
            });
        } else {
            // 入库操作
            response = await fetch(`/api/checkin?user_id=${currentUser?.id || 1}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipment_ids: equipmentIds
                })
            });
        }
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            const successCount = result.data.success.length;
            const failCount = result.data.failed.length;
            
            let message = `成功${currentMode === 'checkout' ? '出库' : '入库'} ${successCount} 件器材`;
            if (failCount > 0) {
                message += `，${failCount} 件失败`;
            }
            
            showToast(message);
            
            // 清空列表
            scannedItems = [];
            renderScannedItems();
            
            // 清空表单
            if (currentMode === 'checkout') {
                document.getElementById('purpose').value = '';
            }
            
            // 延迟刷新页面
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(result.message || '操作失败');
        }
        
    } catch (err) {
        hideLoading();
        console.error('提交操作失败:', err);
        showToast('操作失败，请重试');
    }
}

// 加载用户信息
async function loadUserInfo() {
    try {
        // 尝试从本地存储获取用户信息
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            updateUserDisplay();
            return;
        }
        
        // 如果没有用户信息，尝试获取免登录code
        if (window.tt) {
            const code = await getAuthCode();
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            
            const result = await response.json();
            if (result.success) {
                currentUser = result.data;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUserDisplay();
            }
        }
    } catch (err) {
        console.error('加载用户信息失败:', err);
    }
}

// 获取飞书免登录code
function getAuthCode() {
    return new Promise((resolve, reject) => {
        tt.requestAccess({
            appID: 'cli_xxx',
            success: (res) => resolve(res.code),
            fail: (err) => reject(err)
        });
    });
}

// 更新用户显示
function updateUserDisplay() {
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl && currentUser) {
        userInfoEl.innerHTML = `
            <div class="user-avatar">${currentUser.name?.[0] || 'U'}</div>
            <span>${currentUser.name || '用户'}</span>
        `;
    }
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 显示加载中
function showLoading(message = '加载中...') {
    // 可以在这里实现全局加载动画
    console.log('Loading:', message);
}

// 隐藏加载中
function hideLoading() {
    console.log('Loading complete');
}

// 显示提示
function showToast(message) {
    // 简单的toast实现
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 9999;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2500);
}
