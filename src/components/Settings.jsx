import React, { useState, useEffect } from 'react';
import { getApiUrl, saveApiUrl, syncLocalToGoogleSheets, getLineConfig, saveLineConfig, testLinePush } from '../services/googleSheetsService';
import ManieIcon from './ManieIcon';
import { STORES } from '../mockData';
import { Settings as SettingsIcon, X, User, Users, Clock, Database, Link, RefreshCw, AlertTriangle, Plus, Trash2, Edit2, Key, Check } from 'lucide-react';

// 系統功能權限定義
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

export default function Settings({ currentUser, setCurrentUser, onClose, onRefreshData, onLogout, users, onUpdateUsers }) {
  const [apiUrl, setApiUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  // LINE Bot 設定狀態
  const [lineConfig, setLineConfig] = useState({
    accessToken: '',
    groupId: '',
    reminderTime: '09:00'
  });
  const [lineStatus, setLineStatus] = useState({ type: '', message: '' });
  const [isSavingLine, setIsSavingLine] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);

  // 帳號管理狀態
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

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  // 時效警示提示設定狀態
  const [alertForm, setAlertForm] = useState({ warningDays: 2, criticalDays: 7 });
  const [alertStatus, setAlertStatus] = useState('');

  useEffect(() => {
    setApiUrl(getApiUrl());
    
    // 載入時效警示設定
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
      } catch (e) {
        console.error('載入 LINE 設定失敗:', e);
      }
    };
    loadLineSettings();
  }, []);

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

  const handleSaveApi = () => {
    saveApiUrl(apiUrl);
    setSyncStatus({
      type: 'success',
      message: apiUrl ? 'API 網址儲存成功！將開始與 Google 試算表連動。' : 'API 網址已清除，系統將降級使用本地儲存。'
    });
    setTimeout(() => {
      setSyncStatus({ type: '', message: '' });
      if (onRefreshData) onRefreshData();
    }, 2000);
  };

  const handleSyncData = async () => {
    if (!apiUrl) {
      setSyncStatus({ type: 'error', message: '請先填寫 API 網址再進行同步！' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: '正在同步資料至 Google 試算表...' });
    
    try {
      await syncLocalToGoogleSheets();
      setSyncStatus({ type: 'success', message: '一鍵同步成功！本地訂單與任務資料已完全寫入您的 Google 試算表。' });
      if (onRefreshData) onRefreshData();
    } catch (error) {
      setSyncStatus({ type: 'error', message: `同步失敗: ${error.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // 儲存時效設定
  const handleSaveAlertSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('store_mgmt_alert_settings', JSON.stringify(alertForm));
    setAlertStatus('時效設定已更新！');
    setTimeout(() => {
      setAlertStatus('');
      if (onRefreshData) onRefreshData();
    }, 1800);
  };

  // 當選擇角色變更時，自動配置預設的功能權限
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
      store: (role === 'SUPER_ADMIN' || role === 'AUDITOR') ? '全分店' : prev.store === '全分店' ? '東門店' : prev.store
    }));
  };

  // 處理權限配置勾選
  const handlePermissionToggle = (permId) => {
    setUserForm(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  // 1. 新增帳號
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    setUserError('');

    if (!userForm.name.trim() || !userForm.username.trim()) {
      setUserError('姓名與登入帳號為必填！');
      return;
    }

    // 檢查帳號是否重複
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
    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '東門店', permissions: ['manage_orders', 'complete_tasks'] });
  };

  // 2. 編輯帳號
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
    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '東門店', permissions: ['manage_orders', 'complete_tasks'] });
  };

  // 3. 刪除帳號
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

  // 4. 修改密碼
  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setPasswordStatus({ type: '', message: '' });

    if (currentUser.password && passwordForm.currentPassword !== currentUser.password) {
      setPasswordStatus({ type: 'error', message: '目前密碼輸入錯誤！' });
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordStatus({ type: 'error', message: '新密碼不可為空！' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: '兩次輸入的新密碼不一致！' });
      return;
    }

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        const updated = { ...u, password: passwordForm.newPassword };
        setCurrentUser(updated);
        return updated;
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setPasswordStatus({ type: 'success', message: '密碼變更成功！' });
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    
    setTimeout(() => {
      setPasswordStatus({ type: '', message: '' });
    }, 2500);
  };

  // 判斷是否具備管理帳號權限
  const canManageAccounts = currentUser.permissions && currentUser.permissions.includes('manage_accounts');

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar pb-16 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部標題與關閉按鈕 (100% 還原設計圖) */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-2">
          <SettingsIcon size={20} className="text-blue-500" />
          <h2 className="text-base font-black text-slate-800 tracking-wide font-['Outfit']">系統設定</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-150 rounded-full transition-colors active:scale-90 border bg-white shadow-sm">
          <X size={18} className="text-slate-500" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 帳號管理 */}
        {canManageAccounts ? (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center text-indigo-600 font-extrabold text-sm">
              <div className="flex items-center space-x-2">
                <Users size={18} />
                <span>帳號管理</span>
              </div>
              {!isAddingUser && !editingUser && (
                <button
                  onClick={() => {
                    setIsAddingUser(true);
                    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '東門店', permissions: ['manage_orders', 'complete_tasks'] });
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
                <div className="font-extrabold text-xs text-slate-700 pb-1 border-b border-slate-200 flex justify-between items-center">
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
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="block w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">角色樣板</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="block w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-black text-slate-800"
                      >
                        <option value="STAFF">一般店員 (預設)</option>
                        <option value="STORE_MANAGER">分店店長 (預設)</option>
                        <option value="SUPER_ADMIN">超級管理員 (預設)</option>
                        <option value="AUDITOR">總管理處稽核員 (預設)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">所屬分店</label>
                      <select
                        value={userForm.store}
                        onChange={(e) => setUserForm({ ...userForm, store: e.target.value })}
                        disabled={userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR'}
                        className="block w-full px-2 py-2 border border-slate-200 rounded-xl text-xs bg-white font-black text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {(userForm.role === 'SUPER_ADMIN' || userForm.role === 'AUDITOR') ? (
                          <option value="全分店">全分店</option>
                        ) : (
                          STORES.map(s => <option key={s} value={s}>{s}</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 功能權限勾選設定 */}
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
                            className="w-full flex items-center space-x-2.5 text-left text-xs font-bold py-1.5 px-1 hover:bg-slate-100/55 rounded-lg transition-all"
                          >
                            {/* 自定義 Checkbox 視覺元件，確保 100% 正確且精美地顯示打勾 */}
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
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold py-2.5 rounded-xl text-xs active:scale-95 transition-all shadow-md"
                    >
                      儲存變更
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUser(false);
                        setEditingUser(null);
                        setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '東門店', permissions: ['manage_orders', 'complete_tasks'] });
                      }}
                      className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-extrabold py-2.5 rounded-xl text-xs active:scale-95 transition-all"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 使用者管理清單 (對齊設計圖的卡片化排版與標籤雲) */}
            {!isAddingUser && !editingUser && (
              <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                {users.map(u => (
                  <div key={u.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col space-y-2 relative shadow-sm hover:border-slate-200 transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-sm font-black text-slate-800">{u.name}</span>
                        <span className="text-[10px] font-black text-slate-400 font-mono">{u.role}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1.5 action-btn">
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
                      {u.store === '全分店' ? '全區' : u.store}
                    </div>

                    {/* 權限標籤雲 */}
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
        ) : (
          // 一般人員僅可修改密碼
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 text-indigo-600 font-extrabold text-sm mb-4">
              <Key size={18} />
              <span>修改個人登入密碼</span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              {currentUser.password && (
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">目前密碼 *</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">新設定密碼 *</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="請設定新密碼"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">確認新密碼 *</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="請再次輸入新密碼"
                  required
                />
              </div>

              {passwordStatus.message && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${
                  passwordStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {passwordStatus.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                儲存新密碼
              </button>
            </form>
          </div>
        )}

        {/* 時效警示規則設定 (管理員限定，100% 還原設計圖排版) */}
        {canManageAccounts && (
          <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center space-x-2 text-amber-600 font-extrabold text-sm mb-1">
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
                      className="block w-20 px-3 py-2 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      required
                    />
                    <span className="text-xs text-slate-500 font-bold">天以內</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    訂單剩餘天數小於此值時顯示黃燈。
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
                      className="block w-20 px-3 py-2 border border-slate-200 rounded-xl text-xs font-black text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                      required
                    />
                    <span className="text-xs text-slate-500 font-bold">天以上</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    訂單逾期超過此值時顯示紅色閃爍警示。
                  </span>
                </div>
              </div>

              {alertStatus && (
                <div className="p-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold">
                  {alertStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                儲存時效設定
              </button>
            </form>
          </div>
        )}

        {/* Google Sheets 連線設定與部署教學 (加入權限控管，僅限 SUPER_ADMIN 或 AUDITOR 顯示) */}
        {currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR') && (
          <>
            {/* LINE 官方帳號推播設定 */}
            <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4 mb-4">
              <div className="flex items-center space-x-2 text-blue-600 font-extrabold text-sm mb-1">
                <svg className="w-5 h-5 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.9 10.4c0-4.6-4.5-8.4-10-8.4S1.9 5.8 1.9 10.4c0 4.1 3.5 7.6 8.3 8.3.3.1.8.2 1 .5l.1.8c.1.5-.1 1.2-.2 1.8 0 0-.2 1.3 1 1 1-.3 4.2-2.7 5.7-4.7 2.6-2.2 4.1-4.8 4.1-7.7z"/>
                </svg>
                <span>LINE 電商群推播設定</span>
              </div>

              <form onSubmit={handleSaveLineConfigSubmit} className="space-y-4">
                <div className="space-y-3.5 text-xs font-bold text-slate-700">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">LINE 官方帳號 Access Token (通道存取權杖)</label>
                    <input
                      type="text"
                      value={lineConfig.accessToken}
                      onChange={(e) => setLineConfig({ ...lineConfig, accessToken: e.target.value })}
                      placeholder="請輸入 LINE Channel Access Token"
                      className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">電商 LINE 群組 ID (Group ID)</label>
                    <input
                      type="text"
                      value={lineConfig.groupId}
                      onChange={(e) => setLineConfig({ ...lineConfig, groupId: e.target.value })}
                      placeholder="請輸入群組 ID (例如: Ca4b5...)"
                      className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[9px] text-slate-450 font-semibold block leading-tight">
                      註：群組 ID 通常是以小寫 c 或 g 開頭的 33 碼字串。您可以將 Bot 加入群組後，在群組發送訊息並藉由 Webhook 日誌或測試工具取得。
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">每日推播提醒時間</label>
                    <input
                      type="time"
                      value={lineConfig.reminderTime}
                      onChange={(e) => setLineConfig({ ...lineConfig, reminderTime: e.target.value })}
                      className="block w-32 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <span className="text-[9px] text-slate-450 font-semibold block leading-tight">
                      設定每日系統自動向 LINE 群組發送電商調貨與待辦任務進度的時間。
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
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:bg-gray-150 disabled:text-gray-400"
                  >
                    {isSavingLine ? '儲存中...' : '儲存 LINE 設定'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestLinePushClick}
                    disabled={isTestingLine || !apiUrl || !lineConfig.accessToken || !lineConfig.groupId}
                    className={`w-full font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 ${
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

            {/* Google Sheets 連線設定 */}
            <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center space-x-2 text-green-600 font-extrabold text-sm mb-4">
                <Database size={18} />
                <span>Google 試算表資料同步</span>
              </div>

              <div className="space-y-4">
                <div className="mb-1">
                  <a
                    href="https://docs.google.com/spreadsheets/d/186q0vSOMCtPtNSK16LiVl0OlevmOkdAmGEC4YRz4jNs/edit?gid=1709500613#gid=1709500613"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl text-xs font-extrabold active:scale-98 transition-all shadow-sm"
                  >
                    <span>📑 開啟 Google 試算表稽核存檔</span>
                  </a>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1.5">
                    Google Apps Script Web App URL：
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="block w-full pl-9 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs text-slate-700 bg-slate-50/50 font-mono"
                    />
                  </div>
                </div>

                {syncStatus.message && (
                  <div className={`p-3.5 rounded-xl text-xs flex items-start space-x-2 ${
                    syncStatus.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : syncStatus.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {syncStatus.type === 'error' ? (
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <RefreshCw size={16} className={`mt-0.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                    )}
                    <span>{syncStatus.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSaveApi}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-colors shadow-md active:scale-95"
                  >
                    儲存 API 設定
                  </button>
                  <button
                    onClick={handleSyncData}
                    disabled={isSyncing || !apiUrl}
                    className={`w-full font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 ${
                      isSyncing || !apiUrl
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                        : 'bg-green-500 hover:bg-green-600 text-white active:scale-95'
                    }`}
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span>一鍵同步至 Google</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 部署教學說明 */}
            <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 text-yellow-600 font-extrabold text-sm mb-3">
                <User size={18} />
                <span>Google Sheets 部署指引</span>
              </div>
              
              <div className="text-[11px] text-slate-500 space-y-3.5 leading-relaxed font-semibold">
                <p>本系統的 Google 試算表同步透過 Google Apps Script (GAS) 實現，請依循以下步驟進行設定：</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    <span className="font-extrabold text-slate-700">建立試算表</span>：
                    在您的 Google 雲端硬碟建立一個試算表，新增三個工作表分頁並分別命名為：
                    <span className="font-mono bg-slate-100 px-1 rounded text-red-500">Orders</span>、
                    <span className="font-mono bg-slate-100 px-1 rounded text-red-500">Tasks</span> 和 
                    <span className="font-mono bg-slate-100 px-1 rounded text-red-500">OrderStatus</span>。
                  </li>
                  <li>
                    <span className="font-extrabold text-slate-700">設定欄位標題</span> (置於第一列)：
                    <div className="mt-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-[9px] font-mono select-all">
                      <div><strong className="text-blue-600">Orders:</strong> 編號, 客戶姓名, 客戶電話, 商品與承諾內容, 類型, 分店, 提單人員, 客戶來源, 客戶標籤, 數量, 商品單價, 商品成本, 到貨狀態, 建單日期, 預計交貨日, 逾期天數, 客戶簽名, 備註</div>
                      <div><strong className="text-blue-600">Tasks:</strong> 任務編號, 分店, 任務內容, 分數, 是否完成, 完成時間, 完成人員, 現場照片, 備註</div>
                      <div><strong className="text-blue-600">OrderStatus:</strong> 紀錄編號, 變更時間, 訂單編號, 客戶姓名, 客戶電話, 商品名稱, 異動前狀態, 異動後狀態, 經辦同仁, 所屬分店, 備註</div>
                    </div>
                  </li>
                  <li>
                    <span className="font-extrabold text-slate-700">設定 Apps Script</span>：
                    點選試算表選單中的 <span className="bg-slate-100 px-1 rounded font-extrabold text-slate-700">擴充功能 &gt; Apps Script</span>，將本專案的 <span className="font-mono bg-slate-100 px-1 rounded text-blue-600">google-apps-script.js</span> 檔案內容完全複製並貼上，然後點選儲存。
                  </li>
                  <li>
                    <span className="font-extrabold text-slate-700">部署為 Web App</span>：
                    點選右上角 <span className="bg-slate-100 px-1 rounded font-extrabold text-slate-700">部署 &gt; 新增部署</span>。類型選擇「網頁應用程式」，將存取權限設為<span className="font-extrabold text-red-500">「任何人 (Anyone)」</span>，然後點擊部署並複製產生的 Web 應用程式網址。
                  </li>
                </ol>
              </div>
            </div>
          </>
        )}

        {/* 登出當前帳號 */}
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-red-150 bg-red-50/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors shadow-md active:scale-95 text-center"
          >
            登出當前帳號
          </button>
        </div>
      </div>
    </div>
  );
}
