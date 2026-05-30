import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Calendar, Coins, Smartphone, 
  Users as UsersIcon, ShieldCheck, HelpCircle, BarChart3, 
  Plus, RefreshCw, AlertCircle, ChevronRight, Sparkles, 
  Target, Info, Flame, Heart, Star, Gift, Loader2,
  LayoutGrid, Layers
} from 'lucide-react';
import { getStorePerformance } from '../services/googleSheetsService';
import { USERS } from '../mockData';
import PerformanceForm from './PerformanceForm';
import ManieIcon from './ManieIcon';

export default function PerformanceBoard({ currentUser, stores }) {
  const [loading, setLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  // 當前選中的項目大類 Tab ('finance', 'hardware', 'wearable', 'accessory', 'social', 'health')
  const [activeTab, setActiveTab] = useState('finance');
  // 雙層導覽狀態：null 為總覽入口，'finance'...'health' 為專屬子分頁
  const [currentSubPage, setCurrentSubPage] = useState(null);
  // 版面視角切換：'portal' 為卡片戰情入口，'tab' 為原本的快捷標籤頁籤模式
  const [viewMode, setViewMode] = useState('tab');

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

  // 取得當前使用者有權限查看的分店清單
  const getAvailableStores = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.storeCodes === 'ALL') {
      return stores ? stores.filter(s => s !== '全分店' && s !== '電商部') : [];
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

  // 狀態管理
  const [selectedStore, setSelectedStore] = useState(() => {
    return availableStores.length > 0 ? availableStores[0] : (currentUser?.store || '東門店');
  });

  // 取得選定分店的人員清單 (支援多店編碼與跨店支援)
  const getStorePeople = (storeName) => {
    // 找出 storeName 對應的 storeCode (例如 "五甲店" -> "8")
    const storeCode = Object.keys(STORE_CODE_MAP).find(key => STORE_CODE_MAP[key] === storeName);
    
    const list = USERS.filter(u => {
      // 1. 如果使用者的主要 store 直接匹配店名
      if (u.store === storeName) return true;
      // 2. 如果使用者的 storeCodes 包含該店編號
      if (storeCode && u.storeCodes) {
        const codes = u.storeCodes.split(',').map(c => c.trim());
        if (codes.includes(storeCode)) return true;
      }
      return false;
    });

    // 過濾出有 sheetName 的同仁，並去除重複
    const filteredList = list.filter(u => u.sheetName);
    const seen = new Set();
    const result = [];
    filteredList.forEach(u => {
      const key = `${u.name}-${u.sheetName}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ name: u.name, sheetName: u.sheetName });
      }
    });

    return result;
  };

  const storePeople = getStorePeople(selectedStore);

  const [selectedSheetName, setSelectedSheetName] = useState(() => {
    const isManager = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER');
    if (isManager) {
      return selectedStore; // 總表分頁名稱與店名相同
    }
    return currentUser?.sheetName || currentUser?.name || selectedStore;
  });

  // 當分店改變時，重置人員選擇與子分頁
  useEffect(() => {
    const isManager = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER');
    if (isManager) {
      setSelectedSheetName(selectedStore);
    } else {
      setSelectedSheetName(currentUser?.sheetName || currentUser?.name || selectedStore);
    }
    setCurrentSubPage(null);
  }, [selectedStore, currentUser]);

  const loadPerf = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getStorePerformance(selectedStore, selectedSheetName, currentUser.role);
      if (data && data.status === 'success') {
        setPerfData(data);
      } else {
        setPerfData(null);
        setErrorMsg(data?.message || '讀取業績失敗，請確認該分頁是否存在。');
      }
    } catch (err) {
      setPerfData(null);
      setErrorMsg('系統連線失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerf();
    setCurrentSubPage(null);
  }, [selectedStore, selectedSheetName]);

  // 1. 動態計算當前時間進度 % 
  const getTimeProgress = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const percent = (currentDay / daysInMonth) * 100;
    return {
      currentDay,
      daysInMonth,
      remainingDays: daysInMonth - currentDay,
      percent: Math.round(percent * 10) / 10 // 四捨五入到小數第一位
    };
  };

  const timeProgress = getTimeProgress();

  // 2. 動態判定紅綠燈狀態
  const getStatusLight = (achievementStr) => {
    const rate = parseFloat(achievementStr) || 0;
    const diff = rate - timeProgress.percent;
    if (diff >= 0) {
      return { light: 'green', text: '業績領先', colorClass: 'bg-emerald-500 text-emerald-50 text-emerald-600 border-emerald-100' };
    } else if (diff >= -12) {
      return { light: 'yellow', text: '持續保持', colorClass: 'bg-amber-500 text-amber-50 text-amber-600 border-amber-100' };
    } else {
      return { light: 'red', text: '需加速衝刺', colorClass: 'bg-rose-500 text-white text-rose-600 border-rose-100' };
    }
  };

  // 3. 計算動態今日日需
  const calculateDailyRequirement = (target, accumulated) => {
    const remainingTarget = target - accumulated;
    if (remainingTarget <= 0) return '已達標 🎉';
    const remainingDays = timeProgress.remainingDays <= 0 ? 1 : timeProgress.remainingDays;
    const req = Math.ceil(remainingTarget / remainingDays);
    return req.toLocaleString();
  };

  // 動態讀取日數據數值，支援新舊鍵向下相容
  const getDailyValue = (dayData, keyName) => {
    if (!dayData) return 0;
    const oldKeysMap = {
      grossProfit: "毛利",
      accessories: "配件營收",
      insurance: "保險營收",
      subscription: "門號",
      customerCount: "來客數"
    };
    
    if (dayData[keyName] !== undefined) {
      return Number(dayData[keyName]) || 0;
    }
    
    const altKey = oldKeysMap[keyName];
    if (altKey && dayData[altKey] !== undefined) {
      return Number(dayData[altKey]) || 0;
    }
    
    for (const k in oldKeysMap) {
      if (oldKeysMap[k] === keyName && dayData[k] !== undefined) {
        return Number(dayData[k]) || 0;
      }
    }
    
    return 0;
  };

  // 生成 SVG 折線圖
  const renderLineChart = (dailyList, keyName, color = '#f43f5e') => {
    if (!dailyList || dailyList.length === 0) return null;
    
    // 過濾有值的資料，動態相容新舊金鑰
    const validData = dailyList.filter(d => getDailyValue(d, keyName) > 0 || d.day <= new Date().getDate());
    const allZero = validData.every(d => getDailyValue(d, keyName) === 0);

    if (allZero) {
      return (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center space-y-2">
          <Info size={20} className="text-slate-350 mx-auto" />
          <div className="text-[10px] text-slate-400 font-bold">當月每日實際數據尚未寫入</div>
        </div>
      );
    }

    const maxVal = Math.max(...validData.map(d => getDailyValue(d, keyName)), 100);
    const minVal = 0;
    const range = maxVal - minVal;

    const width = 360;
    const height = 130;
    const padding = 20;

    const points = validData.map((d, idx) => {
      const x = padding + (idx / (validData.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((getDailyValue(d, keyName) - minVal) / range) * (height - padding * 2);
      return { x, y, day: d.day, val: getDailyValue(d, keyName) };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // 填充區域 D
    const fillD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` 
      : '';

    return (
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-inner-sm space-y-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* 背景輔助水平線 */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            const val = Math.round(maxVal - ratio * range);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f8fafc" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[7.5px] fill-slate-400 font-mono font-bold">{val.toLocaleString()}</text>
              </g>
            );
          })}

          {/* 漸層陰影填充 */}
          {fillD && (
            <path
              d={fillD}
              fill={`url(#gradient-${keyName})`}
              opacity="0.12"
            />
          )}

          {/* 折線 */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_2px_8px_rgba(244,63,94,0.2)]"
          />

          {/* 節點 */}
          {points.map((p, idx) => {
            const showText = idx === 0 || idx === points.length - 1 || p.day === new Date().getDate();
            return (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2.5" />
                {showText && (
                  <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[7.5px] font-black font-mono fill-slate-700 bg-white">
                    {p.day}日:{p.val.toLocaleString()}
                  </text>
                )}
              </g>
            );
          })}

          {/* 漸層定義 */}
          <defs>
            <linearGradient id={`gradient-${keyName}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  // 24 指標項目分類配置 (對應前端的 Tabs 頁籤)
  const TABS_CONFIG = {
    finance: {
      title: '💰 財務來客',
      icon: <Coins size={14} />,
      keys: ['毛利', '配件營收', '來客數'],
      units: { '毛利': '元', '配件營收': '元', '來客數': '人' },
      colors: { '毛利': 'text-amber-500', '配件營收': 'text-sky-500', '來客數': 'text-indigo-500' }
    },
    hardware: {
      title: '📱 手機硬體',
      icon: <Smartphone size={14} />,
      keys: ['蘋果手機', 'VIVO手機', '庫存手機', 'Garmini'],
      units: { '蘋果手機': '台', 'VIVO手機': '台', '庫存手機': '台', 'Garmini': '台' },
      colors: { '蘋果手機': 'text-rose-500', 'VIVO手機': 'text-blue-500', '庫存手機': 'text-purple-500', 'Garmini': 'text-teal-500' }
    },
    wearable: {
      title: '⌚ 穿戴平板',
      icon: <Star size={14} />,
      keys: ['蘋果平板+手錶', '華為穿戴(點數)', 'iPhone組合銷售'],
      units: { '蘋果平板+手錶': '件', '華為穿戴(點數)': '點', 'iPhone組合銷售': '套' },
      colors: { '蘋果平板+手錶': 'text-rose-400', '華為穿戴(點數)': 'text-amber-600', 'iPhone組合銷售': 'text-violet-500' }
    },
    accessory: {
      title: '⚡ 配件專案',
      icon: <Gift size={14} />,
      keys: ['保險營收', '門號', '中嘉寬頻', '橙艾玻璃貼\n(13,14,15,16系列)', 'GPLUS GP-S10吸塵器', 'LiTV開通數'],
      units: { '保險營收': '元', '門號': '門', '中嘉寬頻': '件', '橙艾玻璃貼\n(13,14,15,16系列)': '片', 'GPLUS GP-S10吸塵器': '台', 'LiTV開通數': '件' },
      colors: { '保險營收': 'text-emerald-500', '門號': 'text-rose-500', '中嘉寬頻': 'text-orange-500', '橙艾玻璃貼\n(13,14,15,16系列)': 'text-teal-600', 'GPLUS GP-S10吸塵器': 'text-yellow-600', 'LiTV開通數': 'text-sky-600' }
    },
    social: {
      title: '🎯 行銷社群',
      icon: <UsersIcon size={14} />,
      keys: ['GOOGLE 評論', '社群會員數', '生活圈'],
      units: { 'GOOGLE 評論': '個', '社群會員數': '人', '生活圈': '人' },
      colors: { 'GOOGLE 評論': 'text-green-500', '社群會員數': 'text-cyan-500', '生活圈': 'text-indigo-400' }
    },
    health: {
      title: '🟢 體質指標',
      icon: <Award size={14} />,
      keys: ['遠傳升續率', '遠傳平續率', '遠傳續約累積GAP', '綜合指標'],
      units: { '遠傳升續率': '%', '遠傳平續率': '%', '遠傳續約累積GAP': '元', '綜合指標': '%' },
      colors: { '遠傳升續率': 'text-emerald-600', '遠傳平續率': 'text-teal-600', '遠傳續約累積GAP': 'text-pink-600', '綜合指標': 'text-indigo-600' }
    }
  };

  // 當期主要統計
  const summary = perfData?.summary || {};

  // 取得毛利與配件這兩個最核心指標的達成率（首頁重點字卡使用）
  const getCoreMetricState = (name, titleName) => {
    const metric = summary[name] || { target: 0, accumulated: 0, achievement: '0%' };
    const status = getStatusLight(metric.achievement);
    return {
      name: titleName,
      accumulated: metric.accumulated,
      target: metric.target,
      achievement: metric.achievement,
      status
    };
  };

  const mainMetrics = [
    getCoreMetricState('毛利', '💰 當月毛利實績'),
    getCoreMetricState('配件營收', '⚡ 當月配件實績')
  ];

  // 取得各大類的整體平均達成率
  const getCategoryAvgProgress = (keys, tabId) => {
    if (!summary || Object.keys(summary).length === 0) return 0;
    let totalRate = 0;
    let count = 0;
    keys.forEach(k => {
      const metric = summary[k];
      if (metric) {
        // 體質指標分類的值直接是累計百分比，如 "85%" -> 85
        const rateStr = tabId === 'health' ? metric.accumulated : metric.currentAchievement || '0%';
        const rate = parseFloat(rateStr) || 0;
        totalRate += rate;
        count++;
      }
    });
    return count > 0 ? Math.round(totalRate / count) : 0;
  };

  // === 遊戲化 (RPG) 業績養成卡片計算邏輯 ===
  const getRpgStats = () => {
    const grossProfitMetric = summary['毛利'] || { target: 0, accumulated: 0, achievement: '0%' };
    const achievementPercent = parseFloat(grossProfitMetric.achievement) || 0;
    
    const exp = Math.floor(achievementPercent);
    const level = Math.floor(exp / 10) + 1;
    const nextLevelExp = level * 10;
    const expPercent = nextLevelExp > 0 ? Math.min((exp / nextLevelExp) * 100, 100) : 0;

    // 稱號系統
    let titleText = '🌱 新生';
    if (achievementPercent >= 20 && achievementPercent < 40) titleText = '⚔️ 門市新兵';
    else if (achievementPercent >= 40 && achievementPercent < 60) titleText = '🛡️ 業績衛士';
    else if (achievementPercent >= 60 && achievementPercent < 80) titleText = '🔥 銷售精英';
    else if (achievementPercent >= 80 && achievementPercent < 100) titleText = '⚡ 傳奇獵人';
    else if (achievementPercent >= 100) titleText = '👑 達標大宗師';

    // 冒險對話框 (動態反映業績進度相較於時間基線的狀態)
    const diff = achievementPercent - timeProgress.percent;
    const dialogs = {
      lagging: [
        `😭 勇者，前方的怪物有點強大... 隊伍體力有點不支了！`,
        `⚠️ 警告！發現高難度 Boss，需要同仁們合力施展大絕招！`,
        `☕ 冒險者，要不要在篝火旁休息一下？喝瓶藥水我們再繼續出發！`,
        `🔥 戰火正在蔓延！快點燃你的鬥志，別讓達標寶箱被搶走了！`
      ],
      normal: [
        `⚔️ 冒險者，穩紮穩打！我們正朝著達標深處順利前進！`,
        `🛡️ 盾牌防禦正常！保持這個節奏，本月 Boss 很快就會被擊退！`,
        `✨ 獲得微光祝福！目前的戰鬥節奏相當不錯，繼續維持下去！`,
        `💰 發現哥布林商人！配件加購與門號合約是我們獲取金幣的關鍵！`
      ],
      leading: [
        `🎉 太強了！隊伍正處於狂暴狀態，業績傷害輸出爆表！`,
        `👑 獲得傳奇稱號！您就是這片大陸最強的黃金開單王！`,
        `🌟 聖光普照！滿級裝備已解鎖，本月達標的終極寶藏就在眼前！`,
        `🚀 瞬間移動！我們的達成率已經超越了時間基線，衝啊！`
      ]
    };

    let list = dialogs.normal;
    if (diff < -12) {
      list = dialogs.lagging;
    } else if (diff >= 0) {
      list = dialogs.leading;
    }

    const index = Math.abs(Math.floor(achievementPercent + timeProgress.percent)) % list.length;
    const dialogText = list[index];

    // 判定吉祥物的去背圖 (支援 11 張去背圖片的情境運用)
    let maniePose = 'smile';
    if (diff < -12) {
      // 業績落後時，使用流汗 (sweat) 或睡覺 (sleep) 或托腮煩惱 (thinking)
      const laggingPoses = ['sweat', 'sleep', 'thinking'];
      const poseIdx = Math.abs(Math.floor(achievementPercent + timeProgress.percent)) % laggingPoses.length;
      maniePose = laggingPoses[poseIdx];
    } else if (diff >= 0) {
      // 業績領先時，使用歡呼 (cheer) 或讚賞 (great) 或比讚 (welcome)
      const leadingPoses = ['cheer', 'great', 'welcome'];
      const poseIdx = Math.abs(Math.floor(achievementPercent + timeProgress.percent)) % leadingPoses.length;
      maniePose = leadingPoses[poseIdx];
    } else {
      // 業績保持中，使用精神抖擻叉腰 (idle) 或微笑 (smile)
      const normalPoses = ['idle', 'smile'];
      const poseIdx = Math.abs(Math.floor(achievementPercent + timeProgress.percent)) % normalPoses.length;
      maniePose = normalPoses[poseIdx];
    }

    // 今日分店任務進度
    let completedTasks = 0;
    let totalTasks = 5;
    try {
      const localTasks = JSON.parse(localStorage.getItem('store_mgmt_tasks') || '[]');
      const myStoreTasks = localTasks.filter(t => t.store === selectedStore);
      if (myStoreTasks.length > 0) {
        completedTasks = myStoreTasks.filter(t => t.completed).length;
        totalTasks = myStoreTasks.length;
      }
    } catch (e) {}

    // 本月冒險點數 (毛利實績 / 1000)
    const points = Math.round(Number(grossProfitMetric.accumulated || 0) / 1000);

    // 角色頭像
    let characterAvatar = '🌸';
    if (selectedSheetName !== selectedStore) {
      const matchedUser = USERS.find(u => u.sheetName === selectedSheetName || u.name === selectedSheetName);
      if (matchedUser && matchedUser.avatar) {
        characterAvatar = matchedUser.avatar;
      } else {
        characterAvatar = '👤';
      }
    }

    const charName = selectedSheetName === selectedStore ? `${selectedStore}冒險團` : selectedSheetName;

    return {
      charName,
      exp,
      level,
      nextLevelExp,
      expPercent,
      titleText,
      dialogText,
      completedTasks,
      totalTasks,
      points,
      characterAvatar,
      diff,
      maniePose
    };
  };

  const rpg = getRpgStats();
  const grossProfitMetric = summary['毛利'] || { target: 0, accumulated: 0, achievement: '0%' };

  return (
    <div className="flex-1 flex flex-col pb-24 overflow-y-auto no-scrollbar bg-[#f8fafc] font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部發光導航列 */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner-sm">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 tracking-wide">業績與戰情看板</h1>
            <p className="text-[8px] text-slate-400 font-extrabold">馬尼 (Money) 門市管理系統</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[10px] px-4 py-2 rounded-2xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/25 border-none"
        >
          <Plus size={14} />
          <span>登錄今日業績</span>
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-[600px] mx-auto w-full">
        {/* 1. 遊戲化互動狀態養成卡片 (RPG Status & Gamified Card) */}
        <div className="space-y-3.5 select-none">
          {/* 上半部：Manie 互動氣泡對話框 */}
          <div className="bg-gradient-to-br from-pink-50/70 to-rose-50/70 border border-pink-100 rounded-[28px] p-4 flex items-center space-x-4 shadow-sm">
            {/* 動態表情去背圖 */}
            <div className="w-20 h-20 shrink-0 flex items-center justify-center relative bg-white/50 rounded-full shadow-inner border border-white/60 overflow-hidden p-1">
              <ManieIcon pose={rpg.maniePose} className="w-16 h-16" />
            </div>
            
            {/* 氣泡對話框 */}
            <div className="flex-1 bg-white border border-pink-100/80 rounded-2xl p-3 shadow-inner relative min-h-[70px] flex flex-col justify-center">
              <div className="absolute left-[-6px] top-7 w-3 h-3 bg-white border-l border-b border-pink-100/80 rotate-45"></div>
              <p className="text-[11px] text-slate-700 font-extrabold leading-relaxed">
                {rpg.dialogText}
              </p>
              <div className="text-[7.5px] text-slate-400 font-bold text-right mt-1.5 flex items-center justify-end gap-1">
                <span>本月已過 {timeProgress.percent}%</span>
                <span>·</span>
                <span>剩餘 {timeProgress.remainingDays} 天</span>
              </div>
            </div>
          </div>

          {/* 下半部：店員業績養成卡片 */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-[28px] p-5 text-white shadow-lg relative overflow-hidden border border-rose-400/20 shadow-rose-500/10">
            {/* 背景微光 */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none"></div>

            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-3">
                {/* 角色白底圓形頭像 */}
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg border border-rose-100 shrink-0">
                  {rpg.characterAvatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black tracking-wide">{rpg.charName}</span>
                    <span className="text-[8.5px] bg-white/20 px-2 py-0.5 rounded-full font-black tracking-wider border border-white/10">
                      {rpg.titleText}
                    </span>
                  </div>
                  <p className="text-[7.5px] text-white/70 font-bold mt-0.5">歸屬分店：{selectedStore}</p>
                </div>
              </div>
              
              {/* 等級標籤 */}
              <div className="bg-white text-rose-600 font-extrabold text-[10px] px-3.5 py-1 rounded-xl shadow-md border-none font-mono">
                Lv.{rpg.level}
              </div>
            </div>

            {/* EXP 經驗值進度條 */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-black/15 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full shadow-[0_0_6px_#fde047]" 
                  style={{ width: `${rpg.expPercent}%` }}
                ></div>
                {/* 時間基線標記虛線 */}
                <div 
                  className="absolute top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_3px_#ffffff] opacity-75"
                  style={{ left: `${timeProgress.percent}%` }}
                  title={`本月時間基線: ${timeProgress.percent}%`}
                ></div>
              </div>
              <div className="flex justify-between text-[8px] font-black font-mono text-white/90">
                <span>{rpg.exp} / {rpg.nextLevelExp} 升下一級</span>
                <span>本月毛利達成率：{grossProfitMetric.achievement}</span>
              </div>
            </div>

            {/* 最下方今日進度與本月點數 */}
            <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-[10px] font-black text-white/90 font-mono">
              <div className="flex items-center space-x-1">
                <span>今日任務進度</span>
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[8.5px] font-black">
                  {rpg.completedTasks} / {rpg.totalTasks}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span>本月冒險積分</span>
                <span className="bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-md text-[8.5px] font-bold shadow-sm">
                  {rpg.points.toLocaleString()} 點
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 篩選控制器 */}
        <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-rose-500" />
              戰情維度篩選
            </span>
            <div className="flex items-center space-x-2">
              {/* 藥丸型版面切換器 */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 select-none">
                <button
                  type="button"
                  onClick={() => setViewMode('portal')}
                  className={`flex items-center gap-1 px-2 py-1 text-[8px] font-black rounded-lg transition-all border-none ${
                    viewMode === 'portal'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  <LayoutGrid size={10} />
                  <span>戰情入口</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tab')}
                  className={`flex items-center gap-1 px-2 py-1 text-[8px] font-black rounded-lg transition-all border-none ${
                    viewMode === 'tab'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  <Layers size={10} />
                  <span>快捷標籤</span>
                </button>
              </div>

              <button onClick={loadPerf} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all active:scale-90 border-none bg-transparent">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 分店選擇 */}
            <div>
              <label className="block text-[8px] font-black text-slate-400 mb-1">分店</label>
              {availableStores.length > 1 ? (
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                >
                  {availableStores.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl px-3 py-2 text-xs font-black text-slate-500 select-none">
                  {selectedStore}
                </div>
              )}
            </div>

            {/* 人員選擇 */}
            <div>
              <label className="block text-[8px] font-black text-slate-400 mb-1">人員/總表</label>
              {currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER' ? (
                <select
                  value={selectedSheetName}
                  onChange={(e) => setSelectedSheetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                >
                  <option value={selectedStore}>📊 {selectedStore}總表</option>
                  {storePeople.map(p => (
                    <option key={p.sheetName} value={p.sheetName}>👤 {p.name} ({p.sheetName})</option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl px-3 py-2 text-xs font-black text-slate-500 select-none flex items-center justify-between">
                  <span>{selectedSheetName === selectedStore ? `📊 ${selectedStore}總表` : `👤 ${selectedSheetName}`}</span>
                  {storePeople.length > 0 && selectedSheetName !== selectedStore && (
                    <button
                      onClick={() => setSelectedSheetName(selectedSheetName === currentUser.sheetName ? selectedStore : (currentUser.sheetName || selectedStore))}
                      className="text-[9px] text-rose-500 font-extrabold border-none bg-transparent hover:text-rose-600"
                    >
                      切換總表
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 骨架屏載入狀態 */}
        {loading && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[300px]">
            <Loader2 size={36} className="text-rose-500 animate-spin" />
            <span className="text-xs font-black text-slate-500">正在動態載入馬尼 (Money) 業績報表...</span>
          </div>
        )}

        {/* 錯誤提示 */}
        {!loading && errorMsg && (
          <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 shadow-sm text-center space-y-3">
            <AlertCircle size={32} className="text-rose-500 mx-auto" />
            <h3 className="text-xs font-black text-rose-600">業績讀取異常</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* 業績數據呈現 */}
        {!loading && !errorMsg && perfData && (
          <div className="space-y-5">
            {/* 2. 雙大字發光卡片區 (毛利 & 配件) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mainMetrics.map((m, idx) => {
                const isFirst = idx === 0;
                const percentInt = parseInt(m.achievement) || 0;
                return (
                  <div 
                    key={m.name} 
                    className={`rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden border ${
                      isFirst 
                        ? 'bg-gradient-to-br from-rose-500 to-pink-600 border-rose-400/20 shadow-rose-500/15' 
                        : 'bg-gradient-to-br from-sky-500 to-indigo-600 border-sky-400/20 shadow-sky-500/15'
                    }`}
                  >
                    {/* 背景發光圓圈裝飾 */}
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-white/70 font-bold tracking-wider">{m.name}</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-2xl font-black font-mono tracking-tight">
                            {Number(m.accumulated || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-white/70">/ {Number(m.target || 0).toLocaleString()} 元</span>
                        </div>
                      </div>

                      {/* 預警呼吸燈號 */}
                      <span className={`text-[8px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-sm bg-white backdrop-blur-md ${m.status.colorClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                        {m.status.text}
                      </span>
                    </div>

                    {/* 發光進度條 (內置時間虛線) */}
                    <div className="space-y-1.5 relative">
                      <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden relative">
                        {/* 達成率進度 */}
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-700 relative" 
                          style={{ width: `${Math.min(percentInt, 100)}%` }}
                        ></div>
                        {/* 時間進度指示虛線 */}
                        <div 
                          className="absolute top-0 bottom-0 w-[2px] bg-yellow-300 shadow-[0_0_4px_#fde047]"
                          style={{ left: `${timeProgress.percent}%` }}
                          title={`本月進度: ${timeProgress.percent}%`}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[8px] text-white/80 font-bold font-mono">
                        <span>達成率: {m.achievement}</span>
                        <span>月底預估: {summary[isFirst ? '毛利' : '配件營收']?.achievement || '0%'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. 雙視角版面分流渲染 */}
            {viewMode === 'portal' ? (
              // ==================== 視角一：戰情入口模式 (第二版) ====================
              currentSubPage === null ? (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center space-x-1.5 px-1">
                    <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide">
                      六大核心營運戰情室
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(TABS_CONFIG).map((tabId) => {
                      const tab = TABS_CONFIG[tabId];
                      const avgProgress = getCategoryAvgProgress(tab.keys, tabId);
                      const status = getStatusLight(avgProgress + '%');
                      
                      // 精美漸層配色設定
                      const colors = {
                        finance: 'from-amber-500 to-orange-600 shadow-orange-500/10 hover:shadow-orange-500/25',
                        hardware: 'from-blue-500 to-indigo-600 shadow-blue-500/10 hover:shadow-blue-500/25',
                        wearable: 'from-purple-500 to-fuchsia-600 shadow-purple-500/10 hover:shadow-purple-500/25',
                        accessory: 'from-emerald-500 to-teal-600 shadow-emerald-500/10 hover:shadow-emerald-500/25',
                        social: 'from-rose-500 to-pink-600 shadow-rose-500/10 hover:shadow-rose-500/25',
                        health: 'from-teal-600 to-cyan-700 shadow-teal-600/10 hover:shadow-teal-600/25'
                      }[tabId] || 'from-slate-500 to-slate-600';

                      return (
                        <button
                          key={tabId}
                          onClick={() => setCurrentSubPage(tabId)}
                          className={`w-full text-left rounded-[32px] p-6 text-white bg-gradient-to-br ${colors} border border-white/10 hover:-translate-y-1.5 active:scale-98 transition-all duration-300 relative overflow-hidden group shadow-lg flex flex-col justify-between min-h-[148px]`}
                        >
                          {/* 背景微光裝飾 */}
                          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-xl group-hover:scale-125 transition-transform duration-500"></div>
                          
                          <div className="w-full flex justify-between items-start z-10">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                                {tab.icon}
                              </div>
                              <span className="text-xs font-black tracking-wide">{tab.title}</span>
                            </div>
                            
                            {/* 進度大字與狀態燈 */}
                            <div className="flex items-center space-x-1.5">
                              <span className="text-lg font-black font-mono">{avgProgress}%</span>
                              <span 
                                className={`w-2.5 h-2.5 rounded-full border border-white/20 ${
                                  status.light === 'green' ? 'bg-emerald-400' : status.light === 'yellow' ? 'bg-amber-300' : 'bg-rose-400'
                                } animate-pulse`}
                              />
                            </div>
                          </div>

                          {/* 中段進度條 */}
                          <div className="w-full mt-4 z-10">
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(avgProgress, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[7.5px] text-white/80 font-bold mt-1.5">
                              <span>整體進度</span>
                              <span>{status.text}</span>
                            </div>
                          </div>

                          {/* 底部指標清單 */}
                          <div className="w-full mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between z-10">
                            <span className="text-[7.5px] text-white/70 truncate max-w-[85%] font-bold">
                              包含: {tab.keys.map(k => k.replace('\n', '')).join('、')}
                            </span>
                            <ChevronRight size={12} className="text-white/70 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 返回總覽導航列 */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <button
                      onClick={() => setCurrentSubPage(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-150 text-slate-700 font-extrabold text-[10px] active:scale-95 transition-all border-none"
                    >
                      ← 返回業績總覽
                    </button>
                    <span className="text-[10px] font-black text-slate-500 flex items-center gap-1.5">
                      {TABS_CONFIG[currentSubPage].title} 專屬戰情室
                    </span>
                  </div>

                  {/* 指標卡片 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {TABS_CONFIG[currentSubPage].keys.map((key) => {
                      const metric = summary[key] || { target: 0, accumulated: 0, achievement: '0%', currentAchievement: '0%' };
                      const isHealthTab = currentSubPage === 'health';
                      
                      const rateStr = isHealthTab ? metric.accumulated + '%' : metric.currentAchievement || '0%';
                      const status = getStatusLight(rateStr);
                      const unit = TABS_CONFIG[currentSubPage].units[key] || '';
                      const colorClass = TABS_CONFIG[currentSubPage].colors[key] || 'text-slate-600';

                      return (
                        <div 
                          key={key} 
                          className="bg-white p-4.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[128px] hover:shadow-md transition-all duration-300 relative group"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform">
                                <Target size={14} className={colorClass} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-700 leading-tight">
                                  {key.replace('\n', ' ')}
                                </span>
                                <span className="text-[7.5px] text-slate-400 font-bold mt-0.5">
                                  目標: {isHealthTab ? '達成標準' : Number(metric.target || 0).toLocaleString()} {unit}
                                </span>
                              </div>
                            </div>

                            <span 
                              className={`w-2.5 h-2.5 rounded-full border border-white shadow-[0_0_6px_rgba(0,0,0,0.05)] ${
                                status.light === 'green' 
                                  ? 'bg-emerald-500 shadow-emerald-500/40' 
                                  : status.light === 'yellow' 
                                  ? 'bg-amber-500 shadow-amber-500/40' 
                                  : 'bg-rose-500 shadow-rose-500/40'
                              } animate-pulse`}
                              title={status.text}
                            />
                          </div>

                          <div className="mt-3 space-y-1">
                            <div className="flex items-baseline space-x-0.5">
                              <span className="text-xl font-black text-slate-800 font-mono tracking-tight">
                                {isHealthTab ? (Number(metric.accumulated) || 0).toLocaleString() : Number(metric.accumulated || 0).toLocaleString()}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold">{unit}</span>
                            </div>

                            <div className="flex justify-between items-center text-[8.5px] font-bold mt-1 text-slate-400">
                              {isHealthTab ? (
                                <span>燈號指標: {status.text}</span>
                              ) : (
                                <span>今日日需求: <strong className="text-slate-600 font-black">{calculateDailyRequirement(metric.target, metric.accumulated)}</strong></span>
                              )}
                              <div className="flex items-center space-x-1">
                                <span className="text-[7.5px] text-slate-350">目前達成:</span>
                                <span className={`font-mono font-black ${
                                  status.light === 'green' ? 'text-emerald-600' : status.light === 'yellow' ? 'text-amber-500' : 'text-rose-500'
                                }`}>
                                  {isHealthTab ? metric.accumulated + '%' : metric.currentAchievement || '0%'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 專屬趨勢折線圖 */}
                  <div className="space-y-4 pt-2">
                    {currentSubPage === 'finance' && (
                      <>
                        <div className="flex items-center space-x-1.5 px-1">
                          <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 tracking-wide">
                            本月毛利日累計趨勢 (元)
                          </h3>
                        </div>
                        {renderLineChart(perfData?.daily, 'grossProfit', '#f43f5e')}

                        <div className="flex items-center space-x-1.5 px-1 pt-2">
                          <div className="w-1.5 h-4 bg-sky-500 rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 tracking-wide">
                            本月配件日累計趨勢 (元)
                          </h3>
                        </div>
                        {renderLineChart(perfData?.daily, 'accessories', '#0284c7')}
                      </>
                    )}

                    {currentSubPage === 'hardware' && (
                      <>
                        <div className="flex items-center space-x-1.5 px-1">
                          <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 tracking-wide">
                            本月蘋果手機銷量日趨勢 (台)
                          </h3>
                        </div>
                        {renderLineChart(perfData?.daily, '蘋果手機', '#f43f5e')}
                      </>
                    )}

                    {currentSubPage === 'accessory' && (
                      <>
                        <div className="flex items-center space-x-1.5 px-1">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 tracking-wide">
                            本月門號日開通趨勢 (門)
                          </h3>
                        </div>
                        {renderLineChart(perfData?.daily, '門號', '#10b981')}
                      </>
                    )}

                    {currentSubPage === 'social' && (
                      <>
                        <div className="flex items-center space-x-1.5 px-1">
                          <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                          <h3 className="text-xs font-black text-slate-800 tracking-wide">
                            本月 Google 評論日趨勢 (個)
                          </h3>
                        </div>
                        {renderLineChart(perfData?.daily, 'GOOGLE 評論', '#22c55e')}
                      </>
                    )}
                  </div>
                </div>
              )
            ) : (
              // ==================== 視角二：快捷標籤模式 (第一版) ====================
              <div className="space-y-5">
                {/* 24 指標分類 Tab 頁籤 */}
                <div className="bg-white rounded-[32px] p-2.5 shadow-sm border border-slate-100 flex items-center justify-between overflow-x-auto gap-1.5 no-scrollbar sticky top-[68px] z-10 shrink-0">
                  {Object.keys(TABS_CONFIG).map((tabId) => {
                    const tab = TABS_CONFIG[tabId];
                    const isActive = activeTab === tabId;
                    return (
                      <button
                        key={tabId}
                        onClick={() => setActiveTab(tabId)}
                        className={`flex items-center space-x-1 px-3 py-2 text-[10px] font-black rounded-2xl transition-all border-none shrink-0 ${
                          isActive 
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 active:scale-95' 
                            : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100/70'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab 內容卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in">
                  {TABS_CONFIG[activeTab].keys.map((key) => {
                    const metric = summary[key] || { target: 0, accumulated: 0, achievement: '0%', currentAchievement: '0%' };
                    const isHealthTab = activeTab === 'health';
                    
                    const rateStr = isHealthTab ? metric.accumulated + '%' : metric.currentAchievement || '0%';
                    const status = getStatusLight(rateStr);
                    const unit = TABS_CONFIG[activeTab].units[key] || '';
                    const colorClass = TABS_CONFIG[activeTab].colors[key] || 'text-slate-600';

                    return (
                      <div 
                        key={key} 
                        className="bg-white p-4.5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[128px] hover:shadow-md transition-all duration-300 relative group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-transform">
                              <Target size={14} className={colorClass} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-700 leading-tight">
                                {key.replace('\n', ' ')}
                              </span>
                              <span className="text-[7.5px] text-slate-400 font-bold mt-0.5">
                                目標: {isHealthTab ? '達成標準' : Number(metric.target || 0).toLocaleString()} {unit}
                              </span>
                            </div>
                          </div>

                          <span 
                            className={`w-2.5 h-2.5 rounded-full border border-white shadow-[0_0_6px_rgba(0,0,0,0.05)] ${
                              status.light === 'green' 
                                ? 'bg-emerald-500 shadow-emerald-500/40' 
                                : status.light === 'yellow' 
                                ? 'bg-amber-500 shadow-amber-500/40' 
                                : 'bg-rose-500 shadow-rose-500/40'
                            } animate-pulse`}
                            title={status.text}
                          />
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="flex items-baseline space-x-0.5">
                            <span className="text-xl font-black text-slate-800 font-mono tracking-tight">
                              {isHealthTab ? (Number(metric.accumulated) || 0).toLocaleString() : Number(metric.accumulated || 0).toLocaleString()}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold">{unit}</span>
                          </div>

                          <div className="flex justify-between items-center text-[8.5px] font-bold mt-1 text-slate-400">
                            {isHealthTab ? (
                              <span>燈號指標: {status.text}</span>
                            ) : (
                              <span>今日日需求: <strong className="text-slate-600 font-black">{calculateDailyRequirement(metric.target, metric.accumulated)}</strong></span>
                            )}
                            <div className="flex items-center space-x-1">
                              <span className="text-[7.5px] text-slate-350">目前達成:</span>
                              <span className={`font-mono font-black ${
                                status.light === 'green' ? 'text-emerald-600' : status.light === 'yellow' ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                {isHealthTab ? metric.accumulated + '%' : metric.currentAchievement || '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 統一折線圖 */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center space-x-1.5 px-1">
                    <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide">
                      本月毛利日累計趨勢 (元)
                    </h3>
                  </div>
                  {renderLineChart(perfData?.daily, 'grossProfit', '#f43f5e')}

                  <div className="flex items-center space-x-1.5 px-1 pt-2">
                    <div className="w-1.5 h-4 bg-sky-500 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-800 tracking-wide">
                      本月配件日累計趨勢 (元)
                    </h3>
                  </div>
                  {renderLineChart(perfData?.daily, 'accessories', '#0284c7')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 登錄彈表 */}
      {showForm && (
        <PerformanceForm
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onRefreshData={loadPerf}
        />
      )}
    </div>
  );
}
