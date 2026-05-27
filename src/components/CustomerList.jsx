import React, { useState } from 'react';
import { UserPlus, Search, Phone, MessageSquare, Calendar, Trash2, X, Plus } from 'lucide-react';

export default function CustomerList({ customers, onAddCustomer, onDeleteCustomer, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    lineId: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      alert('請填寫姓名與電話！');
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const customerData = {
      id: `cust_${Math.random().toString(36).substr(2, 9)}`,
      name: newCustomer.name.trim(),
      phone: newCustomer.phone.trim(),
      lineId: newCustomer.lineId.trim(),
      notes: newCustomer.notes.trim(),
      createdAt: todayStr
    };

    onAddCustomer(customerData);
    setNewCustomer({ name: '', phone: '', lineId: '', notes: '' });
    setIsAdding(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.lineId && c.lineId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canManage = currentUser.permissions && currentUser.permissions.includes('manage_orders');

  // 根據客戶姓名首字字元編碼，動態決定左側狀態條顏色 (天藍色、桃紅色交替，讓視覺更活潑)
  const getSidebarColor = (name) => {
    if (!name) return 'bg-[#3B82F6]';
    const charCode = name.charCodeAt(0);
    return charCode % 2 === 0 ? 'bg-[#F43F5E]' : 'bg-[#3B82F6]';
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative bg-slate-50/50 font-['Outfit',_'Inter',_sans-serif]">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <h1 className="text-xl font-black text-slate-800 tracking-wide font-['Outfit']">客戶關係維護</h1>
        <div className="w-8"></div> {/* 用於版面平衡 */}
      </div>

      {/* 搜尋欄 */}
      {!isAdding && (
        <div className="p-4 bg-white border-b border-slate-100">
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜尋客戶姓名、電話、LINE ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-xs bg-slate-50/50 font-bold"
            />
          </div>
        </div>
      )}

      {/* 新增客戶表單 */}
      {isAdding ? (
        <div className="p-5 space-y-4 animate-fade-in bg-white flex-1 font-['Outfit']">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-800">建立新客戶資料</h3>
            <button 
              onClick={() => setIsAdding(false)} 
              className="text-slate-400 p-1 border rounded-full bg-white hover:bg-slate-50 active:scale-90 transition-all shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">客戶姓名 *</label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="例如: 王大同"
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">聯絡電話 *</label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="例如: 0912-345-678"
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">LINE ID</label>
              <input
                type="text"
                value={newCustomer.lineId}
                onChange={(e) => setNewCustomer({ ...newCustomer, lineId: e.target.value })}
                placeholder="例如: money3c_line"
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">備註說明</label>
              <textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="輸入客戶喜好或重要事項備註..."
                className="block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 h-28 resize-none focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl text-xs active:scale-95 transition-all shadow-md"
              >
                儲存客戶資料
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-xl text-xs active:scale-95 transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 客戶名單卡片化呈現 (對齊 TaskList 樣式) */
        <div className="p-4 space-y-3.5 flex-1">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400 bg-white rounded-[24px] border border-slate-100 shadow-sm">
              <span className="text-4xl">👥</span>
              <p className="text-xs font-bold">目前尚無客戶資料</p>
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const sidebarColor = getSidebarColor(customer.name);
              return (
                <div 
                  key={customer.id}
                  className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/80 overflow-hidden flex relative hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  {/* 左側動態色彩狀態邊條 */}
                  <div className={`w-1 shrink-0 rounded-l-full ${sidebarColor}`}></div>

                  {/* 卡片主要內容 */}
                  <div className="p-4 flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        {/* 名字首字圓形徽章頭貼 */}
                        <div className="w-10 h-10 rounded-full bg-[#FCE7F3] flex items-center justify-center shrink-0 border border-pink-100 shadow-sm select-none">
                          <span className="text-sm font-black text-[#BE185D]">
                            {customer.name.substring(0, 1)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">{customer.name}</h4>
                          <p className="text-[9px] text-slate-400 font-mono">編號: {customer.id}</p>
                        </div>
                      </div>
                      
                      {canManage && (
                        <div className="action-btn">
                          <button
                            onClick={() => onDeleteCustomer(customer.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 聯絡資訊區與快捷動作按鈕 */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-[10px] text-slate-500 font-bold">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          <Phone size={12} className="text-slate-400" />
                          <span className="font-mono">{customer.phone}</span>
                        </div>
                        {customer.lineId && (
                          <div className="flex items-center space-x-1.5">
                            <MessageSquare size={12} className="text-slate-400" />
                            <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-blue-50 font-mono">
                              LINE: {customer.lineId}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          <span>加入日期: {customer.createdAt ? customer.createdAt.replace(/-/g, '/') : ''}</span>
                        </div>
                      </div>

                      {/* 電話、簡訊快捷撥號與發送 */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <a 
                          href={`tel:${customer.phone}`}
                          className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 active:scale-90 transition-all shadow-sm border border-blue-100"
                          title="撥打電話"
                        >
                          <Phone size={12} strokeWidth={2.5} />
                        </a>
                        <a 
                          href={`sms:${customer.phone}`}
                          className="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 active:scale-90 transition-all shadow-sm border border-rose-100"
                          title="發送簡訊"
                        >
                          <MessageSquare size={12} strokeWidth={2.5} />
                        </a>
                      </div>
                    </div>

                    {/* 顧客專屬備註 */}
                    {customer.notes && (
                      <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] text-slate-600 border border-slate-100 font-semibold italic">
                        📝 備註：{customer.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 桃紅色浮動新增客戶按鈕 (對齊設計圖 TaskList 樣式) */}
      {canManage && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-[#F43F5E] hover:bg-[#E11D48] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-90 z-40 border border-rose-400"
          title="新增客戶"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
