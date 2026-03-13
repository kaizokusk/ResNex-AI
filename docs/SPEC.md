# ResearchCollab — Spec-Driven Development Specification

> Version: 1.0 | Stack: Next.js 16 App Router · Clerk · Neon/PostgreSQL · Prisma · Socket.io · Claude API · Uploadthing

---

## 1. System Overview

ResearchCollab is a multi-user collaborative research paper writing platform. Multiple team members each own one section of a shared research paper. An AI layer (Claude) assists at every stage: writing, research, moderation, merging, and output generation.

### Core Loop
```
Admin creates project → Members join → Each writes their section
→ Admin reviews & approves → Final output merged → Export
```

### Tech Boundaries
| Layer | Tech |
|---|---|
| Frontend | Next.js 16 App Router, Tailwind CSS |
| Auth | Clerk (magic link), `getAuthUser()` wrapper in `lib/auth.ts` |
| Database | Neon PostgreSQL via Prisma ORM |
| AI | Claude Sonnet via `lib/llm.ts` · `callLLM()` / `callLLMVision()` |
| Realtime | Socket.io server (separate `socket-server/`, deployed to Render) |
| File Uploads | Uploadthing — `lib/uploadthing.ts` + `/api/uploadthing` |
| Search | pgvector embeddings via `lib/semanticSearch.ts` |
| Image Gen | Pollinations.ai via `lib/pollinations.ts` |

---

## 2. Data Models

### 2.1 User
```
id            UUID PK
clerkId       String unique (Clerk user ID)
email         String unique
full_name     String
affiliation   String?
avatar_url    String?
language      String default "en"
created_at    DateTime
```

### 2.2 Project
```
id            UUID PK
title         String
description   String
topic         String
status        Enum: draft | active | review | merged | done
admin_id      FK → User
teamStreak    Int
longestStreak Int
lastStreakDate DateTime?
created_at    DateTime
```

### 2.3 ProjectMember
```
id              UUID PK
project_id      FK → Project
user_id         FK → User
role            Enum: admin | member
assigned_subtopic String?
section_status  Enum: not_started | in_progress | submitted | approved
joined_at       DateTime

UNIQUE(project_id, user_id)
```

### 2.4 Section
```
id           UUID PK
project_id   FK → Project
member_id    FK → User
subtopic     String
content      String  (TipTap rich text JSON)
word_count   Int
submitted    Boolean
submitted_at DateTime?
updated_at   DateTime
versions     Json[]  (version history snapshots)

UNIQUE(project_id, member_id)
```

### 2.5 ChatMessage
```
id            UUID PK
project_id    FK → Project
user_id       FK → User (nullable for AI messages)
role          "user" | "assistant"
content       String
context       Enum: workspace | coach | group_chat
messageType   "text" | "research_share" | "agent_response"
agentAction   String?
agentResult   String?
agentStatus   String?
targetSection String?
attachments   Json[]  [{url, type, fileName, size}]
created_at    DateTime
```

### 2.6 Paper (Research Library)
```
id        UUID PK
projectId FK → Project
title     String
authors   String[]
abstract  String?
year      Int?
arxivId   String?
doi       String?
url       String?
fileUrl   String?  (Uploadthing PDF)
status    "pending" | "processing" | "ready" | "failed"
summary   Json?    (structured summary from AI)
tags      String[]
createdAt DateTime
updatedAt DateTime
```

### 2.7 AgentPanelItem
```
id            UUID PK
projectId     FK → Project
userId        FK → User
action        "summarize" | "compare" | "analyze_image" | "add_to_library" | "describe_data"
sourceMessage String
result        String
context       Json[]  (previous items for chaining)
targetSection String?
sharedToChat  Boolean
addedToLatex  Boolean
createdAt     DateTime
```

### 2.8 FinalOutput
```
id                     UUID PK
project_id             FK → Project UNIQUE
merged_content         String
methodology_disclosure String
bias_audit_report      String
visual_summary_url     String?
pdf_url                String?
generated_at           DateTime
```

