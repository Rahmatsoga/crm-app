import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(`Google auth error: ${errorParam}`);
        setLoading(false);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        setLoading(false);
        return;
      }

      // Exchange auth code for tokens
      const response = await fetch("/api/auth/google-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, userId: user.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to authenticate");
      }

      const data = await response.json();
      console.log("Gmail connected:", data.email);

      // Redirect back to dashboard
      navigate("/dashboard", {
        state: {
          message: `Gmail account ${data.email} connected successfully!`,
        },
      });
    } catch (err) {
      console.error("Callback error:", err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Connecting Gmail...</p>
          <p className="text-sm text-ink/50">
            Please wait while we set up your email account
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger mb-2">
            Connection Failed
          </p>
          <p className="text-sm text-ink/50 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-ink text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
