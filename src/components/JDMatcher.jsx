// JDMatcher.jsx — Paste a JD and see how well the resume matches
// Used on the Recruiter view — honest scoring, not inflated

import { useState } from "react";
import { jdMatch } from "../gemini.js";

export default function JDMatcher({ resumeData }) {
  const [jd, setJd] = useState("");
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setError] = useState("");

  async function handleMatch() {
    if (!jd.trim()) return;
    setState("loading");
    try {
      const data = await jdMatch(resumeData, jd);
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  const matchColor = result
    ? result.overallMatch >= 70 ? "#00f5a0"
      : result.overallMatch >= 45 ? "#f59e0b"
        : "#f87171"
    : "#00f5a0";

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div style={styles.title}>JD Match Analysis</div>
        <div style={styles.subtitle}>
          Paste a job description to see how well {resumeData.name.split(" ")[0]}'s resume aligns
        </div>
      </div>

      {/* Input area */}
      {state !== "done" && (
        <div style={styles.inputSection}>
          <textarea
            style={styles.textarea}
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={5}
            disabled={state === "loading"}
          />
          <button
            style={{ ...styles.matchBtn, opacity: !jd.trim() || state === "loading" ? 0.5 : 1 }}
            onClick={handleMatch}
            disabled={!jd.trim() || state === "loading"}
          >
            {state === "loading" ? "Analysing..." : "Analyse Match →"}
          </button>
          {state === "error" && <div style={styles.errorText}>⚠️ {errorMsg}</div>}
        </div>
      )}

      {/* Results */}
      {state === "done" && result && (
        <div style={styles.results}>

          {/* Score hero */}
          <div style={styles.scoreHero}>
            <div style={styles.scoreCircle}>
              <svg viewBox="0 0 120 120" style={{ width: 120, height: 120 }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke={matchColor} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - result.overallMatch / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
                <text x="60" y="56" textAnchor="middle" fill={matchColor} fontSize="26" fontWeight="800" fontFamily="Arial">
                  {result.overallMatch}%
                </text>
                <text x="60" y="74" textAnchor="middle" fill="#6b7280" fontSize="11" fontFamily="Arial">
                  match
                </text>
              </svg>
            </div>

            <div style={styles.scoreRight}>
              <div style={styles.levelBadge}>{result.level}</div>
              <div style={styles.verdict}>{result.verdict}</div>
              {result.standoutPoints?.length > 0 && (
                <div style={styles.standouts}>
                  {result.standoutPoints.map((s, i) => (
                    <div key={i} style={styles.standoutItem}>⭐ {s}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Match breakdown */}
          <div style={styles.breakdown}>

            {/* Strong matches */}
            {result.strongMatches?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>✅ Strong Matches</div>
                {result.strongMatches.map((m, i) => (
                  <div key={i} style={styles.matchItem}>
                    <div style={styles.matchSkill}>{m.skill}</div>
                    <div style={styles.matchEvidence}>{m.evidence}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Partial matches */}
            {result.partialMatches?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>⚠️ Partial Matches</div>
                {result.partialMatches.map((m, i) => (
                  <div key={i} style={styles.matchItem}>
                    <div style={styles.matchSkill}>{m.skill}</div>
                    <div style={styles.matchEvidence}>{m.evidence}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Gaps */}
            {result.gaps?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}> Gaps</div>
                {result.gaps.map((g, i) => (
                  <div key={i} style={styles.matchItem}>
                    <div style={styles.matchSkill}>
                      {g.skill}
                      <span style={{
                        ...styles.importanceBadge,
                        background: g.importance === "critical" ? "rgba(248,113,113,0.1)" : "rgba(245,158,11,0.1)",
                        color: g.importance === "critical" ? "#f87171" : "#f59e0b",
                        border: `1px solid ${g.importance === "critical" ? "rgba(248,113,113,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}>
                        {g.importance}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Interview focus */}
            {result.interviewFocus?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}> Interview Focus Areas</div>
                {result.interviewFocus.map((f, i) => (
                  <div key={i} style={styles.focusItem}>· {f}</div>
                ))}
              </div>
            )}
          </div>

          <button style={styles.resetBtn} onClick={() => { setState("idle"); setJd(""); setResult(null); }}>
            ← Try Different JD
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, overflow: "hidden",
  },
  header: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  title: { fontSize: 13, fontWeight: 700, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#4a5568", fontFamily: "'DM Mono', monospace" },
  inputSection: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 },
  textarea: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "12px 14px", color: "#c0cad8", fontSize: 13,
    fontFamily: "'DM Mono', monospace", resize: "vertical", outline: "none", lineHeight: 1.6,
    minHeight: 100,
  },
  matchBtn: {
    background: "#00f5a0", border: "none", borderRadius: 10, padding: "12px 20px",
    color: "#070b14", fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", alignSelf: "flex-start",
  },
  errorText: { color: "#f87171", fontSize: 12, fontFamily: "'DM Mono', monospace" },
  results: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 },
  scoreHero: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" },
  scoreCircle: { flexShrink: 0 },
  scoreRight: { flex: 1 },
  levelBadge: {
    display: "inline-block", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#a5b4fc",
    fontFamily: "'DM Mono', monospace", marginBottom: 8,
  },
  verdict: { fontSize: 14, color: "#e2e8f0", lineHeight: 1.5, marginBottom: 10, fontFamily: "'DM Mono', monospace", fontWeight: 300 },
  standouts: { display: "flex", flexDirection: "column", gap: 4 },
  standoutItem: { fontSize: 12, color: "#6b7280", fontFamily: "'DM Mono', monospace" },
  breakdown: { display: "flex", flexDirection: "column", gap: 12 },
  section: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: 10, padding: "12px 14px",
  },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#8892a4", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 },
  matchItem: { marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" },
  matchSkill: { fontSize: 13, color: "#e2e8f0", fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: 2, display: "flex", alignItems: "center", gap: 8 },
  matchEvidence: { fontSize: 12, color: "#6b7280", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.5 },
  importanceBadge: { borderRadius: 20, padding: "2px 8px", fontSize: 10, fontFamily: "'DM Mono', monospace" },
  focusItem: { fontSize: 12, color: "#8892a4", fontFamily: "'DM Mono', monospace", marginBottom: 4, lineHeight: 1.5 },
  resetBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
    padding: "8px 14px", color: "#4a5568", fontSize: 11, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", alignSelf: "flex-start",
  },
};
