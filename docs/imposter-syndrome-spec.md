# ResearchCollab — Imposter Syndrome Mitigation
## Full Feature Specification for Spec-Driven Development

**Version:** 1.0.0 | **Status:** Ready for Implementation | **Stack:** Next.js · Prisma · PostgreSQL · Clerk

---

## 0. Document Overview

This specification defines six imposter-syndrome mitigation features for ResearchCollab — a collaborative AI-assisted research platform used by students, researchers, and faculty. It is written for spec-driven development using Claude Code or Codex and assumes familiarity with the existing codebase documented in `WORKSPACE_DOCUMENTATION.md` and `UI_DESIGN_CHOICES.md`.

Every feature in this spec is self-contained and includes: the psychological rationale, exact UI/UX behaviour, complete Prisma schema additions, all API routes with request/response shapes, Zustand store changes, component file paths, edge cases, and acceptance criteria. Implement each feature independently in the order listed.

> **Design System Constraints**
> - All UI must use the existing dark workspace palette: background `#0a0c10`, surface `#12151c`, blue accent `#4f8ef7`, violet AI accent `#7c6af5`
> - Typography: `DM Sans` for body/UI, `Syne` for headings and major labels
> - Motion: use existing `fadeUp` / `fadeIn` animations only. No new animation libraries
> - Component primitives: extend `components/ui/index.tsx`. Do not introduce new component libraries
> - All new pages follow the existing `PageHeader` + tab-shell navigation pattern
> - All new API routes follow the existing `getAuthUser()` → `ProjectMember` check → action pattern

---

## Feature 1 — Belonging Welcome Strip

**Psychological target:** Reduces initial exclusion anxiety and lowers the activation barrier for first-time project participants.

### 1.1 Overview

A dismissible, personalized welcome banner shown to a user on their first visit to any project they have just joined. It uses the user's first name, affirms their place explicitly, and communicates the psychological safety norms of the project space without jargon. It is shown exactly once per user per project.

### 1.2 Trigger Logic

The strip appears when ALL of the following are true:

- The current user has a `ProjectMember` record for this project
- `ProjectMember.hasSeenWelcome` is `false` (new field — see schema below)
- The user is viewing any project-scoped page (any tab under `/project/[id]/`)
- The strip has NOT been dismissed in this session (local React state)

On dismiss (`×`), the client fires a `PATCH` to mark `hasSeenWelcome = true`. The strip never appears again for that user in that project.

### 1.3 UI Specification

| Property | Specification |
|----------|---------------|
| Placement | Injected at the top of the main content area, above the PageHeader tab content, inside the project layout shell (`app/project/[id]/layout.tsx`) |
| Visual style | Full-width banner. Background: `linear-gradient(135deg, #4f8ef710, #7c6af508)`. Border: `1px solid #4f8ef730`. Border-radius: `14px`. Padding: `22px 28px` |
| Headline | `"You belong here, [firstName]."` — Syne font, 20px, weight 700, color `#e8eaf0` |
| Body copy | `"This is a space to think out loud, ask questions, and build together. There's no expectation of being an expert — only of being curious and present. Every collaborator here started where you are now."` — DM Sans 13px, color `#7a839a`, line-height 1.7 |
| Tag pills | Four horizontal pills: `'Ask any question'`, `'Draft ideas freely'`, `'Revise without judgment'`, `'Learn by doing'`. Each pill: background `#4f8ef715`, border `1px solid #4f8ef730`, border-radius `99px`, padding `4px 12px`, font-size `12px`, color `#4f8ef7` |
| Dismiss control | `×` button top-right. Clicking sets local state `isVisible=false` and fires `PATCH /api/projects/[id]/members/welcome`. No confirmation required |
| Decorative glow | Absolutely positioned radial gradient div: `top:-20px, right:-20px, 120×120px`, `background: radial-gradient(circle, #7c6af525, transparent 70%)`. `pointer-events:none` |
| Animation | Entrance: `fadeUp` (existing CSS animation). Exit: `opacity 0, transform translateY(-8px), transition 300ms ease`. On exit complete, remove from DOM |
| Responsive | Full width on all breakpoints. Tags wrap on small screens |

### 1.4 Prisma Schema Changes

File: `prisma/schema.prisma` — model `ProjectMember`

```prisma
// ADD to model ProjectMember
hasSeenWelcome  Boolean  @default(false)
```

```bash
npx prisma migrate dev --name add_welcome_flag
```

### 1.5 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/members/welcome` | GET | Returns `{ hasSeenWelcome: boolean }` for the current user in this project |
| `PATCH /api/projects/[id]/members/welcome` | PATCH | Sets `hasSeenWelcome = true` for the current user in this project. Returns `200 OK` |

Route file: `app/api/projects/[id]/members/welcome/route.ts`

Auth pattern: `getAuthUser()` → find `ProjectMember` where `projectId + userId` → read or update `hasSeenWelcome`.

### 1.6 Component File

