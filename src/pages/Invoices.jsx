import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyles = {
  draft: "bg-ink/5 text-ink/50",
  sent: "bg-warnSoft text-warn",
  paid: "bg-accentSoft text-accent",
  overdue: "bg-dangerSoft text-danger",
  cancelled: "bg-ink/5 text-ink/40",
};

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    client_id: "",
    project_id: "",
    amount: "",
    issue_date: "",
    due_date: "",
    notes: "",
  });
  const [error, setError] = useState("");

  async function load() {
    const [invoiceResult, clientResult, projectResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, clients(name), projects(name)")
        .order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("projects").select("id,name,client_id").order("name"),
    ]);
    setInvoices(invoiceResult.data ?? []);
    setClients(clientResult.data ?? []);
    setProjects(projectResult.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function addInvoice(event) {
    event.preventDefault();
    setError("");
    if (!form.invoice_number.trim() || !form.client_id || !form.amount) {
      setError("Invoice number, client, and amount are required.");
      return;
    }
    const { error: insertError } = await supabase.from("invoices").insert([
      {
        invoice_number: form.invoice_number.trim(),
        client_id: form.client_id,
        project_id: form.project_id || null,
        amount: Number(form.amount),
        issue_date: form.issue_date || null,
        due_date: form.due_date || null,
        notes: form.notes.trim() || null,
        created_by: user.id,
      },
    ]);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({
      invoice_number: "",
      client_id: "",
      project_id: "",
      amount: "",
      issue_date: "",
      due_date: "",
      notes: "",
    });
    setShowForm(false);
    load();
  }

  async function updateStatus(invoiceId, status) {
    await supabase.from("invoices").update({ status }).eq("id", invoiceId);
    load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Invoices</h1>
          <p className="text-sm text-ink/50">
            Billing records for clients and projects
          </p>
        </div>
        <button
          onClick={() => setShowForm((current) => !current)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
        >
          {showForm ? "Cancel" : "New invoice"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={addInvoice}
          className="bg-white border border-line rounded-xl p-4 mb-6 grid grid-cols-2 gap-3"
        >
          <input
            placeholder="Invoice number"
            value={form.invoice_number}
            onChange={(event) =>
              updateForm("invoice_number", event.target.value)
            }
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount ($)"
            value={form.amount}
            onChange={(event) => updateForm("amount", event.target.value)}
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
            value={form.project_id}
            onChange={(event) => updateForm("project_id", event.target.value)}
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
          <input
            type="date"
            value={form.issue_date}
            onChange={(event) => updateForm("issue_date", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.due_date}
            onChange={(event) => updateForm("due_date", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(event) => updateForm("notes", event.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm col-span-2"
            rows="2"
          />
          <button
            type="submit"
            className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 justify-self-start"
          >
            Create invoice
          </button>
          {error && <p className="text-xs text-danger col-span-2">{error}</p>}
        </form>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white border border-line rounded-xl px-4 py-12 text-center text-sm text-ink/40">
          No invoices yet.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="px-4 py-4 border-b border-line last:border-0 flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium">{invoice.invoice_number}</p>
                <p className="text-xs text-accent">
                  {invoice.clients?.name || "Unknown client"}
                </p>
                <p className="text-xs text-ink/50 mt-1">
                  {invoice.projects?.name || "No project"}{" "}
                  {invoice.due_date ? `- due ${invoice.due_date}` : ""}
                </p>
                {invoice.notes && (
                  <p className="text-xs text-ink/40 mt-1">{invoice.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium">
                  ${Number(invoice.amount).toFixed(2)}
                </span>
                <select
                  value={invoice.status}
                  onChange={(event) =>
                    updateStatus(invoice.id, event.target.value)
                  }
                  className={`border-0 rounded-full px-2 py-1 text-xs capitalize ${statusStyles[invoice.status] || ""}`}
                >
                  {STATUSES.map((status) => (
                    <option key={status.key} value={status.key}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
