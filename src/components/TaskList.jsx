import React, { useState } from 'react';
import { Settings, Award, Plus, Trash2, Edit2, X, Camera, Check, AlertTriangle, Eye, Info, CheckSquare, ClipboardCheck } from 'lucide-react';
import Modal from './Modal';
import ManieIcon from './ManieIcon';
import { STORES } from '../mockData';

export default function TaskList({ 
  tasks, 
  currentUser, 
  users, 
  onToggleTask, 
  onUpdateTasks, 
  onOpenSettings,
  tasksStoreFilter,
  setTasksStoreFilter,
  petStats,
  mCoins,
  orders = [],
  onUpdateOrderStatus,
  onViewDetails
}) {
  // 管理者訂單分組展開狀態與狀態更新暫存
  const [expandedStores, setExpandedStores] = useState({ '電商部': true });
  const [statusUpdatingOrder, setStatusUpdatingOrder] = useState(null);
  const getMascotPose = () => {
    if (!petStats || !petStats.pet) return "tablet";
    const hp = petStats.pet.hp || 0;
    if (hp <= 0) return "sleep";
    if (hp <= 20) return "sweat";
    if (petStats.pet.level >= 5) return "great";
    return "tablet";
  };
  const mascotPose = getMascotPose();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pendingCancelTaskId, setPendingCancelTaskId] = useState(null);
  
  // 任務執行回報彈窗狀態
  const [reportingTask, setReportingTask] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  
  // 照片放大預覽狀態
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');
  const [selectedStore, setSelectedStore] = useState(() => {
    return currentUser.store !== '全分店' ? currentUser.store : '東門店';
  });

  // 監聽來自首頁的跳轉分店過濾請求，更新完畢後自動重置以利之後自由切換分店
  React.useEffect(() => {
    if (tasksStoreFilter) {
      setSelectedStore(tasksStoreFilter);
      if (setTasksStoreFilter) {
        setTasksStoreFilter('');
      }
    }
  }, [tasksStoreFilter, setTasksStoreFilter]);

  // 新增與編輯日常任務狀態
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    text: '',
    score: 10,
    tag: '每日執行',
    assignType: '所有人',
    assignedTo: ''
  });

  // 行動端返回鍵優化 (TaskList 彈窗層級控制)
  const [taskListPopupCount, setTaskListPopupCount] = useState(0);

  React.useEffect(() => {
    const opened = [isAdding, editingTask !== null].filter(Boolean).length;
    if (opened > taskListPopupCount) {
      window.history.pushState({ taskPopup: opened }, '');
      setTaskListPopupCount(opened);
    } else if (opened < taskListPopupCount) {
      if (window.history.state && window.history.state.taskPopup && window.history.state.taskPopup > opened) {
        window.history.back();
      }
      setTaskListPopupCount(opened);
    }
  }, [isAdding, editingTask, taskListPopupCount]);

  React.useEffect(() => {
    const handlePopState = (e) => {
      if (isAdding) {
        setIsAdding(false);
      } else if (editingTask) {
        setEditingTask(null);
      }
      const remaining = [isAdding, editingTask !== null].filter(Boolean).length - 1;
      setTaskListPopupCount(Math.max(0, remaining));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, editingTask]);

  // 篩選當前分店可指派的同仁 (排除 SuperAdmin 與 Auditor)
  const storeUsers = (users || []).filter(u => {
    if (u.role === 'SUPER_ADMIN' || u.role === 'AUDITOR') return false;
    if (hasAllStoresPerm) {
      return u.store === selectedStore;
    }
    return u.store === currentUser.store;
  });

  // 根據分店篩選任務
  const storeFilteredTasks = tasks.filter(t => {
    if (hasAllStoresPerm) {
      return t.store === selectedStore;
    }
    return t.store === currentUser.store;
  });

  // 任務過濾與指派對象權限判定
  const displayedTasks = storeFilteredTasks.filter(t => {
    // 如果是電商部，排除五大項常規店務任務
    const currentViewStore = hasAllStoresPerm ? selectedStore : currentUser.store;
    if (currentViewStore === '電商部') {
      const isFiveDefaultTask = 
        (t.text && t.text.startsWith('開店-儀容自檢')) || 
        t.text === '開店-環境清掃' || 
        t.text === '營業-零用金確認' || 
        t.text === '營業-隨機盤點庫存' || 
        t.text === '閉店-庫存表上傳';
      if (isFiveDefaultTask) return false;
    }

    // 1. 舊有儀容自檢過濾
    if (t.text && t.text.startsWith('開店-儀容自檢 (')) {
      const nameMatch = t.text.match(/開店-儀容自檢 \((.+)\)/);
      if (nameMatch) {
        const userName = nameMatch[1];
        if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER') {
          return true;
        }
        return currentUser.name === userName;
      }
    }
    
    // 2. 指派對象為個人過濾 (一般店員只能看見指派給自己的任務，主管/稽核能檢視全部)
    if (t.assignType === '個人' && t.assignedTo) {
      if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR' || currentUser.role === 'STORE_MANAGER') {
        return true;
      }
      return currentUser.name === t.assignedTo;
    }
    
    return true;
  });

  // 計算進度與分數
  const totalTasksCount = displayedTasks.length;
  const completedTasksCount = displayedTasks.filter(t => t.completed).length;
  const totalScore = displayedTasks.reduce((sum, t) => sum + (t.completed ? t.score : 0), 0);

  // 排序：未完成的排在前面，已完成的排在後面
  const sortedTasks = [...displayedTasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // 判斷是否有管理日常任務權限 (店長以上，或電商部人員)
  const canManageTasks = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_MANAGER' || currentUser.store === '電商部';

  // 根據任務屬性決定標籤與狀態
  const getTaskMeta = (task) => {
    const text = task.text || '';
    const isPersonal = task.assignType === '個人' || text.includes('自檢') || text.includes('個人') || text.includes('儀容');
    
    // 📸 拍照標記 (自檢、陳列、環境等需要拍照)
    const needsPhoto = text.includes('拍照') || text.includes('環境') || text.includes('自檢') || text.includes('儀容') || text.includes('陳列') || text.includes('盤點');
    
    // $ 金額標記
    const needsAmount = text.includes('金額') || text.includes('零用金') || text.includes('盤點') || text.includes('現金') || text.includes('盤點現金');
    
    // 逾期標記
    const isOverdue = task.overdue;
    
    // 時間標記
    let timeStr = '';
    if (text.includes('早班') || text.includes('開店') || text.includes('陳列')) timeStr = '10:00 AM';
    else if (text.includes('晚班') || text.includes('關店') || text.includes('下班')) timeStr = '09:30 PM';
    
    let title = text;
    let subtitle = '請依門市標準作業流程確實執行並回報。';
    
    if (text.startsWith('開店-儀容自檢')) {
      const nameMatch = text.match(/開店-儀容自檢 \((.+)\)/);
      const name = nameMatch ? nameMatch[1] : '';
      title = `開店-儀容自檢 (${name})`;
      subtitle = '確認服裝儀容整潔，配戴識別證與微笑迎客。';
    }
    
    // 決定左側狀態邊條顏色
    let sideBarClass = 'bg-[#3B82F6]'; // 預設藍色
    if (needsPhoto && !isOverdue) {
      sideBarClass = 'bg-[#F43F5E]'; // 拍照桃紅
    } else if (isOverdue) {
      sideBarClass = 'bg-[#F59E0B]'; // 逾期黃色
    }
    
    return {
      isPersonal,
      needsPhoto,
      needsAmount,
      isOverdue,
      timeStr,
      title,
      subtitle,
      sideBarClass
    };
  };

  // 處理核取方塊點擊
  const handleCheckboxChange = (task, e) => {
    if (e.target.closest('.action-btn')) return;
    if (e.target.closest('.photo-preview-trigger')) return;

    if (!task.completed) {
      setReportingTask(task);
      setPhoto(null);
      setNotes('');
      setCashAmount('');
    } else {
      const perms = currentUser.permissions || [];
      if (perms.includes('cancel_tasks_directly')) {
        onToggleTask(task.id, false, null);
      } else {
        setPendingCancelTaskId(task.id);
        setCancelModalOpen(true);
      }
    }
  };

  const confirmCancel = () => {
    if (pendingCancelTaskId) {
      onToggleTask(pendingCancelTaskId, false, null);
    }
    setCancelModalOpen(false);
    setPendingCancelTaskId(null);
  };

  const cancelCancel = () => {
    setCancelModalOpen(false);
    setPendingCancelTaskId(null);
  };

  const triggerCamera = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const inputEl = document.getElementById('reporting-camera-input');
    if (inputEl) {
      inputEl.click();
    }
  };

  const handleCameraChange = (e) => {
    if (!e.target || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!reportingTask) return;

    const isPhotoRequired = reportingTask.text.includes('儀容') || 
                            reportingTask.text.includes('環境') || 
                            reportingTask.text.includes('盤點');
    const isCashRequired = reportingTask.text.includes('零用金');

    if (isPhotoRequired && !photo) {
      alert('此項目必須啟動相機拍照回報！');
      return;
    }

    if (isCashRequired && !cashAmount.trim()) {
      alert('請填寫零用金實際盤點金額！');
      return;
    }

    let finalNotes = notes.trim();
    if (isCashRequired) {
      finalNotes = `盤點金額: ${cashAmount} 元` + (finalNotes ? `，備註: ${finalNotes}` : '');
    }

    onToggleTask(reportingTask.id, true, currentUser.name, photo, finalNotes);
    
    setReportingTask(null);
    setPhoto(null);
    setNotes('');
    setCashAmount('');
  };

  // 新增任務提交
  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.text.trim()) {
      alert('請填寫任務內容！');
      return;
    }
    if (taskForm.assignType === '個人' && !taskForm.assignedTo) {
      alert('請選擇被指派的同仁！');
      return;
    }

    const newTask = {
      id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
      store: hasAllStoresPerm ? selectedStore : currentUser.store,
      text: taskForm.text.trim(),
      score: Number(taskForm.score) || 10,
      completed: false,
      completedAt: null,
      completedBy: null,
      photo: null,
      notes: null,
      tag: taskForm.tag || '每日執行',
      assignType: taskForm.assignType || '所有人',
      assignedTo: taskForm.assignType === '個人' ? taskForm.assignedTo : null
    };

    const updatedTasks = [...tasks, newTask];
    onUpdateTasks(updatedTasks);
    setIsAdding(false);
    setTaskForm({ text: '', score: 10, tag: '每日執行', assignType: '所有人', assignedTo: '' });
  };

  // 編輯任務提交
  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.text.trim()) {
      alert('請填寫任務內容！');
      return;
    }
    if (taskForm.assignType === '個人' && !taskForm.assignedTo) {
      alert('請選擇被指派的同仁！');
      return;
    }

    const updatedTasks = tasks.map(t => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          text: taskForm.text.trim(),
          score: Number(taskForm.score) || 10,
          tag: taskForm.tag || '每日執行',
          assignType: taskForm.assignType || '所有人',
          assignedTo: taskForm.assignType === '個人' ? taskForm.assignedTo : null
        };
      }
      return t;
    });

    onUpdateTasks(updatedTasks);
    setEditingTask(null);
    setTaskForm({ text: '', score: 10, tag: '每日執行', assignType: '所有人', assignedTo: '' });
  };

  // 刪除任務
  const handleDeleteTask = (taskId) => {
    if (window.confirm('確定要刪除此日常任務嗎？')) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      onUpdateTasks(updatedTasks);
    }
  };

  const handleEditClick = (task) => {
    setEditingTask(task);
    setTaskForm({
      text: task.text,
      score: task.score,
      tag: task.tag || '每日執行',
      assignType: task.assignType || '所有人',
      assignedTo: task.assignedTo || ''
    });
  };

  const isAdminView = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR';
  
  // 管理者訂單分組與統計邏輯
  const pendingOrders = (orders || []).filter(o => o.status !== '已交單' && o.status !== '已交機');
  const totalNeedsCount = pendingOrders.length;
  const ecommNeeds = pendingOrders.filter(o => o.store === '電商部');
  const ecommNeedsCount = ecommNeeds.length;
  const otherNeedsCount = totalNeedsCount - ecommNeedsCount;
  
  // 依門市分組
  const storeGroups = {};
  STORES.forEach(s => {
    storeGroups[s] = [];
  });
  pendingOrders.forEach(o => {
    if (storeGroups[o.store]) {
      storeGroups[o.store].push(o);
    } else {
      storeGroups[o.store] = [o];
    }
  });
  
  // 排序門市：電商部置頂，接著是其他有需求的分店
  const sortedStoresForAdmin = ['電商部', ...STORES.filter(s => s !== '電商部' && storeGroups[s] && storeGroups[s].length > 0)];
  
  const toggleStoreExpand = (storeName) => {
    setExpandedStores(prev => ({
      ...prev,
      [storeName]: !prev[storeName]
    }));
  };

  const handleConfirmStatusChange = (status) => {
    if (statusUpdatingOrder && onUpdateOrderStatus) {
      onUpdateOrderStatus(statusUpdatingOrder.id, status);
    }
    setStatusUpdatingOrder(null);
  };

  const getRemainingDays = (promiseDate, status) => {
    if (!promiseDate || status === '已交單' || status === '已交機') return 999;
    const promise = new Date(promiseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = promise - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getOverdueDays = (promiseDate, status) => {
    if (!promiseDate || status === '已交單' || status === '已交機') return 0;
    const promise = new Date(promiseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today > promise) {
      const diffTime = today - promise;
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative bg-slate-50/50 font-['Outfit',_'Inter',_sans-serif]">
      {!isAdminView ? (
        <>
          {/* 頂部標題 */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 tracking-wide font-['Outfit']">店務任務</h1>
              <div className="mt-1 flex items-center space-x-1 text-rose-600 font-extrabold text-xs">
                <span className="material-symbols-outlined text-[14px] fill-1 text-rose-500 mr-0.5">storefront</span>
                {hasAllStoresPerm ? (
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="bg-transparent border-none text-rose-600 text-xs font-extrabold focus:outline-none focus:ring-0 p-0 cursor-pointer"
                  >
                    {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span>{currentUser.store}</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenSettings}
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-full transition-all border border-slate-100 active:scale-90"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* 新增或編輯任務表單 (內置頁面) */}
          {(isAdding || editingTask) ? (
            <div className="p-5 bg-white flex-1 animate-fade-in space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-black text-sm text-gray-800 font-['Outfit']">
                  {isAdding ? '新增門市日常任務' : '編輯日常任務內容'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingTask(null);
                  }} 
                  className="text-gray-400 p-1 border rounded-full hover:bg-gray-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={isAdding ? handleAddTaskSubmit : handleEditTaskSubmit} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">任務內容說明 *</label>
                  <textarea
                    value={taskForm.text}
                    onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                    placeholder="例如: 清潔櫃台桌面、協助新機配備等作業細節..."
                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs h-20 resize-none focus:ring-1 focus:ring-rose-500 focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1">完成所得積分 (1-50分) *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={taskForm.score}
                    onChange={(e) => setTaskForm({ ...taskForm, score: parseInt(e.target.value) || 10 })}
                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none font-bold"
                    required
                  />
                </div>

                {/* 任務分類標籤 */}
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1.5">任務分類標籤</label>
                  <div className="flex space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {(currentUser.store === '電商部' ? ['交辦事項', '交接事項'] : ['每日執行', '交辦事項', '交接事項']).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTaskForm({ ...taskForm, tag: t })}
                        className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all active:scale-95 ${
                          taskForm.tag === t
                            ? 'bg-rose-500 text-white shadow-sm font-black'
                            : 'bg-white text-gray-600 border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {t === '每日執行' ? '📅 每日執行' : t === '交辦事項' ? '📌 交辦事項' : '🔄 交接事項'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 指派對象選擇 */}
                <div>
                  <label className="text-xs text-gray-500 font-bold block mb-1.5">指派對象</label>
                  <div className="flex space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {[
                      { id: '所有人', label: '👥 所有人 (全員可見)' },
                      { id: '個人', label: '👤 個人 (專屬指派)' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const defaultUser = storeUsers[0] ? storeUsers[0].name : '';
                          setTaskForm({ ...taskForm, assignType: opt.id, assignedTo: opt.id === '個人' ? defaultUser : '' });
                        }}
                        className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all active:scale-95 ${
                          taskForm.assignType === opt.id
                            ? 'bg-rose-500 text-white shadow-sm font-black'
                            : 'bg-white text-gray-600 border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 指派特定同仁 (當對象為個人時) */}
                {taskForm.assignType === '個人' && (
                  <div className="animate-fade-in">
                    <label className="text-xs text-gray-500 font-bold block mb-1">指派特定同仁 *</label>
                    <select
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-white font-bold text-slate-800 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                      required
                    >
                      <option value="">-- 請選擇同仁 --</option>
                      {storeUsers.map(u => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.roleLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl text-xs active:scale-95 transition-all shadow-md"
                  >
                    儲存任務
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingTask(null);
                    }}
                    className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-bold py-3.5 rounded-xl text-xs active:scale-95 transition-all"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* 今日進度卡片 */}
              <div className="p-4 bg-white border-b border-slate-100">
                <div className="bg-gradient-to-br from-pink-50/70 to-pink-100/40 rounded-[28px] border border-pink-100/50 p-4 shadow-sm flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2.5">
                      {/* 圓形頭貼 */}
                      <div className="w-10 h-10 rounded-full bg-[#FCE7F3] flex items-center justify-center shrink-0 border border-pink-100 shadow-sm">
                        <span className="text-xs font-black text-[#BE185D] font-mono">
                          {currentUser?.name ? currentUser.name.slice(-2) : '同仁'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-550 font-bold">今日進度</span>
                        <span className="text-xs font-black text-slate-800">
                          <span className="text-sm font-black text-rose-600 font-mono">{completedTasksCount} / {totalTasksCount}</span> 任務完成
                        </span>
                      </div>
                    </div>
                    
                    {/* 積分與 M幣膠囊 */}
                    <div className="flex flex-wrap gap-1.5">
                      <div className="inline-flex items-center space-x-1.5 border border-rose-200 bg-white text-rose-600 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                        <span className="text-amber-500 text-xs">★</span>
                        <span>本月積分: {totalScore || 1250}</span>
                      </div>
                      {mCoins !== undefined && (
                        <div className="inline-flex items-center space-x-1.5 border border-yellow-200 bg-white text-yellow-600 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                          <span className="text-yellow-500 text-xs">🪙</span>
                          <span>M幣: {mCoins}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 右側貓咪吉祥物背景 */}
                  <div className="relative w-16 h-16 rounded-full bg-pink-100/50 border border-pink-200/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <div className="absolute bottom-[-8px]">
                      <ManieIcon pose={mascotPose} group="auto" className="w-16 h-12 scale-110" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 待辦事項 (未完成日常任務) */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center px-1 text-sm font-black text-slate-800">
                  <span>待辦事項</span>
                  <span className="text-xs bg-rose-50 text-rose-600 font-extrabold px-2.5 py-1 rounded-full">
                    {totalTasksCount - completedTasksCount} 項未完成
                  </span>
                </div>

                {displayedTasks.filter(t => !t.completed).length === 0 ? (
                  <div className="bg-white rounded-[24px] border border-slate-100 p-8 text-center text-xs text-slate-500 font-bold shadow-sm">
                    🎉 太棒了！目前沒有待辦店務任務
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedTasks.filter(t => !t.completed).map(task => {
                      const {
                        isPersonal,
                        needsPhoto,
                        needsAmount,
                        isOverdue,
                        timeStr,
                        title,
                        subtitle,
                        sideBarClass
                      } = getTaskMeta(task);

                      return (
                        <div
                          key={task.id}
                          onClick={(e) => handleCheckboxChange(task, e)}
                          className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/80 overflow-hidden flex relative hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] active:bg-slate-50/30 transition-all duration-300 cursor-pointer"
                        >
                          <div className={`w-1 shrink-0 rounded-l-full ${sideBarClass}`}></div>
                          <div className="p-4 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
                              <div className="w-5 h-5 border-2 border-pink-200 rounded-lg flex items-center justify-center mr-1 shrink-0 bg-white"></div>
                              {task.tag === '交辦事項' ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/50">📌 交辦事項</span>
                              ) : task.tag === '交接事項' ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/50">🔄 交接事項</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/50">📅 每日執行</span>
                              )}

                              {task.assignType === '個人' ? (
                                <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-600 border border-pink-200/50">👤 專屬: {task.assignedTo}</span>
                              ) : isPersonal ? (
                                <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-600 border border-pink-200/50">👤 個人</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/50">👥 全員</span>
                              )}

                              {needsPhoto && (
                                <span className="px-2 py-0.5 rounded-md bg-[#FDF2F8] text-[#DB2777] flex items-center space-x-0.5 border border-pink-100">
                                  <Camera size={9} className="mr-0.5" />
                                  <span>拍照</span>
                                </span>
                              )}

                              {needsAmount && (
                                <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#D97706] border border-amber-100">$ 金額</span>
                              )}

                              {isOverdue && (
                                <span className="px-2 py-0.5 rounded-md bg-[#FFEDD5] text-[#EA580C] border border-orange-100">⚠️ 逾期</span>
                              )}

                              {timeStr && (
                                <span className="text-slate-500 font-mono ml-auto text-xs font-medium">{timeStr}</span>
                              )}
                            </div>

                            <div className="space-y-0.5 pl-6">
                              <h3 className="text-xs font-black text-slate-800 leading-snug">{title}</h3>
                              <p className="text-[11px] text-slate-650 font-bold leading-relaxed">{subtitle}</p>
                            </div>
                          </div>

                          {canManageTasks && (
                            <div className="flex items-center pr-3 space-x-1 shrink-0 action-btn self-center">
                              <button
                                onClick={() => handleEditClick(task)}
                                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 已完成事項 */}
              <div className="p-4 pt-1 space-y-3">
                <div className="flex justify-between items-center px-1 text-sm font-black text-slate-800">
                  <span>已完成</span>
                  <span className="text-xs bg-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-full">
                    {completedTasksCount} 項
                  </span>
                </div>

                {displayedTasks.filter(t => t.completed).length === 0 ? (
                  <div className="bg-white rounded-[24px] border border-slate-100 p-8 text-center text-xs text-slate-500 font-bold shadow-sm">
                    📭 今日尚未有日常任務完成
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedTasks.filter(t => t.completed).map(task => {
                      const {
                        isPersonal,
                        needsPhoto,
                        needsAmount,
                        title
                      } = getTaskMeta(task);

                      return (
                        <div
                          key={task.id}
                          onClick={(e) => handleCheckboxChange(task, e)}
                          className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.01)] border border-slate-100/50 overflow-hidden flex flex-col relative hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] active:bg-slate-50/30 transition-all duration-300 cursor-pointer"
                        >
                          <div className="p-4 flex relative items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 pr-2">
                              <div className="shrink-0 w-6 h-6 bg-[#F43F5E] text-white flex items-center justify-center rounded-xl shadow-sm">
                                <Check size={14} strokeWidth={3} />
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
                                  <h3 className="text-xs font-semibold text-slate-400 line-through leading-snug">{title}</h3>
                                  {task.tag === '交辦事項' ? (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">📌 交辦</span>
                                  ) : task.tag === '交接事項' ? (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">🔄 交接</span>
                                  ) : (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">📅 每日</span>
                                  )}

                                  {task.assignType === '個人' ? (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">👤 指派: {task.assignedTo}</span>
                                  ) : isPersonal ? (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">👤 個人</span>
                                  ) : (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">👥 全員</span>
                                  )}
                                  
                                  {needsPhoto && (
                                    <span className="px-1.5 py-0.25 rounded bg-gray-100 text-gray-400">拍照</span>
                                  )}
                                </div>

                                {task.completedBy && (
                                  <p className="text-xs text-slate-550 font-medium">
                                    👤 執行: {task.completedBy} · 🕒 {task.completedAt ? task.completedAt.substring(11, 16) : ''} · <span className="text-rose-500 font-bold">+{task.score} 分</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {canManageTasks && (
                              <div className="flex items-center space-x-1 shrink-0 action-btn">
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>

                          {(task.photo || task.notes) && (
                            <div className="pb-4 px-4 ml-9 space-y-2 border-l border-rose-100/50">
                              {task.notes && (
                                <p className="text-xs text-slate-550 bg-slate-50 px-2.5 py-1.5 rounded-lg w-fit font-bold border border-slate-100">
                                  📝 {task.notes}
                                </p>
                              )}
                              {task.photo && (
                                <div className="photo-preview-trigger w-fit relative group">
                                  <img
                                    src={task.photo}
                                    alt="執行拍照回報"
                                    onClick={() => setPreviewPhotoUrl(task.photo)}
                                    className="h-20 w-32 object-cover rounded-2xl border border-slate-100 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-zoom-in"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 浮動新增按鈕 */}
          {canManageTasks && !isAdding && !editingTask && (
            <button
              onClick={() => {
                const defaultTag = currentUser.store === '電商部' ? '交辦事項' : '每日執行';
                setTaskForm({ text: '', score: 10, tag: defaultTag, assignType: '所有人', assignedTo: '' });
                setIsAdding(true);
              }}
              className="fixed bottom-24 right-4 w-14 h-14 bg-[#F43F5E] hover:bg-[#E11D48] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-90 z-40 border border-rose-400"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          )}
        </>
      ) : (
        <>
          {/* 管理者訂單調貨看板 */}
          {/* 1. 管理者頂部標題 */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-10 shadow-sm animate-fade-in">
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 tracking-wide font-['Outfit']">訂單調貨需求狀態</h1>
              <div className="mt-1 flex items-center space-x-1.5 text-[#BE185D] font-extrabold text-xs">
                <ClipboardCheck size={14} className="text-[#BE185D] mr-0.5 shrink-0" />
                <span>全分店即時客需追蹤</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenSettings}
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-[#BE185D] bg-slate-50 hover:bg-pink-55 rounded-full transition-all border border-slate-100 active:scale-90"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* 2. 統計膠囊 */}
          <div className="p-4 bg-white border-b border-slate-100 animate-fade-in">
            <div className="bg-gradient-to-br from-pink-50/70 to-pink-100/40 rounded-[28px] border border-pink-100/50 p-4 shadow-sm flex items-center justify-between">
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#FCE7F3] flex items-center justify-center shrink-0 border border-pink-100 shadow-sm">
                    <span className="text-xs font-black text-[#BE185D] font-mono">👑</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-550 font-bold">待處理訂單總覽</span>
                    <span className="text-xs font-black text-slate-800">
                      共有 <span className="text-sm font-black text-[#BE185D] font-mono">{totalNeedsCount}</span> 筆需求未交單
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center space-x-1.5 border border-pink-200 bg-white text-[#BE185D] px-3 py-1 rounded-full text-xs font-black shadow-sm">
                    <span>⚡ 電商部需求: {ecommNeedsCount}</span>
                  </div>
                  <div className="inline-flex items-center space-x-1.5 border border-slate-200 bg-white text-slate-650 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    <span>🏠 其他門市: {otherNeedsCount}</span>
                  </div>
                </div>
              </div>

              {/* 右側吉祥物 */}
              <div className="relative w-16 h-16 rounded-full bg-pink-100/50 border border-pink-200/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                <div className="absolute bottom-[-8px]">
                  <ManieIcon pose="great" group="auto" className="w-16 h-12 scale-110" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. 雲端試算表快捷稽核 */}
          <div className="px-4 pt-4">
            <a
              href="https://docs.google.com/spreadsheets/d/13kUwwjkiPo-C5kBCxpV0JRLtB_dD6zgTwcDLAZAOu90/edit?gid=1293678477#gid=1293678477"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold py-3 px-4 rounded-2xl text-xs transition-all shadow-md active:scale-99 border border-green-600/20"
            >
              <span>📑 前往雲端試算表稽核歷史存檔</span>
            </a>
          </div>

          {/* 4. 門市折疊列表 */}
          <div className="p-4 space-y-4 flex-1">
            {sortedStoresForAdmin.map(store => {
              const storeOrders = storeGroups[store] || [];
              const count = storeOrders.length;
              const isExpanded = !!expandedStores[store];
              const isEcomm = store === '電商部';

              return (
                <div key={store} className="bg-white rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/80 overflow-hidden transition-all duration-300">
                  {/* Header */}
                  <div
                    onClick={() => toggleStoreExpand(store)}
                    className={`p-4 flex items-center justify-between cursor-pointer select-none active:bg-slate-50/50 transition-colors ${
                      isEcomm ? 'bg-gradient-to-r from-pink-50/20 to-white' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`text-[15px] font-black tracking-wide ${isEcomm ? 'text-pink-600 font-extrabold flex items-center' : 'text-slate-800'}`}>
                        {isEcomm && <span className="mr-1">⚡</span>}
                        {store}
                      </span>
                      {isEcomm && (
                        <span className="text-[10px] bg-pink-500 text-white font-extrabold px-2 py-0.5 rounded-full scale-90">
                          第一順位
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        count > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}>
                        {count} 筆客需
                      </span>
                    </div>
                    <div className={`text-slate-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <span className="material-symbols-outlined text-[20px] select-none block pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Orders List (Accordion Body) */}
                  {isExpanded && (
                    <div className="border-t border-slate-50 p-4 space-y-3.5 bg-slate-50/30">
                      {count === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-550 font-bold">
                          🎉 太棒了！{store}目前沒有待處理訂單需求
                        </div>
                      ) : (
                        storeOrders.map(order => {
                          const overdueDays = getOverdueDays(order.promiseDate, order.status);
                          const remainingDays = getRemainingDays(order.promiseDate, order.status);
                          const isHandedOver = order.status === '已交單' || order.status === '已交機';
                          const isOverdue = !isHandedOver && overdueDays > 0;
                          const isWarning = !isHandedOver && remainingDays >= 0 && remainingDays <= 2;

                          // 決定左側狀態邊條顏色
                          let sideBarColor = 'bg-slate-200';
                          if (isOverdue) sideBarColor = 'bg-red-500';
                          else if (isWarning) sideBarColor = 'bg-yellow-400';
                          else if (order.status === '已到貨') sideBarColor = 'bg-green-500';
                          else if (order.status === '已下訂') sideBarColor = 'bg-blue-400';
                          else if (order.status === '退貨中') sideBarColor = 'bg-pink-500';
                          else if (order.status === '換貨中') sideBarColor = 'bg-purple-500';
                          else if (order.status === '待處理') sideBarColor = 'bg-amber-500';

                          let statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                          if (order.status === '已到貨') statusBadgeClass = 'bg-green-50 text-green-700 border-green-150';
                          else if (order.status === '已下訂') statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-150';
                          else if (order.status === '退貨中') statusBadgeClass = 'bg-pink-50 text-pink-700 border-pink-150';
                          else if (order.status === '換貨中') statusBadgeClass = 'bg-purple-50 text-purple-700 border-purple-150';
                          else if (order.status === '待處理') statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-150';

                          return (
                            <div
                              key={order.id}
                              onClick={() => onViewDetails && onViewDetails(order)}
                              className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.01)] border border-slate-100 overflow-hidden flex relative hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] active:bg-slate-50/20 transition-all cursor-pointer"
                            >
                              <div className={`w-1 shrink-0 ${sideBarColor}`}></div>
                              <div className="p-4 flex-1 space-y-2.5">
                                {/* 第一行 */}
                                <div className="flex justify-between items-start">
                                  <div className="flex items-baseline space-x-1.5">
                                    <span className="text-sm font-black text-slate-800">{order.customerName}</span>
                                    <span className="text-xs text-slate-550 font-mono font-bold">{order.customerPhone}</span>
                                  </div>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${statusBadgeClass}`}>
                                    {order.status}
                                  </span>
                                </div>

                                {/* 第二行 */}
                                <div className="text-xs font-bold text-slate-800">
                                  {order.productName} <span className="text-slate-500 font-mono font-semibold">x{order.quantity || 1}</span>
                                </div>

                                {/* 第三行：時效 */}
                                <div className="text-xs text-slate-500 font-bold flex flex-col space-y-1.5 border-t border-slate-50 pt-2">
                                  <div className="flex justify-between items-center text-xs text-slate-550">
                                    <span>建單：{order.createdAt}</span>
                                    <span>提單：{order.creator}</span>
                                  </div>
                                  
                                  {/* 逾期與到期 widget */}
                                  {isOverdue ? (
                                    <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-2 flex items-center space-x-1 font-bold text-xs">
                                      <AlertTriangle size={12} className="shrink-0 text-red-500" />
                                      <span>🚨 逾期 {overdueDays} 天 (預計交貨: {order.promiseDate})</span>
                                    </div>
                                  ) : isWarning ? (
                                    <div className="bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-lg p-2 flex items-center space-x-1 font-bold text-xs">
                                      <span className="shrink-0 text-yellow-600 font-mono text-xs">⏰</span>
                                      <span>即將到期 (剩餘 {remainingDays === 0 ? '今天' : `${remainingDays} 天`} 交貨)</span>
                                    </div>
                                  ) : order.promiseDate ? (
                                    <div className="bg-slate-50 text-slate-600 border border-slate-100 rounded-lg p-2 flex items-center space-x-1 font-bold text-xs">
                                      <span className="shrink-0 text-slate-500 font-mono text-xs">⏱️</span>
                                      <span>承諾交期: {order.promiseDate} (剩餘 {remainingDays} 天)</span>
                                    </div>
                                  ) : null}
                                </div>

                                {/* 第四行：快捷狀態更新與查看詳情 */}
                                <div className="flex justify-end space-x-2 pt-1 border-t border-slate-50/50">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setStatusUpdatingOrder(order);
                                    }}
                                    className="px-3.5 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-black hover:bg-blue-50 active:scale-95 transition-all shadow-sm flex items-center space-x-1"
                                  >
                                    <span>🔄 狀態</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onViewDetails && onViewDetails(order);
                                    }}
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                                  >
                                    詳情
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 管理者訂單狀態快捷變更 Action Sheet (Modal) */}
          {statusUpdatingOrder && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
              <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="font-extrabold text-sm text-gray-800">
                    變更訂單狀態 (客戶: {statusUpdatingOrder.customerName})
                  </h3>
                  <button 
                    onClick={() => setStatusUpdatingOrder(null)} 
                    className="text-gray-400 hover:text-gray-650 p-1 border rounded-full bg-white active:scale-90 transition-all"
                  >
                    <X size={15} />
                  </button>
                </div>
                
                <p className="text-xs text-slate-550 font-bold">
                  狀態變更後將透過 SyncAll 一併同步至 Google 試算表，無須手動重新載入。
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1.5">
                  {[
                    { id: '訂貨需求', label: '📋 訂貨需求', desc: '客戶落訂，待採購下單' },
                    { id: '已下訂', label: '📦 已下訂', desc: '向總部/廠商下訂，運送中' },
                    { id: '已到貨', label: '🟢 已到貨', desc: '商品已到店點收，候取件' },
                    { id: '已交單', label: '🔵 已交單', desc: '客戶驗機並完成手寫簽名' },
                    { id: '退貨中', label: '🛑 退貨中', desc: '電商退貨處理中' },
                    { id: '換貨中', label: '🔄 換貨中', desc: '電商換貨處理中' },
                    { id: '待處理', label: '⏳ 待處理', desc: '新進客需，等候人員確認' }
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
                        <span className="text-[10px] text-slate-550 font-bold mt-1 block">{statusOption.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 浮動新增按鈕 */}
      {canManageTasks && !isAdding && !editingTask && (
        <button
          onClick={() => {
            const defaultTag = currentUser.store === '電商部' ? '交辦事項' : '每日執行';
            setTaskForm({ text: '', score: 10, tag: defaultTag, assignType: '所有人', assignedTo: '' });
            setIsAdding(true);
          }}
          className="fixed bottom-24 right-4 w-14 h-14 bg-[#F43F5E] hover:bg-[#E11D48] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-90 z-40 border border-rose-400"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* 警告彈窗 */}
      <Modal
        isOpen={cancelModalOpen}
        title="確定要取消這個任務勾選嗎？"
        message="取消後，試算表上對應的歷史紀錄與照片也將會被抹除，分數會被扣回。"
        cancelText="取消"
        confirmText="好，確定取消"
        onCancel={cancelCancel}
        onConfirm={confirmCancel}
      />

      {/* 任務回報彈窗 */}
      {reportingTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden font-['Outfit']">
            {/* 標題欄 */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-1.5 text-rose-600">
                <CheckSquare size={18} />
                <h3 className="font-black text-sm text-gray-800">店務職責執行回報</h3>
              </div>
              <button 
                onClick={() => setReportingTask(null)}
                className="text-gray-400 hover:text-gray-600 p-1 bg-white border rounded-full active:scale-90 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* 表單內容 */}
            <form onSubmit={handleReportSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-rose-50/40 border border-rose-100/50 p-3.5 rounded-2xl">
                <span className="text-xs bg-rose-500 text-white font-extrabold px-2.5 py-0.5 rounded">日常職責</span>
                <p className="text-xs font-black text-slate-800 mt-1.5 leading-relaxed">{reportingTask.text}</p>
                <span className="text-xs text-rose-600 font-extrabold block mt-1">積分：+{reportingTask.score} 分</span>
              </div>

              {/* 需要拍照 */}
              {(reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點') || reportingTask.text.includes('陳列') || reportingTask.text.includes('拍照')) && (
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                    <span className="text-red-500 font-bold">*</span>
                    <span>上傳現場照片回報：</span>
                  </label>
                  
                  {!photo ? (
                    <div>
                      <input 
                        type="file" 
                        id="reporting-camera-input" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleCameraChange} 
                        className="hidden" 
                      />
                      <button 
                        type="button" 
                        onClick={triggerCamera} 
                        className="w-full flex flex-col items-center justify-center border-2 border-dashed border-rose-200 rounded-2xl p-7 bg-rose-50/10 hover:bg-rose-50/30 cursor-pointer transition-all active:scale-98 focus:outline-none"
                      >
                        <Camera className="w-8 h-8 text-rose-500 mb-2 animate-bounce-subtle pointer-events-none" />
                        <span className="text-xs text-rose-600 font-extrabold pointer-events-none">點擊啟動相機拍照</span>
                        <span className="text-xs text-slate-500 font-bold mt-1 pointer-events-none">
                          行動端將自動啟用後置鏡頭
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-150 shadow-sm w-full max-h-48 flex justify-center bg-black/5">
                      <img src={photo} alt="現場預覽" className="max-h-48 object-contain" />
                      <button 
                        type="button" 
                        onClick={() => setPhoto(null)} 
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white py-1.5 px-3 rounded-full text-[10px] font-black active:scale-95 transition-all shadow-md"
                      >
                        重新拍照
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 需要填寫金額 */}
              {(reportingTask.text.includes('零用金') || reportingTask.text.includes('盤點現金')) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <span className="text-red-500 font-bold">*</span>
                    <span>請輸入實際盤點零用金金額：</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="請輸入現有盤點零用金總額"
                      className="block w-full px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none text-xs font-bold text-slate-800"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                      元 (NTD)
                    </div>
                  </div>
                </div>
              )}

              {/* 備註說明 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  備註說明 (選填)：
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="可寫入任何特別交辦事項或盤點說明..."
                  className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs h-16 resize-none focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* 按鈕 */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="submit"
                  disabled={
                    ((reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點') || reportingTask.text.includes('陳列') || reportingTask.text.includes('拍照')) && !photo) ||
                    ((reportingTask.text.includes('零用金') || reportingTask.text.includes('盤點現金')) && !cashAmount.trim())
                  }
                  className={`flex-1 font-bold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-95 text-center ${
                    ((reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點') || reportingTask.text.includes('陳列') || reportingTask.text.includes('拍照')) && !photo) ||
                    ((reportingTask.text.includes('零用金') || reportingTask.text.includes('盤點現金')) && !cashAmount.trim())
                      ? 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                      : 'bg-rose-500 hover:bg-rose-600 text-white'
                  }`}
                >
                  確認並提交任務
                </button>
                <button
                  type="button"
                  onClick={() => setReportingTask(null)}
                  className="bg-gray-150 hover:bg-gray-200 text-gray-600 font-bold py-3.5 px-6 rounded-xl text-xs active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 照片放大預覽 */}
      {previewPhotoUrl && (
        <div 
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-full max-h-[85vh]">
            <img src={previewPhotoUrl} alt="現場照片大圖" className="rounded-xl max-w-full max-h-[85vh] object-contain shadow-2xl" />
            <button 
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-[-40px] right-0 text-white hover:text-gray-300 font-extrabold flex items-center space-x-1 text-xs bg-black/40 px-3 py-1.5 rounded-full"
            >
              <span>關閉</span>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
