import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import OrderList from './components/OrderList';
import OrderForm from './components/OrderForm';
import TaskList from './components/TaskList';
import Settings from './components/Settings';
import Login from './components/Login';
import CustomerList from './components/CustomerList';
import { loadData, addOrder, updateTaskStatus } from './services/googleSheetsService';
import { USERS } from './mockData';
import { Loader2, AlertCircle, Database, Check } from 'lucide-react';

const LOGGED_USER_KEY = 'store_mgmt_logged_user';
const USERS_STORAGE_KEY = 'store_mgmt_users';

// 動態同步維護每個人的「開店-儀容自檢」任務
const syncPersonalTasks = (currentTasks, currentUsers) => {
  if (!currentTasks) return [];
  let updatedTasks = [...currentTasks];
  
  // 1. 移除已不存在於使用者名單，或已被改店的個人任務
  updatedTasks = updatedTasks.filter(t => {
    if (t.text && t.text.startsWith('開店-儀容自檢 (')) {
      const nameMatch = t.text.match(/開店-儀容自檢 \((.+)\)/);
      if (nameMatch) {
        const userName = nameMatch[1];
        // 檢查該使用者是否依然存在，且在相同分店，且不是超級管理員/稽核員
        const exists = currentUsers.some(u => 
          u.name === userName && 
          u.store === t.store && 
          u.role !== 'SUPER_ADMIN' && 
          u.role !== 'AUDITOR'
        );
        return exists;
      }
    }
    return true;
  });

  // 2. 確保當前所有非管理員/非稽核員的使用者，在其分店皆有專屬儀容自檢任務
  currentUsers.forEach(u => {
    if (u.role === 'SUPER_ADMIN' || u.role === 'AUDITOR' || u.store === '全分店') return;
    
    const taskText = `開店-儀容自檢 (${u.name})`;
    const taskExists = updatedTasks.some(t => t.store === u.store && t.text === taskText);
    
    if (!taskExists) {
      updatedTasks.push({
        id: `tsk_${u.store}_personal_${Math.random().toString(36).substr(2, 9)}`,
        store: u.store,
        text: taskText,
        score: 10,
        completed: false,
        completedAt: null,
        completedBy: null,
        photo: null,
        notes: null
      });
    }
  });

  return updatedTasks;
};