### 2.9 ModerationLog / ModerationAlert
```
ModerationLog:
  id, content, user_id, project_id
  context: group_chat | workspace_chat | section | comment
  reason, timestamp

ModerationAlert:
  id, projectId, reportedUserId, adminId
  messages Json  (last 10 messages)
  flaggedMsg, reason
  severity: "low" | "medium" | "high"
  reviewed Boolean
  createdAt DateTime
```

### 2.10 ContributorshipNew
```
id, projectId, userId, sectionName?
wordCount, humanWords, aiWords
action, details?
createdAt
INDEX(projectId, userId)
```

### 2.11 DocumentChunk (RAG)
```
id, projectId, memberId
fileName, fileUrl, chunkIndex
content, embedding vector(384)
createdAt
```

### 2.12 DailyContribution (Streaks)
```
id, projectId, userId, date
actions String[]
UNIQUE(projectId, userId, date)
```

---

## 3. Pages & Routes

### 3.1 Page Map
| Route | File | Auth | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | No | Landing / redirect |
| `/login` | `app/login/page.tsx` | No | Clerk magic link |
| `/dashboard` | `app/dashboard/page.tsx` | Yes | Project list |
| `/project/[id]` | `app/project/[id]/page.tsx` | Member | Overview |
| `/project/[id]/chat` | `...chat/page.tsx` | Member | Group chat |
| `/project/[id]/review` | `...review/page.tsx` | Admin | Review sections |
| `/project/[id]/output` | `...output/page.tsx` | Member | Final output |
| `/project/[id]/admin` | `...admin/page.tsx` | Admin | Settings |
| `/project/[id]/library` | `...library/page.tsx` | Member | Paper library |
| `/project/[id]/agents` | `...agents/page.tsx` | Member | Agent dashboard |
| `/project/[id]/contributors` | `...contributors/page.tsx` | Member | Contributorship |
| `/project/[id]/compare` | `...compare/page.tsx` | Member | Section compare |
| `/project/[id]/discover` | `...discover/page.tsx` | Member | Research discover |

### 3.2 Shared Nav Tabs (all project pages)
Every project page renders the same nav:
```
Overview | Chat | Review | Output | Admin | Library | Agents | Contributors | Compare | Discover
```
No LaTeX tab (removed).

---

## 4. API Contracts

All API routes: `app/api/**`
Auth pattern: every route calls `getAuthUser()` first — returns `null` → 401.

### 4.1 Projects

#### `GET /api/projects`
- Auth: user
- Returns: Project[] (projects where user is a member)

#### `POST /api/projects`
- Auth: user
- Body: `{ title, description, topic }`
- Creates project, adds creator as admin member
- Returns: Project

#### `GET /api/projects/[id]`
- Auth: member
- Returns: Project + members + sections

#### `PATCH /api/projects/[id]`
- Auth: admin
- Body: `{ title?, description?, topic?, status? }`
- Returns: updated Project

#### `DELETE /api/projects/[id]`
- Auth: admin
- Deletes project and all related data

### 4.2 Members

#### `GET /api/projects/[id]/members`
- Auth: member
- Returns: ProjectMember[] with User info

#### `POST /api/projects/[id]/members`
- Auth: admin
- Body: `{ email, role, assigned_subtopic? }`
- Finds user by email, adds as member
- Returns: ProjectMember

#### `PATCH /api/projects/[id]/members/[memberId]`
- Auth: admin
- Body: `{ role?, assigned_subtopic?, section_status? }`
- Returns: updated ProjectMember

#### `DELETE /api/projects/[id]/members/[memberId]`
- Auth: admin
- Removes member from project

### 4.3 Sections

#### `GET /api/projects/[id]/sections`
- Auth: member
- Returns: Section[] for project

#### `GET /api/projects/[id]/sections/mine`
- Auth: member
- Returns: caller's Section for this project

#### `POST /api/projects/[id]/sections/mine/submit`
- Auth: member (section owner)
- Marks section as submitted
- Logs contributorship action
- Returns: updated Section

#### `GET /api/projects/[id]/sections/[sectionId]/versions`
- Auth: member
- Returns: version history array

