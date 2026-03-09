"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getWorkspace, getProjectState, updateProjectState,
  listDocuments, uploadDocument, getDocument,
  listMessages, sendMessage as apiSendMessage,
  askQuestion, generateChatSummary,
  compareDocuments, runPlanner, runWriter, findGaps,
  searchArxiv, importArxiv, searchSemanticScholar, findRelatedPapers, importFromUrl,
  listTasks, createTask, updateTask,
  listReports, createReport, getReport,
} from "@/lib/api";

// ─── Tabs ───
const TABS = [
  { key: "chat", label: "AI Chat" },
  { key: "discover", label: "Discover" },
  { key: "library", label: "Paper Library" },
  { key: "compare", label: "Compare" },
  { key: "tasks", label: "Tasks" },
  { key: "report", label: "Report" },
  { key: "state", label: "Project State" },
];

export default function WorkspacePage() {
  const { id: workspaceId } = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState(null);
  const [tab, setTab] = useState("chat");
  const [error, setError] = useState(null);

  useEffect(() => {
    getWorkspace(workspaceId).then(setWorkspace).catch(() => setError("Workspace not found"));
  }, [workspaceId]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm">Home</button>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return <div className="flex items-center justify-center h-screen bg-slate-100"><div className="animate-pulse text-slate-500 font-bold">Loading workspace...</div></div>;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 overflow-hidden">
      {/* Top bar */}
      <header className="bg-slate-900 text-white px-5 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white text-sm font-bold">&#8592; Home</button>
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-black text-sm">R</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{workspace.name}</h1>
          <p className="text-xs text-slate-400 truncate">{workspace.description || "Research workspace"}</p>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b border-slate-200 px-4 flex gap-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
              tab === t.key ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatPanel workspaceId={workspaceId} />}
        {tab === "discover" && <DiscoverPanel workspaceId={workspaceId} />}
        {tab === "library" && <LibraryPanel workspaceId={workspaceId} />}
        {tab === "compare" && <ComparePanel workspaceId={workspaceId} />}
        {tab === "tasks" && <TasksPanel workspaceId={workspaceId} />}
        {tab === "report" && <ReportPanel workspaceId={workspaceId} />}
        {tab === "state" && <ProjectStatePanel workspaceId={workspaceId} />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DISCOVER PANEL — arXiv search, Semantic Scholar, paper import
// ═══════════════════════════════════════════════════════════════
function DiscoverPanel({ workspaceId }) {
  const [source, setSource] = useState("arxiv");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState({});
  const [message, setMessage] = useState(null);

  const doSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      let data;
      if (source === "arxiv") {
        data = await searchArxiv(workspaceId, { query, max_results: 15 });
      } else {
        data = await searchSemanticScholar(workspaceId, { query, limit: 15 });
      }
      setResults(data.results || []);
      if ((data.results || []).length === 0) setMessage("No results found. Try different keywords.");
    } catch (err) {
      setMessage("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportArxiv = async (arxivId) => {
    setImporting((prev) => ({ ...prev, [arxivId]: "importing" }));
    try {
      const res = await importArxiv(workspaceId, arxivId);
      setImporting((prev) => ({ ...prev, [arxivId]: res.duplicate ? "duplicate" : "imported" }));
    } catch (err) {
      setImporting((prev) => ({ ...prev, [arxivId]: "error" }));
    }
  };

  const handleImportUrl = async (paper) => {
    const pdfUrl = paper.open_access_pdf_url || paper.pdf_url;
    if (!pdfUrl) { alert("No open-access PDF available for this paper."); return; }
    const key = paper.semantic_scholar_id || paper.doi || paper.title;
    setImporting((prev) => ({ ...prev, [key]: "importing" }));
    try {
      await importFromUrl(workspaceId, {
        pdf_url: pdfUrl,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        year: paper.year,
        arxiv_id: paper.arxiv_id,
        doi: paper.doi,
      });
      setImporting((prev) => ({ ...prev, [key]: "imported" }));
    } catch (err) {
      setImporting((prev) => ({ ...prev, [key]: "error" }));
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-1">Discover Papers</h2>
        <p className="text-sm text-slate-500 mb-5">Search arXiv or Semantic Scholar and import papers into your workspace with one click.</p>

        {/* Source toggle + search */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setSource("arxiv")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${source === "arxiv" ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}>arXiv</button>
          <button onClick={() => setSource("semantic-scholar")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${source === "semantic-scholar" ? "bg-indigo-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"}`}>Semantic Scholar</button>
        </div>
        <form onSubmit={doSearch} className="flex gap-2 mb-6">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={source === "arxiv" ? "Search arXiv (e.g. transformer attention mechanism)..." : "Search Semantic Scholar..."} className="flex-1 border border-slate-300 px-4 py-2.5 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{loading ? "Searching..." : "Search"}</button>
        </form>

        {message && <p className="text-sm text-amber-600 mb-4">{message}</p>}

        {/* Results */}
        <div className="space-y-3">
          {results.map((paper, i) => {
            const key = paper.arxiv_id || paper.semantic_scholar_id || paper.doi || `r-${i}`;
            const status = importing[key];
            return (
              <div key={key} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 leading-snug mb-1">{paper.title}</h3>
                    <p className="text-xs text-slate-500 mb-1.5">
                      {(paper.authors || []).slice(0, 4).join(", ")}{(paper.authors || []).length > 4 ? " et al." : ""}
                      {paper.year && <span className="ml-2 text-slate-400">({paper.year})</span>}
                      {paper.citation_count != null && <span className="ml-2 text-indigo-500">{paper.citation_count} citations</span>}
                      {paper.primary_category && <span className="ml-2 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">{paper.primary_category}</span>}
                    </p>
                    {paper.abstract && <p className="text-xs text-slate-600 line-clamp-3">{paper.abstract}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {status === "imported" ? (
                      <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold">Imported</span>
                    ) : status === "importing" ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold animate-pulse">Importing...</span>
                    ) : status === "duplicate" ? (
                      <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-bold">Already in library</span>
                    ) : status === "error" ? (
                      <span className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold">Failed</span>
                    ) : (
                      <button
                        onClick={() => source === "arxiv" ? handleImportArxiv(paper.arxiv_id) : handleImportUrl(paper)}
                        className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-200 transition-colors"
                      >
                        + Import
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAT PANEL — AI Chat with Q&A, agent mentions, summaries
// ═══════════════════════════════════════════════════════════════
function ChatPanel({ workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const refresh = useCallback(() => {
    listMessages(workspaceId).then(setMessages).catch(() => {});
  }, [workspaceId]);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 5000); return () => clearInterval(iv); }, [refresh]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    try {
      await apiSendMessage(workspaceId, { sender_id: "demo-user", sender_name: "You", text });
      // If no @mentions, auto-ask QA for questions
      const hasMention = /@(librarian|planner|writer|gapfinder|meeting-agent|reviewer|summarizer)\b/.test(text);
      if (!hasMention && (text.endsWith("?") || /^(what|how|why|which|who|where|when|compare|summarize|explain|describe)/i.test(text))) {
        await askQuestion(workspaceId, text);
      }
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    try { await generateChatSummary(workspaceId); refresh(); } catch (e) { alert(e.message); } finally { setLoading(false); }
  };
  const handlePlanner = async () => {
    setLoading(true);
    try { await runPlanner(workspaceId); refresh(); } catch (e) { alert(e.message); } finally { setLoading(false); }
  };
  const handleGaps = async () => {
    setLoading(true);
    try { await findGaps(workspaceId); refresh(); } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-full">
      {/* Chat messages */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-20">
              <p className="text-lg font-bold mb-2">Start your research conversation</p>
              <p className="text-sm">Ask questions about your papers, use @agents, or discuss with your team.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender_type === "agent" ? "items-start" : "items-end"}`}>
              <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                {m.sender_type === "agent" ? `🤖 ${m.sender_name || m.sender_id}` : (m.sender_name || "You")}
              </span>
              <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                m.sender_type === "agent"
                  ? "bg-indigo-50 border border-indigo-200 text-slate-800 rounded-tl-none"
                  : "bg-indigo-600 text-white rounded-tr-none"
              }`}>
                {m.sender_type === "agent" ? <SimpleMarkdown text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-200 space-y-1">
                    {m.citations.map((c, i) => (
                      <div key={i} className="text-xs text-indigo-600 bg-indigo-100 rounded px-2 py-1">
                        📎 {c.document_title || "Source"} {c.page_number ? `(p.${c.page_number})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Agent quick-actions */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex gap-2 flex-wrap">
          <button onClick={handleSummarize} disabled={loading} className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 disabled:opacity-50">@meeting-agent Summarize</button>
          <button onClick={handlePlanner} disabled={loading} className="text-xs bg-green-100 text-green-800 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 disabled:opacity-50">@planner Extract Tasks</button>
          <button onClick={handleGaps} disabled={loading} className="text-xs bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200 disabled:opacity-50">@gapfinder Find Gaps</button>
        </div>

        {/* Input */}
        <form onSubmit={send} className="p-3 bg-white border-t border-slate-200 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-slate-300 px-4 py-2.5 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            placeholder="Ask a question about your papers, or chat with your team..."
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIBRARY PANEL — Upload & browse papers with summaries
// ═══════════════════════════════════════════════════════════════
function LibraryPanel({ workspaceId }) {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(() => {
    listDocuments(workspaceId).then(setDocuments).catch(() => {});
  }, [workspaceId]);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 8000); return () => clearInterval(iv); }, [refresh]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(workspaceId, file, file.name.replace(/\.pdf$/i, ""));
      refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const selectDoc = async (doc) => {
    setSelected(doc.id);
    try {
      const d = await getDocument(workspaceId, doc.id);
      setDetail(d);
    } catch { setDetail(null); }
  };

  return (
    <div className="flex h-full">
      {/* Document list */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <label className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl cursor-pointer font-bold text-xs uppercase tracking-wide transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? "Uploading..." : "+ Upload Paper"}
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 && <p className="text-sm text-slate-400 p-4 text-center">No papers yet. Upload a PDF to get started.</p>}
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => selectDoc(doc)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected === doc.id ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""}`}
            >
              <p className="font-semibold text-sm truncate">{doc.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={doc.status} />
                {doc.source_type && doc.source_type !== "pdf" && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{doc.source_type}</span>}
                {doc.page_count && <span className="text-xs text-slate-400">{doc.page_count}p</span>}
                {doc.year && <span className="text-xs text-slate-400">({doc.year})</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Document detail */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {!detail ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p className="text-sm">Select a paper to view its summary and details</p>
          </div>
        ) : (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold mb-2">{detail.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={detail.status} />
              {detail.source_type && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">{detail.source_type}</span>}
              {detail.year && <span className="text-xs text-slate-500">({detail.year})</span>}
              {detail.arxiv_id && <a href={`https://arxiv.org/abs/${detail.arxiv_id}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">arXiv:{detail.arxiv_id}</a>}
              {detail.doi && <span className="text-xs text-slate-500">DOI: {detail.doi}</span>}
            </div>
            {detail.authors && <p className="text-xs text-slate-500 mb-1">{Array.isArray(detail.authors) ? detail.authors.join(", ") : detail.authors}</p>}
            {detail.abstract && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1.5">Abstract</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{detail.abstract}</p>
              </div>
            )}

            {detail.paper_summary ? (
              <div className="space-y-4">
                <SummaryCard label="Short Summary" text={detail.paper_summary.summary_short} />
                <SummaryCard label="Problem Statement" text={detail.paper_summary.problem_statement} />
                <SummaryCard label="Methodology" text={detail.paper_summary.methodology} />
                <SummaryCard label="Datasets" text={detail.paper_summary.datasets} />
                <SummaryCard label="Key Findings" text={detail.paper_summary.findings} />
                <SummaryCard label="Limitations" text={detail.paper_summary.limitations} />
                <SummaryCard label="Detailed Summary" text={detail.paper_summary.summary_long} />
                {detail.paper_summary.keywords?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">{detail.paper_summary.keywords.map((k, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">{k}</span>
                    ))}</div>
                  </div>
                )}
              </div>
            ) : detail.status === "ready" ? (
              <p className="text-sm text-slate-500">Summary not available yet.</p>
            ) : (
              <p className="text-sm text-amber-600 font-medium">Paper is being processed... summaries will appear when ready.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, text }) {
  if (!text) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</h4>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    ready: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[status] || "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

// ═══════════════════════════════════════════════════════════════
// COMPARE PANEL
// ═══════════════════════════════════════════════════════════════
function ComparePanel({ workspaceId }) {
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { listDocuments(workspaceId).then(setDocuments).catch(() => {}); }, [workspaceId]);

  const toggle = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return alert("Select at least 2 papers");
    setLoading(true);
    try {
      const r = await compareDocuments(workspaceId, selectedIds);
      setResult(r);
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex h-full">
      {/* Paper selector */}
      <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-sm mb-2">Select papers to compare</h3>
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-xl font-bold text-xs disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {loading ? "Comparing..." : `Compare (${selectedIds.length} selected)`}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.filter(d => d.status === "ready").map((doc) => (
            <button
              key={doc.id}
              onClick={() => toggle(doc.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex items-center gap-3 ${selectedIds.includes(doc.id) ? "bg-indigo-50" : ""}`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedIds.includes(doc.id) ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"}`}>
                {selectedIds.includes(doc.id) && <span className="text-xs">✓</span>}
              </div>
              <span className="text-sm font-medium truncate">{doc.title}</span>
            </button>
          ))}
          {documents.filter(d => d.status === "ready").length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-400">No processed papers available yet.</p>
              <p className="text-xs text-slate-300 mt-1">Import papers via the Discover tab or upload PDFs in Paper Library.</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison result */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {!result ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center max-w-xs">
              <p className="text-lg font-bold mb-2 text-slate-500">Side-by-side comparison</p>
              <p className="text-sm">Select 2+ papers from the left, then click Compare. The AI will generate a structured matrix of methods, findings, and gaps.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl">
            <h2 className="text-xl font-bold mb-4">Comparison Results</h2>

            {/* Narrative */}
            {result.narrative_summary && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Narrative Summary</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.narrative_summary}</p>
              </div>
            )}

            {/* Matrix table */}
            {result.comparison_matrix?.papers && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left p-3 font-bold text-xs uppercase text-slate-500 border-b">Dimension</th>
                        {result.comparison_matrix.papers.map((p, i) => (
                          <th key={i} className="text-left p-3 font-bold text-xs uppercase text-slate-500 border-b">{p.title?.slice(0, 30)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.comparison_matrix.dimensions || ["problem_addressed","methodology","datasets","metrics","findings","limitations","novelty"]).map((dim) => (
                        <tr key={dim} className="border-b border-slate-100">
                          <td className="p-3 font-medium text-slate-700 capitalize whitespace-nowrap">{dim.replace(/_/g, " ")}</td>
                          {result.comparison_matrix.papers.map((p, i) => (
                            <td key={i} className="p-3 text-slate-600 text-xs leading-relaxed">{p[dim] || "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TASKS PANEL
// ═══════════════════════════════════════════════════════════════
function TasksPanel({ workspaceId }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => { listTasks(workspaceId).then(setTasks).catch(() => {}); }, [workspaceId]);
  useEffect(() => { refresh(); }, [refresh]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask(workspaceId, { title, created_by: "demo-user" });
    setTitle("");
    refresh();
  };

  const handleStatus = async (tid, status) => {
    await updateTask(workspaceId, tid, { status });
    refresh();
  };

  const statusColors = {
    proposed: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    done: "bg-green-100 text-green-800",
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Tasks & Assignments</h2>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 border border-slate-300 px-4 py-2.5 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700">Add</button>
        </form>

        {tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No tasks yet</p>
            <p className="text-xs text-slate-300 mt-1">Type <span className="font-mono bg-slate-100 px-1 rounded">@planner Extract research tasks</span> in AI Chat to auto-generate tasks, or add them manually above.</p>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${t.status === "done" ? "line-through text-slate-400" : ""}`}>{t.title}</p>
                {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                <div className="flex gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[t.status] || "bg-slate-100 text-slate-500"}`}>{t.status}</span>
                  {t.priority && <span className="text-[10px] text-slate-400">{t.priority} priority</span>}
                  {t.assignee && <span className="text-[10px] text-slate-400">→ {t.assignee}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {t.status !== "in-progress" && <button onClick={() => handleStatus(t.id, "in-progress")} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Start</button>}
                {t.status !== "done" && <button onClick={() => handleStatus(t.id, "done")} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Done</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REPORT PANEL
// ═══════════════════════════════════════════════════════════════
function ReportPanel({ workspaceId }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [writerResult, setWriterResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");

  const refresh = useCallback(() => { listReports(workspaceId).then(setReports).catch(() => {}); }, [workspaceId]);
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateReport = async () => {
    const r = await createReport(workspaceId, { title: "Literature Review" });
    refresh();
    return r;
  };

  const handleDraft = async () => {
    setLoading(true);
    try {
      let reportId = selectedReport?.id;
      if (!reportId) {
        const r = await handleCreateReport();
        reportId = r.id;
      }
      const result = await runWriter(workspaceId, { topic, report_id: reportId });
      setWriterResult(result);
      refresh();
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Report Builder</h2>
        <p className="text-sm text-slate-500 mb-4">Generate AI-drafted literature review sections from your workspace papers. The writer agent synthesizes across papers and adds inline citations.</p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-sm mb-3">Generate Literature Review</h3>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Focus topic (optional, e.g. 'attention mechanisms in NLP')"
            className="w-full border border-slate-300 px-4 py-2.5 rounded-xl text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
          />
          <button
            onClick={handleDraft}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "@writer Draft Related Work"}
          </button>
        </div>

        {writerResult && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-3">{writerResult.title}</h3>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {writerResult.content}
            </div>
            {writerResult.citations?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">References</h4>
                {writerResult.citations.map((c, i) => (
                  <p key={i} className="text-xs text-slate-600">[{c.citation_key || i + 1}] {c.document_title}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {reports.length > 0 && (
          <div>
            <h3 className="font-bold text-sm mb-2">Saved Reports</h3>
            {reports.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-2">
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-xs text-slate-400">Status: {r.status} | Created: {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT STATE PANEL
// ═══════════════════════════════════════════════════════════════
function ProjectStatePanel({ workspaceId }) {
  const [state, setState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState("");
  const [scope, setScope] = useState("");

  const refresh = useCallback(() => {
    getProjectState(workspaceId).then((s) => { setState(s); setGoal(s.research_goal || ""); setScope(s.scope || ""); }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    await updateProjectState(workspaceId, { research_goal: goal, scope });
    setEditing(false);
    refresh();
  };

  if (!state) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Project Memory</h2>
          <button onClick={() => editing ? save() : setEditing(true)} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold">
            {editing ? "Save" : "Edit"}
          </button>
        </div>

        <div className="space-y-4">
          <StateCard label="Research Goal" editing={editing}>
            {editing ? <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /> : <p className="text-sm text-slate-700">{state.research_goal || "Not set"}</p>}
          </StateCard>
          <StateCard label="Scope" editing={editing}>
            {editing ? <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg p-2 text-sm" /> : <p className="text-sm text-slate-700">{state.scope || "Not set"}</p>}
          </StateCard>
          <StateCard label="Key Findings">
            <ListItems items={state.key_findings} empty="No findings yet" />
          </StateCard>
          <StateCard label="Decisions">
            <ListItems items={state.decisions} empty="No decisions yet" />
          </StateCard>
          <StateCard label="Open Questions">
            <ListItems items={state.open_questions} empty="No open questions" />
          </StateCard>
          <StateCard label="Report Status">
            <StatusBadge status={state.report_status} />
          </StateCard>
        </div>
      </div>
    </div>
  );
}

function StateCard({ label, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{label}</h4>
      {children}
    </div>
  );
}

function ListItems({ items, empty }) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
          <span className="text-indigo-500 mt-0.5">&#8226;</span>
          <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="font-bold text-xs uppercase text-slate-500 mt-3 mb-1">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(2)}</h2>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => <li key={j}><BoldInline text={item} /></li>)}
        </ul>
      );
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5"><BoldInline text={line} /></p>);
    }
    i++;
  }
  return <div className="space-y-0">{elements}</div>;
}

function BoldInline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )}</>;
}