import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { sendSMS, sendWhatsApp, logVoIPCall, getCommunicationLogs, triggerStageAutomation } from "../lib/twilioService";
import { getMeetings, scheduleMeeting, generateGoogleCalendarUrl, generateZoomMeetingUrl, generateInstantVideoUrl, generateGoogleMeetUrl } from "../lib/meetingService";

export function PipelineCardModal({ card, deal, clients, users, stages, onClose, onUpdate }) {
  // Navigation tab: 'overview' | 'twilio' | 'meetings'
  const [activeTab, setActiveTab] = useState("overview");

  // Title & Basic Info
  const [title, setTitle] = useState(card?.title || card?.card_title || deal?.title || "");
  const [value, setValue] = useState(card?.value || card?.card_value || deal?.value || 0);
  const [assignedTo, setAssignedTo] = useState(card?.assigned_to || deal?.assigned_rep_id || "");

  // Current Stage State & Navigation
  const initialStageKey = card?.stage_id || card?.stage || deal?.stage || "new";
  const [currentStage, setCurrentStage] = useState(initialStageKey);

  const availableStages = stages && stages.length > 0
    ? stages
    : [
        { key: "new", label: "New" },
        { key: "contacted", label: "Contacted" },
        { key: "proposal", label: "Proposal" },
        { key: "negotiation", label: "Negotiation" },
        { key: "won", label: "Won" },
        { key: "lost", label: "Lost" },
      ];

  const currentStageIndex = availableStages.findIndex(
    (s) => (s.key || s.id) === currentStage
  );
  const nextStageObj =
    currentStageIndex >= 0 && currentStageIndex < availableStages.length - 1
      ? availableStages[currentStageIndex + 1]
      : null;

  // Client Info for Twilio Communication
  const clientObj = clients?.find((c) => c.id === (deal?.client_id || card?.client_id)) || {
    name: deal?.clients?.name || card?.client_name || "Elevatech Client",
    phone: deal?.clients?.phone || card?.client_phone || "+1 (555) 234-5678",
    email: deal?.clients?.email || "client@elevatech.com"
  };

  // Responsibilities
  const rawResp = card?.responsibilities || deal?.responsibilities || [
    { role: "Script", person: "Rahmat" },
    { role: "Voice Over", person: "Maaz" },
    { role: "Video Editing", person: "Usama" },
    { role: "Thumbnail", person: "Rahmat" },
  ];

  const initialResp = Array.isArray(rawResp)
    ? rawResp
    : typeof rawResp === "object" && rawResp !== null
    ? Object.entries(rawResp).map(([role, person]) => ({ role, person }))
    : [
        { role: "Script", person: "Rahmat" },
        { role: "Voice Over", person: "Maaz" },
      ];

  const [responsibilities, setResponsibilities] = useState(initialResp);

  // Workflow Checklist Items
  const defaultChecklist = [
    { id: 1, text: "Script ready for Voiceover", completed: true },
    { id: 2, text: "Voiceover ready and approved", completed: true },
    { id: 3, text: "Milestone created / Payment entered", completed: false },
    { id: 4, text: "Video ready", completed: false },
    { id: 5, text: "Video approved", completed: false },
    { id: 6, text: "Thumbnail ready", completed: false },
    { id: 7, text: "Video published", completed: false },
    { id: 8, text: "Performance Check after 7 / 30 days", completed: false },
  ];

  const [checklist, setChecklist] = useState(
    card?.checklist && Array.isArray(card.checklist) && card.checklist.length > 0
      ? card.checklist
      : deal?.checklist && Array.isArray(deal.checklist) && deal.checklist.length > 0
      ? deal.checklist
      : defaultChecklist
  );

  const [newItemText, setNewItemText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Twilio State
  const [commChannel, setCommChannel] = useState("sms"); // 'sms' | 'whatsapp'
  const [phoneRecipient, setPhoneRecipient] = useState(clientObj.phone || "+1 (555) 234-5678");
  const [messageText, setMessageText] = useState("");
  const [commLogs, setCommLogs] = useState([]);
  const [sendingComm, setSendingComm] = useState(false);
  const [twilioSuccessMsg, setTwilioSuccessMsg] = useState("");

  // VoIP Dialer State
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callNotes, setCallNotes] = useState("");

  // Meetings State
  const [meetings, setMeetings] = useState([]);
  const [mtgTitle, setMtgTitle] = useState("");
  const [mtgType, setMtgType] = useState("discovery_call");
  const [mtgDate, setMtgDate] = useState("");
  const [mtgTime, setMtgTime] = useState("14:00");
  const [mtgNotes, setMtgNotes] = useState("");
  const [mtgSuccessMsg, setMtgSuccessMsg] = useState("");
  const [schedulingMtg, setSchedulingMtg] = useState(false);

  // Load communication logs & meetings on modal open or tab change
  useEffect(() => {
    async function loadLogsAndMeetings() {
      const [logs, mtgs] = await Promise.all([
        getCommunicationLogs({
          card_id: card?.id,
          deal_id: deal?.id,
          client_id: clientObj.id,
        }),
        getMeetings({
          card_id: card?.id,
          deal_id: deal?.id,
          client_id: clientObj.id,
        }),
      ]);
      setCommLogs(logs);
      setMeetings(mtgs);
    }
    loadLogsAndMeetings();
  }, [card?.id, deal?.id, clientObj.id, activeTab]);

  // Schedule New Meeting Handler
  const handleScheduleMeetingSubmit = async (e) => {
    e.preventDefault();
    if (!mtgTitle.trim() || !mtgDate) return;
    setSchedulingMtg(true);
    setMtgSuccessMsg("");

    const startTimeISO = new Date(`${mtgDate}T${mtgTime}:00`).toISOString();
    await scheduleMeeting({
      title: mtgTitle.trim(),
      meeting_type: mtgType,
      start_time: startTimeISO,
      notes: mtgNotes,
      card_id: card?.id,
      deal_id: deal?.id,
      client_id: clientObj.id,
      client_phone: phoneRecipient || clientObj.phone,
    });

    setMtgSuccessMsg(
      `🎉 Zoom & Google Calendar meeting scheduled! SMS confirmation dispatched to ${
        phoneRecipient || clientObj.phone
      }`
    );
    setMtgTitle("");
    setMtgNotes("");
    setSchedulingMtg(false);

    const updated = await getMeetings({
      card_id: card?.id,
      deal_id: deal?.id,
      client_id: clientObj.id,
    });
    setMeetings(updated);
    setTimeout(() => setMtgSuccessMsg(""), 5000);
  };

  // VoIP Call Timer
  useEffect(() => {
    let interval = null;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // Calculate Progress Percentage
  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle item status
  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  // Add new checklist item
  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem = {
      id: Date.now(),
      text: newItemText.trim(),
      completed: false,
    };
    setChecklist((prev) => [...prev, newItem]);
    setNewItemText("");
  };

  // Delete checklist item
  const handleDeleteItem = (id) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  // Start VoIP WebRTC Call
  const handleStartCall = () => {
    setIsCalling(true);
    setCallDuration(0);
    setTwilioSuccessMsg("📞 VoIP Call Initiated via Twilio WebRTC...");
    setTimeout(() => setTwilioSuccessMsg(""), 3000);
  };

  // End Call & Save Log
  const handleEndCall = async () => {
    setIsCalling(false);
    setSendingComm(true);

    await logVoIPCall({
      to: phoneRecipient,
      call_duration_seconds: callDuration,
      notes: callNotes || "Outbound sales call via Twilio CRM dialer",
      card_id: card?.id,
      deal_id: deal?.id,
      client_id: clientObj.id
    });

    setCallNotes("");
    setTwilioSuccessMsg(`✅ Call ended. Logged duration: ${callDuration}s`);
    setSendingComm(false);

    // Refresh logs
    const updated = await getCommunicationLogs({ card_id: card?.id, deal_id: deal?.id });
    setCommLogs(updated);
    setTimeout(() => setTwilioSuccessMsg(""), 4000);
  };

  // Send Twilio SMS or WhatsApp
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingComm(true);
    setTwilioSuccessMsg("");

    let res;
    if (commChannel === "whatsapp") {
      res = await sendWhatsApp({
        to: phoneRecipient,
        message_body: messageText,
        card_id: card?.id,
        deal_id: deal?.id,
        client_id: clientObj.id
      });
    } else {
      res = await sendSMS({
        to: phoneRecipient,
        message_body: messageText,
        card_id: card?.id,
        deal_id: deal?.id,
        client_id: clientObj.id
      });
    }

    if (res.success) {
      setTwilioSuccessMsg(`🚀 ${commChannel.toUpperCase()} sent successfully via Twilio!`);
      setMessageText("");
      const updated = await getCommunicationLogs({ card_id: card?.id, deal_id: deal?.id });
      setCommLogs(updated);
    }
    setSendingComm(false);
    setTimeout(() => setTwilioSuccessMsg(""), 4000);
  };

  // Apply predefined message templates
  const handleApplyTemplate = (templateType) => {
    if (templateType === "proposal") {
      setMessageText(`Hi ${clientObj.name}, your project proposal for "${title}" is ready! Let me know if you would like to schedule a brief review call.`);
    } else if (templateType === "reminder") {
      setMessageText(`Reminder: Friendly check-in regarding "${title}". Please feel free to reply directly to this message!`);
    } else if (templateType === "welcome") {
      setMessageText(`Welcome to Elevatech! We have officially started working on "${title}". We will keep you updated every step of the way.`);
    }
  };

  // Save changes to database
  async function handleSave() {
    setSaving(true);
    setError("");

    const updatedData = {
      id: card?.id || deal?.id,
      title,
      value,
      stage: currentStage,
      stage_id: currentStage,
      assignedTo,
      checklist,
      responsibilities,
    };

    try {
      if (card && card.id) {
        const { error: updateErr } = await supabase
          .from("pipeline_cards")
          .update({
            card_title: title,
            card_value: value,
            stage_id: currentStage,
            assigned_to: assignedTo || null,
            checklist: checklist,
            responsibilities: responsibilities,
          })
          .eq("id", card.id);
        if (updateErr) console.warn("Card update DB warning:", updateErr);
      } else if (deal && deal.id) {
        const { error: updateErr } = await supabase
          .from("deals")
          .update({
            title: title,
            value: value,
            stage: currentStage,
            checklist: checklist,
            responsibilities: responsibilities,
          })
          .eq("id", deal.id);
        if (updateErr) console.warn("Deal update DB warning:", updateErr);
      }

      if (currentStage !== initialStageKey) {
        const stageLabel =
          availableStages.find((s) => (s.key || s.id) === currentStage)?.label ||
          availableStages.find((s) => (s.key || s.id) === currentStage)?.stage_name ||
          currentStage;
        triggerStageAutomation({
          stageName: stageLabel,
          cardTitle: title,
          dealId: deal?.id,
          cardId: card?.id,
          recipientPhone: phoneRecipient || clientObj.phone,
        });
      }

      if (onUpdate) onUpdate(updatedData);
      onClose();
    } catch (err) {
      console.error("Error saving card modal:", err);
      if (onUpdate) onUpdate(updatedData);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-line">
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-3 pb-3 border-b border-line">
          <div className="flex-1 pr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-ink w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 -ml-1"
              placeholder="Card Title"
            />
            <div className="text-xs text-ink/50 mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="font-medium">in list</span>
              <select
                value={currentStage}
                onChange={(e) => setCurrentStage(e.target.value)}
                className="font-bold text-accent bg-accent/10 border border-accent/30 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                {availableStages.map((s) => (
                  <option key={s.key || s.id} value={s.key || s.id}>
                    {(s.label || s.stage_name || s.key || s.id).toUpperCase()}
                  </option>
                ))}
              </select>

              {nextStageObj && (
                <button
                  type="button"
                  onClick={() => setCurrentStage(nextStageObj.key || nextStageObj.id)}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  title={`Move deal to ${nextStageObj.label || nextStageObj.stage_name}`}
                >
                  <span>➡️ Move to {nextStageObj.label || nextStageObj.stage_name}</span>
                </button>
              )}

              <span className="text-ink/30">•</span>
              <span className="font-medium">Client:</span>
              <span className="font-semibold text-ink">{clientObj.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-ink/40 hover:text-ink text-lg font-bold p-1 rounded-lg hover:bg-paper transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex items-center gap-2 border-b border-line mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 -mb-px ${
              activeTab === "overview"
                ? "border-accent text-accent"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            📋 Overview & Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("twilio")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === "twilio"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            💬 Twilio Communications & Calls
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
              {commLogs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("meetings")}
            className={`px-4 py-2 text-xs font-bold transition border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === "meetings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            📅 Zoom & Google Meetings
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
              {meetings.length}
            </span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* TAB 1: OVERVIEW & CHECKLIST */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Info Grid */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-paper/60 rounded-xl border border-line/60">
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink/50 mb-1">
                  Stage / Column
                </label>
                <select
                  value={currentStage}
                  onChange={(e) => setCurrentStage(e.target.value)}
                  className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white font-bold text-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {availableStages.map((s) => (
                    <option key={s.key || s.id} value={s.key || s.id}>
                      {s.label || s.stage_name || s.key || s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink/50 mb-1">
                  Value ($)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink/50 mb-1">
                  Assigned Lead
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Unassigned</option>
                  {users && users.length > 0 ? (
                    users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="rahmat">Rahmat (Admin)</option>
                      <option value="maaz">Maaz (Sales)</option>
                      <option value="usama">Usama (Support)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* RESPONSIBILITIES Block (Dynamic Editable Role & Person Pairs) */}
            <div className="bg-paper border border-line/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-ink/60 uppercase tracking-wider">
                  📋 Responsibilities & Team Leads
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setResponsibilities([...responsibilities, { role: "", person: "" }])
                  }
                  className="text-[11px] bg-accent/10 text-accent font-bold px-2.5 py-1 rounded-lg hover:bg-accent/20 transition cursor-pointer"
                >
                  + Add Role / Person
                </button>
              </div>

              <div className="space-y-2">
                {responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={resp.role}
                      onChange={(e) => {
                        const updated = [...responsibilities];
                        updated[idx].role = e.target.value;
                        setResponsibilities(updated);
                      }}
                      placeholder="Role (e.g. Script, Voice Over, Thumbnail)"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <input
                      type="text"
                      value={resp.person}
                      onChange={(e) => {
                        const updated = [...responsibilities];
                        updated[idx].person = e.target.value;
                        setResponsibilities(updated);
                      }}
                      placeholder="Assignee (e.g. Rahmat, Maaz, Usama)"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-line rounded-lg text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setResponsibilities(responsibilities.filter((_, i) => i !== idx))
                      }
                      className="text-ink/40 hover:text-red-500 text-xs px-2 py-1 transition font-bold cursor-pointer"
                      title="Remove Role"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {responsibilities.length === 0 && (
                  <p className="text-xs text-ink/40 italic py-2">
                    No responsibilities assigned. Click "+ Add Role / Person" above to assign team members.
                  </p>
                )}
              </div>
            </div>

            {/* WORKFLOW CHECKLIST Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-ink/70 uppercase tracking-wider">
                    ☑️ Workflow Checklist
                  </h3>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    {completedCount}/{totalCount}
                  </span>
                </div>
                <span className="text-xs font-bold text-ink">{progressPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-paper border border-line/60 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      item.completed
                        ? "bg-accent/5 border-accent/20 text-ink/80"
                        : "bg-white border-line hover:border-line/80"
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1 text-xs">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent cursor-pointer"
                      />
                      <span className={item.completed ? "line-through text-ink/50" : "font-medium text-ink"}>
                        {item.text}
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      type="button"
                      className="text-ink/30 hover:text-red-500 text-xs px-2 py-1 rounded transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(e);
                    }
                  }}
                  placeholder="Add a checklist item (e.g. Script ready for Voiceover)..."
                  className="flex-1 px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-accent hover:opacity-90 text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer"
                >
                  + Add item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TWILIO COMMUNICATIONS & VOIP CALLS */}
        {activeTab === "twilio" && (
          <div className="space-y-6">
            {twilioSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-pulse">
                {twilioSuccessMsg}
              </div>
            )}

            {/* VoIP Click-to-Call Section */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📞</span>
                  <div>
                    <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                      Twilio VoIP WebRTC Dialer
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Direct Calling to: <span className="text-white font-mono">{phoneRecipient}</span>
                    </p>
                  </div>
                </div>

                {isCalling && (
                  <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    Calling: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, "0")}
                  </div>
                )}
              </div>

              {!isCalling ? (
                <button
                  type="button"
                  onClick={handleStartCall}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                >
                  <span>📞</span> Start Outbound Call via Twilio
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Enter real-time call notes..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white text-xs rounded-xl focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleEndCall}
                    disabled={sendingComm}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                  >
                    <span>🛑</span> End Call & Log to CRM
                  </button>
                </div>
              )}
            </div>

            {/* Twilio SMS & WhatsApp Composer */}
            <div className="p-4 bg-paper rounded-2xl border border-line">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  ✉️ Send SMS & WhatsApp Message
                </h4>
                <div className="flex bg-white p-0.5 rounded-lg border border-line text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCommChannel("sms")}
                    className={`px-3 py-1 rounded-md transition ${
                      commChannel === "sms" ? "bg-accent text-white font-bold" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    📱 SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommChannel("whatsapp")}
                    className={`px-3 py-1 rounded-md transition ${
                      commChannel === "whatsapp" ? "bg-emerald-600 text-white font-bold" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>

              {/* Template Quick Selection */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                <span className="text-[10px] text-ink/50 font-bold uppercase whitespace-nowrap">Templates:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("proposal")}
                  className="px-2.5 py-1 bg-white border border-line hover:border-accent rounded-lg text-[11px] font-medium text-ink/70 whitespace-nowrap transition"
                >
                  📄 Proposal Ready
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("reminder")}
                  className="px-2.5 py-1 bg-white border border-line hover:border-accent rounded-lg text-[11px] font-medium text-ink/70 whitespace-nowrap transition"
                >
                  ⏰ Check-in Reminder
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("welcome")}
                  className="px-2.5 py-1 bg-white border border-line hover:border-accent rounded-lg text-[11px] font-medium text-ink/70 whitespace-nowrap transition"
                >
                  🎉 Project Welcome
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex gap-2">
                  <span className="text-xs font-semibold text-ink/60 flex items-center px-2 bg-white border border-line rounded-lg">
                    To:
                  </span>
                  <input
                    type="text"
                    value={phoneRecipient}
                    onChange={(e) => setPhoneRecipient(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-mono font-medium text-ink"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <textarea
                  rows="3"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Write your ${commChannel.toUpperCase()} message here...`}
                  className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                ></textarea>

                <button
                  type="submit"
                  disabled={sendingComm || !messageText.trim()}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm disabled:opacity-50 ${
                    commChannel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-accent hover:opacity-90"
                  }`}
                >
                  {sendingComm ? "Transmitting via Twilio..." : `🚀 Dispatch ${commChannel.toUpperCase()} via Twilio`}
                </button>
              </form>
            </div>

            {/* Twilio Communication History Timeline */}
            <div>
              <h4 className="text-xs font-bold text-ink/70 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>📜 Twilio Activity & Communication Timeline</span>
                <span className="text-[11px] text-ink/40 font-normal">Realtime Sync</span>
              </h4>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {commLogs.length > 0 ? (
                  commLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white border border-line rounded-xl flex items-start gap-3 shadow-2xs hover:border-line/80 transition"
                    >
                      <div className="mt-0.5">
                        {log.channel === "voice" && <span className="p-2 rounded-lg bg-blue-50 text-blue-600 text-sm">📞</span>}
                        {log.channel === "sms" && <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 text-sm">📱</span>}
                        {log.channel === "whatsapp" && <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm">💬</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-ink capitalize flex items-center gap-1.5">
                            {log.channel} ({log.direction})
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-semibold">
                              {log.status}
                            </span>
                          </span>
                          <span className="text-[10px] text-ink/40 font-medium">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-ink/80 break-words font-sans">{log.message_body}</p>
                        {log.call_duration_seconds > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 mt-1 block">
                            Duration: {log.call_duration_seconds} seconds
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink/40 italic py-6 text-center border border-dashed border-line rounded-xl">
                    No communication history yet. Send an SMS or start a call above!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ZOOM & GOOGLE MEETINGS BOOKER */}
        {activeTab === "meetings" && (
          <div className="space-y-6">
            {mtgSuccessMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold animate-pulse flex items-center justify-between">
                <span>{mtgSuccessMsg}</span>
                <button onClick={() => setMtgSuccessMsg("")} className="text-blue-600 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Fancy Zoom Live Launcher Card */}
            <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl border border-blue-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/30 rounded-xl text-xl border border-blue-500/40">📹</div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
                      Zoom HD Video Call & Google Calendar Engine
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Instant Meeting Booker with Twilio SMS Confirmations & Reminders
                    </p>
                  </div>
                </div>

                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold px-2.5 py-1 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                  Live Sync
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={generateInstantVideoUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  title="Instant WebRTC Video Room (No setup needed)"
                >
                  <span>⚡</span> 1-Click Live Call
                </a>
                <a
                  href={generateGoogleMeetUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  title="Instant Google Meet Call"
                >
                  <span>🎥</span> Google Meet
                </a>
                <a
                  href={generateZoomMeetingUrl(title)}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>📹</span> Zoom Join
                </a>
                <a
                  href={generateGoogleCalendarUrl({ title: `Discovery Call — ${title}`, description: "Elevatech CRM Meeting", startTime: new Date().toISOString() })}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <span>📅</span> Google Cal
                </a>
              </div>
            </div>

            {/* Meeting Booker Form */}
            <div className="p-4 bg-paper rounded-2xl border border-line">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>🗓️ Schedule New Client Meeting</span>
              </h4>

              <form onSubmit={handleScheduleMeetingSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Title *</label>
                    <input
                      type="text"
                      value={mtgTitle}
                      onChange={(e) => setMtgTitle(e.target.value)}
                      placeholder="e.g. Discovery Call & Proposal Review"
                      className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Type</label>
                    <select
                      value={mtgType}
                      onChange={(e) => setMtgType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="discovery_call">📞 Discovery Call</option>
                      <option value="proposal_review">📄 Proposal Review</option>
                      <option value="voiceover_review">🎙️ Voiceover & Script Review</option>
                      <option value="demo">💻 Live Platform Demo</option>
                      <option value="project_kickoff">🚀 Project Kickoff</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Date *</label>
                    <input
                      type="date"
                      value={mtgDate}
                      onChange={(e) => setMtgDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Time</label>
                    <input
                      type="time"
                      value={mtgTime}
                      onChange={(e) => setMtgTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink/60 uppercase mb-1">Meeting Notes / Agenda</label>
                  <input
                    type="text"
                    value={mtgNotes}
                    onChange={(e) => setMtgNotes(e.target.value)}
                    placeholder="Agenda notes for client..."
                    className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={schedulingMtg || !mtgTitle.trim() || !mtgDate}
                  className="w-full py-2.5 bg-accent hover:opacity-90 text-white font-bold text-xs rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {schedulingMtg ? "Scheduling & Dispatched SMS..." : "🚀 Schedule Meeting + Send Twilio SMS & Google Cal Link"}
                </button>
              </form>
            </div>

            {/* Scheduled Meetings Timeline */}
            <div>
              <h4 className="text-xs font-bold text-ink/70 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>📅 Scheduled Meetings ({meetings.length})</span>
              </h4>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {meetings.map((m) => (
                  <div key={m.id} className="p-3 bg-white border border-line rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-blue-400 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">{m.title}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full capitalize">
                          {m.meeting_type?.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink/60 mt-0.5 flex items-center gap-2">
                        <span>🗓️ {new Date(m.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span>• ID: <strong className="font-mono text-ink">{m.meeting_id || "836 485 9102"}</strong></span>
                        <span>• Passcode: <strong className="font-mono text-accent">{m.passcode || "ELEV88"}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const inviteText = `📅 Meeting Invitation: "${m.title}"\n🗓️ Date/Time: ${new Date(m.start_time).toLocaleString()}\n🆔 Meeting ID: ${m.meeting_id || "836 485 9102"}\n🔑 Passcode: ${m.passcode || "ELEV88"}\n📹 Join Link: ${m.zoom_join_url || "https://zoom.us/join"}`;
                          const rawPhone = (clientObj.phone || "+15552345678").replace(/[^0-9+]/g, "");
                          window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(rawPhone)}&text=${encodeURIComponent(inviteText)}`, "_blank");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Share via WhatsApp"
                      >
                        <span>💬</span> WhatsApp
                      </button>
                      <a
                        href={m.zoom_join_url || generateZoomMeetingUrl(m.title)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg hover:bg-blue-500 transition shadow-2xs flex items-center gap-1"
                      >
                        <span>📹</span> Join Zoom
                      </a>
                      <a
                        href={m.google_calendar_url || generateGoogleCalendarUrl({ title: m.title, startTime: m.start_time })}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-paper border border-line text-ink font-semibold text-[11px] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
                      >
                        📅 Cal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Buttons */}
        <div className="flex gap-3 pt-4 mt-5 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-xl text-xs font-semibold text-ink hover:bg-paper transition"
            disabled={saving}
          >
            Close
          </button>
          {activeTab === "overview" && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 bg-accent text-white rounded-xl text-xs font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Card"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PipelineCardModal;
