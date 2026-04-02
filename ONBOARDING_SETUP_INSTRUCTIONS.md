# Onboarding Flow Setup Instructions

**PowerShell is not available in the current environment. Please manually create the following directory and files:**

## Step 1: Create Directory
Create the directory: `src\app\onboarding\`

## Step 2: Create actions.ts

File: `src\app\onboarding\actions.ts`

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createTenant(companyName: string, referralCode?: string) {
  if (!companyName || companyName.trim().length === 0) {
    return { error: 'Company name is required' }
  }

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to create a tenant' }
  }

  // Check if user already has a tenant
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (existingProfile?.tenant_id) {
    return { error: 'You are already associated with a tenant' }
  }

  // Validate referral code if provided
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
    // If invalid code, we ignore it (could also return error if you want strict validation)
  }

  // Insert new tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: companyName.trim(),
      referred_by_code: validatedReferralCode,
      subscription_status: 'trial', // Default to trial
    })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    console.error('Failed to create tenant:', tenantError)
    return { error: 'Failed to create tenant: ' + (tenantError?.message || 'Unknown error') }
  }

  const tenantId = tenant.id

  // Update user's profile to link tenant and set role to Master
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      tenant_id: tenantId,
      role: 'Master',
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('Failed to update profile:', updateError)
    // Attempt to rollback by deleting the tenant
    await supabase.from('tenants').delete().eq('id', tenantId)
    return { error: 'Failed to link tenant to your account: ' + updateError.message }
  }

  return { success: true, tenantId }
}
```

## Step 3: Create page.tsx

File: `src\app\onboarding\page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createTenant } from './actions'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, Gift } from 'lucide-react'

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const companyName = formData.get('company_name') as string
    const referralCode = formData.get('referral_code') as string

    const result = await createTenant(companyName, referralCode || undefined)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      // Success - redirect to dashboard
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SiteLog</h1>
          <p className="text-gray-600">Set up your company account to get started</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form action={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label
                htmlFor="company_name"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Company / Builder Name <span className="text-red-500">*</span>
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none text-gray-900 placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="e.g., Blocks & Loops Construction"
              />
            </div>

            {/* Referral Code */}
            <div>
              <label
                htmlFor="referral_code"
                className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2"
              >
                <Gift className="w-4 h-4 text-indigo-600" />
                Partner Referral Code
                <span className="text-xs text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                id="referral_code"
                name="referral_code"
                type="text"
                disabled={isLoading}
                className="w-full px-4 py-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none text-gray-900 placeholder:text-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter referral code for 5% discount"
              />
              <p className="mt-2 text-xs text-gray-500">
                Have a referral code from one of our material partners? Enter it to get 5% off your subscription.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Your Account...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  <span>Create Company Account</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you'll be set up as the Master user with full access to approvals, team management, and all features.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/50 backdrop-blur rounded-lg p-3 border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">14</div>
            <div className="text-xs text-gray-600">Day Free Trial</div>
          </div>
          <div className="bg-white/50 backdrop-blur rounded-lg p-3 border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">∞</div>
            <div className="text-xs text-gray-600">Unlimited Logs</div>
          </div>
          <div className="bg-white/50 backdrop-blur rounded-lg p-3 border border-gray-100">
            <div className="text-2xl font-bold text-indigo-600">24/7</div>
            <div className="text-xs text-gray-600">Support</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Step 4: Update dashboard/layout.tsx

Replace the current layout with this server-side version. The file needs to be converted from 'use client' to a server component:

```typescript
import { LayoutDashboard, Building2, FileText, Users, CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClientLayout from './client-layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch user's profile to check tenant_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('tenant_id, role, email, full_name')
    .eq('id', user.id)
    .single()

  // If no tenant_id, redirect to onboarding
  if (!profile || !profile.tenant_id) {
    redirect('/onboarding')
  }

  // Pass data to client component
  return <DashboardClientLayout profile={profile}>{children}</DashboardClientLayout>
}
```

## Step 5: Create dashboard/client-layout.tsx

File: `src\app\dashboard\client-layout.tsx`

```typescript
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
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-indigo-600">SiteLog</h1>
          </div>

          {/* Navigation */}
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
                      ? 'bg-gradient-to-r from-indigo-50 to-white text-indigo-700 border-r-4 border-indigo-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{profile.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full">{children}</div>
      </main>
    </div>
  )
}
```

---

**After creating these files, the onboarding flow will be complete!**
