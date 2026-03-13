@# Workspace Documentation

This document is a detailed reference for the `researchcollab` workspace. It describes the live application architecture, major user flows, data model, frontend surfaces, backend routes, AI systems, and the main implementation patterns used across the codebase.

It is intended to help a contributor understand how the application actually works before making changes.

## 1. What This Workspace Is

ResearchCollab is an AI-assisted collaborative research-writing platform for student or academic teams.

At a high level, the workspace supports:

- project creation and team membership
- per-member writing responsibility
- real-time group chat
- paper discovery and PDF ingestion
- AI-assisted research, summarization, and writing workflows
- peer review and moderation
- final merged output generation
- a structured LaTeX editor with file tree, preview, and cell-based section authoring

The project is built as a Next.js application with App Router, backed by Prisma and PostgreSQL, with Firebase used for real-time chat and Socket.io used for LaTeX collaboration signaling.

## 2. Core Product Model

The product is organized around a `Project`.

Each project has:

- an admin
- multiple members
- one section per member in the main writing workflow
- group chat history
- uploaded/reference papers
- moderation logs and alerts
- AI-generated outputs
- a LaTeX workspace with files and assets

The intended collaboration loop is:

1. Create a project
2. Invite members
3. Assign subtopics or sections
4. Collect papers and references
5. Discuss in group chat
6. Draft content in sections / LaTeX cells
7. Review and comment
8. Merge into final output
9. Audit and export

## 3. High-Level Tech Stack

### Frontend

- Next.js 16 App Router
- React 18
- Tailwind CSS
- Zustand for client-side state

### Backend

- Next.js route handlers under `app/api`
- Prisma ORM
- PostgreSQL with pgvector

### Auth

- Clerk
- OTP/email-code login

### Realtime

- Firebase Firestore for chat message fanout
- Socket.io for LaTeX edit/conflict events

### AI

- Unified LLM abstraction in `lib/llm.ts`
- Providers supported: Claude, HuggingFace, DeepSeek, Ollama
- Multiple agents in `lib/agents`

### File and document handling

- `pdf-parse` for PDF text extraction
- Uploadthing for user-uploaded chat/files
- pgvector-based semantic search over indexed document chunks

## 4. Repo Structure

The major directories are:

```text
researchcollab/
├── app/
│   ├── api/                  # All server routes
│   ├── dashboard/            # Main landing after login
│   ├── login/                # OTP auth page
│   ├── project/[id]/         # Project-scoped pages
│   ├── globals.css           # Global theme + design tokens
│   └── layout.tsx            # App root layout
├── components/
│   ├── chat/                 # Chat input, agent UI, chat-specific panels
│   ├── contributors/         # Contribution visualizations
│   ├── dashboard/            # Dashboard widgets
│   ├── latex/                # LaTeX IDE, cell editor, file tree, preview
│   ├── layout/               # Sidebar, page header
│   ├── library/              # Paper library filters/tags
│   ├── output/               # Output actions such as share
│   ├── project/              # Project-specific widgets
│   ├── ui/                   # Shared UI primitives
│   └── workspace/            # Rich editor and workspace widgets
├── lib/
│   ├── agents/               # AI agents and orchestration helpers
│   ├── citations/            # Citation formatting/detection
│   ├── quality/              # Quality checks and socratic prompting
│   ├── auth.ts               # Clerk -> DB user resolution
│   ├── embeddings.ts         # PDF extraction and embeddings
│   ├── firebase.ts           # Firestore init
│   ├── llm.ts                # Unified LLM abstraction
│   ├── moderation.ts         # Moderation helpers
│   ├── pdf.ts                # PDF export helpers
│   ├── prisma.ts             # Prisma client singleton
│   └── semanticSearch.ts     # pgvector search
├── prisma/
│   ├── schema.prisma         # Main data model
│   ├── migrations/           # Migration history
│   └── seed.ts               # Optional seed data
├── socket-server/            # Separate Socket.io server
├── store/                    # Zustand stores
├── types/                    # Shared TS types
├── SPEC.md                   # Product/system specification
├── CODEBASE_DOCS.md          # Existing codebase overview
├── UI_DESIGN_CHOICES.md      # UI system documentation
└── README.md                 # Setup and quickstart
```

