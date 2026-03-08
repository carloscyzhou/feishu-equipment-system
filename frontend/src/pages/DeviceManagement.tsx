import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SearchIcon,
  PlusIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronsDownUpIcon,
  DownloadIcon,
  FolderPlusIcon,
  BoxIcon,
  CpuIcon,
  ChevronDownIcon,
  UserIcon,
  XIcon } from
'lucide-react';
import { DeviceTree } from '../components/DeviceTree';
import { equipmentApi, userApi, User } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  SimpleInputModal,
  AddModelModal,
  BatchDeviceForm,
  EditDeviceForm } from
'../components/DeviceForm';
import { Category, EquipmentModel, Device, OperationType } from '../types';

type LogOperator = {
  feishu_open_id: string;
  name: string;
  avatar?: string;
};
interface DeviceManagementProps {
  categories: Category[];
  isLoading?: boolean;
  error?: string | null;
  refresh?: () => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addModel: (categoryId: string, name: string) => void;
  updateModel: (modelId: string, name: string) => void;
  deleteModel: (categoryId: string, modelId: string) => void;
  addDevice: (modelId: string, barcodeId: string) => void;
  updateDevice: (deviceId: string, barcodeId: string) => void;
  deleteDevice: (modelId: string, deviceId: string) => void;
  addLog: (
  operator: LogOperator,
  type: OperationType,
  deviceInfo: string,
  remark: string)
  => void;
  getStats: () => {
    total: number;
    inStock: number;
    checkedOut: number;
    categories: number;
  };
  reorderCategories?: (categoryIds: string[]) => Promise<boolean>;
  reorderModels?: (categoryId: string, modelIds: string[]) => Promise<boolean>;
  checkBarcodeExists?: (barcodeId: string) => boolean;
  getExistingBarcodes?: () => string[];
}
export function DeviceManagement({
  categories,
  isLoading,
  error,
  refresh,
  addCategory,
  updateCategory,
  deleteCategory,
  addModel,
  updateModel,
  deleteModel,
  addDevice,
  updateDevice,
  deleteDevice,
  addLog,
  getStats,
  reorderCategories,
  reorderModels,
  checkBarcodeExists,
  getExistingBarcodes
}: DeviceManagementProps) {
  const { user: authUser } = useAuth();
  const currentOperator: LogOperator = {
    feishu_open_id: authUser?.open_id || '',
    name: authUser?.name || '未知用户',
    avatar: authUser?.avatar,
  };

  type StatusFilter = 'all' | '在库' | '出库';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // User filter state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Load users on mount
  useEffect(() => {
    userApi.getAll(1, 100).then(result => {
      setUsers(result.data);
    }).catch(console.error);
  }, []);
  
  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q));
  }, [users, userSearchQuery]);
  
  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);
  
  const toggleStatusFilter = (target: Exclude<StatusFilter, 'all'>) => {
    setStatusFilter((prev) => (prev === target ? 'all' : target));
  };
  const resetToAllDevices = () => {
    setStatusFilter('all');
    setSelectedUser(null);
    setUserSearchQuery('');
  };

  // Filter categories by selected user / status
  const filteredCategories = useMemo(() => {
    if (!selectedUser && statusFilter === 'all') {
      return categories;
    }

    const selectedUserId = selectedUser ? String(selectedUser.id) : null;

    return categories.map(cat => ({
      ...cat,
      models: cat.models.map(model => ({
        ...model,
        devices: model.devices.filter((device) => {
          const matchesUser =
            !selectedUserId ||
            String(device.checkoutRecord?.borrower.id || '') === selectedUserId;
          const matchesStatus =
            statusFilter === 'all' || device.status === statusFilter;
          return matchesUser && matchesStatus;
        }),
      })).filter(model => model.devices.length > 0)
    })).filter(cat => cat.models.length > 0);
  }, [categories, selectedUser, statusFilter]);
  
  // Expand/collapse state (controlled at page level)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };
  const toggleModel = (id: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  };
  const expandAll = () => {
    setExpandedCategories(new Set(categories.map((c) => c.id)));
    setExpandedModels(
      new Set(categories.flatMap((c) => c.models.map((m) => m.id)))
    );
  };
  const collapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedModels(new Set());
  };
  const isAllExpanded =
  categories.length > 0 &&
  categories.every((c) => expandedCategories.has(c.id)) &&
  categories.every((c) => c.models.every((m) => expandedModels.has(m.id)));
  // Add dropdown
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
      addDropdownRef.current &&
      !addDropdownRef.current.contains(e.target as Node))
      {
        setShowAddDropdown(false);
      }
    };
    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddDropdown]);
  // Modal states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddModel, setShowAddModel] = useState(false);
  const [addModelInitialCatId, setAddModelInitialCatId] = useState('');
  const [editingModel, setEditingModel] = useState<EquipmentModel | null>(null);
  const [showAddDeviceFull, setShowAddDeviceFull] = useState(false);
  const [addDeviceModelId, setAddDeviceModelId] = useState<string | null>(null);
  const [addDeviceModelName, setAddDeviceModelName] = useState('');
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const stats = useMemo(() => getStats(), [getStats]);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      const exportParams =
        statusFilter === 'all'
          ? undefined
          : { status: statusFilter === '在库' ? 0 : 1 };
      await equipmentApi.exportExcel(exportParams);
    } catch (error: any) {
      alert('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">设备管理</h2>
          <p className="text-sm text-slate-500">
            管理所有器材分类、型号和设备编号
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

          <DownloadIcon className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isExporting ? '导出中...' : '导出Excel'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0
          }}
          role="button"
          tabIndex={0}
          onClick={resetToAllDevices}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              resetToAllDevices();
            }
          }}
          className={`bg-slate-900 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
            statusFilter === 'all'
              ? 'border-slate-500/80 ring-1 ring-slate-400/40'
              : 'border-slate-800 hover:border-slate-600/70'
          }`}>

          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
            总设备
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {stats.total}
          </div>
        </motion.div>
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.05
          }}
          role="button"
          tabIndex={0}
          onClick={() => toggleStatusFilter('在库')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleStatusFilter('在库');
            }
          }}
          className={`bg-slate-900 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
            statusFilter === '在库'
              ? 'border-emerald-500/70 ring-1 ring-emerald-500/40'
              : 'border-slate-800 hover:border-emerald-500/40'
          }`}>

          <div className="flex items-center gap-1 text-[11px] text-emerald-500 uppercase tracking-wider mb-1">
            <ArrowDownIcon className="w-3 h-3" />
            在库
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats.inStock}
          </div>
        </motion.div>
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.1
          }}
          role="button"
          tabIndex={0}
          onClick={() => toggleStatusFilter('出库')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleStatusFilter('出库');
            }
          }}
          className={`bg-slate-900 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
            statusFilter === '出库'
              ? 'border-amber-500/70 ring-1 ring-amber-500/40'
              : 'border-slate-800 hover:border-amber-500/40'
          }`}>

          <div className="flex items-center gap-1 text-[11px] text-amber-500 uppercase tracking-wider mb-1">
            <ArrowUpIcon className="w-3 h-3" />
            出库
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {stats.checkedOut}
          </div>
        </motion.div>
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.15
          }}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">

          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">
            分类
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {stats.categories}
          </div>
        </motion.div>
      </div>

      {/* Search + Actions */}
      <div className="flex gap-2 mb-4">
        {/* User search - shows borrowed devices */}
        <div className="relative w-32 shrink-0" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full flex items-center gap-1.5 px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate flex-1 text-left">
              {selectedUser ? selectedUser.name : '按借用人'}
            </span>
            {selectedUser ? (
              <XIcon 
                className="w-3 h-3 text-slate-500 hover:text-slate-300 shrink-0" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUser(null);
                  setUserSearchQuery('');
                }}
              />
            ) : (
              <ChevronDownIcon className="w-3 h-3 text-slate-500 shrink-0" />
            )}
          </button>
          
          <AnimatePresence>
            {showUserDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 top-full mt-1 z-30 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                {/* User search input */}
                <div className="p-2 border-b border-slate-700">
                  <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="搜索用户名..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      autoFocus
                    />
                  </div>
                </div>
                {/* User list */}
                <div className="max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 text-center">
                      无匹配用户
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserDropdown(false);
                          setUserSearchQuery('');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                          selectedUser?.id === user.id ? 'bg-slate-700 text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                          {user.name.charAt(0)}
                        </span>
                        <span className="truncate">{user.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Device search input */}
        <div className="relative flex-1 min-w-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索设备..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-colors" />
        </div>

        <div className="flex gap-2 shrink-0">
          {/* Expand/Collapse toggle */}
          <button
            onClick={isAllExpanded ? collapseAll : expandAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-sm hover:text-slate-200 hover:bg-slate-800 transition-colors flex-shrink-0"
            title={isAllExpanded ? '全部收起' : '全部展开'}>

            {isAllExpanded ?
            <ChevronsDownUpIcon className="w-4 h-4" /> :

            <ChevronsUpDownIcon className="w-4 h-4" />
            }
            <span className="hidden sm:inline text-xs">
              {isAllExpanded ? '收起' : '展开'}
            </span>
          </button>

          {/* Add dropdown */}
          <div className="relative" ref={addDropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors flex-shrink-0">

              <PlusIcon className="w-4 h-4" />
              添加
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showAddDropdown &&
              <motion.div
                initial={{
                  opacity: 0,
                  y: 4,
                  scale: 0.95
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  y: 4,
                  scale: 0.95
                }}
                transition={{
                  duration: 0.12
                }}
                className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">

                  <button
                  onClick={() => {
                    setShowAddDropdown(false);
                    setShowAddCategory(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors">

                    <FolderPlusIcon className="w-4 h-4 text-amber-500" />
                    添加分类
                  </button>
                  <button
                  onClick={() => {
                    setShowAddDropdown(false);
                    setAddModelInitialCatId('');
                    setShowAddModel(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors">

                    <BoxIcon className="w-4 h-4 text-sky-400" />
                    添加型号
                  </button>
                  <button
                  onClick={() => {
                    setShowAddDropdown(false);
                    setShowAddDeviceFull(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors">

                    <CpuIcon className="w-4 h-4 text-emerald-400" />
                    添加设备
                  </button>
                </motion.div>
              }
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Loading / Error State */}
      {isLoading && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">加载数据中...</p>
        </div>
      )}
      
      {error && !isLoading && (
        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          {refresh && (
            <button
              onClick={refresh}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm hover:bg-slate-700 transition-colors"
            >
              重新加载
            </button>
          )}
        </div>
      )}
      
      {/* Tree */}
      {!isLoading && !error && (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4">
        <DeviceTree
          categories={filteredCategories}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          expandedCategories={expandedCategories}
          expandedModels={expandedModels}
          onToggleCategory={toggleCategory}
          onToggleModel={toggleModel}
          onAddCategory={() => setShowAddCategory(true)}
          onEditCategory={(cat) => setEditingCategory(cat)}
          onDeleteCategory={(catId) => {
            const cat = categories.find((c) => c.id === catId);
            if (
            cat &&
            window.confirm(`确定删除分类"${cat.name}"及其所有设备吗？`))
            {
              deleteCategory(catId);
              addLog(currentOperator, '删除分类', cat.name, '删除设备分类');
            }
          }}
          onAddModel={(catId) => {
            setAddModelInitialCatId(catId);
            setShowAddModel(true);
          }}
          onEditModel={(model) => setEditingModel(model)}
          onDeleteModel={(catId, modId) => {
            const cat = categories.find((c) => c.id === catId);
            const model = cat?.models.find((m) => m.id === modId);
            if (
            model &&
            window.confirm(`确定删除型号"${model.name}"及其所有设备吗？`))
            {
              deleteModel(catId, modId);
              addLog(
                currentOperator,
                '删除设备',
                model.name,
                '删除设备型号及所有设备'
              );
            }
          }}
          onAddDevice={(modId) => {
            const model = categories.
            flatMap((c) => c.models).
            find((m) => m.id === modId);
            setAddDeviceModelId(modId);
            setAddDeviceModelName(model?.name || '');
          }}
          onEditDevice={(device) => setEditingDevice(device)}
          onDeleteDevice={(modId, devId) => {
            const allDevices = categories.flatMap((c) =>
            c.models.flatMap((m) => m.devices)
            );
            const device = allDevices.find((d) => d.id === devId);
            if (
            device &&
            window.confirm(`确定删除设备"${device.barcodeId}"吗？`))
            {
              deleteDevice(modId, devId);
              addLog(currentOperator, '删除设备', device.barcodeId, '删除设备');
            }
          }}
          onReorderCategories={reorderCategories}
          onReorderModels={reorderModels}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />

      </div>
      )}

      {/* ─── Modals ─── */}

      {/* Add Category */}
      <SimpleInputModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSubmit={(name) => {
          addCategory(name);
          addLog(currentOperator, '添加分类', name, '新增设备分类');
        }}
        title="添加分类"
        placeholder="输入分类名称，如：相机、镜头" />


      {/* Edit Category */}
      <SimpleInputModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onSubmit={(name) => {
          if (editingCategory) {
            updateCategory(editingCategory.id, name);
            addLog(
              currentOperator,
              '修改分类' as OperationType,
              `${editingCategory.name} → ${name}`,
              '修改分类名称'
            );
          }
        }}
        title="编辑分类"
        placeholder="输入新的分类名称"
        initialValue={editingCategory?.name || ''}
        submitLabel="保存" />


      {/* Add Model (with category dropdown) */}
      <AddModelModal
        isOpen={showAddModel}
        onClose={() => setShowAddModel(false)}
        onSubmit={(catId, modelName) => {
          addModel(catId, modelName);
          addLog(currentOperator, '添加设备', modelName, '新增设备型号');
        }}
        categories={categories}
        initialCategoryId={addModelInitialCatId} />


      {/* Edit Model */}
      <SimpleInputModal
        isOpen={!!editingModel}
        onClose={() => setEditingModel(null)}
        onSubmit={(name) => {
          if (editingModel) {
            updateModel(editingModel.id, name);
            addLog(
              currentOperator,
              '修改设备',
              `${editingModel.name} → ${name}`,
              '修改设备型号名称'
            );
          }
        }}
        title="编辑器材型号"
        placeholder="输入新的型号名称"
        initialValue={editingModel?.name || ''}
        submitLabel="保存" />


      {/* Add Device from model row (no category/model selection needed) */}
      <BatchDeviceForm
        isOpen={!!addDeviceModelId}
        onClose={() => {
          setAddDeviceModelId(null);
          setAddDeviceModelName('');
        }}
        fixedModelId={addDeviceModelId || undefined}
        fixedModelName={addDeviceModelName}
        existingBarcodes={getExistingBarcodes?.() || []}
        onSubmit={(barcodeIds) => {
          if (addDeviceModelId) {
            const added: string[] = [];
            for (const barcodeId of barcodeIds) {
              addDevice(addDeviceModelId, barcodeId);
              added.push(barcodeId);
            }
            addLog(
              currentOperator,
              '添加设备',
              `${addDeviceModelName} (${added.join(', ')})`,
              `批量新增 ${added.length} 台设备`
            );
          }
        }} />


      {/* Add Device from top-level (full selection) */}
      <BatchDeviceForm
        isOpen={showAddDeviceFull}
        onClose={() => setShowAddDeviceFull(false)}
        categories={categories}
        existingBarcodes={getExistingBarcodes?.() || []}
        onSubmit={() => {}}
        onSubmitFull={(catId, modId, barcodeIds) => {
          const model = categories.
          find((c) => c.id === catId)?.
          models.find((m) => m.id === modId);
          const added: string[] = [];
          for (const barcodeId of barcodeIds) {
            addDevice(modId, barcodeId);
            added.push(barcodeId);
          }
          addLog(
            currentOperator,
            '添加设备',
            `${model?.name || ''} (${added.join(', ')})`,
            `批量新增 ${added.length} 台设备`
          );
        }} />


      {/* Edit Device */}
      <EditDeviceForm
        isOpen={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        initialBarcodeId={editingDevice?.barcodeId}
        onSubmit={(barcodeId) => {
          if (editingDevice) {
            updateDevice(editingDevice.id, barcodeId);
            addLog(
              currentOperator,
              '修改设备',
              `${editingDevice.barcodeId} → ${barcodeId}`,
              '修改设备编码'
            );
          }
        }} />

    </div>);

}
