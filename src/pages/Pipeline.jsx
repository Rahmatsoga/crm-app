import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import PipelineBuilder from "../components/PipelineBuilder";
import PipelineCardModal from "../components/PipelineCardModal";
import { triggerStageAutomation } from "../lib/twilioService";

const INITIAL_DEFAULT_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const DEFAULT_SAMPLE_DEALS = [
  {
    id: "deal-sample-new",
    title: "AI Voice Bot & Lead Intake Engine",
    stage: "new",
    value: 35000,
    responsibilities: [
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" }
    ],
    clients: { name: "Alex Rivera", company_name: "NexGen Healthcare" },
    checklist: [
      { id: 1, text: "Initial Requirements Gathered", completed: true },
      { id: 2, text: "Scope Document Created", completed: false },
    ],
  },
  {
    id: "deal-sample-2",
    title: "Multi-Channel Lead Triage Engine",
    stage: "contacted",
    value: 75000,
    responsibilities: [
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" }
    ],
    clients: { name: "Jessica Lee", company_name: "SaaSify Scale" },
    checklist: [
      { id: 1, text: "Requirements Gathered", completed: true },
      { id: 2, text: "API Architecture Designed", completed: true },
      { id: 3, text: "Integration Testing", completed: false },
    ],
  },
  {
    id: "deal-sample-1",
    title: "Voice AI Appointment Assistant",
    stage: "proposal",
    value: 50000,
    responsibilities: [
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" }
    ],
    clients: { name: "Sarah Johnson", company_name: "Apex Dental Group" },
    checklist: [
      { id: 1, text: "Script ready for Voiceover", completed: true },
      { id: 2, text: "Voiceover ready and approved", completed: true },
      { id: 3, text: "Milestone created / Payment entered", completed: false },
      { id: 4, text: "Video ready", completed: false },
    ],
  },
  {
    id: "deal-sample-3",
    title: "Enterprise Web Scraper & GHL Sync",
    stage: "negotiation",
    value: 60000,
    responsibilities: [
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" }
    ],
    clients: { name: "Mike Chen", company_name: "Vanguard Real Estate" },
    checklist: [
      { id: 1, text: "Data Schema Mapped", completed: true },
      { id: 2, text: "GHL OAuth Configured", completed: false },
    ],
  },
  {
    id: "deal-sample-won",
    title: "Custom CRM & WhatsApp Automation",
    stage: "won",
    value: 120000,
    responsibilities: [
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" },
      { role: "Thumbnail", person: "Maaz" }
    ],
    clients: { name: "David Vance", company_name: "Elevatech Enterprise" },
    checklist: [
      { id: 1, text: "Contract Signed", completed: true },
      { id: 2, text: "Deposit Received", completed: true },
      { id: 3, text: "System Deployed & Live", completed: true },
    ],
  },
  {
    id: "deal-sample-lost",
    title: "Legacy Database Migration",
    stage: "lost",
    value: 25000,
    responsibilities: [
      { role: "Script", person: "Rahmat" }
    ],
    clients: { name: "Robert Taylor", company_name: "OldTech Solutions" },
    checklist: [
      { id: 1, text: "Budget Exceeded", completed: false },
    ],
  },
];

