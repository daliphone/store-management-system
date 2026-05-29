import React, { useState, useEffect } from 'react';
import { Coins, Smartphone, Users as UsersIcon, ShieldCheck, HelpCircle, Calendar, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { submitDailyPerformance } from '../services/googleSheetsService';
import { USERS } from '../mockData';

export default function PerformanceForm({ currentUser, onClose, onRefreshData }) {
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // 門市列表與編號對照
  const STORE_CODE_MAP = {
    '2': '文賢店',
    '4': '東門店',
    '5': '歸仁店',
    '6': '小西門店',
    '7': '永康店',
    '8': '五甲店',
    '10': '安中店',
    '11': '鹽行店'
  };

  const STORES = [
    '東門店',
    '小西門店',
    '文賢店',
    '永康店',
    '歸仁店',
    '安中店',
    '鹽行店',
    '五甲店',
    '遠傳延平店',
    '電商部'
  ];

  // 取得當前使用者有權限填寫的分店清單
  const getAvailableStores = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.storeCodes === 'ALL') {
      return STORES.filter(s => s !== '電商部');
    }
    if (!currentUser.storeCodes) {
      return [currentUser.store];
    }

    const codes = currentUser.storeCodes.split(',');
    const list = [];
    codes.forEach(code => {
      const storeName = STORE_CODE_MAP[code.trim()];
      if (storeName) {
        list.push(storeName);
      }
    });

    if (currentUser.store && !list.includes(currentUser.store)) {
      list.push(currentUser.store);
    }
    return [...new Set(list)];
  };

  const availableStores = getAvailableStores();

  // 表單狀態
  const [selectedStore, setSelectedStore] = useState(() => {
    return availableStores.length > 0 ? availableStores[0] : (currentUser?.store || '東門店');
  });

  // 暱稱列表 (僅管理員可用)
  const allStaffUsers = USERS.filter(u => u.sheetName && u.role !== 'SUPER_ADMIN');
  const [selectedSheetName, setSelectedSheetName] = useState(() => {
    return currentUser?.sheetName || currentUser?.name || '';
  });

  const [grossProfit, setGrossProfit] = useState('');
  const [insurance, setInsurance] = useState('');
  const [subscription, setSubscription] = useState('');
  const [accessories, setAccessories] = useState('');
  const [customerCount, setCustomerCount] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isManager = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR');

  // 當選擇店點改變時，若是一般同仁，自動更新其暱稱
  useEffect(() => {
    if (!isManager && currentUser) {
      setSelectedSheetName(currentUser.sheetName || currentUser.name);
    }
  }, [selectedStore, currentUser, isManager]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSheetName) {
      setErrorMsg('請先填寫銷售人員報表暱稱');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const inputData = {
      storeName: selectedStore,
      sheetName: selectedSheetName,
      date,
      grossProfit: grossProfit === '' ? 0 : Number(grossProfit),
      insurance: insurance === '' ? 0 : Number(insurance),
      subscription: subscription === '' ? 0 : Number(subscription),
      accessories: accessories === '' ? 0 : Number(accessories),
      customerCount: customerCount === '' ? 0 : Number(customerCount),
      operator: currentUser.name,
      operatorRole: currentUser.role
    };

    try {
      const result = await submitDailyPerformance(inputData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onRefreshData) onRefreshData();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(result.message || '業績登錄失敗，請稍後再試。');
      }
    } catch (err) {
      setErrorMsg(err.message || '系統連線錯誤');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[32px] p-8 shadow-2xl max-w-sm w-full text-center space-y-4 animate-scale-in border border-slate-50">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-xl font-black text-slate-800">業績登錄成功！</h2>
          <p className="text-xs text-slate-400 font-bold">資料已安全同步至 Google 雲端報表</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center z-50 p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[480px] rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-h-[92vh] flex flex-col animate-slide-up border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部標題 */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <button 
            onClick={onClose} 
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-base font-black text-slate-800 flex items-center justify-center gap-1.5">
              <Sparkles size={18} className="text-rose-500" />
              每日門市業績登錄
            </h2>
            <p className="text-[10px] text-slate-400 font-bold">請確實填寫當日實際營運業績</p>
          </div>
          <div className="w-8"></div> {/* 佔位 balance */}
        </div>

        {/* 表單主體 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-10">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-4 py-3 rounded-2xl animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. 填報店點與人員 */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              {/* 店點選擇 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">登錄分店</label>
                {availableStores.length > 1 ? (
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-colors"
                  >
                    {availableStores.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-black text-slate-500 select-none">
                    {selectedStore}
                  </div>
                )}
              </div>

              {/* 人員選擇 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">銷售人員 (報表分頁)</label>
                {isManager ? (
                  <select
                    value={selectedSheetName}
                    onChange={(e) => setSelectedSheetName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-colors"
                  >
                    <option value="">請選擇同仁...</option>
                    {allStaffUsers.map(u => (
                      <option key={u.id} value={u.sheetName}>{u.name} ({u.sheetName})</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-white border border-slate-150 rounded-xl px-3 py-2 text-xs font-black text-slate-500 select-none flex flex-col">
                    <span>{selectedSheetName}</span>
                    {!currentUser?.sheetName && (
                      <span className="text-[8px] text-rose-500 font-extrabold mt-0.5">尚未設定暱稱，將用姓名傳送</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 日期選擇 */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 mb-1">業績日期</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <Calendar size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 2. 數值輸入項 */}
          <div className="space-y-3.5">
            {/* 實際毛利 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                <Coins size={12} className="text-amber-500" />
                當日實際毛利 (今日業績)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="請輸入當日累計毛利"
                value={grossProfit}
                onChange={(e) => setGrossProfit(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 placeholder-slate-350 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>

            {/* 配件營收 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                <Smartphone size={12} className="text-sky-500" />
                當日配件營收
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="請輸入配件銷售額"
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 placeholder-slate-350 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>

            {/* 來客數 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                <UsersIcon size={12} className="text-indigo-500" />
                當日實質來客數 (人)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="請輸入不重複來客人數"
                value={customerCount}
                onChange={(e) => setCustomerCount(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 placeholder-slate-350 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>

            {/* 保險營收 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                當日保險營收 (選填)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="請輸入手機保險營收，無則留空"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-350 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>

            {/* 門號數 */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                <HelpCircle size={12} className="text-rose-400" />
                當日門號開通數 (選填)
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="請輸入攜碼/續約開通門號數，無則留空"
                value={subscription}
                onChange={(e) => setSubscription(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-350 focus:outline-none focus:border-rose-500 focus:bg-white transition-all shadow-inner-sm"
              />
            </div>
          </div>

          {/* 3. 送出按鈕 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !selectedSheetName}
              className="w-full bg-slate-900 text-white hover:bg-slate-800 font-extrabold py-3.5 rounded-2xl text-xs active:scale-95 transition-all flex items-center justify-center space-x-2 border-none shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>正在寫入雲端試算表...</span>
                </>
              ) : (
                <span>確認登錄今日業績 ➔</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
