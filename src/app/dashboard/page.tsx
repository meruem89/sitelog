import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
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
  
  const totalSpend = approvedLogs.reduce((sum, log) => sum + (log.cost || 0), 0)
  const totalLogs = approvedLogs.length

  const siteSpend = sites.map((site) => {
    const logsForSite = approvedLogs.filter((log) => log.site_id === site.id)
    const baseline = budgetBaselines.find((b) => b.site_id === site.id)
    
    const totals = logsForSite.reduce(
      (acc, log) => {
        acc.all += log.cost || 0
        acc[log.type] = (acc[log.type] || 0) + (log.cost || 0)
        return acc
      },
      { all: 0, Material: 0, Labour: 0, Service: 0 } as {
        all: number
        Material: number
        Labour: number
        Service: number
      }
    )

    // Calculate total budget from baseline (or use default if no baseline)
    const totalBudget = baseline
      ? baseline.material_budget + baseline.labour_budget + baseline.service_budget
      : 500000 // Fallback to default if no baseline exists

    const progress = Math.min((totals.all / totalBudget) * 100, 100)
    const isHigh = progress >= 80

    return {
      site,
      totals,
      progress,
      isHigh,
      totalBudget,
      baseline,
    }
  })

  return (
    <div className="p-8 space-y-8">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Variance Engine & Central Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Track approved spend across sites and keep an eye on budget burn.
          </p>
        </div>
        <div className="flex gap-2">
          {['Today', 'This Week', 'This Month'].map((label) => (
            <button
              key={label}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-400 hover:text-indigo-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Total Spend (All Sites)</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Pending Approvals Count</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{pendingApprovalsCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Total Logs</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalLogs}</p>
        </div>
      </div>

      {/* Site cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {siteSpend.map(({ site, totals, progress, isHigh, totalBudget, baseline }) => (
          <div key={site.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                {site.location && <p className="text-sm text-gray-500">{site.location}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase text-gray-500 font-medium">Actual Spend</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.all)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {(['Material', 'Labour', 'Service'] as const).map((type) => {
                const budgetKey = `${type.toLowerCase()}_budget` as 'material_budget' | 'labour_budget' | 'service_budget'
                const typeBudget = baseline?.[budgetKey] || 0
                const typeSpend = totals[type]
                const typeProgress = typeBudget > 0 ? Math.min((typeSpend / typeBudget) * 100, 100) : 0

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{type}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(typeSpend)}</span>
                    </div>
                    {baseline && typeBudget > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              typeProgress >= 80
                                ? 'bg-red-500'
                                : typeProgress >= 60
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${typeProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{Math.round(typeProgress)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">
                  {baseline ? 'Total Budget' : 'Budget (Default)'}: {formatCurrency(totalBudget)}
                </span>
                <span className={`font-semibold ${isHigh ? 'text-red-600' : 'text-indigo-700'}`}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isHigh ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {siteSpend.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
            No sites found. Add a site to start tracking spend.
          </div>
        )}
      </div>
    </div>
  )
}
