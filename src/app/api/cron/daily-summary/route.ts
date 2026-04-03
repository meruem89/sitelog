import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { startOfDay, endOfDay, format } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

type LogRecord = {
  id: string
  created_at: string
  type: string
  description: string
  cost: number
  site_id: string | null
  user_id: string | null
  approval_status: string | null
  tenant_id: string | null
  sites?: { 
    name: string | null
    tenant_id: string | null
  } | null
}

type MasterUser = {
  id: string
  email: string | null
  tenant_id: string | null
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin env vars are missing')
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      get() {
        return ''
      },
      set() {},
      remove() {},
    },
  })
}

export async function GET(request: Request) {
  try {
    // Auth check
    const header = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    if (!secret || header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdmin()

    // Date boundaries
    const start = startOfDay(new Date()).toISOString()
    const end = endOfDay(new Date()).toISOString()

    // Fetch approved logs for today with sites and tenant relationships
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('id, created_at, type, description, cost, site_id, user_id, approval_status, tenant_id, sites(name, tenant_id)')
      .eq('approval_status', 'Approved')
      .gte('created_at', start)
      .lte('created_at', end)

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`)
    }

    const safeLogs: LogRecord[] = logs || []

    // Fetch all master users
    const { data: masters, error: mastersError } = await supabase
      .from('profiles')
      .select('id, email, tenant_id')
      .eq('role', 'Master')

    if (mastersError) {
      throw new Error(`Failed to fetch masters: ${mastersError.message}`)
    }

    const masterUsers: MasterUser[] = (masters || []).filter(m => m.email && m.tenant_id)

    if (masterUsers.length === 0) {
      console.log('No Master users with email found')
      return NextResponse.json({ success: true, emailsSent: 0, message: 'No recipients' })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      throw new Error('Missing RESEND_API_KEY')
    }
    const resend = new Resend(resendKey)

    // Group logs by tenant_id
    const logsByTenant = safeLogs.reduce((acc, log) => {
      const tenantId = log.tenant_id || log.sites?.tenant_id
      if (tenantId) {
        if (!acc[tenantId]) {
          acc[tenantId] = []
        }
        acc[tenantId].push(log)
      }
      return acc
    }, {} as Record<string, LogRecord[]>)

    // Group masters by tenant_id
    const mastersByTenant = masterUsers.reduce((acc, master) => {
      if (master.tenant_id) {
        if (!acc[master.tenant_id]) {
          acc[master.tenant_id] = []
        }
        acc[master.tenant_id].push(master)
      }
      return acc
    }, {} as Record<string, MasterUser[]>)

    console.log('API Key Status:', process.env.RESEND_API_KEY ? 'Loaded' : 'Missing')

    let emailsSent = 0
    const emailResults = []

    // For each tenant, generate PDF and send to their Masters
    for (const [tenantId, tenantLogs] of Object.entries(logsByTenant)) {
      const recipientMasters = mastersByTenant[tenantId] || []
      
      if (recipientMasters.length === 0) {
        console.log(`No Master users found for tenant ${tenantId}`)
        continue
      }

      // Generate PDF for this tenant's logs
      const pdf = new jsPDF()
      const todayLabel = format(new Date(), 'dd MMM yyyy')
      pdf.setFontSize(16)
      pdf.text(`SiteLog Daily Summary - ${todayLabel}`, 14, 18)
      pdf.setFontSize(10)

      const tableBody = tenantLogs.map((log) => [
        format(new Date(log.created_at), 'dd MMM yyyy'),
        log.sites?.name || 'Unknown Site',
        log.type,
        log.description || '',
        (log.cost || 0).toString(),
      ])

      const totalSpend = tenantLogs.reduce((sum, log) => sum + (log.cost || 0), 0)

      // @ts-ignore - jspdf-autotable extends jsPDF with autoTable method
      pdf.autoTable({
        startY: 26,
        head: [['Date', 'Site', 'Type', 'Description', 'Cost']],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 9 },
        foot: [['', '', '', 'Total Spend Today', totalSpend.toString()]],
        footStyles: { fontStyle: 'bold' },
      })

      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

      // Send to all Masters of this tenant
      for (const master of recipientMasters) {
        if (!master.email) continue

        try {
          const response = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: master.email,
            subject: 'Your SiteLog Daily Report',
            text: `Attached is your SiteLog Daily Summary for ${todayLabel}.`,
            attachments: [
              {
                filename: 'daily-summary.pdf',
                content: pdfBuffer.toString('base64'),
              },
            ],
          })
          
          console.log(`Sent email to ${master.email} (tenant: ${tenantId}):`, response)
          emailsSent++
          emailResults.push({ email: master.email, tenantId, status: 'sent', response })
        } catch (emailError: any) {
          console.error(`Failed to send email to ${master.email}:`, emailError)
          emailResults.push({ email: master.email, tenantId, status: 'failed', error: emailError.message })
        }
      }
    }

    return NextResponse.json({ success: true, emailsSent, results: emailResults })

  } catch (error: any) {
    console.error('CRON ERROR:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
