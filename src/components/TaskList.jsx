import React, { useState } from 'react';
import { Settings, CheckSquare, Award, Plus, Trash2, Edit2, X, PlusCircle } from 'lucide-react';
import Modal from './Modal';
import ManieIcon from './ManieIcon';
import { STORES } from '../mockData';

export default function TaskList({ tasks, currentUser, onToggleTask, onUpdateTasks, onOpenSettings }) {
  const [activeShift, setActiveShift] = useState('morning'); // morning, noon, evening
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [pendingCancelTaskId, setPendingCancelTaskId] = useState(null);
  
  const hasAllStoresPerm = currentUser.permissions && currentUser.permissions.includes('view_all_stores');
  const [selectedStore, setSelectedStore] = useState(() => {
    return currentUser.store !== '全分店' ? currentUser.store : '東門店';
  });

  // 新增與編輯日常任務狀態
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    shift: 'morning',
    counter: 'M1 櫃台',
    text: '',
    score: 10
  });

  // 根據分店篩選任務 (一般人員看自己店，全店權限管理員可切換分店)
  const storeFilteredTasks = tasks.filter(t => {
    if (hasAllStoresPerm) {
      return t.store === selectedStore;
    }
    return t.store === currentUser.store;
  });

  // 1. 取得時段對應的任務
  const morningTasks = storeFilteredTasks.filter(t => t.shift === 'morning');
  const noonTasks = storeFilteredTasks.filter(t => t.shift === 'noon');
  const eveningTasks = storeFilteredTasks.filter(t => t.shift === 'evening');

  const activeTasks = storeFilteredTasks.filter(t => t.shift === activeShift);

  // 2. 計算進度與分數
  const totalTasksCount = storeFilteredTasks.length;
  const completedTasksCount = storeFilteredTasks.filter(t => t.completed).length;
  
  // 計算本月點數 (完成任務的分數總和)
  const totalScore = storeFilteredTasks.reduce((sum, t) => sum + (t.completed ? t.score : 0), 0);

  // 計算特定時段的進度
  const getShiftProgress = (shiftName) => {
    const shiftTasks = storeFilteredTasks.filter(t => t.shift === shiftName);
    const completed = shiftTasks.filter(t => t.completed).length;
    return `${completed}/${shiftTasks.length}`;
  };

  // 3. 櫃台分組
  const counters = ['M1 櫃台', 'M2 櫃台', 'M3 櫃台'];
  const getCounterTasks = (counterName) => {
    return activeTasks.filter(t => t.counter === counterName);
  };

  // 4. 判斷是否有管理權限 (超級管理員與店長擁有管理任務權限)
  const canManageTasks = currentUser.permissions && (
    currentUser.permissions.includes('manage_accounts') || 
    currentUser.permissions.includes('cancel_tasks_directly')
  );

  // 5. 處理核取方塊點擊
  const handleCheckboxChange = (task, e) => {
    // 阻止點擊事件氣泡 (如果點擊的是編輯/刪除按鈕的話)
    if (e.target.closest('.action-btn')) return;

    if (!task.completed) {
      // 點擊未完成任務 -> 直接勾選
      onToggleTask(task.id, true, currentUser.name);
    } else {
      // 點擊已完成任務 -> 嘗試取消勾選
      const perms = currentUser.permissions || [];
      if (perms.includes('cancel_tasks_directly')) {
        // 具備「直接取消任務免提示」權限者可以直接取消
        onToggleTask(task.id, false, null);
      } else {
        // 未勾選此功能權限者（如一般店員）必須跳出警告彈窗
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

  // 6. 新增任務提交
  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.text.trim()) {
      alert('請填寫任務內容！');
      return;
    }

    const newTask = {
      id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
      store: hasAllStoresPerm ? selectedStore : currentUser.store,
      shift: taskForm.shift,
      counter: taskForm.counter,
      text: taskForm.text.trim(),
      score: Number(taskForm.score) || 10,
      completed: false,
      completedAt: null,
      completedBy: null
    };

    const updatedTasks = [...tasks, newTask];
    onUpdateTasks(updatedTasks);
    setIsAdding(false);
    setTaskForm({ shift: activeShift, counter: 'M1 櫃台', text: '', score: 10 });
  };

  // 7. 編輯任務提交
  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.text.trim()) {
      alert('請填寫任務內容！');
      return;
    }

    const updatedTasks = tasks.map(t => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          shift: taskForm.shift,
          counter: taskForm.counter,
          text: taskForm.text.trim(),
          score: Number(taskForm.score) || 10
        };
      }
      return t;
    });

    onUpdateTasks(updatedTasks);
    setEditingTask(null);
    setTaskForm({ shift: activeShift, counter: 'M1 櫃台', text: '', score: 10 });
  };

  // 8. 刪除任務
  const handleDeleteTask = (taskId) => {
    if (window.confirm('確定要刪除此店務任務嗎？')) {
      const updatedTasks = tasks.filter(t => t.id !== taskId);
      onUpdateTasks(updatedTasks);
    }
  };

  const handleEditClick = (task) => {
    setEditingTask(task);
    setTaskForm({
      shift: task.shift,
      counter: task.counter,
      text: task.text,
      score: task.score
    });
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-800 tracking-wide">門市店務管理系統</h1>
          {hasAllStoresPerm && (
            <div className="mt-1 flex items-center space-x-1">
              <span className="text-[9px] text-gray-400 font-bold">目前檢視：</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-lg focus:outline-none cursor-pointer"
              >
                {STORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {canManageTasks && !isAdding && !editingTask && (
            <button
              onClick={() => {
                setTaskForm({ shift: activeShift, counter: 'M1 櫃台', text: '', score: 10 });
                setIsAdding(true);
              }}
              className="flex items-center space-x-1 bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl text-xs active:scale-95 transition-all font-semibold mr-1"
            >
              <Plus size={13} />
              <span>新增任務</span>
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1 text-gray-600 hover:text-blue-500 font-medium text-xs transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <Settings size={16} />
            <span>設定</span>
          </button>
        </div>
      </div>

      {/* 新增或編輯任務表單 (Modal) */}
      {(isAdding || editingTask) ? (
        <div className="p-5 bg-white flex-1 animate-fade-in space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-800">
              {isAdding ? '新增店務任務' : '編輯日常任務'}
            </h3>
            <button 
              onClick={() => {
                setIsAdding(false);
                setEditingTask(null);
              }} 
              className="text-gray-400 p-1"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={isAdding ? handleAddTaskSubmit : handleEditTaskSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">任務內容 *</label>
              <textarea
                value={taskForm.text}
                onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                placeholder="例如: 檢查郵件、擦玻璃..."
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs h-20 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">時段</label>
                <select
                  value={taskForm.shift}
                  onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white"
                >
                  <option value="morning">早上 (8-12)</option>
                  <option value="noon">中午 (12-17)</option>
                  <option value="evening">晚上 (17-22)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold block mb-1">指派櫃台</label>
                <select
                  value={taskForm.counter}
                  onChange={(e) => setTaskForm({ ...taskForm, counter: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white"
                >
                  <option value="M1 櫃台">M1 櫃台</option>
                  <option value="M2 櫃台">M2 櫃台</option>
                  <option value="M3 櫃台">M3 櫃台</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">點數積分 *</label>
              <input
                type="number"
                min="1"
                max="50"
                value={taskForm.score}
                onChange={(e) => setTaskForm({ ...taskForm, score: parseInt(e.target.value) || 10 })}
                className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-xs active:scale-95 transition-all shadow-md"
              >
                儲存任務
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTask(null);
                }}
                className="flex-1 bg-gray-150 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl text-xs active:scale-95 transition-all"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* 個人狀態與積分區塊 (還原影片 1 設計) */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-gray-900 text-base">{currentUser.name}</span>
                  <span className="text-[10px] bg-white border border-rose-200 text-rose-600 font-bold px-2 py-0.5 rounded-full flex items-center space-x-0.5">
                    <Award size={10} />
                    <span>Lv.1</span>
                  </span>
                </div>
                
                {/* 今日進度條 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>今日任務進度</span>
                    <span>{completedTasksCount}/{totalTasksCount}</span>
                  </div>
                  <div className="w-full bg-rose-200/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(completedTasksCount / totalTasksCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* 中間手拿平板 manie 姿勢 */}
              <div className="mx-2 shrink-0">
                <ManieIcon pose="tablet" className="w-16 h-12" />
              </div>
              
              {/* 右側本月點數 */}
              <div className="text-center pl-4 border-l border-rose-200/50 shrink-0">
                <span className="block text-2xl font-black text-rose-600">{totalScore}</span>
                <span className="text-[9px] text-rose-500 font-bold tracking-wider">本月點數</span>
              </div>
            </div>
          </div>

          {/* 時段切換頁籤 (早上、中午、晚上) */}
          <div className="flex border-b border-gray-100 bg-white sticky top-[61px] z-10">
            {[
              { id: 'morning', label: '早上', time: '8-12' },
              { id: 'noon', label: '中午', time: '12-17' },
              { id: 'evening', label: '晚上', time: '17-22' }
            ].map(shift => {
              const isActive = activeShift === shift.id;
              return (
                <button
                  key={shift.id}
                  onClick={() => setActiveShift(shift.id)}
                  className={`flex-1 py-3 text-center transition-all relative ${
                    isActive ? 'text-rose-500 font-extrabold' : 'text-gray-500'
                  }`}
                >
                  <div className="text-sm">{shift.label}</div>
                  <div className="text-[9px] font-mono mt-0.5 text-gray-400">
                    {shift.time} ({getShiftProgress(shift.id)})
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-6 right-6 h-0.75 bg-rose-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 任務分組清單 */}
          <div className="p-4 space-y-5 flex-1">
            {counters.map(counter => {
              const counterTasks = getCounterTasks(counter);
              if (counterTasks.length === 0) return null;
              
              const completedCount = counterTasks.filter(t => t.completed).length;
              
              return (
                <div key={counter} className="space-y-2">
                  {/* 櫃台標題 */}
                  <div className="flex justify-between items-center px-1 text-xs font-bold text-gray-400">
                    <span>{counter}</span>
                    <span className="font-mono">{completedCount}/{counterTasks.length}</span>
                  </div>
                  
                  {/* 任務卡片列表 */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {counterTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={(e) => handleCheckboxChange(task, e)}
                        className="p-3.5 flex items-start justify-between hover:bg-gray-50/50 cursor-pointer active:bg-gray-50 transition-colors select-none"
                      >
                        <div className="flex items-start space-x-3 flex-1 pr-2">
                          {/* Checkbox */}
                          <div className="mt-0.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => {}} // 由整塊 click 事件處理
                              className={`h-4 w-4 rounded transition-all cursor-pointer ${
                                task.completed 
                                  ? 'text-rose-500 focus:ring-rose-500 border-rose-400 bg-rose-500' 
                                  : 'text-gray-300 border-gray-300 focus:ring-blue-500'
                              }`}
                            />
                          </div>
                          
                          {/* 任務文字與完成資訊 */}
                          <div className="flex-1 space-y-1">
                            <p className={`text-xs font-bold text-gray-800 transition-all ${
                              task.completed ? 'line-through text-gray-400 font-medium' : ''
                            }`}>
                              {task.text}
                            </p>
                            
                            {task.completed && task.completedBy && (
                              <div className="text-[9px] text-gray-400 font-medium flex items-center space-x-1.5">
                                <span>👤 {task.completedBy}</span>
                                <span>•</span>
                                <span>🕒 {task.completedAt ? task.completedAt.substring(11, 16) : ''}</span>
                                <span>•</span>
                                <span className="text-rose-500">+{task.score} 分</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 編輯與刪除日常任務按鈕 (管理員可見) */}
                        {canManageTasks && (
                          <div className="flex items-center space-x-1 shrink-0 action-btn">
                            <button
                              onClick={() => handleEditClick(task)}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 警告彈窗 */}
      <Modal
        isOpen={cancelModalOpen}
        title="確定要取消這個勾選嗎？"
        message="取消後分數會被扣回。"
        cancelText="取消"
        confirmText="好"
        onCancel={cancelCancel}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
