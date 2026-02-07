// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - World Event Notification Component (Batch 1)
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { addAlpha } from '@/utils/colors';
import type { ActiveWorldEvent } from '@/hooks/useWorldEvents';
import { useMobile } from '@/hooks/useMobile';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EventNotificationProps {
  event: ActiveWorldEvent;
  onDismiss: () => void;
  isMobile?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Event Notification
// ─────────────────────────────────────────────────────────────────────────────

const EventNotification = memo(function EventNotification({
  event,
  onDismiss,
  isMobile = false
}: EventNotificationProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  // Update time remaining
  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(0, Math.ceil((event.endTime - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [event.endTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getEventColor = (eventId: string): string => {
    switch (eventId) {
      case 'meteor_shower': return '#FFD700';
      case 'aurora_borealis': return '#7FFFD4';
      case 'solar_eclipse': return '#4B0082';
      case 'comet_pass': return '#00BFFF';
      case 'light_bloom': return '#FFFACD';
      case 'cosmic_storm': return '#9370DB';
      case 'starfall': return '#FFA500';
      default: return '#FFFFFF';
    }
  };

  const color = getEventColor(event.config.id);

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${addAlpha(color, 0.2)}, rgba(0,0,0,0.8))`,
          border: `1px solid ${addAlpha(color, 0.4)}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Animated border glow */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(ellipse at top, ${addAlpha(color, 0.3)}, transparent 70%)`,
          }}
        />

        <div className={`relative ${isMobile ? 'p-2' : 'p-4'}`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`${isMobile ? 'text-lg' : 'text-2xl'} animate-pulse`}>{event.config.icon}</span>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold ${isMobile ? 'text-xs' : 'text-lg'} truncate`}
                style={{ color }}
              >
                {event.config.name}
              </h3>
              {!isMobile && (
                <p className="text-white/60 text-sm">
                  {event.config.description}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className={`${isMobile ? 'p-0.5' : 'p-1'} rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white flex-shrink-0`}
            >
              ✕
            </button>
          </div>

          {/* Timer bar */}
          <div className={`${isMobile ? 'mt-0.5' : 'mt-3'}`}>
            <div className="flex justify-between text-xs text-white/60 mb-0.5">
              <span className={isMobile ? 'hidden' : ''}>{isMobile ? '' : 'Time Remaining'}</span>
              <span className={isMobile ? 'text-[9px] ml-auto' : 'text-[10px]'}>{formatTime(timeRemaining)}</span>
            </div>
            <div className={`${isMobile ? 'h-1' : 'h-1.5'} bg-black/40 rounded-full overflow-hidden`}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${(timeRemaining / event.config.duration) * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${addAlpha(color, 0.5)})`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Event Notification Container
// ─────────────────────────────────────────────────────────────────────────────

export const WorldEventNotifications = memo(function WorldEventNotifications(): JSX.Element {
  const { worldEvents } = useGame();
  const { isMobile } = useMobile();
  const [displayedEvents, setDisplayedEvents] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<ActiveWorldEvent[]>([]);

  // Watch for new events
  useEffect(() => {
    const newEvents = worldEvents.activeEvents.filter(
      event => !displayedEvents.has(event.id)
    );

    if (newEvents.length > 0) {
      setNotifications(prev => [...prev, ...newEvents]);
      setDisplayedEvents(prev => {
        const next = new Set(prev);
        newEvents.forEach(e => next.add(e.id));
        return next;
      });
    }
  }, [worldEvents.activeEvents, displayedEvents]);

  const dismissNotification = (eventId: string) => {
    setNotifications(prev => prev.filter(e => e.id !== eventId));
  };

  if (notifications.length === 0) return <></>;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-40 flex flex-col gap-3 w-full px-4 pointer-events-none transition-all duration-300
        ${isMobile ? 'top-24 max-w-[90vw]' : 'top-16 max-w-md'}
      `}
    >
      <div className="pointer-events-auto w-full"> {/* Wrapper for pointer events */}
        {notifications.slice(0, 2).map(event => (
          <EventNotification
            key={event.id}
            event={event}
            onDismiss={() => dismissNotification(event.id)}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Active Event Indicator (shows in HUD)
// ─────────────────────────────────────────────────────────────────────────────

export const ActiveEventIndicator = memo(function ActiveEventIndicator(): JSX.Element | null {
  const { worldEvents } = useGame();
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});

  // Update timers
  useEffect(() => {
    const updateTimes = () => {
      const times: Record<string, number> = {};
      for (const event of worldEvents.activeEvents) {
        times[event.id] = Math.max(0, Math.ceil((event.endTime - Date.now()) / 1000));
      }
      setTimeRemaining(times);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [worldEvents.activeEvents]);

  if (worldEvents.activeEvents.length === 0) return null;

  const getEventColor = (eventId: string): string => {
    switch (eventId) {
      case 'meteor_shower': return '#FFD700';
      case 'aurora_borealis': return '#7FFFD4';
      case 'solar_eclipse': return '#4B0082';
      case 'comet_pass': return '#00BFFF';
      case 'light_bloom': return '#FFFACD';
      case 'cosmic_storm': return '#9370DB';
      case 'starfall': return '#FFA500';
      default: return '#FFFFFF';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="flex flex-col gap-1">
      {worldEvents.activeEvents.map(event => {
        const color = getEventColor(event.config.id);
        const remaining = timeRemaining[event.id] || 0;

        return (
          <div
            key={event.id}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
            style={{
              background: addAlpha(color, 0.2),
              border: `1px solid ${addAlpha(color, 0.3)}`,
            }}
          >
            <span className="animate-pulse">{event.config.icon}</span>
            <span style={{ color }} className="font-medium">
              {event.config.name}
            </span>
            <span className="text-white/60 ml-auto">
              {formatTime(remaining)}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default WorldEventNotifications;
