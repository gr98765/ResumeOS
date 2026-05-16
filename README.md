# ◈ ResumeOS

> AI-powered resume intelligence platform — built by an AI Engineer, for job seekers and recruiters.

Upload a PDF resume and get an interactive skill graph, bullet-level confidence scoring, AI chat with three modes, and a shareable recruiter link with JD matching — all free, all in the browser.

 **Live Demo:** [resumeos.vercel.app](https://resumeos.vercel.app) *(deploy in progress)*  
 **GitHub:** [github.com/gr98765/resumeos](https://github.com/gr98765/resumeos)  

---

## What Makes This Different

Every resume tool does the same thing: ATS score → keyword gap → download. They optimise for robots, not humans.

ResumeOS is built around two insights:
1. **Recruiters need to interact with resumes, not just read them** — shareable link where recruiters can chat with your resume directly, no login required
2. **Bullet quality matters more than keyword density** — 7-dimension scoring with STAR-method rewrites, not vague ATS percentages

---

## Features

### Candidate Dashboard (`/dashboard`)
| Feature | Description |
|---|---|
| **PDF Upload** | Drag & drop — parsed client-side via pdf.js, never leaves your browser |
| **AI Parsing** | Groq Llama 3.3 70B structures your resume into JSON in ~2 seconds |
| **Skill Graph** | D3.js force-directed graph — skills colour-coded by category, physics-based, draggable |
| **Resume Health Score** | Overall score + ATS proxy score across your full resume |
| **Bullet Analyser** | 7-dimension scoring: action verb · metric · impact · specificity · length · STAR · buzzwords |
| **STAR Rewrites** | One-click rewrites using Situation/Task/Action/Result method |
| **AI Chat — Ask Anything** | Career coach mode — honest feedback on your background |
| **AI Chat — Rewrite Bullet** | Paste any bullet, get 3 rewritten versions: Concise / Detailed / Technical |
| **AI Chat — Mock Interview** | Personalised questions based on YOUR actual experience, not generic |
| **Shareable Recruiter Link** | One click → unique URL your recruiter can open, no login needed |

### Recruiter View (`/r/:shareId`)
| Feature | Description |
|---|---|
| **Clean Profile Card** | Name, location, summary, quick stats — no clutter |
| **Skill Graph** | Read-only interactive graph |
| **Experience Timeline** | Full work history with bullets |
| **JD Match Analysis** | Paste any job description → match %, strong matches, gaps, interview focus areas |
| **Recruiter Chat** | Ask anything about the candidate — AI answers honestly but professionally framed |

---

## How the AI Works

### Dual-mode chat (the key differentiator)
```
Candidate asks: "What are my weak points?"
→ Brutally honest: "7 of 12 bullets lack measurable metrics..."

Recruiter asks: "What are their weak points?"  
→ Professionally framed: "Strongest in RAG and LLM systems.
  Cloud deployment experience is still developing, though
  Docker and AWS usage in the LlamaIndex project shows
  practical exposure. Strong fit for a mid-level ML role."

Same truth. Different framing. No fabrication either way.
```

### Bullet scoring — 7 dimensions
```
✓ Action Verb      — strong past-tense verb (not "Responsible for")
✓ Has Metric       — measurable number or percentage  
✓ Has Impact       — business value demonstrated
✓ Specific         — real tech, real teams, real context
✓ Good Length      — 15-25 words
✓ STAR Complete    — implies Situation/Task/Action/Result
✓ No Buzzwords     — no "leveraged", "spearheaded", "utilized"

STRONG = 6-7 dimensions
WEAK   = 3-5 dimensions
CRITICAL = 0-2 dimensions

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast dev, component architecture |
| **Visualization** | D3.js v7 | Force-directed graphs, physics simulation |
| **AI / LLM** | Groq — Llama 3.3 70B | Free tier, ~300ms latency, no billing required |
| **PDF Parsing** | pdf.js (CDN) | Client-side, privacy-first |
| **Database** | Firebase Firestore | Free tier, real-time, anonymous auth |
| **Auth** | Firebase Anonymous Auth | Zero friction — no signup ever |
| **Deployment** | Vercel | Free hobby tier, SPA routing |
| **Cost** | **$0 total** | User-pays API model |

---

## Quick Start

```bash
git clone https://github.com/gr98765/resumeos.git
cd resumeos
npm install
cp .env.example .env
# Fill in your keys (see below)
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

```bash
# Get free Groq key at console.groq.com 
VITE_GROQ_API_KEY=gsk_your_key_here

# Get from console.firebase.google.com → Project Settings → Your apps
VITE_FIREBASE_API_KEY=your_value
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Users of the live app use their own free Groq key** — entered on first load, stored in sessionStorage only, never sent to any server.

---

## Project Structure

```
resumeos/
├── src/
│   ├── components/
│   │   ├── UploadScreen.jsx      # Landing + drag & drop
│   │   ├── SkillGraph.jsx        # D3 force-directed graph
│   │   ├── ChatPanel.jsx         # AI chat — 3 modes (candidate)
│   │   ├── ResumeAnalyser.jsx    # 7-dimension bullet scoring
│   │   ├── RecruiterView.jsx     # Clean recruiter interface
│   │   ├── JDMatcher.jsx         # Job description match analysis
│   │   └── ApiKeyGate.jsx        # Groq key input screen
│   ├── App.jsx                   # Routing: /dashboard vs /r/:id
│   ├── gemini.js                 # All Groq AI calls
│   ├── pdfParser.js              # Client-side PDF extraction
│   └── firebase.js               # Firestore save/load/auth
├── index.html
├── vercel.json                   # SPA routing fix
├── .env.example
└── README.md
```

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

In Vercel dashboard → Settings → Environment Variables → add all 5 keys from `.env`.

```bash
vercel --prod
```

## Portfolio Signal

This project demonstrates:
- **Prompt engineering** — structured JSON output from LLM, multi-stage pipelines, dual-mode system prompts
- **RAG pattern** — resume as persistent context, context injection per request
- **Full stack** — React, Firebase, Vercel, client-side PDF processing
- **Data visualization** — D3.js force simulation with physics
- **Product thinking** — identified real market gap, built recruiter-facing feature no competitor has
- **Cost engineering** — zero-cost scaling via user-pays architecture

---

## Open to Collaboration

Future directions:
- Role-specific resume versions (same resume, reframed per role)
- Semantic embedding-based JD matching (beyond LLM comparison)
- University / bootcamp cohort analytics tier
- Chrome extension — highlight any JD, see your match score instantly

---

*Built by Gaurangi Raul · React · Groq · Firebase · D3.js · Vercel · June 2026*