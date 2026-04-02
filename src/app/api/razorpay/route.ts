import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(request: NextRequest) {
  try {
    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    // Get request body (optional: customer details)
    const body = await request.json().catch(() => ({}))

    // Create Razorpay Order
    // Amount is ₹999, converted to paise (multiply by 100)
    const order = await razorpay.orders.create({
      amount: 99900, // ₹999 in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        product: 'SiteLog Pro',
        plan: 'Monthly Base Subscription',
        user_email: body.email || '',
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error) {
    console.error('Razorpay order creation failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    )
  }
}
