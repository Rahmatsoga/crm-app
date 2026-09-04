import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getCommunicationLogs } from "../lib/twilioService";

export function ActivityFeed({ clientId, onActivityAdded }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "note",
    subject: "",
    description: "",
  });

  async function fetchActivities() {
    // 1. Fetch Standard CRM Activities
    const { data: actData } = await supabase
      .from("activities")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    // 2. Fetch Twilio Communication Logs
    const twilioLogs = await getCommunicationLogs({ client_id: clientId });
    const formattedTwilioLogs = twilioLogs.map((log) => ({
      id: log.id,
      type: log.channel === "voice" ? "twilio_call" : log.channel === "whatsapp" ? "twilio_whatsapp" : "twilio_sms",
      subject: `[Twilio ${log.channel.toUpperCase()}] ${log.direction === "outbound" ? "Sent to" : "Received from"} ${log.recipient_number}`,
      description: log.message_body,
      created_at: log.created_at,
      isTwilio: true,
    }));

    // Combine and sort by date descending
    const combined = [...(actData || []), ...formattedTwilioLogs].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    setActivities(combined);
    setLoading(false);
  }

  useEffect(() => {
    fetchActivities();
  }, [clientId]);

  async function handleAddActivity(e) {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    const { error } = await supabase.from("activities").insert({
      type: formData.type,
      subject: formData.subject,
      description: formData.description,
      client_id: clientId,
      created_by: user?.id || null,
    });

    if (!error) {
      setFormData({ type: "note", subject: "", description: "" });
      setShowForm(false);
      fetchActivities();
      if (onActivityAdded) onActivityAdded();
    }
  }

  async function handleDelete(id) {
    await supabase.from("activities").delete().eq("id", id);
    fetchActivities();
  }

  const icons = {
    email: "✉️",
    call: "☎️",
    note: "📝",
    meeting: "📅",
    task_completed: "✅",
    twilio_sms: "📱",
    twilio_whatsapp: "💬",
    twilio_call: "📞",
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-xs font-bold px-3 py-2 bg-ink text-white rounded-xl hover:opacity-90 transition mb-4 shadow-xs"
      >
        {showForm ? "Cancel" : "+ Add Activity Note"}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddActivity}
          className="bg-white border border-line rounded-2xl p-4 mb-4 shadow-sm space-y-3"
        >
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border border-line rounded-xl px-3 py-2 text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="note">Note</option>
            <option value="email">Email</option>
            <option value="call">Call Log</option>
            <option value="meeting">Meeting</option>
            <option value="task_completed">Task Completed</option>
          </select>

          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Subject..."
            className="w-full border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description..."
            className="w-full border border-line rounded-xl px-3 py-2 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="bg-accent text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 shadow-xs"
            >
              Save Activity
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-paper border border-line text-ink text-xs font-semibold px-4 py-2 rounded-xl hover:bg-line/40"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-ink/40">Loading activity timeline...</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-ink/40 text-center py-8 border border-dashed border-line rounded-2xl">
          No activity logs recorded yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {activities.map((a) => (
            <div
              key={a.id}
              className={`border rounded-xl p-3 shadow-2xs transition ${
                a.isTwilio ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-line"
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icons[a.type] || "📌"}</span>
                  <span className="font-bold text-xs text-ink">{a.subject}</span>
                  {a.isTwilio && (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider">
                      Twilio Verified
                    </span>
                  )}
                </div>
                {!a.isTwilio && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-[10px] text-ink/30 hover:text-red-500 font-semibold"
                  >
                    Delete
                  </button>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-ink/80 mb-1.5 font-sans break-words">{a.description}</p>
              )}
              <p className="text-[10px] text-ink/40 font-medium">
                {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
