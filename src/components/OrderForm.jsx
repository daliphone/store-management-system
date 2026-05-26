import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, PenTool, RotateCcw } from 'lucide-react';
import { STORES } from '../mockData';

export default function OrderForm({ currentUser, onSave, onClose }) {
  const [formData, setFormData] = useState({
    type: '訂貨',
    store: currentUser.store !== '全分店' ? currentUser.store : '東門店',
    customerName: '',
    customerPhone: '',
    source: '門市',
    productName: '',
    tags: [],
    quantity: 1,
    price: 0,
    cost: 0,
    promiseDate: '',
    notes: '',
    contactNotes: '',
    agreement: false
  });

  // 簽名板相關
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    // 設定預設承諾日期為今天
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setFormData(prev => ({ ...prev, promiseDate: `${yyyy}-${mm}-${dd}` }));

    // 初始化 Canvas 繪圖設定
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  // 處理核取方塊的標籤切換
  const handleTagToggle = (tag) => {
    setFormData(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  // 繪圖事件處理 (滑鼠與觸控)
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // 判斷是否為觸控事件
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSigned(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  };

  // 提交表單
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      alert('請填寫客戶姓名');
      return;
    }
    if (!formData.customerPhone.trim()) {
      alert('請填寫客戶電話');
      return;
    }
    if (!formData.productName.trim()) {
      alert('請填寫商品與承諾內容');
      return;
    }

    // 取得簽名 Base64
    let signatureDataUrl = '';
    if (hasSigned && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newOrder = {
      id: `ord_${Math.random().toString(36).substr(2, 9)}`,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      productName: formData.productName,
      type: formData.type,
      store: formData.store,
      creator: currentUser.name,
      source: formData.source,
      tags: formData.tags,
      quantity: Number(formData.quantity) || 1,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
      status: '未到貨',
      createdAt: todayStr,
      promiseDate: formData.promiseDate,
      overdueDays: 0,
      signature: signatureDataUrl,
      notes: formData.notes
    };

    onSave(newOrder);
  };

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-50 overflow-y-auto no-scrollbar animate-slide-up pb-10">
      {/* 頂部導航 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm z-10">
        <button type="button" onClick={onClose} className="text-gray-500 font-semibold text-sm px-2 py-1">
          取消
        </button>
        <h2 className="text-base font-bold text-gray-800">新增訂單/承諾</h2>
        <button
          type="button"
          onClick={handleSubmit}
          className="text-blue-500 font-extrabold text-sm px-2 py-1 active:scale-95"
        >
          送出
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* 類型與門市 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">類型 *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50"
            >
              <option value="訂貨">訂貨</option>
              <option value="預約">預約</option>
              <option value="維修">維修</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">門市 *</label>
            <select
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              disabled={!(currentUser.permissions && currentUser.permissions.includes('view_all_stores'))}
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {currentUser.permissions && currentUser.permissions.includes('view_all_stores') ? (
                STORES.map(s => <option key={s} value={s}>{s}</option>)
              ) : (
                <option value={currentUser.store}>{currentUser.store}</option>
              )}
            </select>
          </div>
        </div>

        {/* 姓名與電話 */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">客戶姓名 *</label>
            <input
              type="text"
              placeholder="例:王先生"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              required
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">客戶電話 *</label>
            <input
              type="tel"
              placeholder="0912-345-678"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              required
            />
          </div>
        </div>

        {/* 客戶來源 */}
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">客戶來源 *</label>
          <select
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50"
          >
            <option value="門市">門市</option>
            <option value="網路粉專">網路粉專</option>
            <option value="LINE官方">LINE官方</option>
            <option value="二手機收購">二手機收購</option>
            <option value="親友介紹">親友介紹</option>
          </select>
        </div>

        {/* 商品內容 */}
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">商品與承諾內容 *</label>
          <textarea
            placeholder="例: iPhone 16 黑色 256G"
            value={formData.productName}
            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs h-20 resize-none"
            required
          />
        </div>

        {/* 客戶標籤 (可複選核取方塊) */}
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-2">客戶標籤 (可複選)</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              '專案機', '非專案機',
              '門號攜碼', '新辦門號',
              '門號續約', '單購購買',
              '配件加購', '🏆 L標', '🏆 Z標', '🏆 平績'
            ].map((tag) => {
              const isChecked = formData.tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`flex items-center space-x-2 p-2 rounded-lg border text-left text-[11px] font-semibold transition-all ${
                    isChecked
                      ? 'border-blue-500 bg-blue-50/40 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                  />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 數量、單價、成本 */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">數量</label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">單價</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold block mb-1">成本</label>
            <input
              type="number"
              min="0"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
              className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            />
          </div>
        </div>

        {/* 預計交貨日 */}
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">預計交貨日 *</label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Calendar size={14} />
            </div>
            <input
              type="date"
              value={formData.promiseDate}
              onChange={(e) => setFormData({ ...formData, promiseDate: e.target.value })}
              className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              required
            />
          </div>
        </div>

        {/* 客戶切結書同意 */}
        <div className="flex items-start space-x-2 pt-1">
          <input
            id="agreement"
            type="checkbox"
            checked={formData.agreement}
            onChange={(e) => setFormData({ ...formData, agreement: e.target.checked })}
            className="mt-1 h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="agreement" className="text-[11px] text-gray-500 font-medium leading-relaxed select-none">
            客戶切結同意書：本人已確認上述申辦商品、數量與門號合約內容正確無誤，並同意進行備貨及建單。
          </label>
        </div>

        {/* 線上簽名板 */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs text-gray-500 font-semibold flex items-center space-x-1">
              <PenTool size={14} />
              <span>客戶與提單人員簽名</span>
            </label>
            {hasSigned && (
              <button
                type="button"
                onClick={clearSignature}
                className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center space-x-0.5 active:scale-95 transition-transform"
              >
                <RotateCcw size={10} />
                <span>清除重簽</span>
              </button>
            )}
          </div>
          
          <div className="relative overflow-hidden rounded-xl">
            <canvas
              ref={canvasRef}
              width={440}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="signature-pad w-full h-[140px] border border-gray-200 bg-gray-50/50 shadow-inner rounded-xl"
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 text-xs font-semibold">
                在此區域手寫或滑鼠拖曳簽名
              </div>
            )}
          </div>
        </div>

        {/* 備註 */}
        <div>
          <label className="text-xs text-gray-500 font-semibold block mb-1">備註說明</label>
          <textarea
            placeholder="請輸入此單的其他補充備註（非必填）..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs h-16 resize-none"
          />
        </div>
      </form>
    </div>
  );
}
