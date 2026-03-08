import { useState, useEffect, useCallback, useRef } from 'react';
import { logApi, LogListResponse, OperationLog as ApiOperationLog } from '../api';

// 所有操作类型（用于显示）
type OperationType = 
  | '出库' | '分配' | '入库' | '交接' | '流转记录' | '编辑信息'
  | '添加设备' | '修改设备' | '删除设备'
  | '添加分类' | '修改分类' | '删除分类'
  | '添加型号' | '修改型号' | '删除型号';

// 筛选用的操作类型
 type FilterOperationType = '出库' | '分配' | '入库' | '交接' | '流转记录' | '编辑信息';

export interface User {
  feishu_open_id: string;
  name: string;
  avatar?: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  operator: User;
  holderName?: string;
  operationType: OperationType;
  deviceInfo: string;
  remark: string;
}

// 映射后端操作类型到前端显示类型
// 后端返回的 action_type 已经是中文，直接透传
function mapActionType(actionType: string): OperationType {
  const mapping: Record<string, OperationType> = {
    '出库': '出库',
    'CHECKOUT': '出库',
    '分配': '分配',
    'ASSIGN': '分配',
    '入库': '入库',
    'CHECKIN': '入库',
    '交接': '交接',
    'TRANSFER': '交接',
    '添加设备': '添加设备',
    'CREATE': '添加设备',
    '修改设备': '修改设备',
    'UPDATE': '修改设备',
    '删除设备': '删除设备',
    'DELETE': '删除设备',
    '添加分类': '添加分类',
    'CREATE_CATEGORY': '添加分类',
    '修改分类': '修改分类',
    'UPDATE_CATEGORY': '修改分类',
    '删除分类': '删除分类',
    'DELETE_CATEGORY': '删除分类',
    '添加型号': '添加型号',
    'CREATE_MODEL': '添加型号',
    '修改型号': '修改型号',
    'UPDATE_MODEL': '修改型号',
    '删除型号': '删除型号',
    'DELETE_MODEL': '删除型号',
  };
  return mapping[actionType] || '编辑信息';
}

// 将前端筛选类型转换为后端 action_type
function getBackendActionType(type: FilterOperationType | ''): string | undefined {
  if (type === '出库') return 'CHECKOUT';
  if (type === '分配') return 'ASSIGN';
  if (type === '入库') return 'CHECKIN';
  if (type === '交接') return 'TRANSFER';
  if (type === '流转记录') return '出入库';  // 后端特殊处理：包含出库/分配/入库/交接
  if (type === '编辑信息') return 'EDIT';  // 后端会匹配所有9个编辑操作
  return undefined;
}

export interface LogFilters {
  dateFrom?: string;
  dateTo?: string;
  operatorName?: string;
  holderName?: string;
  operationType?: FilterOperationType | '';
  search?: string;
  modelName?: string;
  deviceBarcode?: string;
}

