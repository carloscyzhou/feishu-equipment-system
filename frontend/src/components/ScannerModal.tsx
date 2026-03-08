import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  ScanBarcodeIcon,
  Trash2Icon,
  MonitorIcon,
  CheckCircleIcon,
  AlertCircleIcon } from
'lucide-react';
import { Device, EquipmentModel, Category } from '../types';
interface ScannedItem {
  barcodeId: string;
  device: Device;
  model: EquipmentModel;
  category: Category;
}
interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'checkout' | 'checkin';
  findDeviceByBarcode: (barcodeId: string) => {
    device: Device;
    model: EquipmentModel;
    category: Category;
  } | null;
  onCheckout: (
  items: ScannedItem[],
  purpose: string,
  returnDate: string)
  => void;
  onCheckin: (items: ScannedItem[]) => void;
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
export function ScannerModal({
  isOpen,
  onClose,
  mode,
  findDeviceByBarcode,
  onCheckout,
  onCheckin
}: ScannerModalProps) {
  const isMobile = useIsMobile();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setScannedItems([]);
      setScanInput('');
      setPurpose('');
      setReturnDate('');
      setError('');
      setStep(1);
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, step]);
  const handleScan = (barcodeId: string) => {
    const trimmed = barcodeId.trim();
    if (!trimmed) return;
    setError('');
    if (scannedItems.some((item) => item.barcodeId === trimmed)) {
      setError(`设备 ${trimmed} 已在列表中`);
      setScanInput('');
      return;
    }
    const result = findDeviceByBarcode(trimmed);
    if (!result) {
      setError(`未找到设备编码: ${trimmed}`);
      setScanInput('');
      return;
    }
    if (mode === 'checkout' && result.device.status !== '在库') {
      setError(`设备 ${trimmed} 当前状态为"${result.device.status}"，无法出库`);
      setScanInput('');
      return;
    }
    if (mode === 'checkin' && result.device.status !== '出库') {
      setError(`设备 ${trimmed} 当前状态为"${result.device.status}"，无需入库`);
      setScanInput('');
      return;
    }
    setScannedItems((prev) => [
    ...prev,
    {
      barcodeId: trimmed,
      device: result.device,
      model: result.model,
      category: result.category
    }]
    );
    setScanInput('');
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput);
    }
  };
  const simulateScan = () => {
    const allBarcodes = [
    'CAM-001',
    'CAM-002',
    'CAM-003',
    'LENS-001',
    'LENS-002',
    'LENS-003',
    'SND-001',
    'REC-001',
    'REC-002',
    'STB-001',
    'PKT-001',
    'PKT-002',
    'PKT-003'];

    const available = allBarcodes.filter(
      (b) => !scannedItems.some((s) => s.barcodeId === b)
    );
    if (available.length > 0) {
      const randomBarcode =
      available[Math.floor(Math.random() * available.length)];
      setTimeout(() => handleScan(randomBarcode), 300);
    }
  };
  const removeItem = (barcodeId: string) => {
    setScannedItems((prev) =>
    prev.filter((item) => item.barcodeId !== barcodeId)
    );
  };
  const handleSubmit = () => {
    if (mode === 'checkout') {
      if (!purpose.trim()) {
        setError('请填写出库用途');
        return;
      }
      if (!returnDate) {
        setError('请选择预计归还时间');
        return;
      }
      onCheckout(scannedItems, purpose.trim(), returnDate);
    } else {
      onCheckin(scannedItems);
    }
    onClose();
  };
  const isCheckout = mode === 'checkout';
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
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}>

          <motion.div
          initial={{
            y: 40,
            opacity: 0
          }}
          animate={{
            y: 0,
            opacity: 1
          }}
          exit={{
            y: 40,
            opacity: 0
          }}
          transition={{
            duration: 0.25
          }}
          className="bg-slate-900 border border-slate-700 rounded-t-2xl md:rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div
                className={`w-2 h-2 rounded-full ${isCheckout ? 'bg-red-400' : 'bg-emerald-400'}`} />

                <h3 className="text-base font-semibold text-slate-100">
                  {isCheckout ? '批量出库' : '批量入库'}
                </h3>
              </div>
              <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">

                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Step indicator for checkout */}
              {isCheckout &&
            <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                className={`px-2 py-0.5 rounded-full ${step === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>

                    1. 扫描设备
                  </span>
                  <span className="text-slate-700">→</span>
                  <span
                className={`px-2 py-0.5 rounded-full ${step === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>

                    2. 填写信息
                  </span>
                </div>
            }

              {/* Scan Input */}
              {(step === 1 || !isCheckout) &&
            <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      扫描设备编码
                    </label>
                    <div className="flex gap-2">
                      <input
                    ref={inputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                    isMobile ? '输入编码或点击扫码' : '请使用扫码枪扫描'
                    }
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

                      {isMobile ?
                  <button
                    type="button"
                    onClick={simulateScan}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors flex-shrink-0">

                          <ScanBarcodeIcon className="w-4 h-4" />
                          扫码
                        </button> :

                  <button
                    type="button"
                    onClick={() => handleScan(scanInput)}
                    className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors flex-shrink-0">

                          添加
                        </button>
                  }
                    </div>
                    {!isMobile &&
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                        <MonitorIcon className="w-3 h-3" />
                        <span>电脑端请使用扫码枪进行扫描，扫描后自动添加</span>
                      </div>
                }
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error &&
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -4
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -4
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">

                        <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                      </motion.div>
                }
                  </AnimatePresence>

                  {/* Scanned List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">
                        已扫描{' '}
                        <span className="text-amber-400 font-mono">
                          {scannedItems.length}
                        </span>{' '}
                        台设备
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      <AnimatePresence>
                        {scannedItems.map((item, index) =>
                    <motion.div
                      key={item.barcodeId}
                      initial={{
                        opacity: 0,
                        x: -10
                      }}
                      animate={{
                        opacity: 1,
                        x: 0
                      }}
                      exit={{
                        opacity: 0,
                        x: 10
                      }}
                      transition={{
                        delay: index * 0.03
                      }}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg">

                            <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-200 truncate">
                                {item.model.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {item.barcodeId} · {item.category.name}
                              </div>
                              {mode === 'checkin' &&
                        item.device.checkoutRecord &&
                        <div className="text-[11px] text-slate-500 mt-0.5">
                                    借用人:{' '}
                                    {item.device.checkoutRecord.borrower.name}
                                  </div>
                        }
                            </div>
                            <button
                        onClick={() => removeItem(item.barcodeId)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                        aria-label="移除">

                              <Trash2Icon className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                    )}
                      </AnimatePresence>
                      {scannedItems.length === 0 &&
                  <div className="text-center py-8 text-slate-600">
                          <ScanBarcodeIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">
                            扫描设备条形码或条形码添加到列表
                          </p>
                        </div>
                  }
                    </div>
                  </div>
                </>
            }

              {/* Step 2: Checkout Details */}
              {isCheckout && step === 2 &&
            <div className="space-y-4">
                  <div className="px-3 py-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
                    <span className="text-xs text-slate-500">
                      已选择{' '}
                      <span className="text-amber-400 font-mono">
                        {scannedItems.length}
                      </span>{' '}
                      台设备
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {scannedItems.map((item) =>
                  <span
                    key={item.barcodeId}
                    className="text-[11px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">

                          {item.barcodeId}
                        </span>
                  )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      出库用途 <span className="text-red-400">*</span>
                    </label>
                    <input
                  type="text"
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    setError('');
                  }}
                  placeholder="例如：产品拍摄、活动录制"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      预计归还时间 <span className="text-red-400">*</span>
                    </label>
                    <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => {
                    setReturnDate(e.target.value);
                    setError('');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors" />

                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      借用人
                    </label>
                    <div className="px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300">
                      张三（当前用户）
                    </div>
                  </div>

                  <AnimatePresence>
                    {error &&
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -4
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    opacity: 0,
                    y: -4
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">

                        <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                      </motion.div>
                }
                  </AnimatePresence>
                </div>
            }
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-800 flex gap-3 flex-shrink-0">
              {isCheckout && step === 2 &&
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

                  上一步
                </button>
            }
              <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-slate-400 bg-slate-800 border border-slate-700 rounded-lg hover:text-slate-300 transition-colors">

                取消
              </button>
              {isCheckout && step === 1 ?
            <button
              onClick={() => setStep(2)}
              disabled={scannedItems.length === 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

                  下一步
                </button> :

            <button
              onClick={handleSubmit}
              disabled={scannedItems.length === 0}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isCheckout ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}>

                  {isCheckout ?
              `确认出库 (${scannedItems.length})` :
              `确认入库 (${scannedItems.length})`}
                </button>
            }
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}