import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Pipeline from "./pages/Pipeline";
import Meetings from "./pages/Meetings";
import Projects from "./pages/Projects";
import Invoices from "./pages/Invoices";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import Tickets from "./pages/Tickets";
import ResetPassword from "./pages/ResetPassword";
import GoogleCallback from './pages/Auth/GoogleCallback'


function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-ink/40">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const role = profile?.role || "sales";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-ink/40">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white border border-line rounded-xl p-6 max-w-md text-center">
          <p className="text-lg font-semibold text-ink mb-2">Access denied</p>
          <p className="text-sm text-ink/60">
            This section is restricted to {allowedRoles.join(" / ")} users.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="meetings" element={<Meetings />} />
        <Route
          path="projects"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "sales"]}>
              <Projects />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="invoices"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "sales"]}>
              <Invoices />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="documents"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "sales"]}>
              <Documents />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="tasks"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "sales", "support"]}>
              <Tasks />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="tickets"
          element={
            <RoleProtectedRoute allowedRoles={["admin", "sales", "support"]}>
              <Tickets />
            </RoleProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
