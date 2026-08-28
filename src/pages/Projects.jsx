import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const STATUSES = [
  { key: "planning", label: "Planning" },
  { key: "in-progress", label: "In progress" },
  { key: "on-hold", label: "On hold" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyles = {
  planning: "bg-warnSoft text-warn",
  "in-progress": "bg-accentSoft text-accent",
  "on-hold": "bg-ink/5 text-ink/50",
  completed: "bg-accentSoft text-accent",
  cancelled: "bg-dangerSoft text-danger",
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [expandedProject, setExpandedProject] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    due_date: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_id: "",
    deal_id: "",
    description: "",
    budget: "",
    start_date: "",
    due_date: "",
  });
  const [error, setError] = useState("");

  async function load() {
    const [projectResult, clientResult, dealResult, milestoneResult] =
      await Promise.all([
        supabase
          .from("projects")
          .select("*, clients(name)")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id,name").order("name"),
        supabase
          .from("deals")
          .select("id,title,client_id")
          .eq("stage", "won")
          .order("created_at", { ascending: false }),
        supabase
          .from("project_milestones")
          .select("*")
          .order("due_date", { ascending: true }),
      ]);
    setProjects(projectResult.data ?? []);
    setClients(clientResult.data ?? []);
    setDeals(dealResult.data ?? []);
    setMilestones(
      (milestoneResult.data ?? []).reduce((grouped, milestone) => {
        grouped[milestone.project_id] = [
          ...(grouped[milestone.project_id] || []),
          milestone,
        ];
        return grouped;
      }, {}),
    );
  }

  useEffect(() => {
    load();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAddProject(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.client_id) {
      setError("Project name and client are required.");
      return;
    }
    const { error: insertError } = await supabase.from("projects").insert([
      {
        name: form.name.trim(),
        client_id: form.client_id,
        deal_id: form.deal_id || null,
        description: form.description.trim() || null,
        budget: Number(form.budget) || 0,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        created_by: user.id,
      },
    ]);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({
      name: "",
      client_id: "",
      deal_id: "",
      description: "",
      budget: "",
      start_date: "",
      due_date: "",
    });
    setShowForm(false);
    load();
  }

  async function updateStatus(projectId, status) {
    await supabase.from("projects").update({ status }).eq("id", projectId);
    load();
  }

  async function addMilestone(event, projectId) {
    event.preventDefault();
    if (!milestoneForm.title.trim()) return;
    const { error: insertError } = await supabase
      .from("project_milestones")
      .insert([
        {
          project_id: projectId,
          title: milestoneForm.title.trim(),
          due_date: milestoneForm.due_date || null,
        },
      ]);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setMilestoneForm({ title: "", due_date: "" });
    load();
  }

  async function toggleMilestone(milestone) {
    await supabase
      .from("project_milestones")
      .update({
        status: milestone.status === "completed" ? "pending" : "completed",
      })
      .eq("id", milestone.id);
    load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Projects</h1>
          <p className="text-sm text-ink/50">Delivery work for won clients</p>
        </div>
        <button
          onClick={() => setShowForm((current) => !current)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddProject}
          className="bg-white border border-line rounded-xl p-4 mb-6 grid grid-cols-2 gap-3"
        >
          <input
            placeholder="Project name"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.client_id}
            onChange={(event) => updateForm("client_id", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select
            value={form.deal_id}
            onChange={(event) => updateForm("deal_id", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Won deal (optional)...</option>
            {deals
              .filter(
                (deal) => !form.client_id || deal.client_id === form.client_id,
              )
              .map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.title}
                </option>
              ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Budget ($)"
            value={form.budget}
            onChange={(event) => updateForm("budget", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.start_date}
            onChange={(event) => updateForm("start_date", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.due_date}
            onChange={(event) => updateForm("due_date", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            rows="2"
          />
          <button
            type="submit"
            className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 justify-self-start"
          >
            Create project
          </button>
          {error && <p className="text-xs text-danger col-span-2">{error}</p>}
        </form>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-line rounded-xl px-4 py-12 text-center text-sm text-ink/40">
          No projects yet. Create one from a won deal.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {projects.map((project) => (
            <div
              key={project.id}
              className="px-4 py-4 border-b border-line last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{project.name}</p>
                  <Link
                    to={`/clients/${project.client_id}`}
                    className="text-xs text-accent hover:underline"
                  >
                    {project.clients?.name || "Unknown client"}
                  </Link>
                  {project.description && (
                    <p className="text-xs text-ink/50 mt-1">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-ink/40 mt-2">
                    {project.start_date || "No start date"}{" "}
                    {project.due_date ? `- due ${project.due_date}` : ""}{" "}
                    {project.budget ? `- $${project.budget}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setExpandedProject(
                        expandedProject === project.id ? null : project.id,
                      )
                    }
                    className="text-xs text-accent border border-line rounded-lg px-2 py-1"
                  >
                    {expandedProject === project.id
                      ? "Hide milestones"
                      : `${(milestones[project.id] || []).length} milestones`}
                  </button>
                  <select
                    value={project.status}
                    onChange={(event) =>
                      updateStatus(project.id, event.target.value)
                    }
                    className={`border-0 rounded-full px-2 py-1 text-xs capitalize ${statusStyles[project.status] || ""}`}
                  >
                    {STATUSES.map((status) => (
                      <option key={status.key} value={status.key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {expandedProject === project.id && (
                <div className="mt-4 pl-3 border-l-2 border-accent/20">
                  <div className="space-y-2 mb-3">
                    {(milestones[project.id] || []).map((milestone) => (
                      <label
                        key={milestone.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={milestone.status === "completed"}
                          onChange={() => toggleMilestone(milestone)}
                        />
                        <span
                          className={
                            milestone.status === "completed"
                              ? "line-through text-ink/40"
                              : ""
                          }
                        >
                          {milestone.title}
                        </span>
                        {milestone.due_date && (
                          <span className="text-ink/40">
                            due {milestone.due_date}
                          </span>
                        )}
                      </label>
                    ))}
                    {(milestones[project.id] || []).length === 0 && (
                      <p className="text-xs text-ink/40">No milestones yet.</p>
                    )}
                  </div>
                  <form
                    onSubmit={(event) => addMilestone(event, project.id)}
                    className="flex gap-2 flex-wrap"
                  >
                    <input
                      placeholder="Milestone title"
                      value={milestoneForm.title}
                      onChange={(event) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          title: event.target.value,
                        })
                      }
                      className="border border-line rounded-lg px-3 py-1.5 text-xs flex-1 min-w-[160px]"
                    />
                    <input
                      type="date"
                      value={milestoneForm.due_date}
                      onChange={(event) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          due_date: event.target.value,
                        })
                      }
                      className="border border-line rounded-lg px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="bg-accent text-white rounded-lg px-3 py-1.5 text-xs"
                    >
                      Add milestone
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