- **Create:** `components/belonging/WelcomeStrip.tsx`
- **Props:** `{ projectId: string; userName: string; onDismiss?: () => void }`
- **Mount inside:** `app/project/[id]/layout.tsx`, below the Sidebar and above the page content slot
- On mount, fetch `GET`. If `hasSeenWelcome` is false, render strip. On dismiss, call `PATCH` then animate out

### 1.7 Edge Cases

- If the `GET` call fails, default to not showing the strip (fail silently — do not block navigation)
- If the user's name is unavailable from Clerk, fall back to `'researcher'` in the headline
- Do not show the strip on the `/project/[id]/latex` page (the IDE surface should not be interrupted)
- Multiple project memberships: each project tracks its own `hasSeenWelcome` independently

### 1.8 Acceptance Criteria

1. Strip appears on first project visit for a newly joined member
2. Strip does not appear on second visit after dismissal
3. `PATCH` is fired on dismiss, `hasSeenWelcome` is persisted in DB
4. Strip does not appear on the LaTeX editor page
5. Exit animation plays before DOM removal
6. First name correctly resolves from Clerk user object; falls back to `'researcher'`

---

## Feature 2 — Personal Contribution Heatmap

**Psychological target:** Makes the user's own effort tangible and visible over time, countering the "I haven't done enough" spiral common in academic collaboration.

### 2.1 Overview

A 16-week activity heatmap card displayed on the Project Overview page (`/project/[id]`) inside a dedicated 'Your Contributions' panel. Each cell represents one day. Color intensity reflects the volume of tracked actions that day. A streak counter and an affirming footer message are included.

### 2.2 Tracked Action Types

The following actions increment a user's daily contribution count. Each is already an existing backend event; we attach a `ContributionEvent` record to each.

| action type | type | required | notes |
|-------------|------|----------|-------|
| `action` | string enum | Yes | `CHAT_MESSAGE \| PAPER_ADDED \| SECTION_EDIT \| SECTION_SUBMIT \| COMMENT_LEFT \| PAPER_REVIEWED \| LIBRARY_UPLOAD \| LATEX_EDIT` |
| `projectId` | String | Yes | Scoped per project |
| `userId` | String | Yes | The acting user |
| `createdAt` | DateTime | Yes | `@default(now())` |

### 2.3 Prisma Schema Changes

File: `prisma/schema.prisma` — add new model

```prisma
model ContributionEvent {
  id         String   @id @default(cuid())
  projectId  String
  userId     String
  action     String   // ContributionAction enum value
  createdAt  DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([projectId, userId, createdAt])
}
```

```bash
npx prisma migrate dev --name add_contribution_events
```

### 2.4 Event Instrumentation Points

Insert a `ContributionEvent` record in these existing route handlers:

| Route file | Method | Action |
|------------|--------|--------|
| `app/api/projects/[id]/chat/route.ts` | POST | On new chat message: `action = CHAT_MESSAGE` |
| `app/api/projects/[id]/papers/route.ts` | POST | On paper import: `action = PAPER_ADDED` |
| `app/api/projects/[id]/papers/upload/route.ts` | POST | On PDF upload: `action = LIBRARY_UPLOAD` |
| `app/api/projects/[id]/sections/route.ts` | PATCH | On section content update: `action = SECTION_EDIT` |
| `app/api/projects/[id]/sections/[sid]/submit/route.ts` | POST | On section submit: `action = SECTION_SUBMIT` |
| `app/api/projects/[id]/sections/[sid]/comments/route.ts` | POST | On comment: `action = COMMENT_LEFT` |
| `app/api/projects/[id]/latex/files/route.ts` | PATCH | On latex file save: `action = LATEX_EDIT` |

Pattern: after the main DB write succeeds, fire an async `prisma.contributionEvent.create()` — **do not await it on the critical path.**

### 2.5 API Route

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/contributions/me` | GET | Returns daily contribution counts for the current user for the past 16 weeks (112 days). Also returns `currentStreak` and `totalActiveDays` |

Response shape:

```typescript
{
  days: Array<{ date: string; count: number }>,  // 112 entries, ISO date string
  currentStreak: number,
  totalActiveDays: number
}
```

Streak algorithm: walk backwards from today. Increment streak while `days[i].count > 0`. Break on first zero.

### 2.6 UI Specification

| Property | Specification |
|----------|---------------|
| Placement | Project Overview page (`/project/[id]`). Rendered inside a right-column card alongside existing member/status widgets |
| Grid layout | 16 columns × 7 rows. CSS Grid with `gap: 3px`. Each cell is a square div with `aspect-ratio: 1`, `border-radius: 3px` |
| Level 0 (no activity) | Background: `#252a38` |
| Level 1 (1–2 events) | Background: `#1e3a5f` |
| Level 2 (3–5 events) | Background: `#2a5299` |
| Level 3 (6–9 events) | Background: `#4f8ef7` |
| Level 4 (10+ events) | Background: `#7ab3fa` |
| Streak badge | Top-right of card. Large number in Syne font, label `'day streak'` below. Background: gradient `#4f8ef722 → #7c6af522`. Border: `1px solid #4f8ef744` |
| Affirming footer | Green callout: `'✦ Every commit, comment, and edit counts. Research is built in small steps.'` Background `#3ecf8e12`, border `1px solid #3ecf8e30`, color `#3ecf8e` |
| Tooltip on hover | Each cell shows a native `title` attribute: `'{n} contribution(s) on {date}'` or `'No activity on {date}'` |
| Loading state | Shimmer skeleton using existing `shimmer` animation. Grid of gray cells while loading |

