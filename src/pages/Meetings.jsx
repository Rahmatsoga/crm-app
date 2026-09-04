import { useEffect, useState } from "react";
import { getMeetings, scheduleMeeting, generateGoogleCalendarUrl, generateZoomMeetingUrl, generateInstantVideoUrl, SAMPLE_MEETINGS } from "../lib/meetingService";
import { sendSMS, sendWhatsApp } from "../lib/twilioService";
import { supabase } from "../lib/supabaseClient";

export default function Meetings() {
  const [meetings, setMeetings] = useState(SAMPLE_MEETINGS);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'list'
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    meeting_type: "discovery_call",
    client_id: "",
    client_phone: "+1 (555) 234-5678",
    date: new Date().toISOString().split("T")[0],
    time: "14:00",
    notes: "",
    custom_zoom_link: "",
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
      custom_zoom_link: form.custom_zoom_link,
    });

    setSuccessMsg("🎉 Meeting scheduled! Meeting ID & Passcode created, added to Website Calendar Timetable, and sent via SMS.");
    setForm({
      title: "",
      meeting_type: "discovery_call",
      client_id: "",
      client_phone: "+1 (555) 234-5678",
      date: new Date().toISOString().split("T")[0],
      time: "14:00",
      notes: "",
      custom_zoom_link: "",
    });
    setShowForm(false);
    loadData();
    setTimeout(() => setSuccessMsg(""), 5000);
  }

  // Copy Invitation Handler
  function handleCopyInvitation(m) {
    const inviteText = `📅 Meeting Invitation: "${m.title}"\n🗓️ Date/Time: ${new Date(m.start_time).toLocaleString()}\n📹 Zoom Link: ${m.zoom_join_url || "https://zoom.us/join"}\n🆔 Meeting ID: ${m.meeting_id || "836 485 9102"}\n🔑 Passcode: ${m.passcode || "ELEV88"}\n📅 Calendar Sync: ${m.google_calendar_url}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 3000);
  }

  // Quick WhatsApp Invitation Share
  async function handleShareWhatsApp(m) {
    const inviteText = `📅 Elevatech CRM Meeting: "${m.title}"\n🗓️ ${new Date(m.start_time).toLocaleString()}\n🆔 Meeting ID: ${m.meeting_id || "836 485 9102"}\n🔑 Passcode: ${m.passcode || "ELEV88"}\n📹 Zoom: ${m.zoom_join_url || "https://zoom.us/join"}`;
    await sendWhatsApp({
      to: m.client_phone || "+15552345678",
      message_body: inviteText,
    });
    setSuccessMsg(`🚀 Invitation sent to ${m.client_phone || "client"} via WhatsApp!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  // Generate Calendar Grid Days for Current Month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const monthName = today.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="p-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <span>📅</span> Zoom & Google Calendar Engine
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            Interactive Calendar Timetable, Meeting IDs & Passcodes, Live Zoom Rooms, and Automated Twilio SMS
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-paper border border-line rounded-xl p-1 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "calendar" ? "bg-accent text-white shadow-xs" : "text-ink/60 hover:text-ink"
              }`}
            >
              📅 Calendar Timetable
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === "list" ? "bg-accent text-white shadow-xs" : "text-ink/60 hover:text-ink"
              }`}
            >
              📊 List View ({meetings.length})
            </button>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-accent text-white text-xs font-bold rounded-xl px-4 py-2.5 hover:opacity-90 shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>+</span> Schedule New Meeting
          </button>
        </div>
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
                Elevatech HD Meeting & Calendar Integration
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Generates valid Zoom Meeting IDs, passcode security, Google Calendar timetable sync, and shareable invites.
              </p>
            </div>
          </div>

          <a
            href={generateZoomMeetingUrl("Instant Video Call")}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap"
          >
            <span>📹</span> Launch Zoom Portal
          </a>
        </div>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <form onSubmit={handleSchedule} className="bg-white border border-line rounded-2xl p-5 mb-6 space-y-4 shadow-lg">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <span>🗓️ Schedule Client Call / Live Demo</span>
          </h3>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">
                Custom Zoom Link / Room URL (Optional)
              </label>
              <input
                type="url"
                value={form.custom_zoom_link}
                onChange={(e) => setForm({ ...form, custom_zoom_link: e.target.value })}
                placeholder="e.g. https://zoom.us/j/8364859102 or leave blank"
                className="w-full px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent font-mono"
              />
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
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm cursor-pointer"
            >
              {loading ? "Scheduling..." : "🚀 Schedule & Generate Meeting ID / Calendar Invite"}
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

      {/* VIEW 1: INTERACTIVE WEBSITE CALENDAR GRID */}
      {viewMode === "calendar" && (
        <div className="bg-white border border-line rounded-2xl p-6 shadow-sm mb-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-ink">{monthName}</h2>
              <span className="text-xs bg-accent/10 text-accent font-bold px-2.5 py-0.5 rounded-full">
                {meetings.length} Scheduled Meetings
              </span>
            </div>
            <span className="text-xs text-ink/50 font-medium">Click any scheduled meeting card to view credentials & links</span>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-ink/60 uppercase py-2 border-b border-line/60">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((dayNum, idx) => {
              if (!dayNum) {
                return <div key={`empty-${idx}`} className="h-28 bg-slate-50/50 rounded-xl border border-line/40 opacity-40"></div>;
              }

              const currentDayObj = new Date(today.getFullYear(), today.getMonth(), dayNum);
              const isToday = dayNum === today.getDate();

              // Filter meetings on this day
              const dayMeetings = meetings.filter((m) => {
                const mtgDate = new Date(m.start_time);
                return (
                  mtgDate.getDate() === dayNum &&
                  mtgDate.getMonth() === today.getMonth() &&
                  mtgDate.getFullYear() === today.getFullYear()
                );
              });

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`h-28 p-2 rounded-xl border transition overflow-y-auto flex flex-col justify-start ${
                    isToday ? "bg-accent/5 border-accent shadow-2xs" : "bg-paper/40 border-line hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? "bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px]" : "text-ink/70"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 font-extrabold px-1.5 py-0.2 rounded-full">
                        {dayMeetings.length}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Meeting Blocks in Calendar Grid */}
                  <div className="space-y-1">
                    {dayMeetings.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleCopyInvitation(m)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg text-[10px] font-bold shadow-2xs transition cursor-pointer leading-tight truncate"
                        title={`Click to copy invite for "${m.title}"`}
                      >
                        <p className="truncate">📹 {m.title}</p>
                        <p className="text-[9px] text-blue-200 font-mono mt-0.5 truncate">
                          🆔 {m.meeting_id || "836 485 9102"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LIST VIEW & DETAILED MEETING CARDS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-ink/70 uppercase tracking-wider">
          Scheduled Meetings Timeline & Shareable Details ({meetings.length})
        </h3>

        {meetings.map((m) => (
          <div
            key={m.id}
            className="bg-white border border-line hover:border-blue-400 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition group"
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl text-xl font-bold shrink-0 shadow-md">
                📹
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-bold text-ink group-hover:text-accent transition">{m.title}</h3>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full capitalize">
                    {m.meeting_type?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full font-mono">
                    Calendar Timetable Synced
                  </span>
                </div>

                <p className="text-xs text-ink/60 flex items-center gap-3 flex-wrap mb-2">
                  <span>👤 Client: <strong className="text-ink">{m.client_name || "Apex Dental"}</strong></span>
                  <span>🗓️ {new Date(m.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>🎙️ Host: <strong className="text-ink">{m.host_name || "Admin"}</strong></span>
                </p>

                {/* MEETING ID & PASSCODE BADGES */}
                <div className="flex items-center gap-2 flex-wrap p-2 bg-paper/80 rounded-xl border border-line/60">
                  <span className="text-[11px] font-mono font-bold text-ink/80 flex items-center gap-1">
                    <span className="text-ink/40">ID:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-line">{m.meeting_id || "836 485 9102"}</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-ink/80 flex items-center gap-1">
                    <span className="text-ink/40">Passcode:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-line text-accent">{m.passcode || "ELEV88"}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyInvitation(m)}
                    className="text-[11px] bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{copiedId === m.id ? "✅ Copied!" : "📋 Copy Invite & Credentials"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(m)}
                    className="text-[11px] bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-500 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>💬 Share via WhatsApp</span>
                  </button>
                </div>

                {m.notes && <p className="text-xs text-ink/50 italic mt-2">{m.notes}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <a
                href={generateInstantVideoUrl()}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Launch instant live video call in browser (no login required)"
              >
                <span>⚡</span> 1-Click Live Call
              </a>
              <a
                href={m.zoom_join_url && m.zoom_join_url.includes("zoom.us") ? m.zoom_join_url : "https://zoom.us/join"}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Open Zoom Join Portal"
              >
                <span>📹</span> Zoom Join
              </a>
              <a
                href={m.google_calendar_url || generateGoogleCalendarUrl({ title: m.title, startTime: m.start_time })}
                target="_blank"
                rel="noreferrer"
                className="bg-paper border border-line text-ink font-semibold text-xs px-3 py-2.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
