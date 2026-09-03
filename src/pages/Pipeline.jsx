import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PipelineBuilder from "../components/PipelineBuilder";

const DEFAULT_STAGES = [
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
  const [customPipelines, setCustomPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("default");
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAddDealForm, setShowAddDealForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", title: "", value: "" });
  const [error, setError] = useState("");

  // For custom pipeline stage cards
  const [customStages, setCustomStages] = useState([]);
  const [customCards, setCustomCards] = useState([]);

  async function load() {
    // 1. Fetch Deals & Clients
    const [d, c] = await Promise.all([
      supabase
        .from("deals")
        .select("*, clients(name, company_name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, company_name").order("name"),
    ]);
    setDeals(d.data ?? []);
    setClients(c.data ?? []);

    // 2. Fetch Custom Pipelines if table exists
    try {
      const { data: pipelinesData, error: pError } = await supabase
        .from("custom_pipelines")
        .select("*, pipeline_stages(*)")
        .order("created_at", { ascending: false });

      if (!pError && pipelinesData) {
        setCustomPipelines(pipelinesData);
      }
    } catch (e) {
      console.warn("Custom pipelines table check:", e);
    }
  }

  async function loadCustomPipelineData(pipelineId) {
    if (pipelineId === "default") {
      setCustomStages([]);
      setCustomCards([]);
      return;
    }
    try {
      const { data: stagesData } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("stage_order", { ascending: true });

      setCustomStages(stagesData || []);

      if (stagesData && stagesData.length > 0) {
        const stageIds = stagesData.map((s) => s.id);
        const { data: cardsData } = await supabase
          .from("pipeline_cards")
          .select("*, deals(*, clients(name))")
          .in("stage_id", stageIds)
          .order("card_order", { ascending: true });
        
        setCustomCards(cardsData || []);
      }
    } catch (err) {
      console.error("Error loading custom pipeline stages:", err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadCustomPipelineData(selectedPipelineId);
  }, [selectedPipelineId]);

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
    setShowAddDealForm(false);
    load();
  }

  async function moveStage(dealId, stage) {
    await supabase.from("deals").update({ stage }).eq("id", dealId);
    load();
  }

  async function moveCustomCardStage(cardId, newStageId) {
    await supabase.from("pipeline_cards").update({ stage_id: newStageId }).eq("id", cardId);
    loadCustomPipelineData(selectedPipelineId);
  }

  const activePipelineObj = customPipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="p-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Sales Pipeline & Workflows</h1>
          <p className="text-sm text-ink/50 mt-0.5">
            {selectedPipelineId === "default"
              ? `${deals.length} deals in main pipeline`
              : `${activePipelineObj?.pipeline_name || "Custom Pipeline"} (${customStages.length} stages)`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Deal Button */}
          <button
            onClick={() => setShowAddDealForm((v) => !v)}
            className="bg-paper border border-line text-ink text-sm font-semibold rounded-xl px-4 py-2 hover:bg-line/40 transition"
          >
            {showAddDealForm ? "Cancel Deal" : "+ Add Deal"}
          </button>

          {/* Add New Pipeline Button (Professor Suggestion #1) */}
          <button
            onClick={() => setShowBuilder(true)}
            className="bg-accent text-white text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-90 shadow-sm transition flex items-center gap-1.5"
          >
            <span>+</span> Add New Pipeline
          </button>
        </div>
      </div>

      {/* Pipeline Selector Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-line pb-3 overflow-x-auto">
        <button
          onClick={() => setSelectedPipelineId("default")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            selectedPipelineId === "default"
              ? "bg-ink text-white shadow-xs"
              : "bg-paper text-ink/70 hover:text-ink border border-line"
          }`}
        >
          Default Deals Pipeline
        </button>

        {customPipelines.map((cp) => (
          <button
            key={cp.id}
            onClick={() => setSelectedPipelineId(cp.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedPipelineId === cp.id
                ? "bg-accent text-white shadow-xs"
                : "bg-paper text-ink/70 hover:text-ink border border-line"
            }`}
          >
            {cp.pipeline_name} ({cp.stage_count} stages)
          </button>
        ))}
      </div>

      {/* Form for Adding Deals */}
      {showAddDealForm && (
        <form
          onSubmit={handleAddDeal}
          className="bg-white border border-line rounded-2xl p-4 mb-6 flex gap-3 flex-wrap items-center shadow-xs"
        >
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="border border-line rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name || c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Deal title (e.g. Voice AI Assistant)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border border-line rounded-xl px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            placeholder="Value ($)"
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="border border-line rounded-xl px-3 py-2 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="bg-accent text-white text-sm font-semibold rounded-xl px-5 py-2 hover:opacity-90 transition"
          >
            Save Deal
          </button>
          {error && <p className="w-full text-xs text-danger font-medium mt-1">{error}</p>}
        </form>
      )}

      {/* Pipeline Grid Views */}
      {selectedPipelineId === "default" ? (
        /* Default 6-Stage Deals Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DEFAULT_STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="bg-white border border-line rounded-2xl p-3 min-h-[260px] flex flex-col shadow-xs"
              >
                <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-line/50">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">{stage.label}</p>
                  <span className="text-xs bg-paper border border-line px-2 py-0.5 rounded-full font-semibold text-ink/70">
                    {stageDeals.length}
                  </span>
                </div>
                <div className="space-y-2.5 flex-1">
                  {stageDeals.map((d) => (
                    <div
                      key={d.id}
                      className="bg-paper border border-line hover:border-accent/40 rounded-xl p-3 shadow-xs transition"
                    >
                      <p className="text-xs font-bold text-ink mb-1">{d.title}</p>
                      <p className="text-[11px] text-ink/60 mb-2">
                        {d.clients?.company_name || d.clients?.name || "Client"}
                      </p>
                      <p className="text-xs font-bold text-accent mb-2">
                        {d.value ? `$${Number(d.value).toLocaleString()}` : "—"}
                      </p>
                      <select
                        value={d.stage}
                        onChange={(e) => moveStage(d.id, e.target.value)}
                        className="w-full text-[11px] bg-white border border-line rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {DEFAULT_STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-[11px] text-ink/30 italic text-center py-6">
                      No deals in {stage.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Custom Dynamic Multi-Stage Pipeline Columns */
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[400px]">
          {customStages.map((stage) => {
            const stageCards = customCards.filter((c) => c.stage_id === stage.id);
            return (
              <div
                key={stage.id}
                className="bg-white border border-line rounded-2xl p-3 min-w-[260px] w-[280px] flex-shrink-0 flex flex-col shadow-xs"
              >
                <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-line/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded">
                      #{stage.stage_order}
                    </span>
                    <p className="text-xs font-bold text-ink truncate">{stage.stage_name}</p>
                  </div>
                  <span className="text-xs bg-paper border border-line px-2 py-0.5 rounded-full font-semibold text-ink/70">
                    {stageCards.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {stageCards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-paper border border-line rounded-xl p-3 shadow-xs hover:border-accent/40 transition"
                    >
                      <p className="text-xs font-bold text-ink mb-1">{card.card_title}</p>
                      {card.card_value && (
                        <p className="text-xs font-bold text-accent mb-2">
                          ${Number(card.card_value).toLocaleString()}
                        </p>
                      )}
                      <select
                        value={card.stage_id}
                        onChange={(e) => moveCustomCardStage(card.id, e.target.value)}
                        className="w-full text-[11px] bg-white border border-line rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {customStages.map((st) => (
                          <option key={st.id} value={st.id}>
                            Move to: {st.stage_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {stageCards.length === 0 && (
                    <div className="text-[11px] text-ink/30 italic text-center py-8 border border-dashed border-line/60 rounded-xl">
                      Empty stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pipeline Builder Modal */}
      {showBuilder && (
        <PipelineBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={() => {
            load();
            setShowBuilder(false);
          }}
        />
      )}
    </div>
  );
}