#### `POST /api/projects/[id]/sections/[sectionId]/restore`
- Auth: section owner
- Body: `{ versionIndex }`
- Restores content from version snapshot
- Returns: updated Section

#### `POST /api/projects/[id]/sections/[sectionId]/hint`
- Auth: member
- Body: `{ content }` (current section text)
- Calls Claude to generate a writing hint
- Returns: `{ hint: string }`

#### `POST /api/projects/[id]/sections/[sectionId]/quality-check`
- Auth: member
- Body: `{ content }`
- Runs quality check agent
- Returns: `{ score, feedback, suggestions }`

#### `GET /api/projects/[id]/sections/[sectionId]/comments`
- Auth: member
- Returns: Comment[] for section

#### `POST /api/projects/[id]/sections/[sectionId]/comments`
- Auth: member
- Body: `{ content }`
- Creates comment, runs moderation
- Returns: Comment

### 4.4 Chat

#### `GET /api/projects/[id]/chat`
- Auth: member
- Query: `?context=group_chat|workspace|coach&limit=50`
- Returns: ChatMessage[]

#### `POST /api/projects/[id]/chat`
- Auth: member
- Body: `{ content, context, attachments? }`
- Runs moderation → saves user message → calls AI → saves AI reply
- Slash commands: `/research <query>`, `/bias`, `/explain`, `/plan`
- Returns: `{ userMessage, aiMessage }`

#### `POST /api/projects/[id]/chat/summarize`
- Auth: member
- Summarizes recent chat history
- Returns: `{ summary: string }`

#### `POST /api/projects/[id]/chat/planner`
- Auth: member
- Body: `{ goal }`
- Runs plannerAgent
- Returns: `{ plan: string }`

#### `GET /api/projects/[id]/chat/agent-flag`
- Auth: member
- Returns: AgentPanelItem[] for current user (desc order)

#### `POST /api/projects/[id]/chat/agent-flag`
- Auth: member
- Body: `{ message, action, targetSection?, attachments? }`
- Valid actions: `summarize | compare | analyze_image | add_to_library | describe_data`
- Routes to orchestratorAgent or direct LLM call
- Returns: AgentPanelItem

#### `PATCH /api/projects/[id]/chat/agent-flag`
- Auth: item owner
- Body: `{ itemId, targetSection?, addedToLatex?, sharedToChat? }`
- Updates AgentPanelItem fields
- Returns: updated AgentPanelItem

### 4.5 Documents (RAG)

#### `POST /api/projects/[id]/documents`
- Auth: member
- Body: `{ fileUrl, fileName, mimeType }`
- Chunks file, generates embeddings, stores in DocumentChunk
- Returns: `{ chunksCreated: number }`

#### `POST /api/projects/[id]/documents/search`
- Auth: member
- Body: `{ query, limit? }`
- Vector similarity search against DocumentChunk
- Returns: `{ chunks: DocumentChunk[] }`

### 4.6 Papers (Research Library)

#### `GET /api/projects/[id]/papers`
- Auth: member
- Returns: Paper[]

#### `POST /api/projects/[id]/papers`
- Auth: member
- Body: `{ title, authors?, abstract?, year?, arxivId?, doi?, url?, fileUrl?, tags? }`
- Returns: Paper

#### `POST /api/projects/[id]/papers/[paperId]/process`
- Auth: member
- Triggers AI summarization of paper (PDF or abstract)
- Updates Paper.status → "ready", Paper.summary
- Returns: updated Paper

#### `DELETE /api/projects/[id]/papers/[paperId]`
- Auth: member
- Deletes paper

### 4.7 Output

#### `GET /api/projects/[id]/output`
- Auth: member
- Returns: FinalOutput | null

#### `POST /api/projects/[id]/output`
- Auth: admin
- Triggers: merge sections → bias audit → visual summary generation
- Creates/updates FinalOutput
- Returns: FinalOutput

### 4.8 Moderation

#### `GET /api/projects/[id]/moderation`
- Auth: admin
- Returns: ModerationLog[]

#### `GET /api/projects/[id]/moderation-alerts`
- Auth: admin
- Returns: ModerationAlert[]

