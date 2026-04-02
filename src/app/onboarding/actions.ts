'use server'

import { createClient } from '@/utils/supabase/server'

export async function createTenant(companyName: string, referralCode?: string) {
  if (!companyName || companyName.trim().length === 0) {
    return { error: 'Company name is required' }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to create a tenant' }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (existingProfile?.tenant_id) {
    return { error: 'You are already associated with a tenant' }
  }

  let validatedReferralCode = null
  if (referralCode && referralCode.trim().length > 0) {
    const { data: partner } = await supabase
      .from('partners')
      .select('id, referral_code')
      .eq('referral_code', referralCode.trim())
      .single()

    if (partner) {
      validatedReferralCode = referralCode.trim()
    }
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: companyName.trim(),
      referred_by_code: validatedReferralCode,
      subscription_status: 'trial',
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    return { error: 'Failed to create tenant' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      tenant_id: tenant.id,
      role: 'Master',
    })
    .eq('id', user.id)

  if (updateError) {
    await supabase.from('tenants').delete().eq('id', tenant.id)
    return { error: 'Failed to link tenant' }
  }

  return { success: true, tenantId: tenant.id }
}