import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { startOfDay, endOfDay, format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  sites?: { name: string | null } | null
}

type MasterUser = {
  id: string
  email: string | null
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

    // Fetch approved logs for today with sites relationship only
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*, sites(name, tenant_id)')
      .eq('approval_status', 'Approved')
      .gte('created_at', start)
      .lte('created_at', end)

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`)
    }

    const safeLogs: LogRecord[] = logs || []

    // Extract unique user_ids from logs
    const uniqueUserIds = [...new Set(safeLogs.map(log => log.user_id).filter(Boolean))] as string[]

    // Fetch profiles for those user_ids
    let profilesMap: Record<string, string> = {}
    if (uniqueUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', uniqueUserIds)

      if (profilesError) {
        console.error('Failed to fetch profiles:', profilesError.message)
      } else {
        // Create mapping of profileId -> email
        profilesMap = (profiles || []).reduce((acc, profile) => {
          if (profile.email) {
            acc[profile.id] = profile.email
          }
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Fetch master users
    const { data: masters, error: mastersError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'Master')

    if (mastersError) {
      throw new Error(`Failed to fetch masters: ${mastersError.message}`)
    }

    const masterUsers: MasterUser[] = masters || []
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      throw new Error('Missing RESEND_API_KEY')
    }
    const resend = new Resend(resendKey)

    // Prepare PDF content once (shared for all Masters)
    const pdf = new jsPDF()
    const todayLabel = format(new Date(), 'dd MMM yyyy')
    pdf.setFontSize(16)
    pdf.text(`SiteLog Daily Summary - ${todayLabel}`, 14, 18)
    pdf.setFontSize(10)
    const tableBody =
      safeLogs.length === 0
        ? [['-', '-', '-', 'No logs today', '0']]
        : safeLogs.map((log) => [
            format(new Date(log.created_at), 'dd MMM yyyy'),
            log.sites?.name || 'Unknown Site',
            log.type,
            log.description || '',
            (log.cost || 0).toString(),
          ])

    const totalSpend = safeLogs.reduce((sum, log) => sum + (log.cost || 0), 0)

    autoTable(pdf, {
      startY: 26,
      head: [['Date', 'Site', 'Type', 'Description', 'Cost']],
      body: tableBody,
      theme: 'striped',
      styles: { fontSize: 9 },
      foot: [['', '', '', 'Total Spend Today', totalSpend.toString()]],
      footStyles: { fontStyle: 'bold' },
    })

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    // Send email
    console.log('API Key Status:', process.env.RESEND_API_KEY ? 'Loaded' : 'Missing')
    
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'srinath8789@gmail.com',
      subject: 'Your SiteLog Daily Report',
      text: 'Attached is your SiteLog Daily Summary for today.',
      attachments: [
        {
          filename: 'daily-summary.pdf',
          content: pdfBuffer.toString('base64'),
        },
      ],
    })
    
    console.log('Resend API Response:', response)

    return NextResponse.json({ success: true, emailsSent: 1, response })

  } catch (error: any) {
    console.error('CRON ERROR:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
