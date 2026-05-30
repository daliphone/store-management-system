import { INITIAL_ORDERS, INITIAL_TASKS } from '../mockData';

const API_URL_KEY = 'store_mgmt_api_url';
const LOCAL_ORDERS_KEY = 'store_mgmt_orders';
const LOCAL_TASKS_KEY = 'store_mgmt_tasks';
const LOCAL_CUSTOMERS_KEY = 'store_mgmt_customers';

// 預設客戶 (新增建立者 creator 欄位與最後跟進 lastFollowUp 欄位以作保護期判斷)
const DEFAULT_CUSTOMERS = [
  { id: 'cust_1', name: '林大經', phone: '0929-341-060', lineId: 'dajing929', notes: '台南六甲店熟客', creator: '1074', createdAt: '2026-05-06', lastFollowUp: '2026-05-06' },
  { id: 'cust_2', name: '陳育德', phone: '0938-677-206', lineId: 'yude938', notes: '合約續約客戶', creator: '1074', createdAt: '2026-05-10', lastFollowUp: '2026-05-10' },
  { id: 'cust_3', name: '詹政良', phone: '0915-055-209', lineId: 'zhengliang915', notes: '喜好紅米系列產品', creator: 'admin', createdAt: '2026-05-15', lastFollowUp: '2026-05-15' },
  { id: 'cust_4', name: '游小姐', phone: '0915-556-589', lineId: 'missyou', notes: '調貨機型通知', creator: 'admin', createdAt: '2026-05-17', lastFollowUp: '2026-05-17' }
];

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbyZ6ETll8qFYa987RxsERDplFov6oLfoS5dtgov-K3MkMwB4BA9qaaglWyel3bZgg95/exec';

// 取得設定的 Google Sheets API 網址
export const getApiUrl = () => {
  return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
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
  let customers = localStorage.getItem(LOCAL_CUSTOMERS_KEY);

  if (!orders) {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
    orders = JSON.stringify(INITIAL_ORDERS);
  }
  if (!tasks) {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(INITIAL_TASKS));
    tasks = JSON.stringify(INITIAL_TASKS);
  }
  if (!customers) {
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(DEFAULT_CUSTOMERS));
    customers = JSON.stringify(DEFAULT_CUSTOMERS);
  }

  return {
    orders: JSON.parse(orders),
    tasks: JSON.parse(tasks),
    customers: JSON.parse(customers)
  };
};

// 儲存資料到本地
const saveLocalData = (orders, tasks, customers = null) => {
  if (orders) localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  if (tasks) localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  if (customers) localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(customers));
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
      saveLocalData(data.orders, data.tasks, data.customers);
      return {
        orders: data.orders,
        tasks: data.tasks,
        customers: data.customers || local.customers,
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
export const addOrder = async (newOrder, calcResult = null) => {
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
        order: newOrder,
        calcResult
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
export const saveEditedOrder = async (updatedOrder, calcResult = null, operator = '') => {
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
        calcResult,
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

// 取得蝦皮雲端費率設定表
export const getECommerceRates = async () => {
  const apiUrl = getApiUrl();
  const localRates = localStorage.getItem('store_mgmt_ecommerce_rates');
  
  if (!apiUrl) {
    return localRates ? JSON.parse(localRates) : null;
  }
  
  try {
    const response = await fetch(`${apiUrl}?action=getECommerceRates`, {
      method: 'GET',
      mode: 'cors',
    });
    if (!response.ok) throw new Error('讀取費率設定失敗');
    const data = await response.json();
    if (data.status === 'success') {
      localStorage.setItem('store_mgmt_ecommerce_rates', JSON.stringify(data.rates));
      return data.rates;
    }
    return localRates ? JSON.parse(localRates) : null;
  } catch (error) {
    console.warn('讀取試算表電商費率設定失敗，使用本地快取:', error);
    return localRates ? JSON.parse(localRates) : null;
  }
};

// 同步客戶資料到 Google Sheets
export const syncCustomers = async (customers) => {
  const apiUrl = getApiUrl();
  // 先更新本地快取
  saveLocalData(null, null, customers);

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
        action: 'syncCustomers',
        customers
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || 'API 同步客戶失敗');
    }
  } catch (error) {
    console.error('Google Sheets 同步客戶失敗，已儲存在本地快取:', error);
    return { success: true, source: 'LocalStorage (API 寫入失敗)' };
  }
};

