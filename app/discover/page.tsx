"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "hypotheses_v1";

type Hypothesis = {
  id: string;
  title: string;
  claim: string;
  method: string;
  createdAt: string;
  parentId?: string;
  forkCount: number;
  upvotes?: number;
  downvotes?: number;
  comments?: Array<any>;
  replications?: Array<any>;
  owner?: string;
  isPrivate?: boolean;
  linkedPapers?: Array<any>;
};

type TrendingHypothesis = Hypothesis & {
  trendingScore: number;
  engagementScore: number;
  recencyScore: number;
  field: string;
};

// Fields of interest with associated keywords
const FIELDS_OF_INTEREST = {
  "medicine": ["clinical", "health", "disease", "treatment", "medical", "patient", "therapy", "drug"],
  "physics": ["force", "energy", "particle", "quantum", "motion", "wave", "physics", "mechanical"],
  "psychology": ["behavior", "cognitive", "mental", "learning", "emotion", "perception", "brain", "psychology"],
  "biology": ["species", "evolution", "dna", "gene", "organism", "ecosystem", "reproduction", "biology"],
  "technology": ["algorithm", "software", "performance", "system", "data", "computer", "code", "technology"],
  "economics": ["market", "trade", "price", "economic", "consumer", "business", "finance", "money"],
  "climate": ["climate", "carbon", "emission", "temperature", "weather", "environment", "sustainability"],
  "nutrition": ["diet", "nutrition", "food", "health", "weight", "calorie", "supplement", "metabolism"],
};

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

// Detect field of interest based on title and claim
function detectField(hypothesis: Hypothesis): string {
  const text = `${hypothesis.title} ${hypothesis.claim} ${hypothesis.method}`.toLowerCase();
  
  for (const [field, keywords] of Object.entries(FIELDS_OF_INTEREST)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0) return field;
  }
  
  return "general";
}

// Trending algorithm: combines engagement, recency, and quality signals
function calculateTrendingScore(h: Hypothesis, allHypotheses: Hypothesis[]): number {
  const now = Date.now();
  const createdAt = new Date(h.createdAt).getTime();
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  
  // Engagement score: upvotes, comments, replications
  const upvotes = h.upvotes || 0;
  const downvotes = h.downvotes || 0;
  const netVotes = upvotes - downvotes;
  const comments = h.comments?.length || 0;
  const replications = h.replications?.length || 0;
  const forks = h.forkCount || 0;
  
  const engagementScore = (netVotes * 2) + (comments * 1.5) + (replications * 3) + (forks * 1);
  
  // Recency score: newer is better, but doesn't decay too fast
  // Exponential decay with 7-day half-life
  const recencyScore = Math.pow(2, -ageInDays / 7) * 100;
  
  // Quality score: papers linked, citations
  const papers = h.linkedPapers?.length || 0;
  const totalCitations = h.linkedPapers?.reduce((sum, p) => sum + (p.citationCount || 0), 0) || 0;
  const qualityScore = (papers * 3) + (totalCitations * 0.1);
  
  // Weighted score
  const trendingScore = 
    (engagementScore * 0.5) +      // 50% engagement
    (recencyScore * 0.3) +          // 30% recency
    (qualityScore * 0.2);           // 20% quality/papers
  
  return Math.max(0, trendingScore);
}

function calculateEngagementScore(h: Hypothesis): number {
  const upvotes = h.upvotes || 0;
  const downvotes = h.downvotes || 0;
  const comments = h.comments?.length || 0;
  const replications = h.replications?.length || 0;
  const forks = h.forkCount || 0;
  
  return (upvotes - downvotes) + (comments * 1.5) + (replications * 3) + (forks * 1);
}

function calculateRecencyScore(h: Hypothesis): number {
  const now = Date.now();
  const createdAt = new Date(h.createdAt).getTime();
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
  return Math.pow(2, -ageInDays / 7) * 100;
}

