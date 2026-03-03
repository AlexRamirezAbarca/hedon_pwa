'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Play } from 'lucide-react'
import { startGameSession } from '@/app/actions/game'
import { useRouter } from 'next/navigation'

export function GameStartButton() {
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const router = useRouter()

    async function handleStart() {
        setLoading(true)
        setErrorMsg('')

        const res = await startGameSession()

        if (res.error) {
            setErrorMsg(res.error)
            setLoading(false)
        } else if (res.sessionId) {
            router.push(`/lobby/${res.sessionId}`)
        }
    }

    return (
        <div className="w-full space-y-2">
            <Button
                onClick={handleStart}
                disabled={loading}
                className="w-full bg-red-900 text-white hover:bg-red-800 h-12 text-lg font-serif font-bold shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all"
            >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
                Comenzar Experiencia
            </Button>
            {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
        </div>
    )
}
