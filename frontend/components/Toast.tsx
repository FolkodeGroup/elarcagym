import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-700 border-green-300',
    error: 'bg-red-700 border-red-300',
    info: 'bg-blue-700 border-blue-300'
  }[type];

  const icon = {
    success: <Check size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />
  }[type];

  return (
    <div
      className={`fixed top-8 right-8 z-50 flex items-center gap-4 px-6 py-4 rounded-xl border-2 text-white shadow-2xl transition-all duration-300 transform ${bgColor} ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{ minWidth: 340, maxWidth: 420, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.01em' }}
    >
      {icon}
      <span className="flex-1" style={{ wordBreak: 'break-word' }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 hover:opacity-80 focus:outline-none"
        aria-label="Cerrar notificación"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;
