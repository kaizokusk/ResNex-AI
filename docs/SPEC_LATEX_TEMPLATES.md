# SPEC: LaTeX Templates + Notebook Cell Authoring Layer
**Version:** 2.0
**Status:** Draft — Ready for Implementation
**Builds on:** SPEC_LATEX.md (existing 3-column LaTeX IDE)

---

## 1. Problem Statement

Most researchers are not LaTeX experts. Raw syntax (`\begin{figure}`, `\cite{}`, etc.) is a barrier that slows writing and excludes non-technical collaborators.

**Goal:** A notebook-style cell editor — like Notion or Jupyter — where users click to add blocks (text, figure, table, equation), write in plain language, and hit one button to auto-generate the full LaTeX paper. Zero syntax knowledge required.

---

## 2. System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  TEMPLATE LAYER                                                   │
│  Pick a paper type → section files created automatically          │
│  (IEEE / ACM / Nature / Thesis / Report / Blank)                 │
├──────────────────────────────────────────────────────────────────┤
│  NOTEBOOK AUTHORING LAYER                                         │
│                                                                   │
│  Each section = a stack of cells:                                 │
│   [Text cell] [Figure cell] [Table cell] [Equation cell]         │
│   [+ Add Cell ▾]  ← dropdown: Text / Heading / Figure /          │
│                              Table / Equation / Note              │
│                                                                   │
│   Figure & Table cells have [✨ Infer] button:                   │
│   → calls LLM → inserts new Text cell with AI-written analysis   │
│                                                                   │
│   AI Writing Assistant panel: suggests full section content       │
├──────────────────────────────────────────────────────────────────┤
│  CONVERSION LAYER                                                 │
│  [Convert to LaTeX] button                                        │
│  Cell JSON → LaTeX syntax → main.tex assembled → PDF             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Templates

### 3.1 Template Registry

Each template defines:
- **id** — machine identifier
- **label** — display name shown in picker
- **description** — one-line description
- **sections** — ordered list of section names to create
- **mainTexSkeleton** — LaTeX preamble + document structure
- **bibStyle** — citation style (`IEEEtran`, `acm`, `apalike`)

### 3.2 Supported Templates (v1)

| ID | Label | Sections created |
|----|-------|-----------------|
| `ieee` | IEEE Conference Paper | abstract, introduction, related-work, methodology, experiments, results, discussion, conclusion |
| `acm` | ACM Paper | abstract, introduction, background, methodology, evaluation, discussion, conclusion, future-work |
| `nature` | Nature / Science | abstract, introduction, results, discussion, methods, data-availability |
| `thesis` | PhD / MSc Thesis | abstract, introduction, literature-review, methodology, implementation, results, discussion, conclusion, appendix |
| `report` | Research Report | executive-summary, background, methodology, findings, analysis, recommendations |
| `blank` | Blank Paper | abstract, introduction, body, conclusion |

### 3.3 File Tree After Template Applied (example: `ieee`)

```
📄 main.tex          ← auto-generated skeleton, locked (🔒 icon)
📄 refs.bib          ← auto-populated from project library
📁 sections/
   📓 abstract.json
   📓 introduction.json
   📓 related-work.json
   📓 methodology.json
   📓 experiments.json
   📓 results.json
   📓 discussion.json
   📓 conclusion.json
📁 figures/          ← user uploads here
```

Section files are stored as `LatexFile` records with `type = 'CODE'`, `fileName` ending in `.json`.
File tree shows them with a notebook (📓) icon. Clicking opens the Cell Editor, not Monaco.

---

## 4. Cell Data Model

Each section file's `content` field stores a JSON string:

```ts
interface SectionDoc {
  cells: Cell[]
}

type Cell =
  | TextCell
  | HeadingCell
  | FigureCell
  | TableCell
  | EquationCell
  | NoteCell
  | CitationCell

interface TextCell {
  id: string          // uuid
  type: 'text'
  content: string     // plain prose, no syntax
}

interface HeadingCell {
  id: string
  type: 'heading'
  level: 2 | 3       // 2 = subsection, 3 = subsubsection
  content: string
}

interface FigureCell {
  id: string
  type: 'figure'
  fileUrl: string     // Uploadthing URL
  fileName: string    // e.g. "figures/graph.png"
  caption: string
}

interface TableCell {
  id: string
  type: 'table'
  caption: string
  headers: string[]   // e.g. ["Method", "Accuracy", "F1"]
  rows: string[][]    // e.g. [["Ours", "94.2%", "0.93"], ...]
}

interface EquationCell {
  id: string
  type: 'equation'
  formula: string     // LaTeX math only (user types or pastes)
  label?: string      // optional \label{eq:label}
}

interface NoteCell {
  id: string
  type: 'note'
  content: string     // private — never included in LaTeX output
}

interface CitationCell {
  id: string
  type: 'citation'
  keys: string[]      // e.g. ["Smith2020", "Jones2021"]
  context?: string    // optional inline sentence using the cite
}
```

