"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type ReviewerProfile = {
  id: string;
  name: string;
  expertiseTags: string[];
  successfulReplications: number;
  failedReplications: number;
  totalReviews: number;
  reliabilityScore: number; // 0-100, calculated as: (successful / total) * 100
};

type WeightedComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  reviewerProfile?: ReviewerProfile;
  weight?: number; // Calculated based on reviewer credibility
};

type Prediction = {
  id: string;
  predictorName: string;
  predictedOutcome: string;
  lockedAt: string;
  correctness?: "correct" | "incorrect" | "pending";
};

type PredictorProfile = {
  name: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracyScore: number;
};

type Hypothesis = {
  id: string;
  title: string;
  claim: string;
  method: string;
  createdAt: string;
  parentId?: string;
  forkCount: number;
  forkReason?: "verify" | "build" | "disprove";
  upvotes?: number;
  downvotes?: number;
  media?: Array<{ type: "image" | "video"; data: string; name: string }>;
  dataTable?: {
    columns: string[];
    rows: string[][];
  };
  chartData?: {
    type: "bar" | "line" | "pie";
    label: string;
    dataKey: string;
    data: Array<Record<string, any>>;
  };
  comments?: Array<{
    id: string;
    author: string;
    message: string;
    createdAt: string;
    reviewerProfile?: ReviewerProfile;
    reactions?: Array<{
      emoji: '👍' | '❤️' | '🎯' | '💡' | '⚠️';
      users: string[];
    }>;
  }>;
  draft?: string;
  article?: {
    conclusion: string;
    sources: string[];
    methods: string;
    publishedAt: string;
  };
  isShared?: boolean;
  collaborators?: string[];
  changeHistory?: Array<{
    id: string;
    author: string;
    action: string;
    timestamp: string;
  }>;
  methodLocked?: boolean;
  methodVersions?: Array<{
    id: string;
    version: number;
    content: string;
    lockedAt: string;
    lockedBy: string;
  }>;
  predictions?: Prediction[];
  actualResult?: string;
};

type Notebook = {
  id: string;
  hypothesisId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  cells: Array<{
    id: string;
    language: "markdown" | "code";
    content: string;
  }>;
  isShared?: boolean;
  collaborators?: string[];
  changeHistory?: Array<{
    id: string;
    author: string;
    action: string;
    timestamp: string;
  }>;
};

const STORAGE_KEY = "hypotheses_v1";
const NOTEBOOKS_KEY = "notebooks_v1";

function loadHypotheses(): Hypothesis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHypotheses(items: Hypothesis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotebooks(items: Notebook[]) {
  localStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(items));
}

