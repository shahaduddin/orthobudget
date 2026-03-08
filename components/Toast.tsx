import React, { useEffect } from 'react';
import { ICONS } from '../constants';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<Props> = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-zinc-900 dark:bg-zinc-100',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const textColors = {
    success: 'text-white dark:text-zinc-900',
    error: 'text-white',
    info: 'text-white'
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] animate-slide-up">
      <div className={`${bgColors[type]} px-6 py-3.5 rounded-full shadow-xl flex items-center gap-3 min-w-[200px] justify-center`}>
        {type === 'success' && <ICONS.CheckCircle className={`w-5 h-5 ${textColors[type]}`} />}
        {type === 'error' && <ICONS.Info className={`w-5 h-5 ${textColors[type]}`} />}
        <span className={`text-sm font-bold ${textColors[type]}`}>{message}</span>
      </div>
    </div>
  );
};

export default Toast;