---

## 5. Cell Editor UI

### 5.1 Layout

The cell editor replaces Monaco when a `.json` section file is active. It takes the full center panel of the LaTeX IDE.

```
┌─────────────────────────────────────────────────────────────────┐
│  📓 Introduction           [AI Suggest ✨]  [Preview LaTeX 👁]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ TEXT ──────────────────────────────────────────────────┐    │
│  │ Deep learning has fundamentally transformed computer    │    │
│  │ vision. Recent advances in...                           │    │
│  │ [editable — click to type]              ⋮ [× delete]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│           ┌──────────────────────────┐                          │
│           │  + Add Cell  ▾           │  ← dropdown              │
│           └──────────────────────────┘                          │
│                                                                  │
│  ┌─ FIGURE ────────────────────────────────────────────────┐    │
│  │  [ 📷 Upload Image ]   or drag & drop here              │    │
│  │  Caption: [Figure 1: Performance comparison across...]  │    │
│  │                                                          │    │
│  │  [ ✨ Infer — write analysis of this figure ]           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│           ┌──────────────────────────┐                          │
│           │  + Add Cell  ▾           │                          │
│           └──────────────────────────┘                          │
│                                                                  │
│  ┌─ TABLE ─────────────────────────────────────────────────┐    │
│  │  Caption: [Table 1: Results comparison]                  │    │
│  │  ┌──────────┬───────────┬─────────┐                     │    │
│  │  │ Method   │ Accuracy  │ F1      │  [+ Col]            │    │
│  │  ├──────────┼───────────┼─────────┤                     │    │
│  │  │ Ours     │ 94.2%     │ 0.93    │                     │    │
│  │  │ Baseline │ 87.1%     │ 0.85    │                     │    │
│  │  └──────────┴───────────┴─────────┘  [+ Row]            │    │
│  │                                                          │    │
│  │  [ ✨ Infer — write analysis of this table ]            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│           ┌──────────────────────────┐                          │
│           │  + Add Cell  ▾           │                          │
│           └──────────────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 "Add Cell" Dropdown Options

| Option | Icon | Creates |
|--------|------|---------|
| Text | 📝 | `TextCell` — blank textarea |
| Heading | ## | `HeadingCell` — with level toggle (##/###) |
| Figure | 📷 | `FigureCell` — upload area + caption field |
| Table | 📊 | `TableCell` — 2×2 grid, expandable |
| Equation | ∑ | `EquationCell` — formula input with live preview |
| Citation | 📚 | `CitationCell` — key input with autocomplete from refs.bib |
| Note | 🗒 | `NoteCell` — private memo, shown in yellow, never in PDF |

### 5.3 Cell Interactions

- **Click** any cell to edit it
- **Drag handle** (⋮⋮ left edge) to reorder cells
- **× button** (top-right of each cell) to delete
- **Enter** at the end of a Text cell creates a new Text cell below
- Cells auto-save to `LatexFile.content` on every change (debounced 800ms)

### 5.4 Figure Cell Behavior

1. User clicks "Upload Image" → Uploadthing `latexAsset` endpoint
2. Uploaded image displays inline as a preview thumbnail
3. Caption field below the image
4. After upload OR after caption filled in → **"✨ Infer"** button appears

### 5.5 Table Cell Behavior

1. Starts as 2 columns × 2 rows (header + 1 data row)
2. "+ Col" adds a column; "+ Row" adds a row
3. Each cell is a plain text input — no formatting needed
4. Caption field at the top
5. **"✨ Infer"** button always visible once any data is entered

---

## 6. Infer Button (AI Cell Analysis)

### 6.1 Purpose

Below every Figure and Table cell, an "✨ Infer" button calls the LLM to generate an academic paragraph interpreting that content. The result is inserted as a new Text cell directly below the figure/table.

### 6.2 Figure Inference

**Input to LLM:**
```
You are a research writing assistant.
Write one academic paragraph that describes and analyzes the following figure
for the "{SECTION_NAME}" section of a research paper on "{PROJECT_TOPIC}".

