import React, { useState, useEffect } from 'react';
import { getApiUrl, saveApiUrl, syncLocalToGoogleSheets } from '../services/googleSheetsService';
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

export default function Settings({ currentUser, setCurrentUser, onClose, onRefreshData, onLogout, users, onUpdateUsers }) {
  const [apiUrl, setApiUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });
  const [isSyncing, setIsSyncing] = useState(false);

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
  }, []);

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
        {/* 角色切換 (模擬) */}
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center space-x-2 text-blue-600 font-extrabold text-sm">
            <User size={18} />
            <span>角色切換 (模擬)</span>
          </div>
          
          <div className="space-y-2">
            {users.map((user) => {
              const isSelected = currentUser.id === user.id;
              
              // 模擬顯示用分店角色文字
              let storeRoleLabel = '';
              if (user.role === 'SUPER_ADMIN') storeRoleLabel = '系統管理員 (全區)';
              else if (user.role === 'AUDITOR') storeRoleLabel = '總管理處稽核員 (全區)';
              else if (user.role === 'STORE_MANAGER') storeRoleLabel = `${user.store} - 店長`;
              else storeRoleLabel = `${user.store} - 業務`;

              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setCurrentUser(user);
                    if (onRefreshData) onRefreshData();
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.08)] ring-1 ring-blue-400'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-sm font-black text-slate-800">{user.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{storeRoleLabel}</span>
                  </div>
                  {isSelected && (
                    <div className="text-blue-500 border border-blue-500 rounded-full p-0.5 flex items-center justify-center bg-blue-50/20">
                      <Check size={12} strokeWidth={3.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                          {perm}
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

        {/* Google Sheets 連線設定 */}
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 text-green-600 font-extrabold text-sm mb-4">
            <Database size={18} />
            <span>Google 試算表資料同步</span>
          </div>

          <div className="space-y-4">
            {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR') && (
              <div className="mb-1">
                <a
                  href="https://docs.google.com/spreadsheets/d/13kUwwjkiPo-C5kBCxpV0JRLtB_dD6zgTwcDLAZAOu90/edit?gid=1293678477#gid=1293678477"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl text-xs font-extrabold active:scale-98 transition-all shadow-sm"
                >
                  <span>📑 開啟 Google 試算表稽核存檔</span>
                </a>
              </div>
            )}
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
                在您的 Google 雲端硬碟建立一個試算表，新增兩個工作表分頁並分別命名為：<span className="font-mono bg-slate-100 px-1 rounded text-red-500">Orders</span> 和 <span className="font-mono bg-slate-100 px-1 rounded text-red-500">Tasks</span>。
              </li>
              <li>
                <span className="font-extrabold text-slate-700">設定欄位標題</span> (置於第一列)：
                <div className="mt-1 bg-slate-100 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[9px] font-mono select-all">
                  <div><strong className="text-blue-600">Orders:</strong> 編號, 客戶姓名, 客戶電話, 商品與承諾內容, 類型, 分店, 提單人員, 客戶來源, 客戶標籤, 數量, 商品單價, 商品成本, 到貨狀態, 建單日期, 預計交貨日, 逾期天數, 客戶簽名, 備註</div>
                  <div><strong className="text-blue-600">Tasks:</strong> 任務編號, 時段, 櫃台, 任務內容, 分數, 是否完成, 完成時間, 完成人員</div>
                </div>
              </li>
              <li>
                <span className="font-extrabold text-slate-700">設定 Apps Script</span>：
                點選試算表選單中的 <span className="bg-slate-100 px-1 rounded font-extrabold text-slate-700">擴充功能 &gt; Apps Script</span>，將本專案根目錄下的 <span className="font-mono bg-slate-100 px-1 rounded text-blue-600">google-apps-script.js</span> 檔案內容完全複製並貼上，然後點選儲存。
              </li>
              <li>
                <span className="font-extrabold text-slate-700">部署為 Web App</span>：
                點選右上角 <span className="bg-slate-100 px-1 rounded font-extrabold text-slate-700">部署 &gt; 新增部署</span>。類型選擇「網頁應用程式」，將存取權限設為<span className="font-extrabold text-red-500">「任何人 (Anyone)」</span>，然後點擊部署並複製產生的 Web 應用程式網址。
              </li>
            </ol>
          </div>
        </div>

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
