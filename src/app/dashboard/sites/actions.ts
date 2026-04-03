'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSite(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to create a site' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tenant_id) {
    return { error: 'User not associated with a tenant' }
  }

  if (profile.role === 'Viewer') {
    return { error: 'You do not have permission to create sites' }
  }

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const description = formData.get('description') as string

  if (!name || name.trim().length === 0) {
    return { error: 'Site name is required' }
  }

  const { error: insertError } = await supabase.from('sites').insert({
    name: name.trim(),
    location: location?.trim() || null,
    description: description?.trim() || null,
    tenant_id: profile.tenant_id,
    user_id: user.id,
  })

  if (insertError) {
    console.error('Failed to create site:', insertError)
    return { error: 'Failed to create site: ' + insertError.message }
  }

  revalidatePath('/dashboard/sites')
  return { success: true }
}

export async function updateSite(siteId: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to update a site' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tenant_id) {
    return { error: 'User not associated with a tenant' }
  }

  if (profile.role === 'Viewer') {
    return { error: 'You do not have permission to update sites' }
  }

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const description = formData.get('description') as string

  if (!name || name.trim().length === 0) {
    return { error: 'Site name is required' }
  }

  const { error: updateError } = await supabase
    .from('sites')
    .update({
      name: name.trim(),
      location: location?.trim() || null,
      description: description?.trim() || null,
    })
    .eq('id', siteId)
    .eq('tenant_id', profile.tenant_id)

  if (updateError) {
    console.error('Failed to update site:', updateError)
    return { error: 'Failed to update site: ' + updateError.message }
  }

  revalidatePath('/dashboard/sites')
  return { success: true }
}

export async function deleteSite(siteId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to delete a site' }
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
    return { error: 'Only Master users can delete sites' }
  }

  const { error: deleteError } = await supabase
    .from('sites')
    .delete()
    .eq('id', siteId)
    .eq('tenant_id', profile.tenant_id)

  if (deleteError) {
    console.error('Failed to delete site:', deleteError)
    return { error: 'Failed to delete site: ' + deleteError.message }
  }

  revalidatePath('/dashboard/sites')
  return { success: true }
}
