"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../components/auth-context";
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
  lastActivityDate: string; // ISO timestamp of last contribution
  decayFactor: number; // 0-1, where 1 = full score, <1 = decayed from inactivity
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
  predictedOutcome: string; // The predicted result before actual results
  lockedAt: string; // Timestamp when prediction was locked
  correctness?: "correct" | "incorrect" | "pending"; // Marked when hypothesis results are submitted
};

type PredictorProfile = {
  name: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracyScore: number; // 0-100%, calculated as: (correct / total) * 100
  lastPredictionDate: string; // ISO timestamp of last prediction
  decayFactor: number; // 0-1, where 1 = full score, <1 = decayed from inactivity
};

type HypothesisBadge = "popular" | "reproducible" | "controversial";

type ReplicationResult = {
  id: string;
  forkId: string; // Reference to the fork hypothesis
  researcher: string;
  outcomeConfirmed: boolean; // true = replicated, false = failed
  effectSize?: number; // Normalized effect size (0-1 scale, where 1 is very strong)
  sampleSize?: number;
  pValue?: number; // Statistical significance
  notes?: string; // Conditions, qualifications, limitations
  createdAt: string;
};

type MetaAnalysis = {
  totalReplications: number;
  successfulReplications: number;
  replicationRate: number; // 0-100%
  meanEffectSize: number; // Average effect size across replications
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number; // 95, 99, etc.
  };
  varianceAnalysis: {
    standardDeviation: number;
    variance: number;
    heterogeneityIndex: number; // I² statistic (0-100%), high = inconsistent results
  };
  failureConditions: string[]; // Synthesized conditions where hypothesis fails
  strengthOfEvidence: "very-weak" | "weak" | "moderate" | "strong" | "very-strong";
  lastUpdated: string;
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
  actualResult?: string; // Submitted after the experiment concludes
  replications?: ReplicationResult[]; // Data from fork hypothesis verifications
  metaAnalysis?: MetaAnalysis; // Auto-generated when 20+ replications
  isPrivate?: boolean; // True = only owner and collaborators can view/edit
  owner?: string; // Name of the user who created this hypothesis
  privateInvitations?: Array<{
    id: string;
    email: string;
    status: "pending" | "accepted" | "declined";
    invitedAt: string;
    invitedBy: string;
  }>;
  publishedAt?: string; // When hypothesis was published from private mode
  realWorldImpact?: {
    hasImpact: boolean; // True if hypothesis has influenced real-world applications
    impactTypes: Array<"policy" | "product" | "implementation" | "other">; // Categories of impact
    description?: string; // Details about the real-world implementation
    implementedBy?: string; // Organization/person who implemented
    implementationDate?: string; // ISO timestamp of implementation
    impactUrl?: string; // Link to evidence of impact (news, publication, product page)
    addedBy?: string; // Email of person who added this impact tag
    addedAt?: string; // ISO timestamp of when impact was recorded
  };
  linkedPapers?: Array<{
    id: string;
    doi: string;
    title: string;
    authors: string[];
    year?: number;
    citationCount: number;
    openalex_id?: string;
    paperUrl?: string;
    addedAt: string;
  }>;
};

const STORAGE_KEY = "hypotheses_v1";
const PREDICTOR_PROFILES_KEY = "predictor_profiles_v1";

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

const REVIEWER_PROFILES_KEY = "reviewer_profiles_v1";

