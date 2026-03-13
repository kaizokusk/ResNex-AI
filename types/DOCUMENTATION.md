# ResearchCollab — Full Codebase Documentation

> AI-Powered Collaborative Research Platform
> STEM AI Hackathon 2026 · IIT Delhi x Microsoft Garage x Imperial College London

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Authentication](#6-authentication)
7. [Pages & Routes](#7-pages--routes)
8. [API Reference](#8-api-reference)
9. [AI Agents](#9-ai-agents)
10. [Real-Time Communication](#10-real-time-communication)
11. [State Management](#11-state-management)
12. [Component Library](#12-component-library)
13. [Key Library Modules](#13-key-library-modules)
14. [Moderation System](#14-moderation-system)
15. [LaTeX Editor](#15-latex-editor)
16. [Paper Library & Discovery](#16-paper-library--discovery)
17. [Belonging & Wellbeing Features](#17-belonging--wellbeing-features)
18. [Getting Started](#18-getting-started)
19. [Scripts](#19-scripts)

---

## 1. Project Overview

ResearchCollab is a full-stack web application that enables small teams of academic researchers (STEM students and faculty) to collaborate on research papers. It combines:

- **Collaborative writing** with a TipTap rich-text editor and section ownership
- **AI assistance** at every stage: topic breakdown, research chat, literature review drafting, bias auditing, section merging, LaTeX generation
- **Paper library & discovery** via arXiv and Semantic Scholar integration with AI-generated structured summaries
- **Real-time group chat** (Firebase Firestore + optional Socket.io) with AI bot (`@researchbot`) and anonymous messaging
- **LaTeX IDE** with Monaco editor, PDF preview, cell-based editor, and multi-user conflict detection
- **Content moderation** with context-aware LLM-based discrimination detection
- **Belonging features**: contribution heatmaps, growth tracker, normalizing panel, milestone toasts, and private reflection space
- **Output pipeline**: AI merge, BERA-compliant methodology disclosure, bias audit, visual summary (Pollinations.ai), PDF/LaTeX export

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v3 + `@tailwindcss/typography` |
| Auth | Clerk (email OTP / magic link) |
| Database | Neon PostgreSQL (serverless) via Prisma ORM |
| Realtime (primary) | Firebase Firestore (group chat) |
| Realtime (secondary) | Socket.io (LaTeX conflict detection, deployed on Render) |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk` |
| LLM fallback | HuggingFace Inference API (`Qwen/Qwen2.5-72B-Instruct`) |
| Image generation | Pollinations.ai (no API key) |
| File uploads | UploadThing |
| Rich text editor | TipTap v2 |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| PDF export | jsPDF + html2canvas (client-side) |
| State management | Zustand |
| Charts | Recharts |
| LaTeX rendering | KaTeX |
| PDF parsing | `pdf-parse` |
| Socket server language | TypeScript / Node.js + Express |

---

## 3. Repository Structure

```
researchcollab/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root → redirects to /dashboard
│   ├── layout.tsx                # Root layout (Clerk provider)
│   ├── globals.css               # Global CSS variables + base styles
│   ├── login/page.tsx            # Email OTP login
│   ├── dashboard/
│   │   ├── layout.tsx            # Dashboard layout
│   │   └── page.tsx              # Dashboard: project list + aggregate stats
│   ├── project/[id]/
│   │   ├── layout.tsx            # Project layout (sidebar, nav)
│   │   ├── page.tsx              # Project overview (members, chat, AI coach)
│   │   ├── chat/page.tsx         # Full-page group chat + agent panel
│   │   ├── discover/page.tsx     # arXiv / Semantic Scholar paper search
│   │   ├── library/page.tsx      # Paper library + AI summaries
│   │   ├── compare/page.tsx      # Side-by-side paper comparison
│   │   ├── agents/page.tsx       # AI agents hub (Q&A, gaps, writer, planner, summarizer)
│   │   ├── review/page.tsx       # Peer review: read sections + comment
│   │   ├── output/page.tsx       # Final output (merged doc, bias audit, visual, credits)
│   │   ├── latex/page.tsx        # LaTeX IDE (file tree + Monaco/Cell editor + PDF preview)
│   │   ├── admin/page.tsx        # Admin panel (members, moderation logs, settings)
│   │   ├── reflect/page.tsx      # Private reflection journal
│   │   └── contributors/page.tsx # Contributor timeline and charts
│   └── api/                      # API routes (all under /app/api/)
│       ├── user/route.ts
│       ├── projects/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── members/route.ts
│       │       ├── members/[memberId]/route.ts
│       │       ├── members/welcome/route.ts
│       │       ├── sections/route.ts
│       │       ├── sections/mine/route.ts
│       │       ├── sections/mine/submit/route.ts
│       │       ├── sections/[sectionId]/comments/route.ts
│       │       ├── sections/[sectionId]/versions/route.ts
│       │       ├── sections/[sectionId]/restore/route.ts
│       │       ├── sections/[sectionId]/quality-check/route.ts
│       │       ├── sections/[sectionId]/hint/route.ts
│       │       ├── chat/route.ts
│       │       ├── chat/planner/route.ts
│       │       ├── chat/summarize/route.ts
│       │       ├── chat/agent-flag/route.ts
│       │       ├── contributorship/route.ts
│       │       ├── contributions/me/route.ts
│       │       ├── moderation/route.ts
│       │       ├── moderation-alerts/route.ts
│       │       ├── moderation-alerts/[alertId]/route.ts
│       │       ├── documents/route.ts
│       │       ├── output/route.ts
│       │       ├── output/pdf/route.ts
│       │       ├── papers/route.ts
│       │       ├── papers/upload/route.ts
│       │       ├── papers/compare/route.ts
│       │       ├── papers/discover/arxiv/route.ts
│       │       ├── papers/discover/semantic-scholar/route.ts
│       │       ├── papers/agents/qa/route.ts
│       │       ├── papers/agents/gaps/route.ts
│       │       ├── papers/agents/writer/route.ts
│       │       ├── papers/[paperId]/tags/route.ts
│       │       ├── latex/files/route.ts
│       │       ├── latex/files/[fileId]/route.ts
│       │       ├── latex/compile/route.ts
│       │       ├── latex/convert/route.ts
│       │       ├── latex/sync/route.ts
│       │       ├── latex/transfer/route.ts
│       │       ├── latex/template/route.ts
│       │       ├── latex/infer/route.ts
│       │       ├── latex/suggest/route.ts
│       │       ├── latex/autofill/route.ts
│       │       ├── streak/route.ts
│       │       ├── streak/nudge/route.ts
│       │       ├── belonging/normalize/route.ts
│       │       ├── belonging/growth/route.ts
│       │       ├── belonging/growth/baseline/route.ts
│       │       ├── milestones/me/route.ts
│       │       ├── milestones/check/route.ts
│       │       ├── reflection/route.ts
│       │       ├── reflection/[entryId]/route.ts
│       │       ├── reflection/[entryId]/share/route.ts
│       │       └── share/classroom/route.ts
│       ├── ai/
│       │   ├── research/route.ts
│       │   ├── merge/route.ts
│       │   ├── bias-audit/route.ts
│       │   ├── visual-summary/route.ts
│       │   ├── moderate/route.ts
│       │   ├── breakdown/route.ts
│       │   ├── methodology/route.ts
│       │   ├── research-search/route.ts
│       │   └── merge/route.ts
│       ├── dashboard/
│       │   ├── stats/route.ts
│       │   └── contributions/route.ts
│       ├── uploadthing/route.ts
│       ├── auth/google/callback/route.ts
│       └── integrations/classroom/courses/route.ts
│
├── components/                   # Reusable React components
│   ├── ui/index.tsx              # Design system (Button, Card, Modal, Badge, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx           # Left nav: project list
│   │   └── PageHeader.tsx        # Page header with tabs and actions
│   ├── workspace/
│   │   ├── TipTapEditor.tsx      # Rich text editor with AI tools
│   │   ├── PersonalResearchAgent.tsx
│   │   ├── VersionHistory.tsx
│   │   ├── CitationPicker.tsx
│   │   ├── CitationWarnings.tsx
│   │   ├── QualityCheck.tsx
│   │   └── SocraticPrompt.tsx
│   ├── chat/
│   │   ├── ChatInput.tsx         # Message input with file attachments + anonymous toggle
│   │   ├── AgentPanel.tsx        # Slide-in panel for @agent actions
│   │   ├── AgentPopover.tsx
│   │   └── AgentResultCard.tsx
│   ├── latex/
│   │   ├── FileTree.tsx          # File navigator
│   │   ├── FileTreeItem.tsx
│   │   ├── MonacoEditor.tsx      # LaTeX code editor
│   │   ├── CellEditor.tsx        # Structured cell-based editor
│   │   ├── PdfPreview.tsx        # Compiled PDF viewer
│   │   ├── TopActionBar.tsx      # Compile, template, convert actions
│   │   ├── ConflictBanner.tsx    # Concurrent edit warning
│   │   ├── WritingProgress.tsx   # Word count progress
│   │   ├── TemplatePicker.tsx
│   │   ├── ConvertButton.tsx
│   │   ├── AddCellButton.tsx
│   │   └── cells/               # Cell types: Text, Heading, Equation, Figure, Table, Citation, Note
│   ├── dashboard/
│   │   ├── AggregateDashboard.tsx
│   │   ├── StreakCard.tsx
│   │   └── ContributionStatus.tsx
│   ├── contributors/
│   │   ├── ContributorsTable.tsx
│   │   ├── ContributionCharts.tsx
│   │   ├── ContributionHeatmap.tsx
│   │   └── Timeline.tsx
│   ├── project/
│   │   └── ModerationAlerts.tsx
│   ├── belonging/
│   │   ├── WelcomeStrip.tsx
│   │   ├── NormalizingPanel.tsx
│   │   ├── GrowthTracker.tsx
│   │   ├── MilestoneMoment.tsx
│   │   ├── MilestoneQueue.tsx
│   │   ├── ReflectionInput.tsx
│   │   └── ReflectionHistory.tsx
│   ├── library/
│   │   ├── TagFilter.tsx
│   │   └── TagInput.tsx
│   └── output/
│       └── ShareToClassroom.tsx
│
├── lib/                          # Backend utilities and services
│   ├── auth.ts                   # getAuthUser() — maps Clerk → DB user
│   ├── claude.ts                 # Claude API wrapper (single-turn, multi-turn, search)
│   ├── llm.ts                    # Pluggable LLM wrapper (Claude / HuggingFace / Ollama)
│   ├── moderation.ts             # Content + context-aware moderation
│   ├── prisma.ts                 # Prisma client singleton
│   ├── firebase.ts               # Firebase Firestore singleton
│   ├── pdf.ts                    # PDF export helpers (jsPDF + html2canvas)
│   ├── pollinations.ts           # Image generation (Pollinations.ai)
│   ├── uploadthing.ts            # UploadThing router setup
│   ├── uploadthingClient.ts      # Client-side upload helpers
│   ├── socket.ts                 # Socket.io client factory
│   ├── semanticSearch.ts         # Vector similarity search (pgvector)
│   ├── embeddings.ts             # Text → embedding via HuggingFace
│   ├── guardrails.ts             # AI response guardrails
│   ├── equation-ocr.ts           # Equation image → LaTeX OCR
│   ├── contribution-events.ts    # Log contribution events
│   ├── cell-types.ts             # Cell type definitions for cell editor
│   ├── latex-assets.ts           # LaTeX asset helpers
│   ├── latex-template-assets.ts  # Template asset helpers
│   ├── sections/version.ts       # Section version snapshot helpers
│   ├── streaks/tracker.ts        # Daily streak calculation
│   ├── citations/
│   │   ├── detector.ts           # Citation gap detection in text
│   │   └── formatter.ts          # IEEE / APA / MLA citation formatting
│   ├── papers/
│   │   └── tagger.ts             # AI paper tagging
│   ├── quality/
│   │   ├── assessor.ts           # Section quality scoring
│   │   └── socraticCoach.ts      # Socratic prompting for section improvement
│   ├── integrations/
│   │   └── googleClassroom.ts    # Google Classroom integration
│   ├── latex-templates/
│   │   └── index.ts              # LaTeX template registry (NeurIPS, IEEE, Generic, etc.)
│   ├── llm/
│   │   ├── internvl.ts           # InternVL multimodal LLM wrapper
│   │   └── deepseek.ts           # DeepSeek LLM wrapper
│   ├── hooks/
│   │   ├── useIntersectionObserver.ts
│   │   └── useMilestoneCheck.ts
│   └── agents/
│       ├── types.ts              # Agent interface (AgentInput / AgentOutput / Agent)
│       ├── index.ts              # Agent registry (ONLY file to edit when adding agents)
│       ├── researchAgent.ts      # Research assistant (web search enabled)
│       ├── mergeAgent.ts         # Section merger
│       ├── biasAgent.ts          # Bias audit
│       ├── paperExplainer.ts     # Paper summarization
│       ├── researchSearchAgent.ts# Literature search agent
│       ├── writerAgent.ts        # Literature review writer
│       ├── plannerAgent.ts       # Task extractor from chat
│       ├── chatSummarizerAgent.ts# Meeting summarizer
│       ├── latexAgent.ts         # LaTeX generation
│       ├── latexConversionAgent.ts
│       ├── latexAutofillAgent.ts
│       ├── transferAgent.ts      # Content → LaTeX transfer
│       ├── orchestratorAgent.ts  # Multi-agent orchestration
│       ├── sectionRouter.ts      # Route content to correct LaTeX section
│       ├── equationAgent.ts      # Math equation handling
│       ├── figureAgent.ts        # Figure generation
│       ├── tableAgent.ts         # Table generation
│       ├── textAgent.ts          # Text processing
│       ├── citationAgent.ts      # Citation extraction
│       └── classifier.ts         # Message intent classification
│
├── store/                        # Zustand global state
│   ├── userStore.ts              # Auth user state
│   ├── projectStore.ts           # Current project state
│   ├── agentStore.ts             # Agent panel state
│   └── latexStore.ts             # LaTeX editor state
│
├── prisma/
│   └── schema.prisma             # Full database schema
│
├── socket-server/
│   ├── index.ts                  # Socket.io server (deploy to Render separately)
│   └── package.json
│
├── types/                        # Shared TypeScript types
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── DOCUMENTATION.md
```

---

## 4. Environment Variables

Copy `env.txt` (or `.env.example`) to `.env.local` and fill in your values.

### Required

| Variable | Description | Source |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection URL | Neon dashboard |
| `DIRECT_URL` | Neon PostgreSQL direct (non-pooled) URL — required for Prisma migrations | Neon dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk secret key | Clerk dashboard |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | Clerk dashboard |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Set to `/login` | — |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Set to `/login` | — |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Set to `/dashboard` | — |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Set to `/dashboard` | — |
| `ANTHROPIC_API_KEY` | Claude API key | Anthropic console |
| `UPLOADTHING_TOKEN` | UploadThing JWT token | UploadThing dashboard |
| `UPLOADTHING_SECRET` | UploadThing secret key | UploadThing dashboard |
| `UPLOADTHING_APP_ID` | UploadThing app ID | UploadThing dashboard |
| `NEXT_PUBLIC_SOCKET_URL` | URL of deployed Socket.io server | Render deploy URL |
| `SOCKET_SECRET` | Shared secret between Next.js and Socket.io server | Generate randomly |

### Firebase (for real-time group chat)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

### Optional / LLM Provider Override

| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | `"anthropic"` \| `"huggingface"` \| `"ollama"` | `"anthropic"` |
| `HUGGINGFACE_KEY` | HuggingFace API key | — |
| `HF_MODEL` | HuggingFace model ID | `"Qwen/Qwen2.5-72B-Instruct"` |
| `OLLAMA_BASE_URL` | Ollama server URL | `"http://localhost:11434"` |
| `OLLAMA_MODEL` | Ollama model name | `"llama3"` |
| `LATEX_COMPILER_URL` | LaTeX online compiler URL | `"https://latexonline.cc"` |

---

## 5. Database Schema

The database is Neon PostgreSQL with the `pgvector` extension (for semantic search on document chunks).

### Enums

| Enum | Values |
|---|---|
| `ProjectStatus` | `draft`, `active`, `review`, `merged`, `done` |
| `MemberRole` | `admin`, `member` |
| `SectionStatus` | `not_started`, `in_progress`, `submitted`, `approved` |
| `LatexFileType` | `CODE`, `IMAGE`, `DATA` |
| `ContributionAction` | `created`, `edited`, `ai_prompted`, `reviewed`, `merged` |
| `ChatContext` | `workspace`, `coach`, `group_chat` |
| `ModerationContext` | `group_chat`, `workspace_chat`, `section`, `comment` |

### Models

#### `User`
Represents a registered researcher.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `clerkId` | String? | Unique Clerk user ID |
| `email` | String | Unique |
| `full_name` | String | |
| `affiliation` | String? | University/org |
| `avatar_url` | String? | Clerk avatar |
| `language` | String | Default `"en"` |
| `created_at` | DateTime | |

#### `Project`
A collaborative research project.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | String | |
| `description` | String | |
| `topic` | String | Research topic for AI context |
| `status` | `ProjectStatus` | Default `draft` |
| `admin_id` | String | FK → User |
| `pdfUrl` | String? | Stored PDF export URL |
| `latexTemplateId` | String? | Selected LaTeX template |
| `teamStreak` | Int | Current contribution streak days |
| `longestStreak` | Int | All-time longest streak |
| `lastStreakDate` | DateTime? | |

#### `ProjectMember`
Many-to-many: User ↔ Project, with role and progress.

| Field | Type | Notes |
|---|---|---|
| `role` | `MemberRole` | `admin` or `member` |
| `assigned_subtopic` | String? | AI coach or admin assigned |
| `section_status` | `SectionStatus` | Member's writing progress |
| `hasSeenWelcome` | Boolean | Welcome strip shown |
| `growthBaselineLiterature/Writing/Discussion/Citations` | Int | Recorded 7 days after join for growth tracking |

#### `Section`
One section per member per project. Stores TipTap JSON.

| Field | Type | Notes |
|---|---|---|
| `content` | String | TipTap rich-text JSON string |
| `word_count` | Int | Updated on save |
| `submitted` | Boolean | Locked once submitted |
| `versions` | Json[] | Array of version snapshots |

#### `ChatMessage`
Persisted to Postgres. Real-time delivery via Firebase Firestore.

| Field | Type | Notes |
|---|---|---|
| `role` | String | `"user"` or `"assistant"` |
| `context` | `ChatContext` | Which chat context |
| `messageType` | String? | `"text"`, `"research_share"`, `"agent_response"` |
| `agentAction` | String? | Action type for agent messages |
| `attachments` | Json | Array of `{ url, type, fileName, size }` |
| `isAnonymous` | Boolean | Hides sender identity from others |

#### `ModerationLog`
Every flagged message written here by `moderateAndLog()`.

#### `ModerationAlert`
Detailed alert for admin review (includes 10-message context window).

| Field | Type | Notes |
|---|---|---|
| `messages` | Json | Last 10 messages as context |
| `severity` | String | `"low"`, `"medium"`, `"high"` |
| `reviewed` | Boolean | Admin has reviewed this |

#### `FinalOutput`
One per project. Stores AI-generated outputs.

| Field | Type | Notes |
|---|---|---|
| `merged_content` | String | AI-merged document |
| `methodology_disclosure` | String | BERA-compliant AI usage statement |
| `bias_audit_report` | String | JSON audit report |
| `visual_summary_url` | String? | Pollinations.ai infographic URL |
| `pdf_url` | String? | Exported PDF URL |

#### `DocumentChunk`
Chunked text from uploaded PDFs with vector embeddings for semantic search.

| Field | Type | Notes |
|---|---|---|
| `embedding` | vector(384) | `pgvector` column for cosine similarity |

#### `Paper`
Research papers imported from arXiv, Semantic Scholar, or uploaded as PDF.

| Field | Type | Notes |
|---|---|---|
| `status` | String | `"pending"`, `"processing"`, `"ready"`, `"failed"` |
| `summary` | Json? | Structured AI summary (problem, methodology, findings, etc.) |
| `tags` | String[] | AI or manually added tags |

#### `LatexDocument`
Stores the structured LaTeX document for a project.

| Field | Type | Notes |
|---|---|---|
| `format` | String | `"IEEE"`, `"ACM"`, `"Generic"` |
| `template` | String | `"neurips"`, `"generic"`, etc. |
| `sections` | Json | `{ sectionName: latexContent }` |
| `figures` | Json[] | `[{ url, caption, sectionUsedIn }]` |
| `citations` | Json[] | `[{ bibKey, title, authors, year, doi }]` |
| `citationStyle` | String | `"ieee"`, `"apa"`, `"mla"` |

#### `LatexFile`
Individual files in the LaTeX file tree (main.tex, sections/*.json, etc.).

#### `AgentPanelItem`
Results from the chat Agent Panel (equations, tables, LaTeX snippets).

#### `DailyContribution`
Used for the contribution heatmap — one record per user per day.

#### `ContributorshipNew`
Detailed attribution: word counts split into `humanWords` and `aiWords`.

#### `MilestoneAchievement`
Tracks which milestone toasts a user has earned (first commit, first submit, etc.).

#### `ReflectionEntry`
Private journal entries. **Never exposed to other users or AI agents.**

---

## 6. Authentication

Auth is handled entirely by **Clerk** using email OTP (no passwords).

### Flow

1. User enters email at `/login`
2. Clerk sends a 6-digit code
3. On verification, Clerk creates a session
4. `lib/auth.ts → getAuthUser()` is called in every API route:
   - Looks up `User` by `clerkId`
   - On first login: fetches Clerk profile, upserts `User` record by email (handles existing users without a `clerkId`)
   - Returns `null` if unauthenticated → API responds `401`

### Usage Pattern

```ts
// Every API route follows this pattern:
const user = await getAuthUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Important:** Always use `getAuthUser()` from `lib/auth.ts`. Never use `auth()` directly in API routes except in the two legacy routes that need the raw Clerk user ID:
- `app/api/projects/[id]/members/route.ts`
- `app/api/projects/[id]/sections/[sectionId]/comments/route.ts`

---

## 7. Pages & Routes

### Public Routes

| Path | Description |
|---|---|
| `/login` | Email OTP sign-in / sign-up |

### Authenticated Routes

| Path | Description |
|---|---|
| `/dashboard` | Project list + aggregate stats (streaks, contributions) |
| `/project/[id]` | Project overview: member cards, AI coach, group chat, contributorship log |
| `/project/[id]/chat` | Full-page group chat with file attachments, anonymous mode, and @agent panel |
| `/project/[id]/discover` | Search arXiv and Semantic Scholar; import to library |
| `/project/[id]/library` | View imported papers, upload PDFs, read AI summaries |
| `/project/[id]/compare` | Select 2+ papers for AI side-by-side comparison matrix |
| `/project/[id]/agents` | AI agents hub: Q&A, Gap Finder, Lit Review Writer, Task Planner, Meeting Summarizer, Personal Research Agent |
| `/project/[id]/review` | Peer review: read submitted sections, add comments |
| `/project/[id]/output` | Final output: merged document, methodology disclosure, bias audit, contributor credits, visual summary, PDF export |
| `/project/[id]/latex` | LaTeX IDE: file tree + Monaco/cell editor + PDF preview |
| `/project/[id]/admin` | Admin panel: invite members, assign subtopics, manage project status, view moderation logs |
| `/project/[id]/reflect` | Private reflection journal (user-only, never shared) |
| `/project/[id]/contributors` | Contributor timeline, charts, attribution breakdown |

---

## 8. API Reference

All routes live under `/app/api/`. All require authentication via `getAuthUser()` unless noted.

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects for current user |
| `POST` | `/api/projects` | Create project; auto-adds creator as `admin` member |
| `GET` | `/api/projects/[id]` | Get single project with members, sections, myRole |
| `PATCH` | `/api/projects/[id]` | Update title, description, topic, or status |
| `DELETE` | `/api/projects/[id]` | Delete project (admin only) |

### Members

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/members` | List all members |
| `POST` | `/api/projects/[id]/members` | Invite member by email |
| `PATCH` | `/api/projects/[id]/members/[memberId]` | Update assigned_subtopic or role |
| `DELETE` | `/api/projects/[id]/members/[memberId]` | Remove member |
| `POST` | `/api/projects/[id]/members/welcome` | Mark welcome strip as seen |

### Sections

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/sections` | Get all submitted sections (for review) |
| `GET` | `/api/projects/[id]/sections/mine` | Get current user's section |
| `POST` | `/api/projects/[id]/sections/mine` | Create or update content |
| `POST` | `/api/projects/[id]/sections/mine/submit` | Lock and submit section |
| `GET/POST` | `/api/projects/[id]/sections/[sectionId]/comments` | Comments on a section |
| `GET` | `/api/projects/[id]/sections/[sectionId]/versions` | Version history |
| `POST` | `/api/projects/[id]/sections/[sectionId]/restore` | Restore a previous version |
| `POST` | `/api/projects/[id]/sections/[sectionId]/quality-check` | AI quality assessment |
| `GET` | `/api/projects/[id]/sections/[sectionId]/hint` | Socratic hint from AI |

### Chat

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/chat` | Load chat history from Postgres |
| `POST` | `/api/projects/[id]/chat` | Send message (runs moderation + optional @researchbot) |
| `POST` | `/api/projects/[id]/chat/planner` | Extract tasks from chat with AI |
| `POST` | `/api/projects/[id]/chat/summarize` | Summarize chat into decisions/action items |
| `POST` | `/api/projects/[id]/chat/agent-flag` | Trigger an agent action from chat |

### Papers

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/papers` | List all papers |
| `POST` | `/api/projects/[id]/papers` | Add paper (from Discover import) |
| `PATCH` | `/api/projects/[id]/papers` | Retry summarization for a paper |
| `POST` | `/api/projects/[id]/papers/upload` | Upload PDF (parses + summarizes) |
| `POST` | `/api/projects/[id]/papers/compare` | AI comparison of selected papers |
| `POST` | `/api/projects/[id]/papers/discover/arxiv` | Search arXiv |
| `POST` | `/api/projects/[id]/papers/discover/semantic-scholar` | Search Semantic Scholar |
| `POST` | `/api/projects/[id]/papers/agents/qa` | Q&A grounded in library (RAG) |
| `POST` | `/api/projects/[id]/papers/agents/gaps` | Find research gaps in library |
| `POST` | `/api/projects/[id]/papers/agents/writer` | Draft literature review |
| `PATCH` | `/api/projects/[id]/papers/[paperId]/tags` | Update paper tags |

### LaTeX

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/latex/files` | List all LaTeX files |
| `POST` | `/api/projects/[id]/latex/files` | Create a new file |
| `GET/PATCH/DELETE` | `/api/projects/[id]/latex/files/[fileId]` | Read/update/delete a file |
| `POST` | `/api/projects/[id]/latex/compile` | Compile LaTeX to PDF |
| `POST` | `/api/projects/[id]/latex/convert` | Convert section content to LaTeX |
| `POST` | `/api/projects/[id]/latex/sync` | Sync merged sections to LaTeX doc |
| `POST` | `/api/projects/[id]/latex/transfer` | Transfer section to LaTeX section |
| `POST` | `/api/projects/[id]/latex/template` | Apply a template |
| `POST` | `/api/projects/[id]/latex/infer` | Infer section names from content |
| `POST` | `/api/projects/[id]/latex/suggest` | AI suggestions for LaTeX content |
| `POST` | `/api/projects/[id]/latex/autofill` | Autofill LaTeX from sections |

### AI Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/research` | Research assistant chat (web search enabled) |
| `POST` | `/api/ai/merge` | Merge all submitted sections (admin only) |
| `POST` | `/api/ai/bias-audit` | Audit merged doc for biased language |
| `POST` | `/api/ai/visual-summary` | Generate Pollinations.ai infographic |
| `POST` | `/api/ai/breakdown` | AI coach subtopic breakdown |
| `POST` | `/api/ai/methodology` | Generate BERA-compliant methodology disclosure |
| `POST` | `/api/ai/moderate` | Moderate a single message |
| `POST` | `/api/ai/research-search` | Semantic research search |

### Output

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/output` | Get final output record |
| `GET` | `/api/projects/[id]/output/pdf` | Get stored PDF URL |

### Moderation

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/moderation` | Get moderation logs (admin only) |
| `GET` | `/api/projects/[id]/moderation-alerts` | Get moderation alerts (admin only) |
| `PATCH` | `/api/projects/[id]/moderation-alerts/[alertId]` | Mark alert as reviewed |

### Contributorship

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/contributorship` | Get contributorship log |
| `GET` | `/api/projects/[id]/contributions/me` | Get current user's contributions |

### Belonging / Wellbeing

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects/[id]/streak` | Get team streak |
| `POST` | `/api/projects/[id]/streak/nudge` | Send streak nudge |
| `GET/POST` | `/api/projects/[id]/belonging/normalize` | Normalizing messages |
| `GET` | `/api/projects/[id]/belonging/growth` | Growth tracker data |
| `POST` | `/api/projects/[id]/belonging/growth/baseline` | Record growth baseline |
| `GET` | `/api/projects/[id]/milestones/me` | Get user's milestones |
| `POST` | `/api/projects/[id]/milestones/check` | Check and award new milestones |
| `GET/POST` | `/api/projects/[id]/reflection` | List/create reflection entries |
| `PATCH/DELETE` | `/api/projects/[id]/reflection/[entryId]` | Update/delete a reflection entry |
| `POST` | `/api/projects/[id]/reflection/[entryId]/share` | Toggle shared status |

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregate stats for dashboard |
| `GET` | `/api/dashboard/contributions` | Contribution summary |

### User

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/user` | Get current user profile |
| `PATCH` | `/api/user` | Update full_name, affiliation |

---

## 9. AI Agents

All agents live in `lib/agents/` and implement the same interface from `lib/agents/types.ts`.

### Interface

```ts
interface AgentInput {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context: Record<string, any>  // project, section, user, language etc.
  language: string
}

interface AgentOutput {
  reply: string
  metadata?: Record<string, any>
}

interface Agent {
  id: string       // unique slug e.g. 'paper-explainer'
  name: string     // display name
  description: string
  run: (input: AgentInput) => Promise<AgentOutput>
}
```

### Registered Agents

| Agent ID | File | Purpose | Used By |
|---|---|---|---|
| `research` | `researchAgent.ts` | Research assistant with web search via Claude | `/api/ai/research`, Personal Research Agent |
| `merge` | `mergeAgent.ts` | Merge multiple sections into a coherent document | `/api/ai/merge` |
| `bias` | `biasAgent.ts` | Detect biased language in merged content | `/api/ai/bias-audit` |
| `paperExplainer` | `paperExplainer.ts` | Summarize a single paper into structured JSON | Paper library processing |
| `research-search` | `researchSearchAgent.ts` | Semantic literature search | `/api/ai/research-search` |
| `writer` | `writerAgent.ts` | Draft literature review from library | `/api/projects/[id]/papers/agents/writer` |
| `planner` | `plannerAgent.ts` | Extract tasks from group chat | `/api/projects/[id]/chat/planner` |
| `chat-summarizer` | `chatSummarizerAgent.ts` | Summarize chat into meeting notes | `/api/projects/[id]/chat/summarize` |
| `latex` | `latexAgent.ts` | Generate LaTeX from section content | LaTeX sync/convert routes |
| `transfer` | `transferAgent.ts` | Transfer prose to LaTeX section | LaTeX transfer route |

### Adding a New Agent

1. Create `lib/agents/myNewAgent.ts` implementing the `Agent` interface
2. Register it in `lib/agents/index.ts` — that is the only other file that changes

### LLM Provider

Agents call `callClaude()` or `callClaudeMultiTurn()` from `lib/claude.ts`. The system also has a pluggable `lib/llm.ts` that can route to HuggingFace or Ollama depending on `LLM_PROVIDER` env variable. Moderation uses `callLLM()` from `lib/llm.ts`.

#### Claude Configuration (`lib/claude.ts`)
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** `4096`
- **Web search:** `callClaudeWithSearch()` uses the `web_search_20250305` tool
- **Language support:** Appends a language instruction when `language !== 'en'`

---

## 10. Real-Time Communication

### Firebase Firestore (Group Chat)

The primary real-time mechanism for the group chat.

**How it works:**
1. When a user sends a message, it is saved to **Postgres** via the API route (for persistence and moderation)
2. The client also writes to **Firestore** at `projects/{projectId}/messages` (for real-time delivery)
3. All clients subscribe to Firestore via `onSnapshot` — new messages are appended to state in real time
4. On page load, history is fetched from Postgres; Firestore only delivers messages *after* page load (using `loadTimeRef`)
5. Firebase config in `lib/firebase.ts`

**Implemented in:** `app/project/[id]/page.tsx` (mini chat) and `app/project/[id]/chat/page.tsx` (full page)

### Socket.io (LaTeX Conflict Detection)

A separate Node.js Express server deployed independently (e.g., on Render).

**Location:** `socket-server/index.ts`
**Port:** `3001` (or `process.env.PORT`)

**Events emitted by clients:**

| Event | Payload | Description |
|---|---|---|
| `join_project` | `projectId` | Join a project room |
| `leave_project` | `projectId` | Leave a project room |
| `chat_message` | `{ projectId, message }` | Broadcast a chat message |
| `typing_start` | `{ projectId, userName }` | Show typing indicator |
| `typing_stop` | `{ projectId }` | Hide typing indicator |
| `section_update` | `{ projectId, memberId, status }` | Broadcast section status change |
| `latex_editing` | `{ projectId, fileId }` | Signal editing a LaTeX file |
| `latex_idle` | `{ projectId, fileId }` | Signal stopped editing |

**Events received by clients:**

| Event | Description |
|---|---|
| `new_message` | New chat message from another user |
| `user_typing` | Another user is typing |
| `user_stopped_typing` | Another user stopped typing |
| `member_status_changed` | Section status update |
| `latex_file_updated` | Another user saved a LaTeX file |
| `latex_editing` | Another user is editing a file |
| `latex_idle` | Another user stopped editing |
| `user_joined` | New user joined the room |
| `user_left` | User left the room |

---

## 11. State Management

Zustand stores are used for global client state.

### `userStore.ts` — Auth User

```ts
{ user: User | null, isLoaded: boolean }
```

### `projectStore.ts` — Current Project

```ts
{
  currentProject, members, mySection, allSections,
  contributorshipLogs, groupChatMessages,
  isLoadingProject, isLoadingSection, isSavingSection
}
```

### `agentStore.ts` — Agent Panel

Tracks whether the agent panel is open and the list of agent results (`AgentPanelItem[]`) for the current session.

### `latexStore.ts` — LaTeX Editor

```ts
{
  files: LatexFile[],        // all files in the project
  activeFileId: string | null,
  setFiles, upsertFile, setActiveFileId
}
```

---

## 12. Component Library

All base UI components are in `components/ui/index.tsx`.

### Design Tokens

The UI uses a dark color scheme with CSS custom properties defined in `app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0c10` | Page background |
| `--color-surface` | `#12151c` | Card/modal background |
| `--color-border` | `#1a1f2e` | Subtle borders |
| `--color-border-2` | `#252a38` | Standard borders |
| `--color-text` | `#e8eaf0` | Primary text |
| `--color-muted` | `#7a839a` | Secondary text |
| `--color-accent` | `#4f8ef7` | Primary blue |
| `--color-violet` | `#7c6af5` | AI / agents purple |
| `--color-success` | `#3ecf8e` | Success green |
| `--color-warning` | `#f59e0b` | Warning amber |
| `--color-error` | `#ef4444` | Error red |

### Base Components

| Component | Props | Description |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `icon` | Primary action button |
| `Card` | `className` | Dark surface container |
| `Modal` | `open`, `onClose`, `title` | Centered overlay dialog |
| `Input` | `label`, standard HTML input props | Labeled text input |
| `Textarea` | `label`, `rows` | Labeled textarea |
| `Select` | `label`, `options` | Labeled dropdown |
| `Avatar` | `name`, `src`, `size` | User avatar with fallback initials |
| `Badge` | `color` | Inline status/label tag |
| `StatusPill` | `status` | Section status indicator pill |
| `ProgressBar` | `value`, `max`, `label`, `color` | Horizontal progress bar |
| `Spinner` | `size`, `color` | Loading spinner |
| `EmptyState` | `title`, `description`, `action` | Empty content placeholder |
| `ToastProvider` | — | Renders toast notifications (mount once per page) |
| `useToast()` | — | Hook: `{ success, error, toast }` |

---

## 13. Key Library Modules

### `lib/auth.ts` — `getAuthUser()`

Maps Clerk session to database `User`. Auto-creates user on first login via email upsert.

### `lib/claude.ts` — Claude API

Three exported functions:
- `callClaude(systemPrompt, userMessage, language)` — single-turn
- `callClaudeMultiTurn(systemPrompt, messages, language)` — multi-turn chat
- `callClaudeWithSearch(systemPrompt, messages, language)` — with web search tool

Also exports `parseJsonResponse<T>(raw)` to strip markdown code fences from JSON responses.

### `lib/llm.ts` — Pluggable LLM

Routes to Claude, HuggingFace, or Ollama based on `LLM_PROVIDER`. Used by moderation and some utility agents so they are not hard-coupled to Claude.

### `lib/moderation.ts`

Two-tier moderation:
1. `moderateContent()` — single-message check
2. `moderateWithContext()` — context-aware check using last 10 messages (detects patterns, coordinated harassment)
3. `moderateAndLog()` — convenience wrapper: moderate + write `ModerationLog` if flagged
4. `moderateWithContextAndAlert()` — context moderate + write `ModerationLog` + `ModerationAlert` for admin

### `lib/pollinations.ts`

Image generation via Pollinations.ai (free, no API key). Three functions:
- `generateImageUrl(prompt, options)` — returns stable URL
- `generateVisualSummary({ topic, mergedContent })` — academic infographic
- `generateWorkspaceImage(userPrompt)` — workspace image generator

### `lib/pdf.ts`

Client-side PDF export (lazy-imported, never used in API routes):
- `exportElementAsPdf(elementId, filename)` — captures DOM element via html2canvas
- `exportHtmlAsPdf(htmlContent, filename)` — renders HTML in offscreen div
- `exportTexFile(latexContent, filename)` — downloads `.tex` file

### `lib/semanticSearch.ts`

Uses `pgvector` cosine similarity to find relevant document chunks from the user's uploaded PDFs. Powers the library Q&A agent (RAG).

### `lib/embeddings.ts`

Text → 384-dimension embedding vector using HuggingFace sentence transformers.

### `lib/sections/version.ts`

Section version snapshots — stores a copy in the `versions` JSON array whenever a section is saved.

### `lib/streaks/tracker.ts`

Calculates daily contribution streaks by querying `DailyContribution` records.

### `lib/citations/detector.ts` and `formatter.ts`

Detects missing or malformed citations in section text and formats references in IEEE/APA/MLA style.

### `lib/quality/assessor.ts` and `socraticCoach.ts`

Quality scoring rubric for sections; Socratic prompting to guide students toward stronger writing without giving answers.

---

## 14. Moderation System

Every user-generated message (chat, comments, section content) goes through moderation before saving.

### How It Works

1. API route calls `moderateAndLog()` with the message content and context
2. The LLM checks for: discrimination (gender, caste, religion, race, disability, socioeconomic), harassment, personal attacks, hate speech
3. If flagged (`pass: false`):
   - Response to client: HTTP `422` with `{ message: "..." }` (never saved to DB)
   - `ModerationLog` row written to DB
4. For group chat: `moderateWithContextAndAlert()` is used instead — it analyzes the last 10 messages together to detect patterns, and creates a `ModerationAlert` that admins can review

### Academic Context

- Critique of **ideas** is allowed
- Personal attacks on **people** are not
- The LLM is instructed to be strict but fair

### Admin Review

- Moderation alerts appear in the project overview under the **Moderation** panel tab (admin-only)
- Full alert history is also in `/project/[id]/admin` → Moderation tab
- Each alert shows: flagged message, last 10 messages as context, severity (`low`/`medium`/`high`), and a "Mark Reviewed" action

---

## 15. LaTeX Editor

Located at `/project/[id]/latex`. Three-column layout:

```
[ File Tree (w-52) ] | [ Monaco / Cell Editor (flex-1) ] | [ PDF Preview (w-560) ]
```

### File Tree (`components/latex/FileTree.tsx`)

- Lists all `LatexFile` records for the project
- Supports creating new files, renaming, deleting
- Files with path `sections/*.json` open in the **Cell Editor**; all others open in **Monaco Editor**

### Monaco Editor (`components/latex/MonacoEditor.tsx`)

- Full LaTeX syntax highlighting
- Emits `latex_editing` / `latex_idle` Socket.io events on focus/blur
- Auto-saves on blur

### Cell Editor (`components/latex/CellEditor.tsx`)

- Structured block-based editing (like Notion cells)
- Cell types: `text`, `heading`, `equation`, `figure`, `table`, `citation`, `note`
- Each cell has an AI fill button (`CellAIFillButton`) that calls `/api/projects/[id]/latex/autofill`

### PDF Preview (`components/latex/PdfPreview.tsx`)

- Compiles via `POST /api/projects/[id]/latex/compile`
- The compile route calls the `LATEX_COMPILER_URL` (latexonline.cc or self-hosted)

### Top Action Bar (`components/latex/TopActionBar.tsx`)

Actions: Compile, Download PDF, Download .tex, Change Template, Convert sections, Sync from merged doc, LaTeX suggestions

### Conflict Detection

If another team member is editing the same file, a `ConflictBanner` appears at the top of the editor with their name and file name.

### Writing Progress (`components/latex/WritingProgress.tsx`)

Shows word count progress for the current file relative to a target.

---

## 16. Paper Library & Discovery

### Discover (`/project/[id]/discover`)

- Toggle between **arXiv** and **Semantic Scholar**
- Search returns up to 15 results
- Each result can be imported to the project library (deduplication check via arXiv ID/DOI)
- Routes: `POST /api/projects/[id]/papers/discover/arxiv` and `/semantic-scholar`

### Library (`/project/[id]/library`)

- Left sidebar: list of all papers with status badges
- Right panel: paper detail with abstract + structured AI summary
- Upload PDF: `POST /api/projects/[id]/papers/upload` — parses PDF text, chunks it, generates embeddings, creates AI summary
- Status lifecycle: `pending` → `processing` → `ready` | `failed`
- Polls every 8 seconds for status changes
- AI Summary structure: `summary_short`, `problem_statement`, `methodology`, `datasets`, `findings`, `limitations`, `keywords`

### Paper Comparison (`/project/[id]/compare`)

- Select 2 or more papers with `status === 'ready'`
- `POST /api/projects/[id]/papers/compare` returns:
  - `narrative_summary` — prose overview
  - `comparison_matrix` — per-paper values for dimensions: `problem_addressed`, `methodology`, `datasets`, `findings`, `limitations`, `novelty`

### Agents (`/project/[id]/agents`)

| Agent Tab | Route | Description |
|---|---|---|
| Personal Research Agent | Embedded component | Chat with Claude + arXiv search + web search |
| Q&A with Citations | `/papers/agents/qa` | RAG over library chunks, answers cite sources |
| Gap Finder | `/papers/agents/gaps` | Synthesizes all ready papers to identify unexplored areas |
| Lit Review Writer | `/papers/agents/writer` | Drafts a literature review section with references |
| Meeting Summarizer | `/chat/summarize` | Summarizes group chat into decisions, action items, open questions |
| Task Planner | `/chat/planner` | Extracts tasks from group chat; supports manual tasks + volunteer/assign |

---

## 17. Belonging & Wellbeing Features

These features address researcher isolation and self-doubt common in collaborative academic work.

### Welcome Strip (`components/belonging/WelcomeStrip.tsx`)

- Shown once per member when they join a project
- Marked seen via `POST /api/projects/[id]/members/welcome`

### Normalizing Panel (`components/belonging/NormalizingPanel.tsx`)

- Displays rotating "normalizing messages" that acknowledge common research struggles
- Powered by `/api/projects/[id]/belonging/normalize`

### Growth Tracker (`components/belonging/GrowthTracker.tsx`)

- Tracks a member's skill growth in: Literature, Writing, Discussion, Citations
- Baseline is recorded 7 days after joining (stored in `ProjectMember`)
- Current metrics compared to baseline to show improvement
- Routes: `/belonging/growth`, `/belonging/growth/baseline`

### Contribution Heatmap (`components/contributors/ContributionHeatmap.tsx`)

- GitHub-style heatmap of daily contributions
- Powered by `DailyContribution` records
- Shows relative activity density per day

### Milestone Toasts (`components/belonging/MilestoneMoment.tsx`)

- Celebratory toast notifications for first contributions, word count milestones, first submission, etc.
- Backend: `POST /api/projects/[id]/milestones/check` — run after any contribution event
- Uses `useMilestoneCheck` hook; queued via `MilestoneQueue`

### Streak System

- Team streaks tracked in `Project.teamStreak` / `longestStreak`
- Individual daily contributions tracked in `DailyContribution`
- Nudge route: `POST /api/projects/[id]/streak/nudge` — sends encouragement message

### Private Reflection Space (`/project/[id]/reflect`)

- A personal journal with rotating daily prompts
- **Strictly private** — no API endpoint ever returns another user's entries
- Entries can optionally be shared (only owner controls)
- Routes: `GET/POST /api/projects/[id]/reflection`

---

## 18. Getting Started

### Prerequisites

- Node.js >= 20
- A Neon PostgreSQL database
- A Clerk application (enable email code auth)
- An Anthropic API key
- A Firebase project (Firestore enabled)
- An UploadThing account

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd researchcollab

# 2. Install dependencies
npm install

# 3. Set up environment
cp env.txt .env.local
# Fill in all required values in .env.local

# 4. Generate Prisma client
npm run db:generate

# 5. Push schema to database
npm run db:push
# OR for production migrations:
npm run db:migrate

# 6. Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Socket Server (Optional but recommended for LaTeX collaboration)

```bash
cd socket-server
npm install
npx ts-node index.ts
```

Deploy to Render (or any Node host) and set `NEXT_PUBLIC_SOCKET_URL` to its URL.

---

## 19. Scripts

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Start Next.js in development mode |
| Production build | `npm run build` | Build for production |
| Start production | `npm run start` | Start production server |
| Lint | `npm run lint` | ESLint |
| Generate Prisma client | `npm run db:generate` | Re-run after schema changes |
| Push schema | `npm run db:push` | Push schema directly (development only) |
| Run migrations | `npm run db:migrate` | Deploy pending migrations (production) |
| Prisma Studio | `npm run db:studio` | Visual DB browser |
| Seed database | `npm run db:seed` | Run `prisma/seed.ts` |

---

*Documentation generated from full codebase analysis — March 2026.*
