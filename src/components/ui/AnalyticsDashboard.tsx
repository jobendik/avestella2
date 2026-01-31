// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Analytics Dashboard Panel
// View play statistics and trends
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { useProgressionContext, useGameStateContext, useSocialContext, useDailyChallengesContext, useLeaderboardContext } from '@/contexts/GameContext';
import { BarChart3, Clock, Heart, Star, Sparkles, Users, Flame, Trophy, TrendingUp, Calendar } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps): JSX.Element {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}

interface AnalyticsDashboardProps {
  onClose?: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps): JSX.Element {
  const { state: progression } = useProgressionContext();
  const { gameState } = useGameStateContext();
  const { friends, guild } = useSocialContext();
  const { totalCompleted } = useDailyChallengesContext();
  const { playerRank, competitiveRank, getRankConfig, weeklyStats, getWeeklyProgress } = useLeaderboardContext();

  const state = gameState.current;
  
  // Calculate play time
  const playTime = state?.playTime || 0;
  const hours = Math.floor(playTime / 3600);
  const minutes = Math.floor((playTime % 3600) / 60);
  
  // Calculate stats
  const bondsCount = state?.bonds?.length || 0;
  const sealedBonds = state?.bonds?.filter((b: any) => b.sealed)?.length || 0;
  const fragmentsCollected = state?.fragmentsCollected || 0;
  const beaconsLit = state?.beaconsLit || 0;
  
  // Weekly progress
  const weeklyProgress = getWeeklyProgress();
  
  // Rank info
  const rankConfig = getRankConfig();

  // Calculate efficiency stats
  const fragmentsPerHour = playTime > 0 ? Math.round((fragmentsCollected / playTime) * 3600) : 0;
  const bondsPerHour = playTime > 0 ? ((bondsCount / playTime) * 3600).toFixed(1) : '0';

  // Session milestones
  const milestones = useMemo(() => {
    const list = [];
    if (fragmentsCollected >= 100) list.push({ label: 'Collector I', achieved: true });
    if (fragmentsCollected >= 500) list.push({ label: 'Collector II', achieved: true });
    if (fragmentsCollected >= 1000) list.push({ label: 'Collector III', achieved: true });
    if (bondsCount >= 5) list.push({ label: 'Social Butterfly', achieved: true });
    if (sealedBonds >= 1) list.push({ label: 'Star Maker', achieved: true });
    if (beaconsLit >= 3) list.push({ label: 'Beacon Keeper', achieved: true });
    if (hours >= 1) list.push({ label: 'Dedicated', achieved: true });
    if (hours >= 5) list.push({ label: 'Devoted', achieved: true });
    return list;
  }, [fragmentsCollected, bondsCount, sealedBonds, beaconsLit, hours]);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-4 w-96 max-h-[80vh] overflow-y-auto border border-blue-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-400" />
          Analytics Dashboard
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        )}
      </div>

      {/* Competitive Rank Banner */}
      <div 
        className="mb-4 p-3 rounded-lg border flex items-center gap-3"
        style={{ 
          backgroundColor: `${rankConfig.color}15`,
          borderColor: `${rankConfig.color}40`
        }}
      >
        <span className="text-3xl">{rankConfig.badge}</span>
        <div>
          <div className="font-bold text-white">{rankConfig.name}</div>
          <div className="text-xs text-slate-400">Rank #{playerRank}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm font-medium" style={{ color: rankConfig.color }}>
            {weeklyProgress.wins}W
          </div>
          <div className="text-xs text-slate-500">This Week</div>
        </div>
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          icon={<Clock size={14} className="text-blue-400" />}
          label="Play Time"
          value={`${hours}h ${minutes}m`}
          color="bg-blue-500/20"
        />
        <StatCard
          icon={<Sparkles size={14} className="text-amber-400" />}
          label="Fragments"
          value={fragmentsCollected.toLocaleString()}
          subtext={`${fragmentsPerHour}/hr`}
          color="bg-amber-500/20"
        />
        <StatCard
          icon={<Heart size={14} className="text-pink-400" />}
          label="Bonds Formed"
          value={bondsCount}
          subtext={`${sealedBonds} sealed`}
          color="bg-pink-500/20"
        />
        <StatCard
          icon={<Star size={14} className="text-purple-400" />}
          label="Star Memories"
          value={sealedBonds}
          color="bg-purple-500/20"
        />
        <StatCard
          icon={<Users size={14} className="text-green-400" />}
          label="Friends"
          value={friends.length}
          subtext={guild ? `In ${guild.name}` : 'No guild'}
          color="bg-green-500/20"
        />
        <StatCard
          icon={<Trophy size={14} className="text-yellow-400" />}
          label="Challenges"
          value={totalCompleted}
          color="bg-yellow-500/20"
        />
      </div>

      {/* Progression Stats */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
          <TrendingUp size={14} />
          Progression
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Level</span>
            <span className="text-sm font-bold text-amber-400">{progression.level}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Current XP</span>
            <span className="text-sm text-white">{progression.xp?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Stardust</span>
            <span className="text-sm text-cyan-400">{progression.stardust?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Season Pass Tier</span>
            <span className="text-sm text-purple-400">{progression.seasonPassTier || 0}</span>
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
          <Calendar size={14} />
          This Week ({weeklyProgress.daysRemaining}d left)
        </h4>
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex justify-between mb-2">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{weeklyProgress.wins}</div>
              <div className="text-xs text-slate-500">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{weeklyProgress.gamesPlayed}</div>
              <div className="text-xs text-slate-500">Games</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">
                {weeklyProgress.gamesPlayed > 0 
                  ? Math.round((weeklyProgress.wins / weeklyProgress.gamesPlayed) * 100) 
                  : 0}%
              </div>
              <div className="text-xs text-slate-500">Win Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
          <Flame size={14} />
          Achievements Unlocked ({milestones.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {milestones.map((milestone, i) => (
            <span 
              key={i}
              className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"
            >
              ✓ {milestone.label}
            </span>
          ))}
          {milestones.length === 0 && (
            <span className="text-xs text-slate-500">Keep playing to unlock achievements!</span>
          )}
        </div>
      </div>

      {/* Login Streak */}
      {progression.dailyLoginStreak > 0 && (
        <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 flex items-center gap-3">
          <Flame size={20} className="text-orange-400" />
          <div>
            <div className="text-sm font-medium text-orange-300">
              {progression.dailyLoginStreak} Day Streak!
            </div>
            <div className="text-xs text-orange-400/60">
              Keep it going for bonus rewards
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
