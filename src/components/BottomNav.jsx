import React from 'react';
import { Home, Package, ClipboardCheck, Users, Search, Settings, TrendingUp } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, currentUser }) {
  const canManage = currentUser && currentUser.permissions && currentUser.permissions.includes('manage_accounts');
  
  const tabs = [
    { id: 'home', label: '首頁', icon: Home },
    { id: 'orders', label: '訂單', icon: Package },
    { id: 'tasks', label: '任務', icon: ClipboardCheck },
  ];

  if (currentUser && currentUser.store !== '電商部') {
    tabs.push({ id: 'performance', label: '業績', icon: TrendingUp });
  }

  tabs.push(
    { id: 'customers', label: '客戶', icon: Users },
    { id: 'query', label: '查詢', icon: Search }
  );

  if (canManage) {
    tabs.push({ id: 'admin', label: '管理', icon: Settings });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-slate-100 py-2 px-3 flex justify-around items-center z-50 shadow-lg rounded-t-2xl">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 relative focus:outline-none transition-all duration-200 active:scale-95 ${tabs.length > 5 ? 'w-10' : 'w-12'}`}
          >
            <div className={`p-1 rounded-xl transition-all duration-300 ${
              isActive 
                ? 'text-rose-500 scale-110' 
                : tab.id === 'checkin' 
                  ? 'text-green-600' 
                  : 'text-gray-400'
            }`}>
              <IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${
              isActive ? 'text-rose-600 font-extrabold' : 'text-gray-500'
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse-subtle"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
