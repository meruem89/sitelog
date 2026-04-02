import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ApprovalsTable from '@/components/ApprovalsTable'

export default async function ApprovalsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch user's profile to check role and tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, full_name, tenant_id')
    .eq('id', user.id)
    .single()

  // If profile doesn't exist, show message to contact admin
  if (profileError || !profile || !profile.tenant_id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            Your user profile needs to be set up or your account is not associated with a tenant. 
            Please contact your administrator.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Check if user is Master
  if (profile.role !== 'Master') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-1">Master Role Required</p>
          <p className="text-sm text-gray-500 mb-6">
            Only users with the Master role can access the Approvals module. 
            Viewers and Operators do not have approval permissions.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Current Role:</span>{' '}
              <span className="text-indigo-600">{profile.role}</span>
            </p>
          </div>
          <a
            href="/dashboard"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // User is Master - fetch pending logs for their tenant only
  const tenantId = profile.tenant_id
  
  const { data: pendingLogs, error: logsError } = await supabase
    .from('logs')
    .select(
      `
      id,
      type,
      description,
      cost,
      bill_image_url,
      created_at,
      approval_status,
      user_id,
      site_id,
      tenant_id
    `
    )
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'Pending')
    .order('created_at', { ascending: false })
  
  // Manually fetch user profiles for each log
  if (pendingLogs && pendingLogs.length > 0) {
    const userIds = [...new Set(pendingLogs.map(log => log.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
    
    // Attach profile data to each log
    if (profiles) {
      pendingLogs.forEach(log => {
        const profile = profiles.find(p => p.id === log.user_id)
        if (profile) {
          log.profiles = profile
        }
      })
    }
  }

  if (logsError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error loading pending logs: {logsError.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Approvals Dashboard
        </h1>
        <p className="text-gray-600">
          Review and approve pending log entries from operators
        </p>
      </div>

      {pendingLogs && pendingLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            There are no pending logs waiting for approval.
          </p>
        </div>
      ) : (
        <ApprovalsTable logs={pendingLogs || []} />
      )}
    </div>
  )
}
