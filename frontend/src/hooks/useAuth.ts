import { useState, useEffect, useCallback } from 'react';
import { authApi, UserInfo } from '../api';

// 飞书应用配置 - 动态从后端获取
let FEISHU_APP_ID = '';

// 检测是否在飞书客户端内
export function isFeishuClient(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('lark') || ua.includes('feishu');
}

// 检测是否为桌面端飞书
export function isDesktopFeishuClient(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isDesktopOS = ua.includes('windows') || ua.includes('macintosh') || ua.includes('x11');
  const isMobileOS = ua.includes('android') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('harmony');
  return isDesktopOS && !isMobileOS;
}

// 加载飞书 JSAPI
export function loadFeishuJSAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.tt || window.h5sdk) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://lf-package-cn.feishucdn.com/obj/feishu-static/lark/op/h5-js-sdk-1.5.35.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('加载飞书 JSAPI 失败'));
    document.head.appendChild(script);
  });
}

// 获取飞书授权码
export async function getFeishuAuthCode(appId: string = FEISHU_APP_ID): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.tt) {
      reject(new Error('飞书 SDK 未加载'));
      return;
    }

    if (window.h5sdk && window.h5sdk.ready) {
      window.h5sdk.ready(() => {
        console.log('H5 SDK ready, requesting access...');
        
        window.tt!.requestAccess({
          appID: appId,
          scopeList: ['contact:user.base:readonly'],
          success: (res: any) => {
            console.log('Get auth code success:', res);
            if (res.code) {
              resolve(res.code);
            } else {
              reject(new Error('未获取到授权码'));
            }
          },
          fail: (err: any) => {
            console.error('Get auth code failed:', err);
            reject(new Error(err.errMsg || '获取授权码失败'));
          }
        });
      });
    } else {
      console.log('h5sdk not found, trying tt directly...');
      window.tt.requestAccess({
        appID: appId,
        scopeList: ['contact:user.base:readonly'],
        success: (res: any) => {
          console.log('Get auth code success:', res);
          if (res.code) {
            resolve(res.code);
          } else {
            reject(new Error('未获取到授权码'));
          }
        },
        fail: (err: any) => {
          console.error('Get auth code failed:', err);
          reject(new Error(err.errMsg || '获取授权码失败'));
        }
      });
    }
  });
}

// 认证状态
interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  requireFeishu: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
    requireFeishu: false,
  });

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await authApi.getCurrentUser();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        requireFeishu: false,
      });
      return user;
    } catch (error: any) {
      if (error.status === 401) {
        setState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: error.message || '获取用户信息失败',
        }));
      }
      return null;
    }
  }, []);

  // 飞书登录 - 只支持飞书客户端内
  const loginWithFeishu = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 检查是否在飞书客户端内
      if (!isFeishuClient()) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
          requireFeishu: true,
        });
        return false;
      }
      
      // 飞书环境：正常登录流程
      // 1. 先获取飞书配置（app_id）
      console.log('Fetching Feishu config...');
      const config = await authApi.getFeishuConfig();
      FEISHU_APP_ID = config.app_id;
      console.log('Got Feishu config, app_id:', FEISHU_APP_ID);
      
      // 2. 加载飞书 JSAPI
      await loadFeishuJSAPI();
      
      // 3. 获取授权码（使用正确的 app_id）
      const code = await getFeishuAuthCode(FEISHU_APP_ID);
      console.log('Got auth code:', code);
      
      // 4. 发送到后端登录
      const result = await authApi.login(code);
      console.log('Login result:', result);
      
      if (result.success && result.user) {
        setState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
          requireFeishu: false,
        });
        return true;
      } else {
        throw new Error('登录失败');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: error.message || '登录过程中出现错误',
        requireFeishu: false,
      });
      return false;
    }
  }, []);

  // 退出登录
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        requireFeishu: false,
      });
    }
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 初始化 - 检查是否已登录
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    ...state,
    loginWithFeishu,
    logout,
    clearError,
    refetchUser: fetchCurrentUser,
    isFeishuClient: isFeishuClient(),
    isDesktopFeishuClient: isDesktopFeishuClient(),
  };
}

// 全局类型声明
declare global {
  interface Window {
    tt?: any;
    h5sdk?: any;
  }
}

export default useAuth;
