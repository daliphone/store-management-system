import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Bell, Plus, Search, Filter, AlertTriangle, Clock } from 'lucide-react';

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

export default function OrderList({ orders, currentUser, onOpenSettings, onOpenAddOrder, statusFilter: propStatusFilter, setStatusFilter: propSetStatusFilter }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState('ALL'); // ALL, OVERDUE, WARNING, ARRIVED, DELIVERED
  const [alertSettings, setAlertSettings] = useState({ warningDays: 2, criticalDays: 7 });
  
  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const setStatusFilter = propSetStatusFilter !== undefined ? propSetStatusFilter : setLocalStatusFilter;

  // 載入時效設定
  useEffect(() => {
    const cached = localStorage.getItem('store_mgmt_alert_settings');
    if (cached) {
      try {
        setAlertSettings(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  // 1. 根據功能權限與分店過濾資料
  const getRoleFilteredOrders = () => {
    const perms = currentUser.permissions || [];
    if (perms.includes('view_all_stores')) return orders;
    if (currentUser.role === 'STORE_MANAGER') {
      return orders.filter(o => o.store === currentUser.store);
    }
    return orders.filter(o => o.creator === currentUser.name);
  };

  // 2. 根據搜尋與狀態過濾資料
  const getFilteredOrders = () => {
    const roleFiltered = getRoleFilteredOrders();
    return roleFiltered.filter(order => {
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm);
      
      const overdueDays = calculateOverdueDays(order.promiseDate, order.status);
      const remainingDays = calculateRemainingDays(order.promiseDate, order.status);
      
      const isOverdue = overdueDays > 0;
      const isWarning = !isOverdue && remainingDays <= alertSettings.warningDays && remainingDays >= 0;
      const isArrived = order.status === '已到貨';
      const isDelivered = order.status === '已交機';

      if (statusFilter === 'OVERDUE') return matchesSearch && isOverdue;
      if (statusFilter === 'WARNING') return matchesSearch && isWarning;
      if (statusFilter === 'ARRIVED') return matchesSearch && isArrived && !isOverdue;
      if (statusFilter === 'DELIVERED') return matchesSearch && isDelivered;
      return matchesSearch;
    });
  };

  const filteredOrders = getFilteredOrders();

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 tracking-wide">門市店務管理系統</h1>
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 font-medium text-xs transition-colors p-1.5 rounded-lg hover:bg-gray-100"
        >
          <Settings size={16} />
          <span>設定</span>
        </button>
      </div>

      {/* 搜尋與篩選欄 */}
      <div className="p-4 bg-white border-b border-gray-100 space-y-3">
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

        {/* 狀態快捷篩選 (加入時效篩選) */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-semibold">
          {[
            { id: 'ALL', label: '全部' },
            { id: 'OVERDUE', label: '🚨 逾期' },
            { id: 'WARNING', label: '⏰ 即將到期' },
            { id: 'ARRIVED', label: '🟢 已到貨' },
            { id: 'DELIVERED', label: '🔵 已交機' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap active:scale-95 ${
                statusFilter === tab.id
                  ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="p-4 space-y-3.5 flex-1">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2 text-gray-400">
            <span className="text-4xl">📦</span>
            <p className="text-xs font-semibold">沒有符合篩選條件的訂單</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            // 動態計算時效
            const overdueDays = calculateOverdueDays(order.promiseDate, order.status);
            const remainingDays = calculateRemainingDays(order.promiseDate, order.status);
            
            const isOverdue = overdueDays > 0;
            const isCriticalOverdue = overdueDays >= alertSettings.criticalDays;
            const isWarning = !isOverdue && remainingDays <= alertSettings.warningDays && remainingDays >= 0;
            
            // 決定左側邊條顏色
            let sideBarColor = 'bg-gray-200';
            if (order.status === '已交機') {
              sideBarColor = 'bg-blue-500';
            } else if (isCriticalOverdue) {
              sideBarColor = 'bg-red-600';
            } else if (isOverdue) {
              sideBarColor = 'bg-orange-500';
            } else if (isWarning) {
              sideBarColor = 'bg-yellow-400';
            } else if (order.status === '已到貨') {
              sideBarColor = 'bg-green-500';
            }

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex relative hover:shadow-md transition-all duration-200"
              >
                {/* 左側狀態邊條 */}
                <div className={`w-1.5 shrink-0 ${sideBarColor}`}></div>

                {/* 卡片主要內容 */}
                <div className="p-4 flex-1 space-y-3">
                  {/* 第一行：姓名電話與狀態標籤 */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-base font-bold text-gray-800">{order.customerName}</span>
                      <span className="text-xs text-gray-500 font-medium font-mono">{order.customerPhone}</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                      order.status === '已交機'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === '已到貨'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* 第二行：商品名稱 */}
                  <div className="text-sm font-extrabold text-gray-900 leading-tight">
                    {order.productName}
                  </div>

                  {/* 第三行：標籤雲 */}
                  {order.tags && order.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {order.tags.map((tag, idx) => {
                        const isAwardTag = tag.includes('標') || tag.includes('績');
                        return (
                          <span
                            key={idx}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                              isAwardTag
                                ? 'bg-amber-100 text-amber-800 border border-amber-200/50 flex items-center'
                                : 'bg-gray-100 text-gray-600'
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
                  <div className="border-t border-gray-100 my-1"></div>

                  {/* 第四行：分店、提單人、建單日期、時效提示 */}
                  <div className="flex flex-col space-y-1.5 text-[10px] text-gray-400 font-medium">
                    <div className="flex justify-between">
                      <span>
                        {order.store} · 提單: {order.creator} · {order.type}
                      </span>
                      <span className="flex items-center space-x-0.5">
                        <Calendar size={10} />
                        <span>建單 {order.createdAt.substring(5).replace('-', '/')}</span>
                      </span>
                    </div>

                    {/* 時效警示提示 */}
                    {order.status !== '已交機' && (
                      <div className="pt-0.5">
                        {isCriticalOverdue ? (
                          <div className="flex items-center space-x-1 text-red-600 font-extrabold text-[11px] animate-pulse-subtle">
                            <AlertTriangle size={12} />
                            <span>🚨 嚴重逾期 {overdueDays} 天 (預計交貨日：{order.promiseDate})</span>
                          </div>
                        ) : isOverdue ? (
                          <div className="flex items-center space-x-1 text-orange-600 font-bold text-[11px]">
                            <AlertTriangle size={12} />
                            <span>⚠️ 逾期 {overdueDays} 天 (預計交貨日：{order.promiseDate})</span>
                          </div>
                        ) : isWarning ? (
                          <div className="flex items-center space-x-1 text-yellow-600 font-bold text-[11px]">
                            <Clock size={12} />
                            <span>⏰ 即將到期 (剩 {remainingDays === 0 ? '今' : remainingDays} 天交貨)</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-green-600 font-semibold text-[10px]">
                            <Clock size={11} />
                            <span>⏱️ 時效正常 (剩 {remainingDays} 天交貨)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
