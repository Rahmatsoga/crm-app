import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default function Pipeline() {
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", title: "", value: "" });
  const [error, setError] = useState("");

  async function load() {
    const [d, c] = await Promise.all([
      supabase
        .from("deals")
        .select("*, clients(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name").order("name"),
    ]);
    setDeals(d.data ?? []);
    setClients(c.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddDeal(e) {
    e.preventDefault();
    setError("");

    const cleanedTitle = form.title.trim();
    const cleanValue = Number(form.value) || 0;

    if (!form.client_id || !cleanedTitle) {
      setError("Pick a client and enter a deal title.");
      return;
    }

    if (cleanValue < 0) {
      setError("Deal value cannot be negative.");
      return;
    }

    const { error } = await supabase.from("deals").insert([
      {
        client_id: form.client_id,
        title: cleanedTitle,
        value: cleanValue,
        stage: "new",
      },
    ]);
    if (error) {
      setError(error.message);
      return;
    }
    setForm({ client_id: "", title: "", value: "" });
    setShowForm(false);
    load();
  }

  async function moveStage(dealId, stage) {
    await supabase.from("deals").update({ stage }).eq("id", dealId);
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Pipeline</h1>
          <p className="text-sm text-ink/50">{deals.length} deals</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
        >
          {showForm ? "Cancel" : "Add deal"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddDeal}
          className="bg-white border border-line rounded-xl p-4 mb-6 flex gap-3 flex-wrap"
        >
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Deal title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
          />
          <input
            placeholder="Value ($)"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm w-32"
          />
          <button
            type="submit"
            className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            Save deal
          </button>
          {error && <p className="w-full text-xs text-danger">{error}</p>}
        </form>
      )}

      <div className="grid grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
          return (
            <div
              key={stage.key}
              className="bg-white border border-line rounded-xl p-2 min-h-[200px]"
            >
              <div className="flex items-center justify-between px-1 py-1 mb-2">
                <p className="text-xs font-medium text-ink/60">{stage.label}</p>
                <span className="text-xs text-ink/40">{stageDeals.length}</span>
              </div>
              <div className="space-y-2">
                {stageDeals.map((d) => (
                  <div
                    key={d.id}
                    className="bg-paper border border-line rounded-lg p-2"
                  >
                    <p className="text-xs font-medium mb-0.5">{d.title}</p>
                    <p className="text-[11px] text-ink/50 mb-2">
                      {d.clients?.name}
                    </p>
                    <p className="text-[11px] font-medium mb-2">
                      {d.value ? `$${d.value}` : "—"}
                    </p>
                    <select
                      value={d.stage}
                      onChange={(e) => moveStage(d.id, e.target.value)}
                      className="w-full text-[11px] border border-line rounded px-1 py-0.5"
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