#### `PATCH /api/projects/[id]/moderation-alerts/[alertId]`
- Auth: admin
- Body: `{ reviewed: true }`
- Marks alert as reviewed

### 4.9 Contributorship

#### `GET /api/projects/[id]/contributorship`
- Auth: member
- Returns: ContributorshipNew[] grouped by user

### 4.10 Streak

#### `GET /api/projects/[id]/streak`
- Auth: member
- Returns: `{ teamStreak, longestStreak, lastStreakDate, todayContributed: boolean }`

#### `POST /api/projects/[id]/streak`
- Auth: member
- Body: `{ action }`
- Logs daily contribution, updates streak
- Returns: updated streak data

### 4.11 Share

#### `POST /api/projects/[id]/share`
- Auth: admin
- Body: `{ platform: "classroom" | "link" }`
- Returns: `{ shareUrl: string }`

### 4.12 AI Routes

#### `POST /api/ai/breakdown`
- Auth: user
- Body: `{ topic, memberCount }`
- Splits topic into subtopics for members
- Returns: `{ subtopics: string[] }`

#### `POST /api/ai/methodology`
- Auth: user
- Body: `{ sections: Section[], topic }`
- Generates methodology disclosure statement
- Returns: `{ methodology: string }`

#### `POST /api/ai/research-search`
- Auth: user
- Body: `{ query, projectId }`
- Searches arXiv/semantic scholar, returns papers
- Returns: `{ papers: SearchResult[] }`

### 4.13 Auth Webhook

#### `POST /api/auth/webhook`
- No auth (Clerk SVIX signature verified)
- Events: `user.created` → upsert User record
- Returns: 200

### 4.14 Integrations

#### `POST /api/integrations/zotero`
- Auth: user
- Body: `{ apiKey, userId, collectionId? }`
- Imports papers from Zotero to project library
- Returns: `{ imported: number }`

---

## 5. Agent System

All agents live in `lib/agents/`. The registry in `lib/agents/index.ts` is the ONLY file to edit when adding/removing agents.

### 5.1 Agent Interface
```ts
interface AgentInput {
  message: string
  projectId: string
  userId: string
  attachments?: { url: string; type: string; fileName: string }[]
  context?: any
}

interface AgentOutput {
  reply: string
  result?: string
  action?: string
  metadata?: Record<string, any>
}

interface Agent {
  id: string
  name: string
  description: string
  run: (input: AgentInput) => Promise<AgentOutput>
}
```

### 5.2 Registered Agents
| ID | File | Purpose |
|---|---|---|
| `research` | researchAgent.ts | Literature search + summarize |
| `merge` | mergeAgent.ts | Merge sections into final doc |
| `bias` | biasAgent.ts | Bias audit on final output |
| `paperExplainer` | paperExplainer.ts | Explain paper in simple terms |
| `research-search` | researchSearchAgent.ts | arXiv / semantic search |
| `writer` | writerAgent.ts | Write/improve section content |
| `planner` | plannerAgent.ts | Plan research structure |
| `chat-summarizer` | chatSummarizerAgent.ts | Summarize chat history |

### 5.3 Orchestrator Agent
`lib/agents/orchestratorAgent.ts` — routes @agent panel actions:
- Input: `{ message, attachments, projectId, userId, previousItems, requestedAction }`
- Internally calls sub-agents (summarize → textAgent, compare → researchAgent, etc.)
- Persists result to `AgentPanelItem` via Prisma
- Returns: `{ action, result }`

### 5.4 Specialist Agents (not in registry — called internally)
| File | Purpose |
|---|---|
| `textAgent.ts` | Summarize text/PDFs |
| `citationAgent.ts` | Extract + format citations |
| `equationAgent.ts` | OCR equations from images |
| `figureAgent.ts` | Describe figures |
| `tableAgent.ts` | Parse CSV → structured table |
| `sectionRouter.ts` | Classify which section content belongs to |
| `classifier.ts` | Content classification |

---

## 6. Component Specs

