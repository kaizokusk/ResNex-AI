# ResearchCollab — Personal Aggregate Dashboard Spec
## Replaces the blank WelcomeScreen with meaningful cross-project activity

---

## 0. Fix first — double sidebar bug

**Root cause:** `DashboardPage` renders `<Sidebar>` itself. When something in
`app/layout.tsx` or a parent layout also renders `<Sidebar>`, you get two.

**Fix in `app/dashboard/page.tsx`:**
- The `<Sidebar>` in `DashboardPage` is correct — keep it
- Check if `app/project/[id]/layout.tsx` or any shared layout also renders
  `<Sidebar>` unconditionally. If so, wrap it so it only renders on project routes.

**Simplest fix — in `app/layout.tsx`, do NOT add Sidebar.**
The dashboard page owns its own sidebar. The project layout owns its own sidebar.
They must never both be active at the same time.

---

## 1. What this feature replaces

**Before:** `WelcomeScreen` — blank center, just a "New Project" button.  
**After:** A personal activity summary across all projects the user is a member of.

The WelcomeScreen component is deleted and replaced with `<AggregateDashboard />`.

---

## 2. Principles (same as imposter-syndrome features)

- Your activity only — never compared to teammates
- Zeros shown warmly — "Nothing yet ✦" not "0"
- Color + symbol always — never color alone for status
- No streak guilt — shown as encouragement, not pressure
- Human language — warm, not metrics-dashboard cold
- Accessible — aria-live, landmarks, 44px touch targets, sr-only labels
- Privacy — aggregate counts only, no per-action exposure

---

## 3. UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Your Research Activity                              │
│  A quiet record of the work you're doing            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    47    │  │    3     │  │  4 days  │          │
│  │ Total    │  │ Active   │  │  Current │          │
│  │ actions  │  │ projects │  │  streak  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                      │
│  [Contribution heatmap — all projects combined]      │
│  Past 16 weeks                                       │
│                                                      │
│  Your Projects                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ ● Campus Network Monitoring     ████░░ admin│    │
│  │ ◦ Experimental Condensed Phy    ██░░░░ member│   │
│  │ ◦ AI Ethics in STEM             ░░░░░░ admin│    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 4. New file: `components/dashboard/AggregateDashboard.tsx`

### Props
```tsx
interface AggregateDashboardProps {
  userId: string
  userName: string
  onCreateProject: () => void
}
```

### Sections

#### 4.1 Header
```tsx
<section aria-label="Your research activity summary">
  <h2>Your Research Activity</h2>
  <p style={{ color: 'var(--color-muted)' }}>
    A quiet record of the work you're doing
  </p>
</section>
```

#### 4.2 Stat tiles (3 tiles)
```tsx
// Fetch from /api/dashboard/stats
interface DashboardStats {
  totalActions: number      // all ContributionEvent rows for this user
  activeProjects: number    // projects with ≥1 event in past 30 days
  currentStreak: number     // consecutive days with ≥1 event (any project)
}

// Tile component — reuse pattern from NormalizingPanel
// Never show raw 0 — use warm fallback
const display = (n: number, fallback: string) =>
  n === 0 ? fallback : n.toString()

// Tiles:
// { value: totalActions,    label: 'contributions',  fallback: 'Not yet ✦' }
// { value: activeProjects,  label: 'active projects', fallback: 'None yet ✦' }
// { value: currentStreak,   label: 'day streak',      fallback: 'Start today ✦' }
```

#### 4.3 Aggregate heatmap
Same 16×7 grid as Feature 2 (ContributionHeatmap) but:
- Aggregates ALL projects (no `projectId` filter in query)
- Same 5 intensity levels, same color ramp
- Label: "Past 16 weeks across all your projects"
- Reuse `ContributionHeatmap` component, pass `projectId={null}` to indicate global mode

#### 4.4 Project list
```tsx
// Fetch from existing /api/projects (already returns myRole)
// Show mini activity bar per project (last 7 days event count, 0–10 scale)

const STATUS_MAP = {
  active:    { symbol: '●', color: 'var(--color-success)' },
  draft:     { symbol: '◦', color: 'var(--color-warning)' },
  submitted: { symbol: '✓', color: 'var(--color-blue)'    },
  archived:  { symbol: '—', color: 'var(--color-muted)'   },
}

// Per project row:
// [status symbol] [project title truncated]  [mini bar]  [role badge]
// Clicking a row → router.push(`/project/${id}`)
// role badge: 'admin' in blue, 'member' in muted
```

---

## 5. New API route: `app/api/dashboard/stats/route.ts`

