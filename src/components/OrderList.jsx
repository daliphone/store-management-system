import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Bell, Plus, Search, Filter, AlertTriangle, Clock, Check, X } from 'lucide-react';
import { STORES } from '../mockData';

// 動態計算逾期天數
export const calculateOverdueDays = (promiseDateStr, status) => {
  if (status === '已交機' || !promiseDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const promise = new Date(promiseDateStr);
  promise.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - promise.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

// 動態計算剩餘到期天數
export const calculateRemainingDays = (promiseDateStr, status) => {
  if (status === '已交機' || !promiseDateStr) return 999;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const promise = new Date(promiseDateStr);
  promise.setHours(0, 0, 0, 0);
  
  const diffTime = promise.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default function OrderList({ orders, currentUser, onOpenSettings, onOpenAddOrder, statusFilter: propStatusFilter, setStatusFilter: propSetStatusFilter, onUpdateOrderStatus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState('ALL');
  const [alertSettings, setAlertSettings] = useState({ warningDays: 2, criticalDays: 7 });
  
  // 門市篩選狀態 (管理員與稽核員可用)
  const [selectedStore, setSelectedStore] = useState('ALL');

  // 當前正在變更狀態的訂單
  const [statusUpdatingOrder, setStatusUpdatingOrder] = useState(null);

  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const setStatusFilter = propSetStatusFilter !== undefined ? propSetStatusFilter : setLocalStatusFilter;

  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');

  // 載入時效設定
  useEffect(() => {
    const cached = localStorage.getItem('store_mgmt_alert_settings');
    if (cached) {
      try {
        setAlertSettings(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  // 1. 根據角色與分店取得訂單基底
  const getRoleFilteredOrders = () => {
    if (hasAllStoresPerm) {
      if (selectedStore === 'ALL') return orders;
      return orders.filter(o => o.store === selectedStore);
    }
    if (currentUser.role === 'STORE_MANAGER') {
      return orders.filter(o => o.store === currentUser.store);
    }
    return orders.filter(o => o.creator === currentUser.name);
  };

  // 2. 根據搜尋、RWD分店及 8 大狀態過濾資料
  const getFilteredOrders = () => {
    const baseOrders = getRoleFilteredOrders();
    return baseOrders.filter(order => {
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm);
      
      if (!matchesSearch) return false;

      const overdueDays = calculateOverdueDays(order.promiseDate, order.status);
      const remainingDays = calculateRemainingDays(order.promiseDate, order.status);
      
      const isHandedOver = order.status === '已交單' || order.status === '已交機';
      const isOverdue = !isHandedOver && overdueDays > 0;
      const isWarning = !isHandedOver && remainingDays >= 0 && remainingDays <= alertSettings.warningDays;

      switch (statusFilter) {
        case 'REQ': // 訂貨需求
          return order.status === '訂貨需求';
        case 'ORDERED': // 已下訂
          return order.status === '已下訂';
        case 'ARRIVED': // 已到貨 (未逾期)
          return order.status === '已到貨' && !isOverdue;
        case 'DELIVERED': // 已交單 / 已交機
          return isHandedOver;
        case 'DUE_SOON': // 即將到期 (未交單，且在天數內)
          return isWarning;
        case 'OVERDUE_ORDER': // 逾期訂單 (預計交貨日已過，但貨物仍是訂貨需求或已下訂)
          return isOverdue && (order.status === '訂貨需求' || order.status === '已下訂');
        case 'OVERDUE_CLAIM': // 逾期取件 (貨物已到店，但預計交貨日已過且客戶未取)
          return order.status === '已到貨' && isOverdue;
        case 'OVERDUE_HANDOVER': // 逾期交單 (所有預計交貨日已過，但未交機的項目)
          return isOverdue;
        case 'ALL':
        default:
          return true;
      }
    });
  };

  // 判斷當前使用者有無變更該訂單狀態的權限
  const canUpdateStatus = (order) => {
    return currentUser.role === 'SUPER_ADMIN' || 
           currentUser.role === 'AUDITOR' || 
           (currentUser.role === 'STORE_MANAGER' && order.store === currentUser.store) ||
           currentUser.name === order.creator;
  };

  // 確定變更狀態
  const handleConfirmStatusChange = (status) => {
    if (statusUpdatingOrder && onUpdateOrderStatus) {
      onUpdateOrderStatus(statusUpdatingOrder.id, status);
    }
    setStatusUpdatingOrder(null);
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 tracking-wide">門市訂貨承諾追蹤</h1>
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 font-medium text-xs transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <Settings size={16} />
          <span>設定</span>
        </button>
      </div>

      {/* 搜尋與門市/狀態篩選欄 */}
      <div className="p-4 bg-white border-b border-gray-100 space-y-3">
        {/* 第一行：搜尋框 */}
        <div className="relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜尋客戶姓名、電話或商品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50/50"
          />
        </div>

        {/* 第二行：門市選擇 (管理員與稽核員限定) */}
        {hasAllStoresPerm && (
          <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <span className="text-[10px] text-gray-500 font-extrabold shrink-0">門市篩選：</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-[11px] font-extrabold px-3 py-1 rounded-lg focus:outline-none cursor-pointer flex-1"
            >
              <option value="ALL">全部門市 (跨店檢視)</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* 第三行：8 大業務標籤狀態篩選 */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-semibold">
          {[
            { id: 'ALL', label: '全部' },
            { id: 'REQ', label: '📋 訂貨需求' },
            { id: 'ORDERED', label: '📦 已下訂' },
            { id: 'ARRIVED', label: '🟢 已到貨' },
            { id: 'DELIVERED', label: '🔵 已交單' },
            { id: 'DUE_SOON', label: '⏰ 即將到期' },
            { id: 'OVERDUE_ORDER', label: '🚨 逾期訂單' },
            { id: 'OVERDUE_CLAIM', // 逾期取件
              label: (
                <span className="flex items-center space-x-0.5">
                  <span>⚠️ 逾期取件</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                </span>
              ) 
            },
            { id: 'OVERDUE_HANDOVER', label: '🛑 逾期交單' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap active:scale-95 flex items-center ${
                statusFilter === tab.id
                  ? 'bg-blue-500 text-white border-blue-500 shadow-sm font-black'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="p-4 space-y-3.5 flex-1 bg-slate-100/50">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2 text-gray-400">
            <span className="text-4xl">📦</span>
            <p className="text-xs font-semibold">沒有符合篩選條件的訂單</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            // 1. 動態計算時效
            const overdueDays = calculateOverdueDays(order.promiseDate, order.status);
            const remainingDays = calculateRemainingDays(order.promiseDate, order.status);
            
            const isHandedOver = order.status === '已交單' || order.status === '已交機';
            const isOverdue = !isHandedOver && overdueDays > 0;
            const isCriticalOverdue = isOverdue && overdueDays >= alertSettings.criticalDays;
            const isWarning = !isHandedOver && remainingDays <= alertSettings.warningDays && remainingDays >= 0;
            
            // 2. 決定右上角狀態 Badge 顏色 (解耦：僅反映狀態類型，不隨逾期變色，視覺更乾淨)
            let statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
            if (isHandedOver) {
              statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-100';
            } else if (order.status === '已到貨') {
              statusBadgeClass = 'bg-green-50 text-green-700 border-green-150';
            } else if (order.status === '已下訂') {
              statusBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-150';
            } else if (order.status === '訂貨需求') {
              statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
            }

            // 3. 決定左側狀態邊條顏色
            let sideBarColor = 'bg-slate-200';
            if (isHandedOver) {
              sideBarColor = 'bg-blue-500';
            } else if (isOverdue) {
              sideBarColor = isCriticalOverdue ? 'bg-red-600' : 'bg-orange-500';
            } else if (isWarning) {
              sideBarColor = 'bg-yellow-400';
            } else if (order.status === '已到貨') {
              sideBarColor = 'bg-green-500';
            } else if (order.status === '已下訂') {
              sideBarColor = 'bg-indigo-400';
            }

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100/80 overflow-hidden flex relative hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* 左側狀態邊條 */}
                <div className={`w-1.5 shrink-0 ${sideBarColor}`}></div>

                {/* 卡片主要內容 */}
                <div className="p-4 flex-1 space-y-3">
                  {/* 第一行：姓名電話與狀態標籤 */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-[17px] font-black text-gray-900 tracking-tight">{order.customerName}</span>
                      <span className="text-xs text-gray-500 font-medium font-mono">{order.customerPhone}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded border shadow-sm ${statusBadgeClass}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* 第二行：商品名稱 */}
                  <div className="text-[15px] font-bold text-gray-800 leading-tight">
                    {order.productName}
                  </div>

                  {/* 第三行：標籤雲 */}
                  {order.tags && order.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {order.tags.map((tag, idx) => {
                        const isAwardTag = tag.includes('標') || tag.includes('績');
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center ${
                              isAwardTag
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {!isAwardTag && '+ '}
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* 分割線 */}
                  <div className="border-t border-gray-150 my-2"></div>

                  {/* 第四行：分店、提單人、建單日期、時效提示 */}
                  <div className="flex flex-col space-y-2.5 text-[11px] text-gray-500 font-medium">
                    <div className="flex justify-between items-center">
                      <span>
                        {order.store} · 提單: {order.creator} · {order.type}
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar size={12} className="text-gray-400" />
                        <span>建單 {order.createdAt.substring(5).replace('-', '/')}</span>
                      </span>
                    </div>

                    {/* 時效警示提示 (重構為帶有邊框與背景的精緻 widget 區塊) */}
                    {!isHandedOver && (
                      <div className={`p-2.5 flex items-center rounded-xl border ${
                        isCriticalOverdue ? 'bg-red-50/80 border-red-100 text-red-700 font-bold' : 
                        isOverdue ? 'bg-orange-50/80 border-orange-100 text-orange-700 font-bold' : 
                        isWarning ? 'bg-yellow-50/80 border-yellow-100 text-yellow-800 font-bold' : 
                        'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        {isCriticalOverdue ? (
                          <div className="flex items-center space-x-1.5 text-red-700 font-black text-[11px] animate-pulse-subtle">
                            <AlertTriangle size={14} />
                            <span>🚨 嚴重逾期 {overdueDays} 天 (交期：{order.promiseDate})</span>
                          </div>
                        ) : isOverdue ? (
                          <div className="flex items-center space-x-1.5 text-orange-700 font-bold text-[11px]">
                            <AlertTriangle size={14} />
                            <span>⚠️ 逾期 {overdueDays} 天 (交期：{order.promiseDate})</span>
                          </div>
                        ) : isWarning ? (
                          <div className="flex items-center space-x-1.5 text-yellow-700 font-bold text-[11px]">
                            <Clock size={14} />
                            <span>⏰ 即將到期 (剩 {remainingDays === 0 ? '今' : remainingDays} 天交貨)</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-green-700 font-semibold text-[11px]">
                            <Clock size={14} />
                            <span>⏱️ 時效正常 (剩 {remainingDays} 天交貨)</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 已交單/交機時效 */}
                    {isHandedOver && (
                      <div className="p-2.5 rounded-xl flex items-center bg-blue-50/80 border border-blue-100">
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold text-[11px]">
                          <Check size={14} strokeWidth={3} />
                          <span>⏱️ 本單已順利交易完成並交機</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 狀態更新快捷操作 (權限區分控制) */}
                  {canUpdateStatus(order) && !isHandedOver && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setStatusUpdatingOrder(order);
                        }}
                        className="flex items-center space-x-1 border border-blue-500 text-blue-600 bg-white px-4 py-2 rounded-full text-xs font-extrabold hover:bg-blue-50 hover:shadow-sm active:scale-95 transition-all"
                      >
                        <span>🔄 變更訂單狀態</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 浮動新增按鈕 */}
      <button
        onClick={onOpenAddOrder}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-90 z-40 border border-blue-400"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* 狀態變更 Action Sheet 面板 (Modal) */}
      {statusUpdatingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-gray-800">
                變更訂單狀態流程 (客戶: {statusUpdatingOrder.customerName})
              </h3>
              <button 
                onClick={() => setStatusUpdatingOrder(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 border rounded-full bg-white active:scale-90 transition-all"
              >
                <X size={15} />
              </button>
            </div>
            
            <p className="text-[10px] text-gray-400 font-bold">
              變更後將透過 SyncAll 一併同步回您的 Google Sheets，無須手動重刷。
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1.5">
              {[
                { id: '訂貨需求', label: '📋 訂貨需求', desc: '客戶落訂，待採購下單' },
                { id: '已下訂', label: '📦 已下訂', desc: '向總部/廠商下訂，運送中' },
                { id: '已到貨', label: '🟢 已到貨', desc: '商品已到店點收，候取件' },
                { id: '已交單', label: '🔵 已交單', desc: '客戶驗機並完成手寫簽名' }
              ].map(statusOption => {
                const isSelected = statusUpdatingOrder.status === statusOption.id;
                return (
                  <button
                    key={statusOption.id}
                    type="button"
                    onClick={() => handleConfirmStatusChange(statusOption.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-98 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-400 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/20'
                    }`}
                  >
                    <span className="text-xs font-black text-gray-800">{statusOption.label}</span>
                    <span className="text-[8px] text-gray-400 font-semibold mt-1 block">{statusOption.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
