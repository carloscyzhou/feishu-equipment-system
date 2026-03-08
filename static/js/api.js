/**
 * API 调用封装模块
 * 统一管理所有后端API请求和错误处理
 */

const API_BASE_URL = '';  // 空表示相对路径

/**
 * 统一的请求封装
 * @param {string} url - 请求路径
 * @param {object} options - fetch选项
 * @returns {Promise} 响应数据
 */
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        credentials: 'same-origin'  // 同源请求时携带Cookie
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    // 自动序列化请求体
    if (mergedOptions.body && typeof mergedOptions.body === 'object') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
        
        // 解析响应
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        // 处理错误响应
        if (!response.ok) {
            const error = new Error(data.detail || data.message || '请求失败');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    } catch (error) {
        // 网络错误或解析错误
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('网络连接失败，请检查网络设置');
        }
        throw error;
    }
}

// ========== 日志API ==========

/**
 * 获取操作日志列表
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
async function getLogs(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    if (params.action_type) queryParams.append('action_type', params.action_type);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    if (params.equipment_id) queryParams.append('equipment_id', params.equipment_id);
    if (params.start_time) queryParams.append('start_time', params.start_time);
    if (params.end_time) queryParams.append('end_time', params.end_time);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/logs${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取指定器材的操作日志
 * @param {number} equipmentId - 器材ID
 * @param {object} params - 分页参数
 * @returns {Promise}
 */
