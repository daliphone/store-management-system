import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Phone, MessageSquare, Calendar, Smartphone, CheckCircle2, Clock, AlertTriangle, PenTool, RotateCcw, Check, Edit3 } from 'lucide-react';
import ManieIcon from './ManieIcon';
import { calculateOverdueDays, calculateRemainingDays } from './OrderList';

export default function OrderDetails({ order, currentUser, onClose, onEdit, onConfirmHandover }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // 載入時效設定
  const [alertSettings, setAlertSettings] = useState({ warningDays: 2, criticalDays: 7 });

  useEffect(() => {
    const cached = localStorage.getItem('store_mgmt_alert_settings');
    if (cached) {
      try {
        setAlertSettings(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  // 1. 初始化並自適應 Canvas 寬度
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && order.status !== '已交單' && order.status !== '已交機') {
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = 140;

        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [order.status]);

  if (!order) return null;

  const isHandedOver = order.status === '已交單' || order.status === '已交機';
  const overdueDays = calculateOverdueDays(order.promiseDate, order.status);
  const remainingDays = calculateRemainingDays(order.promiseDate, order.status);
  const isOverdue = !isHandedOver && overdueDays > 0;
  const isCriticalOverdue = isOverdue && overdueDays >= alertSettings.criticalDays;
  const isWarning = !isHandedOver && remainingDays <= alertSettings.warningDays && remainingDays >= 0;

  // 2. 決定剩餘時間與時效警示文字
  const getRemainingTimeBadge = () => {
    if (isHandedOver) {
      return (
        <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-full border border-blue-200 flex items-center space-x-1">
          <Check size={10} strokeWidth={3} />
          <span>交易完成</span>
        </span>
      );
    }
    if (isCriticalOverdue) {
      return (
        <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2.5 py-1 rounded-full border border-red-200 flex items-center space-x-1 animate-pulse-subtle">
          <AlertTriangle size={10} />
          <span>嚴重逾期 {overdueDays} 天</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="text-[10px] bg-orange-50 text-orange-700 font-extrabold px-2.5 py-1 rounded-full border border-orange-200 flex items-center space-x-1">
          <AlertTriangle size={10} />
          <span>逾期 {overdueDays} 天</span>
        </span>
      );
    }
    if (isWarning) {
      const hoursLeft = remainingDays === 0 ? 12 : remainingDays * 24;
      return (
        <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-2.5 py-1 rounded-full border border-amber-200 flex items-center space-x-1 font-mono">
          <Clock size={10} />
          <span>剩餘 {hoursLeft}:00</span>
        </span>
      );
    }
    
    // 時效正常
    return (
      <span className="text-[10px] bg-green-50 text-green-700 font-extrabold px-2.5 py-1 rounded-full border border-green-200 flex items-center space-x-1 font-mono">
        <Clock size={10} />
        <span>剩餘 {remainingDays * 24}:00</span>
      </span>
    );
  };

  // 3. 撥打電話與發送簡訊
  const handleMakeCall = () => {
    if (order.customerPhone) {
      window.open(`tel:${order.customerPhone}`);
    }
  };

  const handleSendSms = () => {
    if (order.customerPhone) {
      const smsBody = `您好！我是馬尼門市人員，您訂購的「${order.productName}」商品已到店。請您撥空攜帶雙證件來店辦理交機簽收，謝謝您！`;
      window.open(`sms:${order.customerPhone}?body=${encodeURIComponent(smsBody)}`);
    }
  };

  // 4. 手寫簽名板邏輯
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
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

  // 5. 確認簽收交機
  const handleHandoverSubmit = () => {
    if (!hasSigned || !canvasRef.current) return;
    const signatureBase64 = canvasRef.current.toDataURL('image/png');
    onConfirmHandover(order.id, signatureBase64);
  };

  // 6. 判斷是否有編輯權限
  const canEdit = currentUser.role === 'SUPER_ADMIN' || 
                  (currentUser.role === 'STORE_MANAGER' && order.store === currentUser.store) ||
                  currentUser.name === order.creator;

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto no-scrollbar animate-slide-up pb-28">
      {/* 頂部導覽列 */}
      <div className="sticky top-0 bg-[#E6EEFF] border-b border-blue-100 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 border border-dashed border-blue-300 rounded-full flex items-center justify-center text-blue-600 bg-white hover:bg-blue-50 active:scale-90 transition-all focus:outline-none"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-black text-blue-900 tracking-wide font-outfit">Order Details</h2>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-200 bg-white p-0.5 shadow-sm">
          <ManieIcon pose="welcome" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-4 space-y-4">
        
        {/* 1. 狀態與剩餘時間卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isHandedOver ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-xs text-gray-400 font-bold block leading-none">訂單狀態</span>
              <span className="text-base font-black text-gray-850 mt-1 block">{order.status}</span>
            </div>
          </div>
          <div>
            {getRemainingTimeBadge()}
          </div>
        </div>

        {/* 2. 顧客與門市資訊卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100/30">
                <span className="text-base">👤</span>
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-[16px] font-black text-gray-850">{order.customerName}</span>
                  <span className="text-xs text-gray-400 font-semibold">客戶</span>
                </div>
                <span className="text-xs text-gray-500 font-mono font-bold block mt-0.5">{order.customerPhone}</span>
              </div>
            </div>
            {/* 撥號與簡訊按鈕 */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleMakeCall}
                className="w-9 h-9 bg-blue-50 hover:bg-blue-100 active:scale-90 transition-all rounded-full flex items-center justify-center text-blue-600 border border-blue-100/50"
              >
                <Phone size={14} />
              </button>
              <button
                type="button"
                onClick={handleSendSms}
                className="w-9 h-9 bg-blue-50 hover:bg-blue-100 active:scale-90 transition-all rounded-full flex items-center justify-center text-blue-600 border border-blue-100/50"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[9px] bg-slate-50 border border-slate-200/60 text-slate-600 font-black px-2 py-0.5 rounded-md">
              來源: {order.source || '門市'}
            </span>
            <span className="text-[9px] bg-slate-50 border border-slate-200/60 text-slate-600 font-black px-2 py-0.5 rounded-md">
              門市: {order.store}
            </span>
          </div>
        </div>

        {/* 3. 商品與標籤卡片 */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 flex items-center space-x-3.5 relative">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0 shadow-inner">
            <Smartphone size={28} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h3 className="text-sm font-black text-gray-800 leading-tight pr-8">{order.productName}</h3>
            <div className="flex items-baseline space-x-1">
              <span className="text-xs font-mono font-black text-blue-600">
                NT$ {order.price ? order.price.toLocaleString() : '0'}
              </span>
            </div>
            {/* 標籤雲 */}
            {order.tags && order.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {order.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[8px] bg-blue-50/50 border border-blue-100 text-blue-600 font-extrabold px-1.5 py-0.25 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* 數量 */}
          <div className="absolute right-4 top-4 bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[10px] font-black text-slate-500 font-mono">
            x{order.quantity || 1}
          </div>
        </div>

        {/* 4. 物流追蹤垂直時間軸 (Timeline) */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 relative overflow-hidden">
          <h3 className="text-xs text-gray-400 font-bold mb-4">物流追蹤</h3>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:border-l before:border-dashed before:border-slate-250">
            {/* 1. 訂單成立 */}
            <div className="relative">
              <span className="absolute left-[-23px] top-1.5 w-3.5 h-3.5 rounded-full border border-slate-400 bg-slate-400 z-10"></span>
              <div>
                <h4 className="text-[12px] font-black text-gray-800 leading-none">訂單成立</h4>
                <p className="text-[10px] text-gray-400 font-mono font-semibold mt-1">
                  {order.createdAt} 12:00
                </p>
              </div>
            </div>

            {/* 2. 商品已到店 */}
            <div className="relative">
              <span className={`absolute left-[-23px] top-1.5 w-3.5 h-3.5 rounded-full border z-10 ${
                order.status === '已到貨' || isHandedOver
                  ? 'border-green-500 bg-green-500'
                  : 'border-slate-300 bg-slate-350'
              }`}></span>
              <div>
                <h4 className={`text-[12px] font-black leading-none ${
                  order.status === '已到貨' || isHandedOver ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  商品已到店
                </h4>
                {(order.status === '已到貨' || isHandedOver) && (
                  <p className="text-[10px] text-gray-400 font-mono font-semibold mt-1">
                    {order.createdAt} 18:30 (到店點收)
                  </p>
                )}
              </div>
            </div>

            {/* 3. 等待顧客交機 / 客戶已簽收 */}
            <div className="relative">
              <span className={`absolute left-[-23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 z-10 ${
                isHandedOver
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-blue-400 bg-white'
              }`}></span>
              <div>
                <h4 className={`text-[12px] font-black leading-none ${
                  isHandedOver ? 'text-gray-800' : 'text-blue-500'
                }`}>
                  {isHandedOver ? '客戶已簽收' : '等待顧客交機'}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono font-semibold mt-1">
                  {isHandedOver ? `已交機歸檔` : `承諾日期: ${order.promiseDate}`}
                </p>
              </div>
            </div>
          </div>

          {/* 右下角 Manie 插圖 */}
          <div className="absolute right-2 bottom-0 w-20 h-16 opacity-90 pointer-events-none select-none">
            <ManieIcon pose="thinking" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
        </div>

        {/* 5. 顧客簽收區 (手寫簽名板) */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/80 space-y-2">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs text-gray-800 font-extrabold flex items-center space-x-1">
              <PenTool size={13} />
              <span>顧客簽收區</span>
            </h3>
            {!isHandedOver && hasSigned && (
              <button
                type="button"
                onClick={clearSignature}
                className="text-[10px] text-red-500 font-black flex items-center space-x-0.5 active:scale-95"
              >
                <RotateCcw size={9} />
                <span>清除重簽</span>
              </button>
            )}
          </div>

          {/* 渲染簽名板或唯讀存檔 */}
          {!isHandedOver ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-slate-350 bg-slate-50/50 h-[140px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 cursor-crosshair w-full h-[140px]"
              />
              {!hasSigned && (
                <div className="pointer-events-none text-[11px] text-slate-400 font-extrabold flex items-center space-x-1 select-none">
                  <PenTool size={11} />
                  <span>請在此處手寫簽名</span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-150 bg-slate-50/20 p-2.5 flex flex-col items-center justify-center h-[140px]">
              {order.signature ? (
                <img src={order.signature} alt="客戶電子簽章" className="max-h-[120px] object-contain max-w-full" />
              ) : (
                <span className="text-[10px] text-gray-400 italic">本單已完成，但未留下手寫簽章紀錄</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部固定操作按鈕列 (僅在未交單時顯示，已交單隱藏) */}
      {!isHandedOver && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-slate-100 p-4 flex space-x-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.03)] z-30">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 border border-blue-200 text-blue-600 bg-blue-50/30 hover:bg-blue-50/70 font-extrabold py-3.5 rounded-2xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all text-xs focus:outline-none"
            >
              <Edit3 size={14} />
              <span>編輯訂單</span>
            </button>
          )}
          <button
            type="button"
            disabled={!hasSigned}
            onClick={handleHandoverSubmit}
            className={`flex-[1.5] py-3.5 rounded-2xl font-extrabold flex items-center justify-center space-x-1.5 active:scale-95 transition-all text-xs focus:outline-none ${
              hasSigned
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200/50'
                : 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            <Check size={14} strokeWidth={3} />
            <span>確認交機 / 簽收</span>
          </button>
        </div>
      )}
    </div>
  );
}
