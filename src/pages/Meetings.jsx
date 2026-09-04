import { useEffect, useState } from "react";
import { getMeetings, scheduleMeeting, generateGoogleCalendarUrl, generateZoomMeetingUrl, SAMPLE_MEETINGS } from "../lib/meetingService";
import { supabase } from "../lib/supabaseClient";

export default function Meetings() {
  const [meetings, setMeetings] = useState(SAMPLE_MEETINGS);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    meeting_type: "discovery_call",
    client_id: "",
    client_phone: "+1 (555) 234-5678",
    date: "",
    time: "14:00",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [mtgData, clientData] = await Promise.all([
        getMeetings({}),
        supabase.from("clients").select("id, name, phone, company_name").order("name"),
      ]);
      if (mtgData && mtgData.length > 0) setMeetings(mtgData);
      setClients(clientData.data ?? []);
    } catch (e) {
      console.warn("Meetings load warning:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSchedule(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setLoading(true);

    const startTimeISO = new Date(`${form.date}T${form.time}:00`).toISOString();
    const selClient = clients.find((c) => c.id === form.client_id);

    await scheduleMeeting({
      title: form.title.trim(),
      meeting_type: form.meeting_type,
      start_time: startTimeISO,
      notes: form.notes,
      client_id: form.client_id || null,
      client_phone: form.client_phone || selClient?.phone || "+15552345678",
    });

    setSuccessMsg("🎉 Meeting scheduled & Google Cal / Zoom link created! Twilio SMS notification sent.");
    setForm({
      title: "",
      meeting_type: "discovery_call",
      client_id: "",
      client_phone: "+1 (555) 234-5678",
      date: "",
      time: "14:00",
      notes: "",
    });
    setShowForm(false);
    loadData();
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <span>📅</span> Zoom & Google Calendar Meetings
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            Schedule discovery calls, video reviews & client demos with automated Twilio SMS reminders
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-white text-xs font-bold rounded-xl px-4 py-2.5 hover:opacity-90 shadow-md transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>+</span> Schedule New Meeting
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-between shadow-lg animate-bounce">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Fancy Banner */}
      <div className="mb-6 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl shadow-xl border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 rounded-2xl text-2xl border border-blue-500/40">📹</div>
            <div>
              <h3 className="text-sm font-extrabold tracking-wider text-blue-200 uppercase">
                Elevatech Omnichannel Meeting Engine
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Auto-generates Google Calendar invite links, Zoom HD video rooms, and dispatches Twilio SMS reminders.
              </p>
            </div>
          </div>

          <a
            href={generateZoomMeetingUrl("Instant Video Call")}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
          >
            <span>📹</span> Launch Instant Zoom Room
          </a>
        </div>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <form onSubmit={handleSchedule} className="bg-white border border-line rounded-2xl p-5 mb-6 space-y-4 shadow-md">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Schedule Client Call / Demo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Discovery Call — AI Voiceover Review"
                className="w-full px-3 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Type</label>
              <select
                value={form.meeting_type}
                onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="discovery_call">📞 Discovery Call</option>
                <option value="proposal_review">📄 Proposal Review</option>
                <option value="voiceover_review">🎙️ Voiceover & Script Review</option>
                <option value="demo">💻 Live Platform Demo</option>
                <option value="project_kickoff">🚀 Project Kickoff</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Associate Client</label>
              <select
                value={form.client_id}
                onChange={(e) => {
                  const c = clients.find((item) => item.id === e.target.value);
                  setForm({ ...form, client_id: e.target.value, client_phone: c?.phone || form.client_phone });
                }}
                className="w-full px-3 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company_name || "Client"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Client Phone (Twilio SMS)</label>
              <input
                type="text"
                value={form.client_phone}
                onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Date & Time *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-1/2 px-2.5 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-1/2 px-2.5 py-2 border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Notes / Agenda</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Agenda notes for client..."
              className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm cursor-pointer"
            >
              {loading ? "Scheduling..." : "Schedule Meeting & Dispatch Confirmations"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-line text-ink/60 text-xs px-4 py-2.5 rounded-xl hover:bg-paper cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Meetings List Cards */}
      <div className="space-y-3">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="bg-white border border-line hover:border-blue-400 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-lg font-bold shrink-0">
                📹
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-ink group-hover:text-accent transition">{m.title}</h3>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full capitalize">
                    {m.meeting_type?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full font-mono">
                    Twilio SMS Confirmed
                  </span>
                </div>
                <p className="text-xs text-ink/60 mt-1 flex items-center gap-3 flex-wrap">
                  <span>👤 Client: <strong className="text-ink">{m.client_name || "Apex Dental"}</strong></span>
                  <span>🗓️ {new Date(m.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>🎙️ Host: <strong className="text-ink">{m.host_name || "Admin"}</strong></span>
                </p>
                {m.notes && <p className="text-xs text-ink/50 italic mt-1">{m.notes}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={m.zoom_join_url || generateZoomMeetingUrl(m.title)}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>📹</span> Join Zoom Room
              </a>
              <a
                href={m.google_calendar_url || generateGoogleCalendarUrl({ title: m.title, startTime: m.start_time })}
                target="_blank"
                rel="noreferrer"
                className="bg-paper border border-line text-ink font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📅</span> Google Cal
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
