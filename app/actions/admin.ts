'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// If not provided in .env yet, use a placeholder to avoid breaking the build immediately
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type AdminUser = {
  id: string
  email: string
  full_name: string
  has_paid: boolean
  created_at: string
}

export async function getAllUsers(): Promise<{ users: AdminUser[], error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { users: [], error: 'Unauthorized' }
    }
    
    // Si la llave maestra no está conectada, avisamos.
    if (supabaseServiceKey === 'MISSING_KEY') {
       return { users: [], error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching users:', error)
      return { users: [], error: error.message }
    }

    const formattedUsers: AdminUser[] = data.users.map((u) => ({
      id: u.id,
      email: u.email || '',
      full_name: u.user_metadata?.full_name || 'Desconocido',
      has_paid: u.user_metadata?.has_paid || false,
      created_at: u.created_at,
    }))
    
    // Sort logically (newest first)
    formattedUsers.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { users: formattedUsers }
  } catch (e: any) {
    return { users: [], error: e.message }
  }
}

export async function toggleUserVIP(userId: string, currentStatus: boolean) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    if (supabaseServiceKey === 'MISSING_KEY') {
        return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.'}
    }

    const { data: targetUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (fetchError || !targetUser.user) {
      return { success: false, error: 'User not found' }
    }

    const newMetadata = {
      ...targetUser.user.user_metadata,
      has_paid: !currentStatus
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: newMetadata
    })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (e: any) {
      return { success: false, error: e.message }
  }
}