### 2.7 Component File

- **Create:** `components/contributors/ContributionHeatmap.tsx`
- Fetch `GET /api/projects/[id]/contributions/me` on mount. Render skeleton while loading. Map `response.days` to the grid
- **Mount inside:** `app/project/[id]/page.tsx` — in the right-column area alongside the existing member list

### 2.8 Edge Cases

- User with zero contributions: show all grey cells, streak = 0, footer still shows affirming message
- User who just joined today: same as zero case — no events yet
- The 112-day window is fixed — do not paginate for now
- **Rate-limit `ContributionEvent` inserts:** if the same user fires `SECTION_EDIT` more than once within 60 seconds for the same project, deduplicate (insert only if no `SECTION_EDIT` exists for that user+project in the last 60s). This prevents spam from autosave

### 2.9 Acceptance Criteria

1. Heatmap renders correctly with 112 cells in 16×7 grid
2. Correct intensity levels reflect real event counts from the DB
3. Streak counter accurately counts consecutive days backwards from today
4. All 7 instrumentation points fire `ContributionEvent` records
5. `SECTION_EDIT` deduplication prevents spam within 60s window
6. Loading skeleton shown while data is fetching
7. Zero-contribution state renders without error

---

## Feature 3 — Normalizing Struggle Panel

**Psychological target:** Counters the false perception that everyone else has it figured out. Surfaces the real, unpolished, uncertain state of the whole project.

### 3.1 Overview

A panel on the Project Overview page that shows anonymized, aggregate statistics reflecting the genuine messiness of the project: open questions, drafts in progress, revisions made, and "I'm not sure" signals from peers. Framed with explicit normalizing language that validates uncertainty as a core part of research.

### 3.2 Metrics Shown

All numbers are project-wide, not per-user. Showing per-user numbers would create competitive anxiety rather than normalizing it.

| Metric | Type | Notes |
|--------|------|-------|
| Revisions this week | Integer | COUNT of `SECTION_EDIT` `ContributionEvent`s in the past 7 days across all project members |
| Open chat questions | Integer | COUNT of `ChatMessage`s in the past 14 days where `content` contains `'?'` and `role = 'user'`. Intentionally imprecise heuristic |
| Draft sections (not submitted) | Integer | COUNT of `Section`s where `status != 'submitted'` and `wordCount > 0` |
| 'Not sure' signals | Integer | COUNT of Section comments (past 30 days) where content contains `'not sure' OR 'unsure' OR 'unclear' OR 'maybe' OR '?'` (case-insensitive) plus same patterns in chat messages |

### 3.3 API Route

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/belonging/normalize` | GET | Returns all four aggregate stats. Cached for 10 minutes per project using a simple in-memory `Map` keyed by `projectId+timestamp` |

Response shape:

```typescript
{
  revisionsThisWeek: number,
  openQuestions: number,
  draftSections: number,
  uncertaintySignals: number
}
```

Route file: `app/api/projects/[id]/belonging/normalize/route.ts`

### 3.4 UI Specification

| Property | Specification |
|----------|---------------|
| Placement | Project Overview page, below the contribution heatmap |
| Card layout | 2×2 grid of stat tiles. Each tile: background `#1a1f2e`, border `1px solid #252a38`, border-radius `12px`, padding `14px 16px` |
| Tile content | Icon (emoji), large stat number (Syne 22px, `#e8eaf0`), metric label (DM Sans 12px, `#7a839a`), context string (DM Sans 11px, `#3d4558`) |
| Icons | Revisions: `🔄` · Questions: `❓` · Drafts: `📝` · Uncertainty signals: `💬` |
| Normalizing footer | Violet callout: `'Reminder: Every researcher you admire has unfinished drafts, unanswered questions, and things they had to look up.'` Background `#7c6af510`, border `1px solid #7c6af530`, color `#7c6af5` |
| Section title | `"Research Is Messy — For Everyone"` in Syne 15px bold. Subtitle in DM Sans 13px muted |
| Refresh | Data auto-refreshes every 10 minutes on the client via `setInterval`. No manual refresh button |

### 3.5 Component File

- **Create:** `components/belonging/NormalizingPanel.tsx`
- **Mount inside:** `app/project/[id]/page.tsx` below `ContributionHeatmap`

### 3.6 Edge Cases

