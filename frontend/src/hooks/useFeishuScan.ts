import { useState, useCallback } from 'react';
import { scanApi, ScanConfig, ScanProcessResponse } from '../api';
import { isFeishuClient, isDesktopFeishuClient, loadFeishuJSAPI } from './useAuth';

export interface ScannedEquipment {
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
}

export interface ScanResult {
  success: boolean;
  message: string;
  canProceed: boolean;
  equipment?: ScannedEquipment;
  scannedCode?: string; // 原始扫码内容（用于添加设备时获取条码）
}

export function useFeishuScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取飞书扫码配置
   */
  const getScanConfig = useCallback(async (): Promise<ScanConfig> => {
    const currentUrl = window.location.href.split('#')[0];
    return scanApi.getScanConfig(currentUrl);
  }, []);

  /**
   * 使用飞书客户端扫码
   */
  const scanWithFeishu = useCallback(async (): Promise<string> => {
    // 桌面端飞书不支持扫码
    if (isDesktopFeishuClient()) {
      throw new Error('飞书 PC 端不支持扫码，请直接使用扫描枪或输入设备编号');
    }

    // 加载飞书 JSAPI
    await loadFeishuJSAPI();

    if (!window.tt || typeof window.tt.scanCode !== 'function') {
      throw new Error('当前环境不支持扫码能力');
    }

    // 获取扫码配置
    const config = await getScanConfig();

    if (!config.signature) {
      throw new Error('扫码配置签名为空');
    }

    // 配置 JSAPI
    const configAPI = window.h5sdk?.config || window.tt?.config;
    if (!configAPI) {
      throw new Error('飞书 config API 不可用');
    }

    configAPI({
      appId: config.app_id,
      timestamp: String(config.timestamp),
      nonceStr: config.nonceStr,
      signature: config.signature,
      jsApiList: ['scanCode']
    });

    // 等待 ready
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 1000);

      const onReady = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
        }
      };

      const onError = (err: any) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          const errMsg = err?.errorMessage || err?.errMsg || '';
          if (/signature is expired|过期/i.test(errMsg)) {
            reject(new Error('签名已过期，请刷新页面后重试'));
          } else {
            reject(new Error(err?.errorMessage || err?.errMsg || err?.message || 'JSAPI 初始化失败'));
          }
        }
      };

      if (window.h5sdk?.ready) {
        window.h5sdk.ready(onReady);
        window.h5sdk.error && window.h5sdk.error(onError);
      } else if (window.tt?.ready) {
        window.tt.ready(onReady);
        window.tt.error && window.tt.error(onError);
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });

    // 调用扫码
    return new Promise<string>((resolve, reject) => {
      window.tt.scanCode({
        scanType: ['qrCode', 'barCode', 'datamatrix', 'pdf417'],
        barCodeInput: true,
        success: (res: any) => resolve(res.result),
        fail: (err: any) => {
          const errno = Number(err?.errno ?? err?.errorCode ?? -1);
          const errMsg = String(err?.errMsg || err?.message || '');

          // 用户取消扫码，不抛出错误（返回特殊标记）
          if (/cancel|取消/i.test(errMsg) || errno === 1001) {
            resolve('__CANCELLED__');
            return;
          }

          let errorMessage = errMsg || '扫码失败';
          if (errno === 103) {
            errorMessage = '当前客户端版本或平台不支持扫码';
          }

          reject(new Error(errorMessage));
        }
      });
    });
  }, [getScanConfig]);

  /**
   * 处理扫码结果
   */
  const processScan = useCallback(async (
    qrCode: string,
    mode: 'checkout' | 'checkin' | 'transfer'
  ): Promise<ScanResult> => {
    try {
      const result = await scanApi.processScan({ qr_code: qrCode, mode });
      
      return {
        success: result.success,
        message: result.message,
        canProceed: result.can_proceed,
        equipment: result.equipment ? {
          id: result.equipment.id,
          model_name: result.equipment.model_name,
          serial_number: result.equipment.serial_number,
          qr_code: result.equipment.qr_code,
          status: result.equipment.status,
          current_user_id: result.equipment.current_user_id,
          current_user_name: result.equipment.current_user_name,
          checkout_time: result.equipment.checkout_time,
          purpose: result.equipment.purpose,
          category_name: result.equipment.category_name,
        } : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '处理扫码结果失败',
        canProceed: false,
      };
    }
  }, []);

  /**
   * 开始扫码流程
   */
  const startScan = useCallback(async (mode: 'checkout' | 'checkin' | 'transfer'): Promise<ScanResult | null> => {
    setIsScanning(true);
    setError(null);

    try {
      let qrCode: string;

      if (isFeishuClient()) {
        qrCode = await scanWithFeishu();
        // 用户取消扫码，静默返回 null
        if (qrCode === '__CANCELLED__') {
          setIsScanning(false);
          return null;
        }
      } else {
        // 非飞书环境：使用 prompt 模拟（测试模式）
        qrCode = prompt('请输入条形码内容（测试模式）') || '';
        if (!qrCode) {
          setIsScanning(false);
          return null;
        }
      }

      const result = await processScan(qrCode, mode);
      setIsScanning(false);
      // 返回原始扫码内容，方便添加设备时使用
      return { ...result, scannedCode: qrCode };
    } catch (err: any) {
      const errorMessage = err.message || '扫码失败';
      setError(errorMessage);
      setIsScanning(false);
      return {
        success: false,
        message: errorMessage,
        canProceed: false,
      };
    }
  }, [scanWithFeishu, processScan]);

  /**
   * 手动处理条形码（用于扫码枪或手动输入）
   */
  const handleManualScan = useCallback(async (
    qrCode: string,
    mode: 'checkout' | 'checkin' | 'transfer'
  ): Promise<ScanResult> => {
    setError(null);
    const result = await processScan(qrCode, mode);
    if (!result.success) {
      setError(result.message);
    }
    // 返回原始扫码内容
    return { ...result, scannedCode: qrCode };
  }, [processScan]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isScanning,
    error,
    isFeishuClient: isFeishuClient(),
    isDesktopFeishuClient: isDesktopFeishuClient(),
    startScan,
    handleManualScan,
    processScan,
    clearError,
  };
}

export default useFeishuScan;