## 5. Application Shell and Navigation

### Root shell

The root app layout in [app/layout.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/layout.tsx) wraps the application with `ClerkProvider` and imports the global theme.

### Project shell

All project pages are wrapped by [app/project/[id]/layout.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/layout.tsx).

That layout is responsible for:

- loading the user’s visible projects
- rendering the persistent sidebar
- opening the create-project modal
- tracking per-project role labels

### Navigation model

The app uses:

- a persistent left sidebar for project switching
- a page header with tabs for project-specific surfaces

Common project pages include:

- Overview
- Chat
- Discover
- Library
- Compare
- Agents
- Review
- Output
- LaTeX

Some pages also expose Contributors/Admin depending on the surface.

## 6. Authentication and User Bootstrapping

Auth is handled by Clerk.

The login flow lives in [app/login/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/login/page.tsx) and uses email OTP for both sign-in and sign-up.

### Database user resolution

[lib/auth.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/auth.ts) is the main auth bridge.

`getAuthUser()`:

- reads the Clerk user id
- looks up the corresponding `User` row
- creates the DB user on first login if needed
- upserts by email to handle existing records without a `clerkId`

This function is the standard entry point for protected API routes.

## 7. Data Model

The canonical schema is in [prisma/schema.prisma](/home/kaizokugin/Documents/researchcollab-final/researchcollab/prisma/schema.prisma).

### Most important models

#### User

Stores identity, profile information, language, and external auth mapping.

#### Project

Stores the project’s main metadata:

- title
- description
- topic
- workflow status
- admin id
- streak fields
- LaTeX template selection
- output PDF reference

#### ProjectMember

Join table between users and projects.

Also tracks:

- role
- assigned subtopic
- section status

#### Section

Represents a member’s main writing section in the rich-text workflow.

Stores:

- project id
- member id
- subtopic
- content
- word count
- submission state
- version snapshots

#### ChatMessage

Stores project chat messages, including:

- role
- content
- context
- attachments
- agent response metadata

#### Paper

Stores library papers and uploaded/reference PDFs.

Includes:

- metadata fields such as title/authors/year/arXiv/DOI
- file URL if available
- status (`pending`, `processing`, `ready`, `failed`)
- summary JSON
- tags

#### DocumentChunk

Stores chunked extracted text from PDFs, optionally with pgvector embeddings.

This powers semantic retrieval over uploaded/reference documents.

#### FinalOutput

Stores merged paper output, methodology disclosure, bias report, generated visual, and output PDF.

#### ModerationLog and ModerationAlert

Used to:

- log flagged content
- store admin-facing alert context

#### LatexFile and LatexAsset

Used by the LaTeX workspace.

`LatexFile` stores:

- file name
- file type (`CODE`, `IMAGE`, `DATA`)
- code content or asset URL
- `isMain`

`LatexAsset` stores uploaded support material for the LaTeX flow.

## 8. Frontend Surfaces

## 8.1 Dashboard

Implemented in [app/dashboard/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/dashboard/page.tsx).

Responsibilities:

- fetch projects
- select/open a project
- show the empty welcome state
- open project creation wizard
- optionally prompt for profile completion

The dashboard is not analytics-heavy. Its main purpose is orientation and project entry.

## 8.2 Project Overview

Implemented in [app/project/[id]/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/page.tsx).

This page acts as the high-level project hub.

Key responsibilities:

- display members and section status
- show word progress
- expose AI coach for subtopic assignment
- embed a compact group chat
- surface moderation alerts

This page blends project management and quick collaboration access.

## 8.3 Chat

Implemented in [app/project/[id]/chat/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/chat/page.tsx).

Chat combines:

- historical message persistence via Postgres
- real-time updates via Firestore
- attachment uploads
- `@agent` style AI workflows
- moderation gating

Supporting UI components:

- [components/chat/ChatInput.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/chat/ChatInput.tsx)
- [components/chat/AgentPanel.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/chat/AgentPanel.tsx)

