import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClientLayout from './client-layout'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role, email, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    redirect('/onboarding')
  }

  return (
    <DashboardClientLayout profile={profile}>
      {children}
    </DashboardClientLayout>
  )
}