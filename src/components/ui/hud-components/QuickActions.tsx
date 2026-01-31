// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Quick Actions Component
// Secondary action buttons (signal, map, echo, camera)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Zap, Navigation, Star, Camera } from 'lucide-react';
import { useSignals } from '@/hooks/useSignals';
import { useUI } from '@/contexts/UIContext';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  hoverColor: string;
}

function QuickActionButton({ icon, onClick, hoverColor }: QuickActionButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`group w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 ${hoverColor} transition-all shadow-lg active:scale-95`}
    >
      {icon}
    </button>
  );
}

export function QuickActions(): JSX.Element {
  const { sendLightSignal } = useSignals();
  const { togglePanel } = useUI();

  return (
    <div className="flex flex-col gap-2 items-center">
      <QuickActionButton
        icon={<Zap size={18} />}
        onClick={sendLightSignal}
        hoverColor="hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
      />
      <QuickActionButton
        icon={<Navigation size={18} />}
        onClick={() => togglePanel('map')}
        hoverColor="hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
      />
      <QuickActionButton
        icon={<Star size={18} />}
        onClick={() => togglePanel('friends')}
        hoverColor="hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
      />
      <QuickActionButton
        icon={<Camera size={18} />}
        onClick={() => togglePanel('gallery')}
        hoverColor="hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/50"
      />
    </div>
  );
}

export default QuickActions;
