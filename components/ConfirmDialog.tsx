import React from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'brand';
}

const ConfirmDialog: React.FC<Props> = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[2px] z-[100] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-scale-in text-center">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
              variant === 'danger' 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                : 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;