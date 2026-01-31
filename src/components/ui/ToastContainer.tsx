// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Toast Notifications Component
// Displays notifications in organized zones
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { useUI } from '@/contexts/UIContext';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer(): JSX.Element {
  const { toasts, dismissToast } = useUI();

  // Separate toasts by position
  const topRightToasts = toasts.filter(t => (t.position || 'top-right') === 'top-right');
  const topCenterToasts = toasts.filter(t => t.position === 'top-center');

  return (
    <>
      {/* Top Right - General notifications (info, success, actions) */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs">
        {topRightToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={dismissToast}
            compact={true}
          />
        ))}
      </div>

      {/* Top Center - Critical alerts (weather, warnings, world events) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center">
        {topCenterToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={dismissToast}
            compact={false}
          />
        ))}
      </div>
    </>
  );
}

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onDismiss: (id: string) => void;
  compact?: boolean;
}

function Toast({ id, message, type, onDismiss, compact = false }: ToastProps): JSX.Element {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
  };

  const bgColors = {
    success: 'bg-green-500/20 border-green-500/50',
    error: 'bg-red-500/20 border-red-500/50',
    warning: 'bg-yellow-500/20 border-yellow-500/50',
    info: 'bg-blue-500/20 border-blue-500/50',
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-center gap-3
        backdrop-blur-md rounded-xl border
        shadow-lg
        ${compact ? 'px-3 py-2 animate-slide-in-right' : 'px-4 py-3 animate-fade-in-down'}
        ${bgColors[type]}
      `}
    >
      {icons[type]}
      <span className={`text-white font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="ml-2 text-white/50 hover:text-white transition-colors flex-shrink-0"
      >
        <X className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
    </div>
  );
}

export default ToastContainer;
