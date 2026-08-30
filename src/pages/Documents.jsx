import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ client_id: "", project_id: "" });
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [documentResult, clientResult, projectResult] = await Promise.all([
      supabase
        .from("documents")
        .select("*, clients(name), projects(name)")
        .order("uploaded_at", { ascending: false }),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("projects").select("id,name,client_id").order("name"),
    ]);
    setDocuments(documentResult.data ?? []);
    setClients(clientResult.data ?? []);
    setProjects(projectResult.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadDocument(event) {
    event.preventDefault();
    setError("");
    if (!file || !form.client_id) {
      setError("Choose a client and a file.");
      return;
    }
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(storagePath, file, { upsert: false });
    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("project-documents")
      .getPublicUrl(storagePath);
    const { error: insertError } = await supabase.from("documents").insert([
      {
        client_id: form.client_id,
        project_id: form.project_id || null,
        file_name: file.name,
        storage_path: storagePath,
        file_url: urlData.publicUrl,
        uploaded_by: user.id,
      },
    ]);
    if (insertError) {
      await supabase.storage.from("project-documents").remove([storagePath]);
      setError(insertError.message);
      setBusy(false);
      return;
    }
    setForm({ client_id: "", project_id: "" });
    setFile(null);
    setFileInputKey((k) => k + 1);
    setBusy(false);
    load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink">Documents</h1>
        <p className="text-sm text-ink/50">
          Files shared across client and project work
        </p>
      </div>

      <form
        onSubmit={uploadDocument}
        className="bg-white border border-line rounded-xl p-4 mb-6 grid grid-cols-2 gap-3"
      >
        <select
          value={form.client_id}
          onChange={(event) =>
            setForm({ ...form, client_id: event.target.value })
          }
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
          value={form.project_id}
          onChange={(event) =>
            setForm({ ...form, project_id: event.target.value })
          }
          className="border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="">No project</option>
          {projects
            .filter(
              (project) =>
                !form.client_id || project.client_id === form.client_id,
            )
            .map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
        </select>
        <div className="border border-line rounded-lg px-3 py-2 text-sm col-span-2 flex items-center gap-3 bg-white">
          <label
            htmlFor="document-file-input"
            className="bg-ink text-white text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer hover:opacity-90 shrink-0"
          >
            Choose File
          </label>
          <span className="text-ink/60 truncate">
            {file ? file.name : "No file chosen"}
          </span>
          <input
            id="document-file-input"
            key={fileInputKey}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 justify-self-start disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Upload document"}
        </button>
        {error && <p className="text-xs text-danger col-span-2">{error}</p>}
      </form>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {documents.length === 0 ? (
          <p className="text-sm text-ink/40 px-4 py-12 text-center">
            No documents uploaded yet.
          </p>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="px-4 py-4 border-b border-line last:border-0 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-accent hover:underline truncate block"
                >
                  {document.file_name}
                </a>
                <p className="text-xs text-ink/50">
                  {document.projects?.name ||
                    document.clients?.name ||
                    "Unknown client"}
                </p>
              </div>
              <span className="text-xs text-ink/40 shrink-0">
                {document.uploaded_at
                  ? new Date(document.uploaded_at).toLocaleDateString()
                  : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
