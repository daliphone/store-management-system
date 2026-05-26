import React from 'react';

export default function Modal({ isOpen, title, message, cancelText = '取消', confirmText = '好', onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 animate-fade-in">
      <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden shadow-2xl transform transition-all animate-slide-up">
        {/* 對話框內容 */}
        <div className="p-6 text-center">
          {title && (
            <h3 className="text-lg font-bold text-gray-900 leading-6">
              {title}
            </h3>
          )}
          {message && (
            <p className="mt-3 text-sm text-gray-600">
              {message}
            </p>
          )}
        </div>

        {/* 對話框按鈕：iOS 風格左右對稱排版 */}
        <div className="flex border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 active:bg-gray-100 border-r border-gray-100 focus:outline-none transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3.5 text-sm font-bold text-blue-500 hover:bg-gray-50 active:bg-gray-100 focus:outline-none transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
