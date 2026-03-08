import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ScanBarcodeIcon,
  Trash2Icon,
  CheckCircleIcon,
  AlertCircleIcon,
  MonitorIcon,
  ClockIcon,
  UserIcon,
  SearchIcon,
  ChevronDownIcon,
  XIcon,
  Loader2Icon,
  SmartphoneIcon
} from 'lucide-react';
import { Category, Device, EquipmentModel, OperationType, User } from '../types';
import { useFeishuScan } from '../hooks/useFeishuScan';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../api';
import { formatDateTimeInTimeZone, getTodayDateInTimeZone, useTimezone } from '../utils/timezone';

interface ScannedItem {
  barcodeId: string;
  device: Device;
  model: EquipmentModel;
  category: Category;
}

interface CheckInOutProps {
  findDeviceByBarcode: (barcodeId: string) => {
    device: Device;
    model: EquipmentModel;
    category: Category;
  } | null;
  checkoutDevices: (
    barcodeIds: string[],
    purpose: string,
    expectedReturn: string,
    borrower: User
  ) => Promise<boolean>;
  assignCheckoutDevices: (
    barcodeIds: string[],
    purpose: string,
    expectedReturn: string,
    assignments: Array<{ barcodeId: string; userId: number }>
  ) => Promise<boolean>;
  checkinDevices: (barcodeIds: string[]) => Promise<boolean>;
  transferDevices: (
    barcodeIds: string[],
    receiverUserId: number,
    transferReason: string,
    expectedReturnTime?: string
  ) => Promise<boolean>;
  addLog: (
    operator: User,
    type: OperationType,
    deviceInfo: string,
    remark: string
  ) => void;
  getAllDevices: () => Array<{
    device: Device;
    model: EquipmentModel;
    category: Category;
  }>;
  refreshData?: () => Promise<void> | void;
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



export function CheckInOut({
  findDeviceByBarcode,
  checkoutDevices,
  assignCheckoutDevices,
  checkinDevices,
  transferDevices,
  addLog,
  getAllDevices,
  refreshData
}: CheckInOutProps) {
  const isMobile = useIsMobile();
  const { user: currentUser } = useAuth();
  const { timezone } = useTimezone();
  const [mode, setMode] = useState<'checkout' | 'assign' | 'checkin' | 'transfer'>('checkout');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [purpose, setPurpose] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [transferReceiverId, setTransferReceiverId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferReturnDate, setTransferReturnDate] = useState('');
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [transferUserSearchQuery, setTransferUserSearchQuery] = useState('');
  const [showTransferUserDropdown, setShowTransferUserDropdown] = useState(false);
  const [assignUserSearchQuery, setAssignUserSearchQuery] = useState<Record<string, string>>({});
  const [openAssignUserBarcode, setOpenAssignUserBarcode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const transferUserDropdownRef = useRef<HTMLDivElement>(null);
  const assignUserDropdownRef = useRef<HTMLDivElement>(null);
  
  // 飞书扫码 hook
  const {
    isScanning,
    error: scanError,
    isFeishuClient,
    isDesktopFeishuClient,
    startScan,
    handleManualScan,
    clearError: clearScanError,
  } = useFeishuScan();
  
  // 是否显示扫码按钮（移动端飞书才显示）
  const showScanButton = isFeishuClient && !isDesktopFeishuClient;

  const isCheckout = mode === 'checkout';
  const isAssign = mode === 'assign';
  const isCheckin = mode === 'checkin';
  const isTransfer = mode === 'transfer';
  const isCheckoutLike = isCheckout || isAssign;

  const checkedOutDevices = useMemo(() => {
    return getAllDevices().filter((d) => d.device.status === '出库');
  }, [getAllDevices]);
  const selectedTransferUser = useMemo(
    () => users.find((u) => String(u.id) === transferReceiverId) || null,
    [users, transferReceiverId]
  );
  const filteredTransferUsers = useMemo(() => {
    if (!transferUserSearchQuery.trim()) return users;
    const q = transferUserSearchQuery.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, transferUserSearchQuery]);
  const todayDate = useMemo(() => getTodayDateInTimeZone(timezone), [timezone]);

  useEffect(() => {
    userApi.getAll(1, 100)
      .then((res) => setUsers(res.data.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setScannedItems([]);
    setScanInput('');
    setPurpose('');
    setReturnDate('');
    setTransferReceiverId('');
    setTransferReason('');
    setTransferReturnDate('');
    setAssignments({});
    setAssignUserSearchQuery({});
    setOpenAssignUserBarcode(null);
    setTransferUserSearchQuery('');
    setShowTransferUserDropdown(false);
    setError('');
    setSuccessMsg('');
    clearScanError();
  }, [mode, clearScanError]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        transferUserDropdownRef.current &&
        !transferUserDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTransferUserDropdown(false);
      }
      if (
        openAssignUserBarcode &&
        assignUserDropdownRef.current &&
        !assignUserDropdownRef.current.contains(e.target as Node)
      ) {
        setOpenAssignUserBarcode(null);
      }
    };
    if (showTransferUserDropdown || openAssignUserBarcode) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTransferUserDropdown, openAssignUserBarcode]);

  // 同步扫码错误
  useEffect(() => {
    if (scanError) {
      setError(scanError);
    }
  }, [scanError]);

  // 处理扫码结果
  const handleScanResult = async (barcodeId: string) => {
    const trimmed = barcodeId.trim();
    if (!trimmed) return;

    setError('');
    setSuccessMsg('');

    // 检查是否已在列表中
    if (scannedItems.some((item) => item.barcodeId === trimmed)) {
      setError(`设备 ${trimmed} 已在列表中`);
      setScanInput('');
      return;
    }

    // 查找设备
    const result = findDeviceByBarcode(trimmed);
    if (!result) {
      // 如果本地没找到，尝试通过 API 查找（扫码接口会查询数据库）
      const scanMode: 'checkout' | 'checkin' | 'transfer' = isAssign
        ? 'checkout'
        : (mode as 'checkout' | 'checkin' | 'transfer');
      const scanResult = await handleManualScan(trimmed, scanMode);
      
      if (!scanResult.success || !scanResult.equipment) {
        // 使用更明确的提示，区分"未登记"和"未找到"
        const errorMsg = scanResult.message || '';
        if (errorMsg.includes('未找到') || errorMsg.includes('不存在')) {
          setError(`设备 "${trimmed}" 未登记，请先前往"设备管理"登记该设备`);
        } else {
          setError(`未找到设备编码: ${trimmed}`);
        }
        setScanInput('');
        return;
      }

      // 检查状态
      const equipStatus = scanResult.equipment.status === 0 ? '在库' : '出库';
      
      if (isCheckoutLike && equipStatus !== '在库') {
        setError(`设备 ${trimmed} 当前状态为"${equipStatus}"，无法出库`);
        setScanInput('');
        return;
      }

      if (!isCheckoutLike && equipStatus !== '出库') {
        setError(
          mode === 'checkin'
            ? `设备 ${trimmed} 当前状态为"${equipStatus}"，无需入库`
            : `设备 ${trimmed} 当前状态为"${equipStatus}"，无法交接`
        );
        setScanInput('');
        return;
      }

      // 添加到列表（使用 API 返回的数据创建临时设备对象）
      const normalizedBarcodeId = scanResult.equipment.serial_number || trimmed;
      const tempDevice: Device = {
        id: String(scanResult.equipment.id),
        barcodeId: normalizedBarcodeId,
        modelId: 'unknown',
        status: equipStatus,
        checkoutRecord: equipStatus === '出库' ? {
          id: `co-${scanResult.equipment.id}`,
          deviceId: String(scanResult.equipment.id),
          barcodeId: normalizedBarcodeId,
          deviceName: scanResult.equipment.model_name,
          modelName: scanResult.equipment.model_name,
          borrower: {
            id: String(scanResult.equipment.current_user_id || ''),
            name: scanResult.equipment.current_user_name || '未知用户',
          } as any,
          purpose: scanResult.equipment.purpose || '-',
          checkoutTime: scanResult.equipment.checkout_time || '',
          expectedReturnTime: '',
        } : undefined,
      };

      const tempModel: EquipmentModel = {
        id: 'unknown',
        name: scanResult.equipment.model_name,
        categoryId: 'unknown',
        devices: [],
      };

      const tempCategory: Category = {
        id: 'unknown',
        name: scanResult.equipment.category_name || '未知分类',
        models: [],
      };

      setScannedItems((prev) => [
        ...prev,
        {
          barcodeId: normalizedBarcodeId,
          device: tempDevice,
          model: tempModel,
          category: tempCategory,
        }
      ]);
      if (isAssign && currentUser?.id) {
        setAssignments((prev) => ({
          ...prev,
          [normalizedBarcodeId]: prev[normalizedBarcodeId] || String(currentUser.id),
        }));
      }
      
      setScanInput('');
      inputRef.current?.focus();
      return;
    }

    // 本地找到设备
    if (isCheckoutLike && result.device.status !== '在库') {
      setError(`设备 ${trimmed} 当前状态为"${result.device.status}"，无法出库`);
      setScanInput('');
      return;
    }

    if (!isCheckoutLike && result.device.status !== '出库') {
      setError(
        mode === 'checkin'
          ? `设备 ${trimmed} 当前状态为"${result.device.status}"，无需入库`
          : `设备 ${trimmed} 当前状态为"${result.device.status}"，无法交接`
      );
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
      }
    ]);
    if (isAssign && currentUser?.id) {
      setAssignments((prev) => ({
        ...prev,
        [trimmed]: prev[trimmed] || String(currentUser.id),
      }));
    }