// 寫入系統操作稽核日誌 (非同步發送，不阻礙前端)
export const writeSystemLog = (operator, role, actionType, targetModule, description) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return;

  fetch(apiUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'writeLog',
      operator,
      role,
      actionType,
      targetModule,
      description
    })
  }).catch(error => {
    console.warn('系統日誌寫入雲端失敗：', error);
  });
};

// 取得分店與人員當月業績數據
export const getStorePerformance = async (storeName, sheetName, role) => {
  const apiUrl = getApiUrl();
  const localPerfKey = `store_mgmt_perf_${storeName}_${sheetName}`;
  const localData = localStorage.getItem(localPerfKey);
  
  if (!apiUrl) {
    return localData ? JSON.parse(localData) : null;
  }
  
  try {
    const response = await fetch(`${apiUrl}?action=getStorePerformance&storeName=${encodeURIComponent(storeName)}&sheetName=${encodeURIComponent(sheetName)}&role=${encodeURIComponent(role)}`, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) throw new Error('網路回應不成功');
    const data = await response.json();
    if (data.status === 'success') {
      localStorage.setItem(localPerfKey, JSON.stringify(data));
      return data;
    } else {
      // 直接回傳帶有錯誤訊息的 data，避免被 catch 吞掉而回傳 null
      return data;
    }
  } catch (error) {
    console.warn('讀取雲端業績失敗，使用本地快取:', error);
    if (localData) {
      return JSON.parse(localData);
    }
    throw error;
  }
};

// 提交每日業績登錄
export const submitDailyPerformance = async (inputData) => {
  const apiUrl = getApiUrl();
  
  // 更新本地快取
  const localPerfKey = `store_mgmt_perf_${inputData.storeName}_${inputData.sheetName}`;
  const localDataStr = localStorage.getItem(localPerfKey);
  if (localDataStr) {
    try {
      const localData = JSON.parse(localDataStr);
      const dayNum = parseInt(inputData.date.split('-')[2]);
      
      // 更新 daily 資料中的該天
      let updatedDaily = localData.daily || [];
      const existingIdx = updatedDaily.findIndex(d => d.day === dayNum);
      // 動態更新本地快取的日數據，優先使用 metrics 物件
      const newDayObj = {
        day: dayNum,
        ...(inputData.metrics || {})
      };
      
      // 向下相容舊前端直接傳入屬性的格式
      if (!inputData.metrics) {
        newDayObj.grossProfit = Number(inputData.grossProfit) || 0;
        newDayObj.insurance = Number(inputData.insurance) || 0;
        newDayObj.subscription = Number(inputData.subscription) || 0;
        newDayObj.accessories = Number(inputData.accessories) || 0;
        newDayObj.customerCount = Number(inputData.customerCount) || 0;
      }
      
      if (existingIdx !== -1) {
        updatedDaily[existingIdx] = newDayObj;
      } else {
        updatedDaily.push(newDayObj);
      }
      
      localStorage.setItem(localPerfKey, JSON.stringify({
        ...localData,
        daily: updatedDaily
      }));
    } catch (e) {
      console.warn('更新本地業績快取失敗', e);
    }
  }
  
  if (!apiUrl) {
    return { success: true, source: 'LocalStorage (離線模式)' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'submitDailyPerformance',
        input: inputData
      })
    });
    
    const data = await response.json();
    if (data.status === 'success') {
      return { success: true, source: 'Google Sheets', message: data.message };
    } else {
      throw new Error(data.message || 'API 業績登錄失敗');
    }
  } catch (error) {
    console.error('業績登錄 API 失敗：', error);
    return { success: false, message: error.message };
  }
};

// ==========================================
// 數位寵物與道具商城系統 (v2.0.0) 核心服務
// ==========================================

