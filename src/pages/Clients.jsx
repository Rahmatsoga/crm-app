import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const statusStyles = {
  lead: "bg-warnSoft text-warn",
  active: "bg-accentSoft text-accent",
  inactive: "bg-ink/5 text-ink/50",
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    status: "lead",
  });
  const [error, setError] = useState("");

  async function loadClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleAddClient(e) {
    e.preventDefault();
    setError("");

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedCompany = form.company_name.trim();

    if (!trimmedName) {
      setError("Client name is required.");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (trimmedPhone && trimmedPhone.length < 7) {
      setError("Phone number looks too short.");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        company_name: trimmedCompany || null,
        status: form.status,
      },
    ]);

    if (error) {
      setError(error.message);
      return;
    }

    setForm({
      name: "",
      email: "",
      phone: "",
      company_name: "",
      status: "lead",
    });
    setShowForm(false);
    loadClients();
  }

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-ink">Clients</h1>
          <p className="text-sm text-ink/50">{clients.length} total</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-ink text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90 transition"
        >
          {showForm ? "Cancel" : "Add client"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddClient}
          className="bg-white border border-line rounded-xl p-4 mb-6 grid grid-cols-2 gap-3"
        >
          <input
            placeholder="Client name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            placeholder="Company name"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            type="submit"
            className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90"
          >
            Save client
          </button>
          {error && <p className="col-span-2 text-xs text-danger">{error}</p>}
        </form>
      )}

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search clients or companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">All statuses</option>
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-white border border-line rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink/40 px-4 py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink/40 px-4 py-8 text-center">
            No clients match.
          </p>
        ) : (
          filtered.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.id}`}
              className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0 hover:bg-paper transition"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-ink/50">
                  {c.company_name || "—"} · {c.email || "no email"}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusStyles[c.status] || ""}`}
              >
                {c.status}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