### 6.1 AgentPanel
```
File: components/chat/AgentPanel.tsx
Props: { projectId: string, onShareToChat?: (result, action) => Promise<void> }
State: useAgentStore (isOpen, items, setItems, closePanel)
Behavior:
  - Loads AgentPanelItem[] from GET /api/projects/[id]/chat/agent-flag on open
  - Renders AgentResultCard for each item
  - Empty state: prompt user to type @agent
```

### 6.2 AgentResultCard
```
File: components/chat/AgentResultCard.tsx
Props: { item: AgentPanelItem, projectId: string, onShareToChat? }
State: sharing boolean, expanded boolean
Actions:
  - Expand/collapse result text (truncated at 160 chars)
  - Section dropdown → PATCH targetSection
  - "Share to Chat" → calls onShareToChat + PATCH sharedToChat=true
```

### 6.3 AgentPopover
```
File: components/chat/AgentPopover.tsx
Props: { onSelect: (action) => void, onClose: () => void, fileTypes?: FileType[] }
Behavior:
  - fileTypes=[] → show DEFAULT_ACTIONS [summarize, compare]
  - fileTypes=['image'] → show [analyze_image]
  - fileTypes=['pdf'] → show [summarize, add_to_library, compare]
  - fileTypes=['csv'] → show [describe_data]
```

### 6.4 Dashboard Components
```
components/dashboard/
  ContributionStatus.tsx  — per-member section progress bar
  StreakCard.tsx          — team streak counter + calendar
  ModerationAlerts.tsx    — admin: unreviewed alert count
  ShareToClassroom.tsx    — share project link/Google Classroom
```

### 6.5 Workspace Components
```
components/workspace/
  CitationPicker.tsx      — pick citation from library to insert
  CitationWarnings.tsx    — highlight uncited claims in editor
  PersonalResearchAgent.tsx — inline AI research sidebar
  QualityCheck.tsx        — run quality-check, show score + feedback
  SocraticPrompt.tsx      — AI asks questions to improve writing
  VersionHistory.tsx      — list + restore section versions
```

### 6.6 Output Components
```
components/output/
  — Final merged doc view
  — Bias audit report section
  — Visual summary image
  — PDF export button
```

### 6.7 Library Components
```
components/library/
  — Paper card list
  — Add paper form (manual + arXiv search)
  — Paper detail drawer (summary + tags)
  — Zotero import button
```

### 6.8 Contributors Components
```
components/contributors/
  — Per-user contribution breakdown (words, AI%, human%)
  — ContributorshipLog timeline
  — CRediT taxonomy statement generator
```

---

## 7. State Management

### 7.1 agentStore (Zustand)
```
File: store/agentStore.ts
State:
  isOpen: boolean
  items: AgentPanelItem[]
Actions:
  openPanel()
  closePanel()
  addItem(item)
  setItems(items)
  markSharedToChat(id)
  setTargetSection(id, section)
```

---

## 8. Auth & Authorization Rules

| Action | Required Role |
|---|---|
| Create project | Any authenticated user |
| View project | Project member |
| Edit own section | Section owner (member) |
| Submit section | Section owner |
| Review/approve sections | Admin |
| Manage members | Admin |
| View moderation logs | Admin |
| Generate final output | Admin |
| Access chat | Member |
| Upload files | Member |

Auth implementation: `lib/auth.ts` → `getAuthUser()` returns `User | null`.
Never use `auth()` directly in API routes (except where raw Clerk check is needed).

---

## 9. Moderation Pipeline

Every user-generated message is passed through `moderateAndLog()` from `lib/moderation.ts` before saving.

```
Input: { content, userId, projectId, context }
Steps:
  1. Call Claude to classify: ok | warn | block
  2. If warn/block: create ModerationLog
  3. If severity >= medium: create ModerationAlert for admin
  4. Return: { allowed: boolean, reason?: string }
```

Contexts: `group_chat | workspace_chat | section | comment`

---

## 10. Realtime (Socket.io)

Socket server runs separately at `socket-server/` (deployed to Render).