function addChangeToHistory(
  hypothesis: Hypothesis,
  author: string,
  action: string
): Hypothesis {
  const updated = { ...hypothesis };
  if (!updated.changeHistory) {
    updated.changeHistory = [];
  }
  
  const newChange = {
    id: Date.now().toString(),
    author,
    action,
    timestamp: new Date().toISOString(),
  };
  
  updated.changeHistory.push(newChange);
  return updated as Hypothesis;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function DataTableDisplay({ dataTable }: { dataTable?: Hypothesis["dataTable"] }) {
  if (!dataTable) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="text-sm text-gray-400 mb-2">Data Table</div>
      <table className="w-full text-sm border-collapse border border-paper-border">
        <thead>
          <tr className="bg-paper-panel">
            {dataTable.columns.map((col, idx) => (
              <th key={idx} className="border border-paper-border px-3 py-2 text-left text-gray-300">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataTable.rows.map((row, ridx) => (
            <tr key={ridx} className="hover:bg-paper-panel">
              {row.map((cell, cidx) => (
                <td key={cidx} className="border border-paper-border px-3 py-2 text-gray-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartDisplay({ chartData }: { chartData?: Hypothesis["chartData"] }) {
  if (!chartData || !chartData.data.length) return null;

  return (
    <div className="mt-4">
      <div className="text-sm text-gray-400 mb-3">{chartData.label}</div>
      <div className="bg-paper-panel rounded p-4">
        <ResponsiveContainer width="100%" height={300}>
          {chartData.type === "bar" && (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis dataKey="name" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040" }} />
              <Bar dataKey={chartData.dataKey} fill={COLORS[0]} />
            </BarChart>
          )}
          {chartData.type === "line" && (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis dataKey="name" stroke="#a3a3a3" />
              <YAxis stroke="#a3a3a3" />
              <Tooltip contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040" }} />
              <Line type="monotone" dataKey={chartData.dataKey} stroke={COLORS[0]} />
            </LineChart>
          )}
          {chartData.type === "pie" && (
            <PieChart>
              <Pie
                data={chartData.data}
                dataKey={chartData.dataKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {chartData.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#262626", border: "1px solid #404040" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkTitle, setForkTitle] = useState("");
  const [forkReason, setForkReason] = useState<"verify" | "build" | "disprove">("build");
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [collaborationRequests, setCollaborationRequests] = useState<any[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedHypoForNotebook, setSelectedHypoForNotebook] = useState<string | null>(null);
  const [notebookTitle, setNotebookTitle] = useState("");
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadHypotheses());
    setNotebooks(loadNotebooks());
    // Load collaboration requests
    const requestsKey = "collaboration_requests_v1";
    try {
      const raw = localStorage.getItem(requestsKey);
      const requests = raw ? JSON.parse(raw) : [];
      setCollaborationRequests(requests.filter((r: any) => r.status === "pending"));
    } catch {
      setCollaborationRequests([]);
    }
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const verifyForks = items.filter((h) => h.forkReason === "verify").length;
    const buildForks = items.filter((h) => h.forkReason === "build").length;
    const disproveForks = items.filter((h) => h.forkReason === "disprove").length;
    const originalHypos = items.filter((h) => !h.parentId).length;
    const forkedHypos = items.filter((h) => h.parentId).length;
    const totalForkCount = items.reduce((sum, h) => sum + (h.forkCount ?? 0), 0);

    return {
      total,
      originalHypos,
      forkedHypos,
      totalForkCount,
      verifyForks,
      buildForks,
      disproveForks,
    };
  }, [items]);

  function handleDeleteHypothesis(id: string) {
    console.log("DELETE BUTTON CLICKED for hypothesis:", id);
    if (!confirm("Delete this hypothesis?")) {
      console.log("Delete cancelled by user");
      return;
    }
    console.log("Deleting hypothesis:", id);
    const updated = items.filter((h) => h.id !== id);
    saveHypotheses(updated);
    setItems(updated);
    console.log("Hypothesis deleted");
  }

  function handleForkClick(id: string, parentTitle: string) {
    console.log("FORK BUTTON CLICKED for hypothesis:", id);
    setForkingId(id);
    setForkTitle(`Fork of "${parentTitle}"`);
    setForkReason("build");
  }

  function handleSubmitFork() {
    if (!forkingId || !forkTitle.trim()) {
      alert("Please enter a title for the forked hypothesis");
      return;
    }

    const parentHypo = items.find((h) => h.id === forkingId);
    if (!parentHypo) return;

    console.log("SUBMITTING FORK for parent:", forkingId);

    const forkedHypo: Hypothesis = {
      id: Date.now().toString(),
      title: forkTitle,
      claim: parentHypo.claim,
      method: parentHypo.method,
      createdAt: new Date().toISOString(),
      parentId: forkingId,
      forkCount: 0,
      forkReason: forkReason,
    };

    // Update parent's fork count
    const updated = items.map((h) =>
      h.id === forkingId ? { ...h, forkCount: h.forkCount + 1 } : h
    );
    updated.push(forkedHypo);

    saveHypotheses(updated);
    setItems(updated);

    console.log("Fork created:", forkedHypo);
    setForkingId(null);
    setForkTitle("");
  }

  function handleCancelFork() {
    console.log("Fork cancelled");
    setForkingId(null);
    setForkTitle("");
  }

  function handleUpvote(id: string) {
    console.log("UPVOTE CLICKED for hypothesis:", id);
    const updated = items.map((h) =>
      h.id === id ? { ...h, upvotes: (h.upvotes ?? 0) + 1 } : h
    );
    saveHypotheses(updated);
    setItems(updated);
  }

  function handleDownvote(id: string) {
    console.log("DOWNVOTE CLICKED for hypothesis:", id);
    const updated = items.map((h) =>
      h.id === id ? { ...h, downvotes: (h.downvotes ?? 0) + 1 } : h
    );
    saveHypotheses(updated);
    setItems(updated);
  }

  function handleAddComment(hypothesisId: string) {
    if (!commentAuthor.trim() || !commentMessage.trim()) {
      alert("Please enter both name and message");
      return;
    }

    console.log("ADD COMMENT for hypothesis:", hypothesisId);
    const updated = items.map((h) => {
      if (h.id === hypothesisId) {
        let updated: any = {
          ...h,
          comments: [
            ...(h.comments || []),
            {
              id: Date.now().toString(),
              author: commentAuthor,
              message: commentMessage,
              createdAt: new Date().toISOString(),
            },
          ],
        };
        
        // Track change if shared
        if (updated.isShared) {
          updated = addChangeToHistory(updated, commentAuthor, `Added comment: "${commentMessage.substring(0, 50)}..."`);
        }
        
        return updated;
      }
      return h;
    });

    saveHypotheses(updated);
    setItems(updated);
    setCommentingId(null);
    setCommentAuthor("");
    setCommentMessage("");
    console.log("Comment added");
  }

  function handleDeleteComment(hypothesisId: string, commentId: string) {
    console.log("DELETE COMMENT:", commentId);
    if (!confirm("Delete this comment?")) return;

    const updated = items.map((h) => {
      if (h.id === hypothesisId) {
        return {
          ...h,
          comments: (h.comments || []).filter((c) => c.id !== commentId),
        };
      }
      return h;
    });

    saveHypotheses(updated);
    setItems(updated);
    console.log("Comment deleted");
  }

  function handleCollaborationResponse(requestId: string, accepted: boolean) {
    console.log(`Collaboration request ${accepted ? "accepted" : "denied"}:`, requestId);
    
    const requestsKey = "collaboration_requests_v1";
    const request = collaborationRequests.find((r) => r.id === requestId);
    
    const updated = collaborationRequests.map((r) => 
      r.id === requestId ? { ...r, status: accepted ? "accepted" : "denied" } : r
    );
    
    // Also update all requests in localStorage
    let allRequests: any[] = [];
    try {
      const raw = localStorage.getItem(requestsKey);
      allRequests = raw ? JSON.parse(raw) : [];
    } catch {}
    
    const updatedAll = allRequests.map((r) =>
      r.id === requestId ? { ...r, status: accepted ? "accepted" : "denied" } : r
    );
    
    localStorage.setItem(requestsKey, JSON.stringify(updatedAll));
    
    // If accepted, create a shared hypothesis and shared notebook on both accounts
    if (accepted && request) {
      const hypothesis = items.find((h) => h.id === request.hypothesisId);
      if (hypothesis) {
        // Create shared hypothesis with both users as collaborators
        const sharedHypothesisId = Date.now().toString();
        const sharedHypothesis: Hypothesis = {
          ...hypothesis,
          id: sharedHypothesisId,
          isShared: true,
          collaborators: [request.requester], // The acceptor's name
          changeHistory: [
            {
              id: "1",
              author: request.requester,
              action: "Created shared hypothesis",
              timestamp: new Date().toISOString(),
            },
          ],
        };

        // Add to current user's hypotheses
        const updatedHypotheses = [...items, sharedHypothesis];
        saveHypotheses(updatedHypotheses);
        setItems(updatedHypotheses);

        // Create shared notebook for this collaboration
        const sharedNotebook: Notebook = {
          id: (Date.now() + 1).toString(),
          hypothesisId: sharedHypothesisId,
          title: `${hypothesis.title} - Collaborative Notes`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isShared: true,
          collaborators: [request.requester],
          cells: [
            {
              id: "1",
              language: "markdown",
              content: `# ${hypothesis.title} - Collaborative Research Notes\n\nStarting collaborative research with ${request.requester}...\n\n## Research Plan\n\n## Findings\n\n## Next Steps`,
            },
          ],
          changeHistory: [
            {
              id: "1",
              author: request.requester,
              action: "Created shared notebook",
              timestamp: new Date().toISOString(),
            },
          ],
        };

        // Add shared notebook to notebooks
        const updatedNotebooks = [...notebooks, sharedNotebook];
        saveNotebooks(updatedNotebooks);
        setNotebooks(updatedNotebooks);

        console.log("Shared hypothesis created:", sharedHypothesis);
        console.log("Shared notebook created:", sharedNotebook);
      }
    }
    
    setCollaborationRequests(updated.filter((r) => r.status === "pending"));
    
    if (accepted) {
      alert(`Collaboration accepted! A shared hypothesis has been created for both of you.`);
    }
  }

  function handleCreateNotebook() {
    if (!selectedHypoForNotebook || !notebookTitle.trim()) {
      alert("Please enter a notebook title");
      return;
    }

    const newNotebook: Notebook = {
      id: Date.now().toString(),
      hypothesisId: selectedHypoForNotebook,
      title: notebookTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cells: [
        {
          id: "1",
          language: "markdown",
          content: "# Research Notes\n\nStart documenting your research here...",
        },
      ],
    };

    const updated = [...notebooks, newNotebook];
    saveNotebooks(updated);
    setNotebooks(updated);
    setSelectedHypoForNotebook(null);
    setNotebookTitle("");
    console.log("Notebook created:", newNotebook);
  }

  function handleDeleteNotebook(notebookId: string) {
    if (!confirm("Delete this notebook?")) return;
    const updated = notebooks.filter((n) => n.id !== notebookId);
    saveNotebooks(updated);
    setNotebooks(updated);
    setEditingNotebookId(null);
  }

  function getNotebooksForHypothesis(hypothesisId: string): Notebook[] {
    return notebooks.filter((n) => n.hypothesisId === hypothesisId);
  }

  return (
    <main>
      {/* Header */}
      <div className="mb-12 animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">
              👨‍🔬 Your Profile
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Track your hypotheses, achievements, and research impact.
            </p>
          </div>
          <Link
            href="/new"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
          >
            ✨ Create New
          </Link>
        </div>
      </div>

      {/* Animated Stats Grid */}
      {/* eslint-disable-next-line @next/next/no-inline-styles */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8 animate-slide-up animation-delay-50">
        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-blue-400/60 dark:hover:border-blue-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 hover:from-blue-600/5 hover:to-purple-600/5 transition duration-300"></div>
          <div className="relative z-10">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Hypotheses</div>
            <div className="mt-3 text-3xl font-black text-blue-600 dark:text-blue-400">{stats.total}</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-green-400/60 dark:hover:border-green-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-green-600/0 to-emerald-600/0 hover:from-green-600/5 hover:to-emerald-600/5 transition duration-300"></div>
          <div className="relative z-10">
            <div className="text-3xl mb-2">💡</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Original Ideas</div>
            <div className="mt-3 text-3xl font-black text-green-600 dark:text-green-400">{stats.originalHypos}</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-orange-400/60 dark:hover:border-orange-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/0 to-yellow-600/0 hover:from-orange-600/5 hover:to-yellow-600/5 transition duration-300"></div>
          <div className="relative z-10">
            <div className="text-3xl mb-2">🔀</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Forks Created</div>
            <div className="mt-3 text-3xl font-black text-orange-600 dark:text-orange-400">{stats.forkedHypos}</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-pink-400/60 dark:hover:border-pink-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 to-rose-600/0 hover:from-pink-600/5 hover:to-rose-600/5 transition duration-300"></div>
          <div className="relative z-10">
            <div className="text-3xl mb-2">🌟</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Times Forked</div>
            <div className="mt-3 text-3xl font-black text-pink-600 dark:text-pink-400">{stats.totalForkCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Fork Reason Breakdown with Badges */}
      {(stats.verifyForks > 0 || stats.buildForks > 0 || stats.disproveForks > 0) && (
        <>
          {/* eslint-disable-next-line @next/next/no-inline-styles */}
          <div className="mb-8 animate-slide-up animation-delay-100">
          <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0"></div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span>🔍 Fork Breakdown</span>
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.verifyForks > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/20 border border-blue-400/30 dark:border-blue-400/30">
                    <span className="text-2xl">🔍</span>
                    <div>
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">Verify</div>
                      <div className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.verifyForks}</div>
                    </div>
                  </div>
                )}
                {stats.buildForks > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/20 border border-green-400/30 dark:border-green-400/30">
                    <span className="text-2xl">🔨</span>
                    <div>
                      <div className="text-xs font-semibold text-green-700 dark:text-green-300">Build</div>
                      <div className="text-lg font-black text-green-600 dark:text-green-400">{stats.buildForks}</div>
                    </div>
                  </div>
                )}
                {stats.disproveForks > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/20 border border-red-400/30 dark:border-red-400/30">
                    <span className="text-2xl">❌</span>
                    <div>
                      <div className="text-xs font-semibold text-red-700 dark:text-red-300">Disprove</div>
                      <div className="text-lg font-black text-red-600 dark:text-red-400">{stats.disproveForks}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Collaboration Requests with animated badges */}
      {collaborationRequests.length > 0 && (
        <>
          {/* eslint-disable-next-line @next/next/no-inline-styles */}
          <div className="mb-8 animate-slide-up animation-delay-150">
          <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 dark:border-purple-400/30">
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                <span className="animate-pulse-glow">🤝 Collaboration Requests</span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold animate-pulse">
                  {collaborationRequests.length}
                </span>
              </h3>
              <div className="space-y-3">
                {collaborationRequests.map((request, idx) => (
                  <>
                    <div 
                      key={request.id} 
                      className="bg-white/20 dark:bg-gray-800/50 rounded-xl p-4 border border-purple-300/30 dark:border-purple-400/20 animate-scale-in"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-purple-900 dark:text-purple-300">{request.requester}</div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{request.topic}</p>
                        <div className="text-xs text-gray-600 dark:text-gray-500 mt-2">
                          {new Date(request.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCollaborationResponse(request.id, true)}
                          className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
                          title="Accept collaboration request"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => handleCollaborationResponse(request.id, false)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                          title="Deny collaboration request"
                        >
                          ✕ Deny
                        </button>
                      </div>
                    </div>
                  </div>
                  </>
                ))}
              </div>
            </div>
          </div>
          </div>
        </>
      )}

      {/* Hypotheses List */}
      {items.length === 0 ? (
        <div className="text-center py-16 animate-slide-up">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No hypotheses yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first hypothesis and start your scientific journey!
          </p>
          <Link
            href="/new"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
          >
            Create Your First Hypothesis →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((h, idx) => (
            <>
              <article
                key={h.id}
                className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/40 dark:bg-gray-900/40 border border-white/60 dark:border-gray-700/60 hover:border-blue-400/60 dark:hover:border-blue-400/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-102 animate-slide-up cursor-pointer group"
              >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition duration-300"></div>

              <div className="relative z-10">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{h.parentId ? "🔀" : "💡"}</span>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                        {h.title}
                      </h2>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {h.parentId && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-700 dark:text-orange-300 border border-orange-300/30 dark:border-orange-400/30">
                          {h.forkReason === "verify" ? "🔍 Verify" : h.forkReason === "build" ? "🔨 Build" : "❌ Disprove"}
                        </span>
                      )}
                      {h.forkCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-700 dark:text-blue-300 border border-blue-300/30 dark:border-blue-400/30">
                          🔀 {h.forkCount} fork{h.forkCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {h.isShared && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-700 dark:text-purple-300 border border-purple-300/30 dark:border-purple-400/30">
                          🤝 Shared
                        </span>
                      )}
                      {h.collaborators && h.collaborators.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-pink-700 dark:text-pink-300 border border-pink-300/30 dark:border-pink-400/30">
                          👥 {h.collaborators.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Claim Preview */}
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-4 ml-8">
                  {h.claim}
                </p>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-4 ml-8">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👍</span>
                    <div className="text-xs">
                      <div className="font-bold text-gray-900 dark:text-white">{h.upvotes ?? 0}</div>
                      <div className="text-gray-600 dark:text-gray-400">Upvotes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <div className="text-xs">
                      <div className="font-bold text-gray-900 dark:text-white">{h.comments?.length ?? 0}</div>
                      <div className="text-gray-600 dark:text-gray-400">Comments</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <div className="text-xs">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {h.article ? "Published" : "Draft"}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Status</div>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 pt-4 border-t border-white/20 dark:border-gray-700/20">
                  <button
                    onClick={() => handleForkClick(h.id, h.title)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-700 dark:text-orange-300 font-semibold text-sm hover:from-orange-500/30 hover:to-amber-500/30 transition border border-orange-300/30 dark:border-orange-400/30"
                    title="Fork this hypothesis"
                  >
                    🔀 Fork
                  </button>
                  <button
                    onClick={() => setCommentingId(h.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 dark:text-blue-300 font-semibold text-sm hover:from-blue-500/30 hover:to-cyan-500/30 transition border border-blue-300/30 dark:border-blue-400/30"
                    title="Add a comment"
                  >
                    💬 Comment
                  </button>
                  <button
                    onClick={() => handleDeleteHypothesis(h.id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 dark:text-red-300 font-semibold text-sm hover:from-red-500/30 hover:to-rose-500/30 transition border border-red-300/30 dark:border-red-400/30"
                    title="Delete this hypothesis"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </article>
            </>
          ))}
        </div>
      )}

      {/* Fork Modal */}
      {forkingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg border border-paper-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Create a Fork</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-800 font-medium mb-1">
                  Fork Title
                </label>
                <input
                  type="text"
                  value={forkTitle}
                  onChange={(e) => setForkTitle(e.target.value)}
                  className="w-full rounded bg-paper-panel border border-paper-border p-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter a title for this fork"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-gray-800 font-medium mb-2">
                  Fork Reason
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="forkReason"
                      value="verify"
                      checked={forkReason === "verify"}
                      onChange={(e) => setForkReason(e.target.value as "verify" | "build" | "disprove")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-800">🔍 Verify - Test for repeatable results</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="forkReason"
                      value="build"
                      checked={forkReason === "build"}
                      onChange={(e) => setForkReason(e.target.value as "verify" | "build" | "disprove")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-800">🔨 Build - Extend or improve the idea</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="forkReason"
                      value="disprove"
                      checked={forkReason === "disprove"}
                      onChange={(e) => setForkReason(e.target.value as "verify" | "build" | "disprove")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-800">❌ Disprove - Challenge or refute</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSubmitFork}
                  className="flex-1 bg-green-primary text-green-text px-4 py-2 rounded hover:bg-green-hover font-medium"
                >
                  Create Fork
                </button>
                <button
                  onClick={handleCancelFork}
                  className="flex-1 bg-green-primary text-green-text px-4 py-2 rounded hover:bg-green-hover font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Notebook Modal */}
      {selectedHypoForNotebook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-neutral-200 dark:border-gray-700 p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">📓 Create Research Notebook</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-700 font-medium mb-1">
                  Notebook Title
                </label>
                <input
                  type="text"
                  value={notebookTitle}
                  onChange={(e) => setNotebookTitle(e.target.value)}
                  className="w-full rounded bg-white border border-neutral-300 p-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-500"
                  placeholder="e.g., Experimental Results, Literature Review"
                  maxLength={100}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateNotebook()}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleCreateNotebook}
                className="flex-1 bg-green-primary text-green-text px-4 py-2 rounded hover:bg-green-hover font-medium"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setSelectedHypoForNotebook(null);
                  setNotebookTitle("");
                }}
                className="flex-1 text-neutral-700 border border-neutral-300 px-4 py-2 rounded hover:text-neutral-900 hover:bg-neutral-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

