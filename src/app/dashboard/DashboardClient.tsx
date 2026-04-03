'use client'

import { useState } from 'react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

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

type TimeRange = 'Today' | 'This Week' | 'This Month' | 'All'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardClient({
  sites,
  allApprovedLogs,
  pendingApprovalsCount,
  budgetBaselines,
}: {
  sites: Site[]
  allApprovedLogs: Log[]
  pendingApprovalsCount: number
  budgetBaselines: BudgetBaseline[]
}) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All')

  // Filter logs based on selected time range
  const getFilteredLogs = () => {
    const now = new Date()
    
    switch (timeRange) {
      case 'Today':
        const todayStart = startOfDay(now).toISOString()
        const todayEnd = endOfDay(now).toISOString()
        return allApprovedLogs.filter(
          log => log.created_at >= todayStart && log.created_at <= todayEnd
        )
      
      case 'This Week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
        return allApprovedLogs.filter(
          log => log.created_at >= weekStart && log.created_at <= weekEnd
        )
      
      case 'This Month':
        const monthStart = startOfMonth(now).toISOString()
        const monthEnd = endOfMonth(now).toISOString()
        return allApprovedLogs.filter(
          log => log.created_at >= monthStart && log.created_at <= monthEnd
        )
      
      case 'All':
      default:
        return allApprovedLogs
    }
  }

  const approvedLogs = getFilteredLogs()
  
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
      : 500000

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
          {(['Today', 'This Week', 'This Month', 'All'] as TimeRange[]).map((label) => (
            <button
              key={label}
              onClick={() => setTimeRange(label)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                timeRange === label
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:text-indigo-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Total Spend ({timeRange})</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Pending Approvals Count</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{pendingApprovalsCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 font-medium">Total Logs ({timeRange})</p>
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