- If all four metrics are 0 (brand new project): still render the panel. The footer copy alone carries the psychological value
- Pattern matching for 'not sure' signals is intentionally broad. Do not surface which users said these things. Aggregate only
- Do not show this panel to users who are admins-only on the Admin tab — it is a member-facing feature

### 3.7 Acceptance Criteria

1. All four stats reflect real DB data
2. No individual user attribution anywhere in the UI or API response
3. 10-minute in-memory cache prevents redundant DB queries
4. Panel renders correctly when all stats are zero
5. Normalizing footer copy is always visible regardless of stat values

---

## Feature 4 — Milestone Moment Toasts

**Psychological target:** Acknowledges genuine small steps with specific, non-patronizing language. Counters the academic habit of discounting one's own progress.

### 4.1 Overview

When a user completes a defined first-time action inside a project, a milestone toast appears in the bottom-right corner. The toast uses specific milestone-aware copy rather than a generic "achievement unlocked" message. Each milestone fires exactly once per user per project.

### 4.2 Milestone Definitions

All milestones are first-time-only per user per project:

| Key | Trigger | Toast Copy |
|-----|---------|------------|
| `FIRST_MESSAGE` | First chat message sent | `'First message sent — Your voice is now part of this project.'` |
| `FIRST_PAPER` | First paper added to library | `'First paper added — You built the foundation.'` |
| `FIRST_SECTION_EDIT` | First section save with `wordCount > 0` | `'First draft written — Collaboration takes courage.'` |
| `FIRST_COMMENT` | First comment on a peer's section | `'First comment left — Your voice shapes this research.'` |
| `FIRST_SUBMISSION` | First section submitted for review | `'Section submitted — That\'s a real milestone.'` |
| `PAPERS_5` | 5 papers engaged | `'Five papers reviewed — This is what deep reading looks like.'` |
| `COMMENTS_10` | 10 comments left across all sections | `'10 comments — You\'ve been shaping this project.'` |
| `STREAK_3` | 3-day contribution streak | `'3 days in a row — Consistency is the rarest research skill.'` |

### 4.3 Prisma Schema Changes

File: `prisma/schema.prisma` — add new model

```prisma
model MilestoneAchievement {
  id         String   @id @default(cuid())
  projectId  String
  userId     String
  milestone  String   // MilestoneType enum value
  achievedAt DateTime @default(now())
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([projectId, userId, milestone])
  @@index([projectId, userId])
}
```

The `@@unique` constraint prevents duplicate milestones from being recorded.

```bash
npx prisma migrate dev --name add_milestone_achievements
```

### 4.4 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/milestones/me` | GET | Returns array of achieved milestone keys for current user in this project. Used on page load to suppress already-shown toasts |
| `POST /api/projects/[id]/milestones/check` | POST | Receives `{ trigger: ContributionAction \| 'STREAK_CHECK' }`. Server evaluates whether any new milestones have been unlocked. Creates `MilestoneAchievement` records for newly unlocked ones. Returns `{ newMilestones: MilestoneType[] }` |

Route file: `app/api/projects/[id]/milestones/check/route.ts`

Client calls `POST /check` after every `ContributionEvent`-generating action. The server does the count queries and milestone evaluation.

### 4.5 UI Specification — Toast

| Property | Specification |
|----------|---------------|
| Position | Bottom-right, above the existing toast stack |
| Dimensions | Width: 340px. Auto height |
| Background | `linear-gradient(135deg, {accentColor}18, #1a1f2e)`. Border: `1px solid {accentColor}40`. Border-radius: `16px`. Padding: `20px 22px` |
| Icon area | 48×48px square, border-radius `12px`. Background: `{accentColor}20`. Border: `1px solid {accentColor}40`. Contains emoji icon at 22px |
| Label | `"Milestone reached"` — 11px uppercase, letter-spacing `0.1em`, color: `accentColor` |
| Title | Milestone-specific title. Syne 16px bold, color `#e8eaf0` |
| Body | Milestone-specific affirming message. DM Sans 13px, color `#7a839a` |
| Dismiss | `×` button top-right. Clicking fires toast exit animation |
| Auto-dismiss | After 6 seconds, auto-dismiss with fade-out animation |
| Decorative glow | Radial gradient behind top-right corner, same pattern as Welcome Strip |
| Accent color per milestone | `FIRST_MESSAGE`, `FIRST_COMMENT`, `COMMENTS_10` → `#4f8ef7` (blue) · `FIRST_PAPER`, `FIRST_SECTION_EDIT`, `PAPERS_5` → `#3ecf8e` (green) · `FIRST_SUBMISSION` → `#7c6af5` (violet) · `STREAK_3` → `#f59e0b` (amber) |
| Queue | If multiple milestones unlock simultaneously, show them sequentially with 800ms gap between appearances |

### 4.6 Component Files

- **Create:** `components/belonging/MilestoneMoment.tsx`
  - Props: `{ milestone: MilestoneType; onDismiss: () => void }`
- **Create:** `components/belonging/MilestoneQueue.tsx` — manages the queue of pending toasts, renders one `MilestoneMoment` at a time
- **Mount `MilestoneQueue` inside:** `app/project/[id]/layout.tsx` so it persists across tab navigation

