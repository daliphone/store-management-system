import React, { useState, useEffect } from 'react';
import { getApiUrl, saveApiUrl, syncLocalToGoogleSheets } from '../services/googleSheetsService';
import ManieIcon from './ManieIcon';
import { STORES } from '../mockData';
import { ArrowLeft, User, Shield, Link, Database, RefreshCw, Check, AlertTriangle, Users, Plus, Trash2, Edit2, Key, Clock } from 'lucide-react';

// 系統功能權限定義
const ALL_PERMISSIONS = [
  { id: 'view_all_stores', label: '檢視所有分店資料' },
  { id: 'manage_orders', label: '新增與編輯訂單' },
  { id: 'complete_tasks', label: '勾選完成店務任務' },
  { id: 'cancel_tasks_directly', label: '直接取消任務免提示' },
  { id: 'manage_accounts', label: '系統帳號與權限設定' }
];

export default function Settings({ currentUser, setCurrentUser, onClose, onRefreshData, onLogout, users, onUpdateUsers }) {
  const [apiUrl, setApiUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  // 帳號管理與密碼修改狀態
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
    } else if (role === 'STORE_MANAGER') {
      defaultPerms = ['manage_orders', 'complete_tasks', 'cancel_tasks_directly'];
    } else {
      defaultPerms = ['manage_orders', 'complete_tasks'];
    }
    
    setUserForm(prev => ({
      ...prev,
      role,
      permissions: defaultPerms,
      store: role === 'SUPER_ADMIN' ? '全分店' : prev.store === '全分店' ? '東門店' : prev.store
    }));
  };

  // 處理權限勾選/取消勾選
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
      store: userForm.role === 'SUPER_ADMIN' ? '全分店' : userForm.store,
      avatar: userForm.role === 'SUPER_ADMIN' ? '👨‍💼' : userForm.role === 'STORE_MANAGER' ? '👨‍⚕️' : '👩‍💼',
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
          store: userForm.role === 'SUPER_ADMIN' ? '全分店' : userForm.store,
          avatar: userForm.role === 'SUPER_ADMIN' ? '👨‍💼' : userForm.role === 'STORE_MANAGER' ? '👨‍⚕️' : '👩‍💼',
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
    <div className="absolute inset-0 bg-gray-50 flex flex-col z-50 overflow-y-auto no-scrollbar pb-10">
      {/* 頂部導航 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm z-10">
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div className="flex items-center space-x-2">
          <ManieIcon pose="thinking" className="w-8 h-8" />
          <h2 className="text-base font-bold text-gray-800">設定與系統管理</h2>
        </div>
        <div className="w-8"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* 使用者模擬切換 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-blue-600 font-bold mb-4">
            <User size={20} />
            <span>模擬角色快速切換 (測試用)</span>
          </div>
          
          <div className="space-y-3">
            <label className="text-xs text-gray-500 font-semibold block">點擊帳號立即切換身份：</label>
            <div className="grid grid-cols-1 gap-2">
              {users.map((user) => {
                const isSelected = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      if (onRefreshData) onRefreshData();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-400'
                        : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{user.avatar}</span>
                      <div>
                        <div className="font-bold text-gray-800 text-xs">{user.name} ({user.username})</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{user.store} · {user.roleLabel}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="bg-blue-500 text-white p-1 rounded-full">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 帳號與功能權限管理 */}
        {canManageAccounts ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center text-indigo-600 font-bold">
              <div className="flex items-center space-x-2">
                <Users size={20} />
                <span>帳號與功能權限設定</span>
              </div>
              {!isAddingUser && !editingUser && (
                <button
                  onClick={() => {
                    setIsAddingUser(true);
                    setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '台南六甲', permissions: ['manage_orders', 'complete_tasks'] });
                  }}
                  className="flex items-center space-x-1 bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs active:scale-95 transition-all font-semibold mr-1"
                >
                  <Plus size={14} />
                  <span>新增人員</span>
                </button>
              )}
            </div>

            {/* 新增或編輯帳號表單 */}
            {(isAddingUser || editingUser) && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-3.5 animate-fade-in">
                <div className="font-bold text-xs text-gray-700 pb-1 border-b">
                  {isAddingUser ? '新增系統使用者' : `編輯人員：${editingUser.name}`}
                </div>
                
                <form onSubmit={isAddingUser ? handleAddUserSubmit : handleEditUserSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">姓名 *</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="例如: 王小明"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">登入帳號 *</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      placeholder="例如: xiaoming"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">登入密碼 (留空代表免密碼)</label>
                    <input
                      type="text"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="設定登入密碼"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">預設角色樣板</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="block w-full px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white font-bold"
                      >
                        <option value="STAFF">一般店員 (預設)</option>
                        <option value="STORE_MANAGER">分店店長 (預設)</option>
                        <option value="SUPER_ADMIN">超級管理員 (預設)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">所屬分店</label>
                      <select
                        value={userForm.store}
                        onChange={(e) => setUserForm({ ...userForm, store: e.target.value })}
                        disabled={userForm.role === 'SUPER_ADMIN'}
                        className="block w-full px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white disabled:bg-gray-150 disabled:text-gray-400"
                      >
                        {userForm.role === 'SUPER_ADMIN' ? (
                          <option value="全分店">全分店</option>
                        ) : (
                          STORES.map(s => <option key={s} value={s}>{s}</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  {/* 功能權限勾選清單 */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-gray-500 font-bold block mb-1">功能權限勾選設定：</label>
                    <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-gray-200">
                      {ALL_PERMISSIONS.map(perm => {
                        const isChecked = userForm.permissions.includes(perm.id);
                        return (
                          <button
                            type="button"
                            key={perm.id}
                            onClick={() => handlePermissionToggle(perm.id)}
                            className="w-full flex items-center space-x-2 text-left text-xs font-semibold py-1 hover:bg-gray-50 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="h-3.5 w-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 pointer-events-none"
                            />
                            <span className={isChecked ? 'text-indigo-900 font-bold' : 'text-gray-600'}>
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

                  <div className="flex space-x-2 pt-1.5">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs active:scale-95 transition-all"
                    >
                      儲存
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUser(false);
                        setEditingUser(null);
                        setUserForm({ name: '', username: '', password: '', role: 'STAFF', store: '東門店', permissions: ['manage_orders', 'complete_tasks'] });
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 rounded-lg text-xs active:scale-95 transition-all"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 使用者管理清單 */}
            {!isAddingUser && !editingUser && (
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto no-scrollbar border border-gray-150 rounded-xl">
                {users.map(u => (
                  <div key={u.id} className="p-3 flex justify-between items-center hover:bg-gray-50/50">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-gray-800">{u.name}</span>
                        <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.25 rounded font-mono">
                          {u.username}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-400 font-semibold mt-0.5 leading-relaxed">
                        {u.store} • {u.roleLabel}<br />
                        <span className="text-indigo-500 text-[8.5px] font-bold">
                          權限：{(u.permissions || []).length} / {ALL_PERMISSIONS.length} 已啟用
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditUserClick(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // 一般人員僅修改密碼
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold mb-4">
              <Key size={20} />
              <span>修改登入密碼</span>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              {currentUser.password && (
                <div>
                  <label className="text-xs text-gray-500 font-semibold block mb-1">目前密碼 *</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                    required
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">新密碼 *</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  placeholder="請設定新密碼"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">確認新密碼 *</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  placeholder="請再次輸入新密碼"
                  required
                />
              </div>

              {passwordStatus.message && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  passwordStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {passwordStatus.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-95"
              >
                變更密碼
              </button>
            </form>
          </div>
        )}

        {/* 時效警示規則設定 (管理員限定) [新增需求] */}
        {canManageAccounts && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2 text-amber-600 font-bold mb-4">
              <Clock size={20} />
              <span>訂單時效警示規則設定</span>
            </div>

            <form onSubmit={handleSaveAlertSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                    「即將到期」預警天數
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={alertForm.warningDays}
                    onChange={(e) => setAlertForm({ ...alertForm, warningDays: parseInt(e.target.value) || 0 })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                    required
                  />
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    交貨日前 {alertForm.warningDays} 天顯示黃色警告
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block mb-1">
                    「嚴重逾期」警報天數
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={alertForm.criticalDays}
                    onChange={(e) => setAlertForm({ ...alertForm, criticalDays: parseInt(e.target.value) || 1 })}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700"
                    required
                  />
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    逾期超過 {alertForm.criticalDays} 天顯示紅色閃爍
                  </span>
                </div>
              </div>

              {alertStatus && (
                <div className="p-2.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold">
                  {alertStatus}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm active:scale-95"
              >
                儲存時效設定
              </button>
            </form>
          </div>
        )}

        {/* Google Sheets 連線設定 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-green-600 font-bold mb-4">
            <Database size={20} />
            <span>Google 試算表資料同步</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1.5">
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
                  className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs text-gray-700 bg-gray-50/50 font-mono"
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

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleSaveApi}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors shadow-sm active:scale-95"
              >
                儲存 API 設定
              </button>
              <button
                onClick={handleSyncData}
                disabled={isSyncing || !apiUrl}
                className={`w-full font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5 ${
                  isSyncing || !apiUrl
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
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
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 text-yellow-600 font-bold mb-3">
            <Shield size={20} />
            <span>Google Sheets 部署指引</span>
          </div>
          
          <div className="text-[11px] text-gray-600 space-y-3.5 leading-relaxed">
            <p>本系統的 Google 試算表同步透過 Google Apps Script (GAS) 實現，請依循以下步驟進行設定：</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>
                <span className="font-semibold text-gray-800">建立試算表</span>：
                在您的 Google 雲端硬碟建立一個試算表，新增兩個工作表分頁並分別命名為：<span className="font-mono bg-gray-100 px-1 rounded text-red-500">Orders</span> 和 <span className="font-mono bg-gray-100 px-1 rounded text-red-500">Tasks</span>。
              </li>
              <li>
                <span className="font-semibold text-gray-800">設定欄位標題</span> (置於第一列)：
                <div className="mt-1 bg-gray-50 p-2 rounded border border-gray-200 space-y-1 text-[10px] font-mono select-all">
                  <div><strong className="text-blue-600">Orders:</strong> 編號, 客戶姓名, 客戶電話, 商品與承諾內容, 類型, 分店, 提單人員, 客戶來源, 客戶標籤, 數量, 商品單價, 商品成本, 到貨狀態, 建單日期, 預計交貨日, 逾期天數, 客戶簽名, 備註</div>
                  <div><strong className="text-blue-600">Tasks:</strong> 任務編號, 時段, 櫃台, 任務內容, 分數, 是否完成, 完成時間, 完成人員</div>
                </div>
              </li>
              <li>
                <span className="font-semibold text-gray-800">設定 Apps Script</span>：
                點選試算表選單中的 <span className="bg-gray-100 px-1 rounded font-semibold text-gray-800">擴充功能 &gt; Apps Script</span>，將本專案根目錄下的 <span className="font-mono bg-gray-100 px-1 rounded text-blue-600">google-apps-script.js</span> 檔案內容完全複製並貼上，然後點選儲存。
              </li>
              <li>
                <span className="font-semibold text-gray-800">部署為 Web App</span>：
                點選右上角 <span className="bg-gray-100 px-1 rounded font-semibold text-gray-800">部署 &gt; 新增部署</span>。類型選擇「網頁應用程式」，將存取權限設為<span className="font-semibold text-red-500">「任何人 (Anyone)」</span>，然後點擊部署並複製產生的 Web 應用程式網址。
              </li>
            </ol>
          </div>
        </div>

        {/* 安全管理與登出 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 bg-red-50/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors shadow-sm active:scale-95 text-center"
          >
            登出當前帳號
          </button>
        </div>
      </div>
    </div>
  );
}
