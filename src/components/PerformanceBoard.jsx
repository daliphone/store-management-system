import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Calendar, Coins, Smartphone, Users as UsersIcon, ShieldCheck, HelpCircle, ChevronRight, BarChart3, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { getStorePerformance } from '../services/googleSheetsService';
import { USERS } from '../mockData';
import PerformanceForm from './PerformanceForm';

export default function PerformanceBoard({ currentUser, stores }) {
  const [loading, setLoading] = useState(false);
  const [perfData, setPerfData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  // 取得選定分店的人員清單
  const getStorePeople = (storeName) => {
    const list = USERS.filter(u => u.store === storeName && u.sheetName);
    return list.map(u => ({ name: u.name, sheetName: u.sheetName }));
  };

  const storePeople = getStorePeople(selectedStore);

  const [selectedSheetName, setSelectedSheetName] = useState(() => {
    // 一般同仁預設是自己的暱稱，管理員或店長預設看該店總表 (同店名)
    const isManager = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER');
    if (isManager) {
      return selectedStore; // 總表分頁名稱與店名相同
    }
    return currentUser?.sheetName || currentUser?.name || selectedStore;
  });

  // 當分店改變時，重置人員選擇
  useEffect(() => {
    const isManager = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER');
    if (isManager) {
      setSelectedSheetName(selectedStore);
    } else {
      setSelectedSheetName(currentUser?.sheetName || currentUser?.name || selectedStore);
    }
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
  }, [selectedStore, selectedSheetName]);

  // 生成 SVG 折線圖
  const renderLineChart = (dailyList, keyName, color = '#f43f5e') => {
    if (!dailyList || dailyList.length === 0) return null;
    
    // 過濾有值的資料
    const validData = dailyList.filter(d => d[keyName] > 0 || d.day <= new Date().getDate());
    if (validData.length === 0) return <div className="text-[10px] text-slate-400 text-center py-4 font-bold">目前暫無每日數據</div>;

    const maxVal = Math.max(...validData.map(d => d[keyName]), 100);
    const minVal = 0;
    const range = maxVal - minVal;

    const width = 360;
    const height = 120;
    const padding = 20;

    const points = validData.map((d, idx) => {
      const x = padding + (idx / (validData.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((d[keyName] - minVal) / range) * (height - padding * 2);
      return { x, y, day: d.day, val: d[keyName] };
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
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padding - 5} y={y + 3} textAnchor="end" className="text-[8px] fill-slate-400 font-mono font-bold">{val.toLocaleString()}</text>
              </g>
            );
          })}

          {/* 漸層陰影填充 */}
          {fillD && (
            <path
              d={fillD}
              fill={`url(#gradient-${keyName})`}
              opacity="0.15"
            />
          )}

          {/* 折線 */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 節點 */}
          {points.map((p, idx) => {
            // 只渲染部分點的文字，防擠
            const showText = idx === 0 || idx === points.length - 1 || p.day === new Date().getDate();
            return (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="#white" stroke={color} strokeWidth="2" />
                {showText && (
                  <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[8px] font-black font-mono fill-slate-700">
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

  const getMetricIcon = (key) => {
    switch (key) {
      case 'grossProfit': return <Coins className="text-amber-500" size={18} />;
      case 'accessories': return <Smartphone className="text-sky-500" size={18} />;
      case 'customerCount': return <UsersIcon className="text-indigo-500" size={18} />;
      case 'insurance': return <ShieldCheck className="text-emerald-500" size={18} />;
      case 'subscription': return <HelpCircle className="text-rose-400" size={18} />;
      default: return null;
    }
  };

  const getMetricLabel = (key) => {
    switch (key) {
      case 'grossProfit': return '當月毛利';
      case 'accessories': return '配件營收';
      case 'customerCount': return '實質來客';
      case 'insurance': return '手機保險';
      case 'subscription': return '門號開通';
      default: return '';
    }
  };

  const getMetricUnit = (key) => {
    return key === 'customerCount' ? '人' : key === 'subscription' ? '件' : '元';
  };

  // 當期主要統計
  const summary = perfData?.summary || {};
  const grossProfitRate = summary.grossProfit?.achievement || '0%';

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar bg-slate-50 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部導航列 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-1.5 text-rose-500">
          <BarChart3 size={20} />
          <h1 className="text-base font-black text-slate-800 tracking-wide">業績與目標看板</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-rose-500 text-white font-extrabold text-[11px] px-3.5 py-1.8 rounded-xl active:scale-95 transition-all flex items-center gap-1 shadow-md border-none"
        >
          <Plus size={14} />
          <span>登錄今日業績</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 篩選控制器 */}
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400">請選擇篩選維度</span>
            <button onClick={loadPerf} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 分店選擇 */}
            <div>
              <label className="block text-[9px] font-black text-slate-400 mb-1">分店</label>
              {availableStores.length > 1 ? (
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
                >
                  {availableStores.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2 text-xs font-black text-slate-500 select-none">
                  {selectedStore}
                </div>
              )}
            </div>

            {/* 人員選擇 */}
            <div>
              <label className="block text-[9px] font-black text-slate-400 mb-1">人員/總表</label>
              {currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER' ? (
                <select
                  value={selectedSheetName}
                  onChange={(e) => setSelectedSheetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-black text-slate-700 focus:outline-none focus:border-rose-500 transition-all"
                >
                  <option value={selectedStore}>📊 {selectedStore}總表</option>
                  {storePeople.map(p => (
                    <option key={p.sheetName} value={p.sheetName}>👤 {p.name} ({p.sheetName})</option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2 text-xs font-black text-slate-500 select-none flex items-center justify-between">
                  <span>{selectedSheetName === selectedStore ? `📊 ${selectedStore}總表` : `👤 ${selectedSheetName}`}</span>
                  {storePeople.length > 0 && selectedSheetName !== selectedStore && (
                    <button
                      onClick={() => setSelectedSheetName(selectedSheetName === currentUser.sheetName ? selectedStore : (currentUser.sheetName || selectedStore))}
                      className="text-[9px] text-rose-500 font-extrabold"
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
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[250px]">
            <Loader2 size={32} className="text-rose-500 animate-spin" />
            <span className="text-xs font-black text-slate-500">正在獲取 Google Apps Script 業績報表...</span>
          </div>
        )}

        {/* 錯誤提示 */}
        {!loading && errorMsg && (
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm text-center space-y-2">
            <AlertCircle size={28} className="text-rose-500 mx-auto" />
            <h3 className="text-xs font-black text-rose-600">讀取異常</h3>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* 業績數據呈現 */}
        {!loading && !errorMsg && perfData && (
          <div className="space-y-4">
            {/* 毛利大圓環 / 達成率進度條 */}
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[32px] p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
              {/* 背景斜紋裝飾 */}
              <div className="absolute right-[-20px] bottom-[-20px] text-[120px] font-black text-white/5 font-mono select-none pointer-events-none">
                %
              </div>

              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-white/80 font-bold block">月度毛利達成進度</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black font-mono">{(summary.grossProfit?.accumulated || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-white/80">/ {(summary.grossProfit?.target || 0).toLocaleString()} 元</span>
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex flex-col items-center justify-center border border-white/20">
                  <span className="text-xs font-black font-mono">{grossProfitRate}</span>
                  <span className="text-[8px] text-white/70 font-bold">達成率</span>
                </div>
              </div>

              {/* 進度條 */}
              <div className="space-y-1">
                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(parseInt(grossProfitRate) || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-white/80 font-bold font-mono">
                  <span>0%</span>
                  <span>目標: 100%</span>
                </div>
              </div>
            </div>

            {/* 核心指標卡片 (2x2 Grid + 底部單卡) */}
            <div className="grid grid-cols-2 gap-3">
              {['accessories', 'customerCount', 'insurance', 'subscription'].map((key) => {
                const metric = summary[key] || { target: 0, accumulated: 0, achievement: '0%' };
                return (
                  <div key={key} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-28">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-7 h-7 rounded-xl bg-slate-50 flex items-center justify-center">
                        {getMetricIcon(key)}
                      </div>
                      <span className="text-[10px] font-black text-slate-500">{getMetricLabel(key)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline space-x-0.5">
                        <span className="text-lg font-black text-slate-800 font-mono">{Number(metric.accumulated || 0).toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{getMetricUnit(key)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                        <span>目標: {Number(metric.target || 0).toLocaleString()}</span>
                        <span className="text-rose-500 font-black font-mono">{metric.achievement || '0%'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 折線趨勢圖 (毛利 & 配件) */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 px-1">
                <TrendingUp size={14} className="text-rose-500" />
                本月毛利日趨勢
              </h3>
              {renderLineChart(perfData?.daily, 'grossProfit', '#f43f5e')}

              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 px-1 pt-1">
                <Smartphone size={14} className="text-sky-500" />
                本月配件日趨勢
              </h3>
              {renderLineChart(perfData?.daily, 'accessories', '#0284c7')}
            </div>
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
