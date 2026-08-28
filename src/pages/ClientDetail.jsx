import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const TABS = ['Activity', 'Deals', 'Tasks', 'Tickets']

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [client, setClient] = useState(null)
  const [tab, setTab] = useState('Activity')
  const [interactions, setInteractions] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [tickets, setTickets] = useState([])
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const [c, i, d, t, tk] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('interactions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('deals').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('client_id', id).order('due_date', { ascending: true }),
      supabase.from('tickets').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    setClient(c.data)
    setInteractions(i.data ?? [])
    setDeals(d.data ?? [])
    setTasks(t.data ?? [])
    setTickets(tk.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [id])

  async function addNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    await supabase.from('interactions').insert([
      { client_id: id, user_id: user.id, type: noteType, notes: note },
    ])
    setNote('')
    loadAll()
  }

  async function updateStatus(status) {
    await supabase.from('clients').update({ status }).eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-8 text-sm text-ink/40">Loading…</div>
  if (!client) return <div className="p-8 text-sm text-ink/40">Client not found.</div>

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => navigate('/clients')} className="text-xs text-ink/50 hover:text-ink mb-4">
        ← Back to clients
      </button>

      <div className="bg-white border border-line rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">{client.name}</h1>
            <p className="text-sm text-ink/50">{client.company_name || 'No company'}</p>
          </div>
          <select
            value={client.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="border border-line rounded-lg px-2 py-1 text-xs capitalize"
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <p className="text-xs text-ink/40">Email</p>
            <p>{client.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-ink/40">Phone</p>
            <p>{client.phone || '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-2 border-b-2 -mb-px transition ${
              tab === t ? 'border-accent text-accent font-medium' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Activity' && (
        <div>
          <form onSubmit={addNote} className="bg-white border border-line rounded-xl p-3 mb-4 flex gap-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="border border-line rounded-lg px-2 text-xs"
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
            </select>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Log an interaction…"
              className="flex-1 border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button type="submit" className="bg-ink text-white text-sm rounded-lg px-3 py-1.5">
              Add
            </button>
          </form>
          {interactions.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-8">No activity logged yet.</p>
          ) : (
            <div className="space-y-2">
              {interactions.map((i) => (
                <div key={i.id} className="bg-white border border-line rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium capitalize text-accent">{i.type}</span>
                    <span className="text-xs text-ink/40">{new Date(i.created_at).toLocaleString()}</span>
                  </div>
                  <p>{i.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Deals' && (
        <div className="space-y-2">
          {deals.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-8">No deals for this client yet.</p>
          ) : (
            deals.map((d) => (
              <div key={d.id} className="bg-white border border-line rounded-lg p-3 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-ink/50 capitalize">{d.stage}</p>
                </div>
                <p className="text-sm font-medium">{d.value ? `$${d.value}` : '—'}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Tasks' && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-8">No tasks linked to this client.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="bg-white border border-line rounded-lg p-3 flex justify-between text-sm">
                <p>{t.title}</p>
                <span className="text-xs text-ink/50">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Tickets' && (
        <div className="space-y-2">
          {tickets.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-8">No support tickets for this client.</p>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="bg-white border border-line rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <p className="font-medium">{t.subject}</p>
                  <span className="text-xs capitalize text-ink/50">{t.status}</span>
                </div>
                <p className="text-xs text-ink/50 mt-1">{t.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
