// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Feedback Form Panel
// Submit bug reports and suggestions
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { MessageSquare, Bug, Lightbulb, Send, CheckCircle, AlertTriangle, Star } from 'lucide-react';

type FeedbackType = 'bug' | 'suggestion' | 'praise' | 'other';
type Priority = 'low' | 'medium' | 'high';

interface FeedbackFormProps {
  onClose?: () => void;
  onSubmit?: (feedback: FeedbackData) => void;
}

interface FeedbackData {
  type: FeedbackType;
  priority: Priority;
  title: string;
  description: string;
  email?: string;
  includeSystemInfo: boolean;
  rating?: number;
  timestamp: number;
}

interface SystemInfo {
  userAgent: string;
  platform: string;
  screenSize: string;
  language: string;
  timezone: string;
}

function getSystemInfo(): SystemInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'bug', label: 'Bug Report', icon: <Bug size={16} />, color: 'bg-red-500/20 border-red-500/50 text-red-400' },
  { type: 'suggestion', label: 'Suggestion', icon: <Lightbulb size={16} />, color: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
  { type: 'praise', label: 'Praise', icon: <Star size={16} />, color: 'bg-pink-500/20 border-pink-500/50 text-pink-400' },
  { type: 'other', label: 'Other', icon: <MessageSquare size={16} />, color: 'bg-blue-500/20 border-blue-500/50 text-blue-400' }
];

const PRIORITIES: { priority: Priority; label: string; color: string }[] = [
  { priority: 'low', label: 'Low', color: 'bg-green-500/20 text-green-400' },
  { priority: 'medium', label: 'Medium', color: 'bg-amber-500/20 text-amber-400' },
  { priority: 'high', label: 'High', color: 'bg-red-500/20 text-red-400' }
];

