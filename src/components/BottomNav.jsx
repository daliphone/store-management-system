import React from 'react';
import { Home, Package, ClipboardCheck, CheckSquare, Users, Search } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: '首頁', icon: Home },
    { id: 'orders', label: '訂單', icon: Package },
    { id: 'tasks', label: '任務', icon: ClipboardCheck },
    /* { 
      id: 'checkin', 
      label: '打卡', 
      icon: CheckSquare,
      customStyle: 'text-green-500'
    }, */
    { id: 'customers', label: '客戶', icon: Users },
    { id: 'query', label: '查詢', icon: Search }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-gray-200 py-2 px-3 flex justify-around items-center z-50 shadow-lg rounded-t-2xl">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center w-12 py-1 relative focus:outline-none transition-all duration-200 active:scale-95"
          >
            <div className={`p-1 rounded-xl transition-all duration-300 ${
              isActive 
                ? 'text-blue-500 scale-110' 
                : tab.id === 'checkin' 
                  ? 'text-green-600' 
                  : 'text-gray-400'
            }`}>
              <IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${
              isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute -top-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse-subtle"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
