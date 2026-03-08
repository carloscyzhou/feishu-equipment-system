import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronRightIcon,
  FolderIcon,
  BoxIcon,
  CpuIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
  UserIcon,
  ClockIcon,
  CalendarIcon,
  GripVerticalIcon,
  ChevronsUpDownIcon,
  ChevronsDownUpIcon,
} from 'lucide-react';
import { Category, EquipmentModel, Device } from '../types';
import { formatDateTimeInTimeZone, useTimezone } from '../utils/timezone';

interface DeviceTreeProps {
  categories: Category[];
  searchQuery: string;
  expandedCategories: Set<string>;
  expandedModels: Set<string>;
  onToggleCategory: (id: string) => void;
  onToggleModel: (id: string) => void;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddModel: (categoryId: string) => void;
  onEditModel: (model: EquipmentModel) => void;
  onDeleteModel: (categoryId: string, modelId: string) => void;
  onAddDevice: (modelId: string) => void;
  onEditDevice: (device: Device) => void;
  onDeleteDevice: (modelId: string, deviceId: string) => void;
  onReorderCategories?: (categoryIds: string[]) => void;
  onReorderModels?: (categoryId: string, modelIds: string[]) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  statusFilter?: 'all' | '在库' | '出库';
}

// 可排序的分类项
function SortableCategory({
  category,
  statusFilter = 'all',
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddModel,
  children,
}: {
  category: Category;
  statusFilter?: 'all' | '在库' | '出库';
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddModel: () => void;
  children: React.ReactNode;
}  & { showExpandButton?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stats = {
    total: category.models.reduce((sum, m) => sum + m.devices.length, 0),
    available: category.models.reduce(
      (sum, m) => sum + m.devices.filter((d) => d.status === '在库').length,
      0
    ),
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer select-none hover:bg-slate-800/60 transition-colors"
        onClick={onToggle}
        role="treeitem"
        aria-expanded={isExpanded}
      >
        <div
          {...attributes}
          {...listeners}
          className="hidden md:flex p-1 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVerticalIcon className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRightIcon className="w-4 h-4 text-slate-500" />
        </motion.div>
        <FolderIcon className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-slate-200 flex-1">
          {category.name}
        </span>
        <span className="text-[11px] font-mono mr-1">
          {statusFilter === 'all' ? (
            <>
              <span className="text-emerald-400">{stats.available}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{stats.total}</span>
            </>
          ) : (
            <span className="text-slate-300">{stats.total}</span>
          )}
          <span className="text-slate-600 text-[10px] ml-0.5">台</span>
        </span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <ActionButton
            icon={isExpanded ? ChevronsDownUpIcon : ChevronsUpDownIcon}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            label={isExpanded ? '收起' : '展开'}
          />
          <ActionButton
            icon={PlusIcon}
            onClick={(e) => {
              e.stopPropagation();
              onAddModel();
            }}
            label="添加型号"
          />
          <ActionButton
            icon={PencilIcon}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            label="编辑分类"
          />
          <ActionButton
            icon={Trash2Icon}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            label="删除分类"
            variant="danger"
          />
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-5 border-l border-slate-800 pl-2 space-y-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 可排序的型号项
function SortableModel({
  model,
  categoryId,
  statusFilter = 'all',
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddDevice,
  children,
}: {
  model: EquipmentModel;
  categoryId: string;
  statusFilter?: 'all' | '在库' | '出库';
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddDevice: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id, data: { categoryId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stats = {
    total: model.devices.length,
    available: model.devices.filter((d) => d.status === '在库').length,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
        onClick={onToggle}
        role="treeitem"
        aria-expanded={isExpanded}
      >
        <div
          {...attributes}
          {...listeners}
          className="hidden md:flex p-1 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVerticalIcon className="w-3 h-3 text-slate-600" />
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRightIcon className="w-3.5 h-3.5 text-slate-600" />
        </motion.div>
        <BoxIcon className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-sm text-slate-300 flex-1">{model.name}</span>
        <span className="text-[11px] font-mono mr-1 bg-slate-800 px-1.5 py-0.5 rounded">
          {statusFilter === 'all' ? (
            <>
              <span className="text-emerald-400">{stats.available}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{stats.total}</span>
            </>
          ) : (
            <span className="text-slate-300">{stats.total}</span>
          )}
          <span className="text-slate-600 text-[10px] ml-0.5">台</span>
        </span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <ActionButton
            icon={PlusIcon}
            onClick={(e) => {
              e.stopPropagation();
              onAddDevice();
            }}
            label="添加设备"
          />
          <ActionButton
            icon={PencilIcon}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            label="编辑型号"
          />
          <ActionButton
            icon={Trash2Icon}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            label="删除型号"
            variant="danger"
          />
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-5 border-l border-slate-800/60 pl-2 space-y-0.5 py-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 普通设备项（不可拖拽排序）
function DeviceItem({
  device,
  onEdit,
  onDelete,
}: {
  device: Device;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { timezone } = useTimezone();
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const checkoutRecord = device.status === '出库' ? device.checkoutRecord : undefined;

  const formatDateTime = (value?: string) => {
    return formatDateTimeInTimeZone(value, timezone, {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const updatePopoverPosition = (clientX: number, clientY: number) => {
    setPopoverPos({
      x: clientX + 12,
      y: clientY + 12,
    });
  };

  return (
    <div 
      className="relative"
      onMouseEnter={(e) => {
        if (!checkoutRecord) return;
        updatePopoverPosition(e.clientX, e.clientY);
        setShowPopover(true);
      }}
      onMouseMove={(e) => {
        if (!checkoutRecord || !showPopover) return;
        updatePopoverPosition(e.clientX, e.clientY);
      }}
      onMouseLeave={() => {
        setShowPopover(false);
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-800/30 transition-colors ${
          checkoutRecord ? 'cursor-pointer' : ''
        }`}
      >
        <div className="w-6 flex items-center justify-center">
          <CpuIcon className="w-3 h-3 text-slate-600" />
        </div>
        <span className="text-xs font-mono text-slate-400 flex-1">
          {device.barcodeId}
        </span>
        {checkoutRecord && (
          <span className="text-[11px] text-slate-300 max-w-24 truncate" title={checkoutRecord.borrower.name || '-'}>
            {checkoutRecord.borrower.name || '-'}
          </span>
        )}
        <StatusBadge status={device.status} />
        <div className="hidden group-hover:flex items-center gap-0.5">
          <ActionButton
            icon={PencilIcon}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            label="编辑设备"
          />
          <ActionButton
            icon={Trash2Icon}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            label="删除设备"
            variant="danger"
          />
        </div>
      </motion.div>

      {/* 出库详情弹窗 - hover 显示（使用 portal + fixed，避免被树容器裁剪） */}
      {showPopover && checkoutRecord && createPortal(
        <div
          className="fixed z-[9999] w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 pointer-events-none"
          style={{ left: popoverPos.x, top: popoverPos.y }}
        >
          <div className="mb-2">
            <span className="text-[11px] font-semibold text-amber-400">当前出库信息</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-400">借出人:</span>
              <span className="text-[11px] text-slate-200">{checkoutRecord.borrower.name || '-'}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <BoxIcon className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-400">用途:</span>
              <span className="text-[11px] text-slate-200 break-all">{checkoutRecord.purpose || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-400">预计归还:</span>
              <span className="text-[11px] text-slate-200 font-mono">{formatDateTime(checkoutRecord.expectedReturnTime)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="text-[11px] text-slate-400">出库时间:</span>
              <span className="text-[11px] text-slate-200 font-mono">{formatDateTime(checkoutRecord.checkoutTime)}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
  device?: Device;
}) {
  const colors: Record<string, string> = {
    在库: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    出库: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    维修: 'bg-red-500/15 text-red-400 border-red-500/20',
  };

  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colors[status] || 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  label,
  variant = 'default',
}: {
  icon: React.ElementType;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-1 rounded transition-colors ${
        variant === 'danger'
          ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export function DeviceTree({
  categories,
  searchQuery,
  expandedCategories,
  expandedModels,
  onToggleCategory,
  onToggleModel,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
  onReorderCategories,
  onReorderModels,
  onExpandAll,
  onCollapseAll,
  statusFilter = 'all',
}: DeviceTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredCategories = searchQuery
    ? categories
        .map((cat) => ({
          ...cat,
          models: cat.models
            .map((model) => ({
              ...model,
              devices: model.devices.filter(
                (d) =>
                  d.barcodeId
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  model.name.toLowerCase().includes(searchQuery.toLowerCase())
              ),
            }))
            .filter(
              (model) =>
                model.devices.length > 0 ||
                model.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        }))
        .filter(
          (cat) =>
            cat.models.length > 0 ||
            cat.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : categories;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // 获取拖拽项的类型
    const activeData = active.data.current;
    const overData = over.data.current;

    // 分类排序
    if (!activeData?.categoryId && !overData?.categoryId) {
      const oldIndex = filteredCategories.findIndex((c) => c.id === active.id);
      const newIndex = filteredCategories.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(filteredCategories, oldIndex, newIndex);
        onReorderCategories?.(newCategories.map((c) => c.id));
      }
      return;
    }

    // 型号排序（在同一分类内）
    if (activeData?.categoryId && overData?.categoryId) {
      if (activeData.categoryId === overData.categoryId) {
        const category = filteredCategories.find(
          (c) => c.id === activeData.categoryId
        );
        if (category) {
          const oldIndex = category.models.findIndex((m) => m.id === active.id);
          const newIndex = category.models.findIndex((m) => m.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newModels = arrayMove(category.models, oldIndex, newIndex);
            onReorderModels?.(activeData.categoryId, newModels.map((m) => m.id));
          }
        }
      }
      return;
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-1">
          <SortableContext
            items={filteredCategories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredCategories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                statusFilter={statusFilter}
                isExpanded={expandedCategories.has(category.id) || !!searchQuery}
                onToggle={() => onToggleCategory(category.id)}
                onEdit={() => onEditCategory(category)}
                onDelete={() => onDeleteCategory(category.id)}
                onAddModel={() => onAddModel(category.id)}
              >
                <SortableContext
                  items={category.models.map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {category.models.map((model) => (
                    <SortableModel
                      key={model.id}
                      model={model}
                      categoryId={category.id}
                      statusFilter={statusFilter}
                      isExpanded={expandedModels.has(model.id) || !!searchQuery}
                      onToggle={() => onToggleModel(model.id)}
                      onEdit={() => onEditModel(model)}
                      onDelete={() => onDeleteModel(category.id, model.id)}
                      onAddDevice={() => onAddDevice(model.id)}
                    >
                      {/* 设备列表 - 不可拖拽排序 */}
                      {model.devices.map((device) => (
                        <DeviceItem
                          key={device.id}
                          device={device}
                          onEdit={() => onEditDevice(device)}
                          onDelete={() => onDeleteDevice(model.id, device.id)}
                        />
                      ))}
                    </SortableModel>
                  ))}
                </SortableContext>
              </SortableCategory>
            ))}
          </SortableContext>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <BoxIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">未找到匹配的设备</p>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <div className="opacity-80 bg-slate-800 rounded-lg px-2 py-1.5 flex items-center gap-2">
              <GripVerticalIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm text-slate-200">移动中...</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default DeviceTree;
