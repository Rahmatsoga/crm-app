import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

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
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setActivities(data || []);
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
      created_by: user.id,
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
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-sm px-3 py-2 bg-ink text-white rounded-lg hover:opacity-90 mb-4"
      >
        {showForm ? "Cancel" : "+ Add Activity"}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddActivity}
          className="bg-white border border-line rounded-xl p-4 mb-4"
        >
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          >
            <option value="note">Note</option>
            <option value="email">Email</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="task_completed">Task Completed</option>
          </select>

          <input
            type="text"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            placeholder="Subject..."
            className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          />

          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Description..."
            className="w-full border border-line rounded-lg px-3 py-2 text-sm h-20 mb-3"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-accent text-white text-sm px-4 py-2 rounded-lg hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-ink/5 text-ink text-sm px-4 py-2 rounded-lg hover:bg-ink/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink/40">Loading...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-ink/40 text-center py-8">
          No activities yet
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-line rounded-lg p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span>{icons[a.type]}</span>
                  <span className="font-medium text-sm">{a.subject}</span>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-ink/40 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
              {a.description && (
                <p className="text-sm text-ink/60 mb-2">{a.description}</p>
              )}
              <p className="text-xs text-ink/40">
                {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
