"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace, listWorkspaces } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ws = await createWorkspace({
        name,
        description,
        created_by: "demo-user",
        research_goal: goal,
      });
      router.push(`/workspace/${ws.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-lg">R</div>
          <span className="text-2xl font-bold tracking-tight">ResNex AI</span>
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight max-w-2xl mb-6">
          AI-Native Collaborative<br />Research Workspace
        </h1>
        <p className="text-lg text-slate-300 max-w-xl mb-10 leading-relaxed">
          Turn papers into structured knowledge. Turn discussions into decisions and tasks.
          Turn evidence into literature review drafts. All in one shared workspace.
        </p>

        <div className="flex gap-4 mb-16">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold transition-colors text-sm"
          >
            Create Workspace
          </button>
          {workspaces.length > 0 && (
            <button
              onClick={() => document.getElementById("workspaces-section")?.scrollIntoView({ behavior: "smooth" })}
              className="border border-slate-500 hover:border-slate-300 text-slate-200 px-8 py-3 rounded-xl font-bold transition-colors text-sm"
            >
              Open Existing
            </button>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {[
            { icon: "📄", title: "Paper Intelligence", desc: "Upload PDFs or import from arXiv. Get structured summaries, methods, findings, and limitations automatically." },
            { icon: "🔍", title: "Source-Grounded Q&A", desc: "Ask questions across all papers. Every answer cites evidence from your workspace." },
            { icon: "🌐", title: "Discover Papers", desc: "Search arXiv and Semantic Scholar. One-click import with auto-ingestion and AI summarization." },
            { icon: "⚡", title: "AI Agents", desc: "Compare papers, find research gaps, extract tasks, and draft literature reviews — all via @mentions." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create workspace modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreate}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6">New Research Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Workspace Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Literature Review — Transformer Architectures"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the research project..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Research Goal</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Compare recent attention mechanisms for NLP"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-6 py-3 border border-slate-600 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing workspaces */}
      {workspaces.length > 0 && (
        <div id="workspaces-section" className="max-w-5xl mx-auto px-6 pb-20">
          <h2 className="text-xl font-bold mb-4">Your Workspaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/workspace/${ws.id}`)}
                className="text-left bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors"
              >
                <h3 className="font-bold text-lg mb-1">{ws.name}</h3>
                <p className="text-sm text-slate-400 mb-2">{ws.description || "No description"}</p>
                <span className="text-xs text-slate-500">
                  Created {new Date(ws.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
