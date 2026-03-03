import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Playfair_Display } from "next/font/google"
import { LogOut } from "lucide-react"
import { LobbyClient } from "./lobby-client"

const playfair = Playfair_Display({ subsets: ["latin"] })

export default async function LobbyPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect("/login")
    }
    if (user.user_metadata?.has_paid !== true) {
        return redirect("/compra")
    }

    // 1. Verify Session Exists
    const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

    if (sessionError || !session) {
        return redirect('/')
    }

    // Determine if the current user is P1 (Initiator/Host) or P2
    const isHost = session.host_id === user.id

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-black overflow-hidden relative selection:bg-red-900/30">
            {/* Top Navigation Bar */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-900/50 bg-black/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <h1 className={`${playfair.className} text-xl font-black tracking-tight text-white`}>
                        Hedon<span className="text-red-700">.</span>
                    </h1>
                </div>
                <form action={async () => {
                    "use server"
                    const { abandonGameSession } = await import('@/app/actions/game')
                    await abandonGameSession(id)
                }}>
                    <button type="submit" title="Abandonar Sala" className="text-zinc-500 hover:text-red-500 transition-colors p-2">
                        <LogOut className="w-5 h-5" />
                    </button>
                </form>
            </header>

            <main className="flex-1 overflow-y-auto pb-32 pt-8 px-6 md:px-12 lg:px-24">
                <div className="max-w-xl mx-auto space-y-8">
                    {/* Chapter Header */}
                    <div className="text-center space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <p className="text-red-500 text-xs font-bold tracking-[0.2em] uppercase">Preparativos</p>
                        <h2 className={`${playfair.className} text-3xl font-black text-white`}>El Directorio</h2>
                        <div className="w-12 h-px bg-red-900 mx-auto mt-4" />
                    </div>

                    {/* Interactive UI */}
                    <LobbyClient sessionId={id} isHost={isHost} initialContext={session.initial_context} />
                </div>
            </main>
        </div>
    )
}
