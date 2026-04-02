'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: {
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export default function SubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSubscribe = async () => {
    if (!scriptLoaded) {
      alert('Payment system is loading. Please try again in a moment.')
      return
    }

    setIsLoading(true)

    try {
      // Call API route to create Razorpay order
      const response = await fetch('/api/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com', // You can get this from auth context
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      // Configure Razorpay options
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: data.amount, // Amount in paise
        currency: data.currency,
        name: 'SiteLog Pro',
        description: 'Monthly Base Subscription',
        order_id: data.orderId,
        handler: function (response: RazorpayResponse) {
          // Payment successful
          console.log('Payment successful:', response)
          
          // You can verify payment on backend and update subscription status
          handlePaymentSuccess(response)
        },
        prefill: {
          email: 'user@example.com', // Get from auth context
        },
        theme: {
          color: '#4F46E5', // Indigo color matching your app theme
        },
      }

      // Open Razorpay payment modal
      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()

      // Handle modal close
      razorpayInstance.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error)
        alert(`Payment failed: ${response.error.description}`)
      })
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (response: RazorpayResponse) => {
    // TODO: Send payment details to your backend for verification
    // You should verify the payment signature on the server
    console.log('Payment ID:', response.razorpay_payment_id)
    console.log('Order ID:', response.razorpay_order_id)
    console.log('Signature:', response.razorpay_signature)

    // Show success message
    alert('Payment successful! Your subscription is now active.')

    // Optionally redirect to dashboard
    // window.location.href = '/dashboard'
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading || !scriptLoaded}
      className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <div className="text-left">
            <div className="text-lg">Subscribe to SiteLog Pro</div>
            <div className="text-sm font-normal opacity-90">₹999/month</div>
          </div>
        </>
      )}
    </button>
  )
}