export const getStoreItemsConfig = () => {
  return {
    // 消耗品 - 藥水與盲盒 (12款)
    'item_potion_hp_small': { id: 'item_potion_hp_small', name: "過期促銷飲料", price: 10, type: "consumable", effect: { hp: 20 }, desc: "喝了會拉肚子，但能回復 20 HP。" },
    'item_potion_hp_medium': { id: 'item_potion_hp_medium', name: "能量維他命", price: 30, type: "consumable", effect: { hp: 50 }, desc: "門市同仁必備，快速回復 50 HP。" },
    'item_potion_hp_large': { id: 'item_potion_hp_large', name: "店長特調心靈雞湯", price: 80, type: "consumable", effect: { hp: 100 }, desc: "喝了充滿幹勁，HP 全滿！" },
    'item_cleanse': { id: 'item_cleanse', name: "奧客去去噴霧", price: 50, type: "consumable", effect: { cleanse: true }, desc: "解除任務扣血威脅，HP+50且淨化值滿。" },
    'item_xp_boost': { id: 'item_xp_boost', name: "業績加成御守", price: 100, type: "consumable", effect: { xp_boost: 1.5, duration: 3600 }, desc: "1小時內業績獲得 XP 提升 50%。" },
    'item_coin_double': { id: 'item_coin_double', name: "招財黃金貓", price: 150, type: "consumable", effect: { coin_boost: 2.0, duration: 1800 }, desc: "30分鐘內業績獲得 M幣 翻倍。" },
    'item_blind_box_normal': { id: 'item_blind_box_normal', name: "新手盲盒", price: 40, type: "consumable", effect: { random_item: "normal" }, desc: "隨機獲得一款普通裝備或藥水。" },
    'item_blind_box_rare': { id: 'item_blind_box_rare', name: "豪華旗艦盲盒", price: 120, type: "consumable", effect: { random_item: "rare" }, desc: "隨機獲得一款稀有或傳說裝備。" },
    'item_toy_ball': { id: 'item_toy_ball', name: "壓力捏捏球", price: 20, type: "consumable", effect: { clean_val: 15 }, desc: "提升寵物淨化值 15 點。" },
    'item_pet_food': { id: 'item_pet_food', name: "特盛貓罐頭", price: 25, type: "consumable", effect: { clean_val: 20 }, desc: "提升寵物淨化值 20 點。" },
    'item_evo_stone': { id: 'item_evo_stone', name: "神秘進化石", price: 200, type: "consumable", effect: { evo_time_reduce: 12 * 3600 * 1000 }, desc: "減少進化倒數 12 小時。" },
    'item_buff_scroll': { id: 'item_buff_scroll', name: "過期合約加速符", price: 60, type: "consumable", effect: { temp_all_stats: 5, duration: 7200 }, desc: "2小時內所有屬性 +5 點。" },

    // 裝備 - 穿戴加成 (12款)
    'item_equip_badge': { id: 'item_equip_badge', name: "德勤徽章", price: 150, type: "equip", stats: { STR: 5 }, desc: "力量 +5。象徵團隊榮譽。" },
    'item_equip_5g': { id: 'item_equip_5g', name: "滿格 5G 天線", price: 250, type: "equip", stats: { INT: 10 }, desc: "智力 +10。連網速度極快。" },
    'item_equip_ticket': { id: 'item_equip_ticket', name: "蘋果發表會門票", price: 400, type: "equip", stats: { PER: 15 }, desc: "感知 +15。走在科技最前端。" },
    'item_equip_mug': { id: 'item_equip_mug', name: "保溫咖啡杯", price: 100, type: "equip", stats: { CON: 5 }, desc: "體質 +5。加班必備良伴。" },
    'item_equip_uniform': { id: 'item_equip_uniform', name: "馬尼黃金戰甲", price: 500, type: "equip", stats: { CON: 20 }, desc: "體質 +20。防禦力極高。" },
    'item_equip_shoes': { id: 'item_equip_shoes', name: "門市巡邏跑鞋", price: 180, type: "equip", stats: { STR: 8 }, desc: "力量 +8。穿梭店內外無阻。" },
    'item_equip_watch': { id: 'item_equip_watch', name: "業績倒數智慧手錶", price: 300, type: "equip", stats: { PER: 12 }, desc: "感知 +12。精確掌握時間。" },
    'item_equip_mouse': { id: 'item_equip_mouse', name: "電競發光滑鼠", price: 200, type: "equip", stats: { INT: 8 }, desc: "智力 +8。點擊結帳如有神助。" },
    'item_equip_crown': { id: 'item_equip_crown', name: "百萬店長金冠", price: 1000, type: "equip", stats: { STR: 15, CON: 15, INT: 15, PER: 15 }, desc: "傳說級！所有屬性 +15 點。" },
    'item_equip_key': { id: 'item_equip_key', name: "主控台神秘金鑰", price: 800, type: "equip", stats: { INT: 25 }, desc: "智力 +25。掌握系統的核心原始碼。" },
    'item_equip_shield': { id: 'item_equip_shield', name: "奧客防護盾", price: 350, type: "equip", stats: { CON: 15 }, desc: "體質 +15。能抵擋奧客的心靈衝擊。" },
    'item_equip_glasses': { id: 'item_equip_glasses', name: "業績透視眼鏡", price: 450, type: "equip", stats: { PER: 20 }, desc: "感知 +20。一眼看出誰是潛在客戶。" }
  };
};

