import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  ScanBarcodeIcon,
  MonitorIcon,
  PlusIcon,
  Trash2Icon } from
'lucide-react';
import { Category } from '../types';
import { useFeishuScan } from '../hooks/useFeishuScan';
import { isFeishuClient, isDesktopFeishuClient } from '../hooks/useAuth';
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
function ModalShell({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md'






}: {isOpen: boolean;onClose: () => void;title: string;children: React.ReactNode;maxWidth?: string;}) {
  return (
    <AnimatePresence>
      {isOpen &&
      <motion.div
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        exit={{
          opacity: 0
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}>

          <motion.div
          initial={{
            scale: 0.95,
            opacity: 0,
            y: 10
          }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0
          }}
          exit={{
            scale: 0.95,
            opacity: 0,
            y: 10
          }}
          transition={{
            duration: 0.2
          }}
          className={`bg-slate-900 border border-slate-700 rounded-xl w-full ${maxWidth} shadow-2xl max-h-[85vh] flex flex-col`}
          onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <h3 className="text-base font-semibold text-slate-100">
                {title}
              </h3>
              <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">

                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}
/* ─── SimpleInputModal (unchanged behavior) ─── */
interface SimpleInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder: string;
  initialValue?: string;
  submitLabel?: string;
}
export function SimpleInputModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder,
  initialValue = '',
  submitLabel = '确认'
}: SimpleInputModalProps) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    onClose();
  };
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-sm">

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

            取消
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

            {submitLabel}
          </button>
        </div>
      </form>
    </ModalShell>);

}
/* ─── AddModelModal: category dropdown + model name ─── */
interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryId: string, modelName: string) => void;
  categories: Category[];
  initialCategoryId?: string;
}
export function AddModelModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialCategoryId = ''
}: AddModelModalProps) {
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [modelName, setModelName] = useState('');
  useEffect(() => {
    if (isOpen) {
      setCategoryId(initialCategoryId);
      setModelName('');
    }
  }, [isOpen, initialCategoryId]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !modelName.trim()) return;
    onSubmit(categoryId, modelName.trim());
    onClose();
  };
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="添加器材型号"
      maxWidth="max-w-sm">

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            所属分类 <span className="text-red-400">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors">

            <option value="">选择分类</option>
            {categories.map((c) =>
            <option key={c.id} value={c.id}>
                {c.name}
              </option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            型号名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="例如：Canon R5"
            autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

            取消
          </button>
          <button
            type="submit"
            disabled={!categoryId || !modelName.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

            添加
          </button>
        </div>
      </form>
    </ModalShell>);

}
/* ─── BatchDeviceForm: supports adding multiple barcodes at once ─── */
interface BatchDeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (barcodeIds: string[]) => void;
  /** If provided, skip category/model selection */
  fixedModelId?: string;
  fixedModelName?: string;
  /** For full add mode (from top-level "添加" button) */
  categories?: Category[];
  onSubmitFull?: (
  categoryId: string,
  modelId: string,
  barcodeIds: string[])
  => void;
  /** Existing barcodes for duplicate checking */
  existingBarcodes?: string[];
}
export function BatchDeviceForm({
  isOpen,
  onClose,
  onSubmit,
  fixedModelId,
  fixedModelName,
  categories,
  onSubmitFull,
  existingBarcodes = []
}: BatchDeviceFormProps) {
  const isMobile = useIsMobile();
  const isFeishu = isFeishuClient();
  const isDesktopFeishu = isDesktopFeishuClient();
  const showScanButton = isFeishu && !isDesktopFeishu; // 只在移动端飞书显示扫码按钮
  const { startScan, isScanning } = useFeishuScan();
  const needsSelection = !fixedModelId && categories;
  const [categoryId, setCategoryId] = useState('');
  const [modelId, setModelId] = useState('');
  const [barcodeInputs, setBarcodeInputs] = useState<string[]>(['']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (isOpen) {
      setCategoryId('');
      setModelId('');
      setBarcodeInputs(['']);
    }
  }, [isOpen]);
  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const models = selectedCategory?.models || [];
  const handleScan = async (index: number) => {
    const result = await startScan('checkin');
    if (!result) return; // 用户取消或扫码失败，静默处理
    
    // 使用扫码的原始内容作为设备编码
    const newVal = result.scannedCode || '';
    if (!newVal) {
      alert('未获取到设备编码');
      return;
    }
    
    // 检查设备是否已登记（防止重复添加）
    if (result.success && result.equipment) {
      alert(`设备 "${newVal}" 已登记，请勿重复添加`);
      return;
    }
    
    const updated = [...barcodeInputs];
    updated[index] = newVal;
    setBarcodeInputs(updated);
    // Auto-add a new empty row
    if (index === barcodeInputs.length - 1) {
      setBarcodeInputs([...updated, '']);
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };
  const handleInputChange = (index: number, value: string) => {
    const updated = [...barcodeInputs];
    updated[index] = value;
    setBarcodeInputs(updated);
  };
  const handleInputKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const current = barcodeInputs[index].trim();
      if (!current) return;
      // If this is the last input, add a new one
      if (index === barcodeInputs.length - 1) {
        setBarcodeInputs([...barcodeInputs, '']);
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 50);
      } else {
        // Focus next input
        inputRefs.current[index + 1]?.focus();
      }
    }
  };
  const removeInput = (index: number) => {
    if (barcodeInputs.length <= 1) {
      setBarcodeInputs(['']);
      return;
    }
    setBarcodeInputs(barcodeInputs.filter((_, i) => i !== index));
  };
  const addEmptyInput = () => {
    setBarcodeInputs([...barcodeInputs, '']);
    setTimeout(() => {
      inputRefs.current[barcodeInputs.length]?.focus();
    }, 50);
  };
  const validBarcodes = barcodeInputs.map((b) => b.trim()).filter(Boolean);
  
  // 检查重复的设备编号（与已有设备重复）
  const duplicateWithExisting = validBarcodes.filter(barcode => 
    existingBarcodes.includes(barcode)
  );
  
  // 检查输入列表内部的重复
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const barcode of validBarcodes) {
    if (seen.has(barcode)) {
      duplicates.add(barcode);
    }
    seen.add(barcode);
  }
  
  const hasDuplicates = duplicateWithExisting.length > 0 || duplicates.size > 0;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validBarcodes.length === 0) return;
    
    // 检查重复
    if (hasDuplicates) {
      const messages: string[] = [];
      if (duplicateWithExisting.length > 0) {
        messages.push(`以下设备编号已存在: ${duplicateWithExisting.join(', ')}`);
      }
      if (duplicates.size > 0) {
        messages.push(`输入列表中有重复: ${Array.from(duplicates).join(', ')}`);
      }
      alert(messages.join('\n'));
      return;
    }
    
    if (needsSelection && onSubmitFull) {
      if (!categoryId || !modelId) return;
      onSubmitFull(categoryId, modelId, validBarcodes);
    } else {
      onSubmit(validBarcodes);
    }
    onClose();
  };
  const canSubmit =
  validBarcodes.length > 0 && (!needsSelection || categoryId && modelId) && !hasDuplicates;
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={fixedModelName ? `添加设备 · ${fixedModelName}` : '添加设备'}>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 overflow-hidden">

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Category & Model selection (only when adding from top-level) */}
          {needsSelection &&
          <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  设备分类 <span className="text-red-400">*</span>
                </label>
                <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setModelId('');
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors">

                  <option value="">选择分类</option>
                  {categories.map((c) =>
                <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  器材型号 <span className="text-red-400">*</span>
                </label>
                <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={!categoryId}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors disabled:opacity-50">

                  <option value="">选择型号</option>
                  {models.map((m) =>
                <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                )}
                </select>
              </div>
            </>
          }

          {/* Barcode inputs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">
                设备编码 <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                已添加{' '}
                <span className="text-amber-400">{validBarcodes.length}</span>{' '}
                台
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {barcodeInputs.map((barcode, index) => {
                const trimmedBarcode = barcode.trim();
                const isDuplicateWithExisting = trimmedBarcode && existingBarcodes.includes(trimmedBarcode);
                const isDuplicateInList = trimmedBarcode && validBarcodes.filter(b => b === trimmedBarcode).length > 1;
                
                return (
              <motion.div
                key={index}
                initial={
                index > 0 ?
                {
                  opacity: 0,
                  y: -4
                } :
                false
                }
                animate={{
                  opacity: 1,
                  y: 0
                }}
                className="flex gap-2">

                  <div className="w-6 flex items-center justify-center text-[10px] text-slate-600 font-mono flex-shrink-0">
                    {index + 1}
                  </div>
                  <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  value={barcode}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleInputKeyDown(index, e)}
                  placeholder={
                  isMobile ?
                  '扫码或输入编码，回车添加下一个' :
                  '扫码枪扫描或手动输入，回车添加下一个'
                  }
                  autoFocus={index === 0}
                  className={`flex-1 bg-slate-800 border rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-colors ${
                    isDuplicateWithExisting || isDuplicateInList
                      ? 'border-red-500/60 focus:ring-red-500/40 focus:border-red-500/60'
                      : 'border-slate-700 focus:ring-amber-500/40 focus:border-amber-500/60'
                  }`} />

                  {showScanButton &&
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => handleScan(index)}
                  className="flex items-center gap-1 px-2.5 py-2 bg-amber-500 text-slate-900 rounded-lg text-xs font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">

                      <ScanBarcodeIcon className="w-3.5 h-3.5" />
                    </button>
                }
                  {barcodeInputs.length > 1 &&
                <button
                  type="button"
                  onClick={() => removeInput(index)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">

                      <Trash2Icon className="w-3.5 h-3.5" />
                    </button>
                }
                </motion.div>
              );
              })}
            </div>
            
            {/* 重复警告提示 */}
            {(duplicateWithExisting.length > 0 || duplicates.size > 0) && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-1.5 text-red-400 text-xs">
                  <span className="font-medium">⚠️ 发现重复</span>
                </div>
                {duplicateWithExisting.length > 0 && (
                  <div className="mt-1 text-[11px] text-red-400/80">
                    已存在: {duplicateWithExisting.join(', ')}
                  </div>
                )}
                {duplicates.size > 0 && (
                  <div className="mt-1 text-[11px] text-red-400/80">
                    输入重复: {Array.from(duplicates).join(', ')}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={addEmptyInput}
              className="flex items-center gap-1 mt-2 text-[11px] text-slate-500 hover:text-amber-400 transition-colors">

              <PlusIcon className="w-3 h-3" />
              添加更多
            </button>

            {!isMobile &&
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                <MonitorIcon className="w-3 h-3" />
                <span>电脑端请使用扫码枪扫描，扫描后按回车自动添加下一行</span>
              </div>
            }
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

            取消
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

            添加 {validBarcodes.length > 0 ? `(${validBarcodes.length}台)` : ''}
          </button>
        </div>
      </form>
    </ModalShell>);

}
/* ─── EditDeviceForm: single barcode edit ─── */
interface EditDeviceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (barcodeId: string) => void;
  initialBarcodeId?: string;
}
export function EditDeviceForm({
  isOpen,
  onClose,
  onSubmit,
  initialBarcodeId = ''
}: EditDeviceFormProps) {
  const isMobile = useIsMobile();
  const isFeishu = isFeishuClient();
  const isDesktopFeishu = isDesktopFeishuClient();
  const showScanButton = isFeishu && !isDesktopFeishu; // 只在移动端飞书显示扫码按钮
  const { startScan, isScanning } = useFeishuScan();
  const [barcodeId, setBarcodeId] = useState(initialBarcodeId);
  useEffect(() => {
    if (isOpen) setBarcodeId(initialBarcodeId);
  }, [isOpen, initialBarcodeId]);
  const handleScan = async () => {
    const result = await startScan('checkin');
    if (!result) return; // 用户取消或扫码失败，静默处理
    
    // 使用扫码的原始内容作为设备编码
    const newVal = result.scannedCode || '';
    if (!newVal) {
      alert('未获取到设备编码');
      return;
    }
    
    // 检查设备是否已登记（防止重复添加）
    if (result.success && result.equipment) {
      alert(`设备 "${newVal}" 已登记，请勿重复添加`);
      return;
    }
    
    setBarcodeId(newVal);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeId.trim()) return;
    onSubmit(barcodeId.trim());
    onClose();
  };
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="编辑设备编码"
      maxWidth="max-w-sm">

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            设备编码
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeId}
              onChange={(e) => setBarcodeId(e.target.value)}
              placeholder={
              isMobile ? '点击扫码或手动输入' : '请使用扫码枪扫描设备条码'
              }
              autoFocus
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

            {showScanButton &&
            <button
              type="button"
              disabled={isScanning}
              onClick={handleScan}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

                <ScanBarcodeIcon className="w-4 h-4" />
                扫码
              </button>
            }
          </div>
          {!isMobile &&
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
              <MonitorIcon className="w-3 h-3" />
              <span>电脑端请使用扫码枪进行扫描</span>
            </div>
          }
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

            取消
          </button>
          <button
            type="submit"
            disabled={!barcodeId.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

            保存
          </button>
        </div>
      </form>
    </ModalShell>);

}