The chat page is the primary team communication surface.

## 8.4 Library

Implemented in [app/project/[id]/library/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/library/page.tsx).

Responsibilities:

- list project papers
- upload PDFs
- show AI summaries
- retry or reanalyze failed items
- browse selected paper details

The library acts as the team’s shared research reference surface.

## 8.5 Review

Implemented in [app/project/[id]/review/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/review/page.tsx).

Responsibilities:

- load submitted sections
- render their content for reading
- support threaded comments
- mark sections as reviewed in the client UI

This page is geared toward peer/admin review rather than drafting.

## 8.6 Output

Implemented in [app/project/[id]/output/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/output/page.tsx).

Responsibilities:

- load merged output and contribution logs
- trigger merge generation
- trigger methodology disclosure generation
- trigger bias audit
- trigger visual summary generation
- export the output as PDF
- link into the LaTeX editor

The output page is the end-stage production and export surface.

## 8.7 LaTeX Editor

Implemented in [app/project/[id]/latex/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/latex/page.tsx).

This is one of the most complex surfaces in the app.

It provides:

- a file tree
- a central editor
- a PDF preview
- writing progress
- live collaboration conflict banners
- cell-based section editing for `sections/*.json`
- raw code editing for `.tex` and `.bib`

The editor can switch between:

- `CellEditor` for section JSON notebooks
- `MonacoEditor` for code-like files

The LaTeX surface is effectively a lightweight multi-pane IDE embedded in the product.

## 9. Backend API Structure

All server routes are under `app/api`.

The backend is organized by domain rather than by separate server packages.

### 9.1 Project routes

Examples:

- [app/api/projects/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/route.ts)
- [app/api/projects/[id]/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/[id]/route.ts)

Responsibilities:

- create project
- list accessible projects
- fetch/update project details

### 9.2 Member routes

Responsibilities:

- invite/add members
- remove members
- update member metadata such as assigned subtopic

### 9.3 Section routes

Responsibilities:

- fetch all sections
- fetch current user’s section
- submit section
- restore versions
- comments
- quality checks and hints

### 9.4 Chat routes

Example:

- [app/api/projects/[id]/chat/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/[id]/chat/route.ts)

Responsibilities:

- return recent group chat history
- store new messages
- moderate messages
- detect `@researchbot`/agent mentions
- trigger relevant AI agent actions

### 9.5 Paper routes

Examples:

- [app/api/projects/[id]/papers/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/[id]/papers/route.ts)
- [app/api/projects/[id]/papers/upload/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/[id]/papers/upload/route.ts)

Responsibilities:

- list papers
- import metadata-based papers
- upload PDFs directly
- run background indexing and summarization
- retry failed processing

### 9.6 Output and AI routes

Examples:

- `/api/ai/merge`
- `/api/ai/bias-audit`
- `/api/ai/methodology`
- `/api/ai/visual-summary`

Responsibilities:

- merge sections into a final document
- analyze bias
- generate disclosure text
- generate supporting media

### 9.7 LaTeX routes

Examples:

- `/api/projects/[id]/latex/files`
- `/api/projects/[id]/latex/convert`
- `/api/projects/[id]/latex/compile`
- `/api/projects/[id]/latex/suggest`
- `/api/projects/[id]/latex/infer`
- `/api/projects/[id]/latex/autofill`

Responsibilities:

- file CRUD
- section JSON to LaTeX conversion
- preview and compile support
- section-level AI suggestions
- figure/table inference
- per-cell AI autofill

## 10. AI and Agent System

The AI layer is centralized in [lib/llm.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/llm.ts).

### `callLLM()`

This is the main abstraction for text-generation calls.

It supports multiple providers based on env configuration:

- `claude`
- `huggingface`
- `deepseek`
- `ollama`

### `callLLMVision()`

Used when image inputs are needed.

### Agent registry

Agents are registered in [lib/agents/index.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/agents/index.ts).

Examples include:

- research agent
- merge agent
- bias agent
- writer agent
- planner agent
- paper explainer
- research-search agent
- latex agent
- transfer agent

### Research search agent