// 輔助函數：初始化本地模擬數位寵物資料
const initLocalPetData = (sheetName) => {
  const eggTypes = [
    { id: "egg_driver", name: "烈焰數據卵" },
    { id: "egg_guardian", name: "岩石數據卵" },
    { id: "egg_pioneer", name: "閃電數據卵" },
    { id: "egg_integrator", name: "冰霜數據卵" }
  ];
  const randomEgg = eggTypes[Math.floor(Math.random() * eggTypes.length)];
  const defaultData = {
    mCoins: 100,
    baseAttributes: { STR: 10, CON: 10, INT: 10, PER: 10 },
    attributes: { STR: 10, CON: 10, INT: 10, PER: 10 },
    pet: {
      sheetName,
      name: randomEgg.name,
      petId: randomEgg.id,
      level: 1,
      hp: 100,
      xp: 0,
      evoVal: 0,
      cleanVal: 100,
      battles: 0,
      winRatio: 0,
      status: "孵化中",
      nextEvolutionTime: Date.now() + 12 * 3600 * 1000,
      lastUpdated: Date.now()
    },
    inventory: []
  };
  localStorage.setItem(`store_mgmt_pet_${sheetName}`, JSON.stringify(defaultData));
  return defaultData;
};

// 輔助函數：取得本地模擬數位寵物資料
const getLocalPetData = (sheetName) => {
  const data = localStorage.getItem(`store_mgmt_pet_${sheetName}`);
  if (!data) return initLocalPetData(sheetName);
  try {
    return JSON.parse(data);
  } catch (e) {
    return initLocalPetData(sheetName);
  }
};

// 輔助函數：儲存本地模擬數位寵物資料
const saveLocalPetData = (sheetName, data) => {
  localStorage.setItem(`store_mgmt_pet_${sheetName}`, JSON.stringify(data));
};

// 取得寵物統計與背包 (含 LocalStorage 降級備援)
export const getPetStats = async (sheetName, storeName) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    return { ...getLocalPetData(sheetName), source: 'LocalStorage (離線模式)' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getPetStats',
        sheetName,
        storeName
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      saveLocalPetData(sheetName, data);
      return { ...data, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '讀取失敗');
    }
  } catch (error) {
    console.warn('Google Sheets 讀取寵物資料失敗，降級使用本地模擬:', error);
    return {
      ...getLocalPetData(sheetName),
      source: `LocalStorage (API 失敗: ${error.message})`
    };
  }
};

// 購買商城道具 (含 LocalStorage 降級備援)
export const buyStoreItem = async (sheetName, itemId) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    const local = getLocalPetData(sheetName);
    const config = getStoreItemsConfig();
    const item = config[itemId];
    if (!item) return { status: 'error', message: '找不到道具配置' };
    if (local.mCoins < item.price) return { status: 'error', message: 'M幣不足，無法購買' };
    
    local.mCoins -= item.price;
    const invItemIdx = local.inventory.findIndex(i => i.itemId === itemId);
    if (invItemIdx === -1) {
      local.inventory.push({ itemId, count: 1, isEquipped: false });
    } else {
      local.inventory[invItemIdx].count += 1;
    }
    saveLocalPetData(sheetName, local);
    return { ...local, status: 'success', source: 'LocalStorage' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'buyStoreItem',
        sheetName,
        itemId
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      saveLocalPetData(sheetName, data);
      return { ...data, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '購買失敗');
    }
  } catch (error) {
    console.error('購買道具 API 失敗，降級為本地處理:', error);
    return { status: 'error', message: `API 失敗: ${error.message}` };
  }
};

