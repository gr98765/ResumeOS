// ApiKeyGate.jsx — Asks user for their own free Gemini API key
// Key is stored in sessionStorage (cleared when tab closes, never sent anywhere)
// This means zero API costs for the app owner — users use their own free quota

import { useState } from "react";

export default function ApiKeyGate({ onKeySubmit }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = key.trim();
    if (!trimmed) { setError("Please enter your API key."); return; }
    if (!trimmed.startsWith("gsk_")) { setError("That doesn't look like a valid Gemini key. It should start with 'gsk_'."); return; }

    // Quick validation — test the key with a tiny API call
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${trimmed}`
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            max_tokens: 5,
            messages: [{ role: "user", content: "hi" }]
          })
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Invalid key");
      }
      // Key works! Store in sessionStorage and proceed
      sessionStorage.setItem("groq_api_key", trimmed);
      onKeySubmit(trimmed);
    } catch (err) {
      setError(`Key error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid} />
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>
          <span style={styles.brandIcon}>◈</span>
          <span style={styles.brandName}>ResumeOS</span>
        </div>

        <h1 style={styles.title}>Enter your Gemini API Key</h1>
        <p style={styles.subtitle}>
          ResumeOS uses Groq AI (free, no credit card needed). Get your free API key in 2 minutes.
        </p>

        {/* Steps */}
        <div style={styles.steps}>
          {[
            { n: "1", text: "Go to", link: "console.groq.com", url: "https://console.groq.com" },
            { n: "2", text: "Click 'Create API key' then copy it" },
            { n: "3", text: "Paste it below and click Continue" },
          ].map((s, i) => (
            <div key={i} style={styles.step}>
              <span style={styles.stepNum}>{s.n}</span>
              <span style={styles.stepText}>
                {s.text}{" "}
                {s.link && (
                  <a href={s.url} target="_blank" rel="noreferrer" style={styles.link}>
                    {s.link}
                  </a>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={styles.inputWrapper}>
          <input
            type="password"
            placeholder="gsk_Sy..."
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={styles.input}
            disabled={loading}
          />
          <button
            style={{ ...styles.btn, opacity: loading || !key.trim() ? 0.5 : 1 }}
            onClick={handleSubmit}
            disabled={loading || !key.trim()}
          >
            {loading ? "Checking..." : "Continue →"}
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Privacy note */}
        <p style={styles.privacy}>
          🔒 Your key is stored only in your browser session — never saved to our servers.
          It's gone the moment you close this tab.
        </p>

        {/* Why this model */}
        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>Why do I need my own key?</div>
          <div style={styles.infoText}>
            ResumeOS is a free, open-source portfolio project. Rather than charging users
            or hiding costs, we let you use your own free Gemini quota directly.
            Google gives every account 1,500 free requests per day — more than enough.
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#070b14",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Syne', sans-serif",
    padding: "24px",
  },
  grid: {
    position: "fixed", inset: 0,
    backgroundImage: `linear-gradient(rgba(0,245,160,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,160,0.04) 1px,transparent 1px)`,
    backgroundSize: "40px 40px", pointerEvents: "none",
  },
  orb1: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle,rgba(0,245,160,0.1) 0%,transparent 70%)",
    top: "-5%", left: "-5%", filter: "blur(60px)", pointerEvents: "none",
    animation: "float1 8s ease-in-out infinite",
  },
  orb2: {
    position: "fixed", width: 300, height: 300, borderRadius: "50%",
    background: "radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)",
    bottom: "5%", right: "5%", filter: "blur(60px)", pointerEvents: "none",
    animation: "float2 10s ease-in-out infinite",
  },
  card: {
    position: "relative", zIndex: 1,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20, padding: "40px",
    maxWidth: 520, width: "100%",
  },
  brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 28 },
  brandIcon: { fontSize: 22, color: "#00f5a0" },
  brandName: {
    color: "#00f5a0", fontFamily: "'DM Mono', monospace",
    fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
  },
  title: { fontSize: 26, fontWeight: 800, color: "#f0f0f0", margin: "0 0 12px", lineHeight: 1.2 },
  subtitle: {
    fontSize: 14, color: "#6b7280", lineHeight: 1.7,
    fontFamily: "'DM Mono', monospace", fontWeight: 300, margin: "0 0 28px",
  },
  steps: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 },
  step: { display: "flex", alignItems: "center", gap: 12 },
  stepNum: {
    width: 24, height: 24, borderRadius: "50%",
    background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)",
    color: "#00f5a0", fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, fontFamily: "'DM Mono', monospace",
  },
  stepText: { fontSize: 13, color: "#8892a4", fontFamily: "'DM Mono', monospace", fontWeight: 300 },
  link: { color: "#00f5a0", textDecoration: "none", fontWeight: 400 },
  inputWrapper: { display: "flex", gap: 10, marginBottom: 12 },
  input: {
    flex: 1, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
    padding: "12px 16px", color: "#f0f0f0", fontSize: 14,
    fontFamily: "'DM Mono', monospace", outline: "none",
  },
  btn: {
    background: "#00f5a0", border: "none", borderRadius: 10,
    padding: "12px 20px", color: "#070b14", fontSize: 14,
    fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap", transition: "opacity 0.15s",
  },
  error: {
    color: "#f87171", fontSize: 12,
    fontFamily: "'DM Mono', monospace", marginBottom: 12,
  },
  privacy: {
    fontSize: 11, color: "#2d3748",
    fontFamily: "'DM Mono', monospace", marginBottom: 20, lineHeight: 1.6,
  },
  infoBox: {
    background: "rgba(99,102,241,0.06)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: 10, padding: "14px 16px",
  },
  infoTitle: { fontSize: 12, fontWeight: 700, color: "#6366f1", fontFamily: "'DM Mono', monospace", marginBottom: 6 },
  infoText: { fontSize: 12, color: "#4a5568", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.6 },
};
