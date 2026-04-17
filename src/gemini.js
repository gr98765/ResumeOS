// gemini.js — All Gemini API calls live here
// We use two models strategically to save free-tier quota:
//   Flash-Lite → fast, cheap, used for parsing (called once, cached)
//   Flash       → smarter, used for chat (called per message)

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ─── Helper: raw POST to Gemini ───────────────────────────────────────────────
// This is the core function all three public functions use under the hood.
// model: which Gemini model to use
// systemPrompt: the "role" / instructions we give the AI
// userMessage: what the user (or we) are asking
async function callGemini(model, systemPrompt, userMessage) {
    const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;

    const body = {
        // systemInstruction gives the AI its "personality" for this call
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        contents: [
            {
                role: "user",
                parts: [{ text: userMessage }],
            },
        ],
        generationConfig: {
            temperature: 0.7,      // 0 = robotic/deterministic, 1 = creative/random
            maxOutputTokens: 2048, // max length of response (~1500 words)
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Gemini API error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    // Gemini returns text nested inside candidates → content → parts → text
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Helper: multi-turn chat POST to Gemini ───────────────────────────────────
// Same as above but supports full conversation history for the chat panel
async function callGeminiChat(model, systemPrompt, history) {
    const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;

    const body = {
        systemInstruction: {
            parts: [{ text: systemPrompt }],
        },
        // history is an array of { role: "user"|"model", parts: [{ text }] }
        contents: history,
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Gemini API error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── PUBLIC FUNCTION 1: parseResume ───────────────────────────────────────────
// Takes raw text extracted from the PDF.
// Returns a structured JavaScript object with all resume sections.
// Uses Flash-LITE (cheaper, faster) since this is a one-time extraction.
export async function parseResume(rawText) {
    const systemPrompt = `You are a precise resume parser. Extract information from the resume text and return ONLY valid JSON — no markdown, no code fences, no explanation. Just the raw JSON object.`;

    const userMessage = `Parse this resume and return a JSON object with exactly this structure:
{
  "name": "full name",
  "email": "email address or null",
  "phone": "phone or null",
  "location": "city/country or null",
  "summary": "professional summary in 2-3 sentences (write one if not present)",
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "date range",
      "bullets": ["achievement 1", "achievement 2", ...]
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

    const raw = await callGemini(
        "gemini-2.5-flash-lite-preview-06-17", // cheapest free model — saves quota
        systemPrompt,
        userMessage
    );

    // Gemini sometimes wraps JSON in ```json ... ``` even when told not to.
    // This strips that out safely.
    const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

    return JSON.parse(cleaned);
}

// ─── PUBLIC FUNCTION 2: chat ───────────────────────────────────────────────────
// Powers the main chat panel. Takes:
//   resumeData: the parsed JSON object (injected as context)
//   history: array of past messages in Gemini format
//   mode: "general" | "rewrite" | "interview"
// Returns the AI's response string.
export async function chat(resumeData, history, mode = "general") {
    const resumeContext = JSON.stringify(resumeData, null, 2);

    const systemPrompts = {
        general: `You are an expert career coach and resume advisor. You have access to the following resume data:

${resumeContext}

Answer questions about this person's background honestly and helpfully. Be specific — reference their actual experience, skills, and projects. Be concise but insightful. If asked to improve something, give a concrete rewritten version.`,

        rewrite: `You are an elite resume writer specializing in making bullet points impactful. You have access to this resume:

${resumeContext}

When given a bullet point or job description, rewrite it to:
1. Start with a strong action verb
2. Include a quantifiable metric if possible (estimate if not given: "~X%", "team of N")
3. Show impact, not just responsibility
4. Be one concise sentence under 20 words

Always give 2-3 rewritten versions for the user to choose from.`,

        interview: `You are a tough but fair technical interviewer. You are interviewing the candidate whose resume is:

${resumeContext}

Ask ONE behavioral or technical interview question at a time, personalized to their actual experience and skills. After they answer, give specific feedback referencing their resume. Then ask the next question. Start by introducing yourself and asking the first question.`,
    };

    // Use the smarter Flash model for chat (better reasoning)
    return await callGeminiChat(
        "gemini-2.5-flash",
        systemPrompts[mode],
        history
    );
}

// ─── PUBLIC FUNCTION 3: deAIify ───────────────────────────────────────────────
// Takes AI-generated or generic resume text and makes it sound human again.
// This is our UNIQUE differentiator — no other tool does this.
export async function deAIify(text, resumeData) {
    const systemPrompt = `You are an expert at making AI-generated text sound genuinely human and personal. Your job is to preserve the meaning but eliminate robotic patterns.`;

    const userMessage = `The following text is from a resume but sounds too AI-generated, generic, or corporate. 

Make it sound more authentic and human while keeping it professional. Use:
- Specific, concrete language (not vague buzzwords)
- Natural sentence rhythm (not perfectly parallel structure)
- First-person voice where appropriate
- Real impact over hollow claims

Context about this person: ${resumeData.name}, working in ${resumeData.skills?.slice(0, 3).join(", ")}

Text to humanize:
"${text}"

Return only the humanized version, no explanation.`;

    return await callGemini("gemini-2.5-flash", systemPrompt, userMessage);
}

// ─── PUBLIC FUNCTION 4: analyseResume ─────────────────────────────────────────
// Scores every bullet point in the resume as strong / weak / critical.
// Returns structured JSON with overall score, per-bullet scores, reasons, rewrites.
export async function analyseResume(resumeData) {
    const systemPrompt = `You are a brutally honest senior recruiter and career coach with 15 years experience. 
You score resume bullet points with zero fluff. Return ONLY valid JSON — no markdown, no explanation, just raw JSON.`;

    // Flatten all bullets with their context
    const bullets = resumeData.experience.flatMap((exp) =>
        (exp.bullets || []).map((bullet) => ({
            company: exp.company,
            title: exp.title,
            bullet,
        }))
    );

    const userMessage = `Score each resume bullet point honestly.

Return a JSON object with EXACTLY this structure:
{
  "overallScore": <number 0-100>,
  "summary": "<2 sentence honest assessment of this resume overall>",
  "bullets": [
    {
      "original": "<exact bullet text copied from input>",
      "company": "<company name>",
      "title": "<job title>",
      "score": "<strong OR weak OR critical>",
      "reason": "<one specific sentence explaining why this score>",
      "rewrite": "<improved version — start with action verb, add metric, show impact>"
    }
  ]
}

Scoring criteria:
- STRONG: has strong action verb + measurable metric/result + clear business impact
- WEAK: missing ONE of: metric, strong action verb, or clear impact — still salvageable  
- CRITICAL: vague language, passive voice, zero specifics, or pure filler with no value

Overall score guide:
- 80-100: Most bullets are strong, clear metrics throughout
- 60-79: Mixed quality, some strong but gaps
- 40-59: Mostly weak, needs significant work
- 0-39: Critical issues throughout

Bullets to score:
${JSON.stringify(bullets, null, 2)}`;

    const raw = await callGemini(
        "gemini-2.5-flash",
        systemPrompt,
        userMessage
    );

    const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

    return JSON.parse(cleaned);
}