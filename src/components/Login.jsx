import React, { useState } from 'react';
import ManieIcon from './ManieIcon';
import { Shield, Key, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login({ users, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 當 users 名單改變時 (例如被刪除了預設首位)，動態更新 selectedUser
  React.useEffect(() => {
    if (users && users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoggingIn(true);
    setErrorMsg('');

    setTimeout(() => {
      // 驗證密碼
      const realPassword = selectedUser.password || '';
      if (realPassword !== '' && password !== realPassword) {
        setIsLoggingIn(false);
        setErrorMsg('密碼錯誤！請輸入該帳號的正確密碼。');
        return;
      }

      setIsLoggingIn(false);
      onLogin(selectedUser);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-gradient-to-b from-blue-50 via-gray-50 to-gray-100 min-h-screen">
      {/* 標頭與 manie welcome 姿勢圖示 */}
      <div className="w-full max-w-sm text-center space-y-2 mb-6">
        <ManieIcon pose="welcome" className="w-28 h-24 mx-auto drop-shadow-md animate-pulse-subtle" />
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">門市店務管理系統</h1>
          <p className="text-[10px] text-gray-500 font-semibold mt-0.5">請登入以存取店務與訂單管理</p>
        </div>
      </div>

      {/* 登入卡片 */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-gray-150/40">
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* 使用者選擇 */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 font-bold block">選擇登入人員</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
              {users.map((user) => {
                const isSelected = selectedUser && selectedUser.id === user.id;
                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setErrorMsg('');
                      setPassword('');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{user.avatar}</span>
                      <div>
                        <div className="font-bold text-gray-800 text-xs">{user.name} ({user.username})</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{user.store} · {user.roleLabel}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 密碼欄位 */}
          {selectedUser && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex justify-between items-center">
                <label className="text-xs text-gray-500 font-bold block">
                  輸入密碼 {selectedUser.password === '' && <span className="text-[10px] text-green-600 font-normal">(此帳號免密碼)</span>}
                </label>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Key size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={selectedUser.password === '' ? '免密碼，請直接登入' : '請輸入密碼'}
                  className="block w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-red-50 rounded-lg text-[10px] text-red-500 font-bold flex items-center space-x-1 border border-red-100">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 登入按鈕 */}
          <button
            type="submit"
            disabled={isLoggingIn || !selectedUser}
            className={`w-full text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 ${
              !selectedUser 
                ? 'bg-gray-200 cursor-not-allowed text-gray-400 shadow-none' 
                : 'bg-blue-500 hover:bg-blue-600 active:scale-95'
            }`}
          >
            {isLoggingIn ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>驗證中...</span>
              </>
            ) : (
              <>
                <span>登入 manie 系統</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* 底部商標 */}
      <div className="w-full max-w-sm text-center mt-6 text-[9px] text-gray-400 font-medium">
        © 2026 馬尼行動通訊 money3c.com.tw
      </div>
    </div>
  );
}
