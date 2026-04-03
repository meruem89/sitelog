'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to update roles' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tenant_id) {
    return { error: 'User not associated with a tenant' }
  }

  if (profile.role !== 'Master') {
    return { error: 'Only Master users can change roles' }
  }

  if (!['Master', 'Operator', 'Viewer'].includes(newRole)) {
    return { error: 'Invalid role specified' }
  }

  if (userId === user.id) {
    return { error: 'You cannot change your own role' }
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.tenant_id !== profile.tenant_id) {
    return { error: 'User not found in your tenant' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .eq('tenant_id', profile.tenant_id)

  if (updateError) {
    console.error('Failed to update role:', updateError)
    return { error: 'Failed to update role: ' + updateError.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeTeamMember(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to remove team members' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tenant_id) {
    return { error: 'User not associated with a tenant' }
  }

  if (profile.role !== 'Master') {
    return { error: 'Only Master users can remove team members' }
  }

  if (userId === user.id) {
    return { error: 'You cannot remove yourself from the team' }
  }

  const { data: targetUser } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (!targetUser || targetUser.tenant_id !== profile.tenant_id) {
    return { error: 'User not found in your tenant' }
  }

  const { error: deleteError } = await supabase
    .from('profiles')
    .update({ tenant_id: null })
    .eq('id', userId)
    .eq('tenant_id', profile.tenant_id)

  if (deleteError) {
    console.error('Failed to remove team member:', deleteError)
    return { error: 'Failed to remove team member: ' + deleteError.message }
  }

  revalidatePath('/dashboard/team')
  return { success: true }
}
