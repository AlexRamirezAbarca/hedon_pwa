'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendSessionMessage } from '@/app/actions/chat'
import { MessageList, Message } from './message-list'
import { MessageInput } from './message-input'
import { Playfair_Display } from "next/font/google"

const playfair = Playfair_Display({ subsets: ["latin"] })

export function ChatInterface({
    sessionId,
    initialMessages,
    currentUserId,
    isHost,
    initialChapterTitle,
    initialOptions
}: {
    sessionId: string
    initialMessages: Message[]
    currentUserId: string
    isHost: boolean
    initialChapterTitle: string
    initialOptions: string[]
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [chapterTitle, setChapterTitle] = useState(initialChapterTitle)
    const [options, setOptions] = useState<string[]>(initialOptions)
    const [isAudioPlaying, setIsAudioPlaying] = useState(false)
    const [isAudioLoading, setIsAudioLoading] = useState(false)
    const channelRef = useRef<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const supabase = createClient()

    const initialRequestSent = useRef(false)

    useEffect(() => {
        // Setup unified Realtime channel for BOTH Database Changes and P2P Broadcasts
        const channel = supabase.channel(`game_room_${sessionId}`, {
            config: { broadcast: { ack: false } }
        })

        channel
            .on('broadcast', { event: 'new_message' }, async (payload) => {
                const msg = payload.payload as Message
                setMessages((prev) => {
                    // Prevent duplicates if Postgres Changes also fires
                    if (prev.some(m => m.id === msg.id || m.content === msg.content)) return prev
                    return [...prev, msg]
                })

                // If the incoming broadcast message is from the AI, let's play ITS audio
                if (msg.role === 'system' || msg.role === 'ai') {
                    playAIAudio(msg.content);
                }
            })
            .on('broadcast', { event: 'ai_generating' }, () => {
                setChapterTitle("Generando Escena...");
                setOptions([]); // Clear options while generating
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_messages', filter: `session_id=eq.${sessionId}` }, (payload) => {
                const msg = payload.new as Message
                setMessages((prev) => {
                    if (prev.some(m => m.id === msg.id || m.content === msg.content)) return prev
                    return [...prev, msg]
                })
            })
            // Listen for game session updates (like changing the chapter title or current step)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
                if (payload.new && payload.new.current_step) {
                    if (payload.new.current_step.title) setChapterTitle(payload.new.current_step.title);
                    if (payload.new.current_step.options) setOptions(payload.new.current_step.options);
                }
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
        }
    }, [sessionId, supabase])

    // Helper to generate and play TTS audio
    const playAIAudio = async (text: string) => {
        try {
            setIsAudioLoading(true);
            const { generateTTS } = await import('@/app/actions/audio');
            const res = await generateTTS(text);
            if (res && res.success && res.audioSrc && audioRef.current) {
                // Pause any currently playing audio before starting a new one
                if (!audioRef.current.paused) {
                    audioRef.current.pause();
                }
                audioRef.current.src = res.audioSrc;

                // Add listener to release the UI lock automatically when audio finishes
                audioRef.current.onended = () => {
                    setIsAudioPlaying(false);
                };

                // Play and lock UI
                setIsAudioLoading(false);
                setIsAudioPlaying(true);
                audioRef.current.play().catch(e => {
                    console.warn("Audio autoplay blocked by browser:", e);
                    setIsAudioPlaying(false); // If autoplay fails, unlock UI immediately
                });
            } else {
                setIsAudioLoading(false);
            }
        } catch (error) {
            console.error("Failed to play TTS audio:", error);
            setIsAudioLoading(false);
        }
    }

    // FALLBACK POLLING: Guarantees messages arrive even if WebSockets fail or are delayed by the network
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            const { data, error } = await supabase
                .from('game_messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (!error && data && data.length > 0) {
                setMessages((prev) => {
                    const newMessages = [...prev];
                    let changed = false;
                    for (const msg of data as Message[]) {
                        // Check if message is missing locally (either by exact DB ID or by optimistic content match)
                        const exists = newMessages.some(m => m.id === msg.id || m.content === msg.content);
                        if (!exists) {
                            newMessages.push(msg);
                            changed = true;
                        } else if (newMessages.some(m => m.content === msg.content && m.id !== msg.id)) {
                            // Optionally, we could replace the optimistic temporary ID with the real DB ID here, 
                            // but for MVP preventing duplicates by content is safe enough.
                        }
                    }

                    if (changed) {
                        return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    }
                    return prev;
                });
            }

            // Poll for Session Title changes (if still generating)
            if (chapterTitle === "Generando Escena...") {
                const { data: sessionData } = await supabase
                    .from('game_sessions')
                    .select('current_step')
                    .eq('id', sessionId)
                    .single();

                if (sessionData?.current_step) {
                    if (sessionData.current_step.title && sessionData.current_step.title !== "Generando Escena...") {
                        setChapterTitle(sessionData.current_step.title);
                    }
                    if (sessionData.current_step.options) {
                        setOptions(sessionData.current_step.options);
                    }
                }
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [sessionId, supabase, chapterTitle]);

    // Trigger AI for the very first opening scene if the room is empty
    useEffect(() => {
        if (messages.length === 0 && !initialRequestSent.current && isHost) {
            initialRequestSent.current = true;

            const fetchInitialScenario = async () => {
                try {
                    const { checkAndTriggerAI } = await import('@/app/actions/chat');
                    const aiRes = await checkAndTriggerAI(sessionId);

                    if (aiRes && aiRes.success && aiRes.message) {
                        // Send the AI message to the partner immediately via P2P
                        if (channelRef.current) {
                            channelRef.current.send({
                                type: 'broadcast',
                                event: 'new_message',
                                payload: aiRes.message
                            })
                        }
                        // Update our own screen
                        setMessages(prev => {
                            if (prev.some(m => m.id === aiRes.message.id)) return prev;
                            return [...prev, aiRes.message as Message];
                        });

                        // Update our own title optimistically if AI returned it
                        if (aiRes.title) {
                            setChapterTitle(aiRes.title);
                        }
                        if (aiRes.options) {
                            setOptions(aiRes.options);
                        }

                        // Play the audio locally
                        playAIAudio(aiRes.message.content);
                    }
                } catch (e) {
                    console.error("Failed to generate initial scene", e);
                }
            }

            fetchInitialScenario();
        }
    }, [messages.length, sessionId]);

    const handleSendMessage = async (content: string, mode: 'dialogue' | 'action') => {
        // Stop any currently playing audio when taking an action to prevent overlap
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }

        const finalContent = mode === 'action' ? `*${content}*` : content

        const optimisticMessage: Message = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            sender_id: currentUserId,
            role: 'user',
            content: finalContent,
            created_at: new Date().toISOString()
        }

        // 1. Optimistic UI: Show instantly on sender's screen
        setMessages(prev => [...prev, optimisticMessage])

        // 2. P2P Broadcast: Show instantly on partner's screen (bypasses DB WAL latency)
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'new_message',
                payload: optimisticMessage
            })
        }

        // 3. Database Persistence: Save in background
        const res = await sendSessionMessage(sessionId, finalContent, 'user')
        if (res.error) {
            console.error("Failed to save message to DB:", res.error)
            return;
        }

        // 4. Strict Turn-Based AI Trigger Logic
        // We evaluate 'messagesSinceAi' BEFORE the current optimistic message is considered,
        // so we check if the partner had already spoken before this click.
        const lastAiMsgIdx = messages.map(m => m.role).lastIndexOf('ai');
        const msgsSinceAi = lastAiMsgIdx >= 0 ? messages.slice(lastAiMsgIdx + 1) : messages;
        const partnerAlreadySpoken = msgsSinceAi.some(m => m.sender_id !== currentUserId && m.role === 'user');

        // If partner spoke previously, and now I am speaking -> BOTH have spoken! Time for AI.
        if (partnerAlreadySpoken) {
            // Optimistic lock
            setChapterTitle("Generando Escena...");
            setOptions([]);

            // Notify partner that AI is generating so they don't freeze
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'ai_generating',
                    payload: {}
                })
            }

            const { checkAndTriggerAI } = await import('@/app/actions/chat');
            const aiRes = await checkAndTriggerAI(sessionId);

            if (aiRes && aiRes.success && aiRes.message) {
                // P2P Broadcast AI response
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'new_message',
                        payload: aiRes.message
                    })
                }
                // Update local UI
                setMessages(prev => [...prev, aiRes.message as Message])

                if (aiRes.title) {
                    setChapterTitle(aiRes.title);
                }
                if (aiRes.options) {
                    setOptions(aiRes.options);
                }
                // Play audio locally
                playAIAudio(aiRes.message.content);
            }
        }
    }

    // UI Turn State Selectors
    const lastAiMsgIndex = messages.map(m => m.role).lastIndexOf('ai');
    const messagesSinceAi = lastAiMsgIndex >= 0 ? messages.slice(lastAiMsgIndex + 1) : messages;

    const currentUserSpoken = messagesSinceAi.some(m => m.sender_id === currentUserId);
    const partnerSpoken = messagesSinceAi.some(m => m.sender_id !== currentUserId && m.role === 'user');

    const isGenerating = chapterTitle === "Generando Escena..." || messages.length === 0;
    const isWaitingForPartner = currentUserSpoken && !isGenerating && !partnerSpoken;

    // UI is completely locked if AI is generating, if the user already acted, OR if the AI is still speaking exactly right now.
    const isInputDisabled = isGenerating || currentUserSpoken || isAudioPlaying || isAudioLoading;

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Chapter Header rendered inside the Chat interface so it can be dynamic */}
            <div className={`text-center space-y-2 mb-12 transition-all duration-1000 ${isGenerating ? 'opacity-50 blur-[2px] animate-pulse' : 'opacity-100 blur-0 animate-in fade-in slide-in-from-bottom-4'}`}>
                <p className="text-red-500 text-sm font-bold tracking-[0.2em] uppercase">Capítulo I</p>
                <h2 className={`text-3xl md:text-4xl font-serif tracking-wide ${isGenerating ? 'text-zinc-500' : 'text-white'}`}>
                    {chapterTitle}
                </h2>
                <div className="w-12 h-px bg-red-900 mx-auto mt-4" />
            </div>

            <div className={`flex-1 w-full relative transition-all duration-1000 ${isGenerating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <MessageList messages={messages} currentUserId={currentUserId} />
            </div>

            <footer className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-black via-zinc-950 to-transparent pt-12 pb-6 px-6 z-10 pointer-events-none">
                <div className="pointer-events-auto max-w-2xl mx-auto">
                    {/* Status Indicators */}
                    {isGenerating && (
                        <div className="text-center mb-4 text-[10px] font-bold text-red-500/80 uppercase tracking-widest animate-pulse">
                            El Director está escribiendo...
                        </div>
                    )}
                    {!isGenerating && isAudioLoading && (
                        <div className="text-center mb-4 text-[10px] font-bold text-red-500/80 uppercase tracking-widest animate-pulse">
                            Preparando la Voz...
                        </div>
                    )}
                    {!isGenerating && !isAudioLoading && isAudioPlaying && (
                        <div className="text-center mb-4 text-[10px] font-bold text-red-500/80 uppercase tracking-widest animate-pulse">
                            El Director está hablando...
                        </div>
                    )}
                    {isWaitingForPartner && !isAudioPlaying && !isAudioLoading && (
                        <div className="text-center mb-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            Esperando a que tu pareja responda...
                        </div>
                    )}

                    {/* Guionismo Dinamico: Action Buttons + Free Text Input */}
                    {!isInputDisabled && (
                        <div className="flex flex-col gap-3">
                            {options.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    {options.slice(0, 2).map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(opt, 'action')}
                                            className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white py-3 px-4 rounded-xl font-medium text-sm transition-all border border-zinc-800 shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {/* Always allow free text input */}
                            <MessageInput onSend={handleSendMessage} disabled={isInputDisabled} />
                        </div>
                    )}
                </div>
            </footer>

            {/* Hidden Audio element for narration */}
            <audio ref={audioRef} className="hidden" />
        </div>
    )
}
