'use client'

import { useState } from 'react'
import { updateUserRole, removeTeamMember } from './actions'
import { Users, Shield, Wrench, Eye, MoreVertical, Trash2 } from 'lucide-react'

type TeamMember = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
}

type Props = {
  teamMembers: TeamMember[]
  userRole: string
  currentUserId: string
}

const roleIcons = {
  Master: Shield,
  Operator: Wrench,
  Viewer: Eye,
}

const roleColors = {
  Master: 'bg-purple-100 text-purple-700 border-purple-200',
  Operator: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Viewer: 'bg-gray-100 text-gray-700 border-gray-200',
}

const roleDescriptions = {
  Master: 'Full access to all features and team management',
  Operator: 'Can create and edit sites, logs, and approvals',
  Viewer: 'Read-only access to view data',
}

export default function TeamClient({ teamMembers, userRole, currentUserId }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const canManage = userRole === 'Master'

  async function handleRoleChange(userId: string, newRole: string) {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const result = await updateUserRole(userId, newRole)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  async function handleRemoveMember(userId: string, memberName: string) {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName || 'this member'} from the team? They will lose access to all data.`
      )
    ) {
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const result = await removeTeamMember(userId)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
            <p className="text-gray-600">
              Manage team members and their roles for your organization
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Operation completed successfully!
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(roleDescriptions).map(([role, description]) => {
              const Icon = roleIcons[role as keyof typeof roleIcons]
              const colorClass = roleColors[role as keyof typeof roleColors]
              return (
                <div
                  key={role}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${colorClass}`}
                >
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">{role}</div>
                    <div className="text-sm opacity-90">{description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="max-w-7xl mx-auto">
        {teamMembers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members</h3>
            <p className="text-gray-600">
              Team members will appear here once they join your organization
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Joined
                    </th>
                    {canManage && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map((member) => {
                    const Icon = roleIcons[member.role as keyof typeof roleIcons] || Eye
                    const isCurrentUser = member.id === currentUserId

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(member.full_name || member.email || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {member.full_name || 'No name'}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-indigo-600 font-semibold">
                                    (You)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{member.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4">
                          {canManage && !isCurrentUser ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              disabled={isLoading}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="Master">Master</option>
                              <option value="Operator">Operator</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                roleColors[member.role as keyof typeof roleColors]
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{member.role}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {formatDate(member.created_at)}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 text-right">
                            {!isCurrentUser ? (
                              <div className="relative inline-block">
                                <button
                                  onClick={() =>
                                    setOpenMenuId(openMenuId === member.id ? null : member.id)
                                  }
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                                {openMenuId === member.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={() => setOpenMenuId(null)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                      <button
                                        onClick={() => {
                                          handleRemoveMember(
                                            member.id,
                                            member.full_name || member.email || 'this member'
                                          )
                                          setOpenMenuId(null)
                                        }}
                                        disabled={isLoading}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Remove from team
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
