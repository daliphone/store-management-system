import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Modal({ isOpen, title, message, cancelText = '取消', confirmText = '好', onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xs bg-white rounded-[28px] overflow-hidden shadow-2xl border border-slate-100 transform transition-all animate-slide-up font-['Outfit']">
        {/* 對話框內容 */}
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-rose-500 animate-pulse-subtle border border-red-100">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1.5">
            {title && (
              <h3 className="text-sm font-black text-slate-800 leading-snug">
                {title}
              </h3>
            )}
            {message && (
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* 對話框按鈕：iOS 風格左右對稱排版 */}
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3.5 text-xs font-black text-slate-400 hover:bg-slate-50 active:bg-slate-100 border-r border-slate-100 focus:outline-none transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3.5 text-xs font-black text-rose-500 hover:bg-rose-50 active:bg-rose-100 focus:outline-none transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
