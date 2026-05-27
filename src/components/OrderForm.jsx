import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Calendar, Trash2, Edit2, FileText, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { STORES } from '../mockData';

export default function OrderForm({ currentUser, onSave, onSaveBatch, onClose, editOrder }) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' 或 'batch'
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    store: currentUser.store !== '全分店' ? currentUser.store : '東門店',
    productName: '',
    promiseDate: ''
  });

  // 批次匯入狀態
  const [batchText, setBatchText] = useState('');
  const [parsedOrders, setParsedOrders] = useState([]);
  const [batchSettings, setBatchSettings] = useState({
    globalPromiseDate: '',
    globalStore: '電商部'
  });

  // 如果是編輯模式，預填資料並強制單筆 Tab
  useEffect(() => {
    if (editOrder) {
      setActiveTab('single');
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
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setFormData(prev => ({ ...prev, promiseDate: todayStr }));
      
      // 預設批次的統一交期為 3 天後
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      const dy = defaultDate.getFullYear();
      const dm = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const dd3 = String(defaultDate.getDate()).padStart(2, '0');
      setBatchSettings({
        globalPromiseDate: `${dy}-${dm}-${dd3}`,
        globalStore: '電商部'
      });
    }
  }, [editOrder, currentUser]);

  // 單筆新增送出
  const handleSingleSubmit = (e) => {
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
      // 編輯保存模式
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
      // 全新新增模式
      const newOrder = {
        id: `ord_${Math.random().toString(36).substr(2, 9)}`,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        productName: formData.productName.trim(),
        type: '訂貨',
        store: formData.store,
        creator: currentUser.name,
        source: '門市',
        tags: [],
        quantity: 1,
        price: 0,
        cost: 0,
        status: '訂貨需求',
        createdAt: todayStr,
        promiseDate: formData.promiseDate,
        overdueDays: 0,
        signature: '',
        notes: ''
      };
      onSave(newOrder);
    }
  };

  // 智能文字解析器 (Text Parser)
  const parseBatchText = (text) => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 解析取得過期日期指示，若有，使用截止日期，否則預設 3 天後
    let generalPromiseDate = batchSettings.globalPromiseDate;
    for (let line of lines) {
      const dateMatch = line.match(/(\d+)\/(\d+)~(\d+)\/(\d+)之間過期/);
      if (dateMatch) {
        const month = dateMatch[3];
        const day = dateMatch[4];
        const targetYear = new Date().getFullYear();
        generalPromiseDate = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        break;
      }
    }

    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      
      // 過濾說明文字
      if (line.includes('今日網拍調貨') || line.includes('🔵可從東門調') || line.includes('✅') || line.includes('🟠分店調看看')) {
        i++;
        continue;
      }
      
      const isNewItem = line.startsWith('🔵') || line.startsWith('🟠') || line.startsWith('🔴');
      
      if (isNewItem) {
        const isBlue = line.startsWith('🔵');
        const isOrange = line.startsWith('🟠');
        const isRed = line.startsWith('🔴');
        
        const rest = line.substring(1).trim();
        
        // 判斷是否為跨行子項目的主型號 (如 🔴A16 256G)
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const hasSubItems = !rest.includes('*') && nextLine && !nextLine.startsWith('🔵') && !nextLine.startsWith('🟠') && !nextLine.startsWith('🔴') && nextLine.includes('*');
        
        if (hasSubItems) {
          const mainProduct = rest;
          i++; // 移到下一行子品項開始
          
          while (i < lines.length) {
            let subLine = lines[i];
            if (subLine.startsWith('🔵') || subLine.startsWith('🟠') || subLine.startsWith('🔴')) {
              i--; // 退回一行，讓外層大迴圈處理
              break;
            }
            if (subLine.includes('過期')) {
              i++;
              continue;
            }
            
            // 解析子項目，如 "黃色+保 *1" 或 "銀色*3"
            const parts = subLine.split('*');
            if (parts.length >= 2) {
              const specAndAcc = parts[0].trim();
              const qty = parseInt(parts[1].trim()) || 1;
              
              let finalSpec = specAndAcc;
              let acc = '';
              if (specAndAcc.includes('+')) {
                const spl = specAndAcc.split('+');
                finalSpec = spl[0].trim();
                acc = spl[1].trim();
              }
              
              let status = '訂貨需求';
              let stockNote = '無庫存';
              if (isBlue) { status = '已下訂'; stockNote = '可從東門調'; }
              if (isOrange) { status = '訂貨需求'; stockNote = '分店調看看'; }
              
              items.push({
                id: `ord_batch_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
                customerName: '網拍調貨',
                customerPhone: '0900-000-000',
                productName: `${mainProduct} ${finalSpec}`,
                type: '調貨',
                store: batchSettings.globalStore,
                creator: currentUser.name,
                source: '網拍電商',
                tags: ['電商調貨'],
                quantity: qty,
                price: 0,
                cost: 0,
                status: status,
                createdAt: todayStr,
                promiseDate: generalPromiseDate,
                overdueDays: 0,
                signature: '',
                notes: `[調貨庫存] ${stockNote}${acc ? ` | 配件: ${acc}` : ''}`
              });
            }
            i++;
          }
        } else {
          // 一般單行項目，如：🔵MOTO G06 4G (4/64) 橘 *1
          const parts = rest.split('*');
          let rawProductName = rest;
          let qty = 1;
          
          if (parts.length >= 2) {
            rawProductName = parts[0].trim();
            qty = parseInt(parts[1].trim()) || 1;
          }
          
          let finalProduct = rawProductName;
          let accNote = '';
          
          // 檢查商品名稱內或數量後是否帶有配件，如：(MK保)*1
          if (parts.length >= 2) {
            const secondPart = parts[1].trim();
            const accMatch = secondPart.match(/\((.+?)\)/);
            if (accMatch) {
              accNote = accMatch[1];
            }
          }
          if (parts.length >= 3) {
            const accMatch = parts[1].match(/\((.+?)\)/);
            if (accMatch) {
              accNote = accMatch[1];
            }
          }
          
          // 檢查下一行是否為庫存資訊，如 "網拍21"
          let nextLine = i + 1 < lines.length ? lines[i + 1] : '';
          let stockNote = '無庫存';
          let status = '訂貨需求';
          
          if (isBlue) { status = '已下訂'; stockNote = '可從東門調'; }
          if (isOrange) { status = '訂貨需求'; stockNote = '分店調看看'; }
          
          if (nextLine && !nextLine.startsWith('🔵') && !nextLine.startsWith('🟠') && !nextLine.startsWith('🔴')) {
            const stockMatch = nextLine.match(/([^\d]+)(\d+)/);
            if (stockMatch) {
              const loc = stockMatch[1].trim(); // 網拍
              const num = stockMatch[2].trim(); // 21
              stockNote = `${loc}: ${num}`;
            } else {
              stockNote = nextLine;
            }
            i++; // 跳過下一行
          }
          
          items.push({
            id: `ord_batch_${Math.random().toString(36).substr(2, 9)}_${new Date().getTime()}_${items.length}`,
            customerName: '網拍調貨',
            customerPhone: '0900-000-000',
            productName: finalProduct,
            type: '調貨',
            store: batchSettings.globalStore,
            creator: currentUser.name,
            source: '網拍電商',
            tags: ['電商調貨'],
            quantity: qty,
            price: 0,
            cost: 0,
            status: status,
            createdAt: todayStr,
            promiseDate: generalPromiseDate,
            overdueDays: 0,
            signature: '',
            notes: `[調貨庫存] ${stockNote}${accNote ? ` | 配件: ${accNote}` : ''}`
          });
        }
      }
      i++;
    }
    
    return items;
  };

  // 處理點選解析
  const handleParse = () => {
    if (!batchText.trim()) {
      alert('請先輸入或貼上調貨需求文字！');
      return;
    }
    const result = parseBatchText(batchText);
    if (result.length === 0) {
      alert('解析失敗！請確認文字格式是否正確 (需包含 🔵/🟠/🔴)。');
    } else {
      setParsedOrders(result);
    }
  };

  // 統一更改所有草稿之交期
  const handleGlobalDateChange = (date) => {
    setBatchSettings(prev => ({ ...prev, globalPromiseDate: date }));
    setParsedOrders(prev => prev.map(o => ({ ...o, promiseDate: date })));
  };

  // 統一更改所有草稿之分店
  const handleGlobalStoreChange = (store) => {
    setBatchSettings(prev => ({ ...prev, globalStore: store }));
    setParsedOrders(prev => prev.map(o => ({ ...o, store })));
  };

  // 個別修改草稿欄位
  const handleEditDraftItem = (id, field, value) => {
    setParsedOrders(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, [field]: value };
      }
      return o;
    }));
  };

  // 刪除草稿項目
  const handleDeleteDraftItem = (id) => {
    setParsedOrders(prev => prev.filter(o => o.id !== id));
  };

  // 批次確認送出
  const handleBatchSubmit = (e) => {
    e.preventDefault();
    if (parsedOrders.length === 0) {
      alert('無已解析的訂單可供匯入！');
      return;
    }
    
    // 檢查是否有未填項目
    const hasInvalid = parsedOrders.some(o => !o.productName.trim() || !o.promiseDate);
    if (hasInvalid) {
      alert('草稿列表中有商品名稱或預計交貨日未填，請修正後再送出！');
      return;
    }

    if (onSaveBatch) {
      onSaveBatch(parsedOrders);
    } else {
      // 降級做法：若 App.jsx 沒有傳入 onSaveBatch，逐筆呼叫 onSave (不推薦，防呆用)
      alert('開始逐筆寫入資料，請稍候...');
      parsedOrders.forEach(o => onSave(o));
    }
  };

  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');

  // 取得當前使用者的縮寫
  const getUserInitials = () => {
    if (currentUser.name === '總管理處') return 'HQ';
    if (currentUser.name === '文和') return 'AD';
    return currentUser.name ? currentUser.name.substring(0, 2) : 'SP';
  };

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar animate-slide-up pb-16 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部導覽列 */}
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

      {/* 表單主內容區 */}
      <div className="p-4 flex-1 flex flex-col space-y-4 max-w-lg mx-auto w-full">
        {/* 標題語區 */}
        <div className="space-y-1 pl-1">
          <h1 className="text-2xl font-black text-slate-800">
            {editOrder ? '修改訂單資訊' : '新增訂貨承諾'}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold">
            {editOrder ? '請在下方修改訂單資訊。' : '選擇單筆輸入，或直接貼上電商群文字進行一鍵批次解析與匯入！'}
          </p>
        </div>

        {/* Tab 切換 (非編輯模式才顯示) */}
        {!editOrder && (
          <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-2xl w-full border border-slate-200 text-xs font-black shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'single'
                  ? 'bg-white text-blue-600 shadow-md scale-99'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>單筆手動新增</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'batch'
                  ? 'bg-white text-blue-600 shadow-md scale-99'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={14} strokeWidth={2.5} />
              <span>電商文字批次匯入</span>
            </button>
          </div>
        )}

        {/* Tab 1: 單筆手動新增 */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4.5">
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
                  placeholder="請詳細描述訂購的商品名稱、規格、贈品或承諾內容..."
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
                    className="block w-full px-4 py-3 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-bold text-slate-855 font-mono"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <Calendar size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* 按鈕 */}
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
        )}

        {/* Tab 2: 電商文字批次匯入 */}
        {activeTab === 'batch' && (
          <div className="space-y-4">
            {/* 文字貼上輸入區卡片 */}
            <div className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-750 font-black flex items-center space-x-1.5">
                    <FileText size={14} className="text-blue-500" />
                    <span>貼上電商/網拍調貨文字清單</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-bold">自動依 🔵/🟠/🔴 解析狀態與庫存</span>
                </div>
                <textarea
                  placeholder="請在此貼上複製的電商群組調貨文字，例如：&#10;🔵MOTO G06 橘 *1&#10;網拍21&#10;🔴A16 256G&#10;黃色+保 *1"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold text-slate-800 h-44 resize-none leading-relaxed font-mono bg-slate-50/30"
                />
              </div>

              {/* 解析按鈕 */}
              <button
                type="button"
                onClick={handleParse}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-extrabold py-3 rounded-xl text-xs active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 border border-blue-500"
              >
                <RefreshCw size={14} className="animate-pulse-subtle" />
                <span>智能解析文字清單</span>
              </button>
            </div>

            {/* 解析預覽卡片 */}
            {parsedOrders.length > 0 && (
              <div className="bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-4 animate-fade-in pb-6">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                    <Check size={14} className="text-emerald-500" strokeWidth={3} />
                    <span>解析結果預覽 (共 {parsedOrders.length} 筆項目)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setParsedOrders([])}
                    className="text-[10px] text-red-500 font-black hover:underline"
                  >
                    重置清空
                  </button>
                </div>

                {/* 統一設定面板 (WOW 體驗！) */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">統一預預計交貨日</label>
                    <input
                      type="date"
                      value={batchSettings.globalPromiseDate}
                      onChange={(e) => handleGlobalDateChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg font-mono font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block">統一所屬分店</label>
                    <select
                      value={batchSettings.globalStore}
                      onChange={(e) => handleGlobalStoreChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg font-bold text-slate-700 focus:outline-none"
                    >
                      {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* 預覽訂單編輯清單 */}
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {parsedOrders.map((draft, idx) => {
                    let statusBadge = 'bg-slate-50 text-slate-700 border-slate-200';
                    if (draft.status === '已下訂') {
                      statusBadge = 'bg-indigo-50 text-indigo-700 border-indigo-150';
                    } else if (draft.status === '訂貨需求') {
                      statusBadge = 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                    
                    return (
                      <div key={draft.id} className="p-3 bg-slate-50/60 rounded-2xl border border-slate-150 relative flex flex-col space-y-2 group shadow-sm hover:border-slate-300 transition-all duration-200">
                        {/* 頂行：品項與刪除 */}
                        <div className="flex justify-between items-start pr-6">
                          <input
                            type="text"
                            value={draft.productName}
                            onChange={(e) => handleEditDraftItem(draft.id, 'productName', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 font-black text-xs text-slate-800 focus:outline-none w-full py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteDraftItem(draft.id)}
                            className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-red-500 rounded bg-white border shadow-sm active:scale-90 transition-all"
                            title="刪除此筆"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* 中行：數量與狀態設定 */}
                        <div className="flex items-center space-x-2 text-[10px] font-bold">
                          <div className="flex items-center space-x-1 shrink-0 bg-white border px-1.5 py-0.5 rounded-lg">
                            <span>數量:</span>
                            <input
                              type="number"
                              min="1"
                              value={draft.quantity}
                              onChange={(e) => handleEditDraftItem(draft.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-8 text-center font-mono focus:outline-none"
                            />
                          </div>

                          {/* 狀態切換 */}
                          <select
                            value={draft.status}
                            onChange={(e) => handleEditDraftItem(draft.id, 'status', e.target.value)}
                            className="bg-white border text-slate-700 px-2 py-0.5 rounded-lg focus:outline-none"
                          >
                            <option value="訂貨需求">📋 訂貨需求</option>
                            <option value="已下訂">📦 已下訂</option>
                            <option value="已到貨">🟢 已到貨</option>
                          </select>

                          {/* 分店個別選擇 */}
                          <select
                            value={draft.store}
                            onChange={(e) => handleEditDraftItem(draft.id, 'store', e.target.value)}
                            className="bg-white border text-slate-700 px-2 py-0.5 rounded-lg focus:outline-none ml-auto"
                          >
                            {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        {/* 底行：備註與交期 */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-bold border-t border-dashed border-slate-200 pt-2">
                          <div className="flex items-center space-x-1 font-mono">
                            <Calendar size={11} className="text-gray-400" />
                            <input
                              type="date"
                              value={draft.promiseDate}
                              onChange={(e) => handleEditDraftItem(draft.id, 'promiseDate', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full"
                            />
                          </div>
                          <div className="truncate text-slate-400 italic text-right" title={draft.notes}>
                            {draft.notes}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 批次匯入確認按鈕 */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                    <AlertCircle size={12} className="text-blue-500" />
                    <span>即將一次性安全寫入並同步至 Google Sheets</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchSubmit}
                    className="bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 px-6 rounded-2xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-md shadow-green-200/50 border border-green-600 text-xs focus:outline-none"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>確認匯入 (共 {parsedOrders.length} 筆)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
