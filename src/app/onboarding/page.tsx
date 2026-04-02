'use client'

import { useState } from 'react'
import { createTenant } from '@/app/onboarding/actions'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const companyName = formData.get('company_name') as string
    const referralCode = formData.get('referral_code') as string

    const result = await createTenant(companyName, referralCode)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form action={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-xl font-bold mb-6">Create Company</h1>

        <input
          name="company_name"
          placeholder="Company Name"
          className="w-full border p-2 mb-4"
          required
        />

        <input
          name="referral_code"
          placeholder="Referral Code (optional)"
          className="w-full border p-2 mb-4"
        />

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-2 rounded"
        >
          {loading ? 'Creating...' : 'Create Company'}
        </button>
      </form>
    </div>
  )
}