async function getEquipmentLogs(equipmentId, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/logs/equipment/${equipmentId}${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取指定用户的操作日志
 * @param {number} userId - 用户ID
 * @param {object} params - 分页参数
 * @returns {Promise}
 */
async function getUserLogs(userId, params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/logs/user/${userId}${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取操作类型列表
 * @returns {Promise}
 */
async function getActionTypes() {
    return apiRequest('/api/logs/action-types');
}

// ========== 用户API ==========

/**
 * 获取用户列表
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
async function getUsers(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/users${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取当前用户信息
 * @returns {Promise}
 */
async function getCurrentUser() {
    return apiRequest('/api/auth/me');
}

// ========== 器材API ==========

/**
 * 获取器材列表
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
async function getEquipments(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.page_size) queryParams.append('page_size', params.page_size);
    if (params.model_id) queryParams.append('model_id', params.model_id);
    if (params.status !== undefined) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/equipments${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取器材详情
 * @param {number} id - 器材ID
 * @returns {Promise}
 */
async function getEquipment(id) {
    return apiRequest(`/api/equipments/${id}`);
}

/**
 * 创建器材
 * @param {object} data - 器材数据 {model_id, serial_numbers: []}
 * @returns {Promise}
 */
async function createEquipment(data) {
    return apiRequest('/api/equipments', {
        method: 'POST',
        body: data
    });
}

/**
 * 更新器材
 * @param {number} id - 器材ID
 * @param {object} data - 更新数据
 * @returns {Promise}
 */
async function updateEquipment(id, data) {
    return apiRequest(`/api/equipments/${id}`, {
        method: 'PUT',
        body: data
    });
}

/**
 * 更新型号
 * @param {number} id - 型号ID
 * @param {object} data - 更新数据
 * @returns {Promise}
 */
async function updateModel(id, data) {
    return apiRequest(`/api/models/${id}`, {
        method: 'PUT',
        body: data
    });
}

/**
 * 删除器材
 * @param {number} id - 器材ID
 * @returns {Promise}
 */
async function deleteEquipment(id) {
    return apiRequest(`/api/equipments/${id}`, {
        method: 'DELETE'
    });
}

/**
 * 通过条形码查询器材
 * @param {string} qrCode - 条形码内容
 * @returns {Promise}
 */
async function getEquipmentByQRCode(qrCode) {
    return apiRequest(`/api/equipments/by-qrcode?qr_code=${encodeURIComponent(qrCode)}`);
}

// ========== 器材型号API ==========

/**
 * 获取型号列表
 * @param {object} params - 查询参数
 * @returns {Promise}
 */
async function getModels(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.category_id) queryParams.append('category_id', params.category_id);
    
    const queryString = queryParams.toString();
    return apiRequest(`/api/models${queryString ? '?' + queryString : ''}`);
}

/**
 * 获取型号详情
 * @param {number} id - 型号ID
 * @returns {Promise}
 */
async function getModel(id) {
    return apiRequest(`/api/models/${id}`);
}

/**
 * 创建型号
 * @param {object} data - 型号数据
 * @returns {Promise}
 */
async function createModel(data) {
    return apiRequest('/api/models', {
        method: 'POST',
        body: data
    });
}

// ========== 分类API ==========

/**
 * 获取分类列表
 * @returns {Promise}
 */
async function getCategories() {
    return apiRequest('/api/categories');
}

/**
 * 创建分类
 * @param {object} data - 分类数据
 * @returns {Promise}
 */
async function createCategory(data) {
    return apiRequest('/api/categories', {
        method: 'POST',
        body: data
    });
}

/**
 * 更新分类
 * @param {number} id - 分类ID
 * @param {object} data - 更新数据
 * @returns {Promise}
 */
async function updateCategory(id, data) {
    return apiRequest(`/api/categories/${id}`, {
        method: 'PUT',
        body: data
    });
}

/**
 * 删除分类
 * @param {number} id - 分类ID
 * @returns {Promise}
 */
async function deleteCategory(id) {
    return apiRequest(`/api/categories/${id}`, {
        method: 'DELETE'
    });
}

// ========== 出入库API ==========

/**
 * 器材出库
 * @param {object} data - 出库数据 {equipment_ids, purpose, expected_return_at}
 * @returns {Promise}
 */
async function checkoutEquipment(data) {
    return apiRequest('/api/checkout', {
        method: 'POST',
        body: data
    });
}

/**
 * 器材入库
 * @param {object} data - 入库数据 {equipment_ids}
 * @returns {Promise}
 */
async function checkinEquipment(data) {
    return apiRequest('/api/checkin', {
        method: 'POST',
        body: data
    });
}

/**
 * 获取当前借出列表
 * @returns {Promise}
 */
async function getActiveCheckouts() {
    return apiRequest('/api/checkout/active');
}

// ========== 飞书扫码API ==========

/**
 * 获取飞书扫码配置
 * @returns {Promise}
 */
async function getScanConfig() {
    return apiRequest('/api/feishu/scan-config');
}

/**
 * 处理扫码结果
 * @param {object} data - {qr_code, mode}
 * @returns {Promise}
 */
async function processScan(data) {
    return apiRequest('/api/scan/process', {
        method: 'POST',
        body: data
    });
}

// ========== 认证API ==========

/**
 * 飞书登录
 * @param {string} code - 飞书授权码
 * @returns {Promise}
 */
async function loginWithFeishu(code) {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: { code }
    });
}

/**
 * 退出登录
 * @returns {Promise}
 */
async function logout() {
    return apiRequest('/api/auth/logout', {
        method: 'POST'
    });
}

// ========== 健康检查 ==========

/**
 * 健康检查
 * @returns {Promise}
 */
async function healthCheck() {
    return apiRequest('/api/health');
}

// 导出API模块（兼容ES模块和全局变量）
const API = {
    // 日志
    getLogs,
    getEquipmentLogs,
    getUserLogs,
    getActionTypes,
    
    // 用户
    getUsers,
    getCurrentUser,
    
    // 器材
    getEquipments,
    getEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    getEquipmentByQRCode,
    
    // 型号
    getModels,
    getModel,
    createModel,
    updateModel,
    deleteModel,
    
    // 分类
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    
    // 出入库
    checkoutEquipment,
    checkinEquipment,
    getActiveCheckouts,
    
    // 飞书
    getScanConfig,
    processScan,
    
    // 认证
    loginWithFeishu,
    logout,
    
    // 健康检查
    healthCheck,
    
    // 工具
    apiRequest
};

// 全局变量
window.API = API;
