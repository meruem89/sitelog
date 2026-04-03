'use client'

import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2,
  Calendar,
  TrendingUp,
  Gift,
  AlertCircle,
  Crown,
  Sparkles
} from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

type User = {
  id: string
  email: string
  fullName: string
}

type Subscription = {
  status: 'trial' | 'active' | 'cancelled'
  planName: string
  currentBillingAmount: number
  renewalDate: string
  startedAt: string
  referralDiscount: number
  trialDaysRemaining: number | null
}

type Site = {
  id: string
  name: string
  created_at: string
}

type PaymentHistoryItem = {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
  razorpayPaymentId: string
}

type Props = {
  user: User
  subscription: Subscription
  activeSitesCount: number
  basePrice: number
  pricePerSite: number
  totalMonthlyCost: number
  paymentHistory: PaymentHistoryItem[]
  sites: Site[]
}

export default function SubscriptionClient({
  user,
  subscription,
  activeSitesCount,
  basePrice,
  pricePerSite,
  totalMonthlyCost,
  paymentHistory,
  sites,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setError('Failed to load payment gateway')
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleUpgrade = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create Razorpay order
      const response = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: totalMonthlyCost * 100, // Convert to paise
          notes: {
            userId: user.id,
            plan: subscription.planName,
            sites: activeSitesCount,
          },
        }),
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: data.amount,
        currency: data.currency,
        name: 'SiteLog Pro',
        description: `${subscription.planName} - ${activeSitesCount} Sites`,
        order_id: data.orderId,
        handler: async function (response: any) {
          await handlePaymentSuccess(response)
        },
        prefill: {
          email: user.email,
          name: user.fullName,
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false)
          },
        },
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()

      razorpayInstance.on('payment.failed', function (response: any) {
        setError(`Payment failed: ${response.error.description}`)
        setIsLoading(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Here you would verify the payment signature on your backend
      // and update the subscription status in the database
      
      console.log('Payment successful:', {
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      })

      setSuccess('Payment successful! Your subscription is now active.')
      setIsLoading(false)
      
      // Reload the page to show updated subscription status
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError('Payment verification failed. Please contact support.')
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Here you would call your API to cancel the subscription
      // For now, this is a placeholder
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess('Subscription cancelled. You can continue using the service until the end of your billing period.')
      setShowCancelModal(false)
    } catch (err) {
      setError('Failed to cancel subscription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const discountedAmount = subscription.referralDiscount > 0
    ? totalMonthlyCost * (1 - subscription.referralDiscount / 100)
    : totalMonthlyCost

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Subscription Management
            </h1>
          </div>
          <p className="text-gray-600 ml-14">Manage your SiteLog Pro subscription and billing</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 mb-1">Success</h3>
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Trial Banner */}
        {subscription.status === 'trial' && subscription.trialDaysRemaining !== null && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">Free Trial Active</h3>
                <p className="text-white/90 text-sm mb-3">
                  You have <span className="font-bold text-xl">{subscription.trialDaysRemaining}</span> days remaining in your free trial
                </p>
                <p className="text-white/80 text-sm">
                  Upgrade now to continue enjoying unlimited access to all features!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Current Plan Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium mb-1">Current Plan</p>
                  <h2 className="text-3xl font-bold mb-2">{subscription.planName}</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      subscription.status === 'trial' ? 'bg-amber-500' :
                      subscription.status === 'active' ? 'bg-green-500' :
                      'bg-red-500'
                    }`}>
                      {subscription.status.toUpperCase()}
                    </span>
                    {subscription.status === 'active' && (
                      <span className="flex items-center gap-1 text-indigo-100 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Crown className="w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Pricing Breakdown */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Base Subscription</p>
                      <p className="text-sm text-gray-500">Monthly platform fee</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">₹{basePrice}</p>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Active Sites</p>
                      <p className="text-sm text-gray-500">{activeSitesCount} × ₹{pricePerSite}/site</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">₹{activeSitesCount * pricePerSite}</p>
                </div>

                {subscription.referralDiscount > 0 && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Referral Discount</p>
                        <p className="text-sm text-gray-500">{subscription.referralDiscount}% off</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      -₹{(totalMonthlyCost * subscription.referralDiscount / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between py-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl px-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">Total Monthly Cost</p>
                      <p className="text-sm text-gray-600">Billed monthly</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {subscription.referralDiscount > 0 && (
                      <p className="text-sm text-gray-400 line-through">₹{totalMonthlyCost}</p>
                    )}
                    <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      ₹{discountedAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Renewal Info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Next Renewal Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading || !scriptLoaded}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {subscription.status === 'trial' ? 'Upgrade Plan' : 'Pay Now'}
                    </>
                  )}
                </button>

                {subscription.status === 'active' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-6 py-3 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Sites Summary */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900">Active Sites</h3>
              </div>
              <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {activeSitesCount}
              </p>
              <p className="text-sm text-gray-600 mb-4">Sites actively tracked</p>
              
              {sites.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-gray-700 truncate flex-1">{site.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Pricing Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>₹999/month base subscription</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>₹499 per additional site</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Unlimited logs per site</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>OCR bill scanning included</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Cloud storage & backups</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Multi-user collaboration</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Payment History
            </h2>
          </div>
          
          <div className="p-6">
            {paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment History</h3>
                <p className="text-gray-600 mb-6">
                  {subscription.status === 'trial' 
                    ? 'You are currently on a free trial. Upgrade to start your billing history.'
                    : 'Your payment history will appear here once you make your first payment.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4 font-semibold">
                          ₹{payment.amount}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'success' ? 'bg-green-100 text-green-700' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                          {payment.razorpayPaymentId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cancel Subscription?</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll lose access to all premium features
              at the end of your current billing period.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> You can continue using the service until{' '}
                {new Date(subscription.renewalDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
