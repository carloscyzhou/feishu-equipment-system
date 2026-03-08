import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DeviceManagement } from './pages/DeviceManagement';
import { CheckInOut } from './pages/CheckInOut';
import { OperationLogPage } from './pages/OperationLog';
import { useDeviceStore } from './hooks/useDeviceStore';
import { useOperationLog } from './hooks/useOperationLog';
import { useAuth, isFeishuClient } from './hooks/useAuth';

type TabId = 'devices' | 'checkinout' | 'logs';

// 非飞书环境提示页面
function FeishuRequiredPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
          📱
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-3">
          请在飞书客户端中打开
        </h1>
        <a
          href="https://www.feishu.cn/download"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          下载飞书客户端
        </a>
      </div>
    </div>
  );
}

// 加载中页面
function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md w-full">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
        <div className="text-gray-900 font-medium mb-2">正在登录...</div>
        <div className="text-gray-400 text-sm">请稍候，正在获取用户信息</div>
      </div>
    </div>
  );
}

// 错误页面
function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
          ⚠️
        </div>
        <div className="text-gray-900 font-semibold mb-2">登录失败</div>
        <div className="text-gray-500 text-sm mb-6">{message}</div>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          重新登录
        </button>
      </div>
    </div>
  );
}

// 主应用内容
function MainApp({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<TabId>('devices');
  const deviceStore = useDeviceStore();
  const operationLog = useOperationLog();

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className={activeTab === 'devices' ? 'block' : 'hidden'}>
        <DeviceManagement
          categories={deviceStore.categories}
          isLoading={deviceStore.isLoading}
          error={deviceStore.error}
          refresh={deviceStore.refresh}
          addCategory={deviceStore.addCategory}
          updateCategory={deviceStore.updateCategory}
          deleteCategory={deviceStore.deleteCategory}
          addModel={deviceStore.addModel}
          updateModel={deviceStore.updateModel}
          deleteModel={deviceStore.deleteModel}
          addDevice={deviceStore.addDevice}
          updateDevice={deviceStore.updateDevice}
          deleteDevice={deviceStore.deleteDevice}
          addLog={() => {}}
          getStats={deviceStore.getStats}
          reorderCategories={deviceStore.reorderCategories}
          reorderModels={deviceStore.reorderModels}
          checkBarcodeExists={deviceStore.checkBarcodeExists}
          getExistingBarcodes={deviceStore.getExistingBarcodes}
        />
      </div>
      <div className={activeTab === 'checkinout' ? 'block' : 'hidden'}>
        <CheckInOut
          findDeviceByBarcode={deviceStore.findDeviceByBarcode}
          checkoutDevices={deviceStore.checkoutDevices}
          assignCheckoutDevices={deviceStore.assignCheckoutDevices}
          checkinDevices={deviceStore.checkinDevices}
          transferDevices={deviceStore.transferDevices}
          addLog={() => {}}
          getAllDevices={deviceStore.getAllDevices}
          refreshData={async () => {
            await Promise.all([deviceStore.refresh(), operationLog.refresh()]);
          }}
        />
      </div>
      <div className={activeTab === 'logs' ? 'block' : 'hidden'}>
        <OperationLogPage
          logs={operationLog.logs}
          total={operationLog.total}
          page={operationLog.page}
          pageSize={operationLog.pageSize}
          isLoading={operationLog.isLoading}
          onPageChange={operationLog.updatePage}
          onFilterChange={operationLog.updateFilters}
          getUniqueOperators={operationLog.getUniqueOperators}
          exportLogs={operationLog.exportLogs}
        />
      </div>
    </Layout>
  );
}

export function App() {
  const auth = useAuth();
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // 自动登录逻辑
  useEffect(() => {
    // 如果不在飞书客户端内，不需要尝试登录
    if (!isFeishuClient()) {
      return;
    }

    // 如果已经认证或正在加载，不需要重复尝试
    if (auth.isAuthenticated || auth.isLoading) {
      return;
    }

    // 如果已经尝试过自动登录，不再尝试
    if (autoLoginAttempted) {
      return;
    }

    // 飞书环境且未登录，自动执行登录
    if (!auth.user && !auth.error) {
      console.log('Feishu client detected, auto login...');
      setAutoLoginAttempted(true);
      auth.loginWithFeishu();
    }
  }, [auth, autoLoginAttempted]);

  // 非飞书环境 - 显示提示页面
  if (!isFeishuClient()) {
    return <FeishuRequiredPage />;
  }

  // 加载中 - 显示加载页面
  if (auth.isLoading) {
    return <LoadingPage />;
  }

  // 有错误 - 显示错误页面
  if (auth.error) {
    return (
      <ErrorPage
        message={auth.error}
        onRetry={() => {
          setAutoLoginAttempted(false);
          auth.clearError();
          auth.loginWithFeishu();
        }}
      />
    );
  }

  // 已认证 - 显示主应用
  if (auth.isAuthenticated && auth.user) {
    return <MainApp user={auth.user} />;
  }

  // 默认显示加载页面（等待自动登录）
  return <LoadingPage />;
}
