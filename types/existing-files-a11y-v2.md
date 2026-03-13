# ResearchCollab — Inclusive, Human-Centric UI Fixes
## Existing files only. Color-blind safe. Human-first.

---

## What "human-centric" means here

- Every person using this is a student or researcher under pressure
- They may be tired, anxious, using a phone, or have a disability
- The UI should never make them feel stupid, excluded, or lost
- Warm language, clear feedback, no jargon, no invisible interactions

---

## 1. `app/layout.tsx`

```tsx
// Add lang attribute — screen readers use this for pronunciation
<html lang="en">
```

---

## 2. `app/globals.css` — paste all of these

### 2.1 Font size — respect user preference
```css
html {
  font-size: 100%; /* never override user's browser font setting */
}
body {
  font-size: 1rem; /* 16px at default — up from 14px, easier to read */
  line-height: 1.7; /* slightly more breathing room between lines */
}
```

### 2.2 Contrast — fix muted text (was failing WCAG AA)
```css
:root {
  /* BEFORE: --color-muted: #7a839a;  — 3.8:1 contrast, fails AA at 16px */
  /* AFTER: 5.1:1 contrast, passes AA */
  --color-muted: #9ba3b8;

  /* Violet safe for text — original #7c6af5 fails at small sizes */
  --color-violet-text: #9d8ff7;

  /* Color-blind safe status colors — never use green/red alone */
  --color-success: #3ecf8e;
  --color-success-text: #1a7a52;   /* darker for text use */
  --color-error: #ef4444;
  --color-error-text: #b91c1c;     /* darker for text use */
  --color-warning: #f59e0b;
  --color-warning-text: #92400e;
}
```

### 2.3 Color-blind safe status — ALWAYS pair color with a symbol
```css
/* Status indicators always use shape + color, never color alone */
/* Applied via data attribute so it works everywhere */
[data-status="success"]::before { content: "✓ "; }
[data-status="error"]::before   { content: "✕ "; }
[data-status="warning"]::before { content: "⚠ "; }
[data-status="pending"]::before { content: "⟳ "; }
[data-status="draft"]::before   { content: "◦ "; }
[data-status="active"]::before  { content: "● "; }
```

### 2.4 Focus — visible for keyboard and switch users
```css
/* Remove browser default, replace with consistent visible ring */
:focus-visible {
  outline: 2.5px solid var(--color-blue);
  outline-offset: 3px;
  border-radius: 4px;
}
:focus:not(:focus-visible) {
  outline: none;
}
/* Search codebase for "outline: none" or "outline: 0" — delete them all */
```

### 2.5 Reduced motion — vestibular disorders, epilepsy
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 2.6 Screen reader utility
```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border-width: 0;
}
```

### 2.7 Skip navigation link
```css
.skip-link {
  position: absolute;
  top: -48px; left: 0;
  background: var(--color-blue);
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 0 0 10px 0;
  font-size: 15px;
  font-weight: 600;
  z-index: 9999;
  text-decoration: none;
  transition: top 0.15s;
}
.skip-link:focus { top: 0; }
```

### 2.8 Touch targets — 44px minimum for all tappable elements
```css
.touch-target {
  position: relative;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* For visually small elements that need bigger hit area */
.touch-target-expand::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
}
```

### 2.9 Max line length — readability for everyone, especially dyslexia
```css
/* Apply to any prose/paragraph container */
.prose {
  max-width: 65ch;
  letter-spacing: 0.01em;
}
```

### 2.10 Hide scrollbar utility (for tab overflow on mobile)
```css
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar { display: none; }
```

---

## 3. `app/project/[id]/layout.tsx`

```tsx
// 1. First child in the layout — skip link
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// 2. Sidebar wrapper — was likely a div
<nav aria-label="Project navigation">
  {/* sidebar */}
</nav>

// 3. Main content wrapper
<main id="main-content" tabIndex={-1}>
  {/* page content */}
</main>

// 4. Screen reader announcer — add once, used by toasts/milestones
<div
  id="sr-announcer"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
/>
```

---

## 4. `app/login/page.tsx`

