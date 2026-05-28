import { INITIAL_ORDERS, INITIAL_TASKS } from '../mockData';

const API_URL_KEY = 'store_mgmt_api_url';
const LOCAL_ORDERS_KEY = 'store_mgmt_orders';
const LOCAL_TASKS_KEY = 'store_mgmt_tasks';

// 取得設定的 Google Sheets API 網址
export const getApiUrl = () => {
  return localStorage.getItem(API_URL_KEY) || '';
};

// 儲存 Google Sheets API 網址
export const saveApiUrl = (url) => {
  if (url) {
    localStorage.setItem(API_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(API_URL_KEY);
  }
};

// 載入本地快取或預設資料
const loadLocalData = () => {
  let orders = localStorage.getItem(LOCAL_ORDERS_KEY);
  let tasks = localStorage.getItem(LOCAL_TASKS_KEY);

  if (!orders) {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
    orders = JSON.stringify(INITIAL_ORDERS);
  }
  if (!tasks) {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(INITIAL_TASKS));
    tasks = JSON.stringify(INITIAL_TASKS);
  }

  return {
    orders: JSON.parse(orders),
    tasks: JSON.parse(tasks)
  };
};

// 儲存資料到本地
const saveLocalData = (orders, tasks) => {
  if (orders) localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  if (tasks) localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
};

// 載入所有資料 (自動偵測 API 或 LocalStorage)
export const loadData = async () => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();

  if (!apiUrl) {
    return { ...local, source: 'LocalStorage (未設定 API)' };
  }

  try {
    const response = await fetch(`${apiUrl}?action=readAll`, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) throw new Error('網路回應不成功');
    
    const data = await response.json();
    if (data.status === 'success') {
      // 同步更新本地快取，以便離線時使用
      saveLocalData(data.orders, data.tasks);
      return {
        orders: data.orders,
        tasks: data.tasks,
        source: 'Google Sheets'
      };
    } else {
      throw new Error(data.message || 'API 回傳錯誤');
    }
  } catch (error) {
    console.warn('Google Sheets 讀取失敗，降級使用本地快取:', error);
    return {
      ...local,
      source: `LocalStorage (API 載入失敗: ${error.message})`
    };
  }
};

// 新增訂單 (自動偵測 API 或 LocalStorage)
export const addOrder = async (newOrder) => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();
  const updatedOrders = [newOrder, ...local.orders];
  
  // 先寫入本地，確保 UI 即時反應
  saveLocalData(updatedOrders, null);

  if (!apiUrl) {
    return { success: true, source: 'LocalStorage' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain', // GAS 接收 JSON 通常用 text/plain 避免 CORS preflight 問題
      },
      body: JSON.stringify({
        action: 'addOrder',
        order: newOrder
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || 'API 新增失敗');
    }
  } catch (error) {
    console.error('Google Sheets 新增訂單失敗，已保存在本地:', error);
    return { success: true, source: 'LocalStorage (API 寫入失敗)' };
  }
};

// 更新任務狀態 (自動偵測 API 或 LocalStorage)
export const updateTaskStatus = async (taskId, completed, completedBy, photo = null, notes = '') => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();
  
  const completedAt = completed ? new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : null;
  const updatedTasks = local.tasks.map(t => {
    if (t.id === taskId) {
      return { 
        ...t, 
        completed, 
        completedBy: completed ? completedBy : null, 
        completedAt,
        photo: completed ? photo : null,
        notes: completed ? notes : null
      };
    }
    return t;
  });

  // 先寫入本地
  saveLocalData(null, updatedTasks);

  if (!apiUrl) {
    return { success: true, tasks: updatedTasks, source: 'LocalStorage' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'updateTask',
        taskId,
        completed,
        completedBy: completed ? completedBy : '',
        completedAt: completed ? completedAt : '',
        photo: completed ? (photo || '') : '',
        notes: completed ? (notes || '') : ''
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, tasks: updatedTasks, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || 'API 更新失敗');
    }
  } catch (error) {
    console.error('Google Sheets 更新任務失敗，已更新本地快取:', error);
    return { success: true, tasks: updatedTasks, source: 'LocalStorage (API 寫入失敗)' };
  }
};

// 將當前本地的所有資料「一鍵同步」寫入 Google 試算表
export const syncLocalToGoogleSheets = async () => {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error('未設定 API 網址，無法同步');

  const local = loadLocalData();

  const response = await fetch(apiUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'syncAll',
      orders: local.orders,
      tasks: local.tasks
    })
  });

  const data = await response.json();
  if (data.status === 'success') {
    return { success: true, message: '同步成功！本地資料已覆寫至試算表' };
  } else {
    throw new Error(data.message || '同步失敗');
  }
};

