// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Menu Bar Component
// Grouped dropdown menus for panel access
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Heart, Trophy, Award, Gift, Shield, Target, Book, Scroll,
  Settings as SettingsIcon, ShoppingBag, Dog, Image, ChevronDown, Globe,
  MessageSquarePlus, Anchor, Sparkles, Menu, X
} from 'lucide-react';
import { useSocialContext, useDailyChallengesContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { useAnchoringContext } from '@/contexts/AnchoringContext';
import { StatsDisplay } from './StatsDisplay';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: string;
}

function MenuItem({ icon, label, onClick, badge }: MenuItemProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left"
    >
      <span className="text-white/60">{icon}</span>
      <span className="text-white/80 text-sm">{label}</span>
      {badge && (
        <span className="ml-auto w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// Anchor menu item with context-aware display
function AnchorMenuItem(): JSX.Element {
  const { isAnchored, triggerAnchorPrompt } = useAnchoringContext();

  if (isAnchored) {
    return (
      <div className="flex items-center gap-2 w-full px-3 py-2 text-left">
        <span className="text-emerald-400"><Shield size={14} /></span>
        <span className="text-emerald-300/80 text-sm">Anchored</span>
        <span className="ml-auto text-[10px] text-emerald-400/60">🔵</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => triggerAnchorPrompt('manual')}
      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-left group"
    >
      <span className="text-indigo-400"><Anchor size={14} /></span>
      <span className="text-indigo-300/80 text-sm">Anchor</span>
      <Sparkles size={12} className="ml-auto text-indigo-400/60 group-hover:text-indigo-400 transition-colors" />
    </button>
  );
}

interface MenuDropdownProps {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  badge?: string;
}

function MenuDropdown({ label, icon, iconColor, children, badge }: MenuDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, right: 0 });

  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors ${iconColor}`}
      >
        {icon}
        <span className="text-white/60 text-xs hidden sm:inline">{label}</span>
        <ChevronDown size={12} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold border border-black">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu - now using fixed positioning */}
          <div
            className="fixed bg-black/90 backdrop-blur-md rounded-xl border border-white/10 shadow-xl z-[70] min-w-[160px] py-1 pointer-events-auto"
            style={{ top: `${dropdownPosition.top}px`, right: `${dropdownPosition.right}px` }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

interface MenuBarProps {
  isMobile?: boolean;
}

export function MenuBar({ isMobile = false }: MenuBarProps): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { friends, friendRequests, activeEvent, getUnreadCount, guild } = useSocialContext();
  const { completedToday } = useDailyChallengesContext();
  const { togglePanel } = useUI();

  const unreadMessageCount = getUnreadCount();
  const socialBadge = unreadMessageCount > 0 ? String(unreadMessageCount) : friendRequests.length > 0 ? String(friendRequests.length) : undefined;
  const challengeBadge = completedToday < 3 ? String(3 - completedToday) : undefined;
  const hasBadge = socialBadge || challengeBadge;

  const handleMenuItemClick = (panel: any) => {
    togglePanel(panel as any);
    setMobileMenuOpen(false);
  };

  // Mobile layout: single hamburger button with full-screen drawer
  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="relative w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Menu size={16} />
          {hasBadge && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Full-screen drawer - rendered via portal to escape HUD stacking context */}
        {mobileMenuOpen && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 z-[100] pointer-events-auto"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-64 bg-black/95 backdrop-blur-xl border-l border-white/10 z-[101] p-4 overflow-y-auto pointer-events-auto">
              {/* Close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>

              <h2 className="text-white/80 font-semibold text-sm mb-4 mt-1">Menu</h2>

              {/* Status Section (Mobile Only) */}
              <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="text-white/40 text-xs uppercase mb-2">Status</div>
                <StatsDisplay />
              </div>

              {/* Social Section */}
              <div className="mb-4">
                <div className="text-white/40 text-xs uppercase mb-2">Social</div>
                <MenuItem icon={<Globe size={14} className="text-cyan-400" />} label="Cosmos" onClick={() => handleMenuItemClick('cosmos')} />
                <MenuItem icon={<Users size={14} className="text-cyan-400" />} label="Friends" onClick={() => handleMenuItemClick('friends')} badge={socialBadge} />
                <MenuItem icon={<Shield size={14} className="text-emerald-400" />} label="Constellations" onClick={() => handleMenuItemClick('guild')} />
              </div>

              {/* Progress Section */}
              <div className="mb-4">
                <div className="text-white/40 text-xs uppercase mb-2">Progress</div>
                <MenuItem icon={<Scroll size={14} className="text-purple-400" />} label="Quests" onClick={() => handleMenuItemClick('quests')} />
                <MenuItem icon={<Target size={14} className="text-green-400" />} label="Challenges" onClick={() => handleMenuItemClick('challenges')} badge={challengeBadge} />
                <MenuItem icon={<Trophy size={14} className="text-yellow-400" />} label="Achievements" onClick={() => handleMenuItemClick('achievements')} />
                <MenuItem icon={<Award size={14} className="text-blue-400" />} label="Leaderboard" onClick={() => handleMenuItemClick('leaderboard')} />
              </div>

              {/* Collection Section */}
              <div className="mb-4">
                <div className="text-white/40 text-xs uppercase mb-2">Collection</div>
                <MenuItem icon={<ShoppingBag size={14} className="text-purple-400" />} label="Shop" onClick={() => handleMenuItemClick('shop')} />
                <MenuItem icon={<Dog size={14} className="text-pink-400" />} label="Companions" onClick={() => handleMenuItemClick('companions')} />
                <MenuItem icon={<Image size={14} className="text-indigo-400" />} label="Gallery" onClick={() => handleMenuItemClick('gallery')} />
              </div>

              {/* More Section */}
              <div>
                <div className="text-white/40 text-xs uppercase mb-2">More</div>
                <MenuItem icon={<Gift size={14} className="text-orange-400" />} label="Daily Rewards" onClick={() => handleMenuItemClick('dailyRewards')} />
                <AnchorMenuItem />
                <MenuItem icon={<SettingsIcon size={14} className="text-white/60" />} label="Settings" onClick={() => handleMenuItemClick('settings')} />
              </div>
            </div>
          </>,
          document.body
        )}
      </>
    );
  }

  // Desktop layout: dropdown menus
  return (
    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 shadow-lg">
      {/* Social Group */}
      <MenuDropdown label="Social" icon={<Users size={16} />} iconColor="text-cyan-400" badge={socialBadge}>
        <MenuItem
          icon={<Globe size={14} className="text-cyan-400" />}
          label="Cosmos"
          onClick={() => togglePanel('cosmos')}
        />
        <MenuItem
          icon={<Users size={14} className="text-cyan-400" />}
          label="Friends"
          onClick={() => togglePanel('friends')}
          badge={socialBadge}
        />
        <MenuItem
          icon={<Shield size={14} className="text-emerald-400" />}
          label="Constellations"
          onClick={() => togglePanel('guild')}
        />
        {activeEvent && (
          <MenuItem
            icon={<Heart size={14} className="text-pink-400" />}
            label="Events"
            onClick={() => togglePanel('events')}
            badge="!"
          />
        )}
      </MenuDropdown>

      {/* Progress Group */}
      <MenuDropdown label="Progress" icon={<Trophy size={16} />} iconColor="text-yellow-400" badge={challengeBadge}>
        <MenuItem
          icon={<Scroll size={14} className="text-purple-400" />}
          label="Quests"
          onClick={() => togglePanel('quests')}
        />
        <MenuItem
          icon={<Target size={14} className="text-green-400" />}
          label="Challenges"
          onClick={() => togglePanel('challenges')}
          badge={challengeBadge}
        />
        <MenuItem
          icon={<Trophy size={14} className="text-yellow-400" />}
          label="Achievements"
          onClick={() => togglePanel('achievements')}
        />
        <MenuItem
          icon={<Award size={14} className="text-blue-400" />}
          label="Leaderboard"
          onClick={() => togglePanel('leaderboard')}
        />
        <MenuItem
          icon={<Book size={14} className="text-cyan-400" />}
          label="Journal"
          onClick={() => togglePanel('journal')}
        />
      </MenuDropdown>

      {/* Collection Group */}
      <MenuDropdown label="Collection" icon={<ShoppingBag size={16} />} iconColor="text-purple-400">
        <MenuItem
          icon={<ShoppingBag size={14} className="text-purple-400" />}
          label="Shop"
          onClick={() => togglePanel('shop')}
        />
        <MenuItem
          icon={<Dog size={14} className="text-pink-400" />}
          label="Companions"
          onClick={() => togglePanel('companions')}
        />
        <MenuItem
          icon={<Image size={14} className="text-indigo-400" />}
          label="Collectibles"
          onClick={() => togglePanel('collectibles')}
        />
        <MenuItem
          icon={<Image size={14} className="text-pink-400" />}
          label="Gallery"
          onClick={() => togglePanel('gallery')}
        />
      </MenuDropdown>

      {/* Rewards & Settings */}
      <MenuDropdown label="More" icon={<Gift size={16} />} iconColor="text-orange-400">
        <MenuItem
          icon={<Gift size={14} className="text-orange-400" />}
          label="Daily Rewards"
          onClick={() => togglePanel('dailyRewards')}
        />
        <AnchorMenuItem />
        <MenuItem
          icon={<MessageSquarePlus size={14} className="text-purple-400" />}
          label="Send Feedback"
          onClick={() => togglePanel('feedback')}
        />
        <MenuItem
          icon={<SettingsIcon size={14} className="text-white/60" />}
          label="Settings"
          onClick={() => togglePanel('settings')}
        />
      </MenuDropdown>
    </div>
  );
}

export default MenuBar;