```tsx
// Email input
<input
  type="email"
  autoComplete="email"
  aria-label="Email address"
/>

// OTP input
<input
  type="text"
  inputMode="numeric"
  autoComplete="one-time-code"
  aria-label="One-time passcode"
  aria-describedby="otp-hint"
/>
<p id="otp-hint" className="sr-only">
  Enter the 6-digit code sent to your email address
</p>

// Error message — was probably a plain <p>
{error && (
  <p role="alert" aria-live="assertive" style={{ color: 'var(--color-error-text)' }}>
    ✕ {error}
  </p>
)}

// Submit button
<button
  type="submit"
  aria-label={isLoading ? 'Sending code, please wait' : 'Continue'}
  aria-disabled={isLoading}
  disabled={isLoading}
>
  {isLoading
    ? <><Spinner aria-hidden="true" /> Sending...</>
    : 'Continue'
  }
</button>
```

---

## 5. `components/layout/Sidebar.tsx`

### 5.1 Status dots — color-blind safe, add shape + symbol
```tsx
// BEFORE — color only dot
<span style={{ background: color, borderRadius: '50%', width: 8, height: 8 }} />

// AFTER — shape + color + screen reader text
// Map status to shape class and symbol
const STATUS_MAP = {
  active:     { symbol: '●', shape: 'rounded-full',  color: 'var(--color-success)' },
  draft:      { symbol: '◦', shape: 'rounded-sm',    color: 'var(--color-warning)' },
  submitted:  { symbol: '✓', shape: 'rounded-full',  color: 'var(--color-blue)'    },
  failed:     { symbol: '✕', shape: 'rounded-none',  color: 'var(--color-error)'   },
  pending:    { symbol: '⟳', shape: 'rounded-sm',    color: 'var(--color-muted)'   },
};

const s = STATUS_MAP[status] ?? STATUS_MAP.draft;
<span aria-hidden="true" style={{ color: s.color }}>{s.symbol}</span>
<span className="sr-only">{status}</span>
```

### 5.2 Project items — keyboard accessible
```tsx
// BEFORE — div with onClick
<div onClick={() => openProject(id)}>

// AFTER — button, aria-current tells screen readers which is active
<button
  type="button"
  onClick={() => openProject(id)}
  aria-current={isActive ? 'page' : undefined}
  className={`project-item ${isActive ? 'project-item--active' : ''}`}
>
```

### 5.3 New project button
```tsx
<button
  type="button"
  aria-label="Create new project"
  className="touch-target"
  onClick={openCreateModal}
>
  <PlusIcon aria-hidden="true" />
</button>
```

### 5.4 Mobile — add hamburger collapse
```tsx
const [open, setOpen] = useState(false);

// Toggle button — visible only on mobile
<button
  type="button"
  className="md:hidden touch-target"
  aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
  aria-expanded={open}
  aria-controls="sidebar-nav"
  onClick={() => setOpen(v => !v)}
>
  {open ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
</button>

// Nav — hidden on mobile when closed
<nav
  id="sidebar-nav"
  aria-label="Project navigation"
  hidden={!open}  // or use className with CSS
  className={`sidebar ${open ? 'sidebar--open' : 'sidebar--closed'} md:block`}
>
```

---

## 6. `components/layout/PageHeader.tsx`

### 6.1 Canonical tab order — define once
```tsx
// Define this array ONCE here, import it wherever tabs are needed
export const PROJECT_TABS = [
  { id: 'overview',  label: 'Overview',  href: ''          },
  { id: 'chat',      label: 'Chat',      href: '/chat'     },
  { id: 'discover',  label: 'Discover',  href: '/discover' },
  { id: 'library',   label: 'Library',   href: '/library'  },
  { id: 'compare',   label: 'Compare',   href: '/compare'  },
  { id: 'agents',    label: 'Agents',    href: '/agents'   },
  { id: 'reflect',   label: 'Reflect',   href: '/reflect'  },
  { id: 'review',    label: 'Review',    href: '/review'   },
  { id: 'output',    label: 'Output',    href: '/output'   },
  { id: 'latex',     label: 'LaTeX',     href: '/latex'    },
] as const;
```

### 6.2 ARIA tab pattern + mobile scroll
```tsx
// Scrollable wrapper for mobile
<div
  className="hide-scrollbar"
  style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
>
  <nav aria-label="Page sections">
    <div role="tablist">
      {PROJECT_TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          id={`tab-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => router.push(`/project/${projectId}${tab.href}`)}
          className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
