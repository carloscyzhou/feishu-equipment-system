import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackageIcon,
  ArrowLeftRightIcon,
  FileTextIcon,
  MenuIcon,
  LogOutIcon,
  AlertCircleIcon,
  Loader2Icon,
  SmartphoneIcon
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useAuth, isFeishuClient, isDesktopFeishuClient } from '../hooks/useAuth';
import { useTimezone, useTimezoneOptions } from '../utils/timezone';

type TabId = 'devices' | 'checkinout' | 'logs';

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

const tabs: Array<{
  id: TabId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'devices', label: '设备管理', icon: PackageIcon },
  { id: 'checkinout', label: '设备流转', icon: ArrowLeftRightIcon },
  { id: 'logs', label: '操作日志', icon: FileTextIcon },
];

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

// 登录页面组件
function LoginPage({ onLogin, isLoading, error, isFeishu }: {
  onLogin: () => void;
  isLoading: boolean;
  error: string | null;
  isFeishu: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center"
      >
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center">
          <PackageIcon className="w-10 h-10 text-slate-900" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-100 mb-2">
          器材管理系统
        </h1>

        {/* 飞书环境提示 */}
        {isFeishu ? (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
              <SmartphoneIcon className="w-4 h-4" />
              <span>已检测使用飞书客户端</span>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
              <AlertCircleIcon className="w-4 h-4" />
              <span>非飞书环境 - 测试模式</span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 登录按钮 */}
        <button
          onClick={onLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2Icon className="w-5 h-5 animate-spin" />
              登录中...
            </>
          ) : (
            <>
              <SmartphoneIcon className="w-5 h-5" />
              {isFeishu ? '飞书一键登录' : '测试登录'}
            </>
          )}
        </button>

        {/* 提示信息 */}
        <p className="mt-6 text-xs text-slate-600">
          {isFeishu 
            ? '点击按钮授权飞书账号登录系统'
            : '当前不在飞书客户端内，使用测试模式登录'
          }
        </p>
      </motion.div>
    </div>
  );
}

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    loginWithFeishu,
    logout,
    clearError,
    isFeishuClient: isFeishu,
  } = useAuth();
  const timezoneOptions = useTimezoneOptions();
  const { timezoneSetting, timezone, setTimezoneSetting } = useTimezone();

  // 处理登录
  const handleLogin = async () => {
    clearError();
    await loginWithFeishu();
  };

  // 处理退出
  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // 未登录状态显示登录页
  if (!isAuthenticated && !isLoading) {
    return (
      <LoginPage
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error}
        isFeishu={isFeishu}
      />
    );
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2Icon className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 移动端布局
  if (isMobile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Mobile Top Bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-amber-500" />
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">
              器材管理
            </h1>
          </div>
          
          {/* 用户头像菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2"
            >
              <UserAvatar 
                name={user?.name || '用户'} 
                avatar={user?.avatar}
                size="sm" 
              />
            </button>
            
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-slate-200">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.open_id}</p>
                  </div>
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">时区</p>
                    <select
                      value={timezoneSetting}
                      onChange={(e) => setTimezoneSetting(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    >
                      {timezoneOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-600 mt-1 truncate">{timezone}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    退出登录
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-16">{children}</main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex items-center z-40">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 relative transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute top-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 flex-shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-52'
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <MenuIcon className="w-4 h-4" />
          </button>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5"
            >
              <PackageIcon className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold text-slate-100 tracking-tight">
                器材管理系统
              </span>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                  isActive
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-slate-800 relative">
          {sidebarCollapsed ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium mx-auto hover:bg-slate-500 transition-colors"
            >
              {user?.name?.[0] || '?'}
            </button>
          ) : (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full"
            >
              <UserAvatar 
                name={user?.name || '用户'} 
                avatar={user?.avatar}
              />
            </button>
          )}

          {/* 用户菜单 */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className={`absolute bottom-full mb-2 ${sidebarCollapsed ? 'left-14' : 'left-2 right-2'} bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50`}
              >
                {!sidebarCollapsed && (
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-slate-200">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.open_id}</p>
                  </div>
                )}
                <div className="px-3 py-2 border-b border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">时区</p>
                  <select
                    value={timezoneSetting}
                    onChange={(e) => setTimezoneSetting(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  >
                    {timezoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-600 mt-1 truncate">{timezone}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition-colors"
                >
                  <LogOutIcon className="w-4 h-4" />
                  {!sidebarCollapsed && '退出登录'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}

export default Layout;
