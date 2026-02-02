import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import { ChevronRight, X, HelpCircle, MousePointer2 } from 'lucide-react';

export function TutorialOverlay(): JSX.Element | null {
    const { tutorial } = useGame();
    const { showTutorial, currentStep, tutorialStep, totalSteps, skipTutorial, advanceTutorial } = tutorial;
    const { isHUDVisible } = useUI();

    if (!showTutorial || !currentStep || !isHUDVisible) return null;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/50 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] overflow-hidden">
                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-800">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${((tutorialStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-full">
                                <HelpCircle size={16} className="text-indigo-400" />
                            </div>
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                Tutorial {tutorialStep + 1}/{totalSteps}
                            </span>
                        </div>
                        {currentStep.skippable && (
                            <button
                                onClick={skipTutorial}
                                className="text-slate-500 hover:text-white transition-colors p-1"
                                aria-label="Skip Tutorial"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">
                        {currentStep.title}
                    </h3>

                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                        {currentStep.text}
                    </p>

                    {!currentStep.goal && currentStep.skippable && (
                        <div className="flex justify-end">
                            <button
                                onClick={advanceTutorial}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {currentStep.goal && (
                        <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-900/30 p-2 rounded border border-indigo-500/20">
                            <MousePointer2 size={12} />
                            <span>Perform action to continue...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
