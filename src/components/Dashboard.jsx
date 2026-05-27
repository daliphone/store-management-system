import React, { useState } from 'react';
import ManieIcon from './ManieIcon';
import { Settings, AlertCircle, Calendar, UserCheck, CheckSquare, Target, Wrench } from 'lucide-react';

export default function Dashboard({ orders, tasks, currentUser, onOpenSettings, setActiveTab, setOrderStatusFilter, onLogout }) {
  const [activeSubTab, setActiveSubTab] = useState('quote'); // 'quote' 或 'shortcut'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [maniePose, setManiePose] = useState('idle');
  const [isBouncing, setIsBouncing] = useState(false);

  // 根據時間動態判斷招呼語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return '早安！';
    } else if (hour >= 12 && hour < 18) {
      return '午安！';
    } else {
      return '晚安！辛苦啦~';
    }
  };

  // 門市銷售激勵金句資料庫 (B方案)
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

  // 根據功能權限與分店過濾訂單
  const filteredOrders = orders.filter(order => {
    const perms = currentUser.permissions || [];
    if (perms.includes('view_all_stores')) return true; // 具備檢視全店權限
    if (currentUser.role === 'STORE_MANAGER') return order.store === currentUser.store; // 店長過濾分店
    return order.creator === currentUser.name; // 一般店員僅看自己提單
  });

  const filteredTasks = tasks.filter(t => {
    // 依據店過濾
    const isSameStore = currentUser.store === '全分店' || t.store === currentUser.store;
    if (!isSameStore) return false;
    
    // 依據個人自檢過濾
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

  // 計算數據
  const overdueCount = filteredOrders.filter(o => o.overdueDays > 0 && o.status !== '已交機').length;
  const todayDueCount = filteredOrders.filter(o => o.promiseDate === todayStr && o.status !== '已交機').length;
  
  // 「我相關」
  const myRelatedCount = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR'
    ? orders.length 
    : currentUser.role === 'STORE_MANAGER'
      ? orders.filter(o => o.store === currentUser.store).length
      : orders.filter(o => o.creator === currentUser.name).length;

  const pendingTasksCount = filteredTasks.filter(t => !t.completed).length;

  // manie 點擊互動：切換金句與姿勢表情 (B方案)
  const handleManieClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    if (activeSubTab === 'quote') {
      const nextIndex = (quoteIndex + 1) % SALES_QUOTES.length;
      setQuoteIndex(nextIndex);
      
      // 隨機切換姿勢表情 (welcome, thinking, idle)
      const poses = ['welcome', 'thinking', 'idle'];
      const randomPose = poses[Math.floor(Math.random() * poses.length)];
      setManiePose(randomPose);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <button
          onClick={onLogout}
          className="flex items-center space-x-1 text-red-500 hover:text-red-700 font-extrabold text-xs transition-colors p-1.5 rounded-lg hover:bg-red-50 active:scale-95"
        >
          <span>登出</span>
        </button>
        <h1 className="text-base font-bold text-gray-800 tracking-wide">門市店務管理系統</h1>
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 font-medium text-xs transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <Settings size={16} />
          <span>設定</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 超級管理員與稽核員專屬直達試算表按鈕 */}
        {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR') && (
          <a
            href="https://docs.google.com/spreadsheets/d/13kUwwjkiPo-C5kBCxpV0JRLtB_dD6zgTwcDLAZAOu90/edit?gid=1293678477#gid=1293678477"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-md active:scale-99 border border-green-600/20"
          >
            <span>📑 前往雲端試算表稽核歷史存檔</span>
          </a>
        )}
        {/* 歡迎與問候語 + manie 金幣圖示 */}
        <div className="pt-2 flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100/60 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{getGreeting()}{currentUser.name}</h2>
            <p className="text-xs text-gray-500 font-semibold">
              {currentUser.name} ({currentUser.roleLabel})
            </p>
            <p className="text-[10px] text-gray-400 font-medium font-mono">
              日期：{new Date().toLocaleDateString('zh-TW')}
            </p>
          </div>
          {/* 金幣 manie 姿勢 */}
          <ManieIcon pose="gold" className="w-20 h-16 drop-shadow-sm hover:scale-105 transition-transform" />
        </div>

        {/* 2x2 統計方格 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 逾期 */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between h-24 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
          >
            <span className="text-3xl font-black text-amber-700">{overdueCount}</span>
            <div className="flex items-center space-x-1 text-xs text-amber-600 font-bold">
              <span>🚨</span>
              <span>逾期</span>
            </div>
          </div>

          {/* 今日到期 */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col justify-between h-24 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
          >
            <span className="text-3xl font-black text-gray-800">{todayDueCount}</span>
            <div className="flex items-center space-x-1 text-xs text-gray-500 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
              <span>今日到期</span>
            </div>
          </div>

          {/* 我相關 */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col justify-between h-24 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
          >
            <span className="text-3xl font-black text-gray-800">{myRelatedCount}</span>
            <div className="flex items-center space-x-1 text-xs text-gray-500 font-bold">
              <span>👤</span>
              <span>我相關</span>
            </div>
          </div>

          {/* 全店待辦 */}
          <div 
            onClick={() => setActiveTab('tasks')}
            className="bg-white border border-gray-100 p-4 rounded-2xl flex flex-col justify-between h-24 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-98"
          >
            <span className="text-3xl font-black text-gray-800">{pendingTasksCount}</span>
            <div className="flex items-center space-x-1 text-xs text-gray-500 font-bold">
              <span>📋</span>
              <span>全店待辦</span>
            </div>
          </div>
        </div>

        {/* 長條卡片 1: 有望追蹤 */}
        <div 
          onClick={() => setActiveTab('orders')}
          className="bg-amber-100/50 border border-amber-200/50 p-4 rounded-2xl flex justify-between items-center shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-99"
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-sm">
              <Target size={16} className="text-amber-600" />
              <span>有望追蹤</span>
            </div>
            <div className="text-xl font-black text-amber-900">
              {orders.filter(o => o.type === '訂貨').length} <span className="text-xs font-semibold">筆</span>
            </div>
            <div className="text-[10px] text-amber-700 font-medium">
              ⏰ {orders.filter(o => o.type === '訂貨').length} 筆今日要跟進
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-200/50 rounded-xl flex items-center justify-center text-2xl">
            🎯
          </div>
        </div>

        {/* 長條卡片 2: 全店維修 */}
        <div 
          onClick={() => setActiveTab('tasks')}
          className="bg-sky-100/50 border border-sky-200/50 p-4 rounded-2xl flex justify-between items-center shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-99"
        >
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-sky-800 font-bold text-sm">
              <Wrench size={16} className="text-sky-600" />
              <span>全店維修</span>
            </div>
            <div className="text-xl font-black text-sky-900">
              0 <span className="text-xs font-semibold">件</span>
            </div>
            <div className="text-[10px] text-sky-700 font-medium">
              點擊查看清單
            </div>
          </div>
          <div className="w-12 h-12 bg-sky-200/50 rounded-xl flex items-center justify-center text-2xl">
            🔧
          </div>
        </div>

        {/* manie 互動助理區塊 (B+C 方案結合) */}
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
              <div className="h-20 w-20 flex items-center justify-center overflow-hidden">
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
                // 激勵金句 (B方案)
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-700 font-extrabold leading-relaxed">
                    {SALES_QUOTES[quoteIndex]}
                  </p>
                  <p className="text-[9px] text-rose-500 font-bold italic text-right mt-1">
                    — manie 業績加油站
                  </p>
                </div>
              ) : (
                // 快捷待辦 (C方案)
                <div className="space-y-1.5">
                  <div className="text-[10px] text-gray-400 font-bold pb-1 border-b border-dashed border-gray-100 flex justify-between items-center">
                    <span>本日待辦清單 (點擊直達)：</span>
                    <span className="text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.25 rounded-md font-extrabold font-mono">
                      {overdueCount + todayDueCount + pendingTasksCount}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-[11px] font-bold">
                    {overdueCount > 0 ? (
                      <button
                        onClick={() => {
                          setOrderStatusFilter('OVERDUE');
                          setActiveTab('orders');
                        }}
                        className="w-full flex items-center justify-between text-left text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors"
                      >
                        <span>❌ 有 {overdueCount} 筆訂單已逾期</span>
                        <span className="text-[9px] bg-red-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {todayDueCount > 0 ? (
                      <button
                        onClick={() => {
                          setOrderStatusFilter('WARNING'); // WARNING 會過濾出 0~2 天內交貨的
                          setActiveTab('orders');
                        }}
                        className="w-full flex items-center justify-between text-left text-amber-600 hover:bg-amber-50 p-1 rounded-md transition-colors"
                      >
                        <span>⏳ 有 {todayDueCount} 筆訂單今日交貨</span>
                        <span className="text-[9px] bg-amber-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {pendingTasksCount > 0 ? (
                      <button
                        onClick={() => setActiveTab('tasks')}
                        className="w-full flex items-center justify-between text-left text-blue-600 hover:bg-blue-50 p-1 rounded-md transition-colors"
                      >
                        <span>📋 有 {pendingTasksCount} 個店務任務未完成</span>
                        <span className="text-[9px] bg-blue-100 px-1.5 rounded font-mono font-extrabold">GO</span>
                      </button>
                    ) : null}

                    {overdueCount === 0 && todayDueCount === 0 && pendingTasksCount === 0 ? (
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
