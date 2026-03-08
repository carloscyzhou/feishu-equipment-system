import { useState, useEffect, useCallback } from 'react';
import { categoryApi, modelApi, equipmentApi, checkoutApi } from '../api';
import { Category as ApiCategory, EquipmentModel as ApiModel, Equipment as ApiEquipment } from '../api';

// 前端使用的类型定义
export type DeviceStatus = '在库' | '出库' | '维修';

export interface User {
  id: string;
  name: string;
  avatar?: string;
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

// 状态映射：后端 0/1 -> 前端字符串
function mapStatus(status: number): DeviceStatus {
  return status === 0 ? '在库' : status === 1 ? '出库' : '维修';
}

// 反向映射：前端字符串 -> 后端 0/1
function mapStatusToBackend(status: DeviceStatus): number {
  return status === '在库' ? 0 : status === '出库' ? 1 : 0;
}

export function useDeviceStore() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. 获取所有分类
      const categoriesData = await categoryApi.getAll();
      console.log('[DeviceStore] Categories loaded:', categoriesData);
      
      // 2. 获取所有型号
      const modelsData = await modelApi.getAll();
      console.log('[DeviceStore] Models loaded:', modelsData);
      
      // 3. 分页获取所有器材（后端单页最大 100）
      const pageSize = 100;
      const equipmentsList: ApiEquipment[] = [];
      let page = 1;

      while (true) {
        const equipmentsData = await equipmentApi.getAll({ page, page_size: pageSize });
        const pageData = equipmentsData?.data || [];
        equipmentsList.push(...pageData);

        if (pageData.length === 0 || equipmentsList.length >= (equipmentsData?.total || 0) || pageData.length < pageSize) {
          break;
        }
        page += 1;
      }
      console.log('[DeviceStore] Equipments loaded:', equipmentsList.length);

      // 构建前端数据结构
      const formattedCategories: Category[] = categoriesData.map(cat => {
        // 找到该分类下的所有型号
        const categoryModels = modelsData.filter(m => m.category_id === cat.id);
        
        return {
          id: String(cat.id),
          name: cat.name,
          models: categoryModels.map(model => {
            // 找到该型号下的所有器材
            const modelEquipments = equipmentsList.filter(e => e.model_id === model.id);
            
            return {
              id: String(model.id),
              name: model.name,
              categoryId: String(cat.id),
              devices: modelEquipments.map(equip => ({
                id: String(equip.id),
                barcodeId: equip.serial_number || '',
                modelId: String(model.id),
                status: mapStatus(equip.status),
                // 如果已借出，构建借出记录
                checkoutRecord: equip.status === 1 ? {
                  id: `co-${equip.id}`,
                  deviceId: String(equip.id),
                  barcodeId: equip.serial_number || '',
                  deviceName: model.name,
                  modelName: model.name,
                  borrower: {
                    id: String(equip.current_user_id || ''),
                    name: equip.current_user_name || '未知用户',
                  },
                  purpose: equip.purpose || '-',
                  checkoutTime: equip.checkout_time || '',
                  expectedReturnTime: equip.expected_return_at || '',
                } : undefined,
              })),
            };
          }),
        };
      });

