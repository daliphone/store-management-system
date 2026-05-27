import React, { useState } from 'react';
import { Settings, Award, Plus, Trash2, Edit2, X, Camera, Check, AlertCircle, Eye, Info, CheckSquare } from 'lucide-react';
import Modal from './Modal';
import ManieIcon from './ManieIcon';
import { STORES } from '../mockData';

export default function TaskList({ tasks, currentUser, onToggleTask, onUpdateTasks, onOpenSettings }) {
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

  // 新增與編輯日常任務狀態
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
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

  // 任務過濾邏輯：
  // 1. 若任務名稱是「開店-儀容自檢 (姓名)」：
  //    - 一般店員：只看見寫有自己名字的儀容自檢。
  //    - 店長、超級管理員、稽核員：看見所有人各自的儀容自檢項目。
  // 2. 共用任務：所有人均可看見。
  const displayedTasks = storeFilteredTasks.filter(t => {
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

  // 判斷是否有管理日常任務權限 (店長以上)
  const canManageTasks = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'STORE_MANAGER';

  // 處理核取方塊點擊
  const handleCheckboxChange = (task, e) => {
    if (e.target.closest('.action-btn')) return;
    if (e.target.closest('.photo-preview-trigger')) return;

    if (!task.completed) {
      // 點擊未完成任務 -> 開啟回報彈窗
      setReportingTask(task);
      setPhoto(null);
      setNotes('');
      setCashAmount('');
    } else {
      // 點擊已完成任務 -> 嘗試取消勾選
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

  // 手動觸發相機 input 點擊，防止 React Label 雙擊與事件氣泡導致反白 Crash
  const triggerCamera = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const inputEl = document.getElementById('reporting-camera-input');
    if (inputEl) {
      inputEl.click();
    }
  };

  // 處理拍照相機檔案選擇 (加強防呆，防止 Crash)
  const handleCameraChange = (e) => {
    if (!e.target || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result); // Base64
      };
      reader.onerror = () => {
        console.error("讀取拍照檔案失敗");
      };
      reader.readAsDataURL(file);
    }
  };

  // 任務回報提交
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
    
    // 重置
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

    const newTask = {
      id: `tsk_${Math.random().toString(36).substr(2, 9)}`,
      store: hasAllStoresPerm ? selectedStore : currentUser.store,
      text: taskForm.text.trim(),
      score: Number(taskForm.score) || 10,
      completed: false,
      completedAt: null,
      completedBy: null,
      photo: null,
      notes: null
    };

    const updatedTasks = [...tasks, newTask];
    onUpdateTasks(updatedTasks);
    setIsAdding(false);
    setTaskForm({ text: '', score: 10 });
  };

  // 編輯任務提交
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
          text: taskForm.text.trim(),
          score: Number(taskForm.score) || 10
        };
      }
      return t;
    });

    onUpdateTasks(updatedTasks);
    setEditingTask(null);
    setTaskForm({ text: '', score: 10 });
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
      score: task.score
    });
  };

  return (
    <div className="flex-1 flex flex-col pb-20 overflow-y-auto no-scrollbar relative">
      {/* 頂部標題 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-gray-800 tracking-wide">門市日常店務稽核</h1>
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
                setTaskForm({ text: '', score: 10 });
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

      {/* 新增或編輯任務表單 (Vite 頁面內置 Modal) */}
      {(isAdding || editingTask) ? (
        <div className="p-5 bg-white flex-1 animate-fade-in space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="font-bold text-sm text-gray-800">
              {isAdding ? '新增門市日常任務' : '編輯日常任務內容'}
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
              <label className="text-xs text-gray-500 font-semibold block mb-1">任務內容說明 *</label>
              <textarea
                value={taskForm.text}
                onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                placeholder="例如: 門市環境清潔消毒、整理商品陳列架..."
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs h-20 resize-none focus:ring-1 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">完成所得積分 (1-50分) *</label>
              <input
                type="number"
                min="1"
                max="50"
                value={taskForm.score}
                onChange={(e) => setTaskForm({ ...taskForm, score: parseInt(e.target.value) || 10 })}
                className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
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
          {/* 個人狀態與積分區塊 */}
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
                
                {/* 今日任務進度條 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>今日任務執行進度</span>
                    <span>{completedTasksCount}/{totalTasksCount}</span>
                  </div>
                  <div className="w-full bg-rose-200/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalTasksCount ? (completedTasksCount / totalTasksCount) * 100 : 0}%` }}
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
                <span className="text-[9px] text-rose-500 font-bold tracking-wider">完成點數</span>
              </div>
            </div>
          </div>

          {/* 超級管理員與稽核員專屬直達試算表按鈕 */}
          {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'AUDITOR') && (
            <div className="px-4 pt-4">
              <a
                href="https://docs.google.com/spreadsheets/d/13kUwwjkiPo-C5kBCxpV0JRLtB_dD6zgTwcDLAZAOu90/edit?gid=1293678477#gid=1293678477"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all shadow-md active:scale-99 border border-green-600/20"
              >
                <span>📑 前往雲端試算表稽核歷史存檔</span>
              </a>
            </div>
          )}

          {/* 任務列表 */}
          <div className="p-4 space-y-3 flex-1">
            <div className="flex justify-between items-center px-1 text-xs font-bold text-gray-400">
              <span>店務日常職責任務清單 (未完成優先)</span>
              <span className="font-mono">{completedTasksCount}/{totalTasksCount}</span>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-400 font-bold">
                📭 目前無店務日常任務資料
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {sortedTasks.map(task => {
                  const isPersonal = task.text && task.text.startsWith('開店-儀容自檢');
                  
                  return (
                    <div 
                      key={task.id} 
                      onClick={(e) => handleCheckboxChange(task, e)}
                      className={`p-4 flex flex-col hover:bg-gray-50/30 cursor-pointer active:bg-gray-50/50 transition-colors select-none ${
                        task.completed ? 'bg-green-50/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1 pr-2">
                          {/* Checkbox */}
                          <div className="mt-0.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => {}} // 由整塊 click 事件處理
                              className={`h-4.5 w-4.5 rounded transition-all cursor-pointer ${
                                task.completed 
                                  ? 'text-rose-500 focus:ring-rose-500 border-rose-400 bg-rose-500' 
                                  : 'text-gray-300 border-gray-300 focus:ring-rose-500'
                              }`}
                            />
                          </div>
                          
                          {/* 任務內容與完成資訊 */}
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className={`text-xs font-bold text-gray-800 transition-all ${
                                task.completed ? 'line-through text-gray-400 font-medium' : ''
                              }`}>
                                {task.text}
                              </p>
                              
                              {/* 任務性質標籤 */}
                              {isPersonal ? (
                                <span className="text-[8px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.25 rounded-md">
                                  👤 個人自檢
                                </span>
                              ) : (
                                <span className="text-[8px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.25 rounded-md">
                                  👥 分店共用
                                </span>
                              )}

                              {/* 拍照標記 */}
                              {(task.text.includes('儀容') || task.text.includes('環境') || task.text.includes('盤點')) && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 font-extrabold px-1.5 py-0.25 rounded-md flex items-center space-x-0.5">
                                  <Camera size={8} />
                                  <span>需拍照</span>
                                </span>
                              )}
                            </div>
                            
                            {task.completed && task.completedBy && (
                              <div className="text-[9px] text-gray-400 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>👤 執行: {task.completedBy}</span>
                                <span>•</span>
                                <span>🕒 時間: {task.completedAt ? task.completedAt.substring(5, 16) : ''}</span>
                                <span>•</span>
                                <span className="text-rose-500">+{task.score} 分</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 編輯與刪除按鈕 (管理員可見) */}
                        {canManageTasks && (
                          <div className="flex items-center space-x-1 shrink-0 action-btn">
                            <button
                              onClick={() => handleEditClick(task)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 渲染照片與備註的精緻展示區域 */}
                      {task.completed && (task.photo || task.notes) && (
                        <div className="mt-2.5 ml-7.5 pl-2.5 border-l border-rose-100 space-y-1.5">
                          {task.notes && (
                            <p className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded-md w-fit font-bold">
                              📝 {task.notes}
                            </p>
                          )}
                          {task.photo && (
                            <div className="photo-preview-trigger w-fit">
                              <img 
                                src={task.photo} 
                                alt="現場拍照" 
                                onClick={() => setPreviewPhotoUrl(task.photo)}
                                className="max-h-24 max-w-40 object-cover rounded-lg border border-gray-100 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                              />
                              <span className="text-[7.5px] text-gray-400 mt-0.5 block italic">
                                (點擊照片可放大審查)
                              </span>
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

      {/* 任務回報 Modal (防呆強制拍照/填寫金額) */}
      {reportingTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* 標題欄 */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-1.5 text-rose-600">
                <CheckSquare size={18} />
                <h3 className="font-extrabold text-sm text-gray-800">店務職責執行回報</h3>
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
              <div className="bg-rose-50/40 border border-rose-100/50 p-3 rounded-xl">
                <span className="text-[9px] bg-rose-500 text-white font-extrabold px-1.5 py-0.25 rounded">日常職責</span>
                <p className="text-xs font-black text-gray-800 mt-1.5">{reportingTask.text}</p>
                <span className="text-[9px] text-rose-500 font-bold block mt-1">積分：+{reportingTask.score} 分</span>
              </div>

              {/* 1. 若需要拍照 (儀容、環境、盤點) */}
              {(reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點')) && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
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
                        <span className="text-[9px] text-gray-400 font-semibold mt-1 pointer-events-none">
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

              {/* 2. 若需要填寫零用金盤點金額 */}
              {reportingTask.text.includes('零用金') && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 flex items-center space-x-1">
                    <span className="text-red-500 font-bold">*</span>
                    <span>請輸入實際盤點零用金金額：</span>
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      placeholder="請輸入現有盤點零用金總額"
                      className="block w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none text-xs font-bold text-gray-800"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                      元 (NTD)
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 備註輸入框 */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">
                  備註說明 (選填)：
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="可寫入任何特別交辦事項或盤點說明..."
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs h-16 resize-none focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* 提交/取消按鈕 */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="submit"
                  disabled={
                    ((reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點')) && !photo) ||
                    (reportingTask.text.includes('零用金') && !cashAmount.trim())
                  }
                  className={`flex-1 font-bold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-95 text-center ${
                    ((reportingTask.text.includes('儀容') || reportingTask.text.includes('環境') || reportingTask.text.includes('盤點')) && !photo) ||
                    (reportingTask.text.includes('零用金') && !cashAmount.trim())
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

      {/* 照片放大預覽 Modal */}
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
