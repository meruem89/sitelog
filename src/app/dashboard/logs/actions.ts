'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLogEntry(formData: FormData) {
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const cost = parseFloat(formData.get('cost') as string)
  const billImage = formData.get('bill_image') as File
  const siteId = formData.get('site_id') as string

  if (!type || !description || isNaN(cost) || !siteId) {
    return { error: 'Please fill in all required fields' }
  }

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to create a log entry' }
  }

  // Fetch user's profile to get tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.tenant_id) {
    return { error: 'Your account is not associated with a tenant. Please contact support.' }
  }

  // Check if user is a Viewer (Viewers cannot create logs)
  if (profile.role === 'Viewer') {
    return { error: 'Viewers do not have permission to create log entries' }
  }

  const tenantId = profile.tenant_id

  let billImageUrl = null

  // Upload bill image if provided
  if (billImage && billImage.size > 0) {
    const fileExt = billImage.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('bills')
      .upload(fileName, billImage)

    if (uploadError) {
      return { error: 'Failed to upload bill image: ' + uploadError.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('bills').getPublicUrl(fileName)

    billImageUrl = publicUrl
  }

  // Insert log entry with tenant_id
  const { error: insertError } = await supabase.from('logs').insert({
    type,
    description,
    cost,
    bill_image_url: billImageUrl,
    user_id: user.id,
    site_id: siteId,
    tenant_id: tenantId,
  })

  if (insertError) {
    return { error: 'Failed to create log entry: ' + insertError.message }
  }

  revalidatePath('/dashboard/logs')

  return { success: true }
}
