import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function SkillGraph({ skills = [], experience = [] }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (!skills.length || !svgRef.current || !containerRef.current) return;

    const categories = categorizeSkills(skills);
    const nodes = skills.map((skill) => ({
      id: skill,
      category: categories[skill] || "other",
      size: Math.random() * 5 + 13,
    }));

    const links = [];
    const allText = experience.flatMap((e) => e.bullets || []).join(" ").toLowerCase();

    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const a = skills[i].toLowerCase();
        const b = skills[j].toLowerCase();
        if (allText.includes(a) && allText.includes(b)) {
          links.push({ source: skills[i], target: skills[j] });
        }
      }
    }

    if (links.length < skills.length / 2) {
      for (let i = 0; i < Math.min(skills.length, 8); i++) {
        const j = (i + 1) % skills.length;
        if (!links.find((l) => l.source === skills[i] && l.target === skills[j])) {
          links.push({ source: skills[i], target: skills[j] });
        }
      }
    }

    const W = containerRef.current.getBoundingClientRect().width || 640;
    const H = Math.max(500, Math.min(700, skills.length * 24 + 200));

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current).attr("width", W).attr("height", H);

    const colorMap = {
      language: "#00f5a0",
      framework: "#6366f1",
      tool: "#f59e0b",
      database: "#ec4899",
      cloud: "#38bdf8",
      ai: "#a78bfa",
      soft: "#64748b",
      other: "#94a3b8",
    };

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(90).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide().radius((d) => d.size + 20))
      .force("x", d3.forceX(W / 2).strength(0.05))
      .force("y", d3.forceY(H / 2).strength(0.05));

    const link = svg.append("g")
      .selectAll("line").data(links).join("line")
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("g").data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on("click", (_, d) => setSelectedSkill((p) => (p === d.id ? null : d.id)));

    node.append("circle")
      .attr("r", (d) => d.size + 4)
      .attr("fill", (d) => colorMap[d.category] || colorMap.other)
      .attr("opacity", 0.1);

    node.append("circle")
      .attr("r", (d) => d.size)
      .attr("fill", (d) => colorMap[d.category] || colorMap.other)
      .attr("opacity", 0.85)
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1);

    node.append("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.size + 14)
      .attr("fill", "#c0cad8")
      .attr("font-size", "11px")
      .attr("font-family", "'DM Mono', monospace")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      // Hard boundary — nodes never leave the box
      for (const d of nodes) {
        const margin = d.size + 40;
        d.x = Math.max(margin, Math.min(W - margin, d.x));
        d.y = Math.max(margin, Math.min(H - margin - 30, d.y));
      }
      link
        .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [skills, experience]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>Skill Graph</span>
        {selectedSkill && (
          <span style={styles.selected}>
            ◈ {selectedSkill}
            <button style={styles.clear} onClick={() => setSelectedSkill(null)}>×</button>
          </span>
        )}
      </div>

      <div style={styles.legend}>
        {[
          ["#00f5a0", "Languages"],
          ["#6366f1", "Frameworks"],
          ["#f59e0b", "Tools"],
          ["#ec4899", "Databases"],
          ["#38bdf8", "Cloud"],
          ["#a78bfa", "AI/ML"],
        ].map(([color, label]) => (
          <span key={label} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: color }} />
            {label}
          </span>
        ))}
      </div>

      <div ref={containerRef} style={{ width: "100%" }}>
        <svg ref={svgRef} style={{ width: "100%", display: "block" }} />
      </div>

      <div style={styles.explainer}>
        <div style={styles.explainerRow}>
          <span style={styles.explainerItem}>🔵 <strong>Connected nodes</strong> = skills used together in the same role</span>
          <span style={styles.explainerItem}>⚪ <strong>Isolated nodes</strong> = skills mentioned once, not tied to a major project</span>
        </div>
        <div style={styles.explainerRow}>
          <span style={styles.explainerItem}>Drag any node · Click to highlight · Clusters show your strongest skill combinations</span>
        </div>
      </div>
    </div>
  );
}

function categorizeSkills(skills) {
  const map = {};
  const rules = {
    language: ["python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby", "swift", "kotlin", "r", "matlab", "scala", "php", "sql"],
    framework: ["react", "vue", "angular", "next", "django", "flask", "express", "spring", "fastapi", "tensorflow", "pytorch", "keras", "sklearn", "scikit", "llamaindex", "langchain"],
    tool: ["git", "docker", "kubernetes", "webpack", "vite", "jest", "figma", "jira", "linux", "bash", "terraform", "ansible", "cicd", "github"],
    database: ["mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite", "firebase", "qdrant", "pinecone", "chroma"],
    cloud: ["aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify", "s3", "ec2", "lambda"],
    ai: ["llm", "nlp", "rag", "prompt", "embedding", "vector", "openai", "gemini", "groq", "bert", "gpt", "machine learning", "deep learning", "xgboost"],
  };

  for (const skill of skills) {
    const s = skill.toLowerCase();
    let found = "other";
    for (const [cat, keywords] of Object.entries(rules)) {
      if (keywords.some((k) => s.includes(k))) { found = cat; break; }
    }
    map[skill] = found;
  }
  return map;
}

const styles = {
  wrapper: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" },
  title: { fontSize: 13, fontWeight: 700, color: "#00f5a0", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" },
  selected: { fontSize: 12, color: "#6366f1", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 6 },
  clear: { background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 },
  legend: { display: "flex", gap: 14, padding: "12px 20px", flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono', monospace" },
  legendDot: { width: 8, height: 8, borderRadius: "50%", opacity: 0.85, flexShrink: 0 },
  explainer: { padding: "10px 20px 16px", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.04)" },
  explainerRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  explainerItem: { fontSize: 11, color: "#4a5568", fontFamily: "'DM Mono', monospace", lineHeight: 1.6 },
};
