export type DeviceStatus = '在库' | '出库' | '维修';

// 所有操作类型
export type OperationType =
  | '出库' | '分配' | '入库' | '交接' | '出入库' | '编辑信息'
  | '添加设备' | '修改设备' | '删除设备'
  | '添加分类' | '修改分类' | '删除分类'
  | '添加型号' | '修改型号' | '删除型号';

export interface User {
  feishu_open_id: string;
  name: string;
  avatar?: string;
}

export interface Device {
  id: string;
  barcodeId: string;
  modelId: string;
  status: DeviceStatus;
  checkoutRecord?: CheckoutRecord;
}

export interface EquipmentModel {
  id: string;
  name: string;
  categoryId: string;
  devices: Device[];
}

export interface Category {
  id: string;
  name: string;
  models: EquipmentModel[];
}

export interface CheckoutRecord {
  id: string;
  deviceId: string;
  barcodeId: string;
  deviceName: string;
  modelName: string;
  borrower: User;
  purpose: string;
  checkoutTime: string;
  expectedReturnTime: string;
  returnTime?: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  operator: {
    feishu_open_id: string;
    name: string;
    avatar?: string;
  };
  holderName?: string;
  operationType: OperationType;
  deviceInfo: string;
  remark: string;
}
