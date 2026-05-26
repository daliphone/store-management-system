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

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 tracking-wide">客戶關係維護</h1>
        {canManage && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl text-xs active:scale-95 transition-all font-semibold"
          >
            <UserPlus size={14} />
            <span>新增客戶</span>
          </button>
        )}
      </div>

      {/* 搜尋欄 */}
      {!isAdding && (
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜尋客戶姓名、電話、LINE ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs bg-gray-50/50"
            />
          </div>
        </div>
      )}

      {/* 新增客戶表單 */}
      {isAdding ? (
        <div className="p-5 space-y-4 animate-fade-in bg-white flex-1">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-800">建立新客戶資料</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 p-1">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">客戶姓名 *</label>
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="例如: 王大同"
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">聯絡電話 *</label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="例如: 0912-345-678"
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">LINE ID</label>
              <input
                type="text"
                value={newCustomer.lineId}
                onChange={(e) => setNewCustomer({ ...newCustomer, lineId: e.target.value })}
                placeholder="例如: money3c_line"
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">備註說明</label>
              <textarea
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                placeholder="輸入客戶喜好或重要事項備註..."
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs h-24 resize-none"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all shadow-md"
              >
                儲存客戶資料
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl text-xs active:scale-95 transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 客戶名單 */
        <div className="p-4 space-y-3 flex-1">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 text-gray-400">
              <span className="text-4xl">👥</span>
              <p className="text-xs font-semibold">尚無客戶資料</p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div 
                key={customer.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {customer.name.substring(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">{customer.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">編號: {customer.id}</p>
                    </div>
                  </div>
                  
                  {canManage && (
                    <button
                      onClick={() => onDeleteCustomer(customer.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium border-t border-gray-50 pt-2.5">
                  <div className="flex items-center space-x-1">
                    <Phone size={12} className="text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.lineId && (
                    <div className="flex items-center space-x-1">
                      <MessageSquare size={12} className="text-gray-400" />
                      <span>LINE: {customer.lineId}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 col-span-2">
                    <Calendar size={12} className="text-gray-400" />
                    <span>加入日期: {customer.createdAt}</span>
                  </div>
                </div>

                {customer.notes && (
                  <div className="bg-gray-50 p-2.5 rounded-xl text-[10px] text-gray-600 border border-gray-100 italic">
                    {customer.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
