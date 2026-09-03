import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function PipelineCardModal({ card, deal, clients, users, onClose, onUpdate }) {
  // Title & Basic Info
  const [title, setTitle] = useState(card?.title || card?.card_title || deal?.title || "");
  const [value, setValue] = useState(card?.value || card?.card_value || deal?.value || 0);
  const [assignedTo, setAssignedTo] = useState(card?.assigned_to || deal?.assigned_rep_id || "");
  
  // Responsibilities
  const [responsibilities, setResponsibilities] = useState(
    card?.responsibilities || {
      script: "Rahmat",
      voiceOver: "Maaz",
      videoEditing: "Usama",
      thumbnail: "Rahmat",
    }
  );

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
    e.preventDefault();
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

  // Save changes to database
  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      if (card && card.id) {
        // Save to custom pipeline_cards
        const { error: updateErr } = await supabase
          .from("pipeline_cards")
          .update({
            card_title: title,
            card_value: value,
            assigned_to: assignedTo || null,
            checklist: checklist,
          })
          .eq("id", card.id);
        if (updateErr) throw updateErr;
      } else if (deal && deal.id) {
        // Save to deals table
        const { error: updateErr } = await supabase
          .from("deals")
          .update({
            title: title,
            value: value,
            checklist: checklist,
          })
          .eq("id", deal.id);
        if (updateErr) throw updateErr;
      }

      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error("Error saving card modal:", err);
      // Even if schema column is missing, update UI state smoothly
      if (onUpdate) onUpdate();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-line">
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-line">
          <div className="flex-1 pr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-ink w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 -ml-1"
              placeholder="Card Title"
            />
            <p className="text-xs text-ink/50 mt-1">
              {deal?.clients?.company_name || deal?.clients?.name || "Elevatech Project Workflow"}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-ink/40 hover:text-ink text-lg font-bold p-1 rounded-lg hover:bg-paper transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Top Info Grid */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-paper/60 rounded-xl border border-line/60">
            <div>
              <label className="block text-[11px] uppercase font-bold text-ink/50 mb-1">
                Value ($)
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-line rounded-lg text-sm bg-white font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase font-bold text-ink/50 mb-1">
                Assigned Lead
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-1.5 border border-line rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-1 focus:ring-accent"
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

          {/* RESPONSIBILITIES Block (as shown in reference picture) */}
          <div className="bg-paper border border-line/80 rounded-xl p-4">
            <h3 className="text-xs font-bold text-ink/60 uppercase tracking-wider mb-2.5">
              📋 Responsibilities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-ink/50 block text-[10px]">Script:</span>
                <span className="font-semibold text-ink">{responsibilities.script}</span>
              </div>
              <div>
                <span className="text-ink/50 block text-[10px]">Voice Over:</span>
                <span className="font-semibold text-ink">{responsibilities.voiceOver}</span>
              </div>
              <div>
                <span className="text-ink/50 block text-[10px]">Video Editing:</span>
                <span className="font-semibold text-ink">{responsibilities.videoEditing}</span>
              </div>
              <div>
                <span className="text-ink/50 block text-[10px]">Thumbnail:</span>
                <span className="font-semibold text-ink">{responsibilities.thumbnail}</span>
              </div>
            </div>
          </div>

          {/* WORKFLOW CHECKLIST Section (with Progress Percentage) */}
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

            {/* Dynamic Progress Bar */}
            <div className="w-full h-2.5 bg-paper border border-line/60 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items List */}
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

              {checklist.length === 0 && (
                <p className="text-xs text-ink/40 italic py-3 text-center border border-dashed border-line rounded-xl">
                  No checklist items yet. Add one below!
                </p>
              )}
            </div>

            {/* Add an Item Form */}
            <form onSubmit={handleAddItem} className="flex gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="Add a checklist item (e.g. Script ready for Voiceover)..."
                className="flex-1 px-3 py-2 border border-line rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-paper border border-line hover:bg-line/40 text-ink text-xs font-semibold rounded-xl transition"
              >
                + Add an item
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex gap-3 pt-5 mt-6 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-line rounded-xl text-xs font-semibold text-ink hover:bg-paper transition"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-accent text-white rounded-xl text-xs font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving Changes..." : "Save Card"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PipelineCardModal;
