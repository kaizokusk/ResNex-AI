# ResearchCollab

AI-Powered Collaborative Research Platform for STEM teams. Built with Next.js 16, Clerk, Neon PostgreSQL, Prisma, Firebase, and Claude AI.

## Features

- **OTP Login** via Clerk (no passwords)
- **Project workspaces** — each member writes their own section in a TipTap rich text editor
- **AI Research Assistant** — Claude guides research without writing it for you
- **Group Chat** — real-time messaging powered by Firebase Firestore
- **Peer Review** — read and comment on teammates' submitted sections
- **AI Merge & Bias Audit** — Claude merges all sections into one document and audits for bias
- **LaTeX Editor** — IEEE / ACM / Generic paper format with live preview
- **PDF Export** — download the final merged document
- **Moderation** — every message and section is scanned before saving
- **Contributorship Log** — transparent record of who did what

---

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.com) application (Email OTP enabled)
- An [Anthropic](https://console.anthropic.com) API key
- A [Firebase](https://console.firebase.google.com) project with Firestore enabled
- (Optional) An [Uploadthing](https://uploadthing.com) app for file uploads

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/researchcollab.git
cd researchcollab
npm install
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
researchcollab/
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

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` in Vercel project settings
4. Deploy

> `.env.local` is gitignored — never commit it. Set vars directly in Vercel dashboard.

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
| Image generation | Pollinations.ai (free, no key needed) |