function loadReviewerProfiles(): ReviewerProfile[] {
  try {
    const raw = localStorage.getItem(REVIEWER_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReviewerProfiles(profiles: ReviewerProfile[]) {
  localStorage.setItem(REVIEWER_PROFILES_KEY, JSON.stringify(profiles));
}

function getOrCreateReviewerProfile(name: string): ReviewerProfile {
  const profiles = loadReviewerProfiles();
  let profile = profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
  
  if (!profile) {
    profile = {
      id: Date.now().toString(),
      name,
      expertiseTags: [],
      successfulReplications: 0,
      failedReplications: 0,
      totalReviews: 0,
      reliabilityScore: 0,
      lastActivityDate: new Date().toISOString(),
      decayFactor: 1,
    };
    profiles.push(profile);
    saveReviewerProfiles(profiles);
  }
  
  return profile;
}

function calculateReliabilityScore(profile: ReviewerProfile): number {
  if (profile.totalReviews === 0) return 0;
  const successRate = profile.successfulReplications / profile.totalReviews;
  return Math.round(successRate * 100);
}

function getReviewWeight(profile: ReviewerProfile): number {
  // Base weight is 0.5, increases with successful replications
  // Max weight is 1.5 (with 20+ successful replications)
  const successFactor = Math.min(profile.successfulReplications / 20, 1);
  return 0.5 + (successFactor * 1.0);
}

function loadPredictorProfiles(): Record<string, PredictorProfile> {
  try {
    const raw = localStorage.getItem(PREDICTOR_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePredictorProfiles(profiles: Record<string, PredictorProfile>) {
  localStorage.setItem(PREDICTOR_PROFILES_KEY, JSON.stringify(profiles));
}

function getOrCreatePredictorProfile(name: string): PredictorProfile {
  const profiles = loadPredictorProfiles();
  const normalizedName = name.toLowerCase();
  
  if (!profiles[normalizedName]) {
    profiles[normalizedName] = {
      name,
      totalPredictions: 0,
      correctPredictions: 0,
      accuracyScore: 0,
      lastPredictionDate: new Date().toISOString(),
      decayFactor: 1,
    };
    savePredictorProfiles(profiles);
  }
  
  return profiles[normalizedName];
}

function calculateAccuracyScore(profile: PredictorProfile): number {
  if (profile.totalPredictions === 0) return 0;
  return Math.round((profile.correctPredictions / profile.totalPredictions) * 100);
}

function calculateDecayFactor(lastActivityDate: string, currentDate: Date = new Date()): number {
  const lastActivity = new Date(lastActivityDate);
  const daysSinceActivity = (currentDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
  
  // Decay formula: 1 - (days / (days + half-life))
  // Half-life = 90 days (reputation halves after 3 months of inactivity)
  const halfLife = 90;
  const decayFactor = 1 - (daysSinceActivity / (daysSinceActivity + halfLife));
  
  // Minimum floor: reputation decays to 20% of original after very long inactivity
  return Math.max(0.2, Math.min(1, decayFactor));
}

function applyDecayToReviewerProfile(profile: ReviewerProfile): ReviewerProfile {
  return {
    ...profile,
    decayFactor: calculateDecayFactor(profile.lastActivityDate),
  };
}

function applyDecayToPredictorProfile(profile: PredictorProfile): PredictorProfile {
  return {
    ...profile,
    decayFactor: calculateDecayFactor(profile.lastPredictionDate),
  };
}

function getEffectiveReviewerScore(profile: ReviewerProfile): number {
  const decayedProfile = applyDecayToReviewerProfile(profile);
  return Math.round(profile.reliabilityScore * decayedProfile.decayFactor);
}

function getEffectivePredictorScore(profile: PredictorProfile): number {
  const decayedProfile = applyDecayToPredictorProfile(profile);
  return Math.round(profile.accuracyScore * decayedProfile.decayFactor);
}

function updatePredictorAccuracy(name: string, isCorrect: boolean) {
  const profiles = loadPredictorProfiles();
  const normalizedName = name.toLowerCase();
  const now = new Date().toISOString();
  
  if (!profiles[normalizedName]) {
    profiles[normalizedName] = {
      name,
      totalPredictions: 1,
      correctPredictions: isCorrect ? 1 : 0,
      accuracyScore: isCorrect ? 100 : 0,
      lastPredictionDate: now,
      decayFactor: 1,
    };
  } else {
    profiles[normalizedName].totalPredictions += 1;
    if (isCorrect) {
      profiles[normalizedName].correctPredictions += 1;
    }
    profiles[normalizedName].accuracyScore = calculateAccuracyScore(profiles[normalizedName]);
    profiles[normalizedName].lastPredictionDate = now;
    profiles[normalizedName].decayFactor = 1; // Reset to full on new activity
  }
  
  savePredictorProfiles(profiles);
  return profiles[normalizedName];
}

function calculateBadges(hypothesis: Hypothesis): HypothesisBadge[] {
  const badges: HypothesisBadge[] = [];
  const upvotes = hypothesis.upvotes ?? 0;
  const downvotes = hypothesis.downvotes ?? 0;
  const forkCount = hypothesis.forkCount ?? 0;
  const totalVotes = upvotes + downvotes;
  
  // Popular: High engagement and net positive sentiment
  // Threshold: 5+ net upvotes OR (3+ upvotes AND upvote ratio > 70%)
  const upvoteRatio = totalVotes > 0 ? (upvotes / totalVotes) * 100 : 0;
  if ((upvotes - downvotes >= 5) || (upvotes >= 3 && upvoteRatio > 70)) {
    badges.push("popular");
  }
  
  // Reproducible: Multiple independent forks (attempts to verify)
  // Threshold: 3+ forks with verify/disprove reason
  const verificationForks = forkCount >= 3;
  if (verificationForks) {
    badges.push("reproducible");
  }
  
  // Controversial but Replicable: High downvotes + evidence of replication
  // Threshold: (2+ downvotes AND 3+ forks) to show it's contested but people are testing it
  // This prevents echo chambers and surfaces rigorous debate
  if (downvotes >= 2 && forkCount >= 3) {
    badges.push("controversial");
  }
  
  return badges;
}

function calculateMetaAnalysis(replications: ReplicationResult[]): MetaAnalysis {
  const totalReplications = replications.length;
  const successfulReplications = replications.filter(r => r.outcomeConfirmed).length;
  const replicationRate = totalReplications > 0 ? (successfulReplications / totalReplications) * 100 : 0;
  
  // Calculate mean and variance of effect sizes
  const effectSizes = replications.filter(r => r.effectSize !== undefined).map(r => r.effectSize!);
  const meanEffectSize = effectSizes.length > 0 ? effectSizes.reduce((a, b) => a + b) / effectSizes.length : 0;
  
  // Calculate standard deviation and variance
  const variance = effectSizes.length > 0 
    ? effectSizes.reduce((sum, val) => sum + Math.pow(val - meanEffectSize, 2), 0) / effectSizes.length
    : 0;
  const standardDeviation = Math.sqrt(variance);
  
  // Heterogeneity Index (I²) - measures consistency across replications
  // High I² (>75%) = high heterogeneity = inconsistent results
  // Low I² (<25%) = low heterogeneity = consistent results
  const heterogeneityIndex = effectSizes.length > 1
    ? Math.min(100, Math.max(0, ((standardDeviation / meanEffectSize) * 100))) // Simplified I²
    : 0;
  
  // Calculate 95% confidence interval using standard error
  const standardError = standardDeviation / Math.sqrt(totalReplications);
  const marginOfError = 1.96 * standardError; // 95% CI
  const confidenceInterval = {
    lower: Math.max(0, meanEffectSize - marginOfError),
    upper: Math.min(1, meanEffectSize + marginOfError),
    confidence: 95,
  };
  
  // Determine strength of evidence
  let strengthOfEvidence: "very-weak" | "weak" | "moderate" | "strong" | "very-strong";
  if (replicationRate >= 85 && meanEffectSize >= 0.6) {
    strengthOfEvidence = "very-strong";
  } else if (replicationRate >= 75 && meanEffectSize >= 0.5) {
    strengthOfEvidence = "strong";
  } else if (replicationRate >= 60 && meanEffectSize >= 0.3) {
    strengthOfEvidence = "moderate";
  } else if (replicationRate >= 40) {
    strengthOfEvidence = "weak";
  } else {
    strengthOfEvidence = "very-weak";
  }
  
  // Extract failure conditions from notes in unsuccessful replications
  const failureConditions = replications
    .filter(r => !r.outcomeConfirmed && r.notes)
    .map(r => r.notes!)
    .filter((note, idx, arr) => arr.indexOf(note) === idx) // Remove duplicates
    .slice(0, 5); // Top 5 conditions
  
  return {
    totalReplications,
    successfulReplications,
    replicationRate,
    meanEffectSize,
    confidenceInterval,
    varianceAnalysis: {
      standardDeviation,
      variance,
      heterogeneityIndex,
    },
    failureConditions,
    strengthOfEvidence,
    lastUpdated: new Date().toISOString(),
  };
}

function updateMetaAnalysisIfNeeded(hypothesis: Hypothesis): Hypothesis {
  if (!hypothesis.replications || hypothesis.replications.length < 20) {
    return hypothesis;
  }
  
  return {
    ...hypothesis,
    metaAnalysis: calculateMetaAnalysis(hypothesis.replications),
  };
}

function addChangeToHistory(
  hypothesis: Hypothesis,
  author: string,
  action: string
): Hypothesis {
  if (!hypothesis.changeHistory) {
    hypothesis.changeHistory = [];
  }
  
  const newChange = {
    id: Date.now().toString(),
    author,
    action,
    timestamp: new Date().toISOString(),
  };
  
  hypothesis.changeHistory.push(newChange);
  return hypothesis;
}

// Private sandbox mode helper functions
function canAccessHypothesis(hypothesis: Hypothesis, userEmail: string): boolean {
  if (!hypothesis.isPrivate) return true; // Public hypothesis visible to all
  if (!userEmail) return false; // Must be logged in to view private
  
  // Owner can always access
  if (hypothesis.owner === userEmail) return true;
  
  // Collaborators can access
  if (hypothesis.collaborators?.includes(userEmail)) return true;
  
  // Accepted invitees can access
  if (hypothesis.privateInvitations?.some(inv => inv.email === userEmail && inv.status === "accepted")) {
    return true;
  }
  
  return false;
}

function togglePrivacy(hypothesis: Hypothesis, currentUser: string): Hypothesis {
  return {
    ...hypothesis,
    isPrivate: !hypothesis.isPrivate,
    owner: hypothesis.owner || currentUser,
    privateInvitations: hypothesis.privateInvitations || [],
  };
}

function inviteCollaborator(hypothesis: Hypothesis, email: string, invitedBy: string): Hypothesis {
  const newInvitation = {
    id: Date.now().toString(),
    email,
    status: "pending" as const,
    invitedAt: new Date().toISOString(),
    invitedBy,
  };
  
  return {
    ...hypothesis,
    privateInvitations: [...(hypothesis.privateInvitations || []), newInvitation],
  };
}

function acceptInvitation(hypothesis: Hypothesis, userEmail: string): Hypothesis {
  if (!hypothesis.privateInvitations) return hypothesis;
  
  const updated = {
    ...hypothesis,
    collaborators: [...(hypothesis.collaborators || []), userEmail],
    privateInvitations: hypothesis.privateInvitations.map(inv =>
      inv.email === userEmail ? { ...inv, status: "accepted" as const } : inv
    ),
  };
  
  return updated;
}

function publishHypothesis(hypothesis: Hypothesis): Hypothesis {
  return {
    ...hypothesis,
    isPrivate: false,
    publishedAt: new Date().toISOString(),
  };
}

// Real-world impact functions
function addRealWorldImpact(
  hypothesis: Hypothesis,
  impactTypes: Array<"policy" | "product" | "implementation" | "other">,
  description: string,
  implementedBy: string,
  implementationDate: string,
  impactUrl: string,
  addedBy: string
): Hypothesis {
  return {
    ...hypothesis,
    realWorldImpact: {
      hasImpact: true,
      impactTypes,
      description,
      implementedBy,
      implementationDate,
      impactUrl,
      addedBy,
      addedAt: new Date().toISOString(),
    },
  };
}

function removeRealWorldImpact(hypothesis: Hypothesis): Hypothesis {
  return {
    ...hypothesis,
    realWorldImpact: undefined,
  };
}

function getImpactTypeEmoji(type: "policy" | "product" | "implementation" | "other"): string {
  switch (type) {
    case "policy":
      return "📋"; // Policy document
    case "product":
      return "🚀"; // Product launch
    case "implementation":
      return "✅"; // Implemented
    case "other":
      return "⭐"; // Star for other
    default:
      return "🏆";
  }
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function DataTableDisplay({ dataTable }: { dataTable?: Hypothesis["dataTable"] }) {
  if (!dataTable) return null;
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="text-sm text-gray-600 mb-2">Data Table</div>
      <table className="w-full text-sm border-collapse border border-paper-border">
        <thead>
          <tr className="bg-paper-panel">
            {dataTable.columns.map((col, idx) => (
              <th key={idx} className="border border-paper-border px-3 py-2 text-left text-black dark:text-white">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataTable.rows.map((row, ridx) => (
            <tr key={ridx} className="hover:bg-gray-50">
              {row.map((cell, cidx) => (
                <td key={cidx} className="border border-paper-border px-3 py-2 text-black dark:text-white">
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
      <div className="text-sm text-gray-600 mb-3">{chartData.label}</div>
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

// OpenAlex API Integration
async function searchOpenAlexByDOI(doi: string): Promise<any> {
  try {
    // Clean up DOI format
    const cleanDoi = doi.toLowerCase().replace(/^https?:\/\/doi\.org\//, "").trim();
    const response = await fetch(
      `https://api.openalex.org/works?filter=doi:${encodeURIComponent(cleanDoi)}&per-page=1`
    );
    
    if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error("Error searching OpenAlex by DOI:", error);
    return null;
  }
}

async function searchOpenAlexByTitle(title: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=1`
    );
    
    if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error("Error searching OpenAlex by title:", error);
    return null;
  }
}

function extractPaperData(openalex_work: any): {
  id: string;
  doi: string;
  title: string;
  authors: string[];
  year?: number;
  citationCount: number;
  openalex_id?: string;
  paperUrl?: string;
  addedAt: string;
} | null {
  if (!openalex_work) return null;
  
  return {
    id: Date.now().toString(),
    doi: openalex_work.doi || "",
    title: openalex_work.title || "Untitled",
    authors: openalex_work.authorships?.map((a: any) => a.author?.display_name).filter(Boolean) || [],
    year: openalex_work.publication_year,
    citationCount: openalex_work.cited_by_count || 0,
    openalex_id: openalex_work.id,
    paperUrl: openalex_work.url,
    addedAt: new Date().toISOString(),
  };
}

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [items, setItems] = useState<Hypothesis[]>([]);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [forkTitle, setForkTitle] = useState("");
  const [forkReason, setForkReason] = useState<"verify" | "build" | "disprove">("build");
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentMessage, setCommentMessage] = useState("");

  // Collaboration request state
  const [collaborationHypoId, setCollaborationHypoId] = useState<string | null>(null);
  const [collaborationTopic, setCollaborationTopic] = useState("");
  const [collaborationRequester, setCollaborationRequester] = useState("");

  // Prediction state
  const [predictionHypoId, setPredictionHypoId] = useState<string | null>(null);
  const [predictionAuthor, setPredictionAuthor] = useState("");
  const [predictionOutcome, setPredictionOutcome] = useState("");
  const [submittingResultsId, setSubmittingResultsId] = useState<string | null>(null);
  const [actualResult, setActualResult] = useState("");

  // Replication submission state
  const [replicationHypoId, setReplicationHypoId] = useState<string | null>(null);
  const [replicationResearcher, setReplicationResearcher] = useState("");
  const [replicationOutcomeConfirmed, setReplicationOutcomeConfirmed] = useState(true);
  const [replicationEffectSize, setReplicationEffectSize] = useState(0.5);
  const [replicationNotes, setReplicationNotes] = useState("");

  // Private sandbox mode state
  const [currentUser, setCurrentUser] = useState("");
  const [showPrivacySettings, setShowPrivacySettings] = useState<string | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState<string | null>(null);

  // Real-world impact state
  const [showImpactDialog, setShowImpactDialog] = useState<string | null>(null);
  const [impactTypes, setImpactTypes] = useState<Array<"policy" | "product" | "implementation" | "other">>([]);
  const [impactDescription, setImpactDescription] = useState("");
  const [impactImplementedBy, setImpactImplementedBy] = useState("");
  const [impactImplementationDate, setImpactImplementationDate] = useState("");
  const [impactUrl, setImpactUrl] = useState("");

  // Search state (from URL params)
  const searchQuery = searchParams?.get("q") || "";
  const [badgeFilter, setBadgeFilter] = useState<HypothesisBadge | "all">("all");

  useEffect(() => {
    setItems(loadHypotheses());
  }, []);

  const hasItems = items.length > 0;

  const sorted = useMemo(() => {
    const filtered = [...items].filter((h) => {
      // Filter out private hypotheses that current user can't access
      if (!canAccessHypothesis(h, currentUser)) {
        return false;
      }
      
      // Apply badge filter
      if (badgeFilter !== "all") {
        const badges = calculateBadges(h);
        if (!badges.includes(badgeFilter)) return false;
      }
      
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      
      // Search in title
      if (h.title.toLowerCase().includes(query)) return true;
      
      // Search in claim/content
      if (h.claim.toLowerCase().includes(query)) return true;
      
      // Search in method
      if (h.method.toLowerCase().includes(query)) return true;
      
      // Search in collaborators (user handles)
      if (h.collaborators?.some(c => c.toLowerCase().includes(query))) return true;
      
      // Search in comments
      if (h.comments?.some(c => 
        c.author.toLowerCase().includes(query) || 
        c.message.toLowerCase().includes(query)
      )) return true;
      
      // Search for hashtags in content (e.g., #physics #chemistry)
      const hashtagPattern = /#\w+/g;
      const titleHashtags = h.title.match(hashtagPattern)?.map(tag => tag.toLowerCase()) || [];
      const claimHashtags = h.claim.match(hashtagPattern)?.map(tag => tag.toLowerCase()) || [];
      const allHashtags = [...titleHashtags, ...claimHashtags];
      if (allHashtags.some(tag => tag.includes(query))) return true;
      
      return false;
    });

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [items, searchQuery, badgeFilter, currentUser]);

  function handleClearAll() {
    console.log("CLEAR BUTTON CLICKED");
    if (!confirm("Delete all saved hypotheses on this device?")) {
      console.log("Clear cancelled by user");
      return;
    }
    console.log("Clearing all hypotheses...");
    saveHypotheses([]);
    setItems([]);
    console.log("All hypotheses cleared");
  }

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

  function submitReplicationResult(
    parentId: string,
    forkId: string,
    researcher: string,
    outcomeConfirmed: boolean,
    effectSize: number,
    notes: string
  ) {
    // Update researcher profile activity
    const researcherProfile = getOrCreateReviewerProfile(researcher);
    const profiles = loadReviewerProfiles();
    const updatedProfiles = profiles.map(p => 
      p.id === researcherProfile.id 
        ? { ...p, lastActivityDate: new Date().toISOString(), decayFactor: 1 }
        : p
    );
    saveReviewerProfiles(updatedProfiles);
    
    const updated = items.map((h) => {
      if (h.id === parentId) {
        const replication: ReplicationResult = {
          id: Date.now().toString(),
          forkId,
          researcher,
          outcomeConfirmed,
          effectSize: Math.min(1, Math.max(0, effectSize)), // Normalize to 0-1
          notes,
          createdAt: new Date().toISOString(),
        };
        
        const updatedHypo = {
          ...h,
          replications: [...(h.replications || []), replication],
        };
        
        // Auto-generate meta-analysis if 20+ replications
        return updateMetaAnalysisIfNeeded(updatedHypo);
      }
      return h;
    });
    
    saveHypotheses(updated);
    setItems(updated);
    return updated.find(h => h.id === parentId)?.metaAnalysis;
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
    
    // Update reviewer profile activity
    const reviewerProfile = getOrCreateReviewerProfile(commentAuthor);
    const profiles = loadReviewerProfiles();
    const updatedProfiles = profiles.map(p => 
      p.id === reviewerProfile.id 
        ? { ...p, lastActivityDate: new Date().toISOString(), decayFactor: 1 }
        : p
    );
    saveReviewerProfiles(updatedProfiles);
    
    const updated = items.map((h) => {
      if (h.id === hypothesisId) {
        let updated: Hypothesis = {
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

  function handleSubmitCollaborationRequest() {
    if (!collaborationHypoId || !collaborationTopic.trim() || !collaborationRequester.trim()) {
      alert("Please fill in all fields");
      return;
    }

    console.log("COLLABORATION REQUEST SUBMITTED");
    
    // Load existing requests from localStorage
    const requestsKey = "collaboration_requests_v1";
    let requests: any[] = [];
    try {
      const raw = localStorage.getItem(requestsKey);
      requests = raw ? JSON.parse(raw) : [];
    } catch {
      requests = [];
    }

    // Add new request
    const newRequest = {
      id: Date.now().toString(),
      hypothesisId: collaborationHypoId,
      requester: collaborationRequester,
      topic: collaborationTopic,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    requests.push(newRequest);
    localStorage.setItem(requestsKey, JSON.stringify(requests));

    // Reset form
    setCollaborationHypoId(null);
    setCollaborationTopic("");
    setCollaborationRequester("");
    alert("Collaboration request sent!");
  }

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Explore Hypotheses</h1>
          <p className="mt-2 text-gray-600">
            Local-only for now (saved in your browser). We’ll swap to a real DB
            later.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/new"
            className="rounded border border-paper-border bg-paper-panel px-3 py-2 text-black dark:text-white hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] transition"
          >
            + New
          </Link>
          <button
            onClick={handleClearAll}
            className="rounded border border-paper-border bg-paper-panel px-3 py-2 text-black dark:text-white hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] transition disabled:opacity-50"
            disabled={!hasItems}
            title={hasItems ? "Clear saved items" : "Nothing to clear"}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Search Results Counter */}
      {searchQuery && (
        <div className="relative overflow-hidden rounded-lg px-6 py-4 backdrop-blur-md bg-blue-500/20 border border-blue-400/30 animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-purple-600/0"></div>
          <div className="relative flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <div>
              <div className="font-semibold text-blue-100">Search Results</div>
              <div className="text-sm text-blue-200">Found {sorted.length} result{sorted.length !== 1 ? 's' : ''} for "{searchQuery}"</div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Filter - View by Category */}
      <div className="relative overflow-hidden rounded-xl p-6 backdrop-blur-md bg-white/5 border border-white/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0"></div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-sm font-semibold text-white/90">View by Category</div>
              <div className="text-xs text-white/60">Filter hypotheses by engagement and verification status</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Ideas", icon: "📋" },
              { id: "popular", label: "Popular", icon: "🔥" },
              { id: "reproducible", label: "Reproducible", icon: "✓" },
              { id: "controversial", label: "Controversial", icon: "⚡" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setBadgeFilter(filter.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  badgeFilter === filter.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50"
                    : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:border-white/30"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-white/70 mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="space-y-1">
              <p><strong>🔥 Popular:</strong> High engagement and positive sentiment (5+ net upvotes)</p>
              <p><strong>✓ Reproducible:</strong> Multiple verification attempts (3+ forks)</p>
              <p><strong>⚡ Controversial:</strong> Contested but rigorously tested ideas (2+ downvotes AND 3+ forks)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forecasters Leaderboard */}
      {(() => {
        const profiles = loadPredictorProfiles();
        const topForecasters = Object.values(profiles)
          .filter((p) => p.totalPredictions > 0)
          .sort((a, b) => b.accuracyScore - a.accuracyScore)
          .slice(0, 5);

        return topForecasters.length > 0 ? (
          <div className="relative overflow-hidden rounded-xl p-6 backdrop-blur-md bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-400/30">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/0 to-orange-600/0"></div>
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="text-sm font-semibold text-white/90">Top Forecasters</div>
                  <div className="text-xs text-white/60">Most accurate predictions</div>
                </div>
              </div>
              <div className="space-y-2">
                {topForecasters.map((forecaster, idx) => (
                  <div key={forecaster.name} className="group relative overflow-hidden rounded-lg p-3 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 hover:border-yellow-400/50 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 to-orange-600/0 group-hover:from-yellow-600/10 group-hover:to-orange-600/10 transition-all"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 w-8 text-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{forecaster.name}</div>
                          <div className="text-xs text-white/60">{forecaster.correctPredictions} correct</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-300\">{forecaster.accuracyScore}%</div>
                        <div className="text-xs text-white/60\">{forecaster.totalPredictions} predictions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {!hasItems ? (
        <div className="relative overflow-hidden rounded-xl p-8 backdrop-blur-md bg-white/5 border border-white/20 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5"></div>
          <div className="relative space-y-4">
            <div className="text-4xl">📭</div>
            <div className="text-lg font-semibold text-white">No hypotheses yet</div>
            <p className="text-white/70">Create your first hypothesis to get started with testing ideas</p>
            <Link
              href="/new"
              className="inline-block group relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 group-hover:from-purple-500 group-hover:to-pink-500 transition-all"></div>
              <div className="relative">+ Create Your First Hypothesis</div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {sorted.map((h) => (
            <article
              key={h.id}
              className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-md p-6 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5"></div>
              <div className="relative flex items-baseline justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">{h.title}</h2>
                    {h.isPrivate && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-400/30 rounded text-xs font-medium text-red-200">
                        🔒 Private
                      </span>
                    )}
                    {h.realWorldImpact?.hasImpact && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded text-xs font-medium text-emerald-200">
                        🌍 Real-World Impact
                      </span>
                    )}
                    {(() => {
                      const badges = calculateBadges(h);
                      return badges.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {badges.includes("popular") && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 border border-orange-400/30 rounded text-xs font-medium text-orange-200">
                              🔥 Popular
                            </span>
                          )}
                          {badges.includes("reproducible") && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-400/30 rounded text-xs font-medium text-green-200">
                              ✓ Reproducible
                            </span>
                          )}
                          {badges.includes("controversial") && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-400/30 rounded text-xs font-medium text-purple-200">
                              ⚡ Controversial
                            </span>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  {h.isPrivate && h.owner && (
                    <div className="mt-2 text-xs text-red-300 bg-red-500/10 inline-block px-2 py-1 rounded border border-red-400/20">
                      Owner: <strong>{h.owner}</strong>
                    </div>
                  )}
                  {h.parentId && (
                    <div className="mt-1 text-xs text-blue-300">
                      🌿 Fork ({h.forkReason === "verify" ? "🔍 Verify" : h.forkReason === "build" ? "🔨 Build" : "❌ Disprove"})
                    </div>
                  )}
                  {(h.forkCount ?? 0) > 0 && (
                    <div className="mt-1 text-xs text-blue-300">
                      🔀 {h.forkCount ?? 0} fork{(h.forkCount ?? 0) !== 1 ? "s" : ""}
                    </div>
                  )}
                  {h.collaborators && h.collaborators.length > 0 && (
                    <div className="mt-2 text-xs text-blue-300">
                      👥 Collaborators: <span className="text-blue-200">{h.collaborators.join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                  <div className="text-xs text-white/60">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {h.owner === currentUser && (
                      <button
                        onClick={() => setShowPrivacySettings(showPrivacySettings === h.id ? null : h.id)}
                        className="text-xs px-2 py-1 rounded bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 hover:border-blue-400/50 transition"
                        title="Privacy settings"
                      >
                        {h.isPrivate ? "🔒" : "🌐"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowImpactDialog(showImpactDialog === h.id ? null : h.id)}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/30 hover:border-emerald-400/50 transition"
                      title="Real-world impact"
                    >
                      {h.realWorldImpact?.hasImpact ? "🌍" : "📝"}
                    </button>
                    <button
                      onClick={() => handleForkClick(h.id, h.title)}
                      className="text-xs px-2 py-1 rounded bg-purple-500/20 border border-purple-400/30 text-purple-200 hover:bg-purple-500/30 hover:border-purple-400/50 transition"
                      title="Fork this hypothesis"
                    >
                      🌿 Fork
                    </button>
                    <button
                      onClick={() => setCollaborationHypoId(h.id)}
                      className="text-xs px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/30 hover:border-cyan-400/50 transition"
                      title="Request to collaborate"
                    >
                      🤝 Collaborate
                    </button>
                    <button
                      onClick={() => handleDeleteHypothesis(h.id)}
                      className="text-xs px-2 py-1 rounded bg-red-500/20 border border-red-400/30 text-red-200 hover:bg-red-500/30 hover:border-red-400/50 transition"
                      title="Delete this hypothesis"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-blue-300">Hypothesis Statement</div>
                  <p className="mt-2 text-white/90 text-sm leading-relaxed">{h.claim}</p>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-blue-300">
                      Method / Conditions
                    </div>
                    {h.methodLocked && (
                      <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-400/30">
                        🔒 Locked
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-white/80 whitespace-pre-wrap text-sm leading-relaxed max-h-24 overflow-y-auto">
                    {h.method}
                  </p>
                  {h.methodVersions && h.methodVersions.length > 1 && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer text-blue-300 font-medium hover:text-blue-200">
                        📜 Version History ({h.methodVersions.length})
                      </summary>
                      <div className="mt-2 space-y-2 border-l-2 border-blue-400/30 pl-3">
                        {[...h.methodVersions].reverse().map((v) => (
                          <div key={v.id} className="text-white/70">
                            <div className="font-medium text-white">v{v.version}</div>
                            <div className="text-white/60 text-xs">
                              Locked by {v.lockedBy} on {new Date(v.lockedAt).toLocaleString()}
                            </div>
                            <div className="mt-1 bg-white/5 p-2 rounded text-white/70 whitespace-pre-wrap text-xs max-h-20 overflow-y-auto border border-white/10">
                              {v.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

              </div>

              {/* Prediction Section */}
              <div className="mt-4 p-3 bg-paper-panel border border-paper-border rounded">
                <div className="text-sm font-semibold text-black dark:text-white mb-3">🔮 Make a Prediction</div>
                <p className="text-xs text-gray-600 mb-3">Lock your forecast before results are submitted. Your accuracy will be tracked!</p>
                
                {h.predictions && h.predictions.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    <div className="text-xs text-black font-medium">Predictions ({h.predictions.length})</div>
                    {h.predictions.map((pred) => {
                      const predictorProfile = getOrCreatePredictorProfile(pred.predictorName);
                      const isCorrect = pred.correctness === "correct";
                      return (
                        <div key={pred.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-paper-border dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-black dark:text-white">{pred.predictorName}</div>
                              <div className="text-gray-700 dark:text-gray-300 mt-0.5">{pred.predictedOutcome}</div>
                            </div>
                            <div className="text-right">
                              {pred.correctness === "correct" && <span className="text-green-600 dark:text-green-400 font-bold">✓ Correct</span>}
                              {pred.correctness === "incorrect" && <span className="text-red-600 dark:text-red-400 font-bold">✗ Wrong</span>}
                              {pred.correctness === "pending" && <span className="text-amber-600 dark:text-amber-400">⏳ Pending</span>}
                            </div>
                          </div>
                          <div className="mt-1 flex gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>⭐ {predictorProfile.accuracyScore}% accurate</span>
                            <span>({predictorProfile.correctPredictions}/{predictorProfile.totalPredictions})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!predictionHypoId || predictionHypoId !== h.id ? (
                  <button
                    onClick={() => setPredictionHypoId(h.id)}
                    className="w-full px-3 py-2 bg-paper-base border border-paper-border text-black dark:text-white rounded text-sm hover:bg-[hsl(var(--card))] transition font-medium"
                  >
                    + Add Prediction
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your name (for tracking)"
                      value={predictionAuthor}
                      onChange={(e) => setPredictionAuthor(e.target.value)}
                      maxLength={50}
                      className="w-full rounded bg-white border border-paper-border p-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-paper-border focus:ring-1 focus:ring-gray-300"
                    />
                    <textarea
                      placeholder="Your predicted outcome (be specific!)"
                      value={predictionOutcome}
                      onChange={(e) => setPredictionOutcome(e.target.value)}
                      rows={3}
                      className="w-full rounded bg-white border border-paper-border p-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-paper-border focus:ring-1 focus:ring-gray-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (predictionAuthor.trim() && predictionOutcome.trim()) {
                            const newPrediction: Prediction = {
                              id: Date.now().toString(),
                              predictorName: predictionAuthor,
                              predictedOutcome: predictionOutcome,
                              lockedAt: new Date().toISOString(),
                              correctness: "pending",
                            };
                            const updated = items.map((item) =>
                              item.id === h.id
                                ? {
                                    ...item,
                                    predictions: [...(item.predictions || []), newPrediction],
                                    changeHistory: [
                                      ...(item.changeHistory || []),
                                      {
                                        id: Date.now().toString(),
                                        author: predictionAuthor,
                                        action: `Prediction locked: "${predictionOutcome}"`,
                                        timestamp: new Date().toISOString(),
                                      },
                                    ],
                                  }
                                : item
                            );
                            saveHypotheses(updated);
                            setItems(updated);
                            setPredictionHypoId(null);
                            setPredictionAuthor("");
                            setPredictionOutcome("");
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-green-primary text-green-text rounded text-sm hover:bg-green-hover transition font-medium"
                      >
                        🔒 Lock Prediction
                      </button>
                      <button
                        onClick={() => {
                          setPredictionHypoId(null);
                          setPredictionAuthor("");
                          setPredictionOutcome("");
                        }}
                        className="flex-1 px-3 py-2 bg-paper-base border border-paper-border text-black dark:text-white rounded text-sm hover:bg-[hsl(var(--card))] transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleUpvote(h.id)}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-green-900 text-green-100 hover:bg-green-800 text-sm"
                  title="Upvote this hypothesis"
                >
                  👍 {h.upvotes ?? 0}
                </button>
                <button
                  onClick={() => handleDownvote(h.id)}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-red-900 text-red-100 hover:bg-red-800 text-sm"
                  title="Downvote this hypothesis"
                >
                  👎 {h.downvotes ?? 0}
                </button>
              </div>

              {h.media && h.media.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-black font-medium mb-2">Media ({h.media.length})</div>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {h.media.map((m, idx) => (
                      <div key={idx} className="rounded border border-paper-border overflow-hidden bg-paper-panel">
                        {m.type === "image" ? (
                          <img src={m.data} alt={m.name} className="w-full h-32 object-cover" />
                        ) : (
                          <video src={m.data} className="w-full h-32 object-cover" controls />
                        )}
                        <div className="text-xs text-gray-400 p-1 truncate bg-gray-100">
                          {m.type === "image" ? "🖼️" : "🎬"} {m.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Results Section */}
              {h.predictions && h.predictions.length > 0 && !h.actualResult && (
                <div className="mt-4 p-3 bg-paper-panel border border-paper-border rounded">
                  <div className="text-sm font-semibold text-black dark:text-white mb-3">📊 Submit Results</div>
                  <p className="text-xs text-gray-600 mb-3">Submit the actual outcome to score all predictions!</p>

                  {!submittingResultsId || submittingResultsId !== h.id ? (
                    <button
                      onClick={() => setSubmittingResultsId(h.id)}
                      className="w-full px-3 py-2 bg-orange-muted text-orange-text rounded text-sm hover:bg-orange-hover transition font-medium"
                    >
                      📝 Submit Results
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        placeholder="What was the actual outcome?"
                        value={actualResult}
                        onChange={(e) => setActualResult(e.target.value)}
                        rows={3}
                        className="w-full rounded bg-white border border-paper-border p-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:border-paper-border focus:ring-1 focus:ring-gray-300"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (actualResult.trim()) {
                              const updated: Hypothesis[] = items.map((item) => {
                                if (item.id === h.id) {
                                  // Score all predictions
                                  const predictions: Prediction[] = (item.predictions || []).map((pred) => {
                                    const isCorrect = pred.predictedOutcome.toLowerCase().includes(
                                      actualResult.toLowerCase().split(" ")[0]
                                    ) || actualResult.toLowerCase().includes(pred.predictedOutcome.toLowerCase());
                                    
                                    updatePredictorAccuracy(pred.predictorName, isCorrect);
                                    
                                    return {
                                      id: pred.id,
                                      predictorName: pred.predictorName,
                                      predictedOutcome: pred.predictedOutcome,
                                      lockedAt: pred.lockedAt,
                                      correctness: isCorrect ? "correct" : ("incorrect" as const),
                                    } as Prediction;
                                  });

                                  return {
                                    ...item,
                                    actualResult: actualResult,
                                    predictions: predictions,
                                    changeHistory: [
                                      ...(item.changeHistory || []),
                                      {
                                        id: Date.now().toString(),
                                        author: "System",
                                        action: `Results submitted: "${actualResult}"`,
                                        timestamp: new Date().toISOString(),
                                      },
                                    ],
                                  };
                                }
                                return item;
                              });
                              saveHypotheses(updated);
                              setItems(updated);
                              setSubmittingResultsId(null);
                              setActualResult("");
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-orange-muted text-orange-text rounded text-sm hover:bg-orange-hover transition font-medium"
                        >
                          ✓ Finalize Results
                        </button>
                        <button
                          onClick={() => {
                            setSubmittingResultsId(null);
                            setActualResult("");
                          }}
                          className="flex-1 px-3 py-2 bg-paper-base border border-paper-border text-gray-900 rounded text-sm hover:bg-white transition font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {h.actualResult && (
                <div className="mt-4 p-3 bg-paper-panel border border-paper-border rounded">
                  <div className="text-sm font-semibold text-black dark:text-white mb-2">✓ Actual Result</div>
                  <div className="text-sm text-black dark:text-white bg-white dark:bg-gray-800 p-2 rounded border border-paper-border dark:border-gray-600">
                    {h.actualResult}
                  </div>
                </div>
              )}

              {/* Meta-Analysis: Synthesized Knowledge from 20+ Replications */}
              {h.metaAnalysis && (
                <div className="mt-4 p-4 bg-gradient-to-br from-paper-panel to-white border border-paper-border rounded-lg">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                      🔬 Synthesized Meta-Analysis
                      <span className="text-xs font-normal bg-green-primary text-green-text px-2 py-1 rounded">
                        {h.metaAnalysis.totalReplications} replications
                      </span>
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Auto-generated knowledge synthesis from independent verifications
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Replication Summary */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-paper-border dark:border-gray-600">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 Replication Summary</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Total Replications:</span>
                          <span className="font-bold text-black dark:text-white">{h.metaAnalysis.totalReplications}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Successful:</span>
                          <span className="font-bold text-green-900 dark:text-green-400">{h.metaAnalysis.successfulReplications}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Replication Rate:</span>
                          <span className="font-bold text-blue-900 dark:text-blue-400">{h.metaAnalysis.replicationRate.toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Strength of Evidence:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              h.metaAnalysis.strengthOfEvidence === "very-strong" ? "bg-green-100 text-green-900" :
                              h.metaAnalysis.strengthOfEvidence === "strong" ? "bg-lime-100 text-lime-900" :
                              h.metaAnalysis.strengthOfEvidence === "moderate" ? "bg-yellow-100 text-yellow-900" :
                              h.metaAnalysis.strengthOfEvidence === "weak" ? "bg-orange-100 text-orange-900" :
                              "bg-red-100 text-red-900"
                            }`}>
                              {h.metaAnalysis.strengthOfEvidence.replace("-", " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Effect Size & Confidence Interval */}
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-paper-border dark:border-gray-600">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">📈 Effect Size</div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Mean Effect Size</div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-purple-900 dark:text-purple-400">{h.metaAnalysis.meanEffectSize.toFixed(2)}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">(scale 0-1)</span>
                          </div>
                        </div>
                        <div className="bg-purple-50 dark:bg-gray-700 p-2 rounded border border-purple-200 dark:border-purple-600">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">95% Confidence Interval</div>
                          <div className="text-sm font-mono font-bold text-purple-900 dark:text-purple-400">
                            [{h.metaAnalysis.confidenceInterval.lower.toFixed(3)}, {h.metaAnalysis.confidenceInterval.upper.toFixed(3)}]
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            We're 95% confident the true effect is in this range
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Variance Analysis */}
                  <div className="mt-4 bg-white dark:bg-gray-800 p-3 rounded border border-paper-border dark:border-gray-600 text-black dark:text-white">
                    <div className="text-xs font-semibold text-gray-700 mb-2">📊 Consistency Across Replications</div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600 text-xs">Standard Deviation</div>
                        <div className="font-bold text-black dark:text-white">{h.metaAnalysis.varianceAnalysis.standardDeviation.toFixed(3)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Variance</div>
                        <div className="font-bold text-black dark:text-white">{h.metaAnalysis.varianceAnalysis.variance.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600 text-xs">Heterogeneity (I²)</div>
                        <div className="font-bold text-black dark:text-white">{h.metaAnalysis.varianceAnalysis.heterogeneityIndex.toFixed(1)}%</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {h.metaAnalysis.varianceAnalysis.heterogeneityIndex > 75 ? "High variation" :
                           h.metaAnalysis.varianceAnalysis.heterogeneityIndex > 50 ? "Moderate variation" :
                           "Consistent"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Failure Conditions */}
                  {h.metaAnalysis.failureConditions.length > 0 && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-700">
                      <div className="text-xs font-semibold text-red-900 dark:text-red-300 mb-2">⚠️ Conditions Where Hypothesis Fails</div>
                      <ul className="space-y-1 text-sm">
                        {h.metaAnalysis.failureConditions.map((condition, idx) => (
                          <li key={idx} className="text-gray-700 dark:text-gray-300 flex gap-2">
                            <span className="text-red-600 dark:text-red-400">•</span>
                            <span>{condition}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500 border-t border-paper-border pt-3">
                    Last updated: {new Date(h.metaAnalysis.lastUpdated).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Submit Replication Result */}
              {!h.metaAnalysis && h.forkCount! > 0 && h.parentId === undefined && (
                <div className="mt-4 p-3 bg-white border border-dashed border-gray-300 rounded">
                  {!replicationHypoId || replicationHypoId !== h.id ? (
                    <button
                      onClick={() => setReplicationHypoId(h.id)}
                      className="w-full px-3 py-2 bg-paper-base border border-paper-border text-black dark:text-white rounded text-sm hover:bg-[hsl(var(--card))] font-medium transition"
                    >
                      📝 Report Replication Result
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Researcher Name</label>
                        <input
                          type="text"
                          value={replicationResearcher}
                          onChange={(e) => setReplicationResearcher(e.target.value)}
                          placeholder="Your name or team"
                          className="w-full px-2 py-1 text-sm rounded border border-paper-border bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-paper-border focus:ring-1 focus:ring-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Outcome</label>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              type="radio"
                              checked={replicationOutcomeConfirmed}
                              onChange={() => setReplicationOutcomeConfirmed(true)}
                              className="w-4 h-4"
                            />
                            <span className="text-gray-700">Confirmed ✓</span>
                          </label>
                          <label className="flex items-center gap-1 text-sm cursor-pointer">
                            <input
                              type="radio"
                              checked={!replicationOutcomeConfirmed}
                              onChange={() => setReplicationOutcomeConfirmed(false)}
                              className="w-4 h-4"
                            />
                            <span className="text-gray-700">Failed ✗</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Effect Size (0-1)</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={replicationEffectSize}
                          onChange={(e) => setReplicationEffectSize(parseFloat(e.target.value))}
                          aria-label="Effect size"
                          className="w-full"
                        />
                        <div className="text-xs text-gray-600 mt-1">Current: {replicationEffectSize.toFixed(1)} ({replicationEffectSize < 0.2 ? "negligible" : replicationEffectSize < 0.5 ? "small" : replicationEffectSize < 0.8 ? "medium" : "large"})</div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (e.g., failure conditions)</label>
                        <textarea
                          value={replicationNotes}
                          onChange={(e) => setReplicationNotes(e.target.value)}
                          placeholder="e.g., 'Failed when humidity > 80%', 'Replicated in sample of 500'"
                          rows={2}
                          className="w-full px-2 py-1 text-sm rounded border border-paper-border bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-paper-border focus:ring-1 focus:ring-gray-300"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (replicationResearcher.trim()) {
                              submitReplicationResult(
                                h.id,
                                h.id, // In real scenario, would reference fork ID
                                replicationResearcher,
                                replicationOutcomeConfirmed,
                                replicationEffectSize,
                                replicationNotes
                              );
                              setReplicationHypoId(null);
                              setReplicationResearcher("");
                              setReplicationOutcomeConfirmed(true);
                              setReplicationEffectSize(0.5);
                              setReplicationNotes("");
                            } else {
                              alert("Please enter your name");
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-green-primary text-green-text rounded text-sm hover:bg-green-hover transition font-medium"
                        >
                          Submit Replication
                        </button>
                        <button
                          onClick={() => setReplicationHypoId(null)}
                          className="flex-1 px-3 py-2 bg-paper-base border border-paper-border text-gray-900 rounded text-sm hover:bg-white transition font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DataTableDisplay dataTable={h.dataTable} />
              <ChartDisplay chartData={h.chartData} />

              {/* Article/Draft Section */}
              {(h.draft || h.article) && (
                <div className="mt-6 border-t border-paper-border pt-4 space-y-4">
                  {h.article && (
                    <div className="bg-green-950 border border-green-800 rounded p-4">
                      <div className="text-sm text-green-300 font-semibold mb-2">📤 Published Article</div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-green-400 mb-1">Conclusion</div>
                          <p className="text-gray-200 text-sm whitespace-pre-wrap">{h.article.conclusion}</p>
                        </div>

                        {h.article.sources && h.article.sources.length > 0 && (
                          <div>
                            <div className="text-xs text-green-400 mb-1">Sources & References</div>
                            <ul className="text-sm text-gray-300 space-y-1">
                              {h.article.sources.map((source, idx) => (
                                <li key={idx} className="text-xs">
                                  {idx + 1}. <a href={source} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">{source}</a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {h.article.publishedAt && (
                          <div className="text-xs text-gray-400">
                            Published: {new Date(h.article.publishedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {h.draft && !h.article && (
                    <div className="bg-yellow-950 border border-yellow-800 rounded p-4">
                      <div className="text-sm text-yellow-300 font-semibold mb-2">📝 Draft (Work in Progress)</div>
                      <p className="text-gray-200 text-sm whitespace-pre-wrap">{h.draft}</p>
                    </div>
                  )}

                  {h.draft && h.article && (
                    <details className="bg-paper-panel border border-paper-border rounded p-3">
                      <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                        📝 View Draft (Work in Progress)
                      </summary>
                      <div className="mt-3 pt-3 border-t border-paper-border">
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{h.draft}</p>
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Change History Section - For Shared Hypotheses */}
              {h.isShared && h.changeHistory && h.changeHistory.length > 0 && (
                <div className="mt-6 border-t border-paper-border pt-4">
                  <div className="text-sm text-black font-medium mb-3">📋 Collaboration Activity</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {h.changeHistory.map((change) => (
                      <div key={change.id} className="bg-paper-panel rounded p-3 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-blue-400">{change.author}</span>
                          <span className="text-gray-500">{new Date(change.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-300">{change.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Private Sandbox Settings */}
              {showPrivacySettings === h.id && h.owner === currentUser && (
                <div className="mt-4 border border-paper-border bg-paper-panel rounded p-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">🔒 Privacy Settings</div>
                  
                  <div className="space-y-3">
                    {/* Toggle Privacy */}
                    <div className="flex items-center gap-3 pb-3 border-b border-paper-border">
                      <button
                        onClick={() => {
                          const updated = items.map(item => 
                            item.id === h.id ? togglePrivacy(item, currentUser) : item
                          );
                          saveHypotheses(updated);
                          setItems(updated);
                        }}
                        className={`px-3 py-2 rounded text-sm font-medium transition ${
                          h.isPrivate 
                            ? "bg-red-100 text-red-700 hover:bg-red-200" 
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {h.isPrivate ? "🔒 Make Public" : "🌐 Make Private"}
                      </button>
                      <span className="text-xs text-gray-600">
                        {h.isPrivate ? "Only you and collaborators can see" : "Everyone can see"}
                      </span>
                    </div>

                    {/* Invite Collaborators (for private hypotheses) */}
                    {h.isPrivate && (
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-semibold text-black dark:text-white">Invite Collaborators</div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="collaborator@example.com"
                            value={inviteeEmail}
                            onChange={(e) => setInviteeEmail(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm rounded border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-green-primary focus:ring-1 focus:ring-[hsl(var(--ring))]"
                          />
                          <button
                            onClick={() => {
                              if (inviteeEmail.trim()) {
                                const updated = items.map(item =>
                                  item.id === h.id ? inviteCollaborator(item, inviteeEmail, currentUser) : item
                                );
                                saveHypotheses(updated);
                                setItems(updated);
                                setInviteeEmail("");
                              }
                            }}
                            className="px-2 py-1 text-sm rounded bg-green-primary text-green-text hover:bg-green-hover transition"
                          >
                            Invite
                          </button>
                        </div>

                        {/* Show pending invitations */}
                        {h.privateInvitations && h.privateInvitations.filter(inv => inv.status === "pending").length > 0 && (
                          <div className="text-xs text-black dark:text-white bg-paper-base p-2 rounded mt-2 border border-paper-border">
                            <div className="font-semibold mb-1">Pending Invitations:</div>
                            {h.privateInvitations.filter(inv => inv.status === "pending").map(inv => (
                              <div key={inv.id} className="text-xs">{inv.email}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Publish */}
                    {h.isPrivate && (
                      <div className="pt-2 border-t border-paper-border">
                        <button
                          onClick={() => {
                            const updated = items.map(item =>
                              item.id === h.id ? publishHypothesis(item) : item
                            );
                            saveHypotheses(updated);
                            setItems(updated);
                            setShowPrivacySettings(null);
                          }}
                          className="px-3 py-2 text-sm font-medium rounded bg-green-primary text-green-text hover:bg-green-hover transition w-full"
                        >
                          📤 Publish to Public
                        </button>
                        <div className="text-xs text-gray-600 mt-2">
                          Once published, this hypothesis will be visible to everyone and cannot be made private again.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Papers Section */}
              {h.linkedPapers && h.linkedPapers.length > 0 && (
                <div className="mt-4 border border-blue-300 bg-blue-50 rounded p-4">
                  <div className="text-sm font-semibold text-blue-900 mb-3">🔗 Linked Research Papers ({h.linkedPapers.length})</div>
                  <div className="space-y-2">
                    {h.linkedPapers.map((paper) => (
                      <div key={paper.id} className="bg-white border border-blue-200 rounded p-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-black dark:text-white text-sm mb-1 break-words">{paper.title}</div>
                            {paper.authors.length > 0 && (
                              <div className="text-xs text-gray-600 mb-1">
                                {paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}
                              </div>
                            )}
                            <div className="flex gap-3 text-xs text-gray-600 flex-wrap">
                              {paper.year && <span>📅 {paper.year}</span>}
                              {paper.citationCount > 0 && (
                                <span className="text-blue-600 font-medium">🔗 {paper.citationCount} citations</span>
                              )}
                              {paper.doi && (
                                <span className="font-mono text-blue-600">
                                  DOI: {paper.doi.split("/").slice(-1)[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          {paper.paperUrl && (
                            <a
                              href={paper.paperUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium flex-shrink-0 whitespace-nowrap transition"
                            >
                              Open Paper →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-World Impact Section */}
              {showImpactDialog === h.id && (
                <div className="mt-4 border border-amber-300 bg-amber-50 rounded p-4">
                  <div className="text-sm font-semibold text-amber-900 mb-3">🌍 Real-World Impact</div>

                  {h.realWorldImpact?.hasImpact ? (
                    <div className="space-y-3 pb-3 border-b border-amber-200">
                      <div className="text-xs text-amber-800">
                        <strong>Impact Description:</strong>
                        <p className="mt-1 text-xs text-amber-700 bg-amber-100 p-2 rounded">{h.realWorldImpact?.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <strong className="text-amber-900">Implemented By:</strong>
                          <p className="text-amber-700">{h.realWorldImpact?.implementedBy}</p>
                        </div>
                        <div>
                          <strong className="text-amber-900">Implementation Date:</strong>
                          <p className="text-amber-700">
                            {h.realWorldImpact?.implementationDate 
                              ? new Date(h.realWorldImpact?.implementationDate as string).toLocaleDateString()
                              : "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <strong className="text-xs text-amber-900">Impact Types:</strong>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {h.realWorldImpact?.impactTypes.map((type) => (
                            <span key={type} className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded">
                              {getImpactTypeEmoji(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                            </span>
                          ))}
                        </div>
                      </div>
                      {h.realWorldImpact?.impactUrl && (
                        <div>
                          <a
                            href={h.realWorldImpact?.impactUrl || ""}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            📌 View Evidence
                          </a>
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-amber-200">
                        Added by {h.realWorldImpact?.addedBy} on{" "}
                        {h.realWorldImpact?.addedAt 
                          ? new Date(h.realWorldImpact?.addedAt as string).toLocaleDateString()
                          : "Unknown date"}
                      </div>
                    </div>
                  ) : null}

                  <div className={`${h.realWorldImpact?.hasImpact ? "pt-3 mt-3 border-t border-amber-200" : ""}`}>
                    <div className="text-xs font-semibold text-amber-900 mb-3">
                      {h.realWorldImpact?.hasImpact ? "Update Real-World Impact" : "Document Real-World Impact"}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">Impact Types</label>
                        <div className="flex flex-wrap gap-2">
                          {(["policy", "product", "implementation", "other"] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() =>
                                setImpactTypes(
                                  impactTypes.includes(type)
                                    ? impactTypes.filter((t) => t !== type)
                                    : [...impactTypes, type]
                                )
                              }
                              className={`text-xs px-2 py-1 rounded transition ${
                                impactTypes.includes(type)
                                  ? "bg-amber-600 text-white"
                                  : "bg-amber-200 text-amber-800 hover:bg-amber-300"
                              }`}
                            >
                              {getImpactTypeEmoji(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">Impact Description</label>
                        <textarea
                          value={impactDescription}
                          onChange={(e) => setImpactDescription(e.target.value)}
                          placeholder="How has this hypothesis impacted the real world? (e.g., 'This research was used to develop...')"
                          className="w-full px-2 py-1 text-xs rounded border border-amber-300 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">Implemented By (Organization/Person)</label>
                        <input
                          type="text"
                          value={impactImplementedBy}
                          onChange={(e) => setImpactImplementedBy(e.target.value)}
                          placeholder="e.g., 'Company X', 'Policy Committee', 'University Y'"
                          className="w-full px-2 py-1 text-xs rounded border border-amber-300 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">Implementation Date</label>
                        <input
                          type="date"
                          value={impactImplementationDate}
                          onChange={(e) => setImpactImplementationDate(e.target.value)}
                          title="Select implementation date"
                          className="w-full px-2 py-1 text-xs rounded border border-amber-300 bg-white text-black focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-amber-900 block mb-1">Evidence Link (URL)</label>
                        <input
                          type="url"
                          value={impactUrl}
                          onChange={(e) => setImpactUrl(e.target.value)}
                          placeholder="Link to news article, product page, or policy document"
                          className="w-full px-2 py-1 text-xs rounded border border-amber-300 bg-white text-black placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (impactDescription && impactImplementedBy && impactImplementationDate && impactTypes.length > 0) {
                              const updated = items.map((item) =>
                                item.id === h.id
                                  ? addRealWorldImpact(
                                      item,
                                      impactTypes,
                                      impactDescription,
                                      impactImplementedBy,
                                      new Date(impactImplementationDate).toISOString(),
                                      impactUrl,
                                      currentUser || "Anonymous"
                                    )
                                  : item
                              );
                              saveHypotheses(updated);
                              setItems(updated);
                              setShowImpactDialog(null);
                              setImpactTypes([]);
                              setImpactDescription("");
                              setImpactImplementedBy("");
                              setImpactImplementationDate("");
                              setImpactUrl("");
                            } else {
                              alert("Please fill in all required fields");
                            }
                          }}
                          className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 transition"
                        >
                          {h.realWorldImpact?.hasImpact ? "Update Impact" : "Add Impact"}
                        </button>
                        {h.realWorldImpact?.hasImpact && (
                          <button
                            onClick={() => {
                              const updated = items.map((item) =>
                                item.id === h.id ? removeRealWorldImpact(item) : item
                              );
                              saveHypotheses(updated);
                              setItems(updated);
                              setShowImpactDialog(null);
                            }}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition"
                          >
                            Remove Impact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-6 border-t border-paper-border pt-4">
                <div className="text-sm text-black dark:text-white font-medium mb-3">💬 Discussion ({h.comments?.length ?? 0})</div>

                {/* Comments Display */}
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {h.comments && h.comments.length > 0 ? (
                    h.comments.map((comment) => {
                      const profile = comment.reviewerProfile;
                      const weight = profile ? getReviewWeight(profile) : 0.5;
                      const reliability = profile ? calculateReliabilityScore(profile) : 0;
                      
                      return (
                        <div key={comment.id} className={`bg-paper-panel dark:bg-gray-800 rounded p-3 text-sm border-l-4 ${profile && profile.successfulReplications > 0 ? 'border-green-600' : 'border-paper-border'}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <div className="font-medium text-black dark:text-white flex items-center gap-2">
                                {comment.author}
                                {profile && (
                                  <span className="text-xs bg-paper-base dark:bg-gray-700 text-green-primary px-2 py-0.5 rounded border border-paper-border dark:border-gray-600">
                                    ⭐ {reliability}% reliable
                                  </span>
                                )}
                              </div>
                              {profile && profile.expertiseTags && profile.expertiseTags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {profile.expertiseTags.map((tag, idx) => (
                                    <span key={idx} className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteComment(h.id, comment.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title="Delete comment"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-black dark:text-gray-200 mb-2">{comment.message}</p>
                          <div className="flex items-center justify-between text-xs text-black/60 dark:text-gray-400">
                            <span>{new Date(comment.createdAt).toLocaleString()}</span>
                            {profile && (
                              <span title={`Weight: ${weight.toFixed(2)}x (${profile.successfulReplications}/${profile.totalReviews} successful)`}>
                                💪 {weight.toFixed(2)}x weight
                              </span>
                            )}
                          </div>
                          {profile && profile.successfulReplications > 0 && (
                            <div className="mt-2 text-xs text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-1 rounded">
                              ✓ {profile.successfulReplications} successful replication{profile.successfulReplications !== 1 ? 's' : ''}
                            </div>
                          )}
                          {/* Reactions */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {(['👍', '❤️', '🎯', '💡', '⚠️'] as const).map((emoji) => {
                              const reaction = comment.reactions?.find((r: any) => r.emoji === emoji);
                              const userReacted = reaction?.users.includes(user?.email || '') || false;
                              const count = reaction?.users.length || 0;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    const updatedHypo = { ...h };
                                    if (!updatedHypo.comments) updatedHypo.comments = [];
                                    const commentIndex = updatedHypo.comments.findIndex((c: any) => c.id === comment.id);
                                    if (commentIndex !== -1) {
                                      if (!updatedHypo.comments[commentIndex].reactions) {
                                        updatedHypo.comments[commentIndex].reactions = [];
                                      }
                                      const currentReaction = updatedHypo.comments[commentIndex].reactions.find((r: any) => r.emoji === emoji);
                                      if (currentReaction) {
                                        const userIdx = currentReaction.users.indexOf(user?.email || '');
                                        if (userIdx !== -1) {
                                          currentReaction.users.splice(userIdx, 1);
                                        } else {
                                          currentReaction.users.push(user?.email || '');
                                        }
                                      } else {
                                        updatedHypo.comments[commentIndex].reactions.push({
                                          emoji,
                                          users: [user?.email || '']
                                        });
                                      }
                                      const updated = items.map((hyp: any) => hyp.id === h.id ? updatedHypo : hyp);
                                      setItems(updated);
                                    }
                                  }}
                                  className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs transition-colors ${
                                    userReacted
                                      ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                      : 'bg-paper-base dark:bg-gray-700 text-black/70 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                  title={count > 0 ? `${reaction?.users.join(', ')}` : ''}
                                >
                                  <span>{emoji}</span>
                                  {count > 0 && <span className="text-xs font-medium">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-black/70">No comments yet. Start the discussion!</div>
                  )}
                </div>

                {/* Comment Input */}
                {commentingId === h.id ? (
                  <div className="bg-paper-panel rounded p-3 space-y-2">
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded bg-white border border-black/30 p-2 text-black text-sm placeholder:text-black/50 focus:border-black focus:ring-2 focus:ring-black/20 focus:outline-none"
                      maxLength={50}
                    />
                    <textarea
                      value={commentMessage}
                      onChange={(e) => setCommentMessage(e.target.value)}
                      placeholder="Your comment..."
                      className="w-full rounded bg-white border border-black/30 p-2 text-black text-sm placeholder:text-black/50 focus:border-black focus:ring-2 focus:ring-black/20 focus:outline-none"
                      rows={2}
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddComment(h.id)}
                        className="flex-1 bg-green-primary text-green-text px-3 py-1 rounded text-sm hover:bg-green-hover font-medium"
                      >
                        Post Comment
                      </button>
                      <button
                        onClick={() => {
                          setCommentingId(null);
                          setCommentAuthor("");
                          setCommentMessage("");
                        }}
                        className="flex-1 bg-green-primary text-green-text px-3 py-1 rounded text-sm hover:bg-green-hover font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCommentingId(h.id)}
                    className="w-full bg-white border border-black/30 text-black px-3 py-1 rounded text-sm hover:bg-gray-50 font-medium"
                  >
                    Add Comment
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

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
                  className="w-full rounded bg-paper-panel border border-paper-border p-2 text-black dark:text-white focus:border-blue-500 focus:outline-none"
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

      {/* Collaboration Request Modal */}
      {collaborationHypoId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-100 rounded-lg border border-paper-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">🤝 Request to Collaborate</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-800 font-medium mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={collaborationRequester}
                  onChange={(e) => setCollaborationRequester(e.target.value)}
                  className="w-full rounded bg-paper-panel border border-paper-border p-2 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  placeholder="John Doe"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-800 font-medium mb-1">
                  What would you like to collaborate about?
                </label>
                <textarea
                  value={collaborationTopic}
                  onChange={(e) => setCollaborationTopic(e.target.value)}
                  className="w-full rounded bg-paper-panel border border-paper-border p-2 text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                  placeholder="Describe your collaboration proposal..."
                  rows={4}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSubmitCollaborationRequest}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium"
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setCollaborationHypoId(null);
                  setCollaborationTopic("");
                  setCollaborationRequester("");
                }}
                className="flex-1 bg-green-primary text-green-text px-4 py-2 rounded hover:bg-green-hover font-medium"
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
