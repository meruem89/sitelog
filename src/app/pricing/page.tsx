import SubscriptionButton from '@/components/SubscriptionButton'
import { Check } from 'lucide-react'
import Link from 'next/link'

export default function PricingPage() {
  const features = [
    'Unlimited site logs',
    'OCR bill scanning',
    'Cloud storage for bills',
    'Advanced analytics',
    'Priority support',
    'Export reports (PDF/Excel)',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back to Dashboard Link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-8"
        >
          ← Back to Dashboard
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Upgrade to SiteLog Pro
          </h1>
          <p className="text-xl text-gray-600">
            Unlock powerful features for your construction business
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-10 border-2 border-indigo-100">
          <div className="text-center mb-8">
            <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🔥 MOST POPULAR
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              SiteLog Pro
            </h2>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-6xl font-bold text-gray-900">₹999</span>
              <span className="text-xl text-gray-500">/month</span>
            </div>
            <p className="text-gray-500">Billed monthly • Cancel anytime</p>
          </div>

          <ul className="space-y-4 mb-10">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-gray-700 text-lg">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-center">
            <SubscriptionButton />
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure Payment
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel Anytime
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Instant Access
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Secure payment powered by{' '}
            <span className="font-semibold text-gray-700">Razorpay</span>
          </p>
          <p className="mt-2">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
