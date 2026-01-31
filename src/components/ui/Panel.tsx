// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Panel Container Component
// ═══════════════════════════════════════════════════════════════════════════

import React, { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';

export interface PanelProps {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  showClose?: boolean;
  fullHeight?: boolean;
}

export function Panel({
  title,
  icon,
  children,
  className = '',
  showClose = true,
  fullHeight = false,
}: PanelProps): JSX.Element {
  const { closePanel } = useUI();

  return (
    <div
      className={`
        fixed inset-0 z-40 flex items-center justify-center
        bg-black/60 backdrop-blur-sm
        animate-fade-in
      `}
      onClick={closePanel}
    >
      <div
        className={`
          bg-gradient-to-b from-slate-800/95 to-slate-900/95
          backdrop-blur-md rounded-2xl
          border border-white/10
          shadow-2xl
          ${fullHeight ? 'h-[90vh]' : 'max-h-[85vh]'}
          w-[95vw] max-w-lg
          flex flex-col
          animate-slide-up
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          {showClose && (
            <button
              onClick={closePanel}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Navigation Component
// ─────────────────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps): JSX.Element {
  return (
    <div className="flex gap-1 p-1 bg-black/30 rounded-xl mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 py-2 px-3 rounded-lg text-sm font-medium
            transition-all duration-200
            ${activeTab === tab.id
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
            }
          `}
        >
          {tab.icon && <span className="mr-1">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Component
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className = '' }: SectionProps): JSX.Element {
  return (
    <div className={`mb-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Component
// ─────────────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps): JSX.Element {
  return (
    <div
      className={`
        bg-white/5 rounded-xl p-4 border border-white/10
        ${hoverable ? 'hover:bg-white/10 cursor-pointer transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
}: ButtonProps): JSX.Element {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white',
    ghost: 'bg-transparent hover:bg-white/10 text-white/80 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-xl font-medium transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default Panel;
