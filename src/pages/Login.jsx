import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const action =
      mode === "signin"
        ? signIn(email, password)
        : signUp(email, password, name);
    const { error } = await action;
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (mode === "signup") {
      setMessage("Account created. You can now sign in.");
      setMode("signin");
      return;
    }
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white font-semibold mono mb-3">
            X
          </div>
          <h1 className="text-xl font-semibold text-ink">XYZ Software House</h1>
          <p className="text-sm text-ink/60 mt-1">
            Client relationship workspace
          </p>
        </div>

        <div className="bg-white border border-line rounded-xl p-6">
          <div className="flex mb-6 rounded-lg bg-paper border border-line p-1">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 text-sm py-1.5 rounded-md transition ${mode === "signin" ? "bg-white shadow-sm font-medium" : "text-ink/50"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 text-sm py-1.5 rounded-md transition ${mode === "signup" ? "bg-white shadow-sm font-medium" : "text-ink/50"}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">
                  Full name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  placeholder="Ahmed Khan"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="you@xyzsoftware.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-danger bg-dangerSoft border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-ink text-white text-sm font-medium rounded-lg py-2.5 mt-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