    setScanInput('');
    inputRef.current?.focus();
  };

  // 处理扫码按钮点击
  const handleScanClick = async () => {
    if (!isFeishuClient) {
      // 非飞书环境，直接使用输入框
      if (scanInput.trim()) {
        await handleScanResult(scanInput);
      }
      return;
    }

    // 飞书环境，调用扫码
    const scanMode: 'checkout' | 'checkin' | 'transfer' = isAssign
      ? 'checkout'
      : (mode as 'checkout' | 'checkin' | 'transfer');
    const result = await startScan(scanMode);
    if (!result) return; // 用户取消，静默处理
    
    // 扫码成功但未找到设备（未登记）
    if (!result.success || !result.equipment) {
      setError(result.message || `设备未登记，请先前往设备管理登记该设备`);
      return;
    }
    
    // 找到设备，继续处理
    await handleScanResult(
      result.equipment.serial_number || result.scannedCode || String(result.equipment.id)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanResult(scanInput);
    }
  };

  const simulateScan = () => {
    const allDevs = getAllDevices();
    const targetStatus = isCheckoutLike ? '在库' : '出库';
    const available = allDevs
      .filter((d) => d.device.status === targetStatus)
      .filter(
        (d) => !scannedItems.some((s) => s.barcodeId === d.device.barcodeId)
      );
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      setTimeout(() => handleScanResult(random.device.barcodeId), 200);
    } else {
      setError('没有可扫描的设备');
    }
  };

  const removeItem = (barcodeId: string) => {
    setScannedItems((prev) => prev.filter((item) => item.barcodeId !== barcodeId));
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[barcodeId];
      return next;
    });
    setAssignUserSearchQuery((prev) => {
      const next = { ...prev };
      delete next[barcodeId];
      return next;
    });
    if (openAssignUserBarcode === barcodeId) {
      setOpenAssignUserBarcode(null);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccessMsg('');

    if (scannedItems.length === 0) return;
    
    if (!currentUser) {
      setError('请先登录');
      return;
    }

    setIsProcessing(true);
    
    // 将 UserInfo 转换为 User 类型
    const borrower: User = {
      id: String(currentUser.id),
      name: currentUser.name,
      avatar: currentUser.avatar,
    };

    try {
      if (isCheckout) {
        if (!purpose.trim()) {
          setError('请填写出库用途');
          setIsProcessing(false);
          return;
        }
        if (!returnDate) {
          setError('请选择预计归还时间');
          setIsProcessing(false);
          return;
        }

        const barcodeIds = scannedItems.map((s) => s.barcodeId);
        const success = await checkoutDevices(barcodeIds, purpose.trim(), returnDate, borrower);
        
        if (success) {
          const deviceInfoStr = scannedItems
            .map((s) => `${s.model.name} (${s.barcodeId})`)
            .join(', ');
          addLog(
            borrower,
            '出库',
            deviceInfoStr,
            `用途：${purpose.trim()}，预计归还：${returnDate}`
          );
          setSuccessMsg(`成功出库 ${scannedItems.length} 台设备`);
          await refreshData?.();
        } else {
          setError('出库操作失败');
        }
      } else if (isAssign) {
        if (!purpose.trim()) {
          setError('请填写分配出库用途');
          setIsProcessing(false);
          return;
        }
        if (!returnDate) {
          setError('请选择预计归还时间');
          setIsProcessing(false);
          return;
        }

        const missingAssignment = scannedItems.find((item) => !assignments[item.barcodeId]);
        if (missingAssignment) {
          setError(`请先为设备 ${missingAssignment.barcodeId} 选择借用人`);
          setIsProcessing(false);
          return;
        }

        const barcodeIds = scannedItems.map((s) => s.barcodeId);
        const assignmentPayload = scannedItems.map((s) => ({
          barcodeId: s.barcodeId,
          userId: Number(assignments[s.barcodeId]),
        }));

        const success = await assignCheckoutDevices(
          barcodeIds,
          purpose.trim(),
          returnDate,
          assignmentPayload
        );

        if (success) {
          const deviceInfoStr = scannedItems
            .map((s) => `${s.model.name} (${s.barcodeId})`)
            .join(', ');

          const byUser: Record<string, number> = {};
          assignmentPayload.forEach((a) => {
            const targetUser = users.find((u) => u.id === a.userId);
            const name = targetUser?.name || `用户${a.userId}`;
            byUser[name] = (byUser[name] || 0) + 1;
          });
          const assignSummary = Object.entries(byUser)
            .map(([name, count]) => `${name}×${count}`)
            .join('，');

          addLog(
            borrower,
            '出库',
            deviceInfoStr,
            `分配出库；用途：${purpose.trim()}；预计归还：${returnDate}；分配：${assignSummary}`
          );
          setSuccessMsg(`成功分配并出库 ${scannedItems.length} 台设备`);
          await refreshData?.();
        } else {
          setError('分配出库操作失败');
        }
      } else if (isCheckin) {
        const barcodeIds = scannedItems.map((s) => s.barcodeId);
        const success = await checkinDevices(barcodeIds);
        
        if (success) {
          const deviceInfoStr = scannedItems
            .map((s) => `${s.model.name} (${s.barcodeId})`)
            .join(', ');
          addLog(borrower, '入库', deviceInfoStr, '归还入库');
          setSuccessMsg(`成功入库 ${scannedItems.length} 台设备`);
          await refreshData?.();
        } else {
          setError('入库操作失败');
        }
      } else {
        if (!transferReceiverId) {
          setError('请选择接收人');
          setIsProcessing(false);
          return;
        }
        if (!transferReason.trim()) {
          setError('请填写交接原因');
          setIsProcessing(false);
          return;
        }

        const receiverId = Number(transferReceiverId);
        const receiver = users.find((u) => u.id === receiverId);
        if (!receiver) {
          setError('接收人不存在');
          setIsProcessing(false);
          return;
        }

        const conflict = scannedItems.find(
          (s) => String(s.device.checkoutRecord?.borrower.id || '') === String(receiverId)
        );
        if (conflict) {
          setError(`设备 ${conflict.barcodeId} 的接收人不能与原借用人相同`);
          setIsProcessing(false);
          return;
        }

        const barcodeIds = scannedItems.map((s) => s.barcodeId);
        const success = await transferDevices(
          barcodeIds,
          receiverId,
          transferReason.trim(),
          transferReturnDate || undefined
        );

        if (success) {
          const deviceInfoStr = scannedItems
            .map((s) => `${s.model.name} (${s.barcodeId})`)
            .join(', ');
          const remarkParts = [
            `接收人：${receiver.name}`,
            `原因：${transferReason.trim()}`,
          ];
          if (transferReturnDate) {
            remarkParts.push(`预计归还：${transferReturnDate}`);
          }
          addLog(borrower, '交接', deviceInfoStr, remarkParts.join('，'));
          setSuccessMsg(`成功交接 ${scannedItems.length} 台设备`);
          await refreshData?.();
        } else {
          setError('交接操作失败');
        }
      }

      setScannedItems([]);
      setPurpose('');
      setReturnDate('');
      setTransferReceiverId('');
      setTransferReason('');
      setTransferReturnDate('');
      setAssignments({});
      setAssignUserSearchQuery({});
      setOpenAssignUserBarcode(null);
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">设备流转管理</h2>
        <p className="text-sm text-slate-500">批量扫描设备进行出库、分配出库、入库或交接操作</p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 grid grid-cols-4 gap-1 mb-6">
        <button
          onClick={() => setMode('checkout')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isCheckout ? 'bg-slate-800 text-red-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ArrowUpRightIcon className="w-4 h-4" />
          出库
        </button>
        <button
          onClick={() => setMode('assign')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isAssign ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          分配
        </button>
        <button
          onClick={() => setMode('transfer')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isTransfer ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ArrowRightLeftIcon className="w-4 h-4" />
          交接
        </button>
        <button
          onClick={() => setMode('checkin')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isCheckin ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ArrowDownLeftIcon className="w-4 h-4" />
          入库
        </button>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400"
          >
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          扫描设备编码
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isScanning}
            placeholder={
              isMobile 
                ? '输入编码或点击扫码' 
                : isFeishuClient 
                  ? '点击右侧按钮扫码或手动输入'
                  : '请使用扫码枪扫描设备条码'
            }
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors disabled:opacity-50"
          />

          {showScanButton ? (
            <button
              type="button"
              onClick={handleScanClick}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <ScanBarcodeIcon className="w-4 h-4" />
              )}
              扫码
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleScanResult(scanInput)}
              className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors flex-shrink-0"
            >
              添加
            </button>
          )}
        </div>
        {!isMobile && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <MonitorIcon className="w-3 h-3" />
            <span>
              {isFeishuClient 
                ? '飞书移动客户端内可使用相机扫码功能'
                : '电脑端请使用扫码枪进行扫描，扫描后自动添加到列表'
              }
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400"
          >
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanned Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">
            已扫描{' '}
            <span className="text-amber-400 font-mono text-sm">
              {scannedItems.length}
            </span>{' '}
            台设备
          </span>
          {scannedItems.length > 0 && (
            <button
              onClick={() => {
                setScannedItems([]);
                setAssignments({});
                setAssignUserSearchQuery({});
                setOpenAssignUserBarcode(null);
              }}
              className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
            >
              清空列表
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {scannedItems.map((item, index) => {
              const selectedAssignUser = users.find(
                (u) => String(u.id) === String(assignments[item.barcodeId] || '')
              ) || null;
              const isAssignDropdownOpen = openAssignUserBarcode === item.barcodeId;
              const currentAssignQuery = assignUserSearchQuery[item.barcodeId] || '';
              const filteredAssignUsers = currentAssignQuery.trim()
                ? users.filter((u) =>
                    u.name.toLowerCase().includes(currentAssignQuery.toLowerCase())
                  )
                : users;

              return (
                <motion.div
                  key={item.barcodeId}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex gap-3 px-3 py-2.5 bg-slate-800/50 border border-slate-700/40 rounded-lg ${
                    isAssign ? 'items-start' : 'items-center'
                  }`}
                >
                  <CheckCircleIcon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isCheckout ? 'text-red-400' : isAssign ? 'text-blue-400' : isTransfer ? 'text-cyan-400' : 'text-emerald-400'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">
                      {item.model.name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {item.barcodeId} · {item.category.name}
                    </div>
                    {(isCheckin || isTransfer) && item.device.checkoutRecord && (
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <UserIcon className="w-3 h-3" />
                        <span>
                          借用人: {item.device.checkoutRecord.borrower.name}
                        </span>
                        <ClockIcon className="w-3 h-3 ml-1" />
                        <span>
                          {formatDateTimeInTimeZone(
                            item.device.checkoutRecord.checkoutTime,
                            timezone,
                            {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {isAssign && (
                    <div
                      className="w-48 relative"
                      ref={isAssignDropdownOpen ? assignUserDropdownRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenAssignUserBarcode((prev) =>
                            prev === item.barcodeId ? null : item.barcodeId
                          );
                        }}
                        className="w-full flex items-center gap-1.5 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate flex-1 text-left">
                          {selectedAssignUser ? selectedAssignUser.name : '选择借用人'}
                        </span>
                        {selectedAssignUser ? (
                          <XIcon
                            className="w-3 h-3 text-slate-500 hover:text-slate-300 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignments((prev) => ({
                                ...prev,
                                [item.barcodeId]: '',
                              }));
                            }}
                          />
                        ) : (
                          <ChevronDownIcon className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isAssignDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                          >
                            <div className="p-2 border-b border-slate-700">
                              <div className="relative">
                                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                                <input
                                  type="text"
                                  value={currentAssignQuery}
                                  onChange={(e) =>
                                    setAssignUserSearchQuery((prev) => ({
                                      ...prev,
                                      [item.barcodeId]: e.target.value,
                                    }))
                                  }
                                  placeholder="搜索用户名..."
                                  className="w-full bg-slate-900 border border-slate-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredAssignUsers.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-slate-500 text-center">
                                  无匹配用户
                                </div>
                              ) : (
                                filteredAssignUsers.map((u) => (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setAssignments((prev) => ({
                                        ...prev,
                                        [item.barcodeId]: String(u.id),
                                      }));
                                      setError('');
                                      setOpenAssignUserBarcode(null);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                                      String(selectedAssignUser?.id || '') === String(u.id)
                                        ? 'bg-slate-700 text-blue-400'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                                      {u.name.charAt(0)}
                                    </span>
                                    <span className="truncate">{u.name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <button
                    onClick={() => removeItem(item.barcodeId)}
                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                    aria-label="移除"
                  >
                    <Trash2Icon className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {scannedItems.length === 0 && (
            <div className="text-center py-10 text-slate-600">
              <ScanBarcodeIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">
                {isFeishuClient 
                  ? '点击上方扫码按钮或手动输入设备编码'
                  : '扫描设备条形码或条形码添加到列表'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Details */}
      {isCheckout && scannedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-4 space-y-4"
        >
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              预计归还时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (selectedDate && selectedDate < todayDate) {
                  setError('预计归还日期不能早于今天');
                  return;
                }
                setReturnDate(selectedDate);
                setError('');
              }}
              min={todayDate}
              className="w-full min-w-0 appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-colors [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              借用人
            </label>
            <div className="px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300">
              {currentUser?.name || '未登录'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Transfer Details */}
      {isAssign && scannedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              分配出库用途 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setError('');
              }}
              placeholder="例如：现场拍摄、活动录制"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              预计归还时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (selectedDate && selectedDate < todayDate) {
                  setError('预计归还日期不能早于今天');
                  return;
                }
                setReturnDate(selectedDate);
                setError('');
              }}
              min={todayDate}
              className="w-full min-w-0 appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60 transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="text-xs text-slate-500">
            请在上方每台设备右侧选择借用人，提交后将按设备分别分配并一起出库。
          </div>
        </motion.div>
      )}

      {/* Transfer Details */}
      {isTransfer && scannedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 mb-4 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              接收人 <span className="text-red-400">*</span>
            </label>
            <div className="relative" ref={transferUserDropdownRef}>
              <button
                type="button"
                onClick={() => setShowTransferUserDropdown((prev) => !prev)}
                className="w-full flex items-center gap-1.5 px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate flex-1 text-left">
                  {selectedTransferUser ? selectedTransferUser.name : '请选择接收人'}
                </span>
                {selectedTransferUser ? (
                  <XIcon
                    className="w-3 h-3 text-slate-500 hover:text-slate-300 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTransferReceiverId('');
                      setTransferUserSearchQuery('');
                    }}
                  />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-slate-500 shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {showTransferUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute left-0 top-full mt-1 z-30 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-700">
                      <div className="relative">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={transferUserSearchQuery}
                          onChange={(e) => setTransferUserSearchQuery(e.target.value)}
                          placeholder="搜索用户名..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-md pl-7 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredTransferUsers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500 text-center">
                          无匹配用户
                        </div>
                      ) : (
                        filteredTransferUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setTransferReceiverId(String(u.id));
                              setShowTransferUserDropdown(false);
                              setTransferUserSearchQuery('');
                              setError('');
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                              String(selectedTransferUser?.id || '') === String(u.id)
                                ? 'bg-slate-700 text-cyan-400'
                                : 'text-slate-300'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
                              {u.name.charAt(0)}
                            </span>
                            <span className="truncate">{u.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              交接原因 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={transferReason}
              onChange={(e) => {
                setTransferReason(e.target.value);
                setError('');
              }}
              placeholder="例如：项目负责人调整、临时替班"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              更新预计归还时间（可选）
            </label>
            <input
              type="date"
              value={transferReturnDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (selectedDate && selectedDate < todayDate) {
                  setError('预计归还日期不能早于今天');
                  return;
                }
                setTransferReturnDate(selectedDate);
                setError('');
              }}
              min={todayDate}
              className="w-full min-w-0 appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
            />
          </div>
        </motion.div>
      )}

      {/* Submit */}
      {scannedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isCheckout
                ? 'bg-red-500 text-white hover:bg-red-400'
                : isAssign
                  ? 'bg-blue-500 text-white hover:bg-blue-400'
                : isTransfer
                  ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                  : 'bg-emerald-500 text-white hover:bg-emerald-400'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2Icon className="w-4 h-4 animate-spin" />
                处理中...
              </span>
            ) : (
              isCheckout
                ? `确认出库 (${scannedItems.length} 台)`
                : isAssign
                  ? `确认分配出库 (${scannedItems.length} 台)`
                : isTransfer
                  ? `确认交接 (${scannedItems.length} 台)`
                  : `确认入库 (${scannedItems.length} 台)`
            )}
          </button>
        </motion.div>
      )}

      {/* Currently checked out devices (for checkin reference) */}
      {(isCheckin || isTransfer) && checkedOutDevices.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            当前出库设备
          </h3>
          <div className="space-y-2">
            {checkedOutDevices.map(({ device, model, category }) => (
              <div
                key={device.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 truncate">
                    {model.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {device.barcodeId} · {category.name}
                  </div>
                  {device.checkoutRecord && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      借用人: {device.checkoutRecord.borrower.name} · 预计归还:{' '}
                      {device.checkoutRecord.expectedReturnTime 
                        ? formatDateTimeInTimeZone(
                            device.checkoutRecord.expectedReturnTime,
                            timezone,
                            {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            }
                          )
                        : '-'}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-400 border-amber-500/20">
                  出库
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckInOut;
