import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Calendar } from 'lucide-react';
import { STORES } from '../mockData';

export default function OrderForm({ currentUser, onSave, onClose, editOrder }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    store: currentUser.store !== '全分店' ? currentUser.store : '東門店',
    productName: '',
    promiseDate: ''
  });

  // 如果是編輯模式，預填資料
  useEffect(() => {
    if (editOrder) {
      setFormData({
        customerName: editOrder.customerName || '',
        customerPhone: editOrder.customerPhone || '',
        store: editOrder.store || currentUser.store,
        productName: editOrder.productName || '',
        promiseDate: editOrder.promiseDate || ''
      });
    } else {
      // 新增模式：預設承諾日期為今天
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setFormData(prev => ({ ...prev, promiseDate: `${yyyy}-${mm}-${dd}` }));
    }
  }, [editOrder, currentUser]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('請填寫客戶姓名');
      return;
    }
    if (!formData.customerPhone.trim()) {
      alert('請填寫聯絡電話');
      return;
    }
    if (!formData.productName.trim()) {
      alert('請填寫訂購商品與承諾詳情');
      return;
    }
    if (!formData.promiseDate) {
      alert('請選擇預計交貨日');
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (editOrder) {
      // 編輯保存模式：保留原訂單結構，只更新修改欄位
      const updatedOrder = {
        ...editOrder,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        store: formData.store,
        productName: formData.productName.trim(),
        promiseDate: formData.promiseDate
      };
      onSave(updatedOrder);
    } else {
      // 全新新增模式：代入預設值以防 GAS 結構損毀
      const newOrder = {
        id: `ord_${Math.random().toString(36).substr(2, 9)}`,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        productName: formData.productName.trim(),
        type: '訂貨', // 預設類型
        store: formData.store,
        creator: currentUser.name,
        source: '門市', // 預設來源
        tags: [], // 預設無標籤
        quantity: 1, // 預設數量 1
        price: 0, // 預設價格 0
        cost: 0, // 預設成本 0
        status: '訂貨需求', // 預設初始狀態
        createdAt: todayStr,
        promiseDate: formData.promiseDate,
        overdueDays: 0,
        signature: '', // 簽名留在交機簽收詳情頁處理
        notes: '' // 預設備註為空
      };
      onSave(newOrder);
    }
  };

  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');

  // 取得當前使用者的縮寫 (SP)
  const getUserInitials = () => {
    if (currentUser.name === '總管理處') return 'HQ';
    if (currentUser.name === '文和') return 'AD';
    return currentUser.name ? currentUser.name.substring(0, 2) : 'SP';
  };

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar animate-slide-up pb-16 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部導覽列 (全中文) */}
      <div className="sticky top-0 bg-[#E6EEFF] border-b border-blue-100 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 border border-dashed border-blue-300 rounded-full flex items-center justify-center text-blue-600 bg-white hover:bg-blue-50 active:scale-90 transition-all focus:outline-none shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-black text-blue-900 tracking-wide">門市訂貨管理</h2>
        <div className="w-10 h-10 rounded-full bg-white text-blue-600 font-black text-xs flex items-center justify-center border border-blue-200 font-mono shadow-sm" title="登入人員代碼">
          {getUserInitials()}
        </div>
      </div>

      {/* 表單主內容區 (修復留白，隨內容自適應高度) */}
      <div className="p-4 flex-1 flex flex-col space-y-4 max-w-md mx-auto w-full">
        {/* 標題語區 */}
        <div className="space-y-1 pl-1">
          <h1 className="text-2xl font-black text-slate-800">
            {editOrder ? '修改訂單資訊' : '新增訂貨承諾'}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold">請在下方填寫訂單的詳細資訊，完成後將自動同步至雲端。</p>
        </div>

        {/* 表單白色主卡片 (移除 flex-1 以免把頁面拉得過長) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4.5">
          <div className="space-y-4">
            {/* 1. 客戶姓名 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-black block">客戶姓名 *</label>
              <input
                type="text"
                placeholder="請輸入客戶姓名 (例如: 王大同)"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800"
                required
              />
            </div>

            {/* 2. 聯絡電話 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-black block">聯絡電話 *</label>
              <input
                type="tel"
                placeholder="請輸入手機號碼 (例如: 0912-345-678)"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-850 font-mono"
                required
              />
            </div>

            {/* 3. 分店門市 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-black block">分店門市</label>
              <select
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                disabled={!hasAllStoresPerm}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-700 bg-slate-50/50 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
              >
                {hasAllStoresPerm ? (
                  STORES.map(s => <option key={s} value={s}>{s}</option>)
                ) : (
                  <option value={currentUser.store}>{currentUser.store}</option>
                )}
              </select>
            </div>

            {/* 4. 訂購商品與承諾詳情 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-black block">訂購商品與承諾詳情 *</label>
              <textarea
                placeholder="請詳細描述訂購的商品名稱、規格、贈品或承諾內容（例如: iPhone 16 Pro 256G 黑色，送原廠保護殼，承諾交期前到貨）..."
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-800 h-24 resize-none leading-relaxed"
                required
              />
            </div>

            {/* 5. 預計交貨日 */}
            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-black block">預計交貨日</label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="date"
                  value={formData.promiseDate}
                  onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
                  className="block w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-850 font-mono"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* 建立/儲存訂單按鈕 (緊隨表單卡片底部，避免過多留白) */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50 border border-blue-500 focus:outline-none"
            >
              <Check size={15} strokeWidth={3} />
              <span>{editOrder ? '確認修改並儲存' : '確認無誤，建立訂單'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
