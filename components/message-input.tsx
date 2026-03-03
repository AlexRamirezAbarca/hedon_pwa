'use client'

import { useState } from 'react'
import { Activity, MessageSquareHeart, Send } from 'lucide-react'

export function MessageInput({
    onSend,
    disabled
}: {
    onSend: (content: string, mode: 'dialogue' | 'action') => Promise<void>
    disabled?: boolean
}) {
    const [content, setContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [mode, setMode] = useState<'dialogue' | 'action' | null>(null)
    const [sendError, setSendError] = useState('')

    async function handleSend(e?: React.FormEvent) {
        if (e) e.preventDefault()

        if (!content.trim() || isSubmitting || !mode) return

        setIsSubmitting(true)
        setSendError('')

        try {
            await onSend(content, mode)
            setContent('')
            setMode(null)
        } catch (error: any) {
            console.error("Send Error:", error);
            setSendError(error.message || 'Error al enviar el mensaje');
        } finally {
            setIsSubmitting(false)
        }
    }

    if (mode) {
        return (
            <div className="w-full">
                <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-end gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
                    <button
                        type="button"
                        onClick={() => { setMode(null); setSendError(''); }}
                        className="p-3 text-zinc-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                    <div className="flex-1">
                        <p className={`text-[10px] uppercase font-bold tracking-widest pl-2 mb-1 ${mode === 'action' ? 'text-red-500' : 'text-zinc-400'}`}>
                            {mode === 'action' ? 'Acción Física' : 'Diálogo'}
                        </p>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={mode === 'action' ? "Describe lo que haces..." : "Dile algo de frente..."}
                            className="w-full bg-transparent border-none focus:outline-none text-zinc-200 resize-none px-2 text-sm md:text-base mb-1"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting || !content.trim() || disabled}
                        className="p-3 bg-red-900 border border-red-800 rounded-xl text-white hover:bg-red-800 transition-colors disabled:opacity-50 disabled:bg-zinc-800 disabled:border-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                {sendError && <p className="text-red-500 text-xs text-center mt-2 max-w-2xl mx-auto">{sendError}</p>}
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto flex gap-3">
            <button
                onClick={() => setMode('action')}
                disabled={disabled}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-sm md:text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Activity className="w-4 h-4 text-red-500" />
                Acción Física
            </button>
            <button
                onClick={() => setMode('dialogue')}
                disabled={disabled}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-sm md:text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <MessageSquareHeart className="w-4 h-4 text-red-500" />
                Diálogo
            </button>
        </div>
    )
}
