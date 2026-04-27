// gemini.js — AI calls using Groq API (free, no billing required)
// Model: llama-3.3-70b-versatile — fast, smart, free tier
// Groq free tier: 14,400 requests/day, no credit card needed

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Get API key — from sessionStorage (user's own key) or .env (your dev key)
const getApiKey = () =>
    sessionStorage.getItem("groq_api_key") ||
    import.meta.env.VITE_GROQ_API_KEY ||
    "";

// ── Helper: call Groq ─────────────────────────────────────────────────────────
// Groq uses the OpenAI-compatible API format — very simple
async function callGroq(systemPrompt, userMessage, temperature = 0.7) {
    const key = getApiKey();
    if (!key) throw new Error("No API key found. Please enter your Groq API key.");

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: MODEL,
            temperature,
            max_tokens: 2048,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Groq API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

// ── Helper: multi-turn chat ───────────────────────────────────────────────────
async function callGroqChat(systemPrompt, history, temperature = 0.8) {
    const key = getApiKey();
    if (!key) throw new Error("No API key found. Please enter your Groq API key.");

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: MODEL,
            temperature,
            max_tokens: 2048,
            messages: [
                { role: "system", content: systemPrompt },
                // Convert our message format to OpenAI format
                // Our format: { role: "user"|"model", parts: [{ text }] }
                // Groq format: { role: "user"|"assistant", content: string }
                ...history.map(m => ({
                    role: m.role === "model" ? "assistant" : "user",
                    content: Array.isArray(m.parts) ? m.parts[0].text : m.content,
                })),
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `Groq API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

// ── PUBLIC FUNCTION 1: parseResume ───────────────────────────────────────────
export async function parseResume(rawText) {
    const systemPrompt = `You are a precise resume parser. Extract information and return ONLY valid JSON — no markdown, no code fences, no explanation. Just raw JSON.`;

    const userMessage = `Parse this resume and return a JSON object with exactly this structure:
{
  "name": "full name",
  "email": "email or null",
  "phone": "phone or null",
  "location": "city/country or null",
  "summary": "professional summary in 2-3 sentences (write one if not present)",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "date range",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year or null"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "what it does",
      "tech": ["tech1", "tech2"]
    }
  ],
  "certifications": ["cert1", "cert2"]
}

Resume text:
${rawText}`;

    const raw = await callGroq(systemPrompt, userMessage, 0.3);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
}

// ── PUBLIC FUNCTION 2: chat ───────────────────────────────────────────────────
export async function chat(resumeData, history, mode = "general") {
    const resumeContext = JSON.stringify(resumeData, null, 2);

    const systemPrompts = {
        general: `You are an expert career coach and resume advisor. You have access to the following resume:

${resumeContext}

Answer questions about this person's background honestly and helpfully. Be specific — reference their actual experience, skills, and projects. Be concise but insightful.`,

        rewrite: `You are an elite resume writer. You have access to this resume:

${resumeContext}

When given a bullet point, rewrite it to:
1. Start with a strong action verb
2. Include a quantifiable metric if possible
3. Show impact, not just responsibility
4. Be one concise sentence under 20 words

Always give 2-3 rewritten versions for the user to choose from.`,

        interview: `You are a tough but fair technical interviewer. You are interviewing the candidate whose resume is:

${resumeContext}

Ask ONE behavioral or technical question at a time, personalised to their actual experience. After they answer, give specific feedback referencing their resume. Start by introducing yourself and asking the first question.`,
    };

    return await callGroqChat(systemPrompts[mode], history);
}

// ── PUBLIC FUNCTION 3: deAIify ────────────────────────────────────────────────
export async function deAIify(text, resumeData) {
    const systemPrompt = `You are an expert at making AI-generated text sound genuinely human. Preserve meaning but eliminate robotic patterns.`;

    const userMessage = `Make this resume text sound more authentic and human while keeping it professional. Remove buzzwords, use concrete language, natural rhythm.

Context: ${resumeData.name}, skills: ${resumeData.skills?.slice(0, 3).join(", ")}

Text to humanize:
"${text}"

Return only the humanized version, no explanation.`;

    return await callGroq(systemPrompt, userMessage);
}

// ── PUBLIC FUNCTION 4: analyseResume ─────────────────────────────────────────
export async function analyseResume(resumeData) {
    const systemPrompt = `You are a brutally honest senior recruiter with 15 years experience. Score resume bullets with zero fluff. Return ONLY valid JSON — no markdown, no explanation.`;

    const bullets = resumeData.experience.flatMap((exp) =>
        (exp.bullets || []).map((bullet) => ({
            company: exp.company,
            title: exp.title,
            bullet,
        }))
    );

    const userMessage = `Score each resume bullet point.

Return a JSON object with EXACTLY this structure:
{
  "overallScore": <number 0-100>,
  "summary": "<2 sentence honest assessment>",
  "bullets": [
    {
      "original": "<exact bullet text>",
      "company": "<company name>",
      "title": "<job title>",
      "score": "<strong OR weak OR critical>",
      "reason": "<one specific sentence why>",
      "rewrite": "<improved version with action verb and metric>"
    }
  ]
}

Scoring:
- STRONG: strong action verb + measurable metric + clear impact
- WEAK: missing one of: metric, strong verb, or clear impact
- CRITICAL: vague, passive voice, zero specifics, filler

Bullets:
${JSON.stringify(bullets, null, 2)}`;

    const raw = await callGroq(systemPrompt, userMessage, 0.3);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
}