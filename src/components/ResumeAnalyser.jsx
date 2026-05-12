// ResumeAnalyser.jsx — Multi-dimension bullet scoring with STAR breakdown
import { useState } from "react";
import { analyseResume } from "../gemini.js";

const scoreConfig = {
  strong:   { label: "Strong",   emoji: "✅", color: "#00f5a0", bg: "rgba(0,245,160,0.08)",   border: "rgba(0,245,160,0.25)"  },
  weak:     { label: "Weak",     emoji: "⚠️", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)"  },
  critical: { label: "Critical", emoji: "❌", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)" },
};

const dimensionLabels = {
  actionVerb:    "Action Verb",
  hasMetric:     "Has Metric",
  hasImpact:     "Has Impact",
  isSpecific:    "Specific",
  goodLength:    "Good Length",
  starComplete:  "STAR Method",
  hasBuzzwords:  "No Buzzwords",
};

export default function ResumeAnalyser({ resumeData }) {
  const [state, setState]       = useState("idle");
  const [analysis, setAnalysis] = useState(null);
  const [openBullet, setOpenBullet] = useState(null);
  const [applied, setApplied]   = useState({});
  const [errorMsg, setErrorMsg] = useState("");

  async function handleAnalyse() {
    setState("loading");
    try {
      const result = await analyseResume(resumeData);
      setAnalysis(result);
      setState("done");
    } catch (err) {
      setErrorMsg(err.message);
      setState("error");
    }
  }

  const counts = analysis
    ? analysis.bullets.reduce(
        (acc, b) => { acc[b.score] = (acc[b.score] || 0) + 1; return acc; },
        { strong: 0, weak: 0, critical: 0 }
      )
    : null;

  if (state === "idle") return (
    <div style={styles.idleWrapper}>
      <div style={styles.idleLeft}>
        <div style={styles.idleTitle}>Resume Health Check</div>
        <div style={styles.idleSub}>
          Multi-dimension scoring: action verbs, metrics, impact, STAR method, ATS compatibility, buzzword detection.
        </div>
      </div>
      <button style={styles.analyseBtn} onClick={handleAnalyse}>
        Analyse My Resume →
      </button>
    </div>
  );

  if (state === "loading") return (
    <div style={styles.loadingBox}>
      <div style={styles.spinner} />
      <div style={styles.loadingText}>Scoring every bullet across 7 dimensions...</div>
      <div style={styles.loadingSub}>Takes about 15 seconds</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (state === "error") return (
    <div style={styles.errorBox}>
      <div style={styles.errorText}>⚠️ {errorMsg}</div>
      <button style={styles.retryBtn} onClick={() => setState("idle")}>Try Again</button>
    </div>
  );

  return (
    <div style={styles.wrapper}>

      {/* Score overview */}
      <div style={styles.overviewCard}>
        <div style={styles.overviewLeft}>
          <div style={styles.overviewLabel}>Resume Health</div>
          <div style={styles.bigScore}>
            {analysis.overallScore}
            <span style={styles.scoreMax}>/100</span>
          </div>
          <div style={styles.atsBadge}>ATS Score: {analysis.atsScore}/100</div>
          <p style={styles.summaryText}>{analysis.summary}</p>
        </div>

        <div style={styles.overviewRight}>
          {/* Score bar */}
          <div style={styles.barTrack}>
            <div style={{
              ...styles.barFill,
              width: `${analysis.overallScore}%`,
              background: analysis.overallScore >= 70 ? "#00f5a0" : analysis.overallScore >= 45 ? "#f59e0b" : "#f87171",
            }} />
          </div>

          {/* Counts */}
          <div style={styles.countsRow}>
            {Object.entries(scoreConfig).map(([key, cfg]) => (
              <div key={key} style={styles.countChip}>
                <span style={{ ...styles.countBadge, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  {cfg.emoji} {counts[key]}
                </span>
                <span style={styles.countLabel}>{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Top issues & strengths */}
          {analysis.topStrengths?.length > 0 && (
            <div style={styles.insightRow}>
              <div style={styles.insightLabel}>✅ Strengths</div>
              {analysis.topStrengths.map((s, i) => (
                <div key={i} style={{ ...styles.insightItem, color: "#00f5a0" }}>· {s}</div>
              ))}
            </div>
          )}
          {analysis.topIssues?.length > 0 && (
            <div style={styles.insightRow}>
              <div style={styles.insightLabel}>⚠️ Top Issues</div>
              {analysis.topIssues.map((s, i) => (
                <div key={i} style={{ ...styles.insightItem, color: "#f59e0b" }}>· {s}</div>
              ))}
            </div>
          )}
        </div>

        <button style={styles.rerunBtn} onClick={() => setState("idle")}>Re-run</button>
      </div>

      {/* Bullet list */}
      <div style={styles.sectionLabel}>Bullet-by-Bullet Breakdown</div>

      {analysis.bullets.map((item, i) => {
        const cfg = scoreConfig[item.score] || scoreConfig.weak;
        const isOpen = openBullet === i;
        const wasApplied = applied[i];
        const dims = item.dimensions || {};

        return (
          <div key={i} style={{ ...styles.bulletCard, borderColor: isOpen ? cfg.border : "rgba(255,255,255,0.06)" }}>

            {/* Header row */}
            <div style={styles.bulletRow} onClick={() => setOpenBullet(isOpen ? null : i)}>
              <span style={{ ...styles.scoreBadge, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.emoji} {cfg.label}
              </span>
              <span style={{ ...styles.bulletText, opacity: wasApplied ? 0.4 : 1, textDecoration: wasApplied ? "line-through" : "none" }}>
                {item.original}
              </span>
              <span style={styles.companyTag}>{item.company}</span>
              <span style={{ ...styles.arrow, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>↓</span>
            </div>

            {/* Dimension pills — always visible */}
            <div style={styles.dimRow}>
              {Object.entries(dimensionLabels).map(([key, label]) => {
                // hasBuzzwords: true is BAD, false is good
                const pass = key === "hasBuzzwords" ? !dims[key] : dims[key];
                return (
                  <span key={key} style={{
                    ...styles.dimPill,
                    background: pass ? "rgba(0,245,160,0.06)" : "rgba(248,113,113,0.06)",
                    border: `1px solid ${pass ? "rgba(0,245,160,0.15)" : "rgba(248,113,113,0.15)"}`,
                    color: pass ? "#4ade80" : "#f87171",
                  }}>
                    {pass ? "✓" : "✗"} {label}
                  </span>
                );
              })}
            </div>

            {/* Expanded drawer */}
            {isOpen && (
              <div style={{ ...styles.drawer, borderTop: `1px solid ${cfg.border}` }}>

                {/* Why */}
                <div style={styles.drawerSection}>
                  <div style={styles.drawerLabel}>Why {cfg.label}</div>
                  <div style={styles.drawerText}>{item.reason}</div>
                </div>

                {/* STAR breakdown */}
                {item.starBreakdown && (
                  <div style={styles.drawerSection}>
                    <div style={styles.drawerLabel}>STAR Breakdown</div>
                    <div style={styles.starGrid}>
                      {Object.entries(item.starBreakdown).map(([key, val]) => (
                        <div key={key} style={styles.starItem}>
                          <div style={styles.starKey}>{key.toUpperCase()}</div>
                          <div style={styles.starVal}>{val || "—  not found in bullet"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rewrite */}
                {item.score !== "strong" && (
                  <div style={styles.drawerSection}>
                    <div style={styles.drawerLabel}>STAR-Based Rewrite</div>
                    <div style={styles.rewriteBox}>{item.rewrite}</div>
                    <button
                      style={{ ...styles.applyBtn, ...(wasApplied ? styles.applyBtnDone : {}) }}
                      onClick={() => {
                        setApplied(prev => ({ ...prev, [i]: true }));
                        navigator.clipboard.writeText(item.rewrite).catch(() => {});
                      }}
                    >
                      {wasApplied ? "✓ Copied to clipboard" : "Use this rewrite → copies to clipboard"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  idleWrapper: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(0,245,160,0.03)", border: "1px solid rgba(0,245,160,0.12)",
    borderRadius: 16, padding: "20px 24px", gap: 20, flexWrap: "wrap",
  },
  idleLeft: { flex: 1 },
  idleTitle: { fontSize: 16, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Syne', sans-serif", marginBottom: 6 },
  idleSub: { fontSize: 12, color: "#6b7280", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.5 },
  analyseBtn: {
    background: "#00f5a0", border: "none", borderRadius: 10, padding: "12px 24px",
    color: "#070b14", fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
  },
  loadingBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    padding: "40px", background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
  },
  spinner: {
    width: 32, height: 32, border: "2px solid rgba(0,245,160,0.2)",
    borderTop: "2px solid #00f5a0", borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#00f5a0", fontSize: 14, fontFamily: "'DM Mono', monospace" },
  loadingSub: { color: "#3d4a5c", fontSize: 12, fontFamily: "'DM Mono', monospace" },
  errorBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px",
    background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 16,
  },
  errorText: { color: "#f87171", fontSize: 13, fontFamily: "'DM Mono', monospace" },
  retryBtn: {
    background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8,
    padding: "8px 16px", color: "#f87171", fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
  },
  wrapper: { display: "flex", flexDirection: "column", gap: 10 },
  overviewCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "20px 24px", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start",
  },
  overviewLeft: { minWidth: 140 },
  overviewLabel: { fontSize: 11, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 },
  bigScore: { fontSize: 52, fontWeight: 800, color: "#f0f0f0", fontFamily: "'Syne', sans-serif", lineHeight: 1, marginBottom: 6 },
  scoreMax: { fontSize: 22, color: "#3d4a5c", fontWeight: 400 },
  atsBadge: {
    display: "inline-block", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#a5b4fc",
    fontFamily: "'DM Mono', monospace", marginBottom: 10,
  },
  summaryText: { color: "#6b7280", fontSize: 12, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontWeight: 300, maxWidth: 220, margin: 0 },
  overviewRight: { flex: 1, minWidth: 200 },
  barTrack: { height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 16, marginTop: 8 },
  barFill: { height: "100%", borderRadius: 3, transition: "width 1s ease" },
  countsRow: { display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 },
  countChip: { display: "flex", alignItems: "center", gap: 8 },
  countBadge: { borderRadius: 20, padding: "3px 10px", fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700 },
  countLabel: { fontSize: 12, color: "#4a5568", fontFamily: "'DM Mono', monospace" },
  insightRow: { marginBottom: 10 },
  insightLabel: { fontSize: 11, fontWeight: 700, color: "#4a5568", fontFamily: "'DM Mono', monospace", marginBottom: 4 },
  insightItem: { fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 300, marginBottom: 2 },
  rerunBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
    padding: "6px 14px", color: "#4a5568", fontSize: 11, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", alignSelf: "flex-start",
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 700, color: "#00f5a0", fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em", textTransform: "uppercase",
  },
  bulletCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, overflow: "hidden", transition: "border-color 0.15s",
  },
  bulletRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
    cursor: "pointer", flexWrap: "wrap",
  },
  scoreBadge: { borderRadius: 20, padding: "3px 10px", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 13, color: "#c0cad8", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.5, minWidth: 0 },
  companyTag: { fontSize: 11, color: "#3d4a5c", fontFamily: "'DM Mono', monospace", flexShrink: 0 },
  arrow: { color: "#3d4a5c", fontSize: 12, transition: "transform 0.2s", flexShrink: 0 },
  dimRow: { display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 12px" },
  dimPill: { borderRadius: 20, padding: "2px 10px", fontSize: 10, fontFamily: "'DM Mono', monospace" },
  drawer: { padding: "14px", display: "flex", flexDirection: "column", gap: 14 },
  drawerSection: { display: "flex", flexDirection: "column", gap: 6 },
  drawerLabel: { fontSize: 11, fontWeight: 700, color: "#4a5568", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" },
  drawerText: { fontSize: 13, color: "#8892a4", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.6 },
  starGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  starItem: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px" },
  starKey: { fontSize: 10, fontWeight: 700, color: "#6366f1", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 },
  starVal: { fontSize: 12, color: "#8892a4", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.4 },
  rewriteBox: {
    background: "rgba(0,245,160,0.04)", border: "1px solid rgba(0,245,160,0.15)",
    borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c0cad8",
    fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.6,
  },
  applyBtn: {
    background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)",
    borderRadius: 8, padding: "8px 14px", color: "#00f5a0", fontSize: 12,
    cursor: "pointer", fontFamily: "'DM Mono', monospace", alignSelf: "flex-start",
  },
  applyBtnDone: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#4a5568", cursor: "default" },
};