```ts
// GET — returns DashboardStats for current user across ALL projects
// Auth: getAuthUser() first line

// totalActions:
const totalActions = await prisma.contributionEvent.count({
  where: { userId }
})

// activeProjects:
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const activeProjectIds = await prisma.contributionEvent.findMany({
  where: { userId, createdAt: { gte: thirtyDaysAgo } },
  select: { projectId: true },
  distinct: ['projectId'],
})
const activeProjects = activeProjectIds.length

// currentStreak — same logic as Feature 2 but across all projects:
// group events by date descending, count consecutive days
const events = await prisma.contributionEvent.findMany({
  where: { userId },
  select: { createdAt: true },
  orderBy: { createdAt: 'desc' },
})
// deduplicate by date string, then count streak from today backwards

return NextResponse.json({ totalActions, activeProjects, currentStreak })
```

---

## 6. Modify existing: `app/api/projects/[id]/contributions/me/route.ts`

Add support for global mode (no projectId filter):

```ts
// If called as /api/dashboard/contributions (new route)
// omit the projectId filter from the ContributionEvent query
// Everything else identical to the per-project version
```

New route: `app/api/dashboard/contributions/route.ts`
- Same response shape as per-project contributions route
- `{ days[], currentStreak, totalActiveDays }` but across all projects

---

## 7. Modify existing: `app/dashboard/page.tsx`

### 7.1 Remove WelcomeScreen component entirely

### 7.2 Replace in JSX:
```tsx
// BEFORE
<WelcomeScreen
  userName={user?.fullName || user?.firstName || 'Researcher'}
  onCreateProject={() => setShowCreate(true)}
/>

// AFTER
<AggregateDashboard
  userId={user?.id ?? ''}
  userName={user?.fullName || user?.firstName || 'Researcher'}
  onCreateProject={() => setShowCreate(true)}
/>
```

### 7.3 Add import:
```tsx
import { AggregateDashboard } from '../../components/dashboard/AggregateDashboard'
```

### 7.4 Make main scrollable:
```tsx
// BEFORE
<main className="flex-1 bg-[#0a0c10] overflow-hidden">

// AFTER
<main
  id="main-content"
  tabIndex={-1}
  className="flex-1 bg-[#0a0c10] overflow-y-auto"
  style={{ padding: '40px 48px' }}
>
```

---

## 8. Modify existing: `components/contributors/ContributionHeatmap.tsx`

Add optional global mode:

```tsx
interface ContributionHeatmapProps {
  projectId: string | null  // null = all projects (dashboard mode)
}

// In the API call:
const url = projectId
  ? `/api/projects/${projectId}/contributions/me`
  : `/api/dashboard/contributions`
```

---

## 9. Accessibility requirements

Same rules as Section 12 of imposter-syndrome-spec.md:

- Stat tiles: `role="img"` on each tile, `aria-label="47 total contributions"`
- Heatmap: inherit existing heatmap accessibility
- Project list: `role="list"`, each row `role="listitem"`, status symbol `aria-hidden="true"` + `<span className="sr-only">{status}</span>`
- Mini activity bars: `aria-hidden="true"` (decorative)
- Section headings: proper `<h2>` / `<h3>` hierarchy
- Loading state: `aria-busy="true"` on container, skeleton placeholders

---

## 10. Microcopy — warm, not metrics

| Element | Text |
|---------|------|
| Section heading | "Your Research Activity" |
| Subheading | "A quiet record of the work you're doing" |
| Zero total actions | "Nothing recorded yet ✦" |
| Zero streak | "Start today ✦" |
| Zero active projects | "Open a project to begin ✦" |
| Heatmap label | "Past 16 weeks across all your projects" |
| Projects heading | "Your Projects" |
| Empty projects | "No projects yet — create one to get started" |
| Streak label | "day streak" (never "days missed") |

---

## 11. New files to create

- `components/dashboard/AggregateDashboard.tsx`
- `app/api/dashboard/stats/route.ts`
- `app/api/dashboard/contributions/route.ts`

## 12. Existing files to modify

- `app/dashboard/page.tsx` — replace WelcomeScreen, make main scrollable
- `components/contributors/ContributionHeatmap.tsx` — add global mode prop

---

## 13. Implementation order

1. Fix double sidebar bug first
2. `app/api/dashboard/stats/route.ts`
3. `app/api/dashboard/contributions/route.ts`
4. Modify `ContributionHeatmap` for global mode
5. `components/dashboard/AggregateDashboard.tsx`
6. Modify `app/dashboard/page.tsx`