Zustand store — create `store/milestoneStore.ts`:

```typescript
interface MilestoneStore {
  achieved: string[]            // loaded from GET /milestones/me on project load
  queue: MilestoneType[]        // pending toasts to display
  addToQueue: (m: MilestoneType) => void
  markShown: (m: MilestoneType) => void
  setAchieved: (list: string[]) => void
}
```

### 4.7 Edge Cases

- If `POST /check` returns an already-achieved milestone (race condition), the `@@unique` DB constraint prevents duplicates. Client should also cross-check against `store.achieved` before queuing
- Do not show milestone toasts during the LaTeX editor session — they interrupt flow. Suppress toasts when the current route is `/project/[id]/latex`
- `STREAK_3` is checked on every page load via `POST /check` with `trigger: 'STREAK_CHECK'`. The server calculates the streak from `ContributionEvent`s
- `PAPERS_5` and `COMMENTS_10` are checked after their respective actions; server counts the totals

### 4.8 Acceptance Criteria

1. Each milestone fires exactly once per user per project
2. DB `@@unique` constraint prevents duplicate records
3. Correct accent color per milestone type
4. Queue shows milestones sequentially, not simultaneously
5. Auto-dismiss after 6 seconds
6. Toasts suppressed on `/latex` route
7. `STREAK_3` detected correctly across timezone boundaries (use UTC date comparison)

---

## Feature 5 — Personal Growth Tracker

**Psychological target:** Reframes "I'm behind everyone else" into "I'm building from where I started." Shows before-and-after progress within the current project.

### 5.1 Overview

A card on the Project Overview page that shows the user's growth across four dimensions since they joined this specific project. A "before" baseline (first week of membership) is compared to the current total. Expressed as percentage growth or `'New skill'` if they had zero activity in a category at join time.

### 5.2 Growth Dimensions

| Dimension | Metric | Source |
|-----------|--------|--------|
| Literature Engagement | Papers engaged | COUNT of `PAPER_ADDED + LIBRARY_UPLOAD` `ContributionEvent`s by this user |
| Writing Activity | Sections contributed | COUNT of `SECTION_EDIT` `ContributionEvent`s (post-deduplication) by this user |
| Peer Discussion | Comment threads | COUNT of `COMMENT_LEFT` `ContributionEvent`s by this user |
| Citation Work | References added | COUNT of `ChatMessage`s by this user containing an arXiv ID, DOI pattern, or citation syntax (rough regex) |

Baseline: the count of each dimension during the user's first 7 days in the project. Stored as a snapshot so it remains stable as the user's total grows.

### 5.3 Prisma Schema Changes

Add to model `ProjectMember`:

```prisma
// ADD to model ProjectMember
growthBaselineLiterature  Int       @default(0)
growthBaselineWriting     Int       @default(0)
growthBaselineDiscussion  Int       @default(0)
growthBaselineCitations   Int       @default(0)
growthBaselineSetAt       DateTime?
```

```bash
npx prisma migrate dev --name add_growth_baseline
```

Baseline is recorded by a background job / API call triggered 7 days after the user's project join date. If no baseline exists yet (user joined < 7 days ago), the growth tracker uses 0 as the baseline for all dimensions.

### 5.4 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/belonging/growth` | GET | Returns baseline and current totals for all four dimensions for the current user. Also returns `joinedAt` from `ProjectMember.createdAt` |
| `POST /api/projects/[id]/belonging/growth/baseline` | POST | Called by a scheduled task or on the 8th day after join. Computes and stores the 7-day baseline. Idempotent — if baseline already exists, returns `200` without overwriting |

Response shape:

```typescript
{
  dimensions: [
    {
      key: 'literature' | 'writing' | 'discussion' | 'citations',
      label: string,
      baseline: number,
      current: number,
      unit: string    // 'papers engaged' | 'sections contributed' | 'comment threads' | 'references added'
    }
  ],
  joinedAt: string   // ISO datetime
}
```

### 5.5 UI Specification

| Property | Specification |
|----------|---------------|
| Placement | Project Overview page, in a card below the `NormalizingPanel` |
| Section title | `"How You've Grown in This Project"` — Syne 15px bold. Subtitle: `'Comparing your activity from when you joined to now'` — DM Sans 13px muted |
| Per-dimension layout | Vertical stack of 4 rows. Each row: dimension name (left), growth badge (right), two-layer progress bar below |
| Progress bar — before layer | Height `6px`, border-radius `99px`. Background: `#3d4558`. Width = `(baseline / maxValue) * 100%` |
| Progress bar — now layer | Sits on top of before layer. Background: `linear-gradient(90deg, #4f8ef7, #7c6af5)`. Width = `(current / maxValue) * 100%`. `transition: width 1s ease` on mount |
| `maxValue` calculation | `max(current, baseline, 1)` to avoid division by zero |
| Growth badge | If `baseline == 0`: `'New skill ✦'` in green. Else: `'+{growthPercent}%'` in green. If no growth: current value in muted color |
| Zero-contribution state | All bars empty, all badges `'New skill ✦'`. Card still renders with title and description |
| Animation | Bar widths animate from 0 to their target value on first render. Use `IntersectionObserver` to trigger animation when card enters viewport |

