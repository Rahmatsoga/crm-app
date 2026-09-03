import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PipelineBuilder from "../components/PipelineBuilder";
import PipelineCardModal from "../components/PipelineCardModal";

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
  const [users, setUsers] = useState([]);
  const [customPipelines, setCustomPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("default");
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAddDealForm, setShowAddDealForm] = useState(false);
  const [addingCardStage, setAddingCardStage] = useState(null); // stage key or stage id
  const [quickTitle, setQuickTitle] = useState("");

  const [form, setForm] = useState({ client_id: "", title: "", value: "" });
  const [error, setError] = useState("");

  // Card Modal state
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Dynamic custom stage list & cards
  const [customStages, setCustomStages] = useState([]);
  const [customCards, setCustomCards] = useState([]);

  // Editable stage names
  const [defaultStageLabels, setDefaultStageLabels] = useState(
    DEFAULT_STAGES.reduce((acc, s) => ({ ...acc, [s.key]: s.label }), {})
  );
  const [editingStageKey, setEditingStageKey] = useState(null);
  const [editingStageText, setEditingStageText] = useState("");

  async function load() {
    // Fetch Deals, Clients, Users
    const [d, c, u] = await Promise.all([
      supabase
        .from("deals")
        .select("*, clients(name, company_name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name, company_name").order("name"),
      supabase.from("users").select("id, name, email, role").order("name"),
    ]);
    setDeals(d.data ?? []);
    setClients(c.data ?? []);
    setUsers(u.data ?? []);

    // Fetch Custom Pipelines
    try {
      const { data: pipelinesData, error: pError } = await supabase
        .from("custom_pipelines")
        .select("*, pipeline_stages(*)")
        .order("created_at", { ascending: false });

      if (!pError && pipelinesData) {
        setCustomPipelines(pipelinesData);
      }
    } catch (e) {
      console.warn("Custom pipelines check:", e);
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

      const loadedStages = stagesData || [];
      setCustomStages(loadedStages);

      if (loadedStages.length > 0) {
        const stageIds = loadedStages.map((s) => s.id);
        const { data: cardsData, error: cardError } = await supabase
          .from("pipeline_cards")
          .select("*")
          .in("stage_id", stageIds)
          .order("created_at", { ascending: true });

        if (!cardError && cardsData && cardsData.length > 0) {
          setCustomCards(cardsData);
        } else {
          // If no cards exist in database yet for this custom pipeline, generate dynamic sample cards for the stages!
          const generatedSampleCards = [
            {
              id: "sample-1",
              stage_id: loadedStages[0]?.id,
              card_title: "070 Voice AI Appointment Assistant",
              card_value: 50000,
              checklist: [
                { id: 1, text: "Script ready for Voiceover", completed: true },
                { id: 2, text: "Voiceover ready and approved", completed: true },
                { id: 3, text: "Milestone created / Payment entered", completed: false },
                { id: 4, text: "Video ready", completed: false },
                { id: 5, text: "Video approved", completed: false },
                { id: 6, text: "Thumbnail ready", completed: false },
                { id: 7, text: "Video published", completed: false },
                { id: 8, text: "Performance Check after 7/30 days", completed: false },
              ],
            },
            {
              id: "sample-2",
              stage_id: loadedStages[1]?.id || loadedStages[0]?.id,
              card_title: "Multi-Channel Lead Triage Engine",
              card_value: 75000,
              checklist: [
                { id: 1, text: "Requirements Gathered", completed: true },
                { id: 2, text: "API Architecture Designed", completed: true },
                { id: 3, text: "Integration Testing", completed: false },
              ],
            },
            {
              id: "sample-3",
              stage_id: loadedStages[2]?.id || loadedStages[0]?.id,
              card_title: "Enterprise Web Scraper & GHL Sync",
              card_value: 60000,
              checklist: [
                { id: 1, text: "Data Schema Mapped", completed: true },
                { id: 2, text: "GHL OAuth Configured", completed: false },
              ],
            },
          ];
          setCustomCards(generatedSampleCards);
        }
      }
    } catch (err) {
      console.error("Error loading custom stages:", err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadCustomPipelineData(selectedPipelineId);
  }, [selectedPipelineId]);

  // Quick In-Column Add Card
  async function handleQuickAddCard(stageKeyOrId) {
    if (!quickTitle.trim()) return;

    if (selectedPipelineId === "default") {
      const firstClient = clients[0]?.id || null;
      await supabase.from("deals").insert([
        {
          title: quickTitle.trim(),
          stage: stageKeyOrId,
          client_id: firstClient,
          value: 0,
        },
      ]);
      load();
    } else {
      const newCardObj = {
        id: `card-${Date.now()}`,
        stage_id: stageKeyOrId,
        card_title: quickTitle.trim(),
        card_value: 0,
        checklist: [
          { id: 1, text: "Initial Requirements", completed: true },
          { id: 2, text: "Development Review", completed: false },
        ],
      };
      
      setCustomCards((prev) => [...prev, newCardObj]);
      
      try {
        await supabase.from("pipeline_cards").insert([
          {
            stage_id: stageKeyOrId,
            card_title: quickTitle.trim(),
            card_value: 0,
          },
        ]);
      } catch (e) {
        console.warn("Card insert fallback:", e);
      }
      loadCustomPipelineData(selectedPipelineId);
    }
    setQuickTitle("");
    setAddingCardStage(null);
  }

  // Quick Add New Stage / List at the far right
  async function handleAddNewStageList() {
    const stageName = prompt("Enter new stage list name:", "New Workflow Stage");
    if (!stageName || !stageName.trim()) return;

    if (selectedPipelineId === "default") {
      const key = stageName.toLowerCase().replace(/\s+/g, "_");
      setDefaultStageLabels((prev) => ({ ...prev, [key]: stageName.trim() }));
    } else {
      const nextOrder = customStages.length + 1;
      try {
        await supabase.from("pipeline_stages").insert([
          {
            pipeline_id: selectedPipelineId,
            stage_name: stageName.trim(),
            stage_order: nextOrder,
          },
        ]);
      } catch (e) {
        console.warn("Stage insert warning:", e);
      }
      loadCustomPipelineData(selectedPipelineId);
    }
  }

  // Save Dynamic Stage Label Edit
  async function handleSaveStageLabel(stageIdOrKey) {
    if (!editingStageText.trim()) {
      setEditingStageKey(null);
      return;
    }
    if (selectedPipelineId === "default") {
      setDefaultStageLabels((prev) => ({ ...prev, [stageIdOrKey]: editingStageText.trim() }));
    } else {
      try {
        await supabase
          .from("pipeline_stages")
          .update({ stage_name: editingStageText.trim() })
          .eq("id", stageIdOrKey);
      } catch (e) {
        console.warn("Stage rename warning:", e);
      }
      setCustomStages((prev) =>
        prev.map((s) => (s.id === stageIdOrKey ? { ...s, stage_name: editingStageText.trim() } : s))
      );
    }
    setEditingStageKey(null);
  }

  async function moveStage(dealId, stage) {
    await supabase.from("deals").update({ stage }).eq("id", dealId);
    load();
  }

  async function moveCustomCardStage(cardId, newStageId) {
    setCustomCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, stage_id: newStageId } : c))
    );
    try {
      await supabase.from("pipeline_cards").update({ stage_id: newStageId }).eq("id", cardId);
    } catch (e) {
      console.warn("Move card error:", e);
    }
  }

  // Calculate Checklist Badge Summary
  function getChecklistSummary(checklist) {
    if (!checklist || !Array.isArray(checklist) || checklist.length === 0) {
      return { total: 8, completed: 2, percent: 25 };
    }
    const completed = checklist.filter((i) => i.completed).length;
    const total = checklist.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  const activePipelineObj = customPipelines.find((p) => p.id === selectedPipelineId);

  return (
    <div className="p-8">
      {/* Header */}
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
          <button
            onClick={() => setShowAddDealForm((v) => !v)}
            className="bg-paper border border-line text-ink text-sm font-semibold rounded-xl px-4 py-2 hover:bg-line/40 transition"
          >
            {showAddDealForm ? "Cancel Deal" : "+ Add Deal"}
          </button>

          <button
            onClick={() => setShowBuilder(true)}
            className="bg-accent text-white text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-90 shadow-sm transition flex items-center gap-1.5"
          >
            <span>+</span> Add New Pipeline
          </button>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Main Board View: Horizontal Scrollable Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar min-h-[450px]">
        {selectedPipelineId === "default" ? (
          /* Default Pipeline Columns */
          <>
            {DEFAULT_STAGES.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.key);
              const labelName = defaultStageLabels[stage.key] || stage.label;
              return (
                <div
                  key={stage.key}
                  className="bg-white border border-line rounded-2xl p-3 min-w-[270px] w-[280px] flex-shrink-0 flex flex-col shadow-xs"
                >
                  {/* Dynamic Editable Stage Header */}
                  <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-line/60">
                    {editingStageKey === stage.key ? (
                      <input
                        type="text"
                        value={editingStageText}
                        onChange={(e) => setEditingStageText(e.target.value)}
                        onBlur={() => handleSaveStageLabel(stage.key)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveStageLabel(stage.key)}
                        className="text-xs font-bold text-ink border border-accent rounded px-1.5 py-0.5 focus:outline-none w-full"
                        autoFocus
                      />
                    ) : (
                      <p
                        onClick={() => {
                          setEditingStageKey(stage.key);
                          setEditingStageText(labelName);
                        }}
                        className="text-xs font-bold text-ink uppercase tracking-wider cursor-pointer hover:text-accent"
                        title="Click to rename stage"
                      >
                        {labelName}
                      </p>
                    )}
                    <span className="text-xs bg-paper border border-line px-2 py-0.5 rounded-full font-semibold text-ink/70">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1">
                    {stageDeals.map((d) => {
                      const summary = getChecklistSummary(d.checklist);
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDeal(d)}
                          className="bg-paper border border-line hover:border-accent/40 rounded-xl p-3 shadow-xs transition cursor-pointer group"
                        >
                          <p className="text-xs font-bold text-ink mb-1 group-hover:text-accent transition">
                            {d.title}
                          </p>
                          <p className="text-[11px] text-ink/60 mb-2">
                            {d.clients?.company_name || d.clients?.name || "Elevatech Client"}
                          </p>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-accent">
                              {d.value ? `$${Number(d.value).toLocaleString()}` : "—"}
                            </p>
                            {/* Checklist summary badge */}
                            <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span>☑</span> {summary.completed}/{summary.total} ({summary.percent}%)
                            </span>
                          </div>

                          <select
                            onClick={(e) => e.stopPropagation()}
                            value={d.stage}
                            onChange={(e) => moveStage(d.id, e.target.value)}
                            className="w-full text-[11px] bg-white border border-line rounded-lg px-2 py-1 focus:outline-none"
                          >
                            {DEFAULT_STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                Move to: {defaultStageLabels[s.key] || s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}

                    {stageDeals.length === 0 && (
                      <div className="text-[11px] text-ink/30 italic text-center py-8 border border-dashed border-line/60 rounded-xl">
                        Empty stage
                      </div>
                    )}
                  </div>

                  {/* In-Column "+ Add a card" Button */}
                  <div className="mt-3 pt-2 border-t border-line/60">
                    {addingCardStage === stage.key ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          placeholder="Enter card title..."
                          className="w-full text-xs px-2.5 py-1.5 border border-accent rounded-lg focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleQuickAddCard(stage.key)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickAddCard(stage.key)}
                            className="bg-accent text-white text-[11px] font-bold px-3 py-1 rounded-lg"
                          >
                            Add Card
                          </button>
                          <button
                            onClick={() => setAddingCardStage(null)}
                            className="text-ink/50 text-[11px] hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingCardStage(stage.key);
                          setQuickTitle("");
                        }}
                        className="w-full py-1.5 text-xs text-ink/60 hover:text-ink font-semibold rounded-lg hover:bg-paper transition flex items-center justify-center gap-1"
                      >
                        <span>+</span> Add a card
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          /* Custom Multi-Stage Columns */
          <>
            {customStages.map((stage) => {
              const stageCards = customCards.filter((c) => c.stage_id === stage.id);
              return (
                <div
                  key={stage.id}
                  className="bg-white border border-line rounded-2xl p-3 min-w-[270px] w-[280px] flex-shrink-0 flex flex-col shadow-xs"
                >
                  <div className="flex items-center justify-between px-1 mb-3 pb-2 border-b border-line/60">
                    <div className="flex items-center gap-2 flex-1 pr-2">
                      <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded">
                        #{stage.stage_order}
                      </span>
                      {editingStageKey === stage.id ? (
                        <input
                          type="text"
                          value={editingStageText}
                          onChange={(e) => setEditingStageText(e.target.value)}
                          onBlur={() => handleSaveStageLabel(stage.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveStageLabel(stage.id)}
                          className="text-xs font-bold text-ink border border-accent rounded px-1.5 py-0.5 focus:outline-none w-full"
                          autoFocus
                        />
                      ) : (
                        <p
                          onClick={() => {
                            setEditingStageKey(stage.id);
                            setEditingStageText(stage.stage_name);
                          }}
                          className="text-xs font-bold text-ink truncate cursor-pointer hover:text-accent"
                          title="Click to rename stage"
                        >
                          {stage.stage_name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-paper border border-line px-2 py-0.5 rounded-full font-semibold text-ink/70">
                      {stageCards.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {stageCards.map((card) => {
                      const summary = getChecklistSummary(card.checklist);
                      return (
                        <div
                          key={card.id}
                          onClick={() => setSelectedCard(card)}
                          className="bg-paper border border-line rounded-xl p-3 shadow-xs hover:border-accent/40 transition cursor-pointer group"
                        >
                          <p className="text-xs font-bold text-ink mb-1 group-hover:text-accent transition">
                            {card.card_title}
                          </p>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-accent">
                              {card.card_value ? `$${Number(card.card_value).toLocaleString()}` : "—"}
                            </p>
                            <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span>☑</span> {summary.completed}/{summary.total} ({summary.percent}%)
                            </span>
                          </div>

                          <select
                            onClick={(e) => e.stopPropagation()}
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
                      );
                    })}

                    {stageCards.length === 0 && (
                      <div className="text-[11px] text-ink/30 italic text-center py-8 border border-dashed border-line/60 rounded-xl">
                        Empty stage
                      </div>
                    )}
                  </div>

                  {/* In-Column "+ Add a card" Button */}
                  <div className="mt-3 pt-2 border-t border-line/60">
                    {addingCardStage === stage.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          placeholder="Enter card title..."
                          className="w-full text-xs px-2.5 py-1.5 border border-accent rounded-lg focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleQuickAddCard(stage.id)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickAddCard(stage.id)}
                            className="bg-accent text-white text-[11px] font-bold px-3 py-1 rounded-lg"
                          >
                            Add Card
                          </button>
                          <button
                            onClick={() => setAddingCardStage(null)}
                            className="text-ink/50 text-[11px] hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingCardStage(stage.id);
                          setQuickTitle("");
                        }}
                        className="w-full py-1.5 text-xs text-ink/60 hover:text-ink font-semibold rounded-lg hover:bg-paper transition flex items-center justify-center gap-1"
                      >
                        <span>+</span> Add a card
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Button Column at Far Right to Add New Stage/List */}
        <div className="min-w-[220px] w-[240px] flex-shrink-0">
          <button
            onClick={handleAddNewStageList}
            className="w-full py-3 bg-white border border-dashed border-line hover:border-accent hover:bg-accent/5 rounded-2xl text-xs font-bold text-ink/70 hover:text-accent transition shadow-xs flex items-center justify-center gap-2"
          >
            <span className="text-base">+</span> Add Another Stage / List
          </button>
        </div>
      </div>

      {/* Card Detail Modal */}
      {(selectedCard || selectedDeal) && (
        <PipelineCardModal
          card={selectedCard}
          deal={selectedDeal}
          clients={clients}
          users={users}
          onClose={() => {
            setSelectedCard(null);
            setSelectedDeal(null);
          }}
          onUpdate={() => {
            load();
            if (selectedPipelineId !== "default") {
              loadCustomPipelineData(selectedPipelineId);
            }
          }}
        />
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
