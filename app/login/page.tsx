'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { login, signup } from "./actions"
import { Playfair_Display } from "next/font/google"
import { Loader2, ShieldCheck, Lock, CheckCircle2 } from "lucide-react"

const playfair = Playfair_Display({ subsets: ["latin"] })

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Garantizar que siempre se muestre el splash al venir desde el Login
    useEffect(() => {
        sessionStorage.removeItem('hedon_splash_shown')
    }, [])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        const action = isLogin ? login : signup
        const result = await action(formData)
        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-transparent text-white selection:bg-red-900 selection:text-white relative overflow-hidden">

            {/* Background Ambience Mobile Only (Removed, relying on Global Layout) */}

            {/* --- LEFT COLUMN: MAN --- */}
            <div className="hidden lg:flex w-1/3 relative bg-black/40 items-center justify-center overflow-hidden border-r border-red-900/10 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-20" />

                <div className="absolute top-12 left-12 z-30 opacity-60">
                    <h4 className="text-xs font-bold tracking-[0.3em] uppercase rotate-90 origin-top-left translate-y-12 translate-x-3 text-red-900/50">
                        ÉL
                    </h4>
                </div>

                {/* Placeholder for Man Image */}
                <div className="w-full h-full flex items-center justify-center text-red-900/10 text-9xl font-serif">M</div>
            </div>


            {/* --- CENTER COLUMN: FORM --- */}
            <div className="w-full lg:w-1/3 flex flex-col items-center justify-center p-6 md:p-12 relative z-40 bg-black/60 backdrop-blur-md border-x border-red-900/10">

                <div className="w-full max-w-sm space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-3">
                        <h1 className={`${playfair.className} text-5xl font-black tracking-tighter text-white drop-shadow-lg`}>
                            Hedon<span className="text-red-600">.</span>
                        </h1>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">
                            Erotismo Guiado
                        </p>
                    </div>

                    {/* Value Props */}
                    <div className="flex justify-center gap-6 text-[9px] text-zinc-500 font-bold tracking-widest uppercase opacity-80">
                        <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-zinc-600" /> Discreto</span>
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-zinc-600" /> Seguro</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-zinc-600" /> Tuyo</span>
                    </div>

                    <form action={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <Label htmlFor="fullName" className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider ml-1">Nombre</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="Tu nombre o alias"
                                    required
                                    className="bg-zinc-900/80 border-zinc-800 focus:border-red-900/50 text-white placeholder:text-zinc-600 h-12 transition-all font-light rounded-lg text-base md:text-sm shadow-inner"
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider ml-1">Correo</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                required
                                className="bg-zinc-900/80 border-zinc-800 focus:border-red-900/50 text-white placeholder:text-zinc-600 h-12 transition-all font-light rounded-lg text-base md:text-sm shadow-inner"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <Label htmlFor="password" className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Contraseña</Label>
                                <a href="#" className="text-[10px] text-zinc-500 hover:text-red-500 transition-colors">¿Olvidaste tu contraseña?</a>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                className="bg-zinc-900/80 border-zinc-800 focus:border-red-900/50 text-white h-12 transition-all font-light rounded-lg text-base md:text-sm shadow-inner"
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs bg-red-950/40 p-3 rounded-lg border border-red-900/30 text-center animate-in fade-in slide-in-from-top-1 backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="pt-4">
                            <Button type="submit" disabled={loading} className="w-full bg-white hover:bg-zinc-200 text-black font-bold h-12 text-xs transition-all tracking-widest uppercase rounded-lg shadow-[0_0_20px_-5px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)] active:scale-[0.98]">
                                {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                            </Button>
                        </div>
                    </form>

                    {/* Toggle + Legal */}
                    <div className="space-y-8 text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-zinc-400 hover:text-white transition-colors py-2"
                        >
                            {isLogin ? (<span>¿Nuevo? <strong className="text-white underline decoration-zinc-700 underline-offset-4 decoration-2">Regístrate aquí</strong></span>) : (<span>¿Ya tienes cuenta? <strong className="text-white underline decoration-zinc-700 underline-offset-4 decoration-2">Ingresa</strong></span>)}
                        </button>

                        <div className="pt-6 border-t border-zinc-900/50">
                            <p className="text-[9px] text-zinc-600 leading-relaxed max-w-[280px] mx-auto">
                                Al ingresar confirmas ser mayor de <strong className="text-zinc-500">+18 años</strong>. Aceptas nuestros <a href="#" className="underline decoration-zinc-800 hover:text-zinc-500">Términos</a> y <a href="#" className="underline decoration-zinc-800 hover:text-zinc-500">Privacidad</a>.
                            </p>
                        </div>
                    </div>

                </div>
            </div>


            {/* --- RIGHT COLUMN: WOMAN --- */}
            <div className="hidden lg:flex w-1/3 relative bg-black/40 items-center justify-center overflow-hidden border-l border-red-900/10 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent z-20" />

                <div className="absolute top-12 right-12 z-30 opacity-60">
                    <h4 className="text-xs font-bold tracking-[0.3em] uppercase -rotate-90 origin-top-right translate-y-12 -translate-x-3 text-red-900/50">
                        ELLA
                    </h4>
                </div>

                {/* Placeholder for Woman Image */}
                <div className="w-full h-full flex items-center justify-center text-red-900/10 text-9xl font-serif">W</div>
            </div>

        </div>
    )
}
