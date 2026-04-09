import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SubscriptionClient from './SubscriptionClient'

type Subscription = {
  status: 'trial' | 'active' | 'cancelled'
  planName: string
  currentBillingAmount: number
  renewalDate: string
  startedAt: string
  referralDiscount: number
  trialDaysRemaining: number | null
}

type PaymentHistoryItem = {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  razorpayPaymentId: string
}

export default async function SubscriptionPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email, full_name, created_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Setup Required</h2>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
      </div>
    )
  }

  // Check if user is Master
  if (profile.role !== 'Master') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-8 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              Only Master users can access subscription management.
            </p>
            <div className="bg-indigo-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-indigo-700">
                <span className="font-semibold">Your Role:</span> {profile.role}
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Count active sites for the user
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, name, created_at')
    .eq('user_id', user.id)

  const activeSitesCount = sites?.length || 0

  // Calculate pricing
  const basePrice = 999 // ₹999/month base
  const pricePerSite = 499 // ₹499 per site
  const totalMonthlyCost = basePrice + (activeSitesCount * pricePerSite)

  // Calculate trial days remaining (14 days from account creation)
  const accountCreatedAt = new Date(profile.created_at)
  const now = new Date()
  const daysSinceCreation = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  const trialDaysRemaining = Math.max(0, 14 - daysSinceCreation)
  const isOnTrial = trialDaysRemaining > 0

  // Mock subscription data (in production, fetch from subscriptions table)
  const subscriptionData: Subscription = {
    status: isOnTrial ? 'trial' : 'active',
    planName: 'SiteLog Pro',
    currentBillingAmount: totalMonthlyCost,
    renewalDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: accountCreatedAt.toISOString(),
    referralDiscount: 0, // 5% if applicable
    trialDaysRemaining: isOnTrial ? trialDaysRemaining : null,
  }

  // Mock payment history (in production, fetch from payments table)
  const paymentHistory: PaymentHistoryItem[] = [
    // {
    //   id: '1',
    //   amount: totalMonthlyCost,
    //   currency: 'INR',
    //   status: 'success',
    //   createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    //   razorpayPaymentId: 'pay_xxxxxxxxxxxxx',
    // }
  ]

  return (
    <SubscriptionClient
      user={{
        id: user.id,
        email: user.email || profile.email || '',
        fullName: profile.full_name || '',
      }}
      subscription={subscriptionData}
      activeSitesCount={activeSitesCount}
      basePrice={basePrice}
      pricePerSite={pricePerSite}
      totalMonthlyCost={totalMonthlyCost}
      paymentHistory={paymentHistory}
      sites={sites || []}
    />
  )
}