// 使用/穿戴道具 (含 LocalStorage 降級備援)
export const useInventoryItem = async (sheetName, itemId, isEquipAction) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    const local = getLocalPetData(sheetName);
    const config = getStoreItemsConfig();
    const item = config[itemId];
    if (!item) return { status: 'error', message: '找不到道具配置' };
    
    const invItemIdx = local.inventory.findIndex(i => i.itemId === itemId);
    if (invItemIdx === -1 || local.inventory[invItemIdx].count <= 0) {
      return { status: 'error', message: '背包內無此道具' };
    }
    
    if (item.type === 'consumable') {
      local.inventory[invItemIdx].count -= 1;
      if (item.effect.hp) {
        local.pet.hp = Math.min(100, local.pet.hp + item.effect.hp);
      }
      if (item.effect.cleanse) {
        local.pet.hp = Math.min(100, local.pet.hp + 50);
        local.pet.cleanVal = 100;
      }
      if (item.effect.clean_val) {
        local.pet.cleanVal = Math.min(100, local.pet.cleanVal + item.effect.clean_val);
      }
      if (item.effect.evo_time_reduce) {
        local.pet.nextEvolutionTime = Math.max(Date.now(), local.pet.nextEvolutionTime - item.effect.evo_time_reduce);
      }
    } else if (item.type === 'equip') {
      local.inventory[invItemIdx].isEquipped = isEquipAction;
      
      const equipBuffs = { STR: 0, CON: 0, INT: 0, PER: 0 };
      local.inventory.forEach(i => {
        if (i.isEquipped && config[i.itemId]) {
          const stats = config[i.itemId].stats;
          if (stats) {
            if (stats.STR) equipBuffs.STR += stats.STR;
            if (stats.CON) equipBuffs.CON += stats.CON;
            if (stats.INT) equipBuffs.INT += stats.INT;
            if (stats.PER) equipBuffs.PER += stats.PER;
          }
        }
      });
      local.attributes.STR = local.baseAttributes.STR + equipBuffs.STR;
      local.attributes.CON = local.baseAttributes.CON + equipBuffs.CON;
      local.attributes.INT = local.baseAttributes.INT + equipBuffs.INT;
      local.attributes.PER = local.baseAttributes.PER + equipBuffs.PER;
    }
    
    saveLocalPetData(sheetName, local);
    return { ...local, status: 'success', source: 'LocalStorage' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'useInventoryItem',
        sheetName,
        itemId,
        isEquipAction
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      saveLocalPetData(sheetName, data);
      return { ...data, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '使用失敗');
    }
  } catch (error) {
    console.error('使用道具 API 失敗，降級為本地處理:', error);
    return { status: 'error', message: `API 失敗: ${error.message}` };
  }
};

