import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchIcon,
  DownloadIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  Loader2Icon } from
'lucide-react';
import { OperationLog as OperationLogType, OperationType, User } from '../types';
import { formatDateTimeInTimeZone, useTimezone } from '../utils/timezone';

// 筛选用的操作类型（仅显示核心操作）
type FilterOperationType = '出库' | '分配' | '入库' | '交接' | '流转记录' | '编辑信息';

// 所有显示的操作类型
type DisplayOperationType = 
  | '出库' | '分配' | '入库' | '交接' | '流转记录' | '编辑信息'
  | '添加设备' | '修改设备' | '删除设备'
  | '添加分类' | '修改分类' | '删除分类'
  | '添加型号' | '修改型号' | '删除型号';

interface OperationLogPageProps {
  logs: OperationLogType[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    dateFrom?: string;
    dateTo?: string;
    operatorName?: string;
    holderName?: string;
    operationType?: FilterOperationType | '';
    search?: string;
    modelName?: string;
    deviceBarcode?: string;
  }) => void;
  getUniqueOperators: () => User[];
  exportLogs: (filters?: {
    dateFrom?: string;
    dateTo?: string;
    operatorName?: string;
    holderName?: string;
    operationType?: FilterOperationType | '';
    search?: string;
    modelName?: string;
    deviceBarcode?: string;
  }) => Promise<void>;
}

// 筛选下拉框仅显示核心选项（编辑信息包含9个编辑操作）
const operationTypes: FilterOperationType[] = ['出库', '分配', '入库', '交接', '流转记录', '编辑信息'];

