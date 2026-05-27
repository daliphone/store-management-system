import React, { useState } from 'react';
import ManieIcon from './ManieIcon';
import { Shield, Key, Loader2, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';

export default function Login({ users, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 當 users 名單改變時，動態更新 selectedUser
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
    <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-gradient-to-b from-blue-50/50 via-slate-50 to-slate-100 min-h-screen font-['Outfit',_'Inter',_sans-serif]">
      {/* 標頭與 manie welcome 姿勢圖示 */}
      <div className="w-full max-w-sm text-center space-y-2 mb-6 animate-fade-in">
        <ManieIcon pose="welcome" className="w-28 h-24 mx-auto drop-shadow-md hover:scale-105 transition-transform" />
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-['Outfit']">門市店務管理系統</h1>
          <p className="text-[10px] text-slate-400 font-bold tracking-wider">請登入以存取店務與訂單管理系統</p>
        </div>
      </div>

      {/* 登入卡片 (大圓角與微立體陰影) */}
      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100/50">
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          
          {/* 使用者選擇 (100% 對齊設定頁模擬卡片樣式) */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold block">選擇登入人員</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
              {users.map((user) => {
                const isSelected = selectedUser && selectedUser.id === user.id;
                
                // 模擬顯示分店角色文字
                let storeRoleLabel = '';
                if (user.role === 'SUPER_ADMIN') storeRoleLabel = '系統管理員 (全區)';
                else if (user.role === 'AUDITOR') storeRoleLabel = '總管理處稽核員 (全區)';
                else storeRoleLabel = `${user.store} - ${user.role === 'STORE_MANAGER' ? '店長' : '業務'}`;

                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setErrorMsg('');
                      setPassword('');
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-white shadow-[0_4px_16px_rgba(37,99,235,0.06)] ring-1 ring-blue-400'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-xs font-black text-slate-800">{user.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{storeRoleLabel}</span>
                    </div>
                    {isSelected && (
                      <div className="text-blue-500 border border-blue-500 rounded-full p-0.5 flex items-center justify-center bg-blue-50/20">
                        <Check size={10} strokeWidth={3.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 密碼欄位 */}
          {selectedUser && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs text-slate-500 font-bold block">
                輸入密碼 {selectedUser.password === '' && <span className="text-[10px] text-emerald-600 font-bold ml-1">(此帳號免密碼)</span>}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={selectedUser.password === '' ? '免密碼，請直接登入' : '請輸入密碼'}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 rounded-xl text-[10px] text-red-500 font-bold flex items-center space-x-1.5 border border-red-100 animate-shake">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 登入按鈕 (深藍色/桃紅色質感大按鈕) */}
          <button
            type="submit"
            disabled={isLoggingIn || !selectedUser}
            className={`w-full text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95 ${
              !selectedUser 
                ? 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:shadow-lg'
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
      <div className="w-full max-w-sm text-center mt-8 text-[9px] text-slate-400 font-bold font-mono tracking-wider select-none">
        © 2026 馬尼行動通訊 MONEY3C.COM.TW
      </div>
    </div>
  );
}
