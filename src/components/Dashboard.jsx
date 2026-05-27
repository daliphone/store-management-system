import React, { useState, useEffect } from 'react';
import ManieIcon from './ManieIcon';
import { Settings, Calendar, AlertTriangle, Clock, Check, X, Database, LogOut, Target, Wrench } from 'lucide-react';

export default function Dashboard({ 
  orders, 
  tasks, 
  currentUser, 
  onOpenSettings, 
  setActiveTab, 
  setOrderStatusFilter, 
  onLogout 
}) {
  const [activeSubTab, setActiveSubTab] = useState('quote'); // 'quote' 或 'shortcut'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [maniePose, setManiePose] = useState('idle');
  const [isBouncing, setIsBouncing] = useState(false);
  const [alertSettings, setAlertSettings] = useState({ warningDays: 2, criticalDays: 7 });

  // 載入時效設定
  useEffect(() => {
    const cached = localStorage.getItem('store_mgmt_alert_settings');
    if (cached) {
      try {
        setAlertSettings(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  // 門市銷售激勵金句資料庫
  const SALES_QUOTES = [
    "客戶買的不是商品，是您專業又貼心的服務！😊",
    "今天攜碼客戶是主力，配件搭配與加購大有機會喔！🏆",
    "服務好一位熟客，勝過辛苦尋找十位新客人！💪",
    "續約客人的二度開發，是創造門市額外業績的秘訣喔！",
    "笑容是門市最好的名片，今天也給客人一個微笑吧！✨",
    "主動詢問舊機折抵，能有效提升客戶的購機意願！📱",
    "把簡單的事情重複做好就是專業，日常任務一起加油！",
    "細心核對切結書與合約細項，展現我們最專業的一面！",
    "今天的努力，是明天業績的基石，今天也要元氣滿滿！⚡",
    "多做一個貼心動作，成交機率就能多增加一倍！🥤"
  ];

  // 取得今天的日期字串 (YYYY-MM-DD)
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayStr();

  // 1. 根據功能權限與分店過濾訂單
  const getRoleFilteredOrders = () => {
    const perms = currentUser.permissions || [];
    if (perms.includes('view_all_stores')) return orders;
    if (currentUser.role === 'STORE_MANAGER') {
      return orders.filter(o => o.store === currentUser.store);
    }
    return orders.filter(o => o.creator === currentUser.name);
  };

  const baseOrdersForStats = getRoleFilteredOrders();

  // 2. 根據時間動態判斷招呼語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '早安';
    } else if (hour >= 12 && hour < 18) {
      return '午安';
    } else {
      return '晚安';
    }
  };

  // 3. 計算核心指標數據
  // 逾期訂單 (已交機/已交單除外，且逾期天數 > 0)
  const calculateOverdueDaysLocal = (promiseDateStr, status) => {
    if (status === '已交機' || status === '已交單' || !promiseDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promise = new Date(promiseDateStr);
    promise.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - promise.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateRemainingDaysLocal = (promiseDateStr, status) => {
    if (status === '已交機' || status === '已交單' || !promiseDateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const promise = new Date(promiseDateStr);
    promise.setHours(0, 0, 0, 0);
    const diffTime = promise.getTime() - today.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const overdueCount = baseOrdersForStats.filter(o => {
    const isHandedOver = o.status === '已交單' || o.status === '已交機';
    return !isHandedOver && calculateOverdueDaysLocal(o.promiseDate, o.status) > 0;
  }).length;

  const dueTodayCount = baseOrdersForStats.filter(o => {
    const isHandedOver = o.status === '已交單' || o.status === '已交機';
    return !isHandedOver && calculateRemainingDaysLocal(o.promiseDate, o.status) === 0;
  }).length;

  // 與我相關 (一般店員是自己提單的，店長是自己店的，管理員是全部)
  const myRelatedCount = baseOrdersForStats.filter(o => o.creator === currentUser.name).length;

  // 全店待辦 (依據店過濾的任務數)
  const filteredTasks = tasks.filter(t => {
    const isSameStore = currentUser.store === '全分店' || t.store === currentUser.store;
    if (!isSameStore) return false;

    if (t.text && t.text.startsWith('開店-儀容自檢 (')) {
      const nameMatch = t.text.match(/開店-儀容自檢 \((.+)\)/);
      if (nameMatch) {
        const userName = nameMatch[1];
        if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER') {
          return true;
        }
        return currentUser.name === userName;
      }
    }
    return true;
  });

  const pendingTasksCount = filteredTasks.filter(t => !t.completed).length;

  // manie 點擊互動：切換金句與姿勢表情
  const handleManieClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    if (activeSubTab === 'quote') {
      const nextIndex = (quoteIndex + 1) % SALES_QUOTES.length;
      setQuoteIndex(nextIndex);
      
      const poses = ['welcome', 'thinking', 'idle', 'gold'];
      const randomPose = poses[Math.floor(Math.random() * poses.length)];
      setManiePose(randomPose);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar bg-slate-50 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部狀態列 */}
      {currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR') && (
        <div className="bg-slate-900 text-white px-4 py-1.5 flex justify-between items-center text-[10px] font-medium sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-1">
            <Database className="text-emerald-400" size={12} />
            <span className="text-emerald-400 font-extrabold">SyncAll 同步連線正常</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>最後更新: 剛剛</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      )}

      {/* 頂部標題 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between z-10 shadow-sm sticky top-[28px]">
        <button
          onClick={onLogout}
          className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-extrabold text-xs transition-colors p-1.5 rounded-lg hover:bg-red-50 active:scale-95"
        >
          <LogOut size={14} />
          <span>登出</span>
        </button>
        <h1 className="text-lg font-black text-gray-800 tracking-wide font-['Outfit']">Manie 儀表板</h1>
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 font-bold text-xs transition-colors p-1.5 rounded-lg hover:bg-gray-100 active:scale-95"
        >
          <Settings size={16} />
          <span>設定</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 歡迎區塊 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-blue-100/60 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-blue-900 font-['Outfit']">
              {getGreeting()}，{currentUser.name}！
            </h2>
            <p className="text-xs font-bold text-blue-700 mt-1">
              {currentUser.roleLabel} · 今天又是元氣滿滿的一天 🚀
            </p>
            <p className="text-[10px] text-blue-500/80 font-mono">
              系統日期：{new Date().toLocaleDateString('zh-TW')}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-blue-100 overflow-hidden shrink-0">
            <ManieIcon pose="gold" className="w-14 h-14" />
          </div>
        </div>

        {/* 2x2 核心指標數據 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 逾期訂單 */}
          <div 
            onClick={() => {
              setOrderStatusFilter('OVERDUE_HANDOVER');
              setActiveTab('orders');
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-24 active:scale-95 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center space-x-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={12} />
              </div>
              <span className="text-xs font-bold text-gray-500">逾期訂單</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-red-600 font-['Outfit']">{overdueCount}</span>
              <span className="text-[10px] font-bold text-gray-400">件</span>
            </div>
          </div>

          {/* 今日到期 */}
          <div 
            onClick={() => {
              setOrderStatusFilter('DUE_SOON');
              setActiveTab('orders');
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-24 active:scale-95 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center space-x-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="text-orange-600" size={12} />
              </div>
              <span className="text-xs font-bold text-gray-500">今日到期</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-orange-500 font-['Outfit']">{dueTodayCount}</span>
              <span className="text-[10px] font-bold text-gray-400">件</span>
            </div>
          </div>

          {/* 與我相關 */}
          <div 
            onClick={() => {
              setOrderStatusFilter('ALL');
              setActiveTab('orders');
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-24 active:scale-95 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center space-x-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                👤
              </div>
              <span className="text-xs font-bold text-gray-500">與我相關</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-blue-600 font-['Outfit']">{myRelatedCount}</span>
              <span className="text-[10px] font-bold text-gray-400">件</span>
            </div>
          </div>

          {/* 全店待辦 */}
          <div 
            onClick={() => {
              setActiveTab('tasks');
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-24 active:scale-95 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center space-x-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">
                📋
              </div>
              <span className="text-xs font-bold text-gray-500">全店待辦</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-purple-600 font-['Outfit']">{pendingTasksCount}</span>
              <span className="text-[10px] font-bold text-gray-400">件</span>
            </div>
          </div>
        </div>

        {/* 雙卡片區：有望追蹤 & 全店維修 */}
        <div className="grid grid-cols-1 gap-3">
          {/* 有望追蹤 */}
          <button 
            type="button"
            className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all group hover:shadow-md"
            onClick={() => { setActiveTab('orders'); setOrderStatusFilter('ALL'); }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg">
                🎯
              </div>
              <div className="text-left">
                <h3 className="font-black text-gray-800 text-sm font-['Outfit']">有望追蹤</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">檢視所有商機與進度</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors text-xs font-extrabold">
              ➔
            </div>
          </button>

          {/* 全店維修 */}
          <button 
            type="button"
            className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-95 transition-all group hover:shadow-md"
            onClick={() => setActiveTab('tasks')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">
                🛠️
              </div>
              <div className="text-left">
                <h3 className="font-black text-gray-800 text-sm font-['Outfit']">全店維修</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">管理店內報修與環境任務</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors text-xs font-extrabold">
              ➔
            </div>
          </button>
        </div>

        {/* manie 互動助理區塊 (每日金句與快捷待辦) */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-pink-100 rounded-3xl p-4 shadow-sm space-y-3.5">
          {/* 頂部膠囊分頁按鈕 */}
          <div className="flex space-x-1.5 bg-pink-100/50 p-1 rounded-xl w-fit text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('quote');
                setManiePose('idle');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeSubTab === 'quote'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🌟 每日金句
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('shortcut');
                setManiePose('thinking');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeSubTab === 'shortcut'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🚨 今日快捷待辦
            </button>
          </div>

          {/* 吉祥物與對話框展示區 */}
          <div className="flex items-start space-x-3">
            {/* 左側：manie 吉祥物 (支援點擊彈跳動畫與表情更換) */}
            <div 
              onClick={handleManieClick}
              className={`w-20 shrink-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isBouncing ? 'scale-110 -translate-y-2' : 'hover:scale-105 active:scale-95'
              }`}
              title={activeSubTab === 'quote' ? "點我換一句金句！" : undefined}
            >
              <div className="h-20 w-20 flex items-center justify-center">
                <ManieIcon pose={maniePose} className="w-20 drop-shadow-md" />
              </div>
              {activeSubTab === 'quote' && (
                <span className="text-[8px] bg-pink-200/60 text-pink-700 px-1 rounded mt-1 font-bold animate-pulse-subtle">
                  點我更換
                </span>
              )}
            </div>

            {/* 右側：氣泡對話框 */}
            <div className="flex-1 bg-white border border-pink-100/80 rounded-2xl p-3 shadow-inner min-h-[90px] flex flex-col justify-center relative">
              {/* 尖角 */}
              <div className="absolute left-[-6px] top-6 w-3 h-3 bg-white border-l border-b border-pink-100/80 rotate-45"></div>
              
              {activeSubTab === 'quote' ? (
                // 激勵金句
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-700 font-extrabold leading-relaxed">
                    {SALES_QUOTES[quoteIndex]}
                  </p>
                  <p className="text-[9px] text-rose-500 font-bold italic text-right mt-1">
                    — manie 業績加油站
                  </p>
                </div>
              ) : (
                // 快捷待辦 (已修復未定義變數 ReferenceError)
                <div className="space-y-1.5">
                  <div className="text-[10px] text-gray-400 font-bold pb-1 border-b border-dashed border-gray-100 flex justify-between items-center">
                    <span>本日待辦清單 (點擊直達)：</span>
                    <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.25 rounded-md font-extrabold font-mono">
                      {overdueCount + dueTodayCount + pendingTasksCount}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-[11px] font-bold">
                    {overdueCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter('OVERDUE_HANDOVER');
                          setActiveTab('orders');
                        }}
                        className="w-full flex items-center justify-between text-left text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors"
                      >
                        <span>❌ 有 {overdueCount} 筆訂單已逾期</span>
                        <span className="text-[9px] bg-red-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {dueTodayCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter('DUE_SOON');
                          setActiveTab('orders');
                        }}
                        className="w-full flex items-center justify-between text-left text-amber-600 hover:bg-amber-50 p-1 rounded-md transition-colors"
                      >
                        <span>⏳ 有 {dueTodayCount} 筆訂單今日交貨</span>
                        <span className="text-[9px] bg-amber-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {pendingTasksCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="w-full flex items-center justify-between text-left text-blue-600 hover:bg-blue-50 p-1 rounded-md transition-colors"
                      >
                        <span>📋 有 {pendingTasksCount} 個店務任務未完成</span>
                        <span className="text-[9px] bg-blue-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {overdueCount === 0 && dueTodayCount === 0 && pendingTasksCount === 0 ? (
                      <div className="text-center py-2 text-green-600 text-[11px] font-extrabold">
                        🎉 太優秀了！今日店務已全數清空！
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
