import React, { useState } from 'react';
import ManieIcon from './ManieIcon';
import { Shield, Key, Loader2, ArrowRight, Eye, EyeOff, Check, User } from 'lucide-react';

export default function Login({ users, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 即時在前端尋找匹配的在職員工
  const matchedUser = users.find(u => u.username === username.trim());

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUsername = username.trim();
    if (!targetUsername) {
      setErrorMsg('請輸入員工編號！');
      return;
    }

    const user = users.find(u => u.username === targetUsername);
    if (!user) {
      setErrorMsg('找不到此員工編號，請重新確認！');
      return;
    }

    setIsLoggingIn(true);

    setTimeout(() => {
      // 驗證密碼
      const realPassword = user.password || '';
      if (realPassword !== '' && password !== realPassword) {
        setIsLoggingIn(false);
        setErrorMsg('密碼錯誤！請輸入該帳號的正確密碼。');
        return;
      }

      setIsLoggingIn(false);
      onLogin(user);
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
          
          {/* 帳號 (員工編號) 輸入欄位 */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold block">員工編號 (帳號)</label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="請輸入您的員工編號 (如: 1001)"
                className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-bold text-slate-800"
                required
              />
            </div>
            
            {/* 智能人員確認提示卡片 */}
            {matchedUser && (
              <div className="text-[10px] text-emerald-750 font-bold bg-emerald-50 border border-emerald-100/60 px-3 py-2 rounded-xl flex items-center space-x-1.5 animate-fade-in">
                <Check size={11} strokeWidth={3.5} className="text-emerald-600 shrink-0" />
                <span>已確認同仁：{matchedUser.name} ({matchedUser.roleLabel} · {matchedUser.store})</span>
              </div>
            )}
          </div>

          {/* 密碼欄位 */}
          <div className="space-y-2">
            <label className="text-xs text-slate-500 font-bold block">
              輸入密碼 {matchedUser && matchedUser.password === '' && <span className="text-[10px] text-emerald-600 font-bold ml-1">(此帳號免密碼)</span>}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key size={14} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={matchedUser && matchedUser.password === '' ? '免密碼，請直接登入' : '請輸入密碼'}
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

          {errorMsg && (
            <div className="p-3 bg-red-50 rounded-xl text-[10px] text-red-500 font-bold flex items-center space-x-1.5 border border-red-100 animate-shake">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 登入按鈕 (天藍色質感大按鈕) */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95 bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
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
