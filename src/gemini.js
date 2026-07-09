// gemini.js — All AI calls via Groq API
// Free tier: 14,400 requests/day, no credit card needed
// Model:  "llama3-70b-8192";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "groq/compound";

const getApiKey = () =>
    sessionStorage.getItem("groq_api_key") ||
    import.meta.env.VITE_GROQ_API_KEY ||
    "";

// ── Core fetch helper
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
            max_tokens: 4096,
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

// ── Multi-turn chat helper 
async function callGroqChat(systemPrompt, history, temperature = 0.8) {
    const key = getApiKey();
    if (!key) throw new Error("No API key found.");

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: MODEL,
            temperature,
            max_tokens: 4096,
            messages: [
                { role: "system", content: systemPrompt },
                ...history.map(m => ({
                    role: m.role === "model" ? "assistant" : "user",
                    content: Array.isArray(m.parts) ? m.parts[0].text : (m.content || ""),
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

// ── 1. parseResume ────────────────────────────────────────────────────────────
export async function parseResume(rawText) {
    const sys = `You are a resume parser. You must respond with ONLY a valid JSON object. No text before or after. 
No markdown. No code fences. No explanation. Just the raw JSON object starting with { and ending with }.`;
    const msg = `Parse this resume into exactly this JSON structure:
{
  "name": "full name",
  "email": "email or null",
  "phone": "phone or null",
  "location": "city/country or null",
  "summary": "professional summary 2-3 sentences (write one if missing)",
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
    { "degree": "degree", "institution": "school", "year": "year or null" }
  ],
  "projects": [
    { "name": "name", "description": "what it does", "tech": ["tech1"] }
  ],
  "certifications": ["cert1"]
}

Resume:
${rawText}`;

    const raw = await callGroq(sys, msg, 0.1);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
}

// ── 2. chat — CANDIDATE mode 
export async function chat(resumeData, history, mode = "general") {
    const ctx = JSON.stringify(resumeData, null, 2);

    const systemPrompts = {
        general: `You are a brutally honest career coach. You have this resume:
${ctx}
Be specific, direct, and reference actual experience. Point out real weaknesses. Give actionable advice.`,

        rewrite: `You are an elite resume writer. You have this resume:
${ctx}
When given a bullet point, use the STAR method internally (Situation, Task, Action, Result) to understand it, then compress into ONE powerful bullet that:
1. Starts with a strong action verb (never "Responsible for", never "Worked on")
2. Includes a specific metric or outcome
3. Shows clear business impact
4. Reads naturally — not like AI wrote it
5. Avoids: leveraged, spearheaded, utilized, synergized, cutting-edge

Give 2-3 rewritten versions. Label them by tone: [Concise], [Detailed], [Technical]`,

        interview: `You are a tough but fair technical interviewer. Resume:
${ctx}
Ask ONE question at a time personalised to their actual experience. Reference specific companies, projects, and technologies from their resume. After they answer, give specific honest feedback. Start now.`,
    };

    return await callGroqChat(systemPrompts[mode], history);
}

// ── 3. chat — RECRUITER mode 
export async function recruiterChat(resumeData, history) {
    const ctx = JSON.stringify(resumeData, null, 2);

    const systemPrompt = `You are an AI assistant representing this candidate to a recruiter. You have full access to their resume:

${ctx}

IMPORTANT RULES:
- Be honest — never fabricate skills, experience, or achievements that are not in the resume
- Be professionally framed — acknowledge gaps truthfully but contextualise with strengths and growth
- Answer like a good professional reference would: highlight genuine strengths, contextualise weaknesses
- If asked about weaknesses: acknowledge them honestly, then show evidence of growth from the resume
- If asked about something not in the resume: say "That specific experience isn't detailed in the resume, but..."
- Never say the candidate is perfect or has no weaknesses
- Keep answers concise and recruiter-friendly — they are busy`;

    return await callGroqChat(systemPrompt, history, 0.7);
}

// ── 4. analyseResume — multi-dimension scoring ────────────────────────────────
export async function analyseResume(resumeData) {
    const sys = `You are a brutally honest senior recruiter and ATS expert with 15 years experience. 
Score resume bullets across multiple dimensions. Return ONLY valid JSON.`;

    const bullets = resumeData.experience.flatMap(exp =>
        (exp.bullets || []).map(bullet => ({
            company: exp.company,
            title: exp.title,
            bullet,
        }))
    );

    const msg = `Score each resume bullet across ALL of these dimensions:

1. ACTION VERB — Does it start with a strong past-tense verb? (not "Responsible for", not "Worked on")
2. METRIC — Does it have a measurable number, percentage, or quantifiable result?
3. IMPACT — Does it show business value (saved time, money, users, performance)?
4. SPECIFICITY — Does it name real tech, real teams, real context? (not vague)
5. LENGTH — Is it 15-25 words? (too short = vague, too long = rambling)
6. STAR COMPLETENESS — Does it imply Situation/Task/Action/Result even partially?
7. BUZZWORD PENALTY — Does it use hollow words like leveraged, spearheaded, synergized, utilized?
8. TENSE — Correct past tense for previous roles?

Return EXACTLY this JSON:
{
  "overallScore": <0-100>,
  "summary": "<2 honest sentences about the resume overall>",
  "atsScore": <0-100, how well this would pass ATS screening>,
  "topStrengths": ["strength1", "strength2"],
  "topIssues": ["issue1", "issue2"],
  "bullets": [
    {
      "original": "<exact bullet>",
      "company": "<company>",
      "title": "<title>",
      "score": "<strong|weak|critical>",
      "dimensions": {
        "actionVerb": <true|false>,
        "hasMetric": <true|false>,
        "hasImpact": <true|false>,
        "isSpecific": <true|false>,
        "goodLength": <true|false>,
        "starComplete": <true|false>,
        "hasBuzzwords": <true|false>
      },
      "reason": "<specific one sentence why this score>",
      "starBreakdown": {
        "situation": "<inferred or null>",
        "task": "<inferred or null>",
        "action": "<what they did>",
        "result": "<outcome or null>"
      },
      "rewrite": "<improved STAR-based bullet — natural, human-sounding, no AI buzzwords>"
    }
  ]
}

Scoring logic:
- STRONG: passes 6+ dimensions
- WEAK: passes 3-5 dimensions  
- CRITICAL: passes 0-2 dimensions

Bullets to score:
${JSON.stringify(bullets, null, 2)}`;

    const raw = await callGroq(sys, msg, 0.2);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
}

// ── 5. deAIify — two-pass humaniser 
export async function deAIify(text, resumeData) {
    // Pass 1: identify and fix AI patterns
    const pass1 = await callGroq(
        `You are an expert at detecting and removing AI-generated writing patterns from resumes.`,
        `Rewrite this resume text to sound genuinely human. 

Rules:
- Replace "leveraged" → "used"
- Replace "spearheaded" → "led"  
- Replace "utilized" → "built/ran/used"
- Remove "cutting-edge", "state-of-the-art", "innovative"
- Replace "collaborated cross-functionally" → name actual teams
- Make metrics sound natural not suspiciously precise (47.3% → roughly 50%)
- Use natural sentence rhythm, not perfect parallel structure
- Keep all facts accurate — only change the language

Text: "${text}"

Return only the rewritten text, nothing else.`,
        0.4
    );

    // Pass 2: match the candidate's original voice
    const originalSamples = resumeData.experience
        ?.flatMap(e => e.bullets || [])
        ?.slice(0, 3)
        ?.join(" | ") || "";

    const pass2 = await callGroq(
        `You fine-tune resume text to match a candidate's natural writing voice.`,
        `Here are samples of how this person naturally writes:
"${originalSamples}"

Now adjust this rewritten bullet to match their voice and style more closely — same information, just sounds like THEM:
"${pass1}"

Return only the final text.`,
        0.5
    );

    return pass2;
}
