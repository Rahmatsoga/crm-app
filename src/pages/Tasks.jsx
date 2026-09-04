import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { sendSMS } from "../lib/twilioService";

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client_id: "",
    project_id: "",
    due_date: "",
    send_sms_reminder: false,
  });
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState("");
  const [twilioAlert, setTwilioAlert] = useState("");
  const [activeSmsTaskId, setActiveSmsTaskId] = useState(null);
  const [smsMessage, setSmsMessage] = useState("");

  async function load() {
    const [t, c, p] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, clients(name, phone), projects(name)")
        .order("due_date", { ascending: true }),
      supabase.from("clients").select("id, name, phone").order("name"),
      supabase.from("projects").select("id, name, client_id").order("name"),
    ]);
    setTasks(t.data ?? []);
    setClients(c.data ?? []);
    setProjects(p.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddTask(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    const taskObj = {
      title: form.title,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      due_date: form.due_date || null,
      assigned_to: user?.id || null,
      status: "pending",
    };

    const { error: insertErr } = await supabase.from("tasks").insert([taskObj]);

    if (insertErr) {
      console.warn("Error inserting task into DB:", insertErr.message);
      // Fallback local update
      setTasks((prev) => [{ ...taskObj, id: `task-${Date.now()}` }, ...prev]);
    }

    // Send instant SMS reminder if requested
    if (form.send_sms_reminder && form.client_id) {
      const selectedClient = clients.find((c) => c.id === form.client_id);
      const phone = selectedClient?.phone || "+15550001111";
      await sendSMS({
        to: phone,
        message_body: `[CRM Task Reminder] Hi ${selectedClient?.name || "Client"}, a new task "${form.title}" has been assigned for your account.`,
        client_id: form.client_id,
      });
      setTwilioAlert(`📱 Twilio SMS Reminder dispatched to ${phone}`);
      setTimeout(() => setTwilioAlert(""), 4000);
    }

    setForm({ title: "", client_id: "", project_id: "", due_date: "", send_sms_reminder: false });
    setShowForm(false);
    load();
  }

  async function toggleDone(task) {
    const newStatus = task.status === "done" ? "pending" : "done";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    if (newStatus === "done" && task.clients) {
      // Auto-send Twilio completion SMS
      sendSMS({
        to: task.clients.phone || "+15550001111",
        message_body: `[CRM Update] Task "${task.title}" has been completed by your account manager!`,
        client_id: task.client_id,
      });
      setTwilioAlert(`✅ Task completed. Sent automated Twilio SMS update to ${task.clients.name}!`);
      setTimeout(() => setTwilioAlert(""), 4000);
    }

    try {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    } catch (e) {
      console.warn("Task update error:", e);
    }
  }

  async function handleSendInlineSms(task) {
    if (!smsMessage.trim()) return;
    const phone = task.clients?.phone || "+15550001111";

    await sendSMS({
      to: phone,
      message_body: smsMessage,
      client_id: task.client_id,
    });

    setTwilioAlert(`🚀 Twilio SMS sent for task "${task.title}" to ${phone}!`);
    setActiveSmsTaskId(null);
    setSmsMessage("");
    setTimeout(() => setTwilioAlert(""), 4000);
  }

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Tasks & Follow-ups</h1>
          <p className="text-sm text-ink/50 mt-0.5">Manage reminders & Twilio SMS actions</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-accent text-white text-xs font-bold rounded-xl px-4 py-2.5 hover:opacity-90 transition shadow-sm"
        >
          {showForm ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {twilioAlert && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl animate-pulse flex items-center justify-between">
          <span>{twilioAlert}</span>
          <button onClick={() => setTwilioAlert("")} className="text-emerald-700/60 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAddTask}
          className="bg-white border border-line rounded-2xl p-5 mb-6 space-y-4 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Task title (e.g. Call Client regarding contract)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || "No Phone"})
                </option>
              ))}
            </select>
            <select
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
              className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            >
              <option value="">No project</option>
              {projects
                .filter((p) => !form.client_id || p.client_id === form.client_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent bg-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-line/60">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-ink/70 font-medium">
              <input
                type="checkbox"
                checked={form.send_sms_reminder}
                onChange={(e) => setForm({ ...form, send_sms_reminder: e.target.checked })}
                className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
              />
              <span>📱 Send Instant Twilio SMS Notification to Client</span>
            </label>
            <button
              type="submit"
              className="bg-accent text-white text-xs font-bold rounded-xl px-5 py-2 hover:opacity-90 transition shadow-xs"
            >
              Save Task
            </button>
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </form>
      )}

      <div className="flex gap-2 mb-4">
        {["pending", "done", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3.5 py-1.5 rounded-xl border font-bold capitalize transition ${
              filter === f
                ? "bg-ink text-white border-ink shadow-xs"
                : "border-line text-ink/60 hover:text-ink bg-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <p className="text-xs text-ink/40 px-4 py-8 text-center">
            No tasks found.
          </p>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="p-4 border-b border-line last:border-0 hover:bg-paper/40 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={t.status === "done"}
                    onChange={() => toggleDone(t)}
                    className="h-4 w-4 accent-accent cursor-pointer rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold ${t.status === "done" ? "line-through text-ink/40" : "text-ink"}`}
                    >
                      {t.title}
                    </p>
                    <p className="text-[11px] text-ink/50 mt-0.5">
                      {t.projects?.name || t.clients?.name || "General Reminder"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-ink/50 font-medium whitespace-nowrap">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeSmsTaskId === t.id) {
                        setActiveSmsTaskId(null);
                      } else {
                        setActiveSmsTaskId(t.id);
                        setSmsMessage(`Hi ${t.clients?.name || 'Client'}, regarding "${t.title}": `);
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <span>📱</span> SMS
                  </button>
                </div>
              </div>

              {/* Inline Twilio Quick SMS Dispatcher */}
              {activeSmsTaskId === t.id && (
                <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                    <span>Dispatch Twilio SMS to {t.clients?.name || "Client"} ({t.clients?.phone || "+15550001111"})</span>
                    <button onClick={() => setActiveSmsTaskId(null)} className="text-emerald-800/60 hover:text-emerald-800">✕</button>
                  </div>
                  <input
                    type="text"
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Type SMS message..."
                    className="w-full text-xs px-3 py-1.5 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendInlineSms(t)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    🚀 Send SMS via Twilio
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