### Events (Client → Server)
| Event | Payload |
|---|---|
| `join_project` | `{ projectId, userId }` |
| `chat_message` | `{ projectId, message }` |
| `typing_start` | `{ projectId, userId }` |
| `typing_stop` | `{ projectId, userId }` |
| `section_update` | `{ projectId, sectionId, content }` |

### Events (Server → Client)
| Event | Payload |
|---|---|
| `chat_message` | ChatMessage |
| `typing` | `{ userId, isTyping }` |
| `section_updated` | `{ sectionId, content, updatedBy }` |
| `member_joined` | `{ userId }` |

---

## 11. LLM Layer

### `lib/llm.ts` — Primary functions

```ts
callLLM({ system, messages, maxTokens? }): Promise<string>
// Default model: claude-sonnet-4-20250514
// Default maxTokens: 4096

callLLMVision({ imageUrls, textPrompt, system?, maxTokens? }): Promise<string>
// Sends image(s) + text prompt to Claude Vision
```

### `lib/guardrails.ts`
- Wraps LLM calls with input/output safety checks
- Rejects prompts that attempt jailbreaks or off-topic generation

---

## 12. File Upload

Uploadthing integration at `lib/uploadthing.ts` + `app/api/uploadthing/route.ts`.

Supported file types:
- `image` — jpg, png, gif, webp (max 4MB)
- `pdf` — application/pdf (max 16MB)
- `csv` — text/csv (max 2MB)

After upload: URL returned, stored in `ChatMessage.attachments` or `Paper.fileUrl` or `LatexAsset.url`.

---

## 13. Acceptance Criteria Checklist

### Project Lifecycle
- [ ] User can create a project with title/description/topic
- [ ] Admin can add members by email
- [ ] Admin can assign subtopics to members
- [ ] AI can suggest subtopic breakdown (`/api/ai/breakdown`)
- [ ] Project status transitions: draft → active → review → merged → done

### Section Writing
- [ ] Member sees only their own section in write mode
- [ ] TipTap editor auto-saves content
- [ ] Version history saves on each save (max 20 versions)
- [ ] Member can restore any version
- [ ] Word count updates in real time
- [ ] Quality check returns score + suggestions
- [ ] Socratic prompts appear to guide writing
- [ ] Citation picker pulls from project library

### Chat & @Agent
- [ ] Group chat messages are moderated before save
- [ ] Typing indicators work via Socket.io
- [ ] `/research <query>` runs researchAgent and posts result
- [ ] `@agent` with no file → shows summarize/compare options
- [ ] `@agent` with image → analyze_image action
- [ ] `@agent` with PDF → summarize/add_to_library/compare actions
- [ ] `@agent` with CSV → describe_data action
- [ ] Agent results saved to AgentPanel (persists across reload)
- [ ] Agent result can be shared back to chat

### Research Library
- [ ] Member can add paper manually
- [ ] Member can search arXiv from library UI
- [ ] PDF upload → stored in Uploadthing
- [ ] AI generates structured summary for each paper
- [ ] Papers are searchable by title/tags
- [ ] Zotero import works with API key

### Review & Output
- [ ] Admin sees all sections with status
- [ ] Admin can approve/reject sections with comment
- [ ] Final output merge combines all approved sections
- [ ] Bias audit runs on merged content
- [ ] Visual summary image generated via Pollinations
- [ ] PDF export available

### Admin & Moderation
- [ ] Moderation alerts shown to admin with severity
- [ ] Admin can mark alerts as reviewed
- [ ] Admin can remove members
- [ ] Admin can change project status

### Contributorship
- [ ] Every edit/AI prompt/review logs to ContributorshipNew
- [ ] Dashboard shows per-user word count + AI/human ratio
- [ ] CRediT taxonomy statement generated on demand
- [ ] Daily contribution tracked for streak

---

## 14. Environment Variables

```
# Database
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...  (for migrations)

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# File Uploads
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...

# Realtime
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.onrender.com
SOCKET_SECRET=...
```

---

## 15. Out of Scope (Not Building)

- LaTeX editor / compiler (removed, to be rebuilt separately)
- Real-time collaborative editing (sections are single-owner)
- Payment / subscription system
- Email notifications (only in-app)
- Mobile app
