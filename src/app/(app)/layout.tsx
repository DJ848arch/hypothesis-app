import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/layout/SidebarNav'
import AIChatPanel from '@/components/layout/AIChatPanel'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <SidebarNav />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
      <AIChatPanel />
    </div>
  )
}
