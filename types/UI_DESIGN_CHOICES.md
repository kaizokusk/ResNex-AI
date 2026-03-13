# UI Design Choices

This document records the current UI design choices implemented across ResearchCollab. It reflects the live codebase, not just the product specs.

## 1. Overall Design Direction

The application uses a dark, research-tool aesthetic rather than a consumer SaaS style.

- Primary mood: focused, technical, low-glare, workspace-oriented
- Visual tone: dark canvas with cool blue and violet accents
- Density: medium-dense; optimized for information-heavy screens
- Layout style: app-shell navigation with persistent sidebar and tabbed sub-navigation
- Interaction style: subtle feedback, low-noise animations, soft borders instead of heavy shadows

The visual language is consistent with a collaborative writing and analysis tool rather than a marketing-first product.

## 2. Color System

The core palette is defined in [app/globals.css](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/globals.css) and extended in [tailwind.config.js](/home/kaizokugin/Documents/researchcollab-final/researchcollab/tailwind.config.js).

### Base colors

- Background: `#0a0c10`
- Primary surface: `#12151c`
- Secondary surface: `#1a1f2e`
- Primary border: `#252a38`
- Secondary border: `#2e3548`
- Primary text: `#e8eaf0`
- Muted text: `#7a839a`
- Faint text: `#3d4558`

### Accent colors

- Primary accent: `#4f8ef7`
- Secondary accent: `#7c6af5`
- Success: `#3ecf8e`
- Warning: `#f59e0b`
- Error: `#ef4444`

### Design intent

- Blue is the main action and active-navigation color.
- Violet is used as an AI/assistant accent and for secondary emphasis.
- Green/amber/red are reserved for semantic system meaning such as status and validation.
- Most surfaces are separated with border contrast instead of large tonal jumps.

## 3. Typography

Typography is one of the strongest identity choices in the app.

- Body font: `DM Sans`
- Heading font: `Syne`

### How it is used

- `DM Sans` is used for UI controls, paragraph text, and most application content.
- `Syne` is used for headings, branding, and major section titles.
- Headings use tighter tracking and stronger weight to create a more editorial feel.
- Default body size is `14px` with a `1.6` line height.

### Design intent

- `DM Sans` keeps dense interfaces readable.
- `Syne` adds visual personality so the product does not feel like a default dashboard template.

## 4. Shape, Borders, and Depth

The UI prefers rounded geometry and restrained depth.

- Base radius token: `10px`
- Common card/modal radius: `rounded-xl` or `rounded-2xl`
- Borders are used heavily to define containment
- Shadows appear selectively on login, modals, and a few elevated actions

### Design intent

- Borders create structure without making the UI visually heavy.
- Rounded corners soften a technically dense product.
- Most panels feel stacked and modular, like panes in a workspace.

## 5. Motion and Feedback

The app uses lightweight motion rather than constant animation.

### Defined animations

- `fadeUp`: small upward entrance motion
- `fadeIn`: opacity-only appearance
- `spin`: loading states
- `shimmer`: skeleton loading

### Where motion is used

- Sidebar project items use staggered `fade-up`
- Login and empty states use entrance animation
- Spinners are used for sending, uploading, and background work
- Hover states are typically color or border transitions rather than movement

### Design intent

- Motion is used to clarify state changes, not to decorate every interaction.
- The overall feel stays serious and productivity-oriented.

## 6. Navigation Model

The app has a two-level navigation structure.

### Global/project navigation

- Persistent left sidebar for project switching
- Sidebar includes branding, project list, role badges, and account footer
- New project creation is available directly from the sidebar

### Page-level navigation

- `PageHeader` provides page title, optional subtitle, optional status, top-right actions, and tab navigation
- Tabs sit on the bottom of the header and use an underline activation pattern

### Design intent

- The sidebar answers "which project am I in?"
- The header tabs answer "which workspace inside this project am I in?"
- This creates a consistent app-shell mental model across major screens

## 7. Shared UI Patterns

The reusable primitives live mostly in [components/ui/index.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/ui/index.tsx).

### Buttons

- Primary: solid blue, high emphasis
- Secondary: dark filled button with border
- Ghost: text-first low emphasis
- Success and danger: semantic tinted variants

Design choice:
- Primary actions are visually obvious
- Secondary actions stay visible without competing
- Semantic variants are reserved for system meaning

### Inputs and textareas

- Dark input background
- Thin border
- Blue focus border and ring
- Uppercase labels with tracking for a structured form feel

Design choice:
- Forms are designed to feel deliberate and utilitarian
- Labels use small uppercase text to create consistency and scanning efficiency

### Status pills and badges

- Rounded, lightly tinted capsules
- Color-coded by workflow or health state

Design choice:
- Status is meant to be readable at a glance in list-heavy views

### Cards

- Dark cards with borders and rounded corners
- Minimal default shadow

Design choice:
- Cards separate content blocks without breaking the visual calm of the dark canvas

### Toasts

- Bottom-right stack
- Semantic border and tint
- Brief confirmation or error messaging

Design choice:
- Feedback is present but does not interrupt workflow

## 8. Screen-Level Design Choices

## 8.1 Login

Implemented in [app/login/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/login/page.tsx).

Key choices:

- Centered single-card auth flow
- Subtle grid background
- Large radial glow behind the form
- Brand mark uses a blue-to-violet gradient
- OTP flow is broken into two simple steps

Design intent:
- Login feels more brand-forward than the internal app screens
- It introduces the accent palette and typography immediately

## 8.2 Dashboard

Implemented in [app/dashboard/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/dashboard/page.tsx).

Key choices:

