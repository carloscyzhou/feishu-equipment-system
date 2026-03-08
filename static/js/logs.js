/**
 * 操作日志页面逻辑
 */

let currentPage = 1;
let pageSize = 20;
let totalLogs = 0;
let users = [];

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    loadLogs();
    loadUsers();
});

// 加载日志
async function loadLogs() {
    try {
        const actionType = document.getElementById('actionFilter')?.value;
        const userId = document.getElementById('userFilter')?.value;
        const timeFilter = document.getElementById('timeFilter')?.value;
        
        const params = {
            page: currentPage,
            page_size: pageSize,
        };
        
        if (actionType) params.action_type = actionType;
        if (userId) params.user_id = userId;
        
        // 时间筛选
        if (timeFilter) {
            const now = new Date();
            let startTime;
            
            switch (timeFilter) {
                case 'today':
                    startTime = new Date(now.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }
            
            if (startTime) {
                params.start_time = startTime.toISOString();
            }
        }
        
        const result = await logAPI.getAll(params);
        totalLogs = result.total;
        renderLogs(result.data);
        updatePagination();
        
    } catch (error) {
        showToast('加载日志失败: ' + error.message, 'error');
        document.getElementById('logsTableBody').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--danger);">
                    加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

// 加载用户列表（用于筛选）
async function loadUsers() {
    try {
        // 从日志数据中提取用户，或者调用专门的API
        // 这里简化处理，实际项目中可能需要调用用户列表API
        const result = await logAPI.getAll({ page_size: 100 });
        const userMap = new Map();
        
        result.data.forEach(log => {
            if (log.user_id && !userMap.has(log.user_id)) {
                userMap.set(log.user_id, log.user_name);
            }
        });
        
        users = Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
        
        // 更新用户筛选下拉框
        const userFilter = document.getElementById('userFilter');
        if (userFilter) {
            const options = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
            userFilter.innerHTML = '<option value="">全部用户</option>' + options;
        }
        
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 渲染日志表格
function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    暂无操作记录
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        const actionClass = getActionClass(log.action_type);
        const actionText = getActionText(log.action_type);
        
        return `
            <tr>
                <td class="time-cell">${formatDateTimeShort(log.created_at)}</td>
                <td>
                    <div class="user-info-cell">
                        <div class="avatar">${(log.user_name || '?')[0]}</div>
                        <span>${log.user_name || '未知用户'}</span>
                    </div>
                </td>
                <td>
                    <span class="action-badge ${actionClass}">${actionText}</span>
                </td>
                <td>
                    <div class="equipment-info">
                        <span class="name">${log.equipment_name || '未知器材'}</span>
                    </div>
                </td>
                <td>
                    ${log.purpose ? `<div>用途: ${log.purpose}</div>` : ''}
                    ${log.expected_return_at ? `<div>预计归还: ${formatDate(log.expected_return_at)}</div>` : ''}
                    ${log.actual_return_at ? `<div>实际归还: ${formatDate(log.actual_return_at)}</div>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// 获取操作类型的样式类
function getActionClass(actionType) {
    const classMap = {
        'CHECKOUT': 'checkout',
        'CHECKIN': 'checkin',
        'CREATE': 'create',
        'UPDATE': 'create',
        'DELETE': 'delete',
    };
    return classMap[actionType] || '';
}

// 获取操作类型的显示文本
function getActionText(actionType) {
    const textMap = {
        'CHECKOUT': '出库',
        'CHECKIN': '入库',
        'CREATE': '新增',
        'UPDATE': '更新',
        'DELETE': '删除',
    };
    return textMap[actionType] || actionType;
}

// 更新分页
function updatePagination() {
    const totalPages = Math.ceil(totalLogs / pageSize);
    
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages || totalPages === 0;
}

// 切换页面
function changePage(delta) {
    const totalPages = Math.ceil(totalLogs / pageSize);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadLogs();
    }
}