// 更新單個訂單狀態 (改為單筆精細更新，並記錄操作人員與變更歷史)
export const updateOrderStatus = async (orderId, newStatus, signature = null, operator = '') => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();

  const updatedOrders = local.orders.map(o => {
    if (o.id === orderId) {
      const updated = { ...o, status: newStatus };
      if (signature !== null) {
        updated.signature = signature;
      }
      return updated;
    }
    return o;
  });

  // 寫入本地快取
  saveLocalData(updatedOrders, null);

  if (!apiUrl) {
    return { success: true, orders: updatedOrders, source: 'LocalStorage' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'updateOrderStatus',
        orderId,
        newStatus,
        signature,
        operator
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, orders: updatedOrders, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || 'API 同步失敗');
    }
  } catch (error) {
    console.error('Google Sheets 同步訂單狀態失敗，已儲存在本地快取:', error);
    return { success: true, orders: updatedOrders, source: 'LocalStorage (API 寫入失敗)' };
  }
};

// 儲存編輯修改後的訂單 (改為單筆精細更新，並記錄操作人員與變更歷史)
export const saveEditedOrder = async (updatedOrder, operator = '') => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();

  const updatedOrders = local.orders.map(o => {
    if (o.id === updatedOrder.id) {
      return updatedOrder;
    }
    return o;
  });

  // 寫入本地快取
  saveLocalData(updatedOrders, null);

  if (!apiUrl) {
    return { success: true, orders: updatedOrders, source: 'LocalStorage' };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'saveEditedOrder',
        order: updatedOrder,
        operator
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, orders: updatedOrders, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || 'API 同步失敗');
    }
  } catch (error) {
    console.error('Google Sheets 同步編輯訂單失敗，已儲存在本地快取:', error);
    return { success: true, orders: updatedOrders, source: 'LocalStorage (API 寫入失敗)' };
  }
};

// 批次匯入訂單
export const addOrdersBatch = async (newOrders) => {
  const apiUrl = getApiUrl();
  const local = loadLocalData();
  const updatedOrders = [...newOrders, ...local.orders];
  
  // 先寫入本地
  saveLocalData(updatedOrders, null);

  if (!apiUrl) {
    return { success: true, source: 'LocalStorage', orders: updatedOrders };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'addOrdersBatch',
        orders: newOrders
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, source: 'Google Sheets', orders: updatedOrders };
    } else {
      throw new Error(data.message || 'API 批次新增失敗');
    }
  } catch (error) {
    console.error('Google Sheets 批次新增訂單失敗，已保存在本地:', error);
    return { success: true, source: 'LocalStorage (API 寫入失敗)', orders: updatedOrders };
  }
};

// 取得 LINE 設定
export const getLineConfig = async () => {
  const apiUrl = getApiUrl();
  const localConfig = localStorage.getItem('store_mgmt_line_config');
  const defaultVal = { accessToken: '', groupId: '', reminderTime: '09:00' };
  
  if (!apiUrl) {
    return localConfig ? JSON.parse(localConfig) : defaultVal;
  }
  
  try {
    const response = await fetch(`${apiUrl}?action=getLineConfig`, {
      method: 'GET',
      mode: 'cors',
    });
    if (!response.ok) throw new Error('讀取設定失敗');
    const data = await response.json();
    if (data.status === 'success') {
      localStorage.setItem('store_mgmt_line_config', JSON.stringify(data.config));
      return data.config;
    }
    return localConfig ? JSON.parse(localConfig) : defaultVal;
  } catch (error) {
    console.warn('讀取試算表 LINE 設定失敗，使用本地快取:', error);
    return localConfig ? JSON.parse(localConfig) : defaultVal;
  }
};

// 儲存 LINE 設定
export const saveLineConfig = async (accessToken, groupId, reminderTime) => {
  const apiUrl = getApiUrl();
  const config = { accessToken, groupId, reminderTime };
  
  // 先儲存在本地
  localStorage.setItem('store_mgmt_line_config', JSON.stringify(config));
  
  if (!apiUrl) {
    return { success: true, source: 'LocalStorage' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'saveLineConfig',
        accessToken,
        groupId,
        reminderTime
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '儲存設定失敗');
    }
  } catch (error) {
    console.error('儲存 LINE 設定失敗:', error);
    return { success: false, error: error.message };
  }
};

// 測試發送 LINE 推播
export const testLinePush = async () => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error('未設定 API 網址，無法發送測試推播！');
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'testLinePush'
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, message: '測試推播已成功發送！' };
    } else {
      throw new Error(data.message || '測試推播失敗');
    }
  } catch (error) {
    console.error('測試推播失敗:', error);
    throw error;
  }
};