### 5.6 Component File

- **Create:** `components/belonging/GrowthTracker.tsx`
- **Mount inside:** `app/project/[id]/page.tsx` below `NormalizingPanel`
- Create `lib/hooks/useIntersectionObserver.ts` if not already present for bar animation trigger

### 5.7 Edge Cases

- User joined < 7 days ago: baseline is 0 for all dimensions. All badges show `'New skill ✦'`. This is intentional and positive
- Current value lower than baseline (e.g. papers were deleted): show current value as-is. Do not show negative growth. Badge shows current count in muted color
- If `GET` fails, show a skeleton loading state. Do not show an error to the user

### 5.8 Acceptance Criteria

1. Correct baseline and current values for all four dimensions
2. Growth percentage calculated correctly. Edge case: `baseline=0` shows `'New skill'` not `Infinity%`
3. Bar animation triggers on viewport entry
4. Gradient bar always sits on top of the baseline bar visually
5. `POST /baseline` is idempotent — calling it twice does not overwrite the existing baseline

---

## Feature 6 — Private Reflection Space

**Psychological target:** Gives users a private, low-stakes place to process uncertainty, confusion, and self-doubt. Externalizing thoughts reduces their psychological weight without requiring vulnerability in front of peers.

### 6.1 Overview

A private reflection journal accessible as a new project tab. Contains rotating research-specific prompts and a free-text response area. Entries are never shown to other project members, admins, or the AI system. The user can optionally choose to share a reflection as an anonymous question to the project chat.

### 6.2 Prompt Library

Prompts rotate daily — deterministic rotation keyed to the date, not random per page load. Formula: `prompts[dayOfYear % prompts.length]`. Users can tap `'Different prompt →'` to cycle forward.

1. What's one thing you're hoping to understand better through this project?
2. What's a question you've been afraid to ask? Write it here first.
3. What's the last thing that surprised you in your reading?
4. What part of your section feels most uncertain right now?
5. Describe something you learned this week, even if it feels small.
6. What would you need to feel more confident about your contribution?
7. Is there something a collaborator said that stuck with you — good or uncomfortable?
8. What does "good enough" look like for your current task?

### 6.3 Prisma Schema Changes

File: `prisma/schema.prisma` — add new model

```prisma
model ReflectionEntry {
  id          String   @id @default(cuid())
  projectId   String
  userId      String
  promptIndex Int
  content     String   @db.Text
  isShared    Boolean  @default(false)   // if true, user chose to post anonymously
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([projectId, userId, createdAt])
}
```

```bash
npx prisma migrate dev --name add_reflection_entries
```

> **⚠️ PRIVACY — CRITICAL**
>
> Reflection entries must NEVER be included in:
> - Any AI agent context (`lib/agents/*`, `callLLM()` calls)
> - Any project-admin API routes
> - Any merged output or bias audit
> - Any moderation pipeline
>
> Add an explicit comment in `app/api/projects/[id]/reflection/route.ts`:
> ```
> // PRIVACY: Reflections are user-private.
> // Never expose to other users, admins, or AI agents.
> ```

### 6.4 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `GET /api/projects/[id]/reflection` | GET | Returns the current user's reflection entries for this project, ordered by `createdAt` desc. Only returns entries where `userId = current user` |
| `POST /api/projects/[id]/reflection` | POST | Creates a new `ReflectionEntry`. Body: `{ promptIndex, content }` |
| `PATCH /api/projects/[id]/reflection/[entryId]` | PATCH | Updates `content` of an existing entry. Validates that the entry belongs to current user |
| `POST /api/projects/[id]/reflection/[entryId]/share` | POST | Sets `isShared = true` and posts an anonymized version to project chat. No user attribution in the chat message |

### 6.5 UI Specification

| Property | Specification |
|----------|---------------|
| Placement | New tab `'Reflect'` in the project `PageHeader` tab list (after `'Overview'`, before `'Chat'`). Page: `app/project/[id]/reflect/page.tsx` |
| Page layout | Single centered column, `max-width: 640px`, `margin: auto` |
| Prompt display | Violet label `'Reflection space'` (11px uppercase, `#7c6af5`). Below: prompt text in Syne 16px bold, `#e8eaf0`, line-height 1.5 |
| Prompt navigation | `'Different prompt →'` ghost button. Cycles to next prompt (index + 1). Does not save the current response |
| Input area | Textarea. Background `#1a1f2e`. Border `1px solid #2e3548`. Blue focus border `#4f8ef7`. Placeholder: `'Just for you — this stays private unless you choose to share...'`. Min-height: `120px` |
| Save button | Shown when textarea has >10 characters. Blue secondary button: `'Save reflection'`. Shows spinner while saving, then resets to empty textarea |
| Share button | Only shown after a reflection is saved. Ghost button: `'Share anonymously to chat →'`. Requires confirmation dialog before posting |
| Confirmation dialog | `'This will post your reflection to project chat without your name. Your identity stays hidden. Continue?'` Primary: `'Post anonymously'`. Cancel: `'Keep private'` |
| Past reflections | List of previous entries below input. Shows: date, first 100 chars, `'Shared anonymously'` badge if `isShared=true`. Clicking expands to full content. Entries are read-only after saving |
| Privacy indicator | Persistent text below page title: `'🔒 Only you can see your reflections. Admins and collaborators cannot access this page.'` — DM Sans 12px muted |

