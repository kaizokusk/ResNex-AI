# ResearchCollab — LaTeX Layer Spec
> For spec-driven development. Feed this to Claude Code phase by phase.

---

## 1. What This Module Does

Members write sections in the workspace. When sections are approved, the LaTeX Layer transforms them into a publication-ready `.tex` project. It is an Overleaf-style IDE embedded in the platform — file tree + Monaco editor + live PDF preview.

A **Transfer Agent** bridges the gap: content from chat or workspace can be pushed directly into the LaTeX file tree with a single command.

### Core Flow
```
Sections approved → Admin triggers Sync → main.tex built
→ Members edit in Monaco → Compile → PDF preview
→ Chat/@agent → Transfer → LatexFile updated live
```

---

## 2. Data Models

### 2.1 LatexFile (new model)

```prisma
enum LatexFileType {
  CODE    // .tex, .bib, .cls, .sty
  IMAGE   // .png, .jpg, .pdf (figures)
  DATA    // .csv
}

model LatexFile {
  id        String        @id @default(uuid())
  projectId String
  fileName  String        // e.g. "main.tex", "figures/fig1.png"
  type      LatexFileType
  content   String?       // LaTeX/BibTeX source code (null for IMAGE/DATA)
  fileUrl   String?       // Uploadthing URL (null for CODE)
  isMain    Boolean       @default(false)  // only one per project
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, fileName])
  @@map("latex_files")
}
```

Add relation to `Project` model:
```prisma
latexFiles LatexFile[]
```

### 2.2 Existing Models — No Changes Required
- `Section` — source of truth for content sync
- `Paper` — source of truth for bibliography sync
- `AgentPanelItem` — used by Transfer Agent to push content

---

## 3. Page Layout — `/project/[id]/latex`

Three-column IDE using `react-resizable-panels`.

```
┌─────────────────────────────────────────────────────────────┐
│  Nav (shared across all project pages)                       │
├──────────────┬────────────────────────────┬─────────────────┤
│  File Tree   │     Monaco Editor          │   PDF Preview   │
│  (240px)     │     (flex-1)               │   (400px)       │
│              │                            │                 │
│  main.tex    │  \documentclass{article}   │  [PDF iframe]   │
│  refs.bib    │  \begin{document}          │                 │
│  figures/    │    ...                     │  [Recompile]    │
│    fig1.png  │  \end{document}            │  [Compile log]  │
│              │                            │                 │
│  [+ New]     │                            │  Status: ✓      │
│  [↑ Upload]  │  [auto-saved]              │                 │
└──────────────┴────────────────────────────┴─────────────────┘
```

### 3.1 File Tree (Left, 240px default)
- Lists all `LatexFile` records for the project
- Grouped: CODE files first, then IMAGE/DATA under `figures/`
- Click file → loads into editor (CODE) or shows thumbnail (IMAGE)
- Right-click context menu: Rename, Delete
- `+ New File` button → modal with name input, defaults to `.tex`
- `↑ Upload` button → Uploadthing dropzone (image/pdf/csv only)
- Active file highlighted
- `main.tex` shown with star icon, always first

### 3.2 Monaco Editor (Center, flex-1)
- Language: `latex` (Monaco built-in)
- Theme: dark (matching app palette `#0a0c10` background)
- Auto-save: debounced 500ms → `PATCH /api/projects/[id]/latex/files/[fileId]`
- Unsaved indicator: dot next to filename in file tree
- Keyboard shortcut: `Cmd/Ctrl + S` → force save
- No file selected state: prompt "Select a file or sync sections to start"
- IMAGE/DATA files: editor hidden, show preview/table instead

### 3.3 PDF Preview (Right, 400px default)
- `<iframe>` rendering the compiled PDF URL
- Toolbar:
  - **Recompile** button → `POST /api/projects/[id]/latex/compile`
  - Status badge: `Idle | Compiling... | ✓ Ready | ✗ Error`
  - **View Log** toggle → shows `logs` string from compile response
- Error state: show log inline with error lines highlighted
- Empty state: "Click Recompile to generate PDF"