[lib/agents/researchSearchAgent.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/agents/researchSearchAgent.ts) is important because it combines:

- project-aware semantic retrieval
- live web search when current information is needed
- arXiv search
- contextual LLM synthesis

### Writing assistant helpers

The section suggestion logic in `lib/agents/writingAssistantAgent.ts` creates structured cell output for section authoring.

### LaTeX autofill

The per-cell LaTeX autofill behavior is implemented in `lib/agents/latexAutofillAgent.ts` and its API route.

Its job is to fill exactly one cell using:

- the cell’s current text
- nearby section context
- other section summaries
- LaTeX file-tree context
- indexed document chunks
- available project papers

## 11. Document Processing and Semantic Search

Document ingestion is implemented in [lib/embeddings.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/embeddings.ts).

### Pipeline

1. Fetch PDF
2. Extract text
3. Chunk into overlapping windows
4. Generate embeddings using HuggingFace inference
5. Store chunks in `document_chunks`

### Retrieval

[lib/semanticSearch.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/semanticSearch.ts) embeds the query and runs a pgvector similarity search over indexed chunks.

This retrieval path is used by AI assistants that need grounded context from project documents.

## 12. Moderation System

Implemented in [lib/moderation.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/moderation.ts).

There are two main moderation modes:

### Single-message moderation

Used outside of threaded group-chat context.

Checks for:

- discrimination
- harassment
- hate speech

### Context-aware moderation

Used for group chat.

Checks the last message in the context of recent history to identify:

- discriminatory patterns
- harassment patterns
- context-dependent harmful content

Flagged content can create:

- a moderation log
- a moderation alert for the project admin

## 13. Realtime Model

The app uses two realtime mechanisms.

### Firebase Firestore

Used for chat message fanout.

Pattern:

- messages are persisted in Postgres through the API
- UI also writes to Firestore for immediate live propagation
- clients subscribe to Firestore for newly added messages

This means Firestore is the live transport layer, while Postgres is the durable record.

### Socket.io

Used mainly by the LaTeX editor.

Pattern:

- join a project room
- emit editing state
- receive conflict notifications
- refresh files when peers update them

## 14. State Management

The repo uses Zustand stores in `store/`.

Examples:

- `projectStore.ts`
- `latexStore.ts`
- `userStore.ts`
- `agentStore.ts`

These stores are used for:

- current project state
- LaTeX file/editor state
- agent panel state
- user state and convenience caching

The state model is intentionally lightweight. Most source-of-truth data is still fetched from API routes.

## 15. LaTeX Workspace Internals

The LaTeX workspace deserves special attention because it is a distinct subsystem.

### File model

All files are stored in `LatexFile`.

Typical file categories:

- main `.tex` files
- section `.json` notebook files
- bibliography or support code
- asset references

### Cell model

Cell types are defined in [lib/cell-types.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/cell-types.ts).

Current supported cell types:

- text
- heading
- figure
- table
- equation
- note
- citation

### Conversion flow

`SectionDoc` JSON is parsed and converted to LaTeX using helpers in `lib/agents/latexConversionAgent.ts`.

Key responsibilities:

- convert each cell into its LaTeX equivalent
- assemble `main.tex` from section outputs
- optionally trigger external compile support

### AI inside LaTeX

There are currently multiple AI entry points in this subsystem:

- section suggestion
- figure/table inference
- transfer into LaTeX
- per-cell autofill

## 16. UI System

The global visual system is documented in [UI_DESIGN_CHOICES.md](/home/kaizokugin/Documents/researchcollab-final/researchcollab/UI_DESIGN_CHOICES.md).

Important UI foundation files:

- [app/globals.css](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/globals.css)
- [components/ui/index.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/ui/index.tsx)
- [components/layout/Sidebar.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/layout/Sidebar.tsx)
- [components/layout/PageHeader.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/layout/PageHeader.tsx)

The application uses a dark, research-tool visual direction with:

- `DM Sans` body text
- `Syne` headings
- blue primary actions
- violet AI accents
- border-led panel separation
- restrained motion

## 17. Environment Variables

The workspace relies on several env variables.

Important groups include:

### Database

