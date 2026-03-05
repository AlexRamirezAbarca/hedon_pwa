'use client'

import { useEffect, useState } from 'react'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })

export function WelcomeSplash() {
    // Only show if it's the first time in this session
    const [show, setShow] = useState<boolean | null>(null)
    const [fade, setFade] = useState(false)

    useEffect(() => {
        const hasShown = sessionStorage.getItem('hedon_splash_shown')
        if (hasShown) {
            setShow(false)
            return
        }

        setShow(true)
        sessionStorage.setItem('hedon_splash_shown', 'true')

        // Empezar a hacer fade out a los 2.5 segundos
        const timer1 = setTimeout(() => {
            setFade(true)
        }, 2200)

        // Remover del DOM por completo a los 3.5 segundos
        const timer2 = setTimeout(() => {
            setShow(false)
        }, 3200)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
        }
    }, [])

    // Prevent hydration mismatch or flashing
    if (show === null || show === false) return null

    return (
        <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className={`text-center space-y-4 transition-transform duration-1000 ease-out ${fade ? 'scale-110 blur-sm' : 'scale-100 blur-none'}`}>
                {/* Logo with subtle glow */}
                <h1 className={`${playfair.className} text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(220,38,38,0.2)]`}>
                    Hedon<span className="text-red-700">.</span>
                </h1>

                {/* Sensual subtitle */}
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-bold animate-pulse">
                    Despertando los sentidos...
                </p>

                {/* Decorative line */}
                <div className="w-32 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent mx-auto mt-8" />
            </div>
        </div>
    )
}
