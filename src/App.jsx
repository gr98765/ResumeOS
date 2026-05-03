// App.jsx — Updated to use Firebase instead of localStorage
// Key changes from previous version:
//   1. Resume saved to Firestore (cloud) not localStorage
//   2. Shareable URL generated → resumeos.vercel.app/r/xK9mP2
//   3. /r/:shareId route loads resume for anyone with the link
//   4. Owner sees "Copy Link" button, visitors see read-only view

import { useState, useEffect } from "react";
import UploadScreen from "./components/UploadScreen.jsx";
import SkillGraph from "./components/SkillGraph.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { extractTextFromPDF } from "./pdfParser.js";
import { parseResume } from "./gemini.js";
import { saveResume, loadResume, isCurrentUserOwner } from "./firebase.js";
import ResumeAnalyser from "./components/ResumeAnalyser.jsx";
import ApiKeyGate from "./components/ApiKeyGate.jsx";

export default function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("groq_api_key") || "");
  const [resumeData, setResumeData]   = useState(null);
  const [shareId,    setShareId]      = useState(null);
  const [isOwner,    setIsOwner]      = useState(false);
  const [isLoading,  setIsLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");
  const [activeTab,  setActiveTab]    = useState("graph");
  const [copied,     setCopied]       = useState(false);
  const [initError,  setInitError]    = useState(null);

  // ── On mount: check if URL is a share link (/r/xK9mP2) ───────────────────
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/r\/([a-zA-Z0-9]{6})$/);
    if (match) {
      loadSharedResume(match[1]);
    }
  }, []);

  async function loadSharedResume(id) {
    setIsLoading(true);
    setLoadingMsg("Loading shared resume...");
    try {
      const data = await loadResume(id);
      if (!data) {
        setInitError("Resume not found. The link may have expired.");
        return;
      }
      setResumeData(data);
      setShareId(id);
      const ownerCheck = await isCurrentUserOwner(id);
      setIsOwner(ownerCheck);
    } catch (err) {
      setInitError(`Failed to load resume: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }

  // ── Main flow: file selected → extract → parse → save to Firestore ────────
  async function handleFileSelect(file) {
    setIsLoading(true);
    try {
      setLoadingMsg("Reading your PDF...");
      const rawText = await extractTextFromPDF(file);

      setLoadingMsg("Analyzing with Gemini AI...");
      const parsed = await parseResume(rawText);

      setLoadingMsg("Saving to cloud...");
      const id = await saveResume(parsed);

      setResumeData(parsed);
      setShareId(id);
      setIsOwner(true);

      // Update browser URL so the link is bookmarkable immediately
      window.history.pushState({}, "", `/r/${id}`);
    } catch (err) {
      alert(
        `Error: ${err.message}\n\nTips:\n• Make sure your PDF has selectable text\n• Check your Gemini API key in .env\n• Check your Firebase config in .env`
      );
    } finally {
      setIsLoading(false);
      setLoadingMsg("");
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/r/${shareId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleReset() {
    setResumeData(null);
    setShareId(null);
    setIsOwner(false);
    window.history.pushState({}, "", "/");
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading && !resumeData) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={styles.loadingLabel}>{loadingMsg}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (initError) {
    return (
      <div style={styles.centered}>
        <p style={styles.errorLabel}>{initError}</p>
        <button
          style={styles.backBtn}
          onClick={() => {
            setInitError(null);
            window.history.pushState({}, "", "/");
          }}
        >
          ← Go home
        </button>
      </div>
    );
  }

  // ── API Key Gate
  if (!apiKey) {
    return <ApiKeyGate onKeySubmit={(k) => setApiKey(k)} />;
  }

  // ── Upload screen ─────────────────────────────────────────────────────────
  if (!resumeData) {
    return (
      <UploadScreen
        onFileSelect={handleFileSelect}
        isLoading={isLoading}
        loadingMsg={loadingMsg}
      />
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.dashboard}>
      <div style={styles.grid} />

      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <span style={styles.navIcon}>◈</span>
          <span style={styles.navName}>ResumeOS</span>
        </div>

        <div style={styles.navCenter}>
          <span style={styles.personName}>{resumeData.name}</span>
          {!isOwner && (
            <span style={styles.viewingBadge}>👁 Viewing shared resume</span>
          )}
        </div>

        <div style={styles.navActions}>
          {shareId && (
            <button style={styles.shareBtn} onClick={copyLink}>
              {copied ? "✓ Copied!" : "⎘ Copy Link"}
            </button>
          )}
          {isOwner && (
            <button style={styles.resetBtn} onClick={handleReset}>
              Upload New
            </button>
          )}
        </div>
      </nav>

      {/* URL bar — shown to owner */}
      {isOwner && shareId && (
        <div style={styles.urlBar}>
          <span style={styles.urlLabel}>Your shareable link →</span>
          <span style={styles.urlValue}>
            {window.location.origin}/r/{shareId}
          </span>
          <span style={styles.urlHint}>
            Recruiters can view and chat with your resume at this URL
          </span>
        </div>
      )}

      {/* Main layout */}
      <main style={styles.main}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>AI Summary</div>
            <p style={styles.summaryText}>{resumeData.summary}</p>
          </div>

          <ResumeAnalyser resumeData={resumeData} />

          <div style={styles.tabRow}>
            {[
              { id: "graph",      label: "Skill Graph"  },
              { id: "experience", label: "Experience"   },
              { id: "skills",     label: "All Skills"   },
            ].map((t) => (
              <button
                key={t.id}
                style={{ ...styles.tabBtn, ...(activeTab === t.id ? styles.tabBtnActive : {}) }}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "graph" && (
            <SkillGraph
              skills={resumeData.skills || []}
              experience={resumeData.experience || []}
            />
          )}

          {activeTab === "experience" && (
            <div style={styles.card}>
              {(resumeData.experience || []).map((exp, i) => (
                <div key={i} style={styles.expItem}>
                  <div style={styles.expHeader}>
                    <div>
                      <div style={styles.expTitle}>{exp.title}</div>
                      <div style={styles.expCompany}>{exp.company}</div>
                    </div>
                    <div style={styles.expDuration}>{exp.duration}</div>
                  </div>
                  <ul style={styles.bullets}>
                    {(exp.bullets || []).map((b, j) => (
                      <li key={j} style={styles.bullet}>{b}</li>
                    ))}
                  </ul>
                  {i < resumeData.experience.length - 1 && <div style={styles.divider} />}
                </div>
              ))}
            </div>
          )}

          {activeTab === "skills" && (
            <div style={styles.card}>
              <div style={styles.skillsGrid}>
                {(resumeData.skills || []).map((s, i) => (
                  <span key={i} style={styles.skillPill}>{s}</span>
                ))}
              </div>
              {resumeData.education?.length > 0 && (
                <>
                  <div style={styles.sectionLabel}>Education</div>
                  {resumeData.education.map((edu, i) => (
                    <div key={i} style={styles.eduItem}>
                      <div style={styles.expTitle}>{edu.degree}</div>
                      <div style={styles.expCompany}>{edu.institution}{edu.year && ` · ${edu.year}`}</div>
                    </div>
                  ))}
                </>
              )}
              {resumeData.certifications?.length > 0 && (
                <>
                  <div style={styles.sectionLabel}>Certifications</div>
                  {resumeData.certifications.map((c, i) => (
                    <div key={i} style={styles.expCompany}>· {c}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div style={styles.rightCol}>
          <ChatPanel resumeData={resumeData} />
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #070b14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  centered: {
    minHeight: "100vh", background: "#070b14",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 16, fontFamily: "'DM Mono', monospace",
  },
  spinner: {
    width: 36, height: 36,
    border: "2px solid rgba(0,245,160,0.2)",
    borderTop: "2px solid #00f5a0",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingLabel: { color: "#00f5a0", fontSize: 14, margin: 0 },
  errorLabel:   { color: "#f87171", fontSize: 14, margin: 0 },
  backBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "8px 16px", color: "#8892a4",
    fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace",
  },
  dashboard: {
    minHeight: "100vh", background: "#070b14",
    fontFamily: "'Syne', sans-serif", position: "relative",
  },
  grid: {
    position: "fixed", inset: 0,
    backgroundImage: `linear-gradient(rgba(0,245,160,0.025) 1px, transparent 1px),linear-gradient(90deg, rgba(0,245,160,0.025) 1px, transparent 1px)`,
    backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0,
  },
  nav: {
    position: "sticky", top: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 24px", background: "rgba(7,11,20,0.9)",
    backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navBrand:    { display: "flex", alignItems: "center", gap: 8 },
  navIcon:     { color: "#00f5a0", fontSize: 16 },
  navName:     { color: "#00f5a0", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  navCenter:   { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  personName:  { color: "#f0f0f0", fontSize: 14, fontWeight: 700 },
  viewingBadge:{ fontSize: 11, color: "#f59e0b", fontFamily: "'DM Mono', monospace" },
  navActions:  { display: "flex", gap: 8, alignItems: "center" },
  shareBtn: {
    background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.25)",
    borderRadius: 8, padding: "6px 14px", color: "#00f5a0",
    fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
  },
  resetBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "6px 14px", color: "#4a5568",
    fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace",
  },
  urlBar: {
    position: "relative", zIndex: 1, padding: "8px 24px",
    background: "rgba(0,245,160,0.04)", borderBottom: "1px solid rgba(0,245,160,0.08)",
    fontSize: 12, fontFamily: "'DM Mono', monospace",
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  },
  urlLabel: { color: "#3d4a5c" },
  urlValue:  { color: "#00f5a0", fontWeight: 700 },
  urlHint:   { color: "#2d3748", fontSize: 11 },
  main: {
    position: "relative", zIndex: 1,
    display: "grid", gridTemplateColumns: "1fr 420px",
    gap: 20, padding: "20px 24px",
    maxWidth: 1400, margin: "0 auto",
  },
  leftCol:  { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  rightCol: { display: "flex", flexDirection: "column" },
  card: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "20px", overflow: "hidden",
  },
  cardLabel: { fontSize: 11, fontWeight: 700, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 },
  summaryText: { color: "#8892a4", fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: "'DM Mono', monospace", fontWeight: 300 },
  tabRow:      { display: "flex", gap: 4 },
  tabBtn: {
    padding: "8px 16px", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
    color: "#4a5568", fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
  },
  tabBtnActive: { background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)", color: "#00f5a0" },
  expItem:     { marginBottom: 4 },
  expHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  expTitle:    { color: "#e2e8f0", fontSize: 14, fontWeight: 700 },
  expCompany:  { color: "#6366f1", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 2 },
  expDuration: { color: "#3d4a5c", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0, marginLeft: 12 },
  bullets:     { margin: "0 0 8px", paddingLeft: 16 },
  bullet:      { color: "#6b7280", fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontWeight: 300, marginBottom: 4 },
  divider:     { height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" },
  sectionLabel:{ fontSize: 11, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "20px 0 10px", fontWeight: 700 },
  skillsGrid:  { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  skillPill:   { background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#a5b4fc", fontFamily: "'DM Mono', monospace" },
  eduItem:     { marginBottom: 10 },
};