- `DATABASE_URL`
- `DIRECT_URL`

### Auth

- Clerk keys and callback values

### LLM/provider configuration

- `LLM_PROVIDER`
- `LLM_MODEL`
- `ANTHROPIC_API_KEY`
- `HUGGINGFACE_KEY`
- `DEEPSEEK_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

### Realtime and frontend

- `NEXT_PUBLIC_FIREBASE_*`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_URL`

### Embeddings and search

- `HF_EMBEDDING_MODEL`
- `SERPAPI_KEY`
- `SEMANTIC_SCHOLAR_API_KEY`

### LaTeX and OCR integrations

- `LATEX_COMPILER_URL`
- `PIX2TEX_API_URL`

## 18. Key Implementation Patterns

Several patterns repeat throughout the codebase.

### Route guards

Most project-scoped routes follow the same structure:

1. call `getAuthUser()`
2. check membership in `ProjectMember`
3. perform action

Admin-only routes additionally check `member.role === 'admin'`.

### Client-first pages with API-backed data

Most pages are client components that:

- fetch data in `useEffect`
- call route handlers via `fetch`
- keep small amounts of local UI state

### Silent fallback in AI helpers

Several AI helpers try to degrade gracefully if the provider fails or response parsing breaks.

This improves resilience, but it can also hide failures if the UI does not surface them clearly.

### Incremental async processing

Paper summarization and indexing often happen in detached async blocks after an initial DB write.

This means users may see processing states such as:

- `processing`
- `ready`
- `failed`

## 19. Current Architectural Realities

These are important because some older docs do not fully match the code.

- Firestore is used for chat realtime, not only Socket.io
- Socket.io is mainly relevant to LaTeX collaboration
- LaTeX is an active, first-class workspace
- Several AI workflows are already embedded across the app, not isolated to one agent page
- The app is strongly client-driven; the backend exists primarily as route handlers and service helpers

## 20. Where To Change Things

This section is meant as a fast maintenance map.

### Add or change a page

Look under:

- `app/project/[id]/...`
- `components/...`

### Add or change protected backend behavior

Look under:

- `app/api/...`
- `lib/auth.ts`
- `lib/prisma.ts`

### Add or change AI logic

Look under:

- `lib/llm.ts`
- `lib/agents/`

### Add or change paper retrieval / PDF grounding

Look under:

- `lib/embeddings.ts`
- `lib/semanticSearch.ts`
- paper API routes

### Add or change LaTeX authoring behavior

Look under:

- `app/project/[id]/latex/page.tsx`
- `components/latex/`
- `app/api/projects/[id]/latex/...`
- `lib/cell-types.ts`
- `lib/agents/latexConversionAgent.ts`

### Add or change UI primitives

Look under:

- `components/ui/index.tsx`
- `app/globals.css`

## 21. Recommended Reading Order For New Contributors

If starting from scratch, the fastest sequence is:

1. [README.md](/home/kaizokugin/Documents/researchcollab-final/researchcollab/README.md)
2. [SPEC.md](/home/kaizokugin/Documents/researchcollab-final/researchcollab/SPEC.md)
3. [prisma/schema.prisma](/home/kaizokugin/Documents/researchcollab-final/researchcollab/prisma/schema.prisma)
4. [app/project/[id]/layout.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/layout.tsx)
5. [app/project/[id]/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/page.tsx)
6. [app/api/projects/[id]/chat/route.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/api/projects/[id]/chat/route.ts)
7. [app/project/[id]/latex/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/latex/page.tsx)
8. [lib/llm.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/llm.ts)
9. [lib/agents/index.ts](/home/kaizokugin/Documents/researchcollab-final/researchcollab/lib/agents/index.ts)

## 22. Summary

This workspace is not a simple CRUD app.

It is a multi-surface collaborative research environment with:

- project and team management
- real-time chat
- AI-assisted research and writing
- document ingestion and semantic retrieval
- moderation and review workflows
- final output generation
- a dedicated LaTeX IDE-style subsystem

The most important architectural idea is that the product is organized around a shared project context, and almost every feature either consumes or contributes to that shared context.
