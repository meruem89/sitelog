import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role environment variables are missing')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const receivedBuffer = Buffer.from(signature, 'utf8')

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured')
    }

    const rawBody = await request.text()
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: 'Empty webhook payload' },
        { status: 400 }
      )
    }

    const isSignatureValid = verifyWebhookSignature(rawBody, signature, webhookSecret)
    if (!isSignatureValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 400 }
      )
    }

    let eventBody: any
    try {
      eventBody = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const event = eventBody?.event
    if (event !== 'order.paid' && event !== 'payment.captured') {
      return NextResponse.json({ success: true, received: true, ignored: true }, { status: 200 })
    }

    const paymentEntity = eventBody?.payload?.payment?.entity
    const orderEntity = eventBody?.payload?.order?.entity

    const razorpayOrderId: string | null = paymentEntity?.order_id || orderEntity?.id || null
    const razorpayCustomerId: string | null =
      paymentEntity?.customer_id || orderEntity?.customer_id || null

    if (!razorpayOrderId && !razorpayCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Missing order/customer identifier in webhook payload' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    let updatedRows = 0

    if (razorpayOrderId) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('razorpay_order_id', razorpayOrderId)
        .select('id')

      if (error) {
        throw new Error(`Failed updating by razorpay_order_id: ${error.message}`)
      }

      updatedRows += data?.length || 0
    }

    if (updatedRows === 0 && razorpayCustomerId) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('razorpay_customer_id', razorpayCustomerId)
        .select('id')

      if (error) {
        throw new Error(`Failed updating by razorpay_customer_id: ${error.message}`)
      }

      updatedRows += data?.length || 0
    }

    return NextResponse.json(
      {
        success: true,
        received: true,
        event,
        updatedRows,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Razorpay webhook processing failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    )
  }
}
