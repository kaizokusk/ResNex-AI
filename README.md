# ResNex-AI

AI-powered collaborative content creation and knowledge curation platform for STEM teams.

Built for **Grand Challenge 1: AI Agents for Collaborative Content Creation and Knowledge Curation** (STEM AI Hackathon 2026).

ResNex-AI helps student teams collaboratively create, organize, synthesize, and share STEM knowledge with:
- multi-user writing workspaces (rich-text + LaTeX)
- AI agents for research, planning, quality feedback, and synthesis
- structured curation (papers, tags, citations) and exportable outputs

---

## Team

- Sweta Das — M.Tech (`AIB253027`)
- Sai Krishna — MSR (`2025AIY7592`)
- Shreyash Kumar — BTech (`2022EE11724`)

---

## Grand Challenge Alignment

This repository is organized around the expected solution components:

- **Collaborative content generation interface**: project workspaces with section ownership, peer review, final output, and a LaTeX IDE
- **AI-powered writing assistant (STEM-aware)**: agent toolkit for research chat, paper Q&A, gap-finding, structured drafting, and synthesis guidance
- **Real-time collaboration + version control**: Firebase group chat, section version history/restore, and LaTeX collaboration conflict signaling
- **Knowledge organization & tagging**: paper discovery, library, tagging, and semantic search over indexed documents
- **Citation & reference management**: citation picker/warnings and paper library metadata
- **Content quality assessment & feedback**: quality checks, Socratic prompting, peer review comments, and bias audit
- **LMS integration (optional)**: classroom-oriented sharing/integrations (see `app/api/integrations/`)

---

## Features (Product)

- **OTP login** via Clerk (no passwords)
- **Project workspaces** — each member drafts their own section in a TipTap rich-text editor
- **AI research assistant** — guides research and synthesis without “writing it for you”
- **Group chat** — real-time messaging (Firebase Firestore)
- **Peer review** — read/comment on submitted sections
- **Version history** — track/restore section revisions
- **AI merge + bias audit** — merge sections into one document and audit for bias
- **Paper discovery + library** — ingest papers, generate summaries, tag, and compare sources
- **LaTeX editor** — IEEE / ACM / generic templates with live preview
- **PDF export** — download final merged document
- **Moderation** — scan messages/sections before saving
- **Contributorship log** — transparent record of who did what

---

## Deliverables & Evaluation (Hackathon)

- **Working prototype (multi-user collaboration)**: this Next.js app (dashboard → project → workspace/chat/review/output/LaTeX)
- **Sample STEM content**: run `npm run db:seed` to create a demo project (“AI Ethics in STEM Education”)
- **User study (minimum 5 test users)**: test onboarding → co-authoring → peer review → merge/export; capture task time, friction points, and perceived usefulness
- **Comparison with existing tools** (Google Docs / Notion / Overleaf): use this checklist for a short write-up

| Capability | ResNex-AI | Google Docs | Notion | Overleaf |
|---|---:|---:|---:|---:|
| Multi-user editing | ✅ | ✅ | ✅ | ✅ |
| Section ownership + peer review | ✅ | ◻︎ | ◻︎ | ◻︎ |
| STEM research agents (papers, gaps, Q&A) | ✅ | ◻︎ | ◻︎ | ◻︎ |
| Knowledge curation (papers + tags + semantic search) | ✅ | ◻︎ | ✅ | ◻︎ |
| Citation-aware workflow | ✅ | ◻︎ | ◻︎ | ✅ |
| LaTeX + templates + compile/preview | ✅ | ◻︎ | ◻︎ | ✅ | </br>


**AI evaluation metrics**: measure **accuracy**, **relevance**, and **coherence** via (a) rubric-based human ratings and (b) task success (e.g., correct citations, fewer review comments, faster merge iteration)

---

## Docs

- `docs/WORKSPACE_DOCUMENTATION.md` — how the app works (architecture, flows, data model)
- `docs/DOCUMENTATION.md` — full codebase documentation
- `docs/SPEC.md` — product/system spec
- `docs/SPEC_LATEX.md` and `docs/SPEC_LATEX_TEMPLATES.md` — LaTeX workspace and templates
- `docs/UI_DESIGN_CHOICES.md` — UI system notes

---

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application (Email OTP enabled)
- A LLM API key
- A [Firebase](https://console.firebase.google.com) project with Firestore enabled
- (Optional) An [Uploadthing](https://uploadthing.com) app for file uploads

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/ResNex-AI.git
npm install
npm run dev
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon dashboard → Connection string (pooled) |
| `DIRECT_URL` | Neon dashboard → Connection string (direct) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console → Project Settings → Your apps |
| `UPLOADTHING_SECRET` | uploadthing.com → Dashboard (optional) |
| `UPLOADTHING_APP_ID` | uploadthing.com → Dashboard (optional) |

### 3. Clerk setup

1. Go to Clerk dashboard → **User & Authentication → Email, Phone, Username**
2. Enable **Email address** with **Email verification code** (OTP) strategy
3. Go to **Webhooks** → add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`

### 4. Firebase setup

1. Go to [Firebase console](https://console.firebase.google.com) → your project
2. **Build → Firestore Database → Create database → Start in test mode**
3. Go to **Firestore → Rules** and publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId}/messages/{msgId} {
      allow read, write: if true;
    }
  }
}
```

### 5. Database setup

Apply the Prisma migrations to your Neon database:

```bash
npm run db:migrate
npm run db:generate
```

Optionally seed with sample data:

```bash
npm run db:seed
```

---

## Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project structure

```
ResNex-AI/
├── app/
│   ├── login/              # OTP login page
│   ├── dashboard/          # Project list + sidebar
│   ├── project/[id]/
│   │   ├── page.tsx        # Overview — members, AI coach, chat widget
│   │   ├── chat/           # Full-page group chat (Firebase)
│   │   ├── workspace/      # TipTap editor + AI research assistant
│   │   ├── review/         # Peer review + comments
│   │   ├── output/         # Merged doc + bias audit + PDF export
│   │   ├── latex/          # LaTeX paper editor
│   │   └── admin/          # Member management + moderation logs
│   └── api/                # All API routes
├── components/
│   ├── layout/             # PageHeader, Sidebar
│   ├── ui/                 # Button, Modal, Badge, Avatar, etc.
│   └── workspace/          # TipTapEditor
├── lib/
│   ├── auth.ts             # getAuthUser() helper
│   ├── claude.ts           # Anthropic client
│   ├── firebase.ts         # Firestore instance
│   ├── moderation.ts       # Content moderation
│   ├── prisma.ts           # Prisma client
│   └── agents/             # Pluggable AI agents (breakdown, research, merge...)
├── prisma/
│   └── schema.prisma       # Database schema
└── .env.example            # Environment variable template
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Auth | Clerk (Email OTP) |
| Database | Neon PostgreSQL + Prisma ORM |
| Real-time chat | Firebase Firestore |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Rich text editor | TipTap |
| File uploads | Uploadthing |


---
## Demo video link


[Youtube Demo link](https://youtu.be/tUkr_yNPCC8?si=8PR_ctxhPM0J0t_Z)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