      console.log('[DeviceStore] Formatted categories:', formattedCategories);
      setCategories(formattedCategories);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      console.error('[DeviceStore] Failed to load device data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 添加分类
  const addCategory = useCallback(async (name: string): Promise<Category | null> => {
    try {
      const newCat = await categoryApi.create({ name });
      const category: Category = {
        id: String(newCat.id),
        name: newCat.name,
        models: [],
      };
      setCategories(prev => [...prev, category]);
      return category;
    } catch (err: any) {
      setError(err.message || '创建分类失败');
      return null;
    }
  }, []);

  // 更新分类
  const updateCategory = useCallback(async (categoryId: string, name: string): Promise<void> => {
    try {
      await categoryApi.update(Number(categoryId), { name });
      setCategories(prev =>
        prev.map(c => c.id === categoryId ? { ...c, name } : c)
      );
    } catch (err: any) {
      setError(err.message || '更新分类失败');
    }
  }, []);

  // 删除分类
  const deleteCategory = useCallback(async (categoryId: string): Promise<void> => {
    try {
      await categoryApi.delete(Number(categoryId));
      setCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (err: any) {
      setError(err.message || '删除分类失败');
    }
  }, []);

  // 添加型号
  const addModel = useCallback(async (categoryId: string, name: string): Promise<EquipmentModel | null> => {
    try {
      const newModel = await modelApi.create({
        category_id: Number(categoryId),
        name,
        total_count: 0,
      });
      const model: EquipmentModel = {
        id: String(newModel.id),
        name: newModel.name,
        categoryId: String(categoryId),
        devices: [],
      };
      setCategories(prev =>
        prev.map(c =>
          c.id === categoryId ? { ...c, models: [...c.models, model] } : c
        )
      );
      return model;
    } catch (err: any) {
      setError(err.message || '创建型号失败');
      return null;
    }
  }, []);

  // 更新型号
  const updateModel = useCallback(async (modelId: string, name: string): Promise<void> => {
    try {
      await modelApi.update(Number(modelId), { name });
      setCategories(prev =>
        prev.map(c => ({
          ...c,
          models: c.models.map(m => m.id === modelId ? { ...m, name } : m)
        }))
      );
    } catch (err: any) {
      setError(err.message || '更新型号失败');
    }
  }, []);

  // 删除型号
  const deleteModel = useCallback(async (categoryId: string, modelId: string): Promise<void> => {
    try {
      await modelApi.delete(Number(modelId));
      setCategories(prev =>
        prev.map(c =>
          c.id === categoryId
            ? { ...c, models: c.models.filter(m => m.id !== modelId) }
            : c
        )
      );
    } catch (err: any) {
      setError(err.message || '删除型号失败');
    }
  }, []);

  // 添加设备
  const addDevice = useCallback(async (modelId: string, barcodeId: string): Promise<Device | null> => {
    try {
      const result = await equipmentApi.create({
        model_id: Number(modelId),
        serial_numbers: [barcodeId],
      });
      
      if (result.data.length > 0) {
        const equip = result.data[0];
        const device: Device = {
          id: String(equip.id),
          barcodeId,
          modelId,
          status: '在库',
        };
        
        setCategories(prev =>
          prev.map(c => ({
            ...c,
            models: c.models.map(m =>
              m.id === modelId
                ? { ...m, devices: [...m.devices, device] }
                : m
            )
          }))
        );
        return device;
      }
      return null;
    } catch (err: any) {
      setError(err.message || '创建设备失败');
      return null;
    }
  }, []);

  // 更新设备
  const updateDevice = useCallback(async (deviceId: string, barcodeId: string): Promise<void> => {
    try {
      await equipmentApi.update(Number(deviceId), { serial_number: barcodeId });
      setCategories(prev =>
        prev.map(c => ({
          ...c,
          models: c.models.map(m => ({
            ...m,
            devices: m.devices.map(d =>
              d.id === deviceId ? { ...d, barcodeId } : d
            )
          }))
        }))
      );
    } catch (err: any) {
      setError(err.message || '更新设备失败');
    }
  }, []);

  // 删除设备
  const deleteDevice = useCallback(async (modelId: string, deviceId: string): Promise<void> => {
    try {
      await equipmentApi.delete(Number(deviceId));
      setCategories(prev =>
        prev.map(c => ({
          ...c,
          models: c.models.map(m =>
            m.id === modelId
              ? { ...m, devices: m.devices.filter(d => d.id !== deviceId) }
              : m
          )
        }))
      );
    } catch (err: any) {
      setError(err.message || '删除设备失败');
    }
  }, []);

  // 出库设备
  const checkoutDevices = useCallback(async (
    barcodeIds: string[],
    purpose: string,
    expectedReturnTime: string,
    borrower: User
  ): Promise<boolean> => {
    try {
      // 根据 barcodeId 找到对应的设备 ID
      const deviceIds: string[] = [];
      const foundBarcodes = new Set<string>();
      
      for (const cat of categories) {
        for (const model of cat.models) {
          for (const device of model.devices) {
            if (barcodeIds.includes(device.barcodeId)) {
              deviceIds.push(device.id);
              foundBarcodes.add(device.barcodeId);
            }
          }
        }
      }
      
      // 对于本地找不到的设备（扫码添加的临时设备），尝试从 barcodeId 解析设备 ID
      for (const barcodeId of barcodeIds) {
        if (!foundBarcodes.has(barcodeId)) {
          // 尝试解析 EQUIP:ID:HASH 格式
          if (barcodeId.startsWith('EQUIP:')) {
            const parts = barcodeId.split(':');
            if (parts.length >= 2) {
              const extractedId = parts[1];
              if (extractedId && !isNaN(Number(extractedId))) {
                deviceIds.push(extractedId);
                continue;
              }
            }
          }
          // 如果不是 EQUIP 格式，尝试直接作为数字 ID
          if (!isNaN(Number(barcodeId))) {
            deviceIds.push(barcodeId);
          }
        }
      }

      if (deviceIds.length === 0) {
        setError('未找到对应的设备');
        return false;
      }

      const result = await checkoutApi.checkout({
        equipment_ids: deviceIds.map(id => Number(id)),
        purpose,
        expected_return_at: expectedReturnTime,
      });

      if (result.success) {
        // 更新本地状态
        setCategories(prev =>
          prev.map(c => ({
            ...c,
            models: c.models.map(m => ({
              ...m,
              devices: m.devices.map(d => {
                if (deviceIds.includes(d.id)) {
                  return {
                    ...d,
                    status: '出库' as const,
                    checkoutRecord: {
                      id: `co-${d.id}`,
                      deviceId: d.id,
                      barcodeId: d.barcodeId,
                      deviceName: m.name,
                      modelName: m.name,
                      borrower,
                      purpose,
                      checkoutTime: new Date().toISOString(),
                      expectedReturnTime,
                    },
                  };
                }
                return d;
              })
            }))
          }))
        );
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || '出库失败');
      return false;
    }
  }, [categories]);

  // 分配并出库设备（每台设备可指定借用人）
  const assignCheckoutDevices = useCallback(async (
    barcodeIds: string[],
    purpose: string,
    expectedReturnTime: string,
    assignments: Array<{ barcodeId: string; userId: number }>
  ): Promise<boolean> => {
    try {
      const deviceIds: number[] = [];
      const foundBarcodes = new Set<string>();
      const barcodeToDeviceId = new Map<string, number>();

      for (const cat of categories) {
        for (const model of cat.models) {
          for (const device of model.devices) {
            if (barcodeIds.includes(device.barcodeId)) {
              const numericId = Number(device.id);
              if (!Number.isNaN(numericId)) {
                deviceIds.push(numericId);
                barcodeToDeviceId.set(device.barcodeId, numericId);
                foundBarcodes.add(device.barcodeId);
              }
            }
          }
        }
      }

      for (const barcodeId of barcodeIds) {
        if (!foundBarcodes.has(barcodeId)) {
          if (barcodeId.startsWith('EQUIP:')) {
            const parts = barcodeId.split(':');
            if (parts.length >= 2) {
              const extractedId = Number(parts[1]);
              if (!Number.isNaN(extractedId)) {
                deviceIds.push(extractedId);
                barcodeToDeviceId.set(barcodeId, extractedId);
                continue;
              }
            }
          }
          const numericBarcodeId = Number(barcodeId);
          if (!Number.isNaN(numericBarcodeId)) {
            deviceIds.push(numericBarcodeId);
            barcodeToDeviceId.set(barcodeId, numericBarcodeId);
          }
        }
      }

      if (deviceIds.length === 0) {
        setError('未找到对应的设备');
        return false;
      }

      const assignees = assignments
        .map((item) => {
          const equipmentId = barcodeToDeviceId.get(item.barcodeId);
          if (!equipmentId || Number.isNaN(item.userId)) return null;
          return {
            equipment_id: equipmentId,
            user_id: item.userId,
          };
        })
        .filter((item): item is { equipment_id: number; user_id: number } => item !== null);

      const uniqueEquipmentIds = Array.from(new Set(deviceIds));

      const unassignedEquipmentId = uniqueEquipmentIds.find(
        (equipmentId) => !assignees.some((a) => a.equipment_id === equipmentId)
      );
      if (unassignedEquipmentId) {
        setError(`存在未分配借用人的设备 (ID: ${unassignedEquipmentId})`);
        return false;
      }

      const result = await checkoutApi.checkout({
        equipment_ids: uniqueEquipmentIds,
        purpose,
        expected_return_at: expectedReturnTime,
        assignees,
      });

      if (result.success) {
        await loadAllData();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || '分配出库失败');
      return false;
    }
  }, [categories, loadAllData]);

  // 入库设备
  const checkinDevices = useCallback(async (barcodeIds: string[]): Promise<boolean> => {
    try {
      // 根据 barcodeId 找到对应的设备 ID
      const deviceIds: string[] = [];
      const foundBarcodes = new Set<string>();
      
      for (const cat of categories) {
        for (const model of cat.models) {
          for (const device of model.devices) {
            if (barcodeIds.includes(device.barcodeId)) {
              deviceIds.push(device.id);
              foundBarcodes.add(device.barcodeId);
            }
          }
        }
      }
      
      // 对于本地找不到的设备（扫码添加的临时设备），尝试从 barcodeId 解析设备 ID
      for (const barcodeId of barcodeIds) {
        if (!foundBarcodes.has(barcodeId)) {
          // 尝试解析 EQUIP:ID:HASH 格式
          if (barcodeId.startsWith('EQUIP:')) {
            const parts = barcodeId.split(':');
            if (parts.length >= 2) {
              const extractedId = parts[1];
              if (extractedId && !isNaN(Number(extractedId))) {
                deviceIds.push(extractedId);
                continue;
              }
            }
          }
          // 如果不是 EQUIP 格式，尝试直接作为数字 ID
          if (!isNaN(Number(barcodeId))) {
            deviceIds.push(barcodeId);
          }
        }
      }

      const result = await checkoutApi.checkin({
        equipment_ids: deviceIds.map(id => Number(id)),
      });

      if (result.success) {
        // 更新本地状态
        setCategories(prev =>
          prev.map(c => ({
            ...c,
            models: c.models.map(m => ({
              ...m,
              devices: m.devices.map(d => {
                if (barcodeIds.includes(d.barcodeId) && d.status === '出库') {
                  return {
                    ...d,
                    status: '在库' as const,
                    checkoutRecord: undefined,
                  };
                }
                return d;
              })
            }))
          }))
        );
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || '入库失败');
      return false;
    }
  }, [categories]);

  // 交接设备
  const transferDevices = useCallback(async (
    barcodeIds: string[],
    receiverUserId: number,
    transferReason: string,
    expectedReturnTime?: string
  ): Promise<boolean> => {
    try {
      const deviceIds: string[] = [];
      const foundBarcodes = new Set<string>();

      for (const cat of categories) {
        for (const model of cat.models) {
          for (const device of model.devices) {
            if (barcodeIds.includes(device.barcodeId)) {
              deviceIds.push(device.id);
              foundBarcodes.add(device.barcodeId);
            }
          }
        }
      }

      for (const barcodeId of barcodeIds) {
        if (!foundBarcodes.has(barcodeId)) {
          if (barcodeId.startsWith('EQUIP:')) {
            const parts = barcodeId.split(':');
            if (parts.length >= 2) {
              const extractedId = parts[1];
              if (extractedId && !isNaN(Number(extractedId))) {
                deviceIds.push(extractedId);
                continue;
              }
            }
          }
          if (!isNaN(Number(barcodeId))) {
            deviceIds.push(barcodeId);
          }
        }
      }

      if (deviceIds.length === 0) {
        setError('未找到对应的设备');
        return false;
      }

      const result = await checkoutApi.transfer({
        equipment_ids: deviceIds.map(id => Number(id)),
        receiver_user_id: receiverUserId,
        transfer_reason: transferReason,
        expected_return_at: expectedReturnTime || undefined,
      });

      if (result.success) {
        await loadAllData();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || '交接失败');
      return false;
    }
  }, [categories, loadAllData]);

  // 通过条形码查找设备
  const findDeviceByBarcode = useCallback((barcodeId: string): {
    device: Device;
    model: EquipmentModel;
    category: Category;
  } | null => {
    for (const cat of categories) {
      for (const model of cat.models) {
        const device = model.devices.find(d => d.barcodeId === barcodeId);
        if (device) {
          return { device, model, category: cat };
        }
      }
    }
    return null;
  }, [categories]);

  // 获取所有设备
  const getAllDevices = useCallback((): Array<{
    device: Device;
    model: EquipmentModel;
    category: Category;
  }> => {
    const result: Array<{
      device: Device;
      model: EquipmentModel;
      category: Category;
    }> = [];
    for (const cat of categories) {
      for (const model of cat.models) {
        for (const device of model.devices) {
          result.push({ device, model, category: cat });
        }
      }
    }
    return result;
  }, [categories]);

  // 获取统计信息
  const getStats = useCallback(() => {
    const all = getAllDevices();
    return {
      total: all.length,
      inStock: all.filter(d => d.device.status === '在库').length,
      checkedOut: all.filter(d => d.device.status === '出库').length,
      categories: categories.length,
    };
  }, [categories, getAllDevices]);

  // 重新排序分类
  const reorderCategories = useCallback(async (categoryIds: string[]): Promise<boolean> => {
    try {
      await categoryApi.reorder({ category_ids: categoryIds.map(id => Number(id)) });
      // 更新本地顺序
      setCategories(prev => {
        const ordered = categoryIds.map(id => prev.find(c => c.id === id)).filter(Boolean) as Category[];
        const remaining = prev.filter(c => !categoryIds.includes(c.id));
        return [...ordered, ...remaining];
      });
      return true;
    } catch (err: any) {
      setError(err.message || '排序失败');
      return false;
    }
  }, []);

  // 重新排序型号
  const reorderModels = useCallback(async (categoryId: string, modelIds: string[]): Promise<boolean> => {
    try {
      await modelApi.reorder({ category_id: Number(categoryId), model_ids: modelIds.map(id => Number(id)) });
      // 更新本地顺序
      setCategories(prev => prev.map(c => {
        if (c.id === categoryId) {
          const ordered = modelIds.map(id => c.models.find(m => m.id === id)).filter(Boolean) as EquipmentModel[];
          const remaining = c.models.filter(m => !modelIds.includes(m.id));
          return { ...c, models: [...ordered, ...remaining] };
        }
        return c;
      }));
      return true;
    } catch (err: any) {
      setError(err.message || '排序失败');
      return false;
    }
  }, []);

  // 重新排序设备
  const reorderDevices = useCallback(async (modelId: string, deviceIds: string[]): Promise<boolean> => {
    try {
      await equipmentApi.reorder({ model_id: Number(modelId), device_ids: deviceIds.map(id => Number(id)) });
      // 更新本地顺序
      setCategories(prev => prev.map(c => ({
        ...c,
        models: c.models.map(m => {
          if (m.id === modelId) {
            const ordered = deviceIds.map(id => m.devices.find(d => d.id === id)).filter(Boolean) as Device[];
            const remaining = m.devices.filter(d => !deviceIds.includes(d.id));
            return { ...m, devices: [...ordered, ...remaining] };
          }
          return m;
        })
      })));
      return true;
    } catch (err: any) {
      setError(err.message || '排序失败');
      return false;
    }
  }, []);

  // 检查设备编号是否已存在
  const checkBarcodeExists = useCallback((barcodeId: string): boolean => {
    for (const cat of categories) {
      for (const model of cat.models) {
        for (const device of model.devices) {
          if (device.barcodeId === barcodeId) {
            return true;
          }
        }
      }
    }
    return false;
  }, [categories]);

  // 获取已存在的设备编号列表
  const getExistingBarcodes = useCallback((): string[] => {
    const barcodes: string[] = [];
    for (const cat of categories) {
      for (const model of cat.models) {
        for (const device of model.devices) {
          barcodes.push(device.barcodeId);
        }
      }
    }
    return barcodes;
  }, [categories]);

  return {
    categories,
    isLoading,
    error,
    refresh: loadAllData,
    addCategory,
    updateCategory,
    deleteCategory,
    addModel,
    updateModel,
    deleteModel,
    addDevice,
    updateDevice,
    deleteDevice,
    checkoutDevices,
    assignCheckoutDevices,
    checkinDevices,
    transferDevices,
    findDeviceByBarcode,
    getAllDevices,
    getStats,
    reorderCategories,
    reorderModels,
    checkBarcodeExists,
    getExistingBarcodes,
  };
}

export default useDeviceStore;
