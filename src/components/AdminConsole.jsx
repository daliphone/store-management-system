import React, { useState, useEffect } from 'react';
import { getLineConfig, saveLineConfig, testLinePush } from '../services/googleSheetsService';
import ManieIcon from './ManieIcon';
import { Settings as SettingsIcon, Users, Clock, Database, Link, RefreshCw, AlertTriangle, Plus, Trash2, Edit2, Check, X, ShieldAlert, BookOpen, Layers } from 'lucide-react';

const ALL_PERMISSIONS = [
  { id: 'view_all_stores', label: '檢視所有分店資料 (view_all_stores)' },
  { id: 'manage_orders', label: '新增與編輯訂單 (manage_orders)' },
  { id: 'complete_tasks', label: '勾選完成店務任務 (complete_tasks)' },
  { id: 'cancel_tasks_directly', label: '直接取消任務免提示 (cancel_tasks_directly)' },
  { id: 'manage_accounts', label: '系統帳號與權限設定 (manage_accounts)' }
];

const PERM_LABELS = {
  view_all_stores: '檢視所有分店',
  manage_orders: '新增與編輯訂單',
  complete_tasks: '日常任務勾選',
  cancel_tasks_directly: '免確認取消任務',
  manage_accounts: '系統帳號與設定'
};

