import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Settings</h1>

      <div className="rounded-xl border p-6 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Account</h2>

        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Email</label>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{user?.email}</p>
        </div>

        {profile?.display_name && (
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Display name</label>
            <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{profile.display_name}</p>
          </div>
        )}

        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Timezone</label>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>{profile?.timezone || 'UTC'}</p>
        </div>
      </div>

      <div className="rounded-xl border p-6 mt-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>AI Assistant</h2>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          The AI assistant uses Claude to help you manage tasks, projects, and habits. It can read and update your data via the chat panel on the right side of the screen.
        </p>
      </div>
    </div>
  )
}
