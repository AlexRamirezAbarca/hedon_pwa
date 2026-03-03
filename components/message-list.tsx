'use client'

import { useEffect, useState, useRef } from 'react'
export type Message = {
    id: string
    session_id: string
    sender_id: string | null
    role: 'system' | 'ai' | 'user'
    content: string
    created_at: string
}

export function MessageList({
    messages,
    currentUserId
}: {
    messages: Message[],
    currentUserId: string
}) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    return (
        <div className="space-y-6">
            {messages.map((msg) => {
                if (msg.role === 'system' || msg.role === 'ai') {
                    // AI / System Message styling
                    return (
                        <div key={msg.id} className="text-lg md:text-xl text-zinc-300 leading-relaxed font-serif animate-in fade-in duration-500">
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i} className="mb-4">{line}</p>
                            ))}
                        </div>
                    )
                }

                // User Message styling
                const isMe = msg.sender_id === currentUserId
                return (
                    <div key={msg.id} className={`flex flex-col mt-8 animate-in fade-in duration-500 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`border rounded-2xl px-4 py-3 max-w-[80%] backdrop-blur-sm ${isMe
                            ? 'bg-zinc-900 border-zinc-800 rounded-br-sm'
                            : 'bg-red-950/40 border-red-900/30 rounded-bl-sm'
                            }`}>
                            <p className="text-sm md:text-base text-zinc-200">
                                <span className={`font-bold mr-2 ${isMe ? 'text-zinc-500' : 'text-red-400'}`}>
                                    {isMe ? 'Tú:' : 'P2:'}
                                </span>
                                {msg.content}
                            </p>
                        </div>
                    </div>
                )
            })}
            <div ref={bottomRef} />
        </div>
    )
}
