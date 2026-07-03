// RecruiterView.jsx — Clean read-only interface for recruiters
// Accessed via /r/:shareId — no editing tools, no scoring, no interview
// AI chat is honest but professionally framed (recruiter-mode prompt)

import { useState, useRef, useEffect } from "react";
import { recruiterChat } from "../gemini.js";
import SkillGraph from "./SkillGraph.jsx";

export default function RecruiterView({ resumeData, shareId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi! I'm an AI assistant for ${resumeData.name}'s resume. Ask me anything — their skills, experience, projects, or how they'd fit a specific role.`,
    },
  ]);
  const [input, setInput]     = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const newMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const history = newMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      }));
      const response = await recruiterChat(resumeData, history);
      setMessages(prev => [...prev, { role: "assistant", text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `⚠️ ${err.message}`,
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const quickQuestions = [
    `What are ${resumeData.name.split(" ")[0]}'s strongest skills?`,
    "How many years of experience do they have?",
    "What's their most impressive project?",
    "Would they suit a senior role?",
    "What makes them stand out?",
  ];

  const totalYears = (() => {
    const exp = resumeData.experience || [];
    return exp.length > 0 ? `${exp.length} roles` : "—";
  })();

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <span style={styles.navIcon}>◈</span>
          <span style={styles.navBrand}>ResumeOS</span>
          <span style={styles.navDivider}>|</span>
          <span style={styles.navCandidate}>{resumeData.name}</span>
        </div>
        <div style={styles.recruiterBadge}>👔 Recruiter View</div>
      </nav>

      <main style={styles.main}>
        {/* LEFT — Candidate Info */}
        <div style={styles.leftCol}>

          {/* Hero card */}
          <div style={styles.heroCard}>
            <div style={styles.avatar}>
              {resumeData.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div style={styles.heroInfo}>
              <div style={styles.heroName}>{resumeData.name}</div>
              {resumeData.location && <div style={styles.heroMeta}>📍 {resumeData.location}</div>}
              {resumeData.email && <div style={styles.heroMeta}>✉️ {resumeData.email}</div>}
            </div>
          </div>

          {/* Quick stats */}
          <div style={styles.statsRow}>
            {[
              { label: "Roles", value: resumeData.experience?.length || 0 },
              { label: "Skills", value: resumeData.skills?.length || 0 },
              { label: "Projects", value: resumeData.projects?.length || 0 },
              { label: "Education", value: resumeData.education?.length || 0 },
            ].map((s, i) => (
              <div key={i} style={styles.statCard}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={styles.card}>
            <div style={styles.cardLabel}>Summary</div>
            <p style={styles.summaryText}>{resumeData.summary}</p>
          </div>

          {/* Tabs */}
          <div style={styles.tabRow}>
            {["overview", "graph", "experience"].map(t => (
              <button
                key={t}
                style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
                onClick={() => setActiveTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab: Overview = top skills */}
          {activeTab === "overview" && (
            <div style={styles.card}>
              <div style={styles.cardLabel}>Top Skills</div>
              <div style={styles.skillsGrid}>
                {(resumeData.skills || []).map((s, i) => (
                  <span key={i} style={styles.skillPill}>{s}</span>
                ))}
              </div>

              {resumeData.education?.length > 0 && (
                <>
                  <div style={styles.cardLabel2}>Education</div>
                  {resumeData.education.map((edu, i) => (
                    <div key={i} style={styles.eduItem}>
                      <div style={styles.eduDegree}>{edu.degree}</div>
                      <div style={styles.eduSchool}>{edu.institution}{edu.year && ` · ${edu.year}`}</div>
                    </div>
                  ))}
                </>
              )}

              {resumeData.projects?.length > 0 && (
                <>
                  <div style={styles.cardLabel2}>Notable Projects</div>
                  {resumeData.projects.map((p, i) => (
                    <div key={i} style={styles.projectItem}>
                      <div style={styles.projectName}>{p.name}</div>
                      <div style={styles.projectDesc}>{p.description}</div>
                      <div style={styles.projectTech}>
                        {(p.tech || []).map((t, j) => (
                          <span key={j} style={styles.techTag}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Tab: Skill Graph */}
          {activeTab === "graph" && (
            <SkillGraph
              skills={resumeData.skills || []}
              experience={resumeData.experience || []}
            />
          )}

          {/* Tab: Experience */}
          {activeTab === "experience" && (
            <div style={styles.card}>
              {(resumeData.experience || []).map((exp, i) => (
                <div key={i}>
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
        </div>

        {/* RIGHT — Recruiter Chat */}
        <div style={styles.rightCol}>
          <div style={styles.chatWrapper}>
            <div style={styles.chatHeader}>
              <div style={styles.chatTitle}>Ask about {resumeData.name.split(" ")[0]}</div>
              <div style={styles.chatSubtitle}>AI answers are honest and grounded in the actual resume</div>
            </div>

            {/* Messages */}
            <div style={styles.messages}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  ...styles.msgRow,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  {msg.role === "assistant" && <div style={styles.aiAvatar}>◈</div>}
                  <div style={{
                    ...styles.bubble,
                    ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAI),
                    ...(msg.isError ? styles.bubbleError : {}),
                  }}>
                    {msg.text.split("\n").map((line, j) => (
                      <span key={j}>{line}{j < msg.text.split("\n").length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div style={styles.msgRow}>
                  <div style={styles.aiAvatar}>◈</div>
                  <div style={{ ...styles.bubble, ...styles.bubbleAI }}>
                    <div style={styles.typingDots}>
                      <span style={{ ...styles.dot, animationDelay: "0s" }} />
                      <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                      <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            <div style={styles.quickRow}>
              {quickQuestions.map((q, i) => (
                <button key={i} style={styles.quickBtn} onClick={() => setInput(q)}>
                  {q.length > 38 ? q.slice(0, 38) + "…" : q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={styles.inputRow}>
              <textarea
                style={styles.textarea}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this candidate..."
                rows={2}
                disabled={isTyping}
              />
              <button
                style={{ ...styles.sendBtn, opacity: isTyping || !input.trim() ? 0.4 : 1 }}
                onClick={sendMessage}
                disabled={isTyping || !input.trim()}
              >↑</button>
            </div>
          </div>

          {/* Powered by note */}
          <div style={styles.poweredBy}>
            ◈ ResumeOS · AI answers are grounded in verified resume data only
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #070b14; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes bounce {
          0%,80%,100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#070b14", fontFamily: "'Syne', sans-serif", position: "relative" },
  grid: {
    position: "fixed", inset: 0,
    backgroundImage: `linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)`,
    backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0,
  },
  nav: {
    position: "sticky", top: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 24px",
    background: "rgba(7,11,20,0.9)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navLeft: { display: "flex", alignItems: "center", gap: 10 },
  navIcon: { color: "#00f5a0", fontSize: 16 },
  navBrand: { color: "#00f5a0", fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" },
  navDivider: { color: "#2d3748", fontSize: 16 },
  navCandidate: { color: "#8892a4", fontSize: 13, fontFamily: "'DM Mono', monospace" },
  recruiterBadge: {
    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#a5b4fc",
    fontFamily: "'DM Mono', monospace",
  },
  main: {
    position: "relative", zIndex: 1,
    display: "grid", gridTemplateColumns: "1fr 400px",
    gap: 20, padding: "20px 24px",
    maxWidth: 1400, margin: "0 auto",
  },
  leftCol: { display: "flex", flexDirection: "column", gap: 14, minWidth: 0 },
  rightCol: { display: "flex", flexDirection: "column", gap: 10 },
  heroCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: "50%",
    background: "linear-gradient(135deg, #00f5a0, #6366f1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, fontWeight: 800, color: "#070b14", flexShrink: 0,
  },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: 800, color: "#f0f0f0", marginBottom: 4 },
  heroMeta: { fontSize: 13, color: "#6b7280", fontFamily: "'DM Mono', monospace", marginBottom: 2 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "14px", textAlign: "center",
  },
  statValue: { fontSize: 24, fontWeight: 800, color: "#00f5a0", fontFamily: "'Syne', sans-serif" },
  statLabel: { fontSize: 11, color: "#4a5568", fontFamily: "'DM Mono', monospace", marginTop: 2 },
  card: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "20px", overflow: "hidden",
  },
  cardLabel: { fontSize: 11, fontWeight: 700, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 },
  cardLabel2: { fontSize: 11, fontWeight: 700, color: "#6366f1", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", margin: "20px 0 10px" },
  summaryText: { color: "#8892a4", fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: "'DM Mono', monospace", fontWeight: 300 },
  tabRow: { display: "flex", gap: 6 },
  tab: {
    padding: "8px 16px", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
    color: "#4a5568", fontSize: 12, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
  },
  tabActive: { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" },
  skillsGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  skillPill: {
    background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)",
    borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#00f5a0",
    fontFamily: "'DM Mono', monospace",
  },
  eduItem: { marginBottom: 10 },
  eduDegree: { color: "#e2e8f0", fontSize: 14, fontWeight: 700 },
  eduSchool: { color: "#6366f1", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 2 },
  projectItem: { marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" },
  projectName: { color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 4 },
  projectDesc: { color: "#6b7280", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.5, marginBottom: 6 },
  projectTech: { display: "flex", gap: 6, flexWrap: "wrap" },
  techTag: {
    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#a5b4fc",
    fontFamily: "'DM Mono', monospace",
  },
  expHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  expTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: 700 },
  expCompany: { color: "#6366f1", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 2 },
  expDuration: { color: "#3d4a5c", fontSize: 11, fontFamily: "'DM Mono', monospace", flexShrink: 0 },
  bullets: { margin: "0 0 8px", paddingLeft: 16 },
  bullet: { color: "#6b7280", fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontWeight: 300, marginBottom: 4 },
  divider: { height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" },

  // Chat
  chatWrapper: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
    height: "calc(100vh - 120px)", position: "sticky", top: 76,
  },
  chatHeader: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  chatTitle: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 },
  chatSubtitle: { fontSize: 11, color: "#3d4a5c", fontFamily: "'DM Mono', monospace" },
  messages: { flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 },
  msgRow: { display: "flex", gap: 8, alignItems: "flex-end" },
  aiAvatar: {
    width: 26, height: 26, borderRadius: "50%",
    background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, color: "#a5b4fc", flexShrink: 0,
  },
  bubble: {
    maxWidth: "82%", padding: "10px 14px", borderRadius: 12,
    fontSize: 13, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", fontWeight: 300,
  },
  bubbleUser: {
    background: "rgba(0,245,160,0.1)", border: "1px solid rgba(0,245,160,0.2)",
    color: "#c7ffd8", borderBottomRightRadius: 4,
  },
  bubbleAI: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    color: "#c0cad8", borderBottomLeftRadius: 4,
  },
  bubbleError: { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" },
  typingDots: { display: "flex", gap: 4, alignItems: "center", height: 16 },
  dot: {
    width: 6, height: 6, background: "#6366f1", borderRadius: "50%",
    display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both",
  },
  quickRow: { display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", scrollbarWidth: "none", borderTop: "1px solid rgba(255,255,255,0.04)", flexWrap: "nowrap" },
  quickBtn: {
    background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#6b7280",
    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", flexShrink: 0,
  },
  inputRow: { display: "flex", gap: 8, padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", alignItems: "flex-end" },
  textarea: {
    flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "10px 14px", color: "#c0cad8", fontSize: 13,
    fontFamily: "'DM Mono', monospace", resize: "none", outline: "none", lineHeight: 1.5,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: "50%", background: "#6366f1",
    border: "none", color: "#fff", fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  poweredBy: { textAlign: "center", fontSize: 11, color: "#1e2a3a", fontFamily: "'DM Mono', monospace", padding: "4px 0" },
};