### 6.6 Component Files

- **Create:** `app/project/[id]/reflect/page.tsx`
- **Create:** `components/belonging/ReflectionInput.tsx` — prompt + textarea + save/share controls
- **Create:** `components/belonging/ReflectionHistory.tsx` — past entries list
- **Modify:** `components/layout/PageHeader.tsx` — add `'Reflect'` to the project tabs array

### 6.7 Anonymous Sharing Logic

When `POST /reflection/[entryId]/share` is called:

1. Set `ReflectionEntry.isShared = true`
2. Create a `ChatMessage` record with: `role='user'`, `content='[Anonymous question] ' + entry.content`, `userId = anonymous-bot system user`, `projectId = current project`
3. Write to Firestore so the message appears in real-time for all chat subscribers (follow existing Firestore write pattern from `app/api/projects/[id]/chat/route.ts`)
4. Return `200 OK`. Do not include the original `userId` anywhere in the chat message payload

Add `anonymous-bot` system user to `prisma/seed.ts`.

### 6.8 Edge Cases

- Empty textarea: Save button disabled. Do not `POST` empty content
- Very long reflections: cap at 5000 characters client-side. Show character counter when within 200 chars of limit
- If `POST` fails (network error): show inline error below textarea. Do not lose the user's typed content
- Do not add the `'Reflect'` tab for users who are admins-only (`role='admin'` with no member writing responsibilities). Admins who are also members see it normally

### 6.9 Acceptance Criteria

1. Reflect tab appears in project navigation for member users
2. Reflections API only returns entries for the current user — never for others
3. Anonymous share posts to chat with no user attribution
4. Firestore write happens on anonymous share so message appears in real-time
5. Privacy indicator is always visible on the page
6. Reflection content is never passed to any AI agent or moderation system
7. Past entries list renders correctly and entries are read-only
8. Confirmation dialog appears before anonymous share

---

## 7. Implementation Order & Dependencies

Implement in this order to minimize merge conflicts and DB migration complexity:

1. **Feature 1 (Welcome Strip)** — Adds `hasSeenWelcome` to `ProjectMember`. Single migration. No dependencies
2. **Feature 2 (Contribution Heatmap)** — Adds `ContributionEvent` model. Instruments 7 existing routes. No UI dependencies on other features
3. **Feature 3 (Normalizing Panel)** — Depends on `ContributionEvent` (Feature 2 must be deployed first). Can mock with zero values initially
4. **Feature 5 (Growth Tracker)** — Depends on `ContributionEvent` (Feature 2 must be deployed). Adds baseline fields to `ProjectMember`
5. **Feature 4 (Milestone Toasts)** — Depends on `ContributionEvent` (Feature 2). Adds `MilestoneAchievement` model. Depends on `milestoneStore`
6. **Feature 6 (Reflection Space)** — Fully independent. No dependencies on other features. Can be implemented in parallel with any of the above

> **Migration Summary**
>
> All 5 migrations are additive — no column drops, no destructive changes. Safe to run on production with zero downtime.
>
> | Migration | Change |
> |-----------|--------|
> | `add_welcome_flag` | `ProjectMember.hasSeenWelcome` |
> | `add_contribution_events` | New `ContributionEvent` model |
> | `add_milestone_achievements` | New `MilestoneAchievement` model |
> | `add_growth_baseline` | `ProjectMember` baseline fields |
> | `add_reflection_entries` | New `ReflectionEntry` model |

---

## 8. New Files to Create

