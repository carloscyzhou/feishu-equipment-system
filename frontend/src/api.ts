/**
 * API 服务层
 * 封装所有后端 API 调用
 */
import { getActiveTimeZone } from './utils/timezone';

// API 基础 URL - 使用相对路径，自动匹配当前域名
// 开发环境: Vite 代理会自动转发到 localhost:8001
// 生产环境: 通过 nginx 等反向代理到后端
const API_BASE_URL = '';  // 空字符串表示使用相对路径，即同一域名下

// 请求配置
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

/**
 * 基础请求函数
 */
async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  // 构建完整 URL
  let fullUrl = `${API_BASE_URL}${url}`;
  
  // 添加查询参数
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += `?${qs}`;
    }
  }
  
  // 默认配置
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Timezone': getActiveTimeZone(),
    },
    credentials: 'include', // 包含 cookies
  };
  
  // 合并配置
  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...fetchOptions,
    headers: {
      ...defaultOptions.headers,
      ...(fetchOptions.headers || {}),
    },
  };
  
  // 处理请求体
  if (mergedOptions.body && typeof mergedOptions.body === 'object') {
    mergedOptions.body = JSON.stringify(mergedOptions.body);
  }
  
  const response = await fetch(fullUrl, mergedOptions);
  
  // 解析响应
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  // 处理错误
  if (!response.ok) {
    const error = new Error(data.detail || data.message || '请求失败');
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }
  
  return data as T;
}

// ============ 认证相关 API ============

export interface UserInfo {
  id: number;
  name: string;
  avatar: string;
  open_id: string;
  user_id?: string;
}

export interface LoginResponse {
  success: boolean;
  user: UserInfo;
}

export interface FeishuConfig {
  app_id: string;
  jsapi_url: string;
}

export const authApi = {
  /**
   * 获取飞书登录配置
   */
  getFeishuConfig: () => apiRequest<FeishuConfig>('/api/auth/config'),
  
  /**
   * 飞书登录
   */
  login: (code: string) => apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { code },
  }),
  
  /**
   * 获取当前登录用户信息
   */
  getCurrentUser: () => apiRequest<UserInfo>('/api/auth/me'),
  
  /**
   * 退出登录
   */
  logout: () => apiRequest<{ success: boolean }>('/api/auth/logout', {
    method: 'POST',
  }),
};

// ============ 分类管理 API ============

export interface Category {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  sort_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  sort_order?: number;
}

export interface CategoryReorderRequest {
  category_ids: number[];
}

