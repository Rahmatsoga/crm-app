import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const priorityStyles = {
  low: 'bg-ink/5 text-ink/50',
  medium: 'bg-warnSoft text-warn',
  high: 'bg-dangerSoft text-danger',
}

const statusStyles = {
  open: 'bg-warnSoft text-warn',
  'in-progress': 'bg-accentSoft text-accent',
  closed: 'bg-ink/5 text-ink/50',
}

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', subject: '', description: '', priority: 'medium' })
  const [error, setError] = useState('')

  async function load() {
    const [t, c] = await Promise.all([
      supabase.from('tickets').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id,name').order('name'),
    ])
    setTickets(t.data ?? [])
    setClients(c.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddTicket(e) {
    e.preventDefault()
    setError('')
    if (!form.client_id || !form.subject.trim()) {
      setError('Pick a client and enter a subject.')
      return
    }
    const { error } = await supabase.from('tickets').insert([{ ...form, status: 'open' }])
    if (error) {
      setError(error.message)
      return
    }
    setForm({ client_id: '', subject: '', description: '', priority: 'medium' })
    setShowForm(false)
    load()
  }

  async function updateStatus(id, status) {
    await supabase.from('tickets').update({ status }).eq('id', id)
    load()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Tickets</h1>
          <p className="text-sm text-ink/50">Support issues raised by clients</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
        >
          {showForm ? 'Cancel' : 'New ticket'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTicket} className="bg-white border border-line rounded-xl p-4 mb-6 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <textarea
            placeholder="Describe the issue…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          <button type="submit" className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2">
            Submit ticket
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      )}

      <div className="space-y-2">
        {tickets.length === 0 ? (
          <p className="text-sm text-ink/40 text-center py-8">No tickets yet.</p>
        ) : (
          tickets.map((t) => (
            <div key={t.id} className="bg-white border border-line rounded-xl p-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-ink/50">{t.clients?.name}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${priorityStyles[t.priority]}`}>
                    {t.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyles[t.status]}`}>
                    {t.status}
                  </span>
                </div>
              </div>
              {t.description && <p className="text-sm text-ink/60 mt-2">{t.description}</p>}
              <div className="flex gap-2 mt-3">
                {['open', 'in-progress', 'closed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(t.id, s)}
                    className={`text-xs px-2 py-1 rounded-lg border capitalize ${
                      t.status === s ? 'border-ink bg-ink text-white' : 'border-line text-ink/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
