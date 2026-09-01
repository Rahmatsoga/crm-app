import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export function EmailSync() {
  const { user, profile } = useAuth();
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Only show for Admin and Sales roles
  if (!["admin", "sales"].includes(profile?.role)) {
    return null; // Support users won't see this component
  }

  useEffect(() => {
    fetchEmailAccounts();
  }, []);

  async function fetchEmailAccounts() {
    const { data } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", user.id);
    setEmailAccounts(data || []);
    setLoading(false);
  }

  async function connectGmail() {
    // Implement Gmail OAuth flow
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = "https://www.googleapis.com/auth/gmail.modify";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
  }

  async function manualSync(emailAccountId) {
    setSyncing(true);
    try {
      // Trigger email sync via API endpoint
      const response = await fetch("/api/sync-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAccountId }),
      });

      if (response.ok) {
        setLastSyncTime(new Date().toLocaleString());
        await fetchEmailAccounts();
        alert("Email sync completed!");
      } else {
        alert("Error syncing emails");
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync emails");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectEmail(emailAccountId) {
    if (
      !window.confirm("Are you sure you want to disconnect this email account?")
    ) {
      return;
    }

    await supabase
      .from("email_accounts")
      .update({ is_connected: false })
      .eq("id", emailAccountId);
    fetchEmailAccounts();
  }

  return (
    <div className="bg-white border border-line rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">Email Sync</h3>
          <p className="text-sm text-ink/50">
            Auto-log emails as activities. Only visible to Admin & Sales.
          </p>
        </div>
        <button
          onClick={connectGmail}
          className="bg-accent text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          + Connect Gmail
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading email accounts...</p>
      ) : emailAccounts.length === 0 ? (
        <div className="bg-paper border border-dashed border-line rounded-lg p-4 text-center">
          <p className="text-sm text-ink/50">No email accounts connected yet</p>
          <p className="text-xs text-ink/40 mt-1">
            Click "Connect Gmail" to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emailAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-paper border border-line rounded-lg p-3 hover:border-accent/30 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm text-ink">
                    {account.email}
                  </p>
                  <p className="text-xs text-ink/50 capitalize mt-0.5">
                    {account.provider} •{" "}
                    {account.is_connected ? (
                      <span className="text-accent">Connected</span>
                    ) : (
                      <span className="text-warn">Disconnected</span>
                    )}{" "}
                    • Last sync:{" "}
                    {lastSyncTime ||
                      new Date(account.connected_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {account.is_connected && (
                    <button
                      onClick={() => manualSync(account.id)}
                      disabled={syncing}
                      className="text-xs px-3 py-1.5 bg-ink text-white rounded hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {syncing ? "Syncing..." : "Sync Now"}
                    </button>
                  )}
                  <button
                    onClick={() => disconnectEmail(account.id)}
                    className="text-xs px-3 py-1.5 bg-ink/5 text-ink rounded hover:bg-ink/10 transition"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