</div>

// Page content area
<div
  role="tabpanel"
  id={`tabpanel-${activeTab}`}
  aria-labelledby={`tab-${activeTab}`}
>
  {children}
</div>
```

---

## 7. `components/ui/index.tsx`

### 7.1 StatusPill — color-blind safe
```tsx
// Always icon + label, never color alone
const STATUS_ICONS: Record<string, string> = {
  ready:      '✓',
  processing: '⟳',
  failed:     '✕',
  pending:    '◦',
  draft:      '◦',
  submitted:  '✓',
  approved:   '✓',
};

interface StatusPillProps {
  status: string;
  color: string;
  label?: string;
}

function StatusPill({ status, color, label }: StatusPillProps) {
  const icon = STATUS_ICONS[status.toLowerCase()] ?? '●';
  const displayLabel = label ?? status;
  return (
    <span
      aria-label={displayLabel}
      style={{
        background: `${color}20`,
        border: `1px solid ${color}40`,
        color,
        borderRadius: 99,
        padding: '3px 10px',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <span aria-hidden="true">{icon} </span>
      {displayLabel}
    </span>
  );
}
```

### 7.2 Error component — always announced
```tsx
function ErrorText({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      style={{ color: 'var(--color-error-text)', fontSize: 14, marginTop: 4 }}
    >
      <span aria-hidden="true">✕ </span>
      {children}
    </p>
  );
}
```

### 7.3 Input — always has accessible label
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;           // required
  label?: string;       // visible label
  ariaLabel?: string;   // when no visible label
  hint?: string;
  error?: string;
}

function Input({ id, label, ariaLabel, hint, error, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 12, textTransform: 'uppercase',
                   letterSpacing: '0.08em', color: 'var(--color-muted)',
                   display: 'block', marginBottom: 6 }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        aria-label={!label ? ariaLabel : undefined}
        aria-describedby={[
          hint  && `${id}-hint`,
          error && `${id}-error`,
        ].filter(Boolean).join(' ') || undefined}
        aria-invalid={!!error}
        {...props}
      />
      {hint  && <p id={`${id}-hint`}  style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>{hint}</p>}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}
```

---

## 8. `components/chat/ChatInput.tsx`

```tsx
// Textarea
<label htmlFor="chat-input" className="sr-only">
  Write a message to the project chat
</label>
<textarea
  id="chat-input"
  aria-describedby="chat-input-hint"
  placeholder="Message the project... or @agent for AI help"
/>
<span id="chat-input-hint" className="sr-only">
  Type @agent to ask the AI assistant. Enter sends, Shift+Enter for new line.
</span>

// Attachment button
<button
  type="button"
  aria-label="Attach a file"
  className="touch-target-expand"
  onClick={onAttach}
>
  <PaperclipIcon aria-hidden="true" />
</button>

// Send button
<button
  type="button"
  aria-label={isSending ? 'Sending message' : 'Send message'}
  disabled={isSending || !value.trim()}
  aria-disabled={isSending || !value.trim()}
  className="touch-target-expand"
  onClick={onSend}
>
  {isSending
    ? <Spinner aria-hidden="true" />
    : <SendIcon aria-hidden="true" />
  }
</button>
```

---

## 9. `components/chat/AgentPanel.tsx`

```tsx
// Panel wrapper — landmark
<aside aria-label="AI assistant panel">

  {/* Results — announced when they appear */}
  <div
    aria-live="polite"
    aria-label="AI assistant results"
    aria-relevant="additions text"
  >
    {result}
  </div>

  {/* Any icon-only action buttons */}
  <button type="button" aria-label="Copy result" className="touch-target-expand">
    <CopyIcon aria-hidden="true" />
  </button>

  <button type="button" aria-label="Re-run agent" className="touch-target-expand">
    <RefreshIcon aria-hidden="true" />
  </button>

</aside>
```

---

## 10. `app/project/[id]/chat/page.tsx`

```tsx
// Messages container
<div
  aria-live="polite"
  aria-label="Chat messages"
  aria-relevant="additions"
  role="log"
>
  {messages.map(msg => (
    <div
      key={msg.id}
      aria-label={`${msg.role === 'user' ? msg.userName : 'Assistant'}: ${msg.content}`}
    >
      {/* message content */}
    </div>
  ))}
</div>
```

---

## 11. `app/project/[id]/library/page.tsx`

```tsx
// Split pane — stacks on mobile
<div
  style={{
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
  }}
  className="library-layout"
>
  <div className="library-list" role="list" aria-label="Research papers">
    {papers.map(p => (
      <div
        key={p.id}
        role="listitem"
        aria-selected={selected?.id === p.id}
      >
        {/* paper row */}
      </div>
    ))}
  </div>

  <div
    className="library-detail"
    aria-label="Paper details"
    aria-live="polite"
  >
    {selected ? <PaperDetail paper={selected} /> : (
      <p style={{ color: 'var(--color-muted)' }}>Select a paper to view details</p>
    )}
  </div>
</div>

{/* Add to globals.css */}
{/* @media (max-width: 767px) {
  .library-layout { flex-direction: column; }
  .library-list, .library-detail { width: 100% !important; }
} */}
```

---

## 12. `app/project/[id]/latex/page.tsx`

```tsx
// Mobile pane switcher — hidden on desktop
const [activePane, setActivePane] =
  useState<'files' | 'editor' | 'preview'>('editor');

<div
  className="md:hidden"
  role="tablist"
  aria-label="Editor panels"
  style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}
>
  {(['files', 'editor', 'preview'] as const).map(pane => (
    <button
      key={pane}
      role="tab"
      type="button"
      aria-selected={activePane === pane}
      onClick={() => setActivePane(pane)}
      style={{
        flex: 1,
        padding: '10px',
        background: 'none',
        border: 'none',
        borderBottom: activePane === pane
          ? '2px solid var(--color-blue)'
          : '2px solid transparent',
        color: activePane === pane
          ? 'var(--color-blue)'
          : 'var(--color-muted)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        cursor: 'pointer',
        textTransform: 'capitalize',
      }}
    >
      {pane}
    </button>
  ))}
</div>

{/* Show/hide columns based on active pane on mobile */}
<div className={`latex-files  ${activePane !== 'files'   ? 'hidden md:flex' : ''}`}>
<div className={`latex-editor ${activePane !== 'editor'  ? 'hidden md:flex' : ''}`}>
<div className={`latex-preview ${activePane !== 'preview' ? 'hidden md:flex' : ''}`}>
```

---

## Error message rewrites — human language, never blame the user

Find and replace these across the entire codebase:

| Replace this | With this |
|---|---|
| `"Something went wrong"` | `"Couldn't complete that — your work is safe. Try again."` |
| `"Upload failed"` | `"Upload didn't finish. Check the file is under 50MB and try again."` |
| `"Unauthorized"` | `"You don't have access to this. Try refreshing or contact your project admin."` |
| `"Failed to save"` | `"Couldn't save right now — your content is still here. Try again in a moment."` |
| `"Error"` alone | Describe what specifically errored |
| `"Invalid input"` | `"Something looks off — check the highlighted fields below."` |
| `"Request failed"` | `"Couldn't reach the server. Check your connection and try again."` |

---

## Summary — what this doc fixes and who it helps

| Fix | Helps |
|-----|-------|
| Color + symbol for all statuses | Red-green color blind users (8% of males) |
| Muted text contrast raised | Low vision, older users, bright screens |
| Body text 14px → 16px | Low vision, reading fatigue, mobile |
| `prefers-reduced-motion` | Vestibular disorders, migraine, epilepsy |
| Focus rings on everything | Keyboard-only users, switch access users |
| Skip link | Screen reader and keyboard users |
| `aria-live` on chat/results | Screen reader users |
| 44px touch targets | Motor disabilities, mobile users, tremor |
| Landmark roles | Screen reader navigation |
| ARIA tab pattern | Screen reader and keyboard users |
| Mobile sidebar collapse | Small screen, one-handed use |
| Human error messages | Anxiety, imposter syndrome, non-native English speakers |
| `lang="en"` | Screen reader pronunciation engines |
| Max line length 65ch | Dyslexia, reading fatigue |

