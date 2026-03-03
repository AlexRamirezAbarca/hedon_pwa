'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendSessionMessage(sessionId: string, content: string, role: 'user' | 'system' = 'user') {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('game_messages')
        .insert({
            session_id: sessionId,
            sender_id: user.id,
            content,
            role
        })

    if (error) {
        console.error("Error sending message:", error)
        return { error: 'No se pudo enviar el mensaje.' }
    }

    // Trigger AI response generation here in the future
    
    revalidatePath(`/play/${sessionId}`)
    return { success: true }
}

export async function checkAndTriggerAI(sessionId: string) {
    // Dynamically import to avoid edge runtime issues if any
    const { advanceStoryWithAI } = await import('@/app/actions/ai-director');
    return await advanceStoryWithAI(sessionId);
}
