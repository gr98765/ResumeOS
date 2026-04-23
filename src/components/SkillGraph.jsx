// SkillGraph.jsx — Interactive D3 force-directed skill graph
// Takes the parsed resume skills array and draws them as connected nodes.
// Nodes repel each other but are connected by "gravity" links.

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

export default function SkillGraph({ skills = [], experience = [] }) {
    const svgRef = useRef(null);
    const [selectedSkill, setSelectedSkill] = useState(null);

    useEffect(() => {
        if (!skills.length || !svgRef.current) return;

        // ── Step 1: Build graph data from skills 
        // We create "nodes" (each skill) and "links" (connections between related skills)
        // Skills are grouped by category for coloring
        const categories = categorizeSkills(skills);

        const nodes = skills.map((skill, i) => ({
            id: skill,
            category: categories[skill] || "other",
            size: Math.random() * 6 + 14,
        }));

        const links = [];
        const allText = experience.flatMap((e) => e.bullets || []).join(" ").toLowerCase();

        for (let i = 0; i < skills.length; i++) {
            for (let j = i + 1; j < skills.length; j++) {
                const a = skills[i].toLowerCase();
                const b = skills[j].toLowerCase();
                // If both skills appear in the same job description, link them
                if (allText.includes(a) && allText.includes(b)) {
                    links.push({ source: skills[i], target: skills[j] });
                }
            }
        }

        // If we have few links, add some random ones for visual density
        if (links.length < skills.length / 2) {
            for (let i = 0; i < Math.min(skills.length, 8); i++) {
                const j = (i + 1) % skills.length;
                if (!links.find((l) => l.source === skills[i] && l.target === skills[j])) {
                    links.push({ source: skills[i], target: skills[j] });
                }
            }
        }

        // ── Step 2: Set up SVG canvas 
        const container = svgRef.current.parentElement;
        const W = container.clientWidth || 600;
        const H = 420;

        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3
            .select(svgRef.current)
            .attr("width", W)
            .attr("height", H);

        // ── Step 3: Color scale by category 
        const colorMap = {
            language: "#00f5a0",    // green — programming languages
            framework: "#6366f1",   // indigo — frameworks/libraries
            tool: "#f59e0b",        // amber — tools/platforms
            database: "#ec4899",    // pink — databases
            cloud: "#38bdf8",       // sky — cloud/infra
            soft: "#a78bfa",        // violet — soft skills
            other: "#94a3b8",       // gray — everything else
        };

        // ── Step 4: Create force simulation 
        // d3.forceSimulation makes nodes repel and attract each other physically
        const simulation = d3
            .forceSimulation(nodes)
            .force(
                "link",
                d3
                    .forceLink(links)
                    .id((d) => d.id)
                    .distance(80) // preferred distance between linked nodes
                    .strength(0.3)
            )
            .force("charge", d3.forceManyBody().strength(-120)) // repel each other
            .force("center", d3.forceCenter(W / 2, H / 2)) // pull toward center
            .force("collision", d3.forceCollide().radius((d) => d.size + 8)); // prevent overlap

        // ── Step 5: Draw links (lines between connected skills) ───────────────────
        const link = svg
            .append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "rgba(255,255,255,0.08)")
            .attr("stroke-width", 1);

        // ── Step 6: Draw nodes (skill circles + labels) ───────────────────────────
        const node = svg
            .append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .call(
                // Enable drag behavior
                d3
                    .drag()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x; // fix position while dragging
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null; // release fixed position
                        d.fy = null;
                    })
            )
            .on("click", (event, d) => {
                setSelectedSkill((prev) => (prev === d.id ? null : d.id));
            });

        // Glow circle behind each node
        node
            .append("circle")
            .attr("r", (d) => d.size + 4)
            .attr("fill", (d) => colorMap[d.category] || colorMap.other)
            .attr("opacity", 0.1);

        // Main circle
        node
            .append("circle")
            .attr("r", (d) => d.size)
            .attr("fill", (d) => colorMap[d.category] || colorMap.other)
            .attr("opacity", 0.85)
            .attr("stroke", "rgba(255,255,255,0.15)")
            .attr("stroke-width", 1);

        // Label text
        node
            .append("text")
            .text((d) => d.id)
            .attr("text-anchor", "middle")
            .attr("dy", (d) => d.size + 14)
            .attr("fill", "#c0cad8")
            .attr("font-size", "11px")
            .attr("font-family", "'DM Mono', monospace")
            .attr("pointer-events", "none");

        // ── Step 7: Animate! Each "tick" updates positions ────────────────────────
        simulation.on("tick", () => {
            link
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        // Cleanup: stop simulation when component unmounts
        return () => simulation.stop();
    }, [skills, experience]);

    return (
        <div style={styles.wrapper}>
            <div style={styles.header}>
                <span style={styles.title}>Skill Graph</span>
                {selectedSkill && (
                    <span style={styles.selected}>
                        ◈ {selectedSkill}
                        <button
                            style={styles.clear}
                            onClick={() => setSelectedSkill(null)}
                        >
                            ×
                        </button>
                    </span>
                )}
            </div>

            {/* Legend */}
            <div style={styles.legend}>
                {[
                    ["#00f5a0", "Languages"],
                    ["#6366f1", "Frameworks"],
                    ["#f59e0b", "Tools"],
                    ["#ec4899", "Databases"],
                    ["#38bdf8", "Cloud"],
                ].map(([color, label]) => (
                    <span key={label} style={styles.legendItem}>
                        <span
                            style={{ ...styles.legendDot, background: color }}
                        />
                        {label}
                    </span>
                ))}
            </div>

            <svg ref={svgRef} style={styles.svg} />

            <p style={styles.hint}>Drag nodes · Click to select · Graph updates live</p>
        </div>
    );
}