export function FeedbackForm({ onClose, onSubmit }: FeedbackFormProps): JSX.Element {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [priority, setPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [rating, setRating] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim()) return;
    
    setSubmitting(true);
    
    const feedbackData: FeedbackData = {
      type,
      priority,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
      includeSystemInfo,
      rating: type === 'praise' ? rating : undefined,
      timestamp: Date.now()
    };

    try {
      // Get player ID from localStorage (set during login)
      const playerId = localStorage.getItem('avestella_player_id') || 'anonymous';
      const playerName = localStorage.getItem('avestella_player_name') || 'Anonymous';
      
      // Build system info if requested
      const systemInfo = includeSystemInfo ? getSystemInfo() : null;
      
      // Map category: frontend type → backend category
      const categoryMap: Record<FeedbackType, string> = {
        'bug': 'bug',
        'suggestion': 'suggestion',
        'praise': 'praise',
        'other': 'other'
      };

      // Send to backend API
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          playerName,
          category: categoryMap[type],
          message: `[${priority.toUpperCase()}] ${title.trim()}\n\n${description.trim()}`,
          rating: type === 'praise' ? rating : undefined,
          email: email.trim() || undefined,
          metadata: {
            priority,
            systemInfo,
            timestamp: Date.now()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      // Also store locally as backup
      const existing = localStorage.getItem('avestella_feedback');
      const feedbackList = existing ? JSON.parse(existing) : [];
      const fullFeedback = includeSystemInfo 
        ? { ...feedbackData, systemInfo }
        : feedbackData;
      feedbackList.push(fullFeedback);
      localStorage.setItem('avestella_feedback', JSON.stringify(feedbackList));
      
      console.log('[FEEDBACK] Submitted successfully');
      
      // Call onSubmit callback if provided
      onSubmit?.(feedbackData);
      
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      // Fallback: store locally if API fails
      const existing = localStorage.getItem('avestella_feedback');
      const feedbackList = existing ? JSON.parse(existing) : [];
      const fullFeedback = includeSystemInfo 
        ? { ...feedbackData, systemInfo: getSystemInfo() }
        : feedbackData;
      feedbackList.push({ ...fullFeedback, pendingSync: true });
      localStorage.setItem('avestella_feedback', JSON.stringify(feedbackList));
      
      // Still show success to user (feedback is saved locally)
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [type, priority, title, description, email, includeSystemInfo, rating, onSubmit]);

  const isValid = title.trim().length >= 3 && description.trim().length >= 10;

  // Success state
  if (submitted) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-6 w-96 border border-green-500/30 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Thank You!</h3>
          <p className="text-sm text-slate-400 mb-4">
            Your feedback has been submitted successfully. We appreciate you taking the time to help improve Avestella!
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-4 w-96 max-h-[85vh] overflow-y-auto border border-purple-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare size={20} className="text-purple-400" />
          Send Feedback
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

      {/* Feedback Type Selection */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map(({ type: t, label, icon, color }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                type === t 
                  ? color
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              {icon}
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Priority (for bugs) */}
      {type === 'bug' && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(({ priority: p, label, color }) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  priority === p 
                    ? color
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rating (for praise) */}
      {type === 'praise' && (
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-1 transition-colors ${
                  star <= rating ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'bug' ? 'Brief description of the issue' : 'What is your feedback about?'}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none text-sm"
          maxLength={100}
        />
        <div className="text-xs text-slate-500 mt-1 text-right">{title.length}/100</div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            type === 'bug' 
              ? 'Steps to reproduce, expected vs actual behavior...'
              : 'Share your thoughts in detail...'
          }
          rows={4}
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none text-sm resize-none"
          maxLength={1000}
        />
        <div className="text-xs text-slate-500 mt-1 text-right">{description.length}/1000</div>
      </div>

      {/* Email (optional) */}
      <div className="mb-4">
        <label className="block text-xs text-slate-400 mb-2">
          Email <span className="text-slate-600">(optional, for follow-up)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:border-purple-500/50 focus:outline-none text-sm"
        />
      </div>

      {/* System Info Toggle */}
      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={includeSystemInfo}
          onChange={(e) => setIncludeSystemInfo(e.target.checked)}
          className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500/50"
        />
        <div>
          <span className="text-sm text-slate-300">Include system information</span>
          <p className="text-xs text-slate-500">Helps us debug issues (browser, screen size, etc.)</p>
        </div>
      </label>

      {/* Validation Warning */}
      {!isValid && (title.length > 0 || description.length > 0) && (
        <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-300">
            {title.length < 3 
              ? 'Title must be at least 3 characters' 
              : 'Description must be at least 10 characters'}
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
          isValid && !submitting
            ? 'bg-purple-500 hover:bg-purple-600 text-white'
            : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send size={16} />
            Submit Feedback
          </>
        )}
      </button>

      {/* Privacy Note */}
      <p className="text-xs text-slate-600 text-center mt-3">
        Your feedback is stored locally for development purposes.
      </p>
    </div>
  );
}

// Quick feedback buttons for inline use
interface QuickFeedbackProps {
  context?: string;
  onFeedback?: (positive: boolean) => void;
}

export function QuickFeedback({ context, onFeedback }: QuickFeedbackProps): JSX.Element {
  const [selected, setSelected] = useState<'positive' | 'negative' | null>(null);
  
  const handleFeedback = (positive: boolean) => {
    setSelected(positive ? 'positive' : 'negative');
    onFeedback?.(positive);
    
    // Store quick feedback
    const existing = localStorage.getItem('avestella_quick_feedback');
    const list = existing ? JSON.parse(existing) : [];
    list.push({
      positive,
      context,
      timestamp: Date.now()
    });
    localStorage.setItem('avestella_quick_feedback', JSON.stringify(list));
  };
  
  if (selected) {
    return (
      <div className="text-xs text-slate-500 flex items-center gap-1">
        <CheckCircle size={12} className="text-green-400" />
        Thanks for your feedback!
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Was this helpful?</span>
      <button
        onClick={() => handleFeedback(true)}
        className="text-slate-400 hover:text-green-400 transition-colors"
      >
        👍
      </button>
      <button
        onClick={() => handleFeedback(false)}
        className="text-slate-400 hover:text-red-400 transition-colors"
      >
        👎
      </button>
    </div>
  );
}

export default FeedbackForm;
