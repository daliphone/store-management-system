import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Award, Calendar, Coins, Smartphone, 
  Users as UsersIcon, ShieldCheck, HelpCircle, BarChart3, 
  Plus, RefreshCw, AlertCircle, ChevronRight, Sparkles, 
  Target, Info, Flame, Heart, Star, Gift, Loader2,
  LayoutGrid, Layers
} from 'lucide-react';
import { getStorePerformance, getStoreItemsConfig, buyStoreItem, useInventoryItem, checkPetEvolution, renamePet } from '../services/googleSheetsService';
import { USERS } from '../mockData';
import PerformanceForm from './PerformanceForm';
import ManieIcon from './ManieIcon';

export default function PerformanceBoard({ currentUser, stores, petStats, mCoins, refreshPetStats }) {
  const [loading, setLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  // 數位寵物商店與背包控制狀態
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState('shop'); // 'shop' 或 'inventory'
  const [actionLoading, setActionLoading] = useState(false);
  const [showPetRoom, setShowPetRoom] = useState(true);
  const [acquiredItem, setAcquiredItem] = useState(null);

  // 數位寵物相關資料解構與預設值
  const pet = petStats?.pet || {
    name: '數據卵',
    level: 1,
    hp: 100,
    xp: 0,
    petId: 'egg_driver',
    status: '孵化中',
    nextEvolutionTime: Date.now() + 86400000,
    pp_points: 0,
    battles: 0,
    sheetName: currentUser?.sheetName || currentUser?.name || ''
  };

  const coins = mCoins !== undefined ? mCoins : (petStats?.mCoins || 0);

  // 屬性計算與 Buff
  const finalAttributes = petStats?.attributes || {
    STR: 10,
    CON: 10,
    INT: 10,
    PER: 10
  };

  // 當前選中的項目大類 Tab ('finance', 'hardware', 'wearable', 'accessory', 'social', 'health')
  const [activeTab, setActiveTab] = useState('finance');
  // 雙層導覽狀態：null 為總覽入口，'finance'...'health' 為專屬子分頁
  const [currentSubPage, setCurrentSubPage] = useState(null);
  // 版面視角切換：'portal' 為卡片戰情入口，'tab' 為原本的快捷標籤頁籤模式
  const [viewMode, setViewMode] = useState('tab');

  // 業績看板吉祥物點擊動態
  const [manieClickPose, setManieClickPose] = useState(null);
  const [isBouncing, setIsBouncing] = useState(false);

  const handleManieClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);
    const poses = ['welcome', 'idle', 'sleep', 'cheer', 'gift', 'smile', 'sweat', 'fun', 'great'];
    const randomPose = poses[Math.floor(Math.random() * poses.length)];
    setManieClickPose(randomPose);
    const settingGroup = localStorage.getItem('manie_avatar_group') || 'random';
    if (settingGroup === 'random') {
      window.dispatchEvent(new Event('manie_group_changed'));
    }
  };

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
    window.isPerformanceSubPageOpen = false;
  }, [selectedStore, currentUser]);

  // 監聽手機端的返回鍵 (Browser Back / Gesture Back) 導覽優化
  useEffect(() => {
    const handlePopState = (e) => {
      if (currentSubPage !== null) {
        setCurrentSubPage(null);
        window.isPerformanceSubPageOpen = false;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentSubPage]);

  const handleEnterSubPage = (subPageId) => {
    setCurrentSubPage(subPageId);
    window.isPerformanceSubPageOpen = true;
    window.history.pushState({ isSubPage: true }, "");
  };

  const handleBackToOverview = () => {
    setCurrentSubPage(null);
    window.isPerformanceSubPageOpen = false;
    if (window.history.state?.isSubPage) {
      window.history.back();
    }
  };

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

  const handleBuy = async (itemId) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const result = await buyStoreItem(currentUser.name, itemId);
      if (result.status === 'success') {
        const config = getStoreItemsConfig();
        const item = config[itemId];
        if (item) {
          setAcquiredItem({
            name: item.name,
            desc: item.desc,
            type: item.type,
            stats: item.stats,
            itemId: itemId,
            titleText: '🛒 購買成功！'
          });
        }
        if (refreshPetStats) await refreshPetStats();
      } else {
        alert(result.message || '購買失敗');
      }
    } catch (e) {
      alert('網路連線失敗，請重試');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUse = async (itemId, isEquip) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const result = await useInventoryItem(currentUser.name, itemId, isEquip);
      if (result.status === 'success') {
        const config = getStoreItemsConfig();
        const rolledItemId = result.rolledItemId;
        if (rolledItemId) {
          const item = config[rolledItemId];
          if (item) {
            setAcquiredItem({
              name: item.name,
              desc: item.desc,
              type: item.type,
              stats: item.stats,
              itemId: rolledItemId,
              titleText: '🎁 盲盒開箱成功！'
            });
          }
        } else if (result.message && !isEquip) {
          alert(result.message);
        }
        if (refreshPetStats) await refreshPetStats();
      } else {
        alert(result.message || '操作失敗');
      }
    } catch (e) {
      alert('網路連線失敗，請重試');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvolve = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const result = await checkPetEvolution(currentUser.name);
      if (result.status === 'success') {
        alert(`🎉 恭喜！進化成功！您的寵物已演化為：${result.pet.name}！`);
        if (refreshPetStats) await refreshPetStats();
      } else {
        alert(result.message || '進化失敗');
      }
    } catch (e) {
      alert('網路連線失敗，請重試');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async () => {
    if (actionLoading) return;
    const currentName = pet.name || '數碼蛋';
    const newName = prompt(`請輸入您的數位寵物新暱稱：\n(當前名稱：${currentName})`, currentName);
    if (newName === null) return;
    if (newName.trim() === '') {
      alert('寵物暱稱不能為空！');
      return;
    }
    setActionLoading(true);
    try {
      const result = await renamePet(currentUser.name, newName);
      if (result.status === 'success') {
        alert(`🎉 成功將寵物命名為「${newName.trim()}」！`);
        if (refreshPetStats) await refreshPetStats();
      } else {
        alert(result.message || '改名失敗');
      }
    } catch (e) {
      alert('網路連線失敗，請重試');
    } finally {
      setActionLoading(false);
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

    // 依據同仁名字的雜湊值，隨機分配 2D 經典款或 3D 立體公仔款！
    let avatarGroup = 'classic';
    if (charName) {
      let hash = 0;
      for (let i = 0; i < charName.length; i++) {
        hash = charName.charCodeAt(i) + ((hash << 5) - hash);
      }
      avatarGroup = Math.abs(hash) % 2 === 0 ? 'classic' : 'figurine';
    }

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
      maniePose,
      avatarGroup
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
            <p className="text-[10px] text-slate-400 font-extrabold">馬尼 (Money) 門市管理系統</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-4 py-2 rounded-2xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/25 border-none"
        >
          <Plus size={14} />
          <span>登錄今日業績</span>
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-[600px] mx-auto w-full">
        {/* 1. 遊戲化互動狀態養成卡片 (RPG Status & Gamified Card) */}
        <div className="space-y-3.5 select-none">
          {showPetRoom ? (
            // ==================== 新版：數位寵物發光育成戰情室 ====================
            <div className={`rounded-[32px] p-5 shadow-lg relative overflow-hidden border transition-all duration-500 ${
              pet.petId.includes("driver")
                ? "bg-gradient-to-br from-rose-50 to-orange-50/90 text-slate-800 border-rose-100 shadow-rose-500/5"
                : pet.petId.includes("guardian")
                ? "bg-gradient-to-br from-blue-50 to-sky-50/90 text-slate-800 border-blue-100 shadow-blue-500/5"
                : pet.petId.includes("pioneer")
                ? "bg-gradient-to-br from-purple-50 to-fuchsia-50/90 text-slate-800 border-purple-100 shadow-purple-500/5"
                : pet.petId.includes("integrator")
                ? "bg-gradient-to-br from-emerald-50 to-teal-50/90 text-slate-800 border-emerald-100 shadow-emerald-500/5"
                : "bg-gradient-to-br from-slate-50 to-zinc-100/90 text-slate-800 border-slate-200 shadow-slate-900/5"
            }`}>
              {/* 背景微光 */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/40 blur-xl pointer-events-none"></div>

              {/* 頂部名稱與商城按鈕 */}
              <div className="flex justify-between items-start mb-3.5">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-white/60 backdrop-blur-md shadow-inner flex items-center justify-center text-xl shrink-0 relative overflow-hidden border border-slate-200/50">
                    <ManieIcon 
                      pose={
                        pet.hp <= 0 
                          ? "sweat" 
                          : pet.status === "孵化中" 
                          ? "sleep" 
                          : pet.level >= 5 
                          ? "great" 
                          : "idle"
                      } 
                      group="auto" 
                      className="w-10 h-10" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 group/name cursor-pointer select-none" onClick={handleRename} title="點擊為寵物命名">
                        <span className="text-base font-black tracking-wide text-slate-800 hover:underline decoration-slate-400 decoration-dashed">{pet.name}</span>
                        <span className="text-xs opacity-75 group-hover/name:opacity-100 transition-opacity">🖊️</span>
                      </div>
                      <span className="text-xs bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-black tracking-wider border border-slate-300/30 scale-95">
                        {pet.level === 1 ? "數據卵" : pet.level === 2 ? "萌芽體" : pet.level === 3 ? "幼生體" : pet.level === 4 ? "雛形體" : pet.level === 5 ? "成熟體" : pet.level === 6 ? "完全體" : "究極體"} (Stage {pet.level})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-extrabold mt-0.5">同仁夥伴：{pet.sheetName}</p>
                  </div>
                </div>

                {/* 道具商店按鈕 */}
                <button
                  onClick={() => setStoreOpen(true)}
                  className="bg-white hover:bg-slate-50 shadow-sm text-slate-850 font-extrabold text-xs px-3.5 py-1.5 rounded-xl border border-slate-200/70 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Coins size={12} className="text-yellow-500 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>🪙 {coins} | 商店背包</span>
                </button>
              </div>

              {/* HP 與 XP 狀態條 */}
              <div className="space-y-2.5">
                {/* HP 條 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-black text-slate-800">
                    <span>❤️ 生命值 HP</span>
                    <span>{pet.hp} / 100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/30 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pet.hp > 50 ? "bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_4px_rgba(52,211,153,0.3)]" : pet.hp > 20 ? "bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_4px_rgba(251,191,36,0.3)]" : "bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_4px_rgba(244,63,94,0.5)] animate-pulse"
                      }`}
                      style={{ width: `${pet.hp}%` }}
                    ></div>
                  </div>
                </div>

                {/* XP 經驗值條 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-black text-slate-800">
                    <span>✨ 經驗值 XP</span>
                    <span>{pet.xp} / {Math.round(100 * Math.pow(pet.level, 1.5))}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden border border-slate-200/30 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (pet.xp / (100 * Math.pow(pet.level, 1.5))) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* 四大屬性面板 */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-slate-200/50">
                <div className="bg-white/60 rounded-xl p-1.5 text-center border border-slate-200/40 shadow-xs">
                  <div className="text-[10px] text-slate-600 font-black">STR 力量</div>
                  <div className="text-xs font-black font-mono mt-0.5 text-amber-600">⚔️ {finalAttributes.STR}</div>
                </div>
                <div className="bg-white/60 rounded-xl p-1.5 text-center border border-slate-200/40 shadow-xs">
                  <div className="text-[10px] text-slate-600 font-black">CON 體質</div>
                  <div className="text-xs font-black font-mono mt-0.5 text-sky-600">🛡️ {finalAttributes.CON}</div>
                </div>
                <div className="bg-white/60 rounded-xl p-1.5 text-center border border-slate-200/40 shadow-xs">
                  <div className="text-[10px] text-slate-600 font-black">INT 智力</div>
                  <div className="text-xs font-black font-mono mt-0.5 text-emerald-600">🎓 {finalAttributes.INT}</div>
                </div>
                <div className="bg-white/60 rounded-xl p-1.5 text-center border border-slate-200/40 shadow-xs">
                  <div className="text-[10px] text-slate-600 font-black">PER 感知</div>
                  <div className="text-xs font-black font-mono mt-0.5 text-purple-600">🔍 {finalAttributes.PER}</div>
                </div>
              </div>

              {/* 進化計時器或進化按鈕 */}
              {pet.level < 7 && (
                <div className="mt-3.5 pt-2 flex justify-between items-center text-[10px] font-black text-slate-500 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span>培育積分: {pet.pp_points || pet.PP || 0} PP</span>
                    <span>·</span>
                    <span>挑戰次數: {pet.battles || 0}</span>
                  </div>
                  
                  {Date.now() >= pet.nextEvolutionTime ? (
                    <button
                      onClick={handleEvolve}
                      className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-[10px] font-extrabold px-3 py-1.5 rounded-xl border-none shadow-md shadow-yellow-400/20 animate-pulse active:scale-95 transition-all"
                    >
                      ⚡ 立即進化 (Evolve)
                    </button>
                  ) : (
                    <span className="text-amber-600 font-black">
                      ⏳ 進化蓄能中 (還剩 {((pet.nextEvolutionTime - Date.now()) / (3600 * 1000)).toFixed(1)}h)
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            // ==================== 舊版：原本的業績模擬 RPG 卡片 ====================
            <>
              {/* 上半部：Manie 互動氣泡對話框 */}
              <div className="bg-gradient-to-br from-pink-50/70 to-rose-50/70 border border-pink-100 rounded-[28px] p-4 flex items-center space-x-4 shadow-sm">
                <div 
                  onClick={handleManieClick}
                  className={`w-20 h-20 shrink-0 flex items-center justify-center relative bg-white/50 rounded-full shadow-inner border border-white/60 overflow-hidden p-1 cursor-pointer transition-all duration-300 ${
                    isBouncing ? 'scale-110 -translate-y-1' : 'hover:scale-105 active:scale-95'
                  }`}
                  title="點我互動！"
                >
                  <ManieIcon pose={manieClickPose || rpg.maniePose} group="auto" className="w-16 h-16" />
                </div>
                
                <div className="flex-1 bg-white border border-pink-100/80 rounded-2xl p-3 shadow-inner relative min-h-[70px] flex flex-col justify-center">
                  <div className="absolute left-[-6px] top-7 w-3 h-3 bg-white border-l border-b border-pink-100/80 rotate-45"></div>
                  <p className="text-xs text-slate-700 font-extrabold leading-relaxed">
                    {rpg.dialogText}
                  </p>
                  <div className="text-[10px] text-slate-400 font-bold text-right mt-1.5 flex items-center justify-end gap-1">
                    <span>本月已過 {timeProgress.percent}%</span>
                    <span>·</span>
                    <span>剩餘 {timeProgress.remainingDays} 天</span>
                  </div>
                </div>
              </div>

              {/* 下半部：店員業績養成卡片 */}
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-[28px] p-5 text-white shadow-lg relative overflow-hidden border border-rose-400/20 shadow-rose-500/10">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none"></div>

                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg border border-rose-100 shrink-0">
                      {rpg.characterAvatar}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black tracking-wide">{rpg.charName}</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black tracking-wider border border-white/10">
                          {rpg.titleText}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/70 font-bold mt-0.5">歸屬分店：{selectedStore}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white text-rose-600 font-extrabold text-xs px-3.5 py-1 rounded-xl shadow-md border-none font-mono">
                    Lv.{rpg.level}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-2.5 bg-black/15 rounded-full overflow-hidden border border-white/5 relative">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full shadow-[0_0_6px_#fde047]" 
                      style={{ width: `${rpg.expPercent}%` }}
                    ></div>
                    <div 
                      className="absolute top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_3px_#ffffff] opacity-75"
                      style={{ left: `${timeProgress.percent}%` }}
                      title={`本月時間基線: ${timeProgress.percent}%`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black font-mono text-white/90">
                    <span>{rpg.exp} / {rpg.nextLevelExp} 升下一級</span>
                    <span>本月毛利達成率：{grossProfitMetric.achievement}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-xs font-black text-white/90 font-mono">
                  <div className="flex items-center space-x-1">
                    <span>今日任務進度</span>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-black">
                      {rpg.completedTasks} / {rpg.totalTasks}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>本月冒險積分</span>
                    <span className="bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                      {rpg.points.toLocaleString()} 點
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 篩選控制器 */}
        <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-xs font-black text-slate-400 flex items-center gap-1">
              <Sparkles size={12} className="text-rose-500" />
              戰情維度篩選
            </span>
            <div className="flex items-center space-x-2">
              {/* 藥丸型版面切換器 */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 select-none">
                <button
                  type="button"
                  onClick={() => setViewMode('portal')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg transition-all border-none ${
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
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg transition-all border-none ${
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
              <label className="block text-xs font-black text-slate-400 mb-1">分店</label>
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
              <label className="block text-xs font-black text-slate-400 mb-1">人員/總表</label>
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
                      className="text-xs text-rose-500 font-extrabold border-none bg-transparent hover:text-rose-600"
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
                        <span className="text-xs text-white/80 font-bold tracking-wider">{m.name}</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-3xl font-black font-mono tracking-tight">
                            {Number(m.accumulated || 0).toLocaleString()}
                          </span>
                          <span className="text-xs text-white/75">/ {Number(m.target || 0).toLocaleString()} 元</span>
                        </div>
                      </div>

                      {/* 預警呼吸燈號 */}
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full border flex items-center gap-1.5 shadow-sm bg-white backdrop-blur-md ${m.status.colorClass}`}>
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
                      <div className="flex justify-between text-xs text-white/95 font-bold font-mono">
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
                          onClick={() => handleEnterSubPage(tabId)}
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
                            <div className="flex justify-between items-center text-xs text-white/90 font-bold mt-1.5">
                              <span>整體進度</span>
                              <span>{status.text}</span>
                            </div>
                          </div>

                          {/* 底部指標清單 */}
                          <div className="w-full mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between z-10">
                            <span className="text-xs text-white/80 truncate max-w-[85%] font-bold">
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
                      onClick={() => handleBackToOverview()}
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
                                <span className="text-sm font-black text-slate-700 leading-tight">
                                  {key.replace('\n', ' ')}
                                </span>
                                <span className="text-xs text-slate-400 font-bold mt-0.5">
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
                              <span className="text-xs text-slate-400 font-bold">{unit}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs font-bold mt-1 text-slate-400">
                              {isHealthTab ? (
                                <span>燈號指標: {status.text}</span>
                              ) : (
                                <span>今日日需求: <strong className="text-slate-600 font-black">{calculateDailyRequirement(metric.target, metric.accumulated)}</strong></span>
                              )}
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-slate-400">目前達成:</span>
                                <span className={`text-xs font-mono font-black ${
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
                        className={`flex items-center space-x-1 px-3 py-2 text-xs font-black rounded-2xl transition-all border-none shrink-0 ${
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
                              <span className="text-sm font-black text-slate-700 leading-tight">
                                {key.replace('\n', ' ')}
                              </span>
                              <span className="text-xs text-slate-400 font-bold mt-0.5">
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
                            <span className="text-xs text-slate-400 font-bold">{unit}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs font-bold mt-1 text-slate-400">
                            {isHealthTab ? (
                              <span>燈號指標: {status.text}</span>
                            ) : (
                              <span>今日日需求: <strong className="text-slate-600 font-black">{calculateDailyRequirement(metric.target, metric.accumulated)}</strong></span>
                            )}
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-slate-400">目前達成:</span>
                              <span className={`text-xs font-mono font-black ${
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

      {/* 道具商店與同仁背包抽屜 */}
      {storeOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          {/* 點擊背景關閉 */}
          <div className="absolute inset-0" onClick={() => setStoreOpen(false)}></div>
          
          {/* 抽屜本體 */}
          <div className="relative w-full max-w-md h-full bg-white/95 backdrop-blur-md shadow-2xl flex flex-col animate-slide-in border-l border-slate-100">
            {/* 抽屜頭部 */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-600 shadow-inner">
                  <Coins size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">馬尼道具鋪 & 背包</h2>
                  <p className="text-xs text-slate-550 font-extrabold">培育積分與裝備強化</p>
                </div>
              </div>
              <button
                onClick={() => setStoreOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center border-none transition-all active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* M幣餘額與頁籤切換 */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setStoreTab('shop')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all border-none ${
                    storeTab === 'shop'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  🛒 道具商品
                </button>
                <button
                  type="button"
                  onClick={() => setStoreTab('inventory')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all border-none ${
                    storeTab === 'inventory'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  🎒 同仁背包
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-1 flex items-center gap-1.5">
                <span className="text-xs text-yellow-600">🪙</span>
                <span className="text-xs font-mono font-black text-yellow-700">{coins} <span className="text-xs font-bold text-yellow-600/80">M幣</span></span>
              </div>
            </div>

            {/* 內容區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar relative">
              {actionLoading && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10 space-y-2">
                  <Loader2 className="text-rose-500 animate-spin" size={28} />
                  <span className="text-xs font-black text-slate-650">同步至 Google Sheets 中...</span>
                </div>
              )}

              {storeTab === 'shop' ? (
                // 商店商品列表
                <div className="space-y-4">
                  {/* 消耗品區 */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-500 tracking-wider flex items-center gap-1">
                      🧪 消耗性補給品 ({Object.values(getStoreItemsConfig()).filter(i => i.type === 'consumable').length}款)
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Object.values(getStoreItemsConfig())
                        .filter(i => i.type === 'consumable')
                        .map(item => (
                          <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:bg-slate-100/55 transition-all">
                            <div className="space-y-1 pr-2 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-black text-slate-800">{item.name}</span>
                                {item.price >= 100 && (
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black border border-amber-200">珍貴</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleBuy(item.id)}
                              disabled={coins < item.price || actionLoading}
                              className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
                                coins >= item.price
                                  ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-none shadow-sm'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <span>🪙 {item.price}</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 裝備區 */}
                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-black text-slate-500 tracking-wider flex items-center gap-1">
                      🛡️ 屬性強化裝備 ({Object.values(getStoreItemsConfig()).filter(i => i.type === 'equip').length}款)
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {Object.values(getStoreItemsConfig())
                        .filter(i => i.type === 'equip')
                        .map(item => (
                          <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:bg-slate-100/55 transition-all">
                            <div className="space-y-1 pr-2 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-black text-slate-800">{item.name}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-black border border-blue-100">
                                  {Object.entries(item.stats).map(([k, v]) => `${k}+${v}`).join(', ')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => handleBuy(item.id)}
                              disabled={coins < item.price || actionLoading}
                              className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
                                coins >= item.price
                                  ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-none shadow-sm'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <span>🪙 {item.price}</span>
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                // 玩家背包列表
                <div className="space-y-3">
                  {(!petStats?.inventory || petStats.inventory.filter(i => i.count > 0 || i.isEquipped).length === 0) ? (
                    <div className="py-12 text-center space-y-2">
                      <div className="text-3xl">🎒</div>
                      <div className="text-sm font-black text-slate-500">您的背包空空如也</div>
                      <p className="text-xs text-slate-550 font-bold">前往道具商品頁面，使用 M幣 購買道具吧！</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {petStats.inventory
                        .filter(i => i.count > 0 || i.isEquipped)
                        .map(invItem => {
                          const config = getStoreItemsConfig();
                          const item = config[invItem.itemId];
                          if (!item) return null;
                          return (
                            <div key={invItem.itemId} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center hover:bg-slate-100/55 transition-all">
                              <div className="space-y-1 flex-1 pr-2">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs font-black text-slate-800">{item.name}</span>
                                  {item.type === 'equip' ? (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black border ${
                                      invItem.isEquipped
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                      {invItem.isEquipped ? '已穿戴' : '未穿戴'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black border border-slate-200">
                                      數量: {invItem.count}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                              </div>

                              <div className="shrink-0 flex items-center space-x-2">
                                {item.type === 'consumable' ? (
                                  <button
                                    onClick={() => handleUse(item.id, false)}
                                    disabled={invItem.count <= 0 || actionLoading}
                                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-xl border-none shadow-sm active:scale-95 transition-all"
                                  >
                                    使用
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUse(item.id, !invItem.isEquipped)}
                                    disabled={actionLoading}
                                    className={`text-xs font-black px-3.5 py-1.5 rounded-xl border transition-all active:scale-95 ${
                                      invItem.isEquipped
                                        ? 'bg-slate-200 hover:bg-slate-350 text-slate-700 border-none'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm'
                                    }`}
                                  >
                                    {invItem.isEquipped ? '卸下' : '穿戴'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎁 獲得道具/開箱入手華麗特效 Modal */}
      {acquiredItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in select-none">
          {/* 金色粒子/光芒射線背景 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[conic-gradient(from_0deg,transparent_0%,rgba(245,158,11,0.18)_15%,transparent_30%,rgba(245,158,11,0.18)_45%,transparent_60%,rgba(245,158,11,0.18)_75%,transparent_90%)] animate-spin-slow rounded-full opacity-60"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
          </div>

          {/* 特效卡片主體 */}
          <div className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400/40 rounded-[36px] p-8 max-w-sm w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.35)] animate-scale-up overflow-hidden">
            
            {/* 卡片流光邊框 */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-shimmer"></div>

            {/* 標題 */}
            <span className="text-[11px] font-black tracking-[0.25em] text-amber-400 uppercase bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20 inline-block mb-2">
              {acquiredItem.titleText || '🎉 恭喜獲得'}
            </span>
            
            {/* 圓形發光道具展示 */}
            <div className="w-28 h-28 mx-auto my-6 rounded-full bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent flex items-center justify-center border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-bounce-subtle relative group">
              <div className="absolute inset-1.5 rounded-full border border-amber-400/30 border-dashed animate-spin-slow"></div>
              {/* 根據道具類型顯示大圖標/Emoji */}
              <span className="text-5xl drop-shadow-md select-none">
                {acquiredItem.itemId.includes('potion') ? '🧪' : 
                 acquiredItem.itemId.includes('cleanse') ? '🧼' : 
                 acquiredItem.itemId.includes('scroll') ? '📜' :
                 acquiredItem.itemId.includes('stone') ? '💎' :
                 acquiredItem.itemId.includes('watch') ? '⌚' :
                 acquiredItem.itemId.includes('glasses') ? '👓' :
                 acquiredItem.itemId.includes('key') ? '🔑' :
                 acquiredItem.itemId.includes('crown') ? '👑' : 
                 acquiredItem.type === 'equip' ? '🛡️' : '🎁'}
              </span>
            </div>

            {/* 道具名稱 */}
            <h3 className="text-2xl font-black text-white tracking-wide drop-shadow-sm font-['Outfit']">
              {acquiredItem.name}
            </h3>

            {/* 屬性加成數值 (如果是裝備) */}
            {acquiredItem.stats && Object.keys(acquiredItem.stats).length > 0 && (
              <div className="mt-2.5 flex justify-center gap-1.5 flex-wrap">
                {Object.entries(acquiredItem.stats).map(([stat, val]) => (
                  <span key={stat} className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold px-3 py-1 rounded-lg">
                    💪 {stat} +{val}
                  </span>
                ))}
              </div>
            )}

            {/* 道具描述 */}
            <p className="text-xs text-slate-450 font-bold mt-4 leading-relaxed px-2">
              {acquiredItem.desc || '請至同仁背包中查看或穿戴裝備，為寵物提供額外屬性加成。'}
            </p>

            {/* 確認收下按鈕 */}
            <button
              onClick={() => setAcquiredItem(null)}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-2xl text-xs active:scale-95 transition-all shadow-[0_4px_25px_rgba(245,158,11,0.4)] tracking-widest mt-7 border border-yellow-300/30"
            >
              收下道具
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