// ── Skill categorizer ─────────────────────────────────────────────────────────
// Simple keyword-based categorization. Not perfect, but good enough.
function categorizeSkills(skills) {
    const map = {};
    const rules = {
        language: ["python", "javascript", "typescript", "java", "c++", "c#", "go", "rust", "ruby", "swift", "kotlin", "r", "matlab", "scala", "php"],
        framework: ["react", "vue", "angular", "next", "django", "flask", "express", "spring", "rails", "laravel", "fastapi", "tensorflow", "pytorch", "keras", "sklearn"],
        tool: ["git", "docker", "kubernetes", "webpack", "vite", "jest", "figma", "jira", "linux", "bash", "terraform", "ansible"],
        database: ["sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite", "firebase"],
        cloud: ["aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify", "s3", "ec2", "lambda"],
    };

    for (const skill of skills) {
        const s = skill.toLowerCase();
        let found = "other";
        for (const [cat, keywords] of Object.entries(rules)) {
            if (keywords.some((k) => s.includes(k))) {
                found = cat;
                break;
            }
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
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px 0",
    },
    title: {
        fontSize: 13,
        fontWeight: 700,
        color: "#00f5a0",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
    },
    selected: {
        fontSize: 12,
        color: "#6366f1",
        fontFamily: "'DM Mono', monospace",
        display: "flex",
        alignItems: "center",
        gap: 6,
    },
    clear: {
        background: "none",
        border: "none",
        color: "#6366f1",
        cursor: "pointer",
        fontSize: 16,
        padding: 0,
        lineHeight: 1,
    },
    legend: {
        display: "flex",
        gap: 16,
        padding: "12px 20px",
        flexWrap: "wrap",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "#6b7280",
        fontFamily: "'DM Mono', monospace",
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        opacity: 0.85,
        flexShrink: 0,
    },
    svg: {
        width: "100%",
        display: "block",
    },
    hint: {
        textAlign: "center",
        fontSize: 11,
        color: "#2d3748",
        fontFamily: "'DM Mono', monospace",
        padding: "8px 0 14px",
        margin: 0,
    },
};
