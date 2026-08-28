import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ clients: 0, deals: 0, tasks: 0, tickets: 0 })
  const [recentClients, setRecentClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [clients, deals, tasks, tickets, recent] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }).not('stage', 'in', '("won","lost")'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
        supabase.from('clients').select('id,name,status,company_name').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({
        clients: clients.count ?? 0,
        deals: deals.count ?? 0,
        tasks: tasks.count ?? 0,
        tickets: tickets.count ?? 0,
      })
      setRecentClients(recent.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Total clients', value: stats.clients, to: '/clients' },
    { label: 'Open deals', value: stats.deals, to: '/pipeline' },
    { label: 'Pending tasks', value: stats.tasks, to: '/tasks' },
    { label: 'Open tickets', value: stats.tickets, to: '/tickets' },
  ]

  const statusStyles = {
    lead: 'bg-warnSoft text-warn',
    active: 'bg-accentSoft text-accent',
    inactive: 'bg-ink/5 text-ink/50',
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-lg font-semibold text-ink mb-1">
        Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-sm text-ink/50 mb-6">Here's what's happening across your accounts.</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="bg-white border border-line rounded-xl p-4 hover:border-ink/20 transition"
          >
            <p className="text-xs text-ink/50 mb-1">{c.label}</p>
            <p className="text-2xl font-semibold text-ink">{loading ? '—' : c.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <p className="text-sm font-medium">Recent clients</p>
          <Link to="/clients" className="text-xs text-accent hover:underline">View all</Link>
        </div>
        {recentClients.length === 0 ? (
          <p className="text-sm text-ink/40 px-4 py-8 text-center">
            No clients yet. Add your first client to get started.
          </p>
        ) : (
          <div>
            {recentClients.map((c) => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0 hover:bg-paper transition"
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-ink/50">{c.company_name || '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyles[c.status] || ''}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
