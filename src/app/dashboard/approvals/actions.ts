'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLogStatus(
  logId: string,
  status: 'Approved' | 'Rejected'
) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: 'You must be logged in to perform this action' }
    }

    // Check if user is a Master
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'Unable to verify user permissions' }
    }

    if (profile.role !== 'Master') {
      return { error: 'Only Masters can approve or reject logs' }
    }

    // Update log status
    const { error: updateError } = await supabase
      .from('logs')
      .update({ 
        approval_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)

    if (updateError) {
      return { error: `Failed to update log status: ${updateError.message}` }
    }

    // Revalidate the approvals page
    revalidatePath('/dashboard/approvals')

    return { 
      success: true, 
      message: `Log ${status.toLowerCase()} successfully` 
    }
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}
