'use client'

import { useState } from 'react'
import { updateLogStatus } from '@/app/dashboard/approvals/actions'
import { ExternalLink, Check, X, Loader2 } from 'lucide-react'

interface Log {
  id: string
  type: string
  description: string
  cost: number
  bill_image_url: string | null
  created_at: string
  approval_status: string
  user_id: string
  site_id: string | null
  sites?: {
    id: string
    name: string
  } | null
  profiles?: {
    email: string
    full_name: string | null
  } | null
}

interface ApprovalsTableProps {
  logs: Log[]
}

export default function ApprovalsTable({ logs }: ApprovalsTableProps) {
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: 'approving' | 'rejecting' | null
  }>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAction = async (
    logId: string,
    status: 'Approved' | 'Rejected'
  ) => {
    setLoadingStates((prev) => ({
      ...prev,
      [logId]: status === 'Approved' ? 'approving' : 'rejecting',
    }))
    setError(null)
    setSuccess(null)

    const result = await updateLogStatus(logId, status)

    if (result.error) {
      setError(result.error)
      setLoadingStates((prev) => ({ ...prev, [logId]: null }))
    } else {
      setSuccess(result.message || `Log ${status.toLowerCase()} successfully`)
      setLoadingStates((prev) => ({ ...prev, [logId]: null }))
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Site
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bill
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const isLoading = loadingStates[log.id]
              
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.type === 'Material'
                          ? 'bg-blue-100 text-blue-800'
                          : log.type === 'Labour'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.sites?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(log.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.bill_image_url ? (
                      <a
                        href={log.bill_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400">No bill</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(log.id, 'Approved')}
                        disabled={!!isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading === 'approving' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(log.id, 'Rejected')}
                        disabled={!!isLoading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading === 'rejecting' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Stats Footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{logs.length}</span>{' '}
          {logs.length === 1 ? 'log' : 'logs'} pending approval
        </p>
      </div>
    </div>
  )
}
