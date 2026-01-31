// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Tutorial Hook (TypeScript)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { TutorialProgress } from '@/types';
import { useServerSync } from './useServerSync';

// Tutorial steps configuration
export const TUTORIAL_STEPS = [
    {
        title: 'Welcome to Avestella',
        text: 'You are a light in the cosmos. Move around using the joystick or arrow keys.',
        goal: null,
        skippable: true
    },
    {
        title: 'Collect Fragments',
        text: 'Collect 3 light fragments to grow brighter.',
        goal: 'collect_3_fragments',
        skippable: true
    },
    {
        title: 'Meet Other Souls',
        text: 'Approach another soul. Your lights will pulse when near.',
        goal: 'approach_soul',
        skippable: true
    },
    {
        title: 'Form a Bond',
        text: 'Double tap (or double click) near a soul to Pulse and form a bond.',
        goal: 'form_bond',
        skippable: true
    },
    {
        title: 'Visit a Beacon',
        text: 'Find and approach a beacon - the larger glowing points on the map.',
        goal: 'visit_beacon',
        skippable: false
    },
    {
        title: 'Your Journey Begins',
        text: 'Explore, connect, and grow your light. Welcome to the cosmos!',
        goal: null,
        skippable: false
    }
];

export interface UseTutorialOptions {
    onToast?: (message: string) => void;
    onTrackEvent?: (event: string, data?: Record<string, unknown>) => void;
}

export interface UseTutorialReturn {
    showTutorial: boolean;
    setShowTutorial: React.Dispatch<React.SetStateAction<boolean>>;
    tutorialStep: number;
    setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
    tutorialProgress: TutorialProgress;
    setTutorialProgress: React.Dispatch<React.SetStateAction<TutorialProgress>>;
    advanceTutorial: () => void;
    skipTutorial: () => void;
    replayTutorial: () => void;
    checkTutorialProgress: (goal: keyof TutorialProgress, value?: boolean | number) => void;
    currentStep: typeof TUTORIAL_STEPS[number] | undefined;
    totalSteps: number;
}

export function useTutorial(options: UseTutorialOptions = {}): UseTutorialReturn {
    const { onToast, onTrackEvent } = options;
    const serverSync = useServerSync('current'); // Attach to current player context if available

    const [showTutorial, setShowTutorial] = useState<boolean>(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isReplaying, setIsReplaying] = useState(false);

    // Sync state from server when loaded
    useEffect(() => {
        if (!serverSync.loading && serverSync.playerData) {
            const isComplete = serverSync.hasAchievement('tutorial_complete') ||
                serverSync.playerData.quests.completedQuestIds.includes('tutorial');

            if (isComplete && !isReplaying) {
                setShowTutorial(false);
            } else if (!isComplete) {
                setShowTutorial(true);
                // Resume step if started
                const serverStep = serverSync.playerData.quests.questProgress['tutorial'] || 0;
                setTutorialStep(serverStep);
            }
        }
    }, [serverSync.loading, serverSync.playerData, isReplaying]);

    const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>({
        collect_3_fragments: 0,
        approach_soul: false,
        form_bond: false,
        visit_beacon: false
    });

    const showTutorialRef = useRef(showTutorial);
    const tutorialStepRef = useRef(tutorialStep);

    useEffect(() => {
        showTutorialRef.current = showTutorial;
        tutorialStepRef.current = tutorialStep;
    }, [showTutorial, tutorialStep]);

    const advanceTutorial = useCallback(() => {
        if (tutorialStep < TUTORIAL_STEPS.length - 1) {
            const nextStep = tutorialStep + 1;
            setTutorialStep(nextStep);

            // Sync step to server
            if (!isReplaying) {
                serverSync.updateQuestProgress('tutorial', nextStep);
            }

            onTrackEvent?.('tutorial_step_completed', { step: tutorialStep });
        } else {
            // Tutorial complete
            setShowTutorial(false);
            setIsReplaying(false);

            // Sync completion
            if (!isReplaying) {
                serverSync.completeQuest('tutorial');
                serverSync.unlockAchievement('tutorial_complete');
            }

            onTrackEvent?.('tutorial_completed');
            onToast?.('✨ Tutorial complete! Your journey begins');
        }
    }, [tutorialStep, onTrackEvent, onToast, serverSync, isReplaying]);

    const skipTutorial = useCallback(() => {
        setShowTutorial(false);
        setIsReplaying(false);

        // Mark complete on server
        if (!isReplaying) {
            serverSync.completeQuest('tutorial');
            serverSync.unlockAchievement('tutorial_complete');
        }

        onTrackEvent?.('tutorial_skipped', { step: tutorialStep });
        onToast?.('Tutorial skipped');
    }, [tutorialStep, onTrackEvent, onToast, serverSync, isReplaying]);

    const replayTutorial = useCallback(() => {
        setIsReplaying(true);
        setShowTutorial(true);
        setTutorialStep(0);
        setTutorialProgress({
            collect_3_fragments: 0,
            approach_soul: false,
            form_bond: false,
            visit_beacon: false
        });
        onTrackEvent?.('tutorial_replayed');
    }, [onTrackEvent]);

    const checkTutorialProgress = useCallback((goal: keyof TutorialProgress, value: boolean | number = true) => {
        if (!showTutorialRef.current) return;

        setTutorialProgress(prev => {
            const updated = { ...prev };

            if (goal === 'collect_3_fragments' && typeof value === 'number') {
                updated.collect_3_fragments = Math.min(value, 3);
                if (updated.collect_3_fragments >= 3 && tutorialStepRef.current === 1) {
                    setTimeout(() => advanceTutorial(), 500);
                }
            } else if (typeof value === 'boolean') {
                (updated as Record<string, boolean | number>)[goal] = value;
                const currentStep = TUTORIAL_STEPS[tutorialStepRef.current];
                if (value && currentStep?.goal === goal) {
                    setTimeout(() => advanceTutorial(), 500);
                }
            }

            return updated;
        });
    }, [advanceTutorial]);

    return {
        showTutorial,
        setShowTutorial,
        tutorialStep,
        setTutorialStep,
        tutorialProgress,
        setTutorialProgress,
        advanceTutorial,
        skipTutorial,
        replayTutorial,
        checkTutorialProgress,
        currentStep: TUTORIAL_STEPS[tutorialStep],
        totalSteps: TUTORIAL_STEPS.length
    };
}