function OperationBadge({ type }: { type: DisplayOperationType }) {
  const colors: Record<string, string> = {
    出库: 'bg-red-500/15 text-red-400 border-red-500/20',
    分配: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    入库: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    交接: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    流转记录: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    出入库: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    编辑信息: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    // 设备操作
    添加设备: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    删除设备: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    修改设备: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    // 分类操作
    添加分类: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
    删除分类: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    修改分类: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    // 型号操作
    添加型号: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    删除型号: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    修改型号: 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  };
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${colors[type] || 'bg-slate-700 text-slate-400 border-slate-600'}`}>
      {type}
    </span>
  );
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
/* ─── Autocomplete input ─── */
function NameAutocomplete({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
      wrapperRef.current &&
      !wrapperRef.current.contains(e.target as Node))
      {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const debouncedInput = useDebounce(inputValue, 250);
  useEffect(() => {
    onChange(debouncedInput);
  }, [debouncedInput, onChange]);
  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return options;
    const q = inputValue.toLowerCase();
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [inputValue, options]);
  const showDropdown = isFocused && filteredOptions.length > 0;
  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors pr-7" />

        {inputValue &&
        <button
          type="button"
          onClick={() => {
            setInputValue('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 transition-colors">

            <XIcon className="w-3 h-3" />
          </button>
        }
      </div>
      <AnimatePresence>
        {showDropdown &&
        <motion.div
          initial={{
            opacity: 0,
            y: 2
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          exit={{
            opacity: 0,
            y: 2
          }}
          transition={{
            duration: 0.12
          }}
          className="absolute z-20 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-36 overflow-y-auto">

            {filteredOptions.map((name) =>
          <button
            key={name}
            type="button"
            onClick={() => {
              setInputValue(name);
              onChange(name);
              setIsFocused(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors flex items-center gap-2">

                <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                  {name.charAt(0)}
                </span>
                {name}
              </button>
          )}
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}
export function OperationLogPage({
  logs,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onFilterChange,
  getUniqueOperators,
  exportLogs
}: OperationLogPageProps) {
  const isMobile = useIsMobile();
  const { timezone } = useTimezone();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [operationType, setOperationType] = useState<FilterOperationType | ''>('');
  const [modelName, setModelName] = useState('');
  const [deviceBarcode, setDeviceBarcode] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [operators, setOperators] = useState<User[]>([]);
  
  // 加载操作人列表
  useEffect(() => {
    let mounted = true;
    getUniqueOperators().then(users => {
      if (mounted) setOperators(users);
    });
    return () => { mounted = false; };
  }, [getUniqueOperators]);
  
  const stableSetOperatorName = useCallback((val: string) => {
    setOperatorName(val);
  }, []);
  const stableSetHolderName = useCallback((val: string) => {
    setHolderName(val);
  }, []);
  const operatorNameOptions = useMemo(() =>
  Array.from(new Set(operators.map((u) => u.name).filter(Boolean))).sort((a, b) =>
  a.localeCompare(b, 'zh-CN')),
  [operators]
  );
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (operatorName) count++;
    if (holderName) count++;
    if (operationType) count++;
    if (modelName) count++;
    if (deviceBarcode) count++;
    return count;
  }, [dateFrom, dateTo, operatorName, holderName, operationType, modelName, deviceBarcode]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 使用 ref 保存最新的 onFilterChange 引用，避免 useEffect 循环
  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;
  
  // 使用 ref 追踪是否已经发送过初始请求
  const hasInitialized = useRef(false);
  
  // 防抖的筛选状态
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedModelName, setDebouncedModelName] = useState(modelName);
  const [debouncedDeviceBarcode, setDebouncedDeviceBarcode] = useState(deviceBarcode);
  const [debouncedOperatorName, setDebouncedOperatorName] = useState(operatorName);
  const [debouncedHolderName, setDebouncedHolderName] = useState(holderName);
  
  // 防抖处理文本输入
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedModelName(modelName), 300);
    return () => clearTimeout(timer);
  }, [modelName]);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDeviceBarcode(deviceBarcode), 300);
    return () => clearTimeout(timer);
  }, [deviceBarcode]);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedOperatorName(operatorName), 300);
    return () => clearTimeout(timer);
  }, [operatorName]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHolderName(holderName), 300);
    return () => clearTimeout(timer);
  }, [holderName]);

  // 当筛选条件变化时，通知父组件
  useEffect(() => {
    // 只有在初始化后才发送筛选请求，避免重复加载
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    
    onFilterChangeRef.current({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      operatorName: debouncedOperatorName || undefined,
      holderName: debouncedHolderName || undefined,
      operationType: operationType || undefined,
      search: debouncedSearch || undefined,
      modelName: debouncedModelName || undefined,
      deviceBarcode: debouncedDeviceBarcode || undefined
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, dateFrom, dateTo, debouncedOperatorName, debouncedHolderName, operationType, debouncedModelName, debouncedDeviceBarcode]);

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await exportLogs({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        operatorName: operatorName || undefined,
        holderName: holderName || undefined,
        operationType: operationType || undefined,
        search: search || undefined,
        modelName: modelName || undefined,
        deviceBarcode: deviceBarcode || undefined,
      });
    } catch (error: any) {
      alert('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setIsExporting(false);
    }
  };
  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setOperatorName('');
    setHolderName('');
    setOperationType('');
    setModelName('');
    setDeviceBarcode('');
    setSearch('');
  };
  const formatTime = (timestamp: string) => {
    return formatDateTimeInTimeZone(timestamp, timezone, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const formatFullTime = (timestamp: string) => {
    return formatDateTimeInTimeZone(timestamp, timezone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-0 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">操作日志</h2>
          <p className="text-sm text-slate-500">
            共{' '}
            <span className="text-slate-300 font-mono">
              {total}
            </span>{' '}
            条记录
            <span className="ml-2 text-slate-600">时区: {timezone}</span>
            {isLoading && <span className="ml-2 text-amber-500">加载中...</span>}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

          {isExporting ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
          <span className="hidden sm:inline">{isExporting ? '导出中...' : '导出Excel'}</span>
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索设备名称、编码、操作人或持有人..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-colors" />

        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors relative ${showFilters ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'}`}>

          <FilterIcon className="w-4 h-4" />
          <span className="hidden sm:inline">筛选</span>
          {activeFilterCount > 0 &&
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-900 text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          }
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters &&
        <motion.div
          initial={{
            height: 0,
            opacity: 0
          }}
          animate={{
            height: 'auto',
            opacity: 1
          }}
          exit={{
            height: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.2
          }}
          className="overflow-hidden">

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              {/* Date range - 手机上堆叠，桌面并排 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="min-w-0">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full min-w-0 appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full min-w-0 appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              
              {/* 其他筛选条件 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">

              {/* Operator - autocomplete with debounce */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">
                  操作人
                </label>
                <NameAutocomplete
                value={operatorName}
                onChange={stableSetOperatorName}
                options={operatorNameOptions}
                placeholder="输入操作人姓名" />

              </div>

              {/* Holder */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] text-slate-500 mb-1">
                  设备持有人
                </label>
                <NameAutocomplete
                value={holderName}
                onChange={stableSetHolderName}
                options={operatorNameOptions}
                placeholder="输入持有人姓名" />

              </div>

              {/* Operation type */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">
                  操作类型
                </label>
                <select
                value={operationType}
                onChange={(e) =>
                setOperationType(e.target.value as FilterOperationType | '')
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors">

                  <option value="">全部</option>
                  {operationTypes.map((t) =>
                <option key={t} value={t}>
                      {t}
                    </option>
                )}
                </select>
              </div>

              {/* Model name */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">
                  器材型号
                </label>
                <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="如：Canon R5"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors" />

              </div>

              {/* Device barcode */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">
                  设备编号
                </label>
                <input
                type="text"
                value={deviceBarcode}
                onChange={(e) => setDeviceBarcode(e.target.value)}
                placeholder="如：CAM-001"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-colors" />

              </div>

              {/* Reset */}
              <div className="sm:col-span-2 lg:col-span-12 flex justify-end pt-1">
                <button
                onClick={handleReset}
                disabled={activeFilterCount === 0 && !search}
                className="px-4 py-1.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">

                  重置所有筛选
                </button>
              </div>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      {/* Desktop Table */}
      {!isMobile ?
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  时间
                </th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  操作人
                </th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  设备持有人
                </th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  操作类型
                </th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  设备信息
                </th>
                <th className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                  备注
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) =>
            <motion.tr
              key={log.id}
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              transition={{
                delay: index * 0.03
              }}
              className="border-b border-slate-800/50 last:border-0">

                  <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                    {formatFullTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {log.operator.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {log.holderName || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <OperationBadge type={log.operationType as DisplayOperationType} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate">
                    {log.deviceInfo}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                    {log.remark}
                  </td>
                </motion.tr>
            )}
              {logs.length === 0 && !isLoading &&
            <tr>
                  <td
                colSpan={6}
                className="text-center py-12 text-slate-600 text-sm">

                    暂无匹配的操作记录
                  </td>
                </tr>
            }
              {isLoading &&
            <tr>
                  <td
                colSpan={6}
                className="text-center py-12 text-slate-600 text-sm">

                    <Loader2Icon className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
            }
            </tbody>
          </table>
          </div>
        </div> /* Mobile Card Layout */ :

      <div className="flex-1 overflow-auto space-y-2 min-h-0">
          {logs.map((log, index) =>
        <motion.div
          key={log.id}
          initial={{
            opacity: 0,
            y: 6
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: index * 0.03
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">

              <div className="flex items-center justify-between mb-2">
                <OperationBadge type={log.operationType as DisplayOperationType} />
                <span className="text-[11px] font-mono text-slate-500">
                  {formatTime(log.timestamp)}
                </span>
              </div>
              <div className="text-sm text-slate-200 mb-1">
                {log.deviceInfo}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  操作人: {log.operator.name}
                </span>
                <span className="text-[11px] text-slate-600 truncate max-w-[50%] text-right">
                  {log.remark}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                设备持有人: {log.holderName || '-'}
              </div>
            </motion.div>
        )}
          {logs.length === 0 && !isLoading &&
        <div className="text-center py-12 text-slate-600 text-sm">
              暂无匹配的操作记录
            </div>
        }
          {isLoading &&
        <div className="text-center py-12 text-slate-600 text-sm">
              <Loader2Icon className="w-6 h-6 animate-spin mx-auto" />
            </div>
        }
        </div>
      }

      {/* Pagination */}
      {totalPages > 1 &&
      <div className="flex items-center justify-center gap-2 mt-4">
          <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">

            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400 font-mono">
            {page} / {totalPages}
          </span>
          <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || isLoading}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">

            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      }
    </div>);

}
