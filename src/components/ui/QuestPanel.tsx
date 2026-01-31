/**
 * Quest Panel UI Component
 * Ported from LEGACY quest-panel styling and structure
 * 
 * Displays daily and weekly quests with progress bars and claim buttons
 */

import React, { useState, useCallback } from 'react';
import { useQuests, QuestDefinition, QuestProgress } from '../../hooks/useQuests';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Callback when reward is claimed */
  onRewardClaimed?: (questId: string, amount: number, isWeekly: boolean) => void;
}

type TabType = 'daily' | 'weekly';

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
    backdropFilter: 'blur(4px)',
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '16px',
    width: '420px',
    maxWidth: '95vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.2)',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#e0e7ff',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  tabActive: {
    color: '#c4b5fd',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  tabIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '2px',
    backgroundColor: '#a855f7',
    borderRadius: '1px',
  },
  tabBadge: {
    marginLeft: '6px',
    padding: '2px 6px',
    fontSize: '0.7rem',
    backgroundColor: 'rgba(234, 179, 8, 0.3)',
    color: '#fde047',
    borderRadius: '10px',
  },
  timer: {
    padding: '8px 20px',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    color: '#a5b4fc',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  questList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px',
  },
  questItem: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: '10px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    transition: 'all 0.2s',
  },
  questItemCompleted: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  questHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  questIcon: {
    fontSize: '1.5rem',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: '8px',
  },
  questInfo: {
    flex: 1,
  },
  questName: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#e2e8f0',
    fontWeight: 500,
  },
  questDesc: {
    margin: '2px 0 0 0',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  questReward: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#fde047',
    fontSize: '0.85rem',
  },
  progressContainer: {
    marginTop: '8px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '0.7rem',
    color: '#94a3b8',
  },
  claimButton: {
    marginTop: '8px',
    width: '100%',
    padding: '8px 12px',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: '6px',
    color: '#fde047',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  claimedBadge: {
    marginTop: '8px',
    textAlign: 'center' as const,
    color: '#22c55e',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#94a3b8',
  },
};

// ============================================================================
// QUEST ITEM COMPONENT
// ============================================================================

interface QuestItemProps {
  quest: QuestDefinition;
  progress: QuestProgress;
  onClaim: () => void;
}

const QuestItem: React.FC<QuestItemProps> = ({ quest, progress, onClaim }) => {
  const percentage = Math.min(100, (progress.current / quest.target) * 100);
  const isCompleted = progress.completed;
  const isClaimed = progress.claimedReward;

  // Progress bar color based on completion
  const progressColor = isCompleted 
    ? '#22c55e' 
    : percentage > 50 
      ? '#a855f7' 
      : '#6366f1';

  return (
    <div
      style={{
        ...styles.questItem,
        ...(isCompleted ? styles.questItemCompleted : {}),
      }}
    >
      <div style={styles.questHeader}>
        <div style={styles.questIcon}>{quest.icon}</div>
        <div style={styles.questInfo}>
          <h4 style={styles.questName}>{quest.name}</h4>
          <p style={styles.questDesc}>{quest.description}</p>
        </div>
        <div style={styles.questReward}>
          <span>✨</span>
          <span>{quest.reward}</span>
        </div>
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${percentage}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <div style={styles.progressText}>
          <span>{progress.current} / {quest.target}</span>
          <span>{Math.floor(percentage)}%</span>
        </div>
      </div>

      {isCompleted && !isClaimed && (
        <button
          style={styles.claimButton}
          onClick={onClaim}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.3)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span>🎁</span>
          Claim Reward (+{quest.reward} ✨)
        </button>
      )}

      {isClaimed && (
        <div style={styles.claimedBadge}>
          <span>✓</span>
          Reward Claimed!
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuestPanel: React.FC<QuestPanelProps> = ({
  isOpen,
  onClose,
  onRewardClaimed,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const {
    dailyQuests,
    weeklyQuests,
    state,
    timers,
    claimReward,
    getProgress,
    unclaimedDailyCount,
    unclaimedWeeklyCount,
  } = useQuests();

  const handleClaim = useCallback((questId: string, isWeekly: boolean) => {
    const amount = claimReward(questId, isWeekly);
    if (amount > 0 && onRewardClaimed) {
      onRewardClaimed(questId, amount, isWeekly);
    }
  }, [claimReward, onRewardClaimed]);

  if (!isOpen) return null;

  const currentQuests = activeTab === 'daily' ? dailyQuests : weeklyQuests;
  const currentTimer = activeTab === 'daily' ? timers.dailyReset : timers.weeklyReset;
  const timerLabel = activeTab === 'daily' ? 'Daily reset in' : 'Weekly reset in';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <span>📜</span>
            Quests
          </h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'daily' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('daily')}
          >
            Daily Quests
            {unclaimedDailyCount > 0 && (
              <span style={styles.tabBadge}>{unclaimedDailyCount}</span>
            )}
            {activeTab === 'daily' && <div style={styles.tabIndicator} />}
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'weekly' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('weekly')}
          >
            Weekly Quests
            {unclaimedWeeklyCount > 0 && (
              <span style={styles.tabBadge}>{unclaimedWeeklyCount}</span>
            )}
            {activeTab === 'weekly' && <div style={styles.tabIndicator} />}
          </button>
        </div>

        {/* Timer */}
        <div style={styles.timer}>
          <span>⏱️</span>
          <span>{timerLabel}: {currentTimer}</span>
        </div>

        {/* Quest List */}
        <div style={styles.questList}>
          {currentQuests.map(quest => {
            const progress = getProgress(quest.id, activeTab === 'weekly');
            if (!progress) return null;

            return (
              <QuestItem
                key={quest.id}
                quest={quest}
                progress={progress}
                onClaim={() => handleClaim(quest.id, activeTab === 'weekly')}
              />
            );
          })}

          {currentQuests.length === 0 && (
            <div style={styles.emptyState}>
              <p>No quests available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// QUEST BUTTON (for opening panel)
// ============================================================================

export interface QuestButtonProps {
  onClick: () => void;
  hasUnclaimed?: boolean;
  unclaimedCount?: number;
}

export const QuestButton: React.FC<QuestButtonProps> = ({
  onClick,
  hasUnclaimed = false,
  unclaimedCount = 0,
}) => {
  const buttonStyle: React.CSSProperties = {
    position: 'relative',
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    border: hasUnclaimed 
      ? '2px solid rgba(234, 179, 8, 0.6)' 
      : '1px solid rgba(168, 85, 247, 0.3)',
    color: '#c4b5fd',
    fontSize: '1.25rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: hasUnclaimed 
      ? '0 0 12px rgba(234, 179, 8, 0.3)' 
      : '0 4px 12px rgba(168, 85, 247, 0.15)',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    minWidth: '18px',
    height: '18px',
    padding: '0 4px',
    backgroundColor: '#eab308',
    color: '#1e1b4b',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      title="Quests"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.3)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.2)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      📜
      {hasUnclaimed && unclaimedCount > 0 && (
        <span style={badgeStyle}>{unclaimedCount}</span>
      )}
    </button>
  );
};

export default QuestPanel;