// 判定寵物進化 (含 LocalStorage 降級備援)
export const checkPetEvolution = async (sheetName) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    const local = getLocalPetData(sheetName);
    if (Date.now() < local.pet.nextEvolutionTime) {
      return { status: 'error', message: '進化能量不足' };
    }
    
    const maxVal = Math.max(local.attributes.STR, local.attributes.CON, local.attributes.INT, local.attributes.PER);
    let chosen = "Integrator";
    if (maxVal === local.attributes.STR) chosen = "Driver";
    else if (maxVal === local.attributes.CON) chosen = "Guardian";
    else if (maxVal === local.attributes.PER) chosen = "Pioneer";
    
    local.pet.level += 1;
    
    const evoTimes = [0, 3 * 3600 * 1000, 16 * 3600 * 1000, 24 * 3600 * 1000, 24 * 3600 * 1000, 24 * 3600 * 1000, 0];
    const evoTimeAdd = evoTimes[local.pet.level - 1] || 0;
    
    if (local.pet.level === 2) {
      // 根據原本蛋的 ID 給予天賦屬性加成
      if (local.pet.petId === "egg_driver") local.baseAttributes.STR += 5;
      else if (local.pet.petId === "egg_guardian") local.baseAttributes.CON += 5;
      else if (local.pet.petId === "egg_integrator") local.baseAttributes.INT += 5;
      else if (local.pet.petId === "egg_pioneer") local.baseAttributes.PER += 5;
      
      local.attributes.STR = local.baseAttributes.STR;
      local.attributes.CON = local.baseAttributes.CON;
      local.attributes.INT = local.baseAttributes.INT;
      local.attributes.PER = local.baseAttributes.PER;
      
      local.pet.petId = "baby_01";
      local.pet.name = "萌芽獸";
    } else if (local.pet.level === 3) {
      local.pet.petId = "baby_02";
      local.pet.name = "幼生獸";
    } else if (local.pet.level === 4) {
      local.pet.petId = `rookie_${chosen.toLowerCase()}`;
      local.pet.name = chosen === "Driver" ? "小鋼鐵獸" : chosen === "Guardian" ? "小石盾獸" : chosen === "Pioneer" ? "小火焰獸" : "小水靈獸";
    } else if (local.pet.level === 5) {
      local.pet.petId = `adult_${chosen.toLowerCase()}`;
      local.pet.name = chosen === "Driver" ? "鋼鐵加魯魯獸" : chosen === "Guardian" ? "黃金巨盾獸" : chosen === "Pioneer" ? "烈火獸" : "聖水天音獸";
    } else if (local.pet.level === 6) {
      local.pet.petId = `perfect_${chosen.toLowerCase()}`;
      local.pet.name = chosen === "Driver" ? "戰鬥鋼鐵加魯魯" : chosen === "Guardian" ? "要塞守護神獸" : chosen === "Pioneer" ? "超究極火神獸" : "天界大天使獸";
    } else if (local.pet.level === 7) {
      local.pet.petId = `ultimate_${chosen.toLowerCase()}`;
      local.pet.name = chosen === "Driver" ? "帝皇龍甲獸" : chosen === "Guardian" ? "奧林匹斯玄武神獸" : chosen === "Pioneer" ? "紅蓮騎士獸" : "奧米加協同神獸";
    }
    
    local.pet.nextEvolutionTime = evoTimeAdd > 0 ? (Date.now() + evoTimeAdd) : 0;
    local.pet.xp = 0;
    local.pet.evoVal = 0;
    local.pet.battles = 0;
    local.pet.winRatio = 0;
    local.pet.lastUpdated = Date.now();
    
    local.baseAttributes.STR += 5;
    local.baseAttributes.CON += 5;
    local.baseAttributes.INT += 5;
    local.baseAttributes.PER += 5;
    
    local.attributes.STR = local.baseAttributes.STR;
    local.attributes.CON = local.baseAttributes.CON;
    local.attributes.INT = local.baseAttributes.INT;
    local.attributes.PER = local.baseAttributes.PER;
    
    saveLocalPetData(sheetName, local);
    return { ...local, status: 'success', source: 'LocalStorage' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'checkPetEvolution',
        sheetName
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      saveLocalPetData(sheetName, data);
      return { ...data, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '進化判定失敗');
    }
  } catch (error) {
    console.error('寵物進化 API 失敗，降級為本地處理:', error);
    return { status: 'error', message: `API 失敗: ${error.message}` };
  }
};

// 寵物改名 (自訂暱稱，含 LocalStorage 降級備援)
export const renamePet = async (sheetName, newName) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    const local = getLocalPetData(sheetName);
    local.pet.name = newName.trim();
    saveLocalPetData(sheetName, local);
    return { ...local, status: 'success', source: 'LocalStorage' };
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'renamePet',
        sheetName,
        newName
      })
    });
    const data = await response.json();
    if (data.status === 'success') {
      saveLocalPetData(sheetName, data);
      return { ...data, source: 'Google Sheets' };
    } else {
      throw new Error(data.message || '改名失敗');
    }
  } catch (error) {
    console.warn('改名 API 失敗，降級為本地處理:', error);
    const local = getLocalPetData(sheetName);
    local.pet.name = newName.trim();
    saveLocalPetData(sheetName, local);
    return { ...local, status: 'success', source: `LocalStorage (API 失敗: ${error.message})` };
  }
};