export const categoryApi = {
  /**
   * 获取所有分类
   */
  getAll: () => apiRequest<Category[]>('/api/categories'),
  
  /**
   * 创建分类
   */
  create: (data: CategoryCreate) => apiRequest<Category>('/api/categories', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 更新分类
   */
  update: (id: number, data: CategoryUpdate) => apiRequest<Category>(`/api/categories/${id}`, {
    method: 'PUT',
    body: data,
  }),
  
  /**
   * 删除分类
   */
  delete: (id: number) => apiRequest<{ success: boolean; message: string }>(`/api/categories/${id}`, {
    method: 'DELETE',
  }),
  
  /**
   * 重新排序分类
   */
  reorder: (data: CategoryReorderRequest) => apiRequest<{ success: boolean; message: string }>('/api/categories/reorder', {
    method: 'POST',
    body: data,
  }),
};

// ============ 器材型号 API ============

export interface EquipmentModel {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  total_count: number;
  available_count: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentModelCreate {
  category_id: number;
  name: string;
  description?: string;
  total_count?: number;
}

export interface EquipmentModelUpdate {
  category_id?: number;
  name?: string;
  description?: string;
  total_count?: number;
}

export interface ModelReorderRequest {
  category_id: number;
  model_ids: number[];
}

export const modelApi = {
  /**
   * 获取型号列表
   */
  getAll: (categoryId?: number) => apiRequest<EquipmentModel[]>('/api/models', {
    params: categoryId ? { category_id: categoryId } : undefined,
  }),
  
  /**
   * 获取型号详情
   */
  getById: (id: number) => apiRequest<EquipmentModel>(`/api/models/${id}`),
  
  /**
   * 创建型号
   */
  create: (data: EquipmentModelCreate) => apiRequest<EquipmentModel>('/api/models', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 更新型号
   */
  update: (id: number, data: EquipmentModelUpdate) => apiRequest<EquipmentModel>(`/api/models/${id}`, {
    method: 'PUT',
    body: data,
  }),
  
  /**
   * 删除型号
   */
  delete: (id: number) => apiRequest<{ success: boolean; message: string }>(`/api/models/${id}`, {
    method: 'DELETE',
  }),
  
  /**
   * 重新排序型号
   */
  reorder: (data: ModelReorderRequest) => apiRequest<{ success: boolean; message: string }>('/api/models/reorder', {
    method: 'POST',
    body: data,
  }),
};

// ============ 器材实例 API ============

export interface Equipment {
  id: number;
  model_id: number;
  model_name?: string;
  serial_number?: string;
  qr_code?: string;
  status: number; // 0: 在库, 1: 借出
  current_user_id?: number;
  current_user_name?: string;
  checkout_time?: string;
  purpose?: string;
  expected_return_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCreate {
  model_id: number;
  serial_numbers: string[];
}

export interface EquipmentUpdate {
  model_id?: number;
  serial_number?: string;
  qr_code?: string;
  status?: number;
}

export interface EquipmentListResponse {
  total: number;
  page: number;
  page_size: number;
  data: Equipment[];
}

export interface DeviceReorderRequest {
  model_id: number;
  device_ids: number[];
}

export interface DeviceReorderRequest {
  model_id: number;
  device_ids: number[];
}

export const equipmentApi = {
  /**
   * 获取器材列表
   */
  getAll: (params?: { model_id?: number; status?: number; current_user_id?: number; page?: number; page_size?: number }) => 
    apiRequest<EquipmentListResponse>('/api/equipments', { 
      params: { ...params, page_size: params?.page_size || 100 } 
    }),
  
  /**
   * 获取器材详情
   */
  getById: (id: number) => apiRequest<Equipment>(`/api/equipments/${id}`),
  
  /**
   * 通过条形码查询器材
   */
  getByQRCode: (qrCode: string) => apiRequest<any>(`/api/equipments/by-qrcode`, {
    params: { qr_code: qrCode },
  }),
  
  /**
   * 批量创建器材
   */
  create: (data: EquipmentCreate) => apiRequest<{ success: boolean; count: number; data: Array<{ id: number; serial_number: string; qr_code: string }> }>('/api/equipments', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 更新器材
   */
  update: (id: number, data: EquipmentUpdate) => apiRequest<{ success: boolean; message: string; equipment: Equipment }>(`/api/equipments/${id}`, {
    method: 'PUT',
    body: data,
  }),
  
  /**
   * 删除器材
   */
  delete: (id: number) => apiRequest<{ success: boolean; message: string }>(`/api/equipments/${id}`, {
    method: 'DELETE',
  }),
  
  /**
   * 重新排序设备
   */
  reorder: (data: DeviceReorderRequest) => apiRequest<{ success: boolean; message: string }>('/api/equipments/reorder', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 导出设备列表为 Excel
   */
  exportExcel: async (params?: { model_id?: number; status?: number; current_user_id?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.model_id) queryParams.append('model_id', String(params.model_id));
    if (params?.status !== undefined) queryParams.append('status', String(params.status));
    if (params?.current_user_id) queryParams.append('current_user_id', String(params.current_user_id));
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/equipments/export${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Timezone': getActiveTimeZone(),
      },
    });
    
    if (!response.ok) {
      let errorMessage = '导出失败';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || '导出失败';
        } else {
          errorMessage = await response.text() || '导出失败';
        }
      } catch (e) {
        errorMessage = `导出失败 (HTTP ${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    // 确保 blob 有正确的 MIME 类型
    const blob = await response.blob();
    const excelBlob = new Blob([blob], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const contentDisposition = response.headers.get('content-disposition');
    console.log('Content-Disposition:', contentDisposition);
    
    // 支持 filename="xxx" 和 filename*=UTF-8''xxx 格式
    let filename = '设备清单.xlsx';
    if (contentDisposition) {
      // 先尝试匹配 filename*=UTF-8''xxx 格式（非贪婪匹配）
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
        console.log('Parsed UTF-8 filename:', filename);
      } else {
        // 回退到 filename="xxx" 格式
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
          console.log('Parsed ASCII filename:', filename);
        }
      }
    }
    
    // 确保文件名有 .xlsx 扩展名
    if (!filename.endsWith('.xlsx')) {
      filename += '.xlsx';
    }
    
    // 触发下载
    const url_obj = window.URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url_obj;
    a.download = filename;
    console.log('Downloading file:', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url_obj);
    
    return excelBlob;
  },
};

// ============ 出入库 API ============

export interface CheckoutRequest {
  equipment_ids: number[];
  purpose: string;
  expected_return_at?: string;
  assignees?: Array<{
    equipment_id: number;
    user_id: number;
  }>;
}

export interface CheckinRequest {
  equipment_ids: number[];
}

export interface TransferRequest {
  equipment_ids: number[];
  receiver_user_id: number;
  transfer_reason: string;
  expected_return_at?: string;
}

export interface CheckoutResponse {
  success: boolean;
  data: {
    success: Array<{ id: number; name: string; serial_number?: string }>;
    failed: Array<{ id: number; name?: string; reason: string }>;
  };
  message: string;
}

export interface ActiveCheckout {
  equipment_id: number;
  model_name: string;
  serial_number?: string;
  qr_code?: string;
  current_user_id?: number;
  current_user_name?: string;
  checkout_time?: string;
  purpose?: string;
  expected_return_at?: string;
}

export const checkoutApi = {
  /**
   * 批量出库
   */
  checkout: (data: CheckoutRequest) => apiRequest<CheckoutResponse>('/api/checkout', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 批量入库
   */
  checkin: (data: CheckinRequest) => apiRequest<CheckoutResponse>('/api/checkin', {
    method: 'POST',
    body: data,
  }),

  /**
   * 批量交接
   */
  transfer: (data: TransferRequest) => apiRequest<CheckoutResponse>('/api/transfer', {
    method: 'POST',
    body: data,
  }),
  
  /**
   * 获取当前借出列表
   */
  getActiveCheckouts: () => apiRequest<{ total: number; data: ActiveCheckout[] }>('/api/checkout/active'),
};

// ============ 扫码 API ============

export interface ScanConfig {
  app_id: string;
  timestamp: string;
  nonceStr: string;
  signature: string;
  scan_type: string[];
}

export interface ScanProcessRequest {
  qr_code: string;
  mode: 'checkout' | 'checkin' | 'transfer';
}

export interface ScanProcessResponse {
  success: boolean;
  message: string;
  can_proceed: boolean;
  equipment?: {
    id: number;
    model_name: string;
    serial_number?: string;
    qr_code?: string;
    status: number;
    current_user_id?: number;
    current_user_name?: string;
    checkout_time?: string;
    purpose?: string;
    category_name?: string;
  };
}

export const scanApi = {
  /**
   * 获取飞书扫码配置
   */
  getScanConfig: (pageUrl?: string) => apiRequest<ScanConfig>('/api/feishu/scan-config', {
    params: pageUrl ? { page_url: pageUrl } : undefined,
  }),
  
  /**
   * 处理扫码结果
   */
  processScan: (data: ScanProcessRequest) => apiRequest<ScanProcessResponse>('/api/scan/process', {
    method: 'POST',
    body: data,
  }),
};

// ============ 操作日志 API ============

export interface OperationLog {
  id: number;
  equipment_id: number;
  equipment_serial?: string;
  equipment_model_name?: string;
  equipment_display: string;
  feishu_open_id: string;
  feishu_user_id?: string;
  user_name?: string;
  holder_name?: string;
  action_type: string;
  purpose?: string;
  expected_return_at?: string;
  actual_return_at?: string;
  created_at: string;
}

export interface LogListResponse {
  total: number;
  page: number;
  page_size: number;
  data: OperationLog[];
}

export const logApi = {
  /**
   * 获取操作日志列表
   */
  getAll: (params?: {
    action_type?: string;
    equipment_id?: number;
    user_id?: number;
    serial_number?: string;
    model_name?: string;
    operator_name?: string;
    holder_name?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => apiRequest<LogListResponse>('/api/logs', { params }),
  
  /**
   * 获取指定器材的操作日志
   */
  getEquipmentLogs: (equipmentId: number, page?: number, pageSize?: number) => 
    apiRequest<LogListResponse>(`/api/logs/equipment/${equipmentId}`, {
      params: { page, page_size: pageSize },
    }),
  
  /**
   * 获取指定用户的操作日志
   */
  getUserLogs: (feishuOpenId: string, page?: number, pageSize?: number) => 
    apiRequest<LogListResponse>(`/api/logs/user/${feishuOpenId}`, {
      params: { page, page_size: pageSize },
    }),
  
  /**
   * 导出操作日志为 Excel
   */
  exportExcel: async (params?: {
    action_type?: string;
    equipment_id?: number;
    user_id?: number;
    serial_number?: string;
    model_name?: string;
    operator_name?: string;
    holder_name?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.action_type) queryParams.append('action_type', params.action_type);
    if (params?.equipment_id) queryParams.append('equipment_id', String(params.equipment_id));
    if (params?.user_id) queryParams.append('user_id', String(params.user_id));
    if (params?.serial_number) queryParams.append('serial_number', params.serial_number);
    if (params?.model_name) queryParams.append('model_name', params.model_name);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.operator_name) queryParams.append('operator_name', params.operator_name);
    if (params?.holder_name) queryParams.append('holder_name', params.holder_name);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/api/logs/export${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Timezone': getActiveTimeZone(),
      },
    });
    
    if (!response.ok) {
      let errorMessage = '导出失败';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.detail || error.message || '导出失败';
        } else {
          errorMessage = await response.text() || '导出失败';
        }
      } catch (e) {
        errorMessage = `导出失败 (HTTP ${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    // 确保 blob 有正确的 MIME 类型
    const blob = await response.blob();
    const excelBlob = new Blob([blob], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const contentDisposition = response.headers.get('content-disposition');
    console.log('Content-Disposition:', contentDisposition);
    
    // 支持 filename="xxx" 和 filename*=UTF-8''xxx 格式
    let filename = '操作日志.xlsx';
    if (contentDisposition) {
      // 先尝试匹配 filename*=UTF-8''xxx 格式（非贪婪匹配，避免捕获后续参数）
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
        console.log('Parsed UTF-8 filename:', filename);
      } else {
        // 回退到 filename="xxx" 格式
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
          filename = match[1];
          console.log('Parsed ASCII filename:', filename);
        }
      }
    }
    
    // 确保文件名有 .xlsx 扩展名
    if (!filename.endsWith('.xlsx')) {
      filename += '.xlsx';
    }
    
    // 触发下载
    const url_obj = window.URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url_obj;
    a.download = filename;
    console.log('Downloading file:', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url_obj);
    
    return excelBlob;
  },
};

// ============ 用户 API ============

export interface User {
  id: number;
  name: string;
  avatar_url?: string;
  feishu_open_id: string;
  feishu_user_id?: string;
  created_at?: string;
}

export interface UserListResponse {
  total: number;
  page: number;
  page_size: number;
  data: User[];
}

export const userApi = {
  /**
   * 获取用户列表
   */
  getAll: (page?: number, pageSize?: number) => apiRequest<UserListResponse>('/api/users', {
    params: { page, page_size: pageSize },
  }),
};

// ============ 健康检查 API ============

export const healthApi = {
  /**
   * 健康检查
   */
  check: () => apiRequest<{ status: string; timestamp: string }>('/api/health'),
};

// ============ 飞书 JSAPI 配置 ============

// 飞书 JSAPI URL
export const FEISHU_JSAPI_URL = 'https://lf-package-cn.feishucdn.com/obj/feishu-static/lark/op/h5-js-sdk-1.5.35.js';

export default {
  auth: authApi,
  category: categoryApi,
  model: modelApi,
  equipment: equipmentApi,
  checkout: checkoutApi,
  scan: scanApi,
  log: logApi,
  user: userApi,
  health: healthApi,
  FEISHU_JSAPI_URL,
};
