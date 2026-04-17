// ResumeAnalyser.jsx — Confidence scoring for every resume bullet
// User clicks "Analyse" → Gemini scores every bullet → visual results
// Each bullet gets Strong / Weak / Critical badge with reason + rewrite

import { useState } from "react";
import { analyseResume } from "../gemini.js";

export default function ResumeAnalyser({ resumeData }) {
  const [state, setState]           = useState("idle");    // idle | loading | done | error
  const [analysis, setAnalysis]     = useState(null);
  const [openBullet, setOpenBullet] = useState(null);      // which bullet drawer is open
  const [applied, setApplied]       = useState({});        // which rewrites have been applied
  const [errorMsg, setErrorMsg]     = useState("");

  // ── Run the analysis ──────────────────────────────────────────────────────
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

  // ── Score config ──────────────────────────────────────────────────────────
  const scoreConfig = {
    strong:   { label: "Strong",   emoji: "✅", color: "#00f5a0", bg: "rgba(0,245,160,0.08)",   border: "rgba(0,245,160,0.25)"   },
    weak:     { label: "Weak",     emoji: "⚠️", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.3)"   },
    critical: { label: "Critical", emoji: "❌", color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)"  },
  };

  // Count bullets by score
  const counts = analysis
    ? analysis.bullets.reduce(
        (acc, b) => { acc[b.score] = (acc[b.score] || 0) + 1; return acc; },
        { strong: 0, weak: 0, critical: 0 }
      )
    : null;

  // ── IDLE STATE: just show the button ──────────────────────────────────────
  if (state === "idle") {
    return (
      <div style={styles.idleWrapper}>
        <div style={styles.idleLeft}>
          <div style={styles.idleTitle}>Resume Health Check</div>
          <div style={styles.idleSubtitle}>
            Get honest, bullet-by-bullet feedback. Find out exactly what's weak and why.
          </div>
        </div>
        <button style={styles.analyseBtn} onClick={handleAnalyse}>
          Analyse My Resume →
        </button>
      </div>
    );
  }

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Reading every bullet point...</div>
        <div style={styles.loadingSubtext}>This takes about 10 seconds</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── ERROR STATE ───────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div style={styles.errorWrapper}>
        <div style={styles.errorText}>⚠️ {errorMsg}</div>
        <button style={styles.retryBtn} onClick={() => setState("idle")}>
          Try Again
        </button>
      </div>
    );
  }

  // ── RESULTS STATE ─────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>

      {/* ── Score Header ── */}
      <div style={styles.scoreHeader}>
        <div style={styles.scoreLeft}>
          <div style={styles.scoreLabel}>Resume Health</div>
          <div style={styles.scoreNumber}>{analysis.overallScore}<span style={styles.scoreMax}>/100</span></div>
          <div style={styles.scoreSummary}>{analysis.summary}</div>
        </div>

        {/* Score bar */}
        <div style={styles.scoreBarWrapper}>
          <div style={styles.scoreBarTrack}>
            <div
              style={{
                ...styles.scoreBarFill,
                width: `${analysis.overallScore}%`,
                background: analysis.overallScore >= 70
                  ? "#00f5a0"
                  : analysis.overallScore >= 45
                  ? "#f59e0b"
                  : "#f87171",
              }}
            />
          </div>

          {/* Counts */}
          <div style={styles.counts}>
            {Object.entries(scoreConfig).map(([key, cfg]) => (
              <div key={key} style={styles.countItem}>
                <span style={{ ...styles.countBadge, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  {cfg.emoji} {counts[key]}
                </span>
                <span style={styles.countLabel}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button style={styles.rerunBtn} onClick={() => setState("idle")}>
          Re-run
        </button>
      </div>

      {/* ── Bullet List ── */}
      <div style={styles.bulletSection}>
        <div style={styles.sectionLabel}>Bullet by Bullet Breakdown</div>

        {analysis.bullets.map((item, i) => {
          const cfg = scoreConfig[item.score] || scoreConfig.weak;
          const isOpen = openBullet === i;
          const wasApplied = applied[i];

          return (
            <div key={i} style={{ ...styles.bulletCard, borderColor: isOpen ? cfg.border : "rgba(255,255,255,0.06)" }}>

              {/* Bullet row */}
              <div
                style={styles.bulletRow}
                onClick={() => setOpenBullet(isOpen ? null : i)}
              >
                {/* Score badge */}
                <span style={{ ...styles.scoreBadge, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                  {cfg.emoji} {cfg.label}
                </span>

                {/* Bullet text */}
                <span style={{
                  ...styles.bulletText,
                  textDecoration: wasApplied ? "line-through" : "none",
                  opacity: wasApplied ? 0.4 : 1,
                }}>
                  {wasApplied ? item.original : item.original}
                </span>

                {/* Company tag */}
                <span style={styles.companyTag}>{item.company}</span>

                {/* Expand arrow */}
                <span style={{ ...styles.arrow, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  ↓
                </span>
              </div>

              {/* Expanded drawer */}
              {isOpen && (
                <div style={{ ...styles.drawer, borderTop: `1px solid ${cfg.border}` }}>

                  {/* Why */}
                  <div style={styles.drawerSection}>
                    <div style={styles.drawerLabel}>Why {cfg.label}</div>
                    <div style={styles.drawerText}>{item.reason}</div>
                  </div>

                  {/* Rewrite */}
                  {item.score !== "strong" && (
                    <div style={styles.drawerSection}>
                      <div style={styles.drawerLabel}>Suggested Rewrite</div>
                      <div style={styles.rewriteBox}>{item.rewrite}</div>
                      <button
                        style={{
                          ...styles.applyBtn,
                          ...(wasApplied ? styles.applyBtnDone : {}),
                        }}
                        onClick={() => {
                          setApplied((prev) => ({ ...prev, [i]: true }));
                          // Copy to clipboard for easy pasting
                          navigator.clipboard.writeText(item.rewrite).catch(() => {});
                        }}
                      >
                        {wasApplied ? "✓ Copied to clipboard" : "Use this rewrite → (copies to clipboard)"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  // Idle
  idleWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(0,245,160,0.03)",
    border: "1px solid rgba(0,245,160,0.12)",
    borderRadius: 16,
    padding: "20px 24px",
    gap: 20,
    flexWrap: "wrap",
  },
  idleLeft: { flex: 1 },
  idleTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#e2e8f0",
    fontFamily: "'Syne', sans-serif",
    marginBottom: 6,
  },
  idleSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    lineHeight: 1.5,
  },
  analyseBtn: {
    background: "#00f5a0",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    color: "#070b14",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  },

  // Loading
  loadingWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 24px",
    gap: 12,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "2px solid rgba(0,245,160,0.2)",
    borderTop: "2px solid #00f5a0",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#00f5a0",
    fontSize: 14,
    fontFamily: "'DM Mono', monospace",
  },
  loadingSubtext: {
    color: "#3d4a5c",
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
  },

  // Error
  errorWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "32px",
    background: "rgba(248,113,113,0.05)",
    border: "1px solid rgba(248,113,113,0.2)",
    borderRadius: 16,
  },
  errorText: { color: "#f87171", fontSize: 13, fontFamily: "'DM Mono', monospace" },
  retryBtn: {
    background: "none",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 8,
    padding: "8px 16px",
    color: "#f87171",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
  },

  // Results
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // Score header card
  scoreHeader: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "20px 24px",
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  scoreLeft: { minWidth: 120 },
  scoreLabel: {
    fontSize: 11,
    color: "#00f5a0",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 800,
    color: "#f0f0f0",
    fontFamily: "'Syne', sans-serif",
    lineHeight: 1,
    marginBottom: 8,
  },
  scoreMax: {
    fontSize: 20,
    color: "#3d4a5c",
    fontWeight: 400,
  },
  scoreSummary: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    lineHeight: 1.5,
    maxWidth: 240,
  },
  scoreBarWrapper: { flex: 1, minWidth: 200 },
  scoreBarTrack: {
    height: 6,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
    marginTop: 8,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 1s ease",
  },
  counts: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  countItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
  },
  countLabel: {
    fontSize: 12,
    color: "#4a5568",
    fontFamily: "'DM Mono', monospace",
  },
  rerunBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "6px 14px",
    color: "#4a5568",
    fontSize: 11,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    alignSelf: "flex-start",
  },

  // Bullet list
  bulletSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#00f5a0",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bulletCard: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  bulletRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    cursor: "pointer",
    flexWrap: "wrap",
  },
  scoreBadge: {
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#c0cad8",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    lineHeight: 1.5,
    minWidth: 0,
  },
  companyTag: {
    fontSize: 11,
    color: "#3d4a5c",
    fontFamily: "'DM Mono', monospace",
    flexShrink: 0,
  },
  arrow: {
    color: "#3d4a5c",
    fontSize: 12,
    transition: "transform 0.2s",
    flexShrink: 0,
  },

  // Drawer
  drawer: {
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  drawerSection: { display: "flex", flexDirection: "column", gap: 6 },
  drawerLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#4a5568",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  drawerText: {
    fontSize: 13,
    color: "#8892a4",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  rewriteBox: {
    background: "rgba(0,245,160,0.04)",
    border: "1px solid rgba(0,245,160,0.15)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#c0cad8",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
    lineHeight: 1.6,
  },
  applyBtn: {
    background: "rgba(0,245,160,0.1)",
    border: "1px solid rgba(0,245,160,0.2)",
    borderRadius: 8,
    padding: "8px 14px",
    color: "#00f5a0",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    alignSelf: "flex-start",
    transition: "all 0.15s",
  },
  applyBtnDone: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#4a5568",
    cursor: "default",
  },
};
