import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

type Site = {
  id: string
  name: string
  location: string | null
  tenant_id: string
}

type Log = {
  id: string
  site_id: string | null
  type: 'Material' | 'Labour' | 'Service'
  cost: number
  approval_status: string
  created_at: string
  tenant_id: string
}

type BudgetBaseline = {
  id: string
  site_id: string
  material_budget: number
  labour_budget: number
  service_budget: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch user's profile to get tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.tenant_id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Not Found</h1>
          <p className="text-gray-600 mb-4">
            Your account is not associated with a tenant. Please contact support.
          </p>
        </div>
      </div>
    )
  }

  const tenantId = profile.tenant_id

  // Fetch data filtered by tenant_id
  const [sitesRes, approvedLogsRes, pendingCountRes, baselinesRes] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name, location, tenant_id')
      .eq('tenant_id', tenantId)
      .order('name'),
    supabase
      .from('logs')
      .select('id, site_id, type, cost, approval_status, created_at, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'Approved'),
    supabase
      .from('logs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'Pending'),
    supabase
      .from('budget_baselines')
      .select('id, site_id, material_budget, labour_budget, service_budget')
  ])

  if (sitesRes.error) {
    throw new Error(`Failed to load sites: ${sitesRes.error.message}`)
  }

  if (approvedLogsRes.error) {
    throw new Error(`Failed to load logs: ${approvedLogsRes.error.message}`)
  }

  const sites = (sitesRes.data || []) as Site[]
  const approvedLogs = (approvedLogsRes.data || []) as Log[]
  const pendingApprovalsCount = pendingCountRes.count || 0
  const budgetBaselines = (baselinesRes.data || []) as BudgetBaseline[]

  return (
    <DashboardClient
      sites={sites}
      allApprovedLogs={approvedLogs}
      pendingApprovalsCount={pendingApprovalsCount}
      budgetBaselines={budgetBaselines}
    />
  )
}
