// ═══════════════════════════════════════════════════════════════════════════
// AVESTELLA - Messages Panel
// Real-time messaging with friends
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { MessageCircle, X, Send, Gift } from 'lucide-react';
import { useSocialContext } from '@/contexts/GameContext';
import { useUI } from '@/contexts/UIContext';
import SendGiftModal from './SendGiftModal';

export function MessagesPanel(): JSX.Element {
    const { closePanel } = useUI();
    const {
        friends,
        conversations,
        unreadMessages,
        sendMessage,
        markAsRead
    } = useSocialContext();

    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [giftModalOpen, setGiftModalOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeFriend = friends.find(f => f.id === activeChatId);
    const currentMessages = activeChatId ? (conversations[activeChatId] || []) : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeChatId) {
            scrollToBottom();
            markAsRead(activeChatId);
        }
    }, [conversations, activeChatId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeChatId || !inputRef.current) return;

        const text = inputRef.current.value.trim();
        if (text) {
            sendMessage(activeChatId, text);
            inputRef.current.value = '';
            scrollToBottom();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closePanel}
        >
            <div
                className="bg-gradient-to-br from-slate-900 to-emerald-950 border-2 border-green-500/30 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Chat List Sidebar */}
                <div className={`w-80 border-r border-green-500/20 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex w-full'}`}>
                    <div className="p-6 border-b border-green-500/20">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                                <MessageCircle size={24} />
                                Messages
                            </h2>
                            {!activeChatId && (
                                <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl">
                                    <X size={24} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {friends.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-2">💬</div>
                                <p className="text-white/60 text-sm">Add friends to start chatting</p>
                            </div>
                        ) : (
                            friends.map(friend => {
                                const friendMsgs = conversations[friend.id] || [];
                                const lastMessage = friendMsgs[friendMsgs.length - 1];
                                const unread = unreadMessages[friend.id] || 0;

                                return (
                                    <button
                                        key={friend.id}
                                        onClick={() => setActiveChatId(friend.id)}
                                        className={`w-full p-3 rounded-lg text-left transition-all ${activeChatId === friend.id
                                            ? 'bg-green-500/30 border-2 border-green-500/50'
                                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xl">
                                                    {friend.avatar}
                                                </div>
                                                {friend.online && (
                                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-white font-medium">{friend.name}</div>
                                                    {unread > 0 && (
                                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                            {unread}
                                                        </div>
                                                    )}
                                                </div>
                                                {lastMessage ? (
                                                    <div className="text-white/60 text-xs truncate flex justify-between">
                                                        <span className="truncate max-w-[120px]">
                                                            {lastMessage.from === 'player' ? 'You: ' : ''}{lastMessage.text}
                                                        </span>
                                                        <span className="opacity-60 ml-2">
                                                            {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-white/30 text-xs italic">Start a conversation</div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`flex-1 flex flex-col ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
                    {activeChatId && activeFriend ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-6 border-b border-green-500/20 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setActiveChatId(null)}
                                        className="text-white/60 hover:text-white mr-2 md:hidden"
                                    >
                                        ←
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-lg">
                                        {activeFriend.avatar}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold">
                                            {activeFriend.name}
                                        </div>
                                        <div className="text-green-400 text-xs">
                                            {activeFriend.online ? '● Online' : 'Offline'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setGiftModalOpen(true)}
                                        className="p-2 text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 rounded-lg transition-colors"
                                        title="Send a gift"
                                    >
                                        <Gift size={20} />
                                    </button>
                                    <button onClick={closePanel} className="text-white/60 hover:text-white p-2">
                                        <X size={24} />
                                    </button>
                                </div>

                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
                                {currentMessages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-white/30">
                                        <div className="text-6xl mb-4 opacity-20">{activeFriend.avatar}</div>
                                        <p>Start chatting with {activeFriend.name}</p>
                                        <p className="text-xs mt-2">Say hello! 👋</p>
                                    </div>
                                ) : (
                                    currentMessages.map((msg) => {
                                        const isPlayer = msg.from === 'player';

                                        return (
                                            <div key={msg.id} className={`flex gap-3 ${isPlayer ? 'flex-row-reverse' : ''}`}>
                                                {!isPlayer && (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-sm flex-shrink-0 self-end mb-1">
                                                        {activeFriend.avatar}
                                                    </div>
                                                )}
                                                <div className={`max-w-[70%] flex flex-col gap-1 ${isPlayer ? 'items-end' : 'items-start'}`}>
                                                    <div
                                                        className={`px-4 py-2 rounded-2xl break-words ${isPlayer
                                                            ? 'bg-green-500 text-white rounded-tr-sm'
                                                            : 'bg-slate-700 text-white rounded-tl-sm'
                                                            }`}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                    <div className="text-white/30 text-[10px] px-1">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t border-green-500/20 bg-black/40">
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex gap-2"
                                >
                                    <input
                                        ref={inputRef}
                                        name="message"
                                        type="text"
                                        placeholder={`Message ${activeFriend.name}...`}
                                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all font-medium"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/20 flex items-center gap-2"
                                    >
                                        <Send size={18} />
                                        <span className="hidden sm:inline">Send</span>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-white/40 bg-black/20">
                            <div className="text-center">
                                <MessageCircle size={64} className="mx-auto mb-6 opacity-20" />
                                <h3 className="text-xl font-bold text-white/60 mb-2">Your Conversations</h3>
                                <p className="max-w-xs mx-auto">Select a friend from the sidebar to start chatting</p>
                            </div>
                            <button onClick={closePanel} className="absolute top-6 right-6 text-white/40 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Gift Modal */}
            <SendGiftModal
                isOpen={giftModalOpen}
                onClose={() => setGiftModalOpen(false)}
                friend={activeFriend || null}
            />
        </div >
    );
}