export function useOperationLog() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<LogFilters>({});
  const pageSize = 10;

  // 使用 ref 来避免重复请求和循环依赖
  const loadingRef = useRef(false);
  const filtersRef = useRef(currentFilters);
  const pageRef = useRef(currentPage);
  
  // 同步 ref
  filtersRef.current = currentFilters;
  pageRef.current = currentPage;

  // 加载日志数据（支持分页和筛选）
  const loadLogs = useCallback(async (params?: {
    filters?: LogFilters;
    page?: number;
    pageSize?: number;
  }) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const filters = params?.filters || filtersRef.current;
      const page = params?.page || pageRef.current;
      
      // 转换筛选参数
      const apiParams: any = {
        page,
        page_size: params?.pageSize || pageSize,
      };
      
      if (filters.operationType) {
        apiParams.action_type = getBackendActionType(filters.operationType);
      }
      if (filters.modelName) {
        apiParams.model_name = filters.modelName;
      }
      if (filters.deviceBarcode) {
        apiParams.serial_number = filters.deviceBarcode;
      }
      if (filters.dateFrom) {
        apiParams.start_date = filters.dateFrom + 'T00:00:00';
      }
      if (filters.dateTo) {
        apiParams.end_date = filters.dateTo + 'T23:59:59';
      }
      // operatorName 和 search 现在也传到后端筛选
      if (filters.operatorName) {
        apiParams.operator_name = filters.operatorName;
      }
      if (filters.holderName) {
        apiParams.holder_name = filters.holderName;
      }
      if (filters.search) {
        apiParams.search = filters.search;
      }
      
      const result = await logApi.getAll(apiParams);

      // 转换为前端格式
      const formattedLogs: OperationLog[] = result.data.map(log => ({
        id: String(log.id),
        timestamp: log.created_at,
        operator: {
          feishu_open_id: log.feishu_open_id,
          name: log.user_name || '未知用户',
        },
        holderName: log.holder_name || '-',
        operationType: mapActionType(log.action_type),
        deviceInfo: log.equipment_display || `设备 #${log.equipment_id}`,
        remark: log.purpose || '',
      }));

      // 注意：operatorName 和 search 筛选现在由后端处理

      setLogs(formattedLogs);
      setTotal(result.total);
      if (params?.page) setCurrentPage(params.page);
      if (params?.filters) setCurrentFilters(params.filters);
    } catch (err: any) {
      setError(err.message || '加载日志失败');
      console.error('Failed to load operation logs:', err);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []); // 空依赖数组，使用 ref 获取最新值

  // 初始化加载 - 只执行一次
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadLogs({ page: 1 });
    }
  }, [loadLogs]);

  // 更新筛选条件
  const updateFilters = useCallback((filters: LogFilters) => {
    setCurrentFilters(filters);
    setCurrentPage(1);
    loadLogs({ filters, page: 1 });
  }, [loadLogs]);

  // 更新页码
  const updatePage = useCallback((page: number) => {
    setCurrentPage(page);
    loadLogs({ page });
  }, [loadLogs]);

  // 获取唯一的操作人列表（从所有日志中，不仅仅是当前页）
  const getUniqueOperators = useCallback(async (): Promise<User[]> => {
    try {
      // 获取所有日志（不分页）来获取操作人列表
      const result = await logApi.getAll({ page_size: 100 });
      const seen = new Map<string, User>();
      for (const log of result.data) {
        const openId = log.feishu_open_id;
        if (!seen.has(openId)) {
          seen.set(openId, {
            feishu_open_id: openId,
            name: log.user_name || '未知用户',
          });
        }
      }
      return Array.from(seen.values());
    } catch (err) {
      console.error('Failed to get operators:', err);
      return [];
    }
  }, []);

  // 导出日志
  const exportLogs = useCallback(async (filters?: LogFilters) => {
    const activeFilters = filters || filtersRef.current;
    
    const apiParams: any = {};
    if (activeFilters.operationType) {
      apiParams.action_type = getBackendActionType(activeFilters.operationType);
    }
    if (activeFilters.modelName) {
      apiParams.model_name = activeFilters.modelName;
    }
    if (activeFilters.deviceBarcode) {
      apiParams.serial_number = activeFilters.deviceBarcode;
    }
    if (activeFilters.dateFrom) {
      apiParams.start_date = activeFilters.dateFrom + 'T00:00:00';
    }
    if (activeFilters.dateTo) {
      apiParams.end_date = activeFilters.dateTo + 'T23:59:59';
    }
    // operatorName 和 search 现在也传到后端筛选
    if (activeFilters.operatorName) {
      apiParams.operator_name = activeFilters.operatorName;
    }
    if (activeFilters.holderName) {
      apiParams.holder_name = activeFilters.holderName;
    }
    if (activeFilters.search) {
      apiParams.search = activeFilters.search;
    }
    // 注意：后端导出会导出所有符合条件的记录（不分页）
    
    await logApi.exportExcel(apiParams);
  }, []);

  return {
    logs,
    isLoading,
    error,
    total,
    page: currentPage,
    pageSize,
    filters: currentFilters,
    updatePage,
    updateFilters,
    refresh: () => loadLogs(),
    getUniqueOperators,
    exportLogs,
  };
}

export default useOperationLog;