- Persistent sidebar remains visible even on dashboard
- Empty dashboard state is centered and optimistic, with a large icon and single CTA
- Create-project flow uses a modal wizard with visible progress bars

Design intent:
- The dashboard emphasizes orientation and project creation rather than analytics
- The modal flow reduces friction for initial setup

## 8.3 Chat

Implemented in [app/project/[id]/chat/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/chat/page.tsx), [components/chat/ChatInput.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/chat/ChatInput.tsx), and [components/chat/AgentPanel.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/chat/AgentPanel.tsx).

Key choices:

- Narrow central message column for readable conversation width
- User and non-user messages use mirrored alignment
- Message bubbles are rounded and compact
- Attachments are rendered as chips or image previews
- Agent results live in a separate right-side panel
- The agent panel uses violet to distinguish AI workflows from standard chat

Design intent:

- Chat is treated as a collaboration workspace, not a social messenger
- AI is present, but spatially separated so it does not overwhelm human conversation

## 8.4 Paper Library

Implemented in [app/project/[id]/library/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/library/page.tsx).

Key choices:

- Split-pane layout
- Paper list on the left, selected paper details on the right
- Upload and retry actions are colocated above the list
- Summary sections use boxed content blocks with uppercase micro-headings

Design intent:

- The page behaves like a study/reference browser
- Reading and scanning are prioritized over decoration

## 8.5 LaTeX Editor

Implemented in [app/project/[id]/latex/page.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/app/project/[id]/latex/page.tsx).

Key choices:

- Three-column IDE layout
- File tree on the left
- Editor in the center
- PDF preview and writing progress on the right
- Conflict banners and toolbars are placed near the top, close to the editing surface
- Section JSON files switch to notebook-style cell editing instead of raw code editing

Design intent:

- This is the most tool-like surface in the app
- The layout prioritizes simultaneous reference, editing, and preview
- The experience is intentionally closer to a lightweight IDE than a document page

## 9. Component-Specific Interaction Choices

### Sidebar

Implemented in [components/layout/Sidebar.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/layout/Sidebar.tsx).

Choices:

- Compact project list with small status dots
- Active item gets a tinted background plus thin accent border
- Brand identity is visible but not oversized
- Account footer stays anchored to the bottom

Reasoning:
- The sidebar is a control surface, not a content destination
- It should remain quiet while still enabling quick project switching

### Page header

Implemented in [components/layout/PageHeader.tsx](/home/kaizokugin/Documents/researchcollab-final/researchcollab/components/layout/PageHeader.tsx).

Choices:

- Large title and optional subtitle
- Actions sit on the right
- Tabs use bottom borders rather than pill controls

Reasoning:
- This preserves vertical space
- The tab treatment fits the rest of the app’s border-led design language

### Chat input

Choices:

- Attachment button is a separate square control
- Text area remains the primary focus
- `@agent` opens contextual tooling instead of navigating elsewhere

Reasoning:
- AI actions are discoverable inside the composition flow
- Attachments stay secondary to writing

## 10. Information Hierarchy Patterns

Across the app, the hierarchy is generally:

1. Page title and current workspace
2. Active status or semantic state
3. Primary content surface
4. Contextual actions
5. Supporting metadata in smaller muted text

Repeated techniques:

- Strong title contrast
- Uppercase micro-labels for metadata
- Muted text for support information
- Accent color reserved for state, selection, and action

## 11. Accessibility and Readability Choices

Current strengths:

- Dark surfaces generally maintain readable text contrast
- Focus states are visible on form fields
- Large hit areas are used for most major buttons
- Dense screens usually constrain line length reasonably well

Current weaknesses:

- Heavy reliance on color for status
- Some icons and micro-text are very small
- Emoji are used in places as semantic indicators
- Not all interactive elements appear to have equally strong keyboard affordances

## 12. Design Consistency Notes

The application is mostly consistent, but there are a few design drifts worth documenting.

### Consistent patterns

- Dark palette with blue primary actions
- `Syne` for headings and `DM Sans` for body
- Rounded corners with border-defined surfaces
- App-shell navigation pattern
- Violet used as the AI accent in several places

### Inconsistencies

- Some pages use slightly different tab sets
- Some pages include LaTeX in navigation while older docs say it was removed
- A few controls use inline custom styling rather than shared UI primitives
- Status badges are implemented in more than one place instead of being fully centralized
- Some pages are more spacious while others are denser and more IDE-like

## 13. Current Design Principles To Preserve

If the UI is extended or redesigned, these are the strongest existing decisions worth preserving:

- Keep the dark, focused research-workspace identity
- Preserve the `Syne` + `DM Sans` typography pairing
- Use blue for primary actions and violet for AI-specific affordances
- Prefer borders and structured layout over excessive shadows
- Maintain the sidebar + page-header + tab-shell navigation pattern
- Keep the LaTeX editor as a tool surface, not a generic dashboard page
- Continue separating AI output from core human collaboration where possible

## 14. Recommended Cleanup Areas

If the goal is to improve design consistency later, the highest-value cleanup areas are:

- Centralize color tokens further so fewer components hardcode hex values
- Standardize status badge implementations
- Unify project tab ordering across pages
- Reduce ad hoc inline styles in favor of shared components
- Review small-text accessibility in labels, metadata, and controls
- Formalize AI-specific UI patterns across chat, library, and LaTeX workflows

## 15. Summary

ResearchCollab’s UI is best described as:

- a dark collaborative research workspace
- with an editorial typography layer
- a lightweight IDE influence on complex pages
- restrained motion
- blue-led productivity actions
- violet-led AI affordances

Its strongest design quality is that it already feels like a purpose-built research tool rather than a generic admin dashboard.
