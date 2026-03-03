import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Playfair_Display } from "next/font/google"
import { Activity, Settings, MessageSquareHeart, LogOut } from "lucide-react"

import { Message } from "@/components/message-list"
import { ChatInterface } from "@/components/chat-interface"

const playfair = Playfair_Display({ subsets: ["latin"] })

export default async function PlaySessionPage({
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

    // 1. Verify Session Exists
    const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', id)
        .single()

    if (sessionError || !session) {
        return (
            <div className="p-8 text-white min-h-screen bg-black">
                <h1 className="text-2xl text-red-500 font-bold mb-4">Error cargando sesión de juego</h1>
                <p className="mb-4 text-zinc-400">Pudimos entrar a la ruta, pero la base de datos rechazó darnos los datos de la partida. Por favor envíame una captura de este error:</p>
                <pre className="text-xs text-zinc-400 bg-zinc-900 p-4 rounded-xl overflow-auto border border-zinc-800">
                    {JSON.stringify({
                        requestedSessionId: id,
                        authUserId: user.id,
                        error: sessionError,
                        sessionData: session
                    }, null, 2)}
                </pre>
            </div>
        )
    }

    // 2. Fetch Initial History
    // Ignore errors here gently; if the table isn't created yet or is empty, we just pass []
    const { data: fetchMessages } = await supabase
        .from('game_messages')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true })

    const initialMessages = (fetchMessages || []) as Message[]

    // 3. Extract dynamic title and options from session or fallback
    const chapterTitle = session.current_step?.title || "Generando Escena...";
    const initialOptions = session.current_step?.options || [];

    // 4. Render Immersive UI
    return (
        <div className="flex-1 flex flex-col h-screen max-h-screen bg-zinc-950 overflow-hidden relative selection:bg-red-900/30">
            {/* Top Navigation Bar */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-900/50 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className={`${playfair.className} text-xl font-black tracking-tight text-white`}>
                        Hedon<span className="text-red-700">.</span>
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-red-950/30 text-red-500 text-[10px] font-bold tracking-widest uppercase border border-red-900/20">
                        En Vivo
                    </span>
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

            {/* Main Reading Area (The Story) */}
            <main className="flex-1 overflow-y-auto pb-64 pt-8 px-6 md:px-12 lg:px-24">
                <div className="max-w-2xl mx-auto space-y-8">

                    {/* Chat / Story Render */}
                    <ChatInterface
                        sessionId={id}
                        initialMessages={initialMessages}
                        currentUserId={user.id}
                        isHost={session.host_id === user.id}
                        initialChapterTitle={chapterTitle}
                        initialOptions={initialOptions}
                    />
                </div>
            </main>
        </div>
    )
}
