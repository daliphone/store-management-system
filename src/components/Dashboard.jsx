import React, { useState, useEffect } from 'react';
import ManieIcon from './ManieIcon';
import { Settings, Calendar, AlertTriangle, Clock, Check, X, Database, LogOut, Target, Wrench, TrendingUp, Loader2 } from 'lucide-react';
import { getStorePerformance } from '../services/googleSheetsService';

export default function Dashboard({ 
  orders, 
  tasks, 
  currentUser, 
  onOpenSettings, 
  setActiveTab, 
  setOrderStatusFilter, 
  onLogout,
  stores,
  setTasksStoreFilter
}) {
  const [activeSubTab, setActiveSubTab] = useState('quote'); // 'quote' 或 'shortcut'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [maniePose, setManiePose] = useState('idle');
  const [isBouncing, setIsBouncing] = useState(false);
  const [alertSettings, setAlertSettings] = useState({ warningDays: 2, criticalDays: 7 });
  const [greetingText, setGreetingText] = useState('');
  const [isStoreTasksModalOpen, setIsStoreTasksModalOpen] = useState(false);
  const [homePerf, setHomePerf] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.store !== '電商部') {
      const fetchHomePerf = async () => {
        setPerfLoading(true);
        try {
          const isManager = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER';
          const defaultSheet = isManager ? (currentUser.store === '全分店' ? '東門店' : currentUser.store) : (currentUser.sheetName || currentUser.name);
          const storeName = currentUser.store === '全分店' ? '東門店' : currentUser.store;
          const data = await getStorePerformance(storeName, defaultSheet, currentUser.role);
          if (data && data.status === 'success') {
            setHomePerf(data);
          }
        } catch (e) {
          console.warn('Dashboard 業績載入失敗', e);
        } finally {
          setPerfLoading(false);
        }
      };
      fetchHomePerf();
    }
  }, [currentUser]);

  // 統計各分店的未完成任務數 (對齊 TaskList 邏輯)
  const getStorePendingTasksMap = () => {
    const map = {};
    const activeStores = stores ? stores.filter(s => s !== '全分店') : [];
    activeStores.forEach(s => {
      map[s] = 0;
    });

    tasks.forEach(t => {
      if (!t.completed && map[t.store] !== undefined) {
        // 電商部排除五大項常規店務任務
        if (t.store === '電商部') {
          const isFiveDefaultTask = 
            (t.text && t.text.startsWith('開店-儀容自檢')) || 
            t.text === '開店-環境清掃' || 
            t.text === '營業-零用金確認' || 
            t.text === '營業-隨機盤點庫存' || 
            t.text === '閉店-庫存表上傳';
          if (isFiveDefaultTask) return;
        }
        map[t.store] = (map[t.store] || 0) + 1;
      }
    });
    return map;
  };

  // 載入時效設定與隨機初始化
  useEffect(() => {
    const cached = localStorage.getItem('store_mgmt_alert_settings');
    if (cached) {
      try {
        setAlertSettings(JSON.parse(cached));
      } catch (e) {}
    }

    // 隨機選取金句
    setQuoteIndex(Math.floor(Math.random() * SALES_QUOTES.length));

    // 隨機選取招呼語 (管理員直接稱呼管理員，其餘顯示為 XX門市同仁)
    const isManager = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'AUDITOR' || currentUser?.store === '全分店';
    const displayName = isManager ? '管理員' : (() => {
      const storeName = currentUser?.store || '門市';
      const storeSuffix = (storeName.endsWith('部') || storeName.endsWith('處') || storeName.includes('門市')) ? '' : '門市';
      return `${storeName}${storeSuffix}同仁`;
    })();
    
    const greetings = [
      `${displayName}，今天也是業績長紅、活力滿滿的一天！💪`,
      `${displayName}，今天讓我們以最熱情的笑容迎接每位客人吧！✨`,
      `${displayName}，今天出單順利、事事順心，一起加油！🚀`,
      `${displayName}，今天手氣超旺，主力搭配銷售大有斬獲！🏆`,
      `${displayName}，今天細心服務、顧客滿意，創造美好的一天！🌟`,
      `${displayName}，今天也是元氣滿滿，讓我們一起突破目標！🔥`,
      `${displayName}，關關難過關關過，今天也要保持愉快的心情喔！🌈`,
      `${displayName}，多一點貼心，多一點貼切，今天業績一定飛高高！📈`,
      `${displayName}，今天也要把最溫馨的服務帶給每一位顧客！❤️`,
      `${displayName}，今天就讓我們攜手創造新的銷售紀錄吧！🎯`,
      `${displayName}，保持專注與熱情，今天肯定能收穫滿滿的成果！🌟`,
      `${displayName}，您就是門市最強的招財星，今天也祝您開單連連！💰`
    ];
    const randomIdx = Math.floor(Math.random() * greetings.length);
    setGreetingText(greetings[randomIdx]);
  }, [currentUser]);

  // 門市銷售激勵金句資料庫
  const SALES_QUOTES = [
    "客戶買的不是商品，是您專業又貼心的服務！😊",
    "今天攜碼客戶是主力，配件搭配與加購大有機會喔！🏆",
    "服務好一位熟客，勝過辛苦尋找十位新客人！💪",
    "續約客人的二度開發，是創造門市額外業績的秘訣喔！📱",
    "笑容是門市最好的名片，今天也給客人一個微笑吧！✨",
    "主動詢問舊機折抵，能有效提升客戶的購機意願！📱",
    "把簡單的事情重複做好就是專業，日常任務一起加油！",
    "細心核對切結書與合約細項，展現我們最專業的一面！",
    "今天的努力，是明天業績的基石，今天也要元氣滿滿！⚡",
    "多做一個貼心動作，成交機率就能多增加一倍！🥤",
    "魔鬼藏在細節裡，細心確認每一筆訂單，才不會白忙一場喔！🔍",
    "成功不是將來才有的，而是從決定去做的那一刻起，持續累積而成的！",
    "每一位踏進店裡的顧客，都是一次建立長久信任的起點！🤝",
    "主動推薦熱銷配件，不僅提升客單價，還能讓客人覺得我們超貼心！🎧",
    "不要害怕被拒絕，每一次的溝通都是磨練銷售技巧的最好機會！⚡",
    "電商出單快又準，門市服務暖人心，大家分工合作，創造最棒的業績！🚀",
    "用真誠傾聽客戶需求，比強行推銷更能打動客人的心！❤️",
    "把每一次的挑戰當作學習，今天我們一定能做得比昨天更好！🌈",
    "完美的交機體驗是客戶回流的關鍵，讓我們把關好最後一步！📱",
    "只要每天進步一點點，累積起來就是驚人的成就，一起衝刺吧！🎯",
    "真誠的關懷能融化冰山，用暖心對待每一位顧客吧！☕",
    "相信自己能做到，你就已經成功了一半，今天也要全力以赴！🔥",
    "每一次的成交，都源於我們對專業的堅持與客人的信任！🌟",
    "把每個客人的抱怨當成改進的契機，我們的服務就會越來越完美！📈",
    "團結就是力量，分店的夥伴們互相支援，就是我們最大的底氣！🤝",
    "把小事做到極致，就是我們的品牌價值，今天也細心做好每一件事！✨",
    "主動多問一句「今天還有其他需要的嗎？」，可能就會多一件配件出單喔！🎧",
    "熱情是會傳染的，當您對工作充滿熱情，顧客也能深深感受到！🚀",
    "用汗水澆灌的種子，終會開出業績的繁花，大家一起衝刺！🏆",
    "堅持品質、堅持微笑，您就是門市最閃亮的明星！🌟",
    "不要為昨天的遺憾買單，用今天的活力創造全新的成交紀錄！⚡",
    "細心確認合約、合約再確認，保護顧客也是保護我們自己！🛡️",
    "多給同仁一個讚美，團隊的氛圍會更加融洽，大家一起加油！❤️"
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

  const getTasksCardTitle = () => {
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.store === '全分店') {
      return '全店待辦';
    }
    if (currentUser.store === '電商部') {
      return '部門待辦';
    }
    return '門市待辦';
  };

  // 全店待辦 (依據店過濾的任務數)
  const filteredTasks = tasks.filter(t => {
    // 1. 同一分店/部門過濾
    const isSameStore = currentUser.store === '全分店' || t.store === currentUser.store;
    if (!isSameStore) return false;

    // 2. 如果是電商部，排除五大項常規店務任務
    if (currentUser.store === '電商部') {
      const isFiveDefaultTask = 
        (t.text && t.text.startsWith('開店-儀容自檢')) || 
        t.text === '開店-環境清掃' || 
        t.text === '營業-零用金確認' || 
        t.text === '營業-隨機盤點庫存' || 
        t.text === '閉店-庫存表上傳';
      if (isFiveDefaultTask) return false;
    }

    // 3. 儀容自檢個人名字過濾
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

    // 4. 指派對象為個人過濾 (一般店員只能看見指派給自己的任務，主管/稽核能檢視全部)
    if (t.assignType === '個人' && t.assignedTo) {
      if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER') {
        return true;
      }
      return currentUser.name === t.assignedTo;
    }

    return true;
  });

  const pendingTasksCount = filteredTasks.filter(t => !t.completed).length;

  // manie 點擊互動：切換金句與姿勢表情，並隨機更換 2D/3D 公仔組數
  const handleManieClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    // 切換每日金句 (僅在金句頁籤生效)
    if (activeSubTab === 'quote') {
      let nextIndex = quoteIndex;
      if (SALES_QUOTES.length > 1) {
        while (nextIndex === quoteIndex) {
          nextIndex = Math.floor(Math.random() * SALES_QUOTES.length);
        }
      }
      setQuoteIndex(nextIndex);
    }
    
    // 隨機切換姿勢表情 (選用相容 3D 公仔的 1-9 號表情)
    const poses = ['welcome', 'idle', 'sleep', 'cheer', 'gift', 'smile', 'sweat', 'fun', 'great'];
    const randomPose = poses[Math.floor(Math.random() * poses.length)];
    setManiePose(randomPose);

    // 隨機更換組別：如果設定為 random，點擊時會拋出事件讓全站吉祥物隨機更換
    const settingGroup = localStorage.getItem('manie_avatar_group') || 'random';
    if (settingGroup === 'random') {
      window.dispatchEvent(new Event('manie_group_changed'));
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
          <div className="space-y-1 flex-1 pr-2">
            <h2 className="text-xl font-black text-blue-900 font-['Outfit']">
              {getGreeting()}，{currentUser.name}！
            </h2>
            <p className="text-xs font-bold text-blue-700 mt-1">
              {greetingText || `${currentUser.roleLabel} · 今天又是元氣滿滿的一天 🚀`}
            </p>
            <p className="text-[10px] text-blue-500/80 font-mono">
              系統日期：{new Date().toLocaleDateString('zh-TW')}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border-2 border-blue-100 overflow-hidden shrink-0">
            <ManieIcon pose="gold" className="w-14 h-14" />
          </div>
        </div>

        {/* 每日業績達成率卡片 */}
        {currentUser && currentUser.store !== '電商部' && (
          <div 
            onClick={() => setActiveTab('performance')}
            className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col space-y-3 active:scale-98 transition-all cursor-pointer hover:shadow-md font-['Outfit'] select-none"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1.5 text-rose-500 font-extrabold text-xs">
                <TrendingUp size={15} />
                <span className="text-slate-800">🎯 當月毛利達成率</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                詳細分析 ➔
              </span>
            </div>

            {perfLoading ? (
              <div className="flex items-center space-x-2 py-1 select-none">
                <Loader2 size={12} className="text-rose-500 animate-spin" />
                <span className="text-[10px] font-bold text-slate-400">正在同步業績數據...</span>
              </div>
            ) : homePerf ? (() => {
              const grossProfitData = homePerf.summary?.['毛利'] || homePerf.summary?.grossProfit || { target: 0, accumulated: 0, achievement: '0%' };
              return (
                <div className="space-y-2 select-none">
                  <div className="flex justify-between items-baseline">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-black text-slate-800 font-mono">
                        {Number(grossProfitData.accumulated || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">元</span>
                    </div>
                    <span className="text-xs font-black text-rose-500 font-mono">
                      {grossProfitData.achievement || '0%'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(parseInt(grossProfitData.achievement || '0%') || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">
                    分析主體：{homePerf.sheetName === homePerf.storeName ? `${homePerf.storeName}總表` : `${homePerf.sheetName} (${homePerf.storeName})`}
                  </p>
                </div>
              );
            })() : (
              <div className="py-1 text-[10px] text-slate-400 font-bold select-none">
                ⚠️ 點選以載入當月業績數據或確認 Google Apps Script API 設定。
              </div>
            )}
          </div>
        )}

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
              const canShowDetails = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.store === '全分店';
              if (canShowDetails) {
                setIsStoreTasksModalOpen(true);
              } else {
                setActiveTab('tasks');
              }
            }}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01),0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between h-24 active:scale-95 transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex items-center space-x-1.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs">
                📋
              </div>
              <span className="text-xs font-bold text-gray-500">{getTasksCardTitle()}</span>
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
                        <span>📋 有 {pendingTasksCount} 個{currentUser.store === '電商部' ? '部門' : '店務'}任務未完成</span>
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
      {/* 各分店待辦明細彈窗 */}
      {isStoreTasksModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsStoreTasksModalOpen(false)}>
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-2xl max-w-sm w-full animate-scale-in max-h-[80vh] flex flex-col text-slate-705" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-lg">📊</span>
                <span className="font-black text-sm text-slate-800">各單位待辦任務明細</span>
              </div>
              <button onClick={() => setIsStoreTasksModalOpen(false)} className="text-slate-400 p-1 border rounded-full bg-white hover:bg-slate-100 transition-colors border-none">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2">
              {(() => {
                const pendingMap = getStorePendingTasksMap();
                const activeStores = stores ? stores.filter(s => s !== '全分店') : [];
                
                return activeStores.map(storeName => {
                  const taskCount = pendingMap[storeName] || 0;
                  return (
                    <button
                      key={storeName}
                      onClick={() => {
                        if (setTasksStoreFilter) {
                          setTasksStoreFilter(storeName);
                        }
                        setActiveTab('tasks');
                        setIsStoreTasksModalOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50/40 hover:border-purple-200 transition-all active:scale-98 text-left border-none"
                    >
                      <span className="text-xs font-black text-slate-700">{storeName}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full font-mono ${
                          taskCount > 0 
                            ? 'bg-rose-100 text-rose-600 animate-pulse-subtle' 
                            : 'bg-slate-150 text-slate-400'
                        }`}>
                          {taskCount} 件
                        </span>
                        <span className="text-[10px] text-slate-350">➔</span>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  if (setTasksStoreFilter) {
                    setTasksStoreFilter(currentUser.store !== '全分店' ? currentUser.store : (stores && stores[0]) || '東門店');
                  }
                  setActiveTab('tasks');
                  setIsStoreTasksModalOpen(false);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center space-x-1.5 border-none"
              >
                <span>直接檢視全店任務清單 ➔</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
