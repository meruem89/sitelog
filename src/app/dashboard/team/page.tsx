import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'

export default async function TeamPage() {
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

  const { data: teamMembers, error: teamError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true })

  if (teamError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading team members: {teamError.message}
        </div>
      </div>
    )
  }

  return (
    <TeamClient
      teamMembers={teamMembers || []}
      userRole={profile.role}
      currentUserId={user.id}
    />
  )
}
