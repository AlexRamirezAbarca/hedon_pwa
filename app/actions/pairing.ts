'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// RLS is enabled, so we rely on the authenticated user's token

export async function getOrCreateCoupleCode() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    // 1. Check if the user is already part of a couple (either A or B)
    const { data: existingCouple, error: fetchError } = await supabase
        .from('couples')
        .select('*')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means zero rows, which is fine
        console.error("Error fetching couple:", fetchError)
        return { error: 'Error al buscar pareja existente.' }
    }

    // 2. If exists, return the code and status
    if (existingCouple) {
        return { 
            success: true, 
            id: existingCouple.id,
            code: existingCouple.couple_code, 
            status: existingCouple.status 
        }
    }

    // 3. If not, create a new pending couple where current user is A
    // The DB default generates a random `couple_code`
    const { data: newCouple, error: insertError } = await supabase
        .from('couples')
        .insert({
            user_a_id: user.id
        })
        .select()
        .single()

    if (insertError) {
        console.error("Error creating couple:", insertError)
        return { error: 'Error al generar código de pareja.' }
    }
    
    return { 
        success: true, 
        id: newCouple.id,
        code: newCouple.couple_code,
        status: newCouple.status
    }
}

export async function joinCouple(formData: FormData) {
    const code = formData.get('code') as string
    
    if (!code || code.length < 5) {
        return { error: 'Código inválido.' }
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    // 1. Find pending couple with specific code (case insensitive since DB uses lowercase md5)
    const normalizedCode = code.trim().toLowerCase()
    
    const { data: targetCouple, error: searchError } = await supabase
        .from('couples')
        .select('*')
        .eq('couple_code', normalizedCode)
        .eq('status', 'PENDING')
        .single()

    if (searchError || !targetCouple) {
        return { error: 'Código no encontrado o ya expiró.' }
    }

    // Ensure user is not trying to join themselves
    if (targetCouple.user_a_id === user.id) {
        return { error: 'No puedes unirte a tu propio código.' }
    }

    // 2. Update couple record: add user B, set status to ACTIVE
    const { error: updateError } = await supabase
        .from('couples')
        .update({ 
            user_b_id: user.id,
            status: 'ACTIVE' 
        })
        .eq('id', targetCouple.id)

    if (updateError) {
        console.error("Error joining couple:", updateError)
        return { error: 'Error al intentar vincular.' }
    }

    revalidatePath('/')
    revalidatePath('/connect')

    return { success: true, message: '¡Vinculación Exitosa!' }
}

export async function unpairCouple() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado' }
    }

    // 1. Encontrar todas las parejas del usuario
    const { data: couplesToDelete } = await supabase
        .from('couples')
        .select('id')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

    if (couplesToDelete && couplesToDelete.length > 0) {
        const coupleIds = couplesToDelete.map(c => c.id)

        // 2. Borrar explícitamente las sesiones de juego de esas parejas para evitar FK constraints
        await supabase
            .from('game_sessions')
            .delete()
            .in('couple_id', coupleIds)

        // 3. Borrar ahora sí las parejas (esto a su vez es seguro)
        const { error: deleteError } = await supabase
            .from('couples')
            .delete()
            .in('id', coupleIds)

        if (deleteError) {
            console.error("Error unpairing:", deleteError)
            return { error: 'Error al desconectar la pareja.' }
        }
    }

    revalidatePath('/')
    revalidatePath('/connect')

    return { success: true }
}