| File | Type | Feature |
|------|------|---------|
| `components/belonging/WelcomeStrip.tsx` | Component | Feature 1 |
| `components/belonging/MilestoneMoment.tsx` | Component | Feature 4 |
| `components/belonging/MilestoneQueue.tsx` | Component | Feature 4 |
| `components/belonging/NormalizingPanel.tsx` | Component | Feature 3 |
| `components/belonging/GrowthTracker.tsx` | Component | Feature 5 |
| `components/belonging/ReflectionInput.tsx` | Component | Feature 6 |
| `components/belonging/ReflectionHistory.tsx` | Component | Feature 6 |
| `components/contributors/ContributionHeatmap.tsx` | Component | Feature 2 |
| `app/project/[id]/reflect/page.tsx` | Page | Feature 6 |
| `app/api/projects/[id]/members/welcome/route.ts` | API Route | Feature 1 |
| `app/api/projects/[id]/contributions/me/route.ts` | API Route | Feature 2 |
| `app/api/projects/[id]/belonging/normalize/route.ts` | API Route | Feature 3 |
| `app/api/projects/[id]/milestones/me/route.ts` | API Route | Feature 4 |
| `app/api/projects/[id]/milestones/check/route.ts` | API Route | Feature 4 |
| `app/api/projects/[id]/belonging/growth/route.ts` | API Route | Feature 5 |
| `app/api/projects/[id]/belonging/growth/baseline/route.ts` | API Route | Feature 5 |
| `app/api/projects/[id]/reflection/route.ts` | API Route | Feature 6 |
| `app/api/projects/[id]/reflection/[entryId]/route.ts` | API Route | Feature 6 |
| `app/api/projects/[id]/reflection/[entryId]/share/route.ts` | API Route | Feature 6 |
| `store/milestoneStore.ts` | Zustand Store | Feature 4 |
| `lib/hooks/useIntersectionObserver.ts` | Hook | Feature 5 |

---

## 9. Existing Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ContributionEvent`, `MilestoneAchievement`, `ReflectionEntry` models. Add fields to `ProjectMember` |
| `app/project/[id]/layout.tsx` | Mount `WelcomeStrip` and `MilestoneQueue`. Fetch welcome status and milestone achieved list on project load |
| `app/project/[id]/page.tsx` | Mount `ContributionHeatmap`, `NormalizingPanel`, `GrowthTracker` cards |
| `components/layout/PageHeader.tsx` | Add `'Reflect'` to project tab list |
| `components/ui/index.tsx` | Add `BelongingCallout` variant if needed for violet/green callout blocks |
| `app/api/projects/[id]/chat/route.ts` | Add `ContributionEvent` insert after successful message save. Add `POST /check` milestone trigger |
| `app/api/projects/[id]/papers/route.ts` | Add `ContributionEvent` insert on paper import |
| `app/api/projects/[id]/papers/upload/route.ts` | Add `ContributionEvent` insert on upload |
| `app/api/projects/[id]/sections/route.ts` | Add `ContributionEvent` insert (deduplicated) on section edit |
| `app/api/projects/[id]/sections/[sid]/submit/route.ts` | Add `ContributionEvent` insert on submit |
| `app/api/projects/[id]/sections/[sid]/comments/route.ts` | Add `ContributionEvent` insert on comment |
| `app/api/projects/[id]/latex/files/route.ts` | Add `ContributionEvent` insert on latex file save |
| `prisma/seed.ts` | Add `anonymous-bot` User record for reflection anonymous sharing |

---

## 10. Design Token Reference

All new components must use these tokens. Do not hardcode hex values in component files — add CSS variables to `app/globals.css` if a new token is needed.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0a0c10` | Page background |
| `--color-surface` | `#12151c` | Primary card/panel background |
| `--color-surface-2` | `#1a1f2e` | Secondary surface (inputs, nested areas) |
| `--color-border` | `#252a38` | Primary border |
| `--color-border-2` | `#2e3548` | Secondary border |
| `--color-text` | `#e8eaf0` | Primary text |
| `--color-muted` | `#7a839a` | Muted / supporting text |
| `--color-faint` | `#3d4558` | Very muted / placeholder text |
| `--color-blue` | `#4f8ef7` | Primary action, active states |
| `--color-violet` | `#7c6af5` | AI accent, reflection, secondary emphasis |
| `--color-green` | `#3ecf8e` | Success, positive growth |
| `--color-amber` | `#f59e0b` | Streak, warning, milestone |
| `--font-heading` | `Syne` | Headings, branding, milestone titles |
| `--font-body` | `DM Sans` | All UI body text, labels, inputs |

---

## 11. Rules for Claude Code / Codex

> When generating code for this spec, follow these rules:

1. Use `getAuthUser()` from `lib/auth.ts` as the first line of every new API route
2. Always verify `ProjectMember` membership before accessing project data
3. `ContributionEvent` inserts must be fire-and-forget (`// no await` on critical path)
4. `ReflectionEntry` queries must always include `userId = currentUser.id` in `WHERE` clause
5. Never pass reflections to `callLLM()` or any agent function
6. Milestone DB inserts must use upsert: `prisma.milestoneAchievement.upsert({ where: { projectId_userId_milestone: ... }, create: {...}, update: {} })` to handle race conditions
7. All new components must accept `projectId` as a prop. Do not read from URL params inside components
8. All loading states must use the existing `shimmer` animation class from `globals.css`
9. Dates for streak/growth calculations must use UTC consistently — never local time
10. Use `?debug=belonging` query param to force-show `WelcomeStrip` and milestone toasts during development

Each feature's **Acceptance Criteria** section doubles as the QA checklist. Verify every numbered item before marking a feature complete.

---

*ResearchCollab — Built for curious people, not perfect ones.*
