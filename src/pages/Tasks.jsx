import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', client_id: '', due_date: '' })
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState('')

  async function load() {
    const [t, c] = await Promise.all([
      supabase.from('tasks').select('*, clients(name)').order('due_date', { ascending: true }),
      supabase.from('clients').select('id,name').order('name'),
    ])
    setTasks(t.data ?? [])
    setClients(c.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddTask(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Task title is required.')
      return
    }
    const { error } = await supabase.from('tasks').insert([
      {
        title: form.title,
        client_id: form.client_id || null,
        due_date: form.due_date || null,
        assigned_to: user.id,
        status: 'pending',
      },
    ])
    if (error) {
      setError(error.message)
      return
    }
    setForm({ title: '', client_id: '', due_date: '' })
    setShowForm(false)
    load()
  }

  async function toggleDone(task) {
    await supabase.from('tasks').update({ status: task.status === 'done' ? 'pending' : 'done' }).eq('id', task.id)
    load()
  }

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter)

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Tasks</h1>
          <p className="text-sm text-ink/50">Follow-ups and reminders</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
        >
          {showForm ? 'Cancel' : 'Add task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTask} className="bg-white border border-line rounded-xl p-4 mb-6 flex gap-3 flex-wrap">
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
          />
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2">
            Save task
          </button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>
      )}

      <div className="flex gap-2 mb-4">
        {['pending', 'done', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border capitalize ${
              filter === f ? 'bg-ink text-white border-ink' : 'border-line text-ink/60'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-ink/40 px-4 py-8 text-center">No tasks here.</p>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                onChange={() => toggleDone(t)}
                className="h-4 w-4 accent-accent"
              />
              <div className="flex-1">
                <p className={`text-sm ${t.status === 'done' ? 'line-through text-ink/40' : ''}`}>{t.title}</p>
                <p className="text-xs text-ink/50">{t.clients?.name || 'No client'}</p>
              </div>
              <span className="text-xs text-ink/40">
                {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
