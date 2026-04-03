import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(request: NextRequest) {
  try {
    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    // Get request body (amount, customer details, notes)
    const body = await request.json().catch(() => ({}))

    // Amount should be provided in paise (already converted from rupees)
    const amount = body.amount || 99900 // Default to ₹999 if not provided

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        product: 'SiteLog Pro',
        plan: body.notes?.plan || 'Monthly Subscription',
        user_email: body.email || '',
        user_id: body.notes?.userId || '',
        sites: body.notes?.sites || '0',
        ...body.notes,
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