export default function AdminConsole({ 
  currentUser, 
  setCurrentUser, 
  onRefreshData, 
  users, 
  onUpdateUsers,
  stores,
  onUpdateStores
}) {
  const [activeSubSection, setActiveSubSection] = useState('accounts'); // 'accounts', 'stores', 'line', 'alerts'
  


  // LINE Bot
  const [lineConfig, setLineConfig] = useState({
    accessToken: '',
    groupId: '',
    reminderTime: '09:00'
  });
  const [lineStatus, setLineStatus] = useState({ type: '', message: '' });
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);

  // 帳號管理
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userError, setUserError] = useState('');
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'STAFF',
    store: '東門店',
    permissions: ['manage_orders', 'complete_tasks']
  });

  // 時效警示
  const [alertForm, setAlertForm] = useState({ warningDays: 2, criticalDays: 7 });
  const [alertStatus, setAlertStatus] = useState('');

  // 動態編制管理狀態
  const [newStoreInput, setNewStoreInput] = useState('');
  const [editingStoreOldName, setEditingStoreOldName] = useState(null);
  const [editingStoreNewName, setEditingStoreNewName] = useState('');

  useEffect(() => {
    
    // 載入警示天數
    const cachedAlert = localStorage.getItem('store_mgmt_alert_settings');
    if (cachedAlert) {
      try {
        setAlertForm(JSON.parse(cachedAlert));
      } catch (e) {}
    }

    // 載入 LINE Bot 設定
    const loadLineSettings = async () => {
      try {
        const config = await getLineConfig();
        setLineConfig(config);
      } catch (e) {}
    };
    loadLineSettings();
  }, []);

  // 1. 動態編制增刪改處理
  const handleAddStoreSubmit = (e) => {
    e.preventDefault();
    const cleanName = newStoreInput.trim();
    if (!cleanName) return;
    
    if (stores.includes(cleanName)) {
      alert('此分店/部門編制已存在！');
      return;
    }

    const updated = [...stores, cleanName];
    onUpdateStores(updated);
    setNewStoreInput('');
  };

  const handleStartEditStore = (storeName) => {
    setEditingStoreOldName(storeName);
    setEditingStoreNewName(storeName);
  };

  const handleSaveEditStoreSubmit = (e) => {
    e.preventDefault();
    const cleanNewName = editingStoreNewName.trim();
    if (!cleanNewName || cleanNewName === editingStoreOldName) {
      setEditingStoreOldName(null);
      return;
    }

    if (stores.includes(cleanNewName)) {
      alert('此分店/部門編制已存在！');
      return;
    }

    const updatedStores = stores.map(s => s === editingStoreOldName ? cleanNewName : s);
    onUpdateStores(updatedStores);

    // 同步更新屬於該分店的人員
    const updatedUsers = users.map(u => u.store === editingStoreOldName ? { ...u, store: cleanNewName } : u);
    onUpdateUsers(updatedUsers);

    setEditingStoreOldName(null);
  };

  const handleDeleteStoreClick = (storeName) => {
    if (storeName === '全分店') {
      alert('「全分店」為系統預設管理編制，不可刪除！');
      return;
    }
    if (window.confirm(`確定要刪除「${storeName}」編制嗎？\n⚠️ 刪除後，原屬於此單位的同仁，其編制將會被自動歸類至門市。`)) {
      const updatedStores = stores.filter(s => s !== storeName);
      onUpdateStores(updatedStores);

      // 更新受影響人員，若原為該分店則 fallback 重置回預設門市 (例如第一個分店)
      const fallbackStore = stores.find(s => s !== storeName && s !== '全分店') || '東門店';
      const updatedUsers = users.map(u => u.store === storeName ? { ...u, store: fallbackStore } : u);
      onUpdateUsers(updatedUsers);
    }
  };

  // 2. 帳號管理處理
  const handleRoleChange = (role) => {
    let defaultPerms = [];
    if (role === 'SUPER_ADMIN') {
      defaultPerms = ['view_all_stores', 'manage_orders', 'complete_tasks', 'cancel_tasks_directly', 'manage_accounts'];
    } else if (role === 'AUDITOR') {
      defaultPerms = ['view_all_stores', 'complete_tasks', 'manage_accounts'];
    } else if (role === 'STORE_MANAGER') {
      defaultPerms = ['manage_orders', 'complete_tasks', 'cancel_tasks_directly'];
    } else {
      defaultPerms = ['manage_orders', 'complete_tasks'];
    }
    
    setUserForm(prev => ({
      ...prev,
      role,
      permissions: defaultPerms,
      store: (role === 'SUPER_ADMIN' || role === 'AUDITOR') ? '全分店' : prev.store === '全分店' ? (stores[0] || '東門店') : prev.store
    }));
  };

  const handlePermissionToggle = (permId) => {
    setUserForm(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    setUserError('');

    if (!userForm.name.trim() || !userForm.username.trim()) {
      setUserError('姓名與登入帳號為必填！');
      return;
    }

    const isExist = users.some(u => u.username.toLowerCase() === userForm.username.toLowerCase().trim());
    if (isExist) {
      setUserError('此登入帳號已存在！');
      return;
    }

    const roleLabels = {
      SUPER_ADMIN: '超級管理員',
      AUDITOR: '總管理處稽核員',
      STORE_MANAGER: '分店店長',
      STAFF: '一般店員'
    };

    const newUser = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      name: userForm.name.trim(),
      username: userForm.username.trim(),
      password: userForm.password,
      role: userForm.role,
      roleLabel: roleLabels[userForm.role],
      store: (userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR') ? '全分店' : userForm.store,
      avatar: userForm.role === 'SUPER_ADMIN' ? '👨‍💼' : userForm.role === 'AUDITOR' ? '🕵️‍♂️' : userForm.role === 'STORE_MANAGER' ? '👨‍⚕️' : '👩‍💼',
      permissions: userForm.permissions
    };

    const updatedUsers = [...users, newUser];
    onUpdateUsers(updatedUsers);
    setIsAddingUser(false);
    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: stores[0] || '東門店', permissions: ['manage_orders', 'complete_tasks'] });
  };

  const handleEditUserClick = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      store: user.store,
      permissions: user.permissions || []
    });
  };

  const handleEditUserSubmit = (e) => {
    e.preventDefault();
    setUserError('');

    if (!userForm.name.trim() || !userForm.username.trim()) {
      setUserError('姓名與登入帳號為必填！');
      return;
    }

    const isExist = users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === userForm.username.toLowerCase().trim());
    if (isExist) {
      setUserError('此登入帳號已存在！');
      return;
    }

    const roleLabels = {
      SUPER_ADMIN: '超級管理員',
      AUDITOR: '總管理處稽核員',
      STORE_MANAGER: '分店店長',
      STAFF: '一般店員'
    };

    const updatedUsers = users.map(u => {
      if (u.id === editingUser.id) {
        const updated = {
          ...u,
          name: userForm.name.trim(),
          username: userForm.username.trim(),
          password: userForm.password,
          role: userForm.role,
          roleLabel: roleLabels[userForm.role],
          store: (userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR') ? '全分店' : userForm.store,
          avatar: userForm.role === 'SUPER_ADMIN' ? '👨‍💼' : userForm.role === 'AUDITOR' ? '🕵️‍♂️' : userForm.role === 'STORE_MANAGER' ? '👨‍⚕️' : '👩‍💼',
          permissions: userForm.permissions
        };
        if (currentUser.id === u.id) {
          setCurrentUser(updated);
        }
        return updated;
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setEditingUser(null);
    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: stores[0] || '東門店', permissions: ['manage_orders', 'complete_tasks'] });
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser.id) {
      alert('您無法刪除自己目前登入的帳號！');
      return;
    }
    if (window.confirm('確定要刪除此帳號嗎？刪除後該人員將無法再登入系統。')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      onUpdateUsers(updatedUsers);
      if (editingUser && editingUser.id === userId) {
        setEditingUser(null);
      }
    }
  };

  // 3. 儲存時效設定
  const handleSaveAlertSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('store_mgmt_alert_settings', JSON.stringify(alertForm));
    setAlertStatus('時效設定已成功更新！');
    setTimeout(() => {
      setAlertStatus('');
      if (onRefreshData) onRefreshData();
    }, 1800);
  };

  // 4. LINE 設定與測試
  const handleSaveLineConfigSubmit = async (e) => {
    e.preventDefault();
    setIsSavingLine(true);
    setLineStatus({ type: 'info', message: '正在儲存 LINE 設定...' });
    
    try {
      const res = await saveLineConfig(lineConfig.accessToken, lineConfig.groupId, lineConfig.reminderTime);
      if (res.success) {
        setLineStatus({ 
          type: 'success', 
          message: `儲存成功！已同步至 ${res.source === 'Google Sheets' ? 'Google 試算表' : '本地快取'}` 
        });
      } else {
        throw new Error(res.error || '儲存失敗');
      }
    } catch (err) {
      setLineStatus({ type: 'error', message: `儲存失敗: ${err.message}` });
    } finally {
      setIsSavingLine(false);
      setTimeout(() => setLineStatus({ type: '', message: '' }), 3000);
    }
  };

  const handleTestLinePushClick = async () => {
    setIsTestingLine(true);
    setLineStatus({ type: 'info', message: '正在發送測試推播...' });
    
    try {
      const res = await testLinePush();
      if (res.success) {
        setLineStatus({ type: 'success', message: '測試推播成功！請至 LINE 電商群組確認。' });
      }
    } catch (err) {
      setLineStatus({ type: 'error', message: `測試推播失敗: ${err.message}` });
    } finally {
      setIsTestingLine(false);
      setTimeout(() => setLineStatus({ type: '', message: '' }), 4000);
    }
  };



  // 判定管理帳號權限
  const canManageAccounts = currentUser.permissions && currentUser.permissions.includes('manage_accounts');

  if (!canManageAccounts) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 font-['Outfit'] pb-24">
        <ShieldAlert size={48} className="text-red-500 mb-2" />
        <h2 className="text-base font-black text-slate-800">存取被拒</h2>
        <p className="text-xs text-slate-400 font-bold mt-1 max-w-xs">您目前的帳號不具備系統管理與帳號設定之權限。</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar bg-slate-50 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部標題 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-2">
          <SettingsIcon size={20} className="text-indigo-600" />
          <h1 className="text-lg font-black text-gray-800 tracking-wide font-['Outfit']">系統管理主控台</h1>
        </div>
      </div>

      {/* 滑動式次分頁選單 */}
      <div className="bg-white border-b border-slate-100 py-2.5 px-4 flex space-x-2 overflow-x-auto no-scrollbar sticky top-[61px] z-10 shadow-xs">
        {[
          { id: 'accounts', label: '👥 帳號管理' },
          { id: 'stores', label: '🏢 編制管理' },
          { id: 'alerts', label: '⏰ 時效警示' },
          { id: 'line', label: '💬 LINE 通知' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSubSection(item.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-black shrink-0 transition-all active:scale-95 border-none ${
              activeSubSection === item.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto w-full">
        {/* ==================== 1. 帳號管理 ==================== */}
        {activeSubSection === 'accounts' && (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center text-indigo-600 font-extrabold text-sm border-b border-slate-100/50 pb-2.5">
              <div className="flex items-center space-x-2">
                <Users size={18} />
                <span>帳號管理</span>
              </div>
              {!isAddingUser && !editingUser && (
                <button
                  onClick={() => {
                    setIsAddingUser(true);
                    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: stores[0] || '東門店', permissions: ['manage_orders', 'complete_tasks'] });
                  }}
                  className="flex items-center space-x-1.5 bg-[#EFF6FF] text-[#2563EB] px-3.5 py-1.5 rounded-full text-[11px] active:scale-95 transition-all font-extrabold shadow-sm border border-blue-100"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>新增人員</span>
                </button>
              )}
            </div>

            {/* 新增或編輯帳號表單 */}
            {(isAddingUser || editingUser) && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3.5 animate-fade-in font-['Outfit']">
                <div className="font-extrabold text-xs text-slate-700 pb-1.5 border-b border-slate-200 flex justify-between items-center">
                  <span>{isAddingUser ? '新增系統使用者' : `編輯人員：${editingUser.name}`}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingUser(false);
                      setEditingUser(null);
                    }}
                    className="text-slate-400 p-0.5 border rounded-full bg-white hover:bg-slate-100 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                
                <form onSubmit={isAddingUser ? handleAddUserSubmit : handleEditUserSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">姓名 *</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="例如: 王大明"
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">登入帳號 *</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="例如: daming"
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">登入密碼 (留空代表免密碼)</label>
                    <input
                      type="text"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="設定登入密碼"
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">角色樣板</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="block w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-black text-slate-800 cursor-pointer"
                      >
                        <option value="STAFF">一般店員 (預設)</option>
                        <option value="STORE_MANAGER">分店店長 (預設)</option>
                        <option value="SUPER_ADMIN">超級管理員 (預設)</option>
                        <option value="AUDITOR">總管理處稽核員 (預設)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">所屬編制</label>
                      <select
                        value={userForm.store}
                        onChange={(e) => setUserForm({ ...userForm, store: e.target.value })}
                        disabled={userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR'}
                        className="block w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-black text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                      >
                        {(userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR') ? (
                          <option value="全分店">全分店</option>
                        ) : (
                          stores.map(s => <option key={s} value={s}>{s}</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 權限設定 */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">功能權限設定：</label>
                    <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 max-h-40 overflow-y-auto no-scrollbar">
                      {ALL_PERMISSIONS.map(perm => {
                        const isChecked = userForm.permissions.includes(perm.id);
                        return (
                          <button
                            type="button"
                            key={perm.id}
                            onClick={() => handlePermissionToggle(perm.id)}
                            className="w-full flex items-center space-x-2.5 text-left text-xs font-bold py-1.5 px-1 hover:bg-slate-100/55 rounded-lg transition-all border-none"
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                              isChecked 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white border-slate-300 text-transparent'
                            }`}>
                              <Check size={11} strokeWidth={3.5} />
                            </div>
                            <span className={isChecked ? 'text-indigo-900 font-extrabold' : 'text-slate-500'}>
                              {perm.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {userError && (
                    <div className="text-[10px] text-red-500 font-bold">{userError}</div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold py-2.5 rounded-xl text-xs active:scale-95 transition-all shadow-md border-none"
                    >
                      儲存變更
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUser(false);
                        setEditingUser(null);
                        setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: stores[0] || '東門店', permissions: ['manage_orders', 'complete_tasks'] });
                      }}
                      className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-extrabold py-2.5 rounded-xl text-xs active:scale-95 transition-all border-none"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 帳號清單 */}
            {!isAddingUser && !editingUser && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
                {users.map(u => (
                  <div key={u.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-2 relative shadow-sm hover:border-slate-200 transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-sm font-black text-slate-800">{u.name}</span>
                        <span className="text-[10px] font-black text-slate-400 font-mono">{u.role}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleEditUserClick(u)}
                          className="p-1 text-slate-400 hover:text-blue-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 font-bold">
                      所屬單位：{u.store === '全分店' ? '全區 / 全分店' : u.store}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(u.permissions || []).map(perm => (
                        <span key={perm} className="text-[9px] font-black bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded shadow-sm border border-blue-50">
                          {PERM_LABELS[perm] || perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 2. 編制管理 (新功能) ==================== */}
        {activeSubSection === 'stores' && (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center space-x-2 text-indigo-600 font-extrabold text-sm border-b border-slate-100/50 pb-2.5">
              <Layers size={18} />
              <span>人員所屬編制設定 (部門/分店)</span>
            </div>

            {/* 新增編制表單 */}
            <form onSubmit={handleAddStoreSubmit} className="flex space-x-2">
              <input
                type="text"
                placeholder="輸入新門市或部門名稱 (例如: 六甲店)"
                value={newStoreInput}
                onChange={(e) => setNewStoreInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 font-sans"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center space-x-1 border-none shadow-md shadow-indigo-100"
              >
                <Plus size={14} />
                <span>新增</span>
              </button>
            </form>

            {/* 編制清單列表 */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar pr-1 pt-1">
              {stores.map(storeName => (
                <div key={storeName} className="bg-slate-50/50 px-4 py-3.5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs">
                  {editingStoreOldName === storeName ? (
                    <form onSubmit={handleSaveEditStoreSubmit} className="flex-1 flex space-x-2">
                      <input
                        type="text"
                        value={editingStoreNewName}
                        onChange={(e) => setEditingStoreNewName(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-bold font-sans"
                        autoFocus
                      />
                      <button type="submit" className="p-1.5 text-green-600 bg-white border border-green-200 rounded-lg active:scale-90 shadow-xs"><Check size={13} /></button>
                      <button type="button" onClick={() => setEditingStoreOldName(null)} className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-lg active:scale-90 shadow-xs"><X size={13} /></button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        <span className="text-xs font-black text-slate-700">{storeName}</span>
                        {storeName === '電商部' && (
                          <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded font-bold scale-90">電商專屬</span>
                        )}
                        {storeName === '全分店' && (
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded font-bold scale-90">系統保留</span>
                        )}
                      </div>
                      
                      {storeName !== '全分店' && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStartEditStore(storeName)}
                            className="p-1.5 text-slate-400 hover:text-blue-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                            title="修改名稱"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteStoreClick(storeName)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                            title="刪除編制"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== 3. 時效警示 ==================== */}
        {activeSubSection === 'alerts' && (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center space-x-2 text-amber-600 font-extrabold text-sm border-b border-slate-100/50 pb-2.5">
              <Clock size={18} />
              <span>時效規則設定</span>
            </div>

            <form onSubmit={handleSaveAlertSettings} className="space-y-4">
              <div className="space-y-4">
                {/* 黃燈設定 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 font-black block">
                    黃色警示天數 (即將到期)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={alertForm.warningDays}
                      onChange={(e) => setAlertForm({ ...alertForm, warningDays: parseInt(e.target.value) || 0 })}
                      className="block w-20 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                      required
                    />
                    <span className="text-xs text-slate-500 font-bold">天以內</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block leading-normal">
                    訂單剩餘交期小於或等於此值時，系統狀態標籤將顯示為黃色。
                  </span>
                </div>

                {/* 紅燈設定 */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 font-black block">
                    紅色警示天數 (嚴重逾期)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={alertForm.criticalDays}
                      onChange={(e) => setAlertForm({ ...alertForm, criticalDays: parseInt(e.target.value) || 1 })}
                      className="block w-20 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-slate-50/50"
                      required
                    />
                    <span className="text-xs text-slate-500 font-bold">天以上</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block leading-normal">
                    訂單逾期（交單延誤）超過或等於此天數時，首頁與清單將會顯示高危紅色閃爍警示。
                  </span>
                </div>
              </div>

              {alertStatus && (
                <div className="p-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100">
                  {alertStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-95 border-none"
              >
                儲存時效設定
              </button>
            </form>
          </div>
        )}

        {/* ==================== 4. 數據同步 ==================== */}


        {/* ==================== 5. LINE 通知 ==================== */}
        {activeSubSection === 'line' && (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4 animate-fade-in">
            <div className="flex items-center space-x-2 text-blue-600 font-extrabold text-sm border-b border-slate-100/50 pb-2.5">
              <svg className="w-5 h-5 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.9 10.4c0-4.6-4.5-8.4-10-8.4S1.9 5.8 1.9 10.4c0 4.1 3.5 7.6 8.3 8.3.3.1.8.2 1 .5l.1.8c.1.5-.1 1.2-.2 1.8 0 0-.2 1.3 1 1 1-.3 4.2-2.7 5.7-4.7 2.6-2.2 4.1-4.8 4.1-7.7z"/>
              </svg>
              <span>LINE 電商群推播設定</span>
            </div>

            <form onSubmit={handleSaveLineConfigSubmit} className="space-y-4">
              <div className="space-y-3.5 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">LINE 官方帳號 Access Token (通道存取權杖)</label>
                  <input
                    type="text"
                    value={lineConfig.accessToken}
                    onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                    placeholder="請輸入 LINE Channel Access Token"
                    className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">電商 LINE 群組 ID (Group ID)</label>
                  <input
                    type="text"
                    value={lineConfig.groupId}
                    onChange={(e) => setLineConfig({ ...lineConfig, groupId: e.target.value })}
                    placeholder="請輸入群組 ID (例如: Ca4b5...)"
                    className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[9px] text-slate-450 font-semibold block leading-tight pt-1">
                    註：通常是以小寫 c 或 g 開頭的 33 碼字串。群組可藉由 Bot 的 Webhook 記錄中取得。
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">每日推播提醒時間</label>
                  <input
                    type="time"
                    value={lineConfig.reminderTime}
                    onChange={(e) => setLineConfig({ ...lineConfig, reminderTime: e.target.value })}
                    className="block w-32 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[9px] text-slate-450 font-semibold block leading-tight pt-1">
                    系統將於每日設定的時間向 LINE 群發送任務與調貨承諾提醒。
                  </span>
                </div>
              </div>

              {lineStatus.message && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 ${
                  lineStatus.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : lineStatus.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {lineStatus.type === 'error' ? (
                    <AlertTriangle size={15} className="shrink-0" />
                  ) : (
                    <RefreshCw size={15} className={`shrink-0 ${isSavingLine || isTestingLine ? 'animate-spin' : ''}`} />
                  )}
                  <span className="font-extrabold">{lineStatus.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSavingLine}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:bg-gray-150 disabled:text-gray-400 border-none"
                >
                  {isSavingLine ? '儲存中...' : '儲存 LINE 設定'}
                </button>
                <button
                  type="button"
                  onClick={handleTestLinePushClick}
                  disabled={isTestingLine || !apiUrl || !lineConfig.accessToken || !lineConfig.groupId}
                  className={`w-full font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 border-none ${
                    isTestingLine || !apiUrl || !lineConfig.accessToken || !lineConfig.groupId
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                  }`}
                >
                  <RefreshCw size={13} className={isTestingLine ? 'animate-spin' : ''} />
                  <span>測試發送推播</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
