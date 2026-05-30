import React, { useState } from 'react';
import { Settings as SettingsIcon, X, Key, LogOut } from 'lucide-react';

export default function Settings({ currentUser, setCurrentUser, onClose, onLogout, users, onUpdateUsers }) {
  const [avatarGroup, setAvatarGroup] = useState(() => {
    return localStorage.getItem('manie_avatar_group') || 'random';
  });

  const handleAvatarGroupChange = (group) => {
    setAvatarGroup(group);
    localStorage.setItem('manie_avatar_group', group);
    window.dispatchEvent(new Event('manie_group_changed'));
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  // 修改密碼
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

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar pb-16 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部標題與關閉按鈕 */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-2">
          <SettingsIcon size={20} className="text-blue-500" />
          <h2 className="text-base font-black text-slate-800 tracking-wide font-['Outfit']">個人設定</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-150 rounded-full transition-colors active:scale-90 border bg-white shadow-sm">
          <X size={18} className="text-slate-500" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto w-full">
        {/* 修改密碼卡片 */}
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
                  className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
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
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
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
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
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
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-95 border-none"
            >
              儲存新密碼
            </button>
          </form>
        </div>

        {/* 吉祥物外觀設定 */}
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100">
          <div className="flex items-center space-x-2 text-rose-600 font-extrabold text-sm mb-4">
            <span className="material-symbols-outlined text-[18px] text-rose-500 select-none">face</span>
            <span>吉祥物智慧助理 (manie) 款式設定</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 'random', title: '🎲 隨機更換 (經典 2D / 3D 公仔混搭)', desc: '每次點擊或重新載入時，將隨機呈現不同外觀樣式' },
              { id: 'classic', title: '🌸 經典 2D 款', desc: '固定使用經典的 2D 去背小粉紅插圖款式' },
              { id: 'figurine', title: '🧸 3D 公仔款', desc: '固定使用高質感的 3D 立體去背公仔款式' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAvatarGroupChange(opt.id)}
                className={`w-full text-left p-3.5 rounded-2xl transition-all border flex flex-col gap-1 active:scale-99 ${
                  avatarGroup === opt.id
                    ? 'bg-rose-50/50 border-rose-200 text-rose-700 shadow-sm shadow-rose-500/5'
                    : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-xs font-black">{opt.title}</span>
                <span className="text-[10px] text-slate-400 font-medium">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 登出當前帳號 */}
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-red-150 bg-red-50/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors shadow-md active:scale-95 text-center flex items-center justify-center space-x-1.5 border-none"
          >
            <LogOut size={14} />
            <span>登出當前帳號</span>
          </button>
        </div>
      </div>
    </div>
  );
}