export default function DiscoverPage() {
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [selectedField, setSelectedField] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"trending" | "recent" | "engagement">("trending");

  useEffect(() => {
    setItems(loadHypotheses().filter(h => !h.isPrivate));
  }, []);

  const trendingItems = useMemo(() => {
    return items
      .map((h) => ({
        ...h,
        trendingScore: calculateTrendingScore(h, items),
        engagementScore: calculateEngagementScore(h),
        recencyScore: calculateRecencyScore(h),
        field: detectField(h),
      }))
      .filter((h) => selectedField === "all" || h.field === selectedField)
      .sort((a, b) => {
        if (sortBy === "trending") return b.trendingScore - a.trendingScore;
        if (sortBy === "engagement") return b.engagementScore - a.engagementScore;
        return b.recencyScore - a.recencyScore;
      });
  }, [items, selectedField, sortBy]);

  const fields = useMemo(() => {
    const fieldCounts = new Map<string, number>();
    items.forEach((h) => {
      const field = detectField(h);
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
    });
    return Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [items]);

  const getFieldEmoji = (field: string): string => {
    const emojis: Record<string, string> = {
      "medicine": "🏥",
      "physics": "⚛️",
      "psychology": "🧠",
      "biology": "🔬",
      "technology": "💻",
      "economics": "💰",
      "climate": "🌍",
      "nutrition": "🥗",
      "general": "💡",
    };
    return emojis[field] || "💡";
  };

  return (
    <main className="max-w-5xl mx-auto min-h-screen space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-3">
          🔬 Discover
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
          Explore trending hypotheses across different fields. Ranked by engagement, recency, and research quality.
        </p>
      </div>

      {/* Controls */}
      {/* eslint-disable-next-line @next/next/no-inline-styles */}
      <div className="space-y-4 animate-slide-up animation-delay-50">
        {/* Sort Controls */}
        <div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span>⚙️ Sort By:</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { value: "trending" as const, label: "🔥 Trending", icon: "📊" },
              { value: "engagement" as const, label: "💬 Most Engaged", icon: "👥" },
              { value: "recent" as const, label: "✨ Recent", icon: "⏰" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  sortBy === option.value
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700 hover:shadow-md"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field Filter */}
        <div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span>🔍 Topics:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedField("all")}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                selectedField === "all"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700"
              }`}
            >
              All Fields ({items.length})
            </button>
            {fields.map(([field, count]) => (
              <button
                key={field}
                onClick={() => setSelectedField(field)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  selectedField === field
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                {getFieldEmoji(field)} {field.charAt(0).toUpperCase() + field.slice(1)} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      {trendingItems.length > 0 ? (
        <div className="grid gap-4">
          {trendingItems.map((h, idx) => (
            <Link key={h.id} href="/explore" className="group">
              {/* eslint-disable-next-line @next/next/no-inline-styles */}
              <div 
                className={`relative overflow-hidden rounded-xl backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border border-white/40 dark:border-gray-700/40 hover:border-blue-400/60 dark:hover:border-blue-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-105 animate-slide-up ${
                  idx === 0 ? '' : idx === 1 ? 'animation-delay-50' : 'animation-delay-100'
                }`}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition duration-300"></div>

                <div className="relative z-10">
                  {/* Top Row: Ranking & Badges */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm">
                        #{idx + 1}
                      </span>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-blue-700 dark:text-blue-300 border border-blue-300/30 dark:border-blue-400/30 backdrop-blur-sm">
                        {getFieldEmoji(h.field)} {h.field.charAt(0).toUpperCase() + h.field.slice(1)}
                      </span>
                    </div>
                    
                    {/* Trending badge */}
                    {h.trendingScore > 50 && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500/30 to-pink-500/30 text-red-700 dark:text-red-300 border border-red-300/30 dark:border-red-400/30 backdrop-blur-sm">
                        🔥 Trending
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2 mb-2">
                    {h.title}
                  </h3>

                  {/* Claim Preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {h.claim}
                  </p>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👤</span>
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-gray-900 dark:text-white">{h.owner || "Anonymous"}</div>
                        <div className="text-gray-500 dark:text-gray-400">Owner</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📅</span>
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-gray-900 dark:text-white">{new Date(h.createdAt).toLocaleDateString()}</div>
                        <div className="text-gray-500 dark:text-gray-400">Created</div>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/20 dark:border-gray-700/20">
                    {(h.upvotes || 0) > 0 && (
                      <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-1 border border-green-300/30 dark:border-green-400/30">
                        👍 {h.upvotes} Upvotes
                      </span>
                    )}
                    {(h.comments?.length || 0) > 0 && (
                      <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1 border border-blue-300/30 dark:border-blue-400/30">
                        💬 {h.comments?.length} Comment{(h.comments?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    )}
                    {(h.replications?.length || 0) > 0 && (
                      <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1 border border-purple-300/30 dark:border-purple-400/30">
                        🔍 {h.replications?.length} Replication{(h.replications?.length || 0) !== 1 ? "s" : ""}
                      </span>
                    )}
                    {h.forkCount > 0 && (
                      <span className="px-3 py-1 rounded-lg bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-semibold flex items-center gap-1 border border-orange-300/30 dark:border-orange-400/30">
                        🔀 {h.forkCount} Fork{h.forkCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Score Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                        {h.trendingScore.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Trending Score
                      </div>
                    </div>
                    <span className="text-xl group-hover:translate-x-1 transition duration-300">→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 animate-slide-up">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No hypotheses to discover yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to publish a hypothesis and join the scientific community.
          </p>
          <Link
            href="/new"
            className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
          >
            Create Your First Hypothesis →
          </Link>
        </div>
      )}
    </main>
  );
}