export default function App() {
  // 初始化動態使用者列表 (從 localStorage 讀取或使用 mockData 的預設值，並加上權限防呆修復)
  const [users, setUsers] = useState(() => {
    const cached = localStorage.getItem(USERS_STORAGE_KEY);
    let parsedUsers = USERS;
    if (cached) {
      try {
        parsedUsers = JSON.parse(cached);
      } catch (e) {
        parsedUsers = USERS;
      }
    }
    
    // 防呆機制！確保舊有的本地快取也一定能拿到功能權限陣列
    const defaultPerms = {
      SUPER_ADMIN: ['view_all_stores', 'manage_orders', 'complete_tasks', 'cancel_tasks_directly', 'manage_accounts'],
      STORE_MANAGER: ['manage_orders', 'complete_tasks', 'cancel_tasks_directly'],
      STAFF: ['manage_orders', 'complete_tasks']
    };

    let needsUpdate = false;
    const upgradedUsers = parsedUsers.map(u => {
      if (!u.permissions) {
        needsUpdate = true;
        return {
          ...u,
          permissions: defaultPerms[u.role] || defaultPerms.STAFF
        };
      }
      return u;
    });

    if (needsUpdate || !cached) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(upgradedUsers));
    }
    return upgradedUsers;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // 客戶狀態管理
  const [customers, setCustomers] = useState(() => {
    const cached = localStorage.getItem('store_mgmt_customers');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    
    // 預設客戶
    const defaultCusts = [
      { id: 'cust_1', name: '林大經', phone: '0929-341-060', lineId: 'dajing929', notes: '台南六甲店熟客', createdAt: '2026-05-06' },
      { id: 'cust_2', name: '陳育德', phone: '0938-677-206', lineId: 'yude938', notes: '合約續約客戶', createdAt: '2026-05-10' },
      { id: 'cust_3', name: '詹政良', phone: '0915-055-209', lineId: 'zhengliang915', notes: '喜好紅米系列產品', createdAt: '2026-05-15' },
      { id: 'cust_4', name: '游小姐', phone: '0915-556-589', lineId: 'missyou', notes: '調貨機型通知', createdAt: '2026-05-17' }
    ];
    localStorage.setItem('store_mgmt_customers', JSON.stringify(defaultCusts));
    return defaultCusts;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('');
  
  // Modals 控制
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOrderOpen, setAddOrderOpen] = useState(false);

  // 偵測本地端登入快取
  useEffect(() => {
    const cachedUser = localStorage.getItem(LOGGED_USER_KEY);
    if (cachedUser) {
      try {
        const userObj = JSON.parse(cachedUser);
        // 確保該使用者存在於最新名單中，且同步更新其功能權限
        const updatedUser = users.find(u => u.id === userObj.id) || users[0];
        setCurrentUser(updatedUser);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem(LOGGED_USER_KEY);
      }
    }
    fetchData();
  }, [users]);

  // 載入資料
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await loadData();
      setOrders(data.orders);
      // 動態同步個人自檢任務
      const syncedTasks = syncPersonalTasks(data.tasks, users);
      setTasks(syncedTasks);
      setDataSource(data.source);
      
      // 若有新增或移除個人任務，悄悄同步回本地
      if (JSON.stringify(syncedTasks) !== JSON.stringify(data.tasks)) {
        localStorage.setItem('store_mgmt_tasks', JSON.stringify(syncedTasks));
      }
    } catch (error) {
      console.error('載入資料錯誤：', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 登入處理
  const handleLogin = (user) => {
    localStorage.setItem(LOGGED_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  // 登出處理
  const handleLogout = () => {
    localStorage.removeItem(LOGGED_USER_KEY);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSettingsOpen(false);
  };

  // 更新使用者名單 (由 Settings 控制)
  const handleUpdateUsers = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
    
    // 使用者名單異動時，同步重構日常任務中的個人自檢任務
    const synced = syncPersonalTasks(tasks, newUsers);
    handleUpdateTasks(synced);
  };

  // 新增訂單
  const handleSaveOrder = async (newOrder) => {
    setIsLoading(true);
    try {
      await addOrder(newOrder);
      await fetchData();
      setAddOrderOpen(false);
    } catch (error) {
      console.error('新增訂單錯誤：', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 任務勾選狀態變更 (支援照片與備註/金額)
  const handleToggleTask = async (taskId, completed, completedBy, photo = null, notes = '') => {
    try {
      const result = await updateTaskStatus(taskId, completed, completedBy, photo, notes);
      if (result.success) {
        setTasks(result.tasks);
        setDataSource(result.source);
      }
    } catch (error) {
      console.error('更新任務錯誤：', error);
      alert('更新任務狀態失敗');
    }
  };

  // 任務管理更新 (CRUD)
  const handleUpdateTasks = async (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem('store_mgmt_tasks', JSON.stringify(newTasks));
    
    // 如果有設定 API 網址，同步全量資料至 Google 試算表
    const apiUrl = localStorage.getItem('store_mgmt_api_url');
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'syncAll',
            orders: orders,
            tasks: newTasks
          })
        });
        setDataSource('Google Sheets');
      } catch (e) {
        console.warn('同步日常任務至 Google Sheets 失敗：', e);
        setDataSource('LocalStorage (同步失敗)');
      }
    }
  };

  // 客戶資料新增與刪除
  const handleAddCustomer = (newCustomer) => {
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    localStorage.setItem('store_mgmt_customers', JSON.stringify(updated));
  };

  const handleDeleteCustomer = (id) => {
    if (window.confirm('確定要刪除此客戶的資料嗎？')) {
      const updated = customers.filter(c => c.id !== id);
      setCustomers(updated);
      localStorage.setItem('store_mgmt_customers', JSON.stringify(updated));
    }
  };

  // 渲染當前頁籤元件
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
          <span className="text-xs text-gray-500 font-bold">正在與儲存庫連線中...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <Dashboard
            orders={orders}
            tasks={tasks}
            currentUser={currentUser}
            onOpenSettings={() => setSettingsOpen(true)}
            setActiveTab={setActiveTab}
            setOrderStatusFilter={setOrderStatusFilter}
            onLogout={handleLogout}
          />
        );
      case 'orders':
        return (
          <OrderList
            orders={orders}
            currentUser={currentUser}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAddOrder={() => setAddOrderOpen(true)}
            statusFilter={orderStatusFilter}
            setStatusFilter={setOrderStatusFilter}
          />
        );
      case 'tasks':
        return (
          <TaskList
            tasks={tasks}
            currentUser={currentUser}
            onToggleTask={handleToggleTask}
            onUpdateTasks={handleUpdateTasks} // 傳遞 CRUD 回呼
            onOpenSettings={() => setSettingsOpen(true)}
          />
        );
      case 'customers':
        return (
          <CustomerList
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            currentUser={currentUser}
          />
        );
      case 'query':
        return (
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center space-y-3 pb-20">
            <span className="text-5xl">🔍</span>
            <h2 className="text-base font-bold text-gray-800">多功能綜合智能查詢</h2>
            <p className="text-xs text-gray-500 max-w-xs font-semibold leading-relaxed">
              支援對所有歷史交易承諾、切結書電子簽名、經銷成本進行模糊搜尋與關聯比對。
            </p>
            <div className="relative w-full max-w-xs">
              <input
                type="text"
                disabled
                placeholder="輸入關鍵字以進行深度檢索..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs cursor-not-allowed"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // 若尚未登入，渲染登入頁面 (包含行動端容器的外層)
  if (!isLoggedIn) {
    return (
      <div className="mobile-container select-none">
        <Login users={users} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="mobile-container select-none">
      {/* 頂部儲存庫狀態提示條 */}
      <div className="bg-slate-800 text-[10px] text-slate-300 px-4 py-1.5 flex justify-between items-center font-mono z-10 shadow-sm">
        <div className="flex items-center space-x-1">
          <Database size={10} className={dataSource.includes('Google') ? 'text-green-400' : 'text-yellow-400'} />
          <span>儲存庫: {dataSource}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse-subtle"></span>
          <span>連線中</span>
        </div>
      </div>

      {/* 主要內容區域 */}
      {renderContent()}

      {/* 底部導航欄 */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 新增訂單 Modal/Page */}
      {addOrderOpen && (
        <OrderForm
          currentUser={currentUser}
          onSave={handleSaveOrder}
          onClose={() => setAddOrderOpen(false)}
        />
      )}

      {/* 設定 Modal/Page */}
      {settingsOpen && (
        <Settings
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onClose={() => setSettingsOpen(false)}
          onRefreshData={fetchData}
          onLogout={handleLogout}
          users={users}
          onUpdateUsers={handleUpdateUsers}
        />
      )}
    </div>
  );
}