Figure caption: {CAPTION}
Figure filename: {FILE_NAME}

Write in third person, academic English. 2-4 sentences. Reference "Figure N" naturally.
Do not use LaTeX syntax. Plain text only.
```

**Output:** plain text paragraph → inserted as a `TextCell` below the figure cell.

### 6.3 Table Inference

**Input to LLM:**
```
You are a research writing assistant.
Write one academic paragraph interpreting the following table of results
for the "{SECTION_NAME}" section of a research paper on "{PROJECT_TOPIC}".

Table caption: {CAPTION}
Headers: {HEADERS joined by " | "}
Data rows:
{ROWS — one per line, cells joined by " | "}

Identify the key findings. Compare rows. Highlight the best-performing entry.
Write in third person, academic English. 3-5 sentences. Reference "Table N" naturally.
Do not use LaTeX syntax. Plain text only.
```

**Output:** plain text paragraph → inserted as a `TextCell` below the table cell.

### 6.4 API Endpoint

```
POST /api/projects/[id]/latex/infer
Body: {
  sectionName: string
  cellType: 'figure' | 'table'
  figure?: { fileUrl: string, fileName: string, caption: string }
  table?: { headers: string[], rows: string[][], caption: string }
}
Returns: { text: string }
```

---

## 7. AI Writing Assistant

### 7.1 Purpose

A collapsible right sidebar panel (inside the center editor panel) that suggests the full content for the open section. Useful when a user doesn't know where to start.

### 7.2 Trigger Modes

| Trigger | What happens |
|---------|-------------|
| "AI Suggest ✨" button (top of editor) | Generates full section suggestion as cells |
| "Fill section for me" | Replaces current cells with AI-generated ones |
| "Add as cells below" | Appends AI-generated cells at the bottom |

### 7.3 Context Used

- Project `title`, `topic`, `description`
- Current section name
- Content of other already-written sections (to avoid repetition)
- Papers in project library (titles + abstracts)
- Submitted workspace sections from members

### 7.4 Output Format

The LLM returns a JSON array of cells matching the `Cell` type schema, which are then rendered directly in the editor. Example:

```json
[
  { "type": "text", "content": "Deep learning has fundamentally transformed..." },
  { "type": "heading", "level": 2, "content": "Motivation" },
  { "type": "text", "content": "Prior work has shown that..." }
]
```

### 7.5 API Endpoint

```
POST /api/projects/[id]/latex/suggest
Body: { sectionFileName: string }
Returns: { cells: Cell[] }
```

### 7.6 Agent File

`lib/agents/writingAssistantAgent.ts`

Exported:
- `suggestSection(input: SuggestInput): Promise<Cell[]>`
- `SuggestInput { projectId, sectionName, completedSections, papers, topic }`

---

## 8. Auto-LaTeX Conversion Agent

### 8.1 Purpose

One "Convert to LaTeX" button converts all section `.json` files → complete `main.tex`. Zero user interaction with LaTeX required.

### 8.2 Conversion Pipeline

```
sections/abstract.json     → \begin{abstract}...\end{abstract}  ─┐
sections/introduction.json → \section{Introduction}...           ─┤
sections/methodology.json  → \section{Methodology}...            ─┼→ main.tex → compile → PDF
sections/results.json      → \section{Results}...                ─┤
sections/conclusion.json   → \section{Conclusion}...             ─┘
refs.bib                   → unchanged
```

### 8.3 Cell → LaTeX Conversion Rules

| Cell type | LaTeX output |
|-----------|-------------|
| `TextCell` | Plain paragraph (LLM escapes special chars: %, &, $, #, ~, _) |
| `HeadingCell` level 2 | `\subsection{content}` |
| `HeadingCell` level 3 | `\subsubsection{content}` |
| `FigureCell` | `\begin{figure}[h]\centering\includegraphics[width=\linewidth]{fileName}\caption{caption}\label{fig:id}\end{figure}` |
| `TableCell` | `\begin{table}[h]\centering\caption{caption}\begin{tabular}{cols}...\end{tabular}\end{table}` |
| `EquationCell` | `\begin{equation}\label{eq:id}formula\end{equation}` |
| `CitationCell` | `\cite{key1, key2}` inline, or wrapped in sentence if `context` set |
| `NoteCell` | **excluded entirely** |

### 8.4 Two-Pass Approach for Text

1. **Rule-based pass** — converts all non-text cells deterministically (figures, tables, equations, headings, citations). Fast, no LLM.
2. **LLM pass** — for `TextCell` content only: cleans grammar, improves academic tone, escapes LaTeX special characters.

LLM prompt for text pass:
```
Convert this plain English text to clean LaTeX paragraphs.
Escape all special characters (%, &, $, #, ~, _).
Do not add any \section or structural commands — just the paragraph text.
Output only the LaTeX, no explanation.

Text: {content}
```

### 8.5 API Endpoints

```
POST /api/projects/[id]/latex/convert
Body: { compileAfter?: boolean }
Returns: { success: boolean, sectionsConverted: number, logs: string }

POST /api/projects/[id]/latex/convert/preview
Body: { sectionFileName: string }
Returns: { latex: string }    ← preview one section, no save
```

### 8.6 Agent File

`lib/agents/latexConversionAgent.ts`

Exported:
- `convertCells(cells: Cell[], sectionName: string, template: Template): Promise<string>`
- `assembleMainTex(template: Template, sections: Record<string, string>): string`
- `cellToLatex(cell: Cell): string` — deterministic rule-based conversion (no LLM)
- `escapeLatex(text: string): string` — escapes special chars

---

## 9. Template Selector UI

### 9.1 Location

Top bar of the LaTeX page:

```
[ Template: IEEE ▾ ]  [ Sync Sections ]  [ Convert to LaTeX ]  [ Compile ▶ ]
```

### 9.2 Behavior

1. Dropdown shows templates with name + description
2. Selecting shows confirmation modal:
   ```
   Apply "IEEE Conference Paper" template?
   Creates 8 section files. Existing files are not deleted.
   [ Cancel ]  [ Apply ]
   ```
3. API call creates section `.json` files + `main.tex` skeleton
4. File tree refreshes, first section auto-opens in cell editor

### 9.3 API Endpoint

```
POST /api/projects/[id]/latex/template
Body: { templateId: string }
Returns: { filesCreated: string[], mainTexUpdated: boolean }
```

---

## 10. Convert + Progress UI

### 10.1 "Convert to LaTeX" Button

- Click → confirmation dialog: "Convert all sections to LaTeX? main.tex will be updated."
- Shows per-section progress: "Converting introduction... ✓"
- On done: "✓ 8 sections converted. main.tex updated."
- Two CTA buttons: `[ View main.tex ]` `[ Compile PDF ▶ ]`

### 10.2 Writing Progress Panel

Below the PDF preview panel, a status sidebar:

```
┌─ Sections ────────────────────────────────┐
│ ✅ abstract          182 words            │
│ ✅ introduction      641 words            │
│ 🔄 methodology       in progress          │
│ ⬜ results           empty                │
│ ⬜ conclusion        empty                │
│                                           │
│ 5 / 8 sections done                      │
└───────────────────────────────────────────┘
```

Clicking any section row opens it in the cell editor.

---

## 11. Data Model Changes

### 11.1 `LatexFile` — No schema change needed

Section files stored as:
- `type = 'CODE'`
- `fileName = 'sections/introduction.json'`
- `content = JSON.stringify({ cells: [...] })`

### 11.2 `Project` — Add `latexTemplateId`

```prisma
model Project {
  ...
  latexTemplateId String?
}
```

### 11.3 New: `LatexConversionLog`

```prisma
model LatexConversionLog {
  id               String   @id @default(uuid())
  projectId        String
  convertedAt      DateTime @default(now())
  sectionsConverted Int
  success          Boolean
  logs             String?
  project          Project  @relation(fields: [projectId], references: [id])
  @@map("latex_conversion_logs")
}
```

---

## 12. Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `TemplatePicker` | `components/latex/TemplatePicker.tsx` | Dropdown + modal for template selection |
| `CellEditor` | `components/latex/CellEditor.tsx` | Main notebook editor — renders cell stack |
| `AddCellButton` | `components/latex/AddCellButton.tsx` | "+ Add Cell ▾" dropdown between cells |
| `TextCellBlock` | `components/latex/cells/TextCellBlock.tsx` | Editable textarea cell |
| `HeadingCellBlock` | `components/latex/cells/HeadingCellBlock.tsx` | Heading with ##/### toggle |
| `FigureCellBlock` | `components/latex/cells/FigureCellBlock.tsx` | Image upload + caption + Infer button |
| `TableCellBlock` | `components/latex/cells/TableCellBlock.tsx` | Spreadsheet grid + caption + Infer button |
| `EquationCellBlock` | `components/latex/cells/EquationCellBlock.tsx` | Formula input + KaTeX live preview |
| `NoteCellBlock` | `components/latex/cells/NoteCellBlock.tsx` | Yellow private note |
| `CitationCellBlock` | `components/latex/cells/CitationCellBlock.tsx` | Citation key input with autocomplete |
| `InferButton` | `components/latex/InferButton.tsx` | "✨ Infer" — triggers AI analysis |
| `WritingAssistantPanel` | `components/latex/WritingAssistantPanel.tsx` | AI suggest sidebar |
| `WritingProgress` | `components/latex/WritingProgress.tsx` | Section completion status list |
| `ConvertButton` | `components/latex/ConvertButton.tsx` | "Convert to LaTeX" with progress states |
| `SectionPreview` | `components/latex/SectionPreview.tsx` | Shows LaTeX preview for current section |

---

## 13. Implementation Phases

### Phase 1 — Templates + File Tree
- `lib/latex-templates/` folder (one file per template, exports sections + mainTexSkeleton)
- `POST /api/projects/[id]/latex/template`
- `TemplatePicker` dropdown + confirmation modal
- File tree: `.json` section files shown with 📓 icon

### Phase 2 — Cell Editor Core
- `CellEditor` component rendering cells from JSON
- `AddCellButton` dropdown
- `TextCellBlock`, `HeadingCellBlock` (most common, build first)
- Auto-save cells to DB on change

### Phase 3 — Figure + Table Cells
- `FigureCellBlock` with Uploadthing integration
- `TableCellBlock` with editable grid (+ Row / + Col)
- Drag-to-reorder cells

### Phase 4 — Infer Button
- `InferButton` component
- `POST /api/projects/[id]/latex/infer` endpoint
- `lib/agents/writingAssistantAgent.ts` (infer functions)
- Inserts AI-generated Text cell below figure/table

### Phase 5 — AI Writing Assistant
- Full section suggestion (`suggestSection`)
- `POST /api/projects/[id]/latex/suggest`
- `WritingAssistantPanel` UI
- `WritingProgress` panel

### Phase 6 — Conversion + Compile
- `lib/agents/latexConversionAgent.ts`
- `POST /api/projects/[id]/latex/convert`
- `POST /api/projects/[id]/latex/convert/preview`
- `ConvertButton` with progress UI
- `SectionPreview` panel (LaTeX preview of current section)

### Phase 7 — Polish
- `EquationCellBlock` with KaTeX live preview
- `CitationCellBlock` with autocomplete from refs.bib keys
- `NoteCellBlock`
- `/suggest [section]` slash command in project chat

---

## 14. Acceptance Criteria

- [ ] Selecting a template creates the correct section `.json` files in the file tree
- [ ] Clicking a section file opens the Cell Editor (not Monaco)
- [ ] "Add Cell" dropdown inserts the correct cell type
- [ ] Text cells save automatically on typing (debounced)
- [ ] Figure cells accept image upload and show a preview thumbnail
- [ ] Table cells have working + Row / + Col buttons
- [ ] "✨ Infer" on a figure generates a descriptive paragraph and inserts it below
- [ ] "✨ Infer" on a table generates an interpretive paragraph and inserts it below
- [ ] "AI Suggest" fills the section with relevant, contextual cells
- [ ] "Convert to LaTeX" produces a valid compilable `main.tex`
- [ ] Note cells are excluded from all LaTeX output
- [ ] Cells can be reordered by drag
- [ ] Writing Progress panel shows word count and completion per section
- [ ] The entire flow (template → write → convert → compile → PDF) works end-to-end without typing a single LaTeX command

---

## 15. Edge Cases & Design Decisions

| Scenario | Decision |
|----------|----------|
| User has existing `.tex` files when template applied | `.tex` files untouched. Only new `.json` section files created. `main.tex` warned before overwrite. |
| Figure uploaded but not found at compile time | Placeholder `\includegraphics{MISSING_filename}` + warning in convert logs |
| Table with empty cells | Empty cells become `~` (LaTeX non-breaking space) |
| Very long text cell (>4000 tokens) | Split into chunks for LLM pass, rejoin |
| User wants to edit raw LaTeX anyway | They can still open `main.tex` in Monaco. Cell editor and raw editor coexist. |
| Citation key not in refs.bib | Added as `@misc{key, note={TODO: fill citation details}}` placeholder |
| Infer called on figure with no caption | LLM uses filename as context instead |

---

*Implement in phase order. Each phase is independently shippable and testable.*
