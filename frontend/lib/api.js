const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Workspaces
export const createWorkspace = (data) => request("/workspaces", { method: "POST", body: JSON.stringify(data) });
export const listWorkspaces = () => request("/workspaces");
export const getWorkspace = (id) => request(`/workspaces/${id}`);
export const getProjectState = (id) => request(`/workspaces/${id}/state`);
export const updateProjectState = (id, data) => request(`/workspaces/${id}/state`, { method: "PATCH", body: JSON.stringify(data) });

// Documents
export const uploadDocument = async (workspaceId, file, title) => {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/documents`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
};
export const listDocuments = (wid) => request(`/workspaces/${wid}/documents`);
export const getDocument = (wid, did) => request(`/workspaces/${wid}/documents/${did}`);
export const getDocumentSummary = (wid, did) => request(`/workspaces/${wid}/documents/${did}/summary`);

// Search & QA
export const semanticSearch = (wid, query, topK = 10) =>
  request(`/workspaces/${wid}/search`, { method: "POST", body: JSON.stringify({ query, top_k: topK }) });
export const askQuestion = (wid, question, topK = 8) =>
  request(`/workspaces/${wid}/qa`, { method: "POST", body: JSON.stringify({ question, top_k: topK }) });

// Chat
export const listMessages = (wid, limit = 100) => request(`/workspaces/${wid}/messages?limit=${limit}`);
export const sendMessage = (wid, data) => request(`/workspaces/${wid}/messages`, { method: "POST", body: JSON.stringify(data) });
export const generateChatSummary = (wid) => request(`/workspaces/${wid}/summaries/chat`, { method: "POST" });

// Agents
export const compareDocuments = (wid, documentIds) =>
  request(`/workspaces/${wid}/compare`, { method: "POST", body: JSON.stringify({ document_ids: documentIds }) });
export const runPlanner = (wid) =>
  request(`/workspaces/${wid}/planner/extract`, { method: "POST", body: JSON.stringify({}) });
export const runWriter = (wid, data) =>
  request(`/workspaces/${wid}/writer/draft`, { method: "POST", body: JSON.stringify(data) });
export const findGaps = (wid) =>
  request(`/workspaces/${wid}/gaps`, { method: "POST" });

// Discovery
export const searchArxiv = (wid, data) =>
  request(`/workspaces/${wid}/discover/arxiv/search`, { method: "POST", body: JSON.stringify(data) });
export const importArxiv = (wid, arxivId) =>
  request(`/workspaces/${wid}/discover/arxiv/import`, { method: "POST", body: JSON.stringify({ arxiv_id: arxivId }) });
export const searchSemanticScholar = (wid, data) =>
  request(`/workspaces/${wid}/discover/semantic-scholar/search`, { method: "POST", body: JSON.stringify(data) });
export const findRelatedPapers = (wid, paperId, limit = 10) =>
  request(`/workspaces/${wid}/discover/semantic-scholar/related`, { method: "POST", body: JSON.stringify({ paper_id: paperId, limit }) });
export const importFromUrl = (wid, data) =>
  request(`/workspaces/${wid}/discover/import-url`, { method: "POST", body: JSON.stringify(data) });

// Tasks
export const listTasks = (wid) => request(`/workspaces/${wid}/tasks`);
export const createTask = (wid, data) => request(`/workspaces/${wid}/tasks`, { method: "POST", body: JSON.stringify(data) });
export const updateTask = (wid, tid, data) => request(`/workspaces/${wid}/tasks/${tid}`, { method: "PATCH", body: JSON.stringify(data) });

// Reports
export const listReports = (wid) => request(`/workspaces/${wid}/reports`);
export const createReport = (wid, data) => request(`/workspaces/${wid}/reports`, { method: "POST", body: JSON.stringify(data) });
export const getReport = (wid, rid) => request(`/workspaces/${wid}/reports/${rid}`);