### 3.4 Top Action Bar (above editor)
- **Sync Sections** button → `POST /api/projects/[id]/latex/sync`
  - Pulls all approved sections → rebuilds `main.tex`
  - Shows spinner while running
  - On success: file tree refreshes, editor loads new `main.tex`
- **Template** label (read-only): e.g. "IEEE" / "ACM" / "Generic"
- **Compile** shortcut button (duplicate of preview panel button)

---

## 4. API Contracts

All routes: `app/api/projects/[id]/latex/`
Auth: `getAuthUser()` → member check on every route.

### 4.1 File Management

#### `GET /api/projects/[id]/latex/files`
- Auth: member
- Returns: `LatexFile[]` ordered by `type ASC, fileName ASC`

#### `POST /api/projects/[id]/latex/files`
- Auth: member
- Body:
  ```ts
  {
    fileName: string      // must be unique within project
    type: LatexFileType
    content?: string      // for CODE files
    fileUrl?: string      // for IMAGE/DATA files (from Uploadthing)
    isMain?: boolean
  }
  ```
- Validation:
  - `fileName` must not already exist for this project
  - CODE files require `content` or default to `""`
  - IMAGE/DATA files require `fileUrl`
  - Only one `isMain=true` file allowed per project — setting this unsets others
- Returns: `LatexFile`

#### `PATCH /api/projects/[id]/latex/files/[fileId]`
- Auth: member
- Body: `{ content?: string, fileName?: string, isMain?: boolean }`
- Emits Socket.io event `latex_file_updated`
- Returns: updated `LatexFile`

#### `DELETE /api/projects/[id]/latex/files/[fileId]`
- Auth: member
- Cannot delete `isMain=true` file (return 400)
- Returns: `{ deleted: true }`

### 4.2 Sync (Architect Agent)

#### `POST /api/projects/[id]/latex/sync`
- Auth: admin
- No body required
- Steps:
  1. Fetch all `Section[]` where `submitted=true`
  2. Fetch all `Paper[]` where `status="ready"` (for bibliography)
  3. Call `latexAgent.sync({ sections, papers, projectId })`
  4. Agent builds `main.tex` content + `refs.bib` content
  5. Upsert `LatexFile` records: `main.tex (isMain=true)`, `refs.bib`
  6. Emit `latex_file_updated` for each upserted file
- Returns:
  ```ts
  {
    filesUpdated: string[]   // ["main.tex", "refs.bib"]
    sectionsIncluded: number
    papersIncluded: number
  }
  ```

### 4.3 Compile

#### `POST /api/projects/[id]/latex/compile`
- Auth: member
- Steps:
  1. Fetch all `LatexFile[]` for project
  2. Send to external LaTeX compile service (see §8)
  3. On success: store PDF URL, update `Project.pdfUrl`
  4. Emit `compile_status` via Socket.io
- Returns:
  ```ts
  {
    pdfUrl: string | null
    logs: string          // raw compiler log
    success: boolean
    errorLine?: number    // first error line number if failed
  }
  ```

### 4.4 Transfer Bridge

#### `POST /api/projects/[id]/latex/transfer`
- Auth: member
- Body:
  ```ts
  {
    content: string          // text/markdown/LaTeX to insert
    contentType: "text" | "image" | "table" | "equation"
    targetFile?: string      // fileName to insert into (default: main.tex)
    targetSection?: string   // e.g. "results", "methodology"
    sourceMessageId?: string // ChatMessage.id for traceability
  }
  ```
- Steps:
  1. Call `transferAgent.convert({ content, contentType, targetSection })`
  2. Agent returns formatted LaTeX snippet
  3. Append snippet to target file content
  4. Save via PATCH (same as file update)
  5. Emit `latex_file_updated`
- Returns: `{ inserted: string, file: LatexFile }`

---

## 5. Agent System

### 5.1 LatexArchitect Agent (`lib/agents/latexAgent.ts`)

**Sync action** — builds `main.tex` from approved sections:
```ts
interface SyncInput {
  sections: Section[]  // all submitted sections
  papers: Paper[]      // all ready papers
  projectId: string
  template?: "ieee" | "acm" | "generic"  // default: "generic"
}

interface SyncOutput {
  mainTex: string    // full main.tex content
  refsBib: string    // full refs.bib content
}
```

