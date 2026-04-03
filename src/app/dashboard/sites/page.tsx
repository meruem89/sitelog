import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SitesClient from './SitesClient'

export default async function SitesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.tenant_id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Account Setup Required
          </h1>
          <p className="text-gray-600 mb-4">
            Your account is not associated with a tenant. Please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, name, location, description, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })

  if (sitesError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading sites: {sitesError.message}
        </div>
      </div>
    )
  }

  return <SitesClient sites={sites || []} userRole={profile.role} />
}