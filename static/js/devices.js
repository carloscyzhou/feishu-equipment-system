/**
 * 设备管理页面逻辑
 */

let categories = [];
let models = [];
let equipments = [];

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});

// 加载所有数据
async function loadAllData() {
    try {
        const [cats, mods, eqs] = await Promise.all([
            categoryAPI.getAll(),
            modelAPI.getAll(),
            equipmentAPI.getAll(),
        ]);
        categories = cats;
        models = mods;
        equipments = eqs;
        renderDeviceTree();
    } catch (error) {
        showToast('加载数据失败: ' + error.message, 'error');
    }
}

// 渲染设备树
function renderDeviceTree() {
    const container = document.getElementById('deviceTree');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>暂无分类，请点击右上角"添加分类"按钮创建</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = categories.map(cat => {
        const catModels = models.filter(m => m.category_id === cat.id);
        return `
            <div class="tree-category">
                <div class="tree-header" onclick="toggleCategory(${cat.id})">
                    <span class="toggle-icon" id="toggle-${cat.id}">▼</span>
                    <span class="category-icon">📁</span>
                    <span class="category-name">${cat.name}</span>
                    <span class="category-count">${catModels.length} 个型号</span>
                    <div class="category-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); showAddModelModal(${cat.id})" title="添加型号">
                            +
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteCategory(${cat.id})" title="删除">
                            🗑
                        </button>
                    </div>
                </div>
                <div class="tree-children" id="children-${cat.id}">
                    ${catModels.map(model => renderModel(model)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// 渲染型号
function renderModel(model) {
    const modelEquipments = equipments.filter(e => e.model_id === model.id);
    const availableCount = modelEquipments.filter(e => e.status === 0).length;
    
    return `
        <div class="tree-model">
            <div class="tree-header" onclick="toggleModel(${model.id})">
                <span class="toggle-icon" id="model-toggle-${model.id}">▼</span>
                <span class="model-icon">📦</span>
                <span class="model-name">${model.name}</span>
                <span class="model-count ${availableCount === 0 ? 'zero' : ''}">
                    ${availableCount}/${modelEquipments.length}
                </span>
                <div class="model-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); showAddEquipmentModal(${model.id})" title="添加设备">
                        +
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteModel(${model.id})" title="删除">
                        🗑
                    </button>
                </div>
            </div>
            <div class="tree-children" id="model-children-${model.id}">
                ${modelEquipments.length === 0 
                    ? '<div class="no-equipment">暂无设备，点击+添加</div>'
                    : modelEquipments.map(eq => renderEquipment(eq, model)).join('')
                }
            </div>
            ${model.description ? `<div class="model-desc">${model.description}</div>` : ''}
        </div>
    `;
}

// 渲染单个设备
function renderEquipment(eq, model) {
    const statusClass = eq.status === 0 ? 'status-available' : 'status-borrowed';
    const statusText = eq.status === 0 ? '在库' : '借出';
    
    return `
        <div class="tree-equipment">
            <span class="equipment-icon">🏷️</span>
            <span class="equipment-sn">${eq.serial_number || '无编号'}</span>
            <span class="equipment-status ${statusClass}">${statusText}</span>
            <div class="equipment-actions">
                <button class="btn-icon" onclick="showQRCode('${eq.qr_code}')" title="查看条形码">
                    📱
                </button>
                <button class="btn-icon" onclick="deleteEquipment(${eq.id})" title="删除">
                    🗑
                </button>
            </div>
        </div>
    `;
}

// 切换分类展开/收起
function toggleCategory(catId) {
    const children = document.getElementById(`children-${catId}`);
    const toggle = document.getElementById(`toggle-${catId}`);
    if (children && toggle) {
        children.classList.toggle('collapsed');
        toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
    }
}

// 切换型号展开/收起
function toggleModel(modelId) {
    const children = document.getElementById(`model-children-${modelId}`);
    const toggle = document.getElementById(`model-toggle-${modelId}`);
    if (children && toggle) {
        children.classList.toggle('collapsed');
        toggle.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
    }
}

// ============ 分类操作 ============

function showAddCategoryModal() {
    document.getElementById('categoryName').value = '';
    showModal('categoryModal');
}

async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        showToast('请输入分类名称', 'error');
        return;
    }
    
    try {
        await categoryAPI.create(name);
        showToast('分类创建成功', 'success');
        hideModal('categoryModal');
        loadAllData();
    } catch (error) {
        showToast('创建失败: ' + error.message, 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('确定要删除这个分类吗？分类下的所有型号和设备也会被删除！')) {
        return;
    }
    
    try {
        await categoryAPI.delete(id);
        showToast('分类已删除', 'success');
        loadAllData();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ============ 型号操作 ============

function showAddModelModal(categoryId) {
    document.getElementById('modelCategoryId').value = categoryId;
    document.getElementById('modelName').value = '';
    document.getElementById('modelDesc').value = '';
    showModal('modelModal');
}

async function saveModel() {
    const categoryId = document.getElementById('modelCategoryId').value;
    const name = document.getElementById('modelName').value.trim();
    const description = document.getElementById('modelDesc').value.trim();
    
    if (!name) {
        showToast('请输入型号名称', 'error');
        return;
    }
    
    try {
        await modelAPI.create(parseInt(categoryId), name, description);
        showToast('型号创建成功', 'success');
        hideModal('modelModal');
        loadAllData();
    } catch (error) {
        showToast('创建失败: ' + error.message, 'error');
    }
}

async function deleteModel(id) {
    if (!confirm('确定要删除这个型号吗？型号下的所有设备也会被删除！')) {
        return;
    }
    
    try {
        await modelAPI.delete(id);
        showToast('型号已删除', 'success');
        loadAllData();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ============ 设备操作 ============

function showAddEquipmentModal(modelId) {
    document.getElementById('equipmentModelId').value = modelId;
    document.getElementById('equipmentCount').value = 1;
    document.getElementById('serialPrefix').value = '';
    showModal('equipmentModal');
}

async function saveEquipments() {
    const modelId = document.getElementById('equipmentModelId').value;
    const count = parseInt(document.getElementById('equipmentCount').value) || 1;
    const prefix = document.getElementById('serialPrefix').value.trim();
    
    try {
        const result = await equipmentAPI.create(parseInt(modelId), count, prefix);
        showToast(`成功创建 ${result.count} 个设备`, 'success');
        hideModal('equipmentModal');
        
        // 显示条形码
        if (result.created && result.created.length > 0) {
            showQRCodes(result.created);
        }
        
        loadAllData();
    } catch (error) {
        showToast('创建失败: ' + error.message, 'error');
    }
}

async function deleteEquipment(id) {
    if (!confirm('确定要删除这个设备吗？')) {
        return;
    }
    
    try {
        await equipmentAPI.delete(id);
        showToast('设备已删除', 'success');
        loadAllData();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ============ 条形码 ============

function showQRCode(qrCode) {
    const list = document.getElementById('qrList');
    list.innerHTML = `
        <div class="qr-item">
            <div class="qr-code-large">${qrCode}</div>
            <div class="qr-text">${qrCode}</div>
        </div>
    `;
    showModal('qrModal');
}

function showQRCodes(equipments) {
    const list = document.getElementById('qrList');
    list.innerHTML = equipments.map(eq => `
        <div class="qr-item">
            <div class="qr-code">${eq.qr_code}</div>
            <div class="qr-info">
                <div>${eq.serial_number || '无编号'}</div>
                <div class="qr-code-text">${eq.qr_code}</div>
            </div>
        </div>
    `).join('');
    showModal('qrModal');
}

function printQRs() {
    window.print();
}
