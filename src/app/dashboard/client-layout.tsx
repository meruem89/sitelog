'use client'

import { LayoutDashboard, Building2, FileText, Users, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Building2 },
  { name: 'Logs', href: '/dashboard/logs', icon: FileText },
  { name: 'Approvals', href: '/dashboard/approvals', icon: CheckSquare },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

type Profile = {
  tenant_id: string
  role: string
  email: string | null
  full_name: string | null
}

export default function DashboardClientLayout({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: Profile
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-indigo-600">SiteLog</h1>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-l-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                {profile.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{profile.full_name || 'User'}</p>
                <p className="text-xs text-gray-500">{profile.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}