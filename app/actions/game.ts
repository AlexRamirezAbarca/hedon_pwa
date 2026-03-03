'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function startGameSession() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    // 1. Get user's active couple
    const { data: activeCouple, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq('status', 'ACTIVE')
        .single()

    if (fetchError || !activeCouple) {
        return { error: 'No tienes una pareja vinculada activa.' }
    }

    // 2. See if a session already exists for this couple
    const { data: existingSession } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('couple_id', activeCouple.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (existingSession) {
        // Just redirect if it already exists
        return { success: true, sessionId: existingSession.id }
    }

    // 3. Create new game session where current user is host
    const { data: newSession, error: createError } = await supabase
        .from('game_sessions')
        .insert({
            host_id: user.id,
            couple_id: activeCouple.id,
            status: 'ACTIVE',
            current_step: { chapter: 1, text: 'Preparando la atmósfera...' }
        })
        .select()
        .single()

    if (createError) {
        console.error("Error creating game session:", createError)
        return { error: 'Error al iniciar la experiencia.' }
    }

    return { success: true, sessionId: newSession.id }
}

export async function saveLobbyConfig(sessionId: string, config: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('game_sessions')
        .update({ initial_context: config })
        .eq('id', sessionId)
        .eq('host_id', user.id) // Security: only host can update

    if (error) {
        console.error("Error saving lobby config:", error)
        return { error: `Error DB: ${error.message || 'Desconocido'}` }
    }

    return { success: true }
}

export async function abandonGameSession(sessionId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        // Find the couple associated to this session
        const { data: session } = await supabase.from('game_sessions').select('couple_id').eq('id', sessionId).single()
        
        if (session && session.couple_id) {
             // Wipe the game session entirely to clear out history and let them start a fresh one tomorrow/today
             await supabase.from('game_sessions').delete().eq('id', sessionId)
        }
    }
    
    revalidatePath('/')
    redirect('/')
}
