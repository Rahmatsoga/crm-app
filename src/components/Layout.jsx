import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    roles: ["admin", "sales", "support"],
  },
  { to: "/clients", label: "Clients", roles: ["admin", "sales", "support"] },
  { to: "/pipeline", label: "Pipeline", roles: ["admin", "sales"] },
  { to: "/projects", label: "Projects", roles: ["admin", "sales"] },
  { to: "/invoices", label: "Invoices", roles: ["admin", "sales"] },
  { to: "/documents", label: "Documents", roles: ["admin", "sales"] },
  { to: "/tasks", label: "Tasks", roles: ["admin", "sales", "support"] },
  { to: "/tickets", label: "Tickets", roles: ["admin", "sales", "support"] },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role || "sales";
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-56 shrink-0 border-r border-line bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-line flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent text-white flex items-center justify-center text-xs font-semibold mono">
            E
          </div>
          <span className="text-sm font-semibold text-ink">Elevatech CRM</span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-accentSoft text-accent font-medium"
                    : "text-ink/60 hover:bg-paper hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-line">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-medium">
              {(profile?.name || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {profile?.name || "Loading…"}
              </p>
              <p className="text-[11px] text-ink/50 capitalize">
                {profile?.role || ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-xs text-ink/50 hover:text-danger border border-line rounded-lg py-1.5 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
