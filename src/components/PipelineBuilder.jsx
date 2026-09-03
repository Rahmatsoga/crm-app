import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export function PipelineBuilder({ projectId, onClose, onCreated }) {
  const { user } = useAuth();
  const [pipelineName, setPipelineName] = useState("");
  const [stageCount, setStageCount] = useState(5);
  const [stages, setStages] = useState(getDefaultStages(5));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function getDefaultStages(count) {
    const defaults = {
      4: ["Planning", "Development", "Testing", "Launch"],
      5: ["New", "Contacted", "Proposal", "Negotiation", "Won"],
      6: ["Requirements", "Design", "Development", "Testing", "Deployment", "Live Support"],
      7: ["Discovery", "Scoping", "Design", "Dev", "QA", "UAT", "Live"],
      8: ["Lead", "Qualified", "Demo", "Proposal", "Negotiation", "Approval", "Deployment", "Support"],
    };
    return defaults[count] || defaults[5];
  }

  const handleStageCountChange = (count) => {
    setStageCount(count);
    setStages(getDefaultStages(count));
  };

  const handleStageNameChange = (index, name) => {
    const updated = [...stages];
    updated[index] = name;
    setStages(updated);
  };

  async function handleCreate(e) {
    e.preventDefault();
    if (!pipelineName.trim()) {
      setError("Pipeline name is required.");
      return;
    }
    if (stages.some((s) => !s.trim())) {
      setError("All stage names must be filled out.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Insert into custom_pipelines table
      const { data: pipeline, error: pipelineError } = await supabase
        .from("custom_pipelines")
        .insert([
          {
            pipeline_name: pipelineName.trim(),
            stage_count: stageCount,
            project_id: projectId || null,
            created_by: user?.id || null,
          },
        ])
        .select()
        .single();

      if (pipelineError) {
        if (pipelineError.code === "42P01") {
          throw new Error(
            "Custom pipelines table not found in Supabase. Please run database/create-pipeline-tables.sql in Supabase SQL Editor."
          );
        }
        throw pipelineError;
      }

      // 2. Insert into pipeline_stages table
      const stagesData = stages.map((name, idx) => ({
        pipeline_id: pipeline.id,
        stage_name: name.trim(),
        stage_order: idx + 1,
      }));

      const { data: insertedStages, error: stagesError } = await supabase
        .from("pipeline_stages")
        .insert(stagesData)
        .select();

      if (stagesError) throw stagesError;

      // 3. Seed sample cards into the newly created stages so they are not empty!
      if (insertedStages && insertedStages.length > 0) {
        const sampleCards = [
          {
            stage_id: insertedStages[0]?.id,
            card_title: "Voice AI Appointment Assistant",
            card_value: 50000,
            card_order: 1,
            checklist: [
              { id: 1, text: "Script ready for Voiceover", completed: true },
              { id: 2, text: "Voiceover ready and approved", completed: true },
              { id: 3, text: "Milestone created / Payment entered", completed: false },
              { id: 4, text: "Video ready", completed: false },
            ],
          },
          {
            stage_id: insertedStages[1]?.id || insertedStages[0]?.id,
            card_title: "Multi-Channel Lead Triage Engine",
            card_value: 75000,
            card_order: 1,
            checklist: [
              { id: 1, text: "Requirements Gathered", completed: true },
              { id: 2, text: "API Architecture Designed", completed: true },
              { id: 3, text: "Integration Test", completed: false },
            ],
          },
          {
            stage_id: insertedStages[2]?.id || insertedStages[0]?.id,
            card_title: "Enterprise Web Scraper & GHL Data Sync",
            card_value: 60000,
            card_order: 1,
            checklist: [
              { id: 1, text: "Data Schema Mapped", completed: true },
              { id: 2, text: "GHL OAuth Setup", completed: false },
            ],
          },
        ];

        try {
          await supabase.from("pipeline_cards").insert(sampleCards);
        } catch (cardErr) {
          console.warn("Card seed warning:", cardErr);
        }
      }

      if (onCreated) onCreated({ ...pipeline, stages: stagesData });
      onClose();
    } catch (err) {
      console.error("Pipeline creation error:", err);
      setError(err.message || "Failed to create pipeline.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-xl font-bold text-ink">Add New Pipeline</h2>
            <p className="text-xs text-ink/60 mt-0.5">
              Configure custom stage workflows for your Elevatech projects
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

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Pipeline Name */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              placeholder="e.g. Voice AI Project Pipeline, Web Scraper Pipeline"
              className="w-full px-3.5 py-2.5 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Stage Count Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Number of Stages: <span className="text-accent font-bold">{stageCount}</span>
            </label>
            <div className="flex gap-2">
              {[4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleStageCountChange(count)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition border ${
                    stageCount === count
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-paper text-ink border-line hover:border-accent/40"
                  }`}
                  disabled={loading}
                >
                  {count} Stages
                </button>
              ))}
            </div>
          </div>

          {/* Customize Stage Names */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Stage Names (Ordered)
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-3 bg-paper rounded-xl border border-line/60">
              {stages.map((name, idx) => (
                <div key={idx}>
                  <label className="text-[10px] uppercase font-bold text-ink/40 mb-1 block">
                    Stage {idx + 1}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleStageNameChange(idx, e.target.value)}
                    className="w-full px-3 py-1.5 border border-line rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={`Stage ${idx + 1}`}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-line rounded-xl text-xs font-semibold text-ink hover:bg-paper transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-accent text-white rounded-xl text-xs font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-50"
              disabled={loading || !pipelineName.trim()}
            >
              {loading ? "Creating Pipeline..." : "Create Pipeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default PipelineBuilder;