`main.tex` structure produced:
```latex
\documentclass[...]{article}
\usepackage{...}
\bibliography{refs}

\title{<project.title>}
\author{<members joined by \and>}

\begin{document}
\maketitle
\begin{abstract}...\end{abstract}

% one \section per approved Section record
\section{<subtopic>}
<content converted from TipTap JSON to LaTeX>

\bibliographystyle{plain}
\bibliography{refs}
\end{document}
```

**Debug action** — reads compiler log, suggests fixes:
```ts
interface DebugInput {
  logs: string
  mainTex: string
}
interface DebugOutput {
  suggestions: { line: number; issue: string; fix: string }[]
  fixedTex?: string   // if confident, returns corrected content
}
```

### 5.2 Transfer Agent (`lib/agents/transferAgent.ts`)

Converts arbitrary content into LaTeX syntax:

```ts
interface TransferInput {
  content: string
  contentType: "text" | "image" | "table" | "equation"
  targetSection?: string
  fileName?: string  // image filename if contentType=image
}

interface TransferOutput {
  latex: string    // the formatted LaTeX block to insert
  label?: string   // generated \label{} for cross-referencing
}
```

Conversion rules:
| `contentType` | Input | Output |
|---|---|---|
| `text` | Markdown / plain | `\paragraph{...}` or `\section{...}` block |
| `image` | Uploadthing URL | `\begin{figure}...\includegraphics...\caption...\end{figure}` |
| `table` | CSV or Markdown table | `\begin{table}...\begin{tabular}...\end{tabular}...\end{table}` |
| `equation` | Plain math or image OCR | `\begin{equation}...\end{equation}` |

Register in `lib/agents/index.ts`:
```ts
import { latexAgent } from './latexAgent'
import { transferAgent } from './transferAgent'

export const agents = {
  ...existing,
  latex: latexAgent,
  transfer: transferAgent,
}
```

### 5.3 Chat Integration — `/transfer` slash command

In `app/api/projects/[id]/chat/route.ts`, add handler:
```
/transfer [targetFile?]
```
- Takes the previous AI message or quoted user message
- Calls `POST /api/projects/[id]/latex/transfer` with detected `contentType`
- Posts confirmation back to chat: "Transferred to `main.tex` → results section"

---

## 6. State Management

### 6.1 New Zustand Store: `latexStore`

```ts
// store/latexStore.ts

interface LatexStore {
  // File tree
  files: LatexFile[]
  activeFileId: string | null

  // Editor
  unsavedIds: Set<string>    // fileIds with unsaved changes
  localContent: Record<string, string>  // fileId → draft content

  // Compile
  compileStatus: 'idle' | 'compiling' | 'ready' | 'error'
  pdfUrl: string | null
  compileLogs: string | null
  showLogs: boolean

  // Actions
  setFiles: (files: LatexFile[]) => void
  setActiveFile: (id: string) => void
  updateLocalContent: (id: string, content: string) => void
  markSaved: (id: string) => void
  setCompileStatus: (status, pdfUrl?, logs?) => void
  toggleLogs: () => void
}
```

---

## 7. Realtime Events (Socket.io)

### Client → Server
| Event | Payload | When |
|---|---|---|
| `latex_editing` | `{ projectId, fileId, userId }` | User starts editing a file |
| `latex_idle` | `{ projectId, fileId, userId }` | User stops editing |

### Server → Client
| Event | Payload | When |
|---|---|---|
| `latex_file_updated` | `{ fileId, fileName, updatedBy }` | Any file saved |
| `latex_editing` | `{ fileId, userId, userName }` | Another member editing |
| `compile_status` | `{ status, pdfUrl?, logs? }` | Compile starts/finishes |

**Conflict prevention:** When `latex_editing` received for the active file, show banner: "⚠ {name} is also editing this file" — no locking, just warning.

---

## 8. External LaTeX Compiler

