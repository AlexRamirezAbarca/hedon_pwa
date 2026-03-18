'use client'

import { useState } from "react"
import { LogOut, User as UserIcon, Settings, ChevronDown, Shield } from "lucide-react"
import { User } from "@supabase/supabase-js"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export function UserMenu({ user }: { user: User }) {
    const router = useRouter()
    const supabase = createClient()
    const [isSignOut, setIsSignOut] = useState(false)

    const handleSignOut = async () => {
        setIsSignOut(true)

        // 1. Limpiar el estado del navegador para que el Splash vuelva a salir al iniciar sesion
        sessionStorage.removeItem('hedon_splash_shown')

        // 2. Destruir sesión en el auth service
        await supabase.auth.signOut()

        // 3. Redirigir y forzar recarga dura
        router.refresh()
        router.push('/login')
    }

    const initial = user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "H"

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-zinc-900/50 p-1.5 rounded-full transition-colors outline-none ring-0">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex justify-center items-center text-zinc-400 font-serif shadow-inner">
                    {initial}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-600 hidden md:block mr-1" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-black/90 border-zinc-900 backdrop-blur-xl shadow-2xl p-2 rounded-xl">
                <DropdownMenuLabel className="flex flex-col space-y-1">
                    <span className="text-sm font-medium text-white leading-none">
                        {user.user_metadata?.full_name || 'Amante'}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono truncate">
                        {user.email}
                    </span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="bg-zinc-900/50 my-2" />

                <DropdownMenuItem className="focus:bg-zinc-900 rounded-lg cursor-pointer text-zinc-400 focus:text-white transition-colors py-2.5">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <span>Perfil de Jugador</span>
                </DropdownMenuItem>

                <DropdownMenuItem className="focus:bg-zinc-900 rounded-lg cursor-pointer text-zinc-400 focus:text-white transition-colors py-2.5" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    <span>Ajustes (Próximamente)</span>
                </DropdownMenuItem>

                <Link href="/admin">
                    <DropdownMenuItem className="focus:bg-zinc-900 rounded-lg cursor-pointer text-zinc-400 focus:text-white transition-colors py-2.5">
                        <Shield className="w-4 h-4 mr-2" />
                        <span>Centro de Mando</span>
                    </DropdownMenuItem>
                </Link>

                <DropdownMenuSeparator className="bg-zinc-900/50 my-2" />

                <DropdownMenuItem
                    onClick={handleSignOut}
                    disabled={isSignOut}
                    className="focus:bg-red-950/30 rounded-lg cursor-pointer text-red-500 focus:text-red-400 transition-colors py-2.5"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>{isSignOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
