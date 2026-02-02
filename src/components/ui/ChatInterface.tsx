import React, { useState, useEffect, useRef } from 'react';
import { useSocialContext, useGameStateContext } from '@/contexts/GameContext';
import { gameClient } from '@/services/GameClient';

export function ChatInterface(): JSX.Element | null {
    const { gameState, broadcastMessage } = useGameStateContext();
    const { friends } = useSocialContext();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'guild' | 'friends'>('guild');
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ id: string, from: string, text: string, time: number }[]>([]);

    // Listen for incoming messages
    useEffect(() => {
        const handleChatMessage = (data: { playerId: string, playerName: string, message: string, channel: string, timestamp: number }) => {
            const newMsg = {
                id: `msg_${Date.now()}_${Math.random()}`,
                from: data.playerName || 'Unknown',
                text: data.message,
                time: data.timestamp || Date.now()
            };
            setChatHistory(prev => [...prev.slice(-49), newMsg]);
        };

        const handleWhisper = (data: { fromId: string, fromName: string, message: string, timestamp: number }) => {
            const newMsg = {
                id: `msg_${Date.now()}_${Math.random()}`,
                from: `${data.fromName} (Whisper)`,
                text: data.message,
                time: data.timestamp || Date.now()
            };
            setChatHistory(prev => [...prev.slice(-49), newMsg]);
        };

        gameClient.on('chat_message', handleChatMessage);
        gameClient.on('whisper_received', handleWhisper);

        return () => {
            gameClient.off('chat_message', handleChatMessage);
            gameClient.off('whisper_received', handleWhisper);
        };
    }, []);

    if (!isOpen) {
        // Chat toggle is handled by ActionBar, return null when closed
        return null;
    }

    const handleSend = () => {
        if (!message.trim()) return;

        // Add user message
        const newMsg = {
            id: `msg_${Date.now()} `,
            from: 'You',
            text: message,
            time: Date.now()
        };
        setChatHistory(prev => [...prev.slice(-19), newMsg]);
        setMessage('');

        // Broadcast mood to nearby agents (visual feedback)
        if (gameState.current) {
            broadcastMessage(message, gameState.current.playerX, gameState.current.playerY);
        }
    };

    return (
        <div className="fixed bottom-24 right-4 w-80 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden flex flex-col z-40 shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto">
            {/* Header */}
            <div className="p-3 bg-white/5 border-b border-white/10 flex justify-between items-center">
                <div className="flex gap-4 font-bold text-sm">
                    <button
                        onClick={() => setActiveTab('guild')}
                        className={`${activeTab === 'guild' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/80'} `}
                    >
                        Guild Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`${activeTab === 'friends' ? 'text-white border-b-2 border-purple-500' : 'text-white/40 hover:text-white/80'} `}
                    >
                        Friends
                    </button>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 h-64 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {chatHistory.map(msg => (
                    <div key={msg.id} className="flex flex-col">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className={`text - xs font - bold ${msg.from === 'You' ? 'text-purple-400' : 'text-amber-400'} `}>
                                {msg.from}
                            </span>
                            <span className="text-[10px] text-white/30">
                                {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="text-sm text-white/90 break-words bg-white/5 p-2 rounded-lg rounded-tl-none">
                            {msg.text}
                        </div>
                    </div>
                ))}
                {chatHistory.length === 0 && (
                    <div className="text-center text-white/30 text-xs py-8 italic">
                        No messages yet...
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Say something..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                    onClick={handleSend}
                    className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 py-2 transition-colors"
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
