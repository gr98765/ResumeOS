// ChatPanel.jsx — The AI chat interface
// Three modes: General Q&A, Bullet Rewrite, Mock Interview
// Maintains conversation history so Gemini has context of past messages

import { useState, useRef, useEffect } from "react";
import { chat, deAIify } from "../gemini.js";

export default function ChatPanel({ resumeData }) {
  const [mode, setMode] = useState("general"); // "general" | "rewrite" | "interview"
  const [messages, setMessages] = useState([]); // chat history
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When mode changes, reset and show a starter message
  useEffect(() => {
    const starters = {
      general: `Hi! I've read ${resumeData.name}'s resume. Ask me anything — their experience, skills, what makes them stand out, or what they should improve.`,
      rewrite: `Paste any bullet point from the resume and I'll rewrite it to be more impactful, specific, and metrics-driven. Try: "${resumeData.experience?.[0]?.bullets?.[0] || "Led team to deliver project on time"}"`,
      interview: `I'm your interviewer today. I've reviewed your resume and I'm ready to begin.\n\nLet's start: Tell me about yourself and why you're interested in this role. I'll ask follow-up questions based on your actual experience at ${resumeData.experience?.[0]?.company || "your previous company"}.`,
    };

    setMessages([
      {
        role: "assistant",
        text: starters[mode],
      },
    ]);
  }, [mode, resumeData]);

  // ── Send a message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    // Add user message to UI immediately
    const newMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      // Convert our message format to Gemini's format
      // Gemini uses "model" instead of "assistant" for AI messages
      const geminiHistory = newMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      // Call Gemini with the full history + current mode
      const response = await chat(resumeData, geminiHistory, mode);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ Error: ${err.message}. Check your API key and quota.`,
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // Handle Enter key (Shift+Enter for newline)
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Quick prompts based on mode ─────────────────────────────────────────────
  const quickPrompts = {
    general: [
      "What are their strongest skills?",
      "What should they improve?",
      "Write a 30-second pitch for them",
      "What roles would suit them?",
    ],
    rewrite: [
      resumeData.experience?.[0]?.bullets?.[0] || "Led cross-functional team",
      "Responsible for developing features",
      "Worked on improving system performance",
    ],
    interview: [
      "Let me answer that",
      "Can you give me a hint?",
      "Ask me a technical question",
      "Give me feedback on my answers so far",
    ],
  };

  return (
    <div style={styles.wrapper}>
      {/* Mode Tabs */}
      <div style={styles.tabs}>
        {[
          { id: "general", label: "💬 Ask Anything" },
          { id: "rewrite", label: "✏️ Rewrite Bullet" },
          { id: "interview", label: "🎤 Mock Interview" },
        ].map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(mode === tab.id ? styles.tabActive : {}),
            }}
            onClick={() => setMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.msgRow,
              justifyContent:
                msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div style={styles.avatar}>◈</div>
            )}
            <div
              style={{
                ...styles.bubble,
                ...(msg.role === "user"
                  ? styles.bubbleUser
                  : styles.bubbleAssistant),
                ...(msg.isError ? styles.bubbleError : {}),
              }}
            >
              {/* Render newlines as actual line breaks */}
              {msg.text.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.text.split("\n").length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={styles.msgRow}>
            <div style={styles.avatar}>◈</div>
            <div style={{ ...styles.bubble, ...styles.bubbleAssistant }}>
              <div style={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div style={styles.quickPrompts}>
        {(quickPrompts[mode] || []).map((prompt, i) => (
          <button
            key={i}
            style={styles.quickBtn}
            onClick={() => {
              setInput(prompt);
            }}
          >
            {prompt.length > 40 ? prompt.slice(0, 40) + "…" : prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "rewrite"
              ? "Paste a bullet point to rewrite…"
              : mode === "interview"
              ? "Type your answer…"
              : "Ask anything about this resume…"
          }
          rows={2}
          disabled={isTyping}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: isTyping || !input.trim() ? 0.4 : 1,
          }}
          onClick={sendMessage}
          disabled={isTyping || !input.trim()}
        >
          ↑
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        [data-typing] span {
          display: inline-block;
          width: 6px; height: 6px;
          background: #00f5a0;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        [data-typing] span:nth-child(1) { animation-delay: -0.32s; }
        [data-typing] span:nth-child(2) { animation-delay: -0.16s; }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: 520,
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tab: {
    flex: 1,
    padding: "12px 8px",
    background: "none",
    border: "none",
    color: "#4a5568",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Mono', monospace",
    transition: "all 0.15s",
  },
  tabActive: {
    color: "#00f5a0",
    borderBottom: "2px solid #00f5a0",
    background: "rgba(0,245,160,0.04)",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(255,255,255,0.08) transparent",
  },
  msgRow: {
    display: "flex",
    gap: 8,
    alignItems: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(0,245,160,0.1)",
    border: "1px solid rgba(0,245,160,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#00f5a0",
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "80%",
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: "'DM Mono', monospace",
    fontWeight: 300,
  },
  bubbleUser: {
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#c7c9ff",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#c0cad8",
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.2)",
    color: "#f87171",
  },
  typing: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    height: 16,
  },
  quickPrompts: {
    display: "flex",
    gap: 6,
    padding: "8px 12px",
    overflowX: "auto",
    scrollbarWidth: "none",
    borderTop: "1px solid rgba(255,255,255,0.04)",
  },
  quickBtn: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 11,
    color: "#6b7280",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "'DM Mono', monospace",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  inputRow: {
    display: "flex",
    gap: 8,
    padding: "12px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#c0cad8",
    fontSize: 13,
    fontFamily: "'DM Mono', monospace",
    resize: "none",
    outline: "none",
    lineHeight: 1.5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#00f5a0",
    border: "none",
    color: "#070b14",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
};