Use [LaTeX.Online](https://latexonline.cc) or self-hosted [Tectonic](https://tectonic-typesetting.github.io) via a small Express microservice.

### Compile Request
```
POST <LATEX_COMPILER_URL>/compile
Content-Type: multipart/form-data

files[]: main.tex (source)
files[]: refs.bib
files[]: figures/fig1.png
engine: pdflatex
```

### Compile Response
```json
{
  "success": true,
  "pdf": "<base64-encoded PDF>",
  "log": "This is pdflatex 3.14...\n..."
}
```

The API route decodes the PDF, uploads to Uploadthing, stores URL in `Project.pdfUrl`.

Environment variable required:
```
LATEX_COMPILER_URL=https://...
```

---

## 9. Component File Map

```
components/latex/
  LatexPage.tsx          — top-level layout (react-resizable-panels)
  FileTree.tsx           — left sidebar file tree
  FileTreeItem.tsx       — single file row with context menu
  FileUploadZone.tsx     — Uploadthing dropzone for images/CSVs
  MonacoEditor.tsx       — Monaco wrapper with auto-save
  PdfPreview.tsx         — iframe + toolbar + log viewer
  TopActionBar.tsx       — Sync Sections + Template label + Compile
  ConflictBanner.tsx     — "X is also editing" warning bar
  TransferConfirmToast.tsx — "Transferred to main.tex" notification
```

Page file: `app/project/[id]/latex/page.tsx`
Nav tab: Add `{ label: 'LaTeX', href: /project/${id}/latex, icon: 'τ' }` back to all project pages.

---

## 10. Acceptance Criteria

### Phase 1 — Database
- [ ] `LatexFile` model in `prisma/schema.prisma`
- [ ] `prisma db push` succeeds with no errors
- [ ] `Project` has `latexFiles LatexFile[]` relation

### Phase 2 — File Tree API
- [ ] `GET /files` returns empty array for new project
- [ ] `POST /files` creates CODE file with empty content
- [ ] `POST /files` creates IMAGE file with fileUrl
- [ ] Only one `isMain=true` per project enforced
- [ ] `DELETE` blocked on main file, succeeds on others
- [ ] `PATCH` updates content, emits socket event

### Phase 3 — Editor UI
- [ ] File tree renders all files grouped by type
- [ ] Click CODE file → Monaco editor loads content
- [ ] Type in editor → unsaved dot appears within 100ms
- [ ] 500ms after last keystroke → auto-save fires
- [ ] Saved → unsaved dot removed
- [ ] Cmd+S → immediate save
- [ ] Click IMAGE file → thumbnail shown instead of editor
- [ ] `+ New File` creates file, selects it in tree
- [ ] Upload image → appears in `figures/` group

### Phase 4 — Sync Agent
- [ ] Sync with no approved sections → creates skeleton `main.tex`
- [ ] Sync with 2 approved sections → `\section{}` per section
- [ ] Sync with papers → `refs.bib` contains BibTeX entries
- [ ] Repeat sync → upserts files (no duplicates)
- [ ] File tree refreshes after sync without page reload

### Phase 5 — Transfer Bridge
- [ ] `/transfer` in chat → Transfer Agent called
- [ ] text content → `\paragraph{}` block appended to main.tex
- [ ] image URL → `\begin{figure}` block with `\includegraphics`
- [ ] CSV content → `\begin{tabular}` block
- [ ] Confirmation toast appears in editor
- [ ] `latex_file_updated` socket event fires

### Phase 6 — Compile
- [ ] Compile button → spinner shown
- [ ] Success → PDF loads in iframe
- [ ] Error → log shown with first error line highlighted
- [ ] `compile_status` socket event sent to all project members
- [ ] Log toggle shows/hides full compiler output

### Phase 7 — Conflict Prevention
- [ ] Editing file → emits `latex_editing` to socket
- [ ] Another member's edit → `ConflictBanner` appears
- [ ] Stop editing → `latex_idle` emitted, banner removed

---

## 11. Environment Variables (additions)

```
LATEX_COMPILER_URL=https://...    # External TeX compile service
```

---

## 12. Out of Scope for This Module

- Real-time collaborative editing (Google Docs-style)
- LaTeX syntax highlighting in file tree
- Git version control for `.tex` files
- Custom `.cls` / `.sty` file authoring
- Multi-compiler support (XeLaTeX, LuaLaTeX) — only pdflatex for now