export default function Pipeline() {
  const [deals, setDeals] = useState(DEFAULT_SAMPLE_DEALS);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [customPipelines, setCustomPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("default");
  
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAddDealForm, setShowAddDealForm] = useState(false);

  // In-column Card Adding
  const [addingCardStage, setAddingCardStage] = useState(null); // stage key or stage id
  const [quickTitle, setQuickTitle] = useState("");
  const [quickValue, setQuickValue] = useState("");
  const [quickTargetStage, setQuickTargetStage] = useState("");
  const [quickResponsibilities, setQuickResponsibilities] = useState([
    { role: "Script", person: "Rahmat" },
    { role: "Voice Over", person: "Maaz" },
  ]);

  function handleAddQuickResp() {
    setQuickResponsibilities((prev) => [...prev, { role: "", person: "" }]);
  }

  function handleUpdateQuickResp(index, field, value) {
    setQuickResponsibilities((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleRemoveQuickResp(index) {
    setQuickResponsibilities((prev) => prev.filter((_, i) => i !== index));
  }

  // Far-right New Stage List Inline Form
  const [showAddStageInput, setShowAddStageInput] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  const [form, setForm] = useState({ client_id: "", title: "", value: "" });
  const [error, setError] = useState("");

  // Card Modal state
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Dynamic stage lists & custom cards
  const [defaultStageList, setDefaultStageList] = useState(INITIAL_DEFAULT_STAGES);
  const [customStages, setCustomStages] = useState([]);
  const [customCards, setCustomCards] = useState([]);

  // Editable stage names
  const [editingStageKey, setEditingStageKey] = useState(null);
  const [editingStageText, setEditingStageText] = useState("");

  async function load() {
    try {
      const [d, c, u] = await Promise.all([
        supabase
          .from("deals")
          .select("*, clients(name, company_name)")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name, company_name").order("name"),
        supabase.from("users").select("id, name, email, role").order("name"),
      ]);

      if (d.data && d.data.length > 0) {
        setDeals(d.data);
      } else {
        setDeals(DEFAULT_SAMPLE_DEALS);
      }

      setClients(c.data ?? []);
      setUsers(u.data ?? []);

      // Fetch Custom Pipelines
      const { data: pipelinesData, error: pError } = await supabase
        .from("custom_pipelines")
        .select("*, pipeline_stages(*)")
        .order("created_at", { ascending: false });

      if (!pError && pipelinesData) {
        setCustomPipelines(pipelinesData);
      }
    } catch (e) {
      console.warn("Pipeline load warning:", e);
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
          // Dynamic sample cards if empty
          const generatedSampleCards = [
            {
              id: `sample-card-1-${pipelineId}`,
              stage_id: loadedStages[0]?.id,
              card_title: "Voice AI Appointment Assistant",
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
              id: `sample-card-2-${pipelineId}`,
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
              id: `sample-card-3-${pipelineId}`,
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

  // Handle Quick Add Card inside Stage Column
  async function handleQuickAddCard(stageKeyOrId) {
    if (!quickTitle.trim()) return;

    const val = Number(quickValue) || 0;
    const titleText = quickTitle.trim();
    const targetStage = quickTargetStage || stageKeyOrId;

    const filteredResp = quickResponsibilities.filter(
      (r) => r.role.trim() || r.person.trim()
    );
    const respArray =
      filteredResp.length > 0
        ? filteredResp
        : [
            { role: "Script", person: "Rahmat" },
            { role: "Voice Over", person: "Maaz" },
          ];

    if (selectedPipelineId === "default") {
      const newDealObj = {
        id: `deal-${Date.now()}`,
        title: titleText,
        stage: targetStage,
        value: val,
        responsibilities: respArray,
        clients: { name: clients[0]?.name || "Elevatech Client", company_name: clients[0]?.company_name || "Elevatech" },
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
      };

      setDeals((prev) => [newDealObj, ...prev]);

      try {
        const clientId = clients[0]?.id || null;
        await supabase.from("deals").insert([
          {
            title: titleText,
            stage: targetStage,
            client_id: clientId,
            value: val,
          },
        ]);
      } catch (e) {
        console.warn("Deal insert error:", e);
      }
    } else {
      const newCardObj = {
        id: `card-${Date.now()}`,
        stage_id: targetStage,
        card_title: titleText,
        card_value: val,
        responsibilities: respArray,
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
      };

      setCustomCards((prev) => [...prev, newCardObj]);

      try {
        await supabase.from("pipeline_cards").insert([
          {
            stage_id: targetStage,
            card_title: titleText,
            card_value: val,
          },
        ]);
      } catch (e) {
        console.warn("Card insert error:", e);
      }
    }

    setQuickTitle("");
    setQuickValue("");
    setAddingCardStage(null);
    setQuickTargetStage("");
    setQuickResponsibilities([
      { role: "Script", person: "Rahmat" },
      { role: "Voice Over", person: "Maaz" },
    ]);
  }

  // Handle Add Stage / List Column at Far Right
  async function handleAddStageListSubmit(e) {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const nameText = newStageName.trim();
    const stageKey = nameText.toLowerCase().replace(/\s+/g, "_");

    if (selectedPipelineId === "default") {
      // 1. Instant local stage addition
      const newStageObj = { key: stageKey, label: nameText };
      setDefaultStageList((prev) => [...prev, newStageObj]);
    } else {
      const nextOrder = customStages.length + 1;
      const newCustomStageObj = {
        id: `stage-${Date.now()}`,
        pipeline_id: selectedPipelineId,
        stage_name: nameText,
        stage_order: nextOrder,
      };

      // 1. Instant local stage addition
      setCustomStages((prev) => [...prev, newCustomStageObj]);

      // 2. Supabase insert
      try {
        await supabase.from("pipeline_stages").insert([
          {
            pipeline_id: selectedPipelineId,
            stage_name: nameText,
            stage_order: nextOrder,
          },
        ]);
      } catch (e) {
        console.warn("Stage insert error:", e);
      }
    }

    setNewStageName("");
    setShowAddStageInput(false);
  }

  // Save Dynamic Stage Header Rename
  async function handleSaveStageLabel(stageIdOrKey) {
    if (!editingStageText.trim()) {
      setEditingStageKey(null);
      return;
    }
    const updatedName = editingStageText.trim();

    if (selectedPipelineId === "default") {
      setDefaultStageList((prev) =>
        prev.map((s) => (s.key === stageIdOrKey ? { ...s, label: updatedName } : s))
      );
    } else {
      setCustomStages((prev) =>
        prev.map((s) => (s.id === stageIdOrKey ? { ...s, stage_name: updatedName } : s))
      );
      try {
        await supabase
          .from("pipeline_stages")
          .update({ stage_name: updatedName })
          .eq("id", stageIdOrKey);
      } catch (e) {
        console.warn("Stage rename error:", e);
      }
    }
    setEditingStageKey(null);
  }

  // Delete Custom Pipeline
  async function handleDeletePipeline(pipelineId) {
    if (!window.confirm("Are you sure you want to delete this custom pipeline?")) return;
    try {
      await supabase.from("custom_pipelines").delete().eq("id", pipelineId);
      setCustomPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
      if (selectedPipelineId === pipelineId) {
        setSelectedPipelineId("default");
      }
    } catch (err) {
      console.error("Delete pipeline error:", err);
      setCustomPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
      if (selectedPipelineId === pipelineId) {
        setSelectedPipelineId("default");
      }
    }
  }

  // Twilio Workflow Banner Notification
  const [twilioBanner, setTwilioBanner] = useState("");

  async function moveStage(dealId, stage) {
    const targetStageObj = defaultStageList.find((s) => s.key === stage);
    const targetStageLabel = targetStageObj ? targetStageObj.label : stage;
    const targetDeal = deals.find((d) => d.id === dealId);

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: stage } : d))
    );

    // Trigger Automated Twilio SMS/WhatsApp
    if (targetDeal) {
      triggerStageAutomation({
        stageName: targetStageLabel,
        cardTitle: targetDeal.title,
        dealId: targetDeal.id,
        recipientPhone: targetDeal.clients?.phone || "+15550001111",
      });
      setTwilioBanner(`🚀 Twilio Workflow: Triggered automated SMS/WhatsApp for "${targetDeal.title}" on transition to "${targetStageLabel}"`);
      setTimeout(() => setTwilioBanner(""), 5000);
    }

    try {
      await supabase.from("deals").update({ stage }).eq("id", dealId);
    } catch (e) {
      console.warn("Move deal error:", e);
    }
  }

  async function moveCustomCardStage(cardId, newStageId) {
    const targetStageObj = customStages.find((s) => s.id === newStageId);
    const targetStageLabel = targetStageObj ? targetStageObj.stage_name : newStageId;
    const targetCard = customCards.find((c) => c.id === cardId);

    setCustomCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, stage_id: newStageId } : c))
    );

    // Trigger Automated Twilio SMS/WhatsApp
    if (targetCard) {
      triggerStageAutomation({
        stageName: targetStageLabel,
        cardTitle: targetCard.card_title,
        cardId: targetCard.id,
        recipientPhone: targetCard.client_phone || "+15550001111",
      });
      setTwilioBanner(`🚀 Twilio Workflow: Triggered automated SMS/WhatsApp for "${targetCard.card_title}" on transition to "${targetStageLabel}"`);
      setTimeout(() => setTwilioBanner(""), 5000);
    }

    try {
      await supabase.from("pipeline_cards").update({ stage_id: newStageId }).eq("id", cardId);
    } catch (e) {
      console.warn("Move card error:", e);
    }
  }

  // Calculate Checklist Summary Badge
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Sales Pipeline & Workflows</h1>
          <p className="text-xs text-ink/50 mt-0.5">
            {selectedPipelineId === "default"
              ? `${deals.length} deals in main pipeline`
              : `${activePipelineObj?.pipeline_name || "Custom Pipeline"} (${customStages.length} stages)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Clean Inline Pipeline Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-line rounded-xl p-1 shadow-2xs">
            <span className="text-[10px] font-bold text-ink/50 uppercase px-2">Pipeline:</span>
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="text-xs px-3 py-1.5 bg-paper hover:bg-slate-100 border border-line/60 rounded-lg text-ink font-bold focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value="default">📊 Main Sales Pipeline ({deals.length} deals)</option>
              {customPipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  ⚡ {p.pipeline_name} ({p.pipeline_stages?.length || 0} stages)
                </option>
              ))}
            </select>

            {selectedPipelineId !== "default" && (
              <button
                type="button"
                onClick={() => handleDeletePipeline(selectedPipelineId)}
                className="text-ink/40 hover:text-red-600 text-xs px-2 py-1 transition font-bold cursor-pointer"
                title="Delete current pipeline"
              >
                🗑️
              </button>
            )}
          </div>

          <button
            onClick={() => setShowBuilder(true)}
            className="bg-accent text-white text-xs font-semibold rounded-xl px-4 py-2.5 hover:opacity-90 shadow-sm transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>+</span> Add New Pipeline
          </button>
        </div>
      </div>

      {twilioBanner && (
        <div className="mb-6 p-3 bg-emerald-500 text-white font-semibold rounded-2xl text-xs flex items-center justify-between shadow-md animate-bounce">
          <span>{twilioBanner}</span>
          <button onClick={() => setTwilioBanner("")} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Main Board View: Horizontal Scrollable Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar min-h-[450px]">
        {selectedPipelineId === "default" ? (
          /* Default Pipeline Columns */
          <>
            {defaultStageList.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.key);
              return (
                <div
                  key={stage.key}
                  className="bg-white border border-line rounded-2xl p-3 min-w-[220px] max-w-[260px] flex-1 flex-shrink-0 flex flex-col shadow-xs"
                >
                  {/* Editable Stage Header */}
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
                          setEditingStageText(stage.label);
                        }}
                        className="text-xs font-bold text-ink uppercase tracking-wider cursor-pointer hover:text-accent"
                        title="Click to rename stage"
                      >
                        {stage.label}
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
                          className="bg-paper hover:bg-white border border-line hover:border-accent/50 rounded-xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2"
                        >
                          <p className="text-xs font-bold text-ink group-hover:text-accent transition leading-snug">
                            {d.title}
                          </p>
                          <p className="text-[11px] font-medium text-ink/60">
                            {d.clients?.company_name || d.clients?.name || "Elevatech Client"}
                          </p>

                          {/* Responsibilities Tags (Dynamic Trello Card Style) */}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {Array.isArray(d.responsibilities) ? (
                              d.responsibilities.map((resp, i) => (
                                <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {resp.role}: {resp.person}
                                </span>
                              ))
                            ) : typeof d.responsibilities === "object" && d.responsibilities !== null ? (
                              Object.entries(d.responsibilities).map(([role, person], i) => (
                                <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium capitalize">
                                  {role}: {person}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Script: Rahmat</span>
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Voice: Maaz</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-line/60">
                            <p className="text-xs font-bold text-accent">
                              {d.value ? `$${Number(d.value).toLocaleString()}` : "$0"}
                            </p>

                            <div className="flex items-center gap-1.5">
                              {/* Quick Move Next Stage Button on Kanban Card */}
                              {(() => {
                                const currentIdx = defaultStageList.findIndex((s) => s.key === stage.key);
                                const nextStage = currentIdx >= 0 && currentIdx < defaultStageList.length - 1 ? defaultStageList[currentIdx + 1] : null;
                                return nextStage ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveStage(d.id, nextStage.key);
                                    }}
                                    className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                    title={`Advance to ${nextStage.label}`}
                                  >
                                    <span>➡️ {nextStage.label}</span>
                                  </button>
                                ) : null;
                              })()}

                              {/* Checklist Summary Badge */}
                              <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <span>☑</span> {summary.completed}/{summary.total} ({summary.percent}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageDeals.length === 0 && (
                      <div className="text-[11px] text-ink/30 italic text-center py-8 border border-dashed border-line/60 rounded-xl">
                        Empty stage
                      </div>
                    )}
                  </div>

                  {/* In-Column "+ Add a card" Button & Dynamic Form */}
                  <div className="mt-3 pt-2 border-t border-line/60">
                    {addingCardStage === stage.key ? (
                      <div className="space-y-2 bg-paper p-2.5 rounded-xl border border-accent/40 shadow-xs">
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Target Stage</label>
                          <select
                            value={quickTargetStage || stage.key}
                            onChange={(e) => setQuickTargetStage(e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-line rounded-lg bg-white font-semibold focus:outline-none"
                          >
                            {defaultStageList.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Card Title</label>
                          <input
                            type="text"
                            value={quickTitle}
                            onChange={(e) => setQuickTitle(e.target.value)}
                            placeholder="e.g. 070 Sea Disasters"
                            className="w-full text-xs px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleQuickAddCard(stage.key)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Value ($)</label>
                          <input
                            type="number"
                            value={quickValue}
                            onChange={(e) => setQuickValue(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full text-xs px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        {/* Dynamic Team Responsibilities */}
                        <div className="space-y-1.5 pt-1 border-t border-line/60">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-ink/60 uppercase block">Team Leads / Roles</label>
                            <button
                              type="button"
                              onClick={handleAddQuickResp}
                              className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                            >
                              + Add Role
                            </button>
                          </div>
                          {quickResponsibilities.map((resp, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <input
                                type="text"
                                value={resp.role}
                                onChange={(e) => handleUpdateQuickResp(idx, "role", e.target.value)}
                                placeholder="Role (e.g. Script)"
                                className="w-1/2 text-[10px] px-1.5 py-1 border border-line rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                              <input
                                type="text"
                                value={resp.person}
                                onChange={(e) => handleUpdateQuickResp(idx, "person", e.target.value)}
                                placeholder="Person (e.g. Rahmat)"
                                className="w-1/2 text-[10px] px-1.5 py-1 border border-line rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveQuickResp(idx)}
                                className="text-ink/40 hover:text-red-500 text-xs px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-line/60">
                          <button
                            onClick={() => handleQuickAddCard(stage.key)}
                            className="bg-accent text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition flex-1 shadow-2xs cursor-pointer"
                          >
                            Add Card
                          </button>
                          <button
                            onClick={() => setAddingCardStage(null)}
                            className="text-ink/60 text-[11px] hover:text-ink px-2 py-1 cursor-pointer"
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
                          setQuickValue("");
                        }}
                        className="w-full py-1.5 text-xs text-ink/70 hover:text-ink font-semibold rounded-lg hover:bg-paper transition flex items-center justify-center gap-1"
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
                  className="bg-white border border-line rounded-2xl p-3 min-w-[220px] max-w-[260px] flex-1 flex-shrink-0 flex flex-col shadow-xs"
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
                          className="bg-paper hover:bg-white border border-line hover:border-accent/50 rounded-xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-2"
                        >
                          <p className="text-xs font-bold text-ink group-hover:text-accent transition leading-snug">
                            {card.card_title}
                          </p>
                          
                          {/* Responsibilities Tags (Dynamic Trello Card Style) */}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {Array.isArray(card.responsibilities) ? (
                              card.responsibilities.map((resp, i) => (
                                <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {resp.role}: {resp.person}
                                </span>
                              ))
                            ) : typeof card.responsibilities === "object" && card.responsibilities !== null ? (
                              Object.entries(card.responsibilities).map(([role, person], i) => (
                                <span key={i} className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium capitalize">
                                  {role}: {person}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Script: Rahmat</span>
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">Voice: Maaz</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-line/60">
                            <p className="text-xs font-bold text-accent">
                              {card.card_value ? `$${Number(card.card_value).toLocaleString()}` : "$0"}
                            </p>

                            <div className="flex items-center gap-1.5">
                              {/* Quick Move Next Stage Button on Custom Card */}
                              {(() => {
                                const currentIdx = customStages.findIndex((s) => s.id === stage.id);
                                const nextStage = currentIdx >= 0 && currentIdx < customStages.length - 1 ? customStages[currentIdx + 1] : null;
                                return nextStage ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveCustomCardStage(card.id, nextStage.id);
                                    }}
                                    className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                                    title={`Advance to ${nextStage.stage_name}`}
                                  >
                                    <span>➡️ {nextStage.stage_name}</span>
                                  </button>
                                ) : null;
                              })()}

                              <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <span>☑</span> {summary.completed}/{summary.total} ({summary.percent}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {stageCards.length === 0 && (
                      <div className="text-[11px] text-ink/30 italic text-center py-8 border border-dashed border-line/60 rounded-xl">
                        Empty stage
                      </div>
                    )}
                  </div>

                  {/* In-Column "+ Add a card" Button & Dynamic Form */}
                  <div className="mt-3 pt-2 border-t border-line/60">
                    {addingCardStage === stage.id ? (
                      <div className="space-y-2 bg-paper p-2.5 rounded-xl border border-accent/40 shadow-xs">
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Target Stage</label>
                          <select
                            value={quickTargetStage || stage.id}
                            onChange={(e) => setQuickTargetStage(e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-line rounded-lg bg-white font-semibold focus:outline-none"
                          >
                            {customStages.map((s) => (
                              <option key={s.id} value={s.id}>
                                #{s.stage_order} {s.stage_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Card Title</label>
                          <input
                            type="text"
                            value={quickTitle}
                            onChange={(e) => setQuickTitle(e.target.value)}
                            placeholder="e.g. 070 Sea Disasters"
                            className="w-full text-xs px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleQuickAddCard(stage.id)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-ink/60 uppercase block mb-1">Value ($)</label>
                          <input
                            type="number"
                            value={quickValue}
                            onChange={(e) => setQuickValue(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full text-xs px-2.5 py-1.5 border border-line rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>

                        {/* Dynamic Team Responsibilities */}
                        <div className="space-y-1.5 pt-1 border-t border-line/60">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-ink/60 uppercase block">Team Leads / Roles</label>
                            <button
                              type="button"
                              onClick={handleAddQuickResp}
                              className="text-[10px] font-bold text-accent hover:underline cursor-pointer"
                            >
                              + Add Role
                            </button>
                          </div>
                          {quickResponsibilities.map((resp, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <input
                                type="text"
                                value={resp.role}
                                onChange={(e) => handleUpdateQuickResp(idx, "role", e.target.value)}
                                placeholder="Role (e.g. Script)"
                                className="w-1/2 text-[10px] px-1.5 py-1 border border-line rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                              <input
                                type="text"
                                value={resp.person}
                                onChange={(e) => handleUpdateQuickResp(idx, "person", e.target.value)}
                                placeholder="Person (e.g. Rahmat)"
                                className="w-1/2 text-[10px] px-1.5 py-1 border border-line rounded bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveQuickResp(idx)}
                                className="text-ink/40 hover:text-red-500 text-xs px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-line/60">
                          <button
                            onClick={() => handleQuickAddCard(stage.id)}
                            className="bg-accent text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition flex-1 shadow-2xs cursor-pointer"
                          >
                            Add Card
                          </button>
                          <button
                            onClick={() => setAddingCardStage(null)}
                            className="text-ink/60 text-[11px] hover:text-ink px-2 py-1 cursor-pointer"
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
                          setQuickValue("");
                        }}
                        className="w-full py-1.5 text-xs text-ink/70 hover:text-ink font-semibold rounded-lg hover:bg-paper transition flex items-center justify-center gap-1"
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

        {/* Far-Right Column: Add Another Stage / List Form */}
        <div className="min-w-[240px] w-[260px] flex-shrink-0">
          {showAddStageInput ? (
            <form
              onSubmit={handleAddStageListSubmit}
              className="bg-white border border-accent/60 rounded-2xl p-3 shadow-md space-y-2.5"
            >
              <label className="block text-xs font-bold text-ink">New Stage List Title</label>
              <input
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g. Quality Assurance, Review"
                className="w-full text-xs px-3 py-2 border border-line rounded-xl focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="bg-accent text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition flex-1"
                >
                  Add List
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStageInput(false)}
                  className="border border-line text-ink/70 text-xs px-3 py-2 rounded-xl hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setShowAddStageInput(true);
                setNewStageName("");
              }}
              className="w-full py-3.5 bg-white border border-dashed border-line hover:border-accent hover:bg-accent/5 rounded-2xl text-xs font-bold text-ink/70 hover:text-accent transition shadow-xs flex items-center justify-center gap-2"
            >
              <span className="text-base font-bold">+</span> Add Another Stage / List
            </button>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      {(selectedCard || selectedDeal) && (
        <PipelineCardModal
          card={selectedCard}
          deal={selectedDeal}
          clients={clients}
          users={users}
          stages={selectedPipelineId === "default" ? defaultStageList : customStages}
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
          onCreated={async (newPipeline) => {
            await load();
            if (newPipeline && newPipeline.id) {
              setSelectedPipelineId(newPipeline.id);
            }
            setShowBuilder(false);
          }}
        />
      )}
    </div>
  );
}
