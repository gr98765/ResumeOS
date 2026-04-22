// UploadScreen.jsx 

import { useState, useRef } from "react";

export default function UploadScreen({ onFileSelect, isLoading, loadingMsg }) {
    // isDragging
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    // ── Drag event handlers
    function handleDragOver(e) {
        e.preventDefault(); // 
        setIsDragging(true);
    }

    function handleDragLeave() {
        setIsDragging(false);
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        validateAndSelect(file);
    }

    function handleFileInput(e) {
        const file = e.target.files[0];
        validateAndSelect(file);
    }

    function validateAndSelect(file) {
        setError("");
        if (!file) return;
        if (file.type !== "application/pdf") {
            setError("Please upload a PDF file only.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError("File too large. Please use a PDF under 10MB.");
            return;
        }
        onFileSelect(file);
    }

    return (
        <div style={styles.container}>
            {/* Animated background grid */}
            <div style={styles.grid} />

            {/* Floating orbs for depth */}
            <div style={{ ...styles.orb, ...styles.orb1 }} />
            <div style={{ ...styles.orb, ...styles.orb2 }} />

            <div style={styles.content}>
                {/* Logo / Brand */}
                <div style={styles.brand}>
                    <span style={styles.brandIcon}>◈</span>
                    <span style={styles.brandName}>ResumeOS</span>
                </div>

                <h1 style={styles.headline}>
                    Your resume,<br />
                    <span style={styles.accent}>finally understood.</span>
                </h1>

                <p style={styles.subtext}>
                    Upload your PDF. Get a skill graph, AI chat, bullet rewrites,
                    mock interviews — all free, all in your browser.
                </p>

                {/* Drop Zone */}
                {isLoading ? (
                    <div style={styles.loadingBox}>
                        <div style={styles.spinner} />
                        <p style={styles.loadingText}>{loadingMsg}</p>
                    </div>
                ) : (
                    <div
                        style={{
                            ...styles.dropZone,
                            ...(isDragging ? styles.dropZoneActive : {}),
                        }}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            style={{ display: "none" }}
                            onChange={handleFileInput}
                        />
                        <div style={styles.uploadIcon}>
                            {isDragging ? "↓" : "⊕"}
                        </div>
                        <p style={styles.dropText}>
                            {isDragging
                                ? "Release to upload"
                                : "Drop your resume PDF here"}
                        </p>
                        <p style={styles.dropSubText}>or click to browse</p>
                        {error && <p style={styles.errorText}>{error}</p>}
                    </div>
                )}

                {/* Feature pills */}
                <div style={styles.pills}>
                    {["Skill Graph", "AI Chat", "Bullet Rewrite", "Mock Interview", "Recruiter Card"].map(
                        (f) => (
                            <span key={f} style={styles.pill}>
                                {f}
                            </span>
                        )
                    )}
                </div>

                <p style={styles.privacy}>
                    🔒 Your PDF never leaves your browser. Parsed locally with pdf.js.
                </p>
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 30px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

// ── Styles 
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
    },
    grid: {
        position: "absolute",
        inset: 0,
        backgroundImage: `
      linear-gradient(rgba(0,245,160,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,245,160,0.04) 1px, transparent 1px)
    `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
    },
    orb: {
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(80px)",
        pointerEvents: "none",
    },
    orb1: {
        width: 400,
        height: 400,
        background: "radial-gradient(circle, rgba(0,245,160,0.12) 0%, transparent 70%)",
        top: "10%",
        left: "-5%",
        animation: "float1 8s ease-in-out infinite",
    },
    orb2: {
        width: 300,
        height: 300,
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        bottom: "10%",
        right: "5%",
        animation: "float2 10s ease-in-out infinite",
    },
    content: {
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        maxWidth: 560,
        padding: "0 24px",
        animation: "fadeUp 0.7s ease both",
    },
    brand: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginBottom: 40,
    },
    brandIcon: {
        fontSize: 28,
        color: "#00f5a0",
    },
    brandName: {
        fontSize: 18,
        fontWeight: 700,
        color: "#00f5a0",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "'DM Mono', monospace",
    },
    headline: {
        fontSize: "clamp(36px, 6vw, 58px)",
        fontWeight: 800,
        color: "#f0f0f0",
        lineHeight: 1.1,
        margin: "0 0 20px",
        letterSpacing: "-0.02em",
    },
    accent: {
        color: "#00f5a0",
    },
    subtext: {
        fontSize: 16,
        color: "#8892a4",
        lineHeight: 1.7,
        marginBottom: 40,
        fontFamily: "'DM Mono', monospace",
        fontWeight: 300,
    },
    dropZone: {
        border: "1.5px dashed rgba(0,245,160,0.3)",
        borderRadius: 16,
        padding: "44px 32px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        background: "rgba(0,245,160,0.02)",
        marginBottom: 32,
    },
    dropZoneActive: {
        border: "1.5px dashed #00f5a0",
        background: "rgba(0,245,160,0.06)",
        transform: "scale(1.01)",
    },
    uploadIcon: {
        fontSize: 40,
        color: "#00f5a0",
        marginBottom: 12,
        lineHeight: 1,
    },
    dropText: {
        color: "#c0cad8",
        fontSize: 16,
        margin: "0 0 6px",
        fontWeight: 600,
    },
    dropSubText: {
        color: "#4a5568",
        fontSize: 13,
        margin: 0,
        fontFamily: "'DM Mono', monospace",
    },
    errorText: {
        color: "#f87171",
        fontSize: 13,
        marginTop: 12,
    },
    loadingBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "44px 32px",
        marginBottom: 32,
    },
    spinner: {
        width: 36,
        height: 36,
        border: "2px solid rgba(0,245,160,0.2)",
        borderTop: "2px solid #00f5a0",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    loadingText: {
        color: "#00f5a0",
        fontSize: 14,
        fontFamily: "'DM Mono', monospace",
        margin: 0,
    },
    pills: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
        marginBottom: 24,
    },
    pill: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 100,
        padding: "5px 14px",
        fontSize: 12,
        color: "#8892a4",
        fontFamily: "'DM Mono', monospace",
    },
    privacy: {
        fontSize: 12,
        color: "#3d4a5c",
        fontFamily: "'DM Mono', monospace",
    },
};
