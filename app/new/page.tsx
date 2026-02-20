"use client";

import React, { useState, FormEvent } from "react";

const STORAGE_KEY = "hypotheses_v1";

type ExperimentTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  titlePlaceholder: string;
  claimTemplate: string;
  methodTemplate: string;
};

const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: "clinical",
    name: "Clinical Study",
    icon: "🏥",
    description: "Medical or health-related research with control groups",
    titlePlaceholder: "e.g., Effect of [intervention] on [condition]",
    claimTemplate: "Null hypothesis (H₀): There is no significant difference in [outcome measure] between [treatment group] and [control group].\n\nAlternative hypothesis (H₁): [Treatment group] will show significantly [better/worse] [outcome measure] compared to [control group].\n\nEffect size expectation: [small/medium/large]",
    methodTemplate: "Study design: [Randomized Controlled Trial / Observational / Cohort]\n\nSample size: [N = ?] (power analysis: 80% power, α=0.05)\n\nParticipants: [Inclusion/exclusion criteria]\n\nIntervention: [Description of treatment]\n\nControl: [Description of control condition]\n\nPrimary outcome: [Measurement tool, collection timeline]\n\nSecondary outcomes: [List]\n\nStatistical analysis: [Tests to be used]\n\nBlinding: [Single/double/open-label]\n\nAffiliations & funding: [Disclose potential conflicts]",
  },
  {
    id: "survey",
    name: "Survey Study",
    icon: "📋",
    description: "Collect opinions, behaviors, or demographics via questionnaire",
    titlePlaceholder: "e.g., Attitudes toward [topic] among [population]",
    claimTemplate: "We predict that [X characteristic/variable] will correlate with [Y outcome] at a [small/medium/large] effect size among [population].\n\nSecondary prediction: [Additional hypothesis about group differences or mediating factors]",
    methodTemplate: "Survey type: [Online / Paper / Phone / Mixed]\n\nSampling method: [Random / Convenience / Stratified]\n\nSample target: [N = ?] from [population]\n\nInclusion/exclusion: [Criteria]\n\nQuestionnaire structure:\n- Demographic questions: [Details]\n- Core items: [Number and scale]\n- [Other sections]\n\nResponse scale: [Likert 1-5 / 0-10 / Multiple choice]\n\nData collection timeline: [Start date] to [End date]\n\nAnalysis: [Descriptive stats, correlation analysis, group comparisons]\n\nInformed consent: [How obtained]",
  },
  {
    id: "physics",
    name: "Physics Test",
    icon: "⚛️",
    description: "Test physical laws, forces, or material properties",
    titlePlaceholder: "e.g., Measurement of [property] under [conditions]",
    claimTemplate: "Under [specified conditions], [physical system/object] will exhibit [predicted behavior] following [physics principle].\n\nQuantitative prediction: [X variable] = [formula or expected value ± uncertainty]\n\nNull hypothesis: No measurable deviation from theoretical prediction beyond [measurement uncertainty]%",
    methodTemplate: "Apparatus:\n- [Key instruments with sensitivity/precision]\n- [Measurement tools and calibration]\n- [Environmental control systems]\n\nSetup: [Detailed physical configuration]\n\nProcedure:\n1. [Step-by-step experimental steps]\n2. [Measurements to be taken]\n3. [Repetition/trials]\n\nControl variables: [What is held constant]\n\nVariables manipulated: [What changes and by how much]\n\nData collection: [How many samples, sampling rate]\n\nUncertainty analysis: [Sources of error, propagation method]\n\nData processing: [Calculations, graphing, statistical tests]",
  },
  {
    id: "behavioral",
    name: "Behavioral Experiment",
    icon: "🧠",
    description: "Study human or animal behavior under controlled conditions",
    titlePlaceholder: "e.g., Effect of [stimulus] on [behavior] in [population]",
    claimTemplate: "Hypothesis: When exposed to [stimulus/condition], participants will demonstrate [predicted behavioral response] more than [control condition].\n\nMechanism: This occurs because [proposed cognitive/emotional/biological explanation].\n\nExpected effect size: [small/medium/large] based on [prior research/theory]",
    methodTemplate: "Design: [Within-subjects / Between-subjects / Mixed]\n\nParticipants: [N = ?] (demographics, recruitment method)\n\nStimulus/Condition:\n- Experimental: [What participants see/experience]\n- Control: [Comparison condition]\n\nBehavior measured: [Observable action, response method]\n\nMeasurement:\n- [Tool 1]: [What it captures]\n- [Tool 2]: [What it captures]\n\nProcedure timeline:\n1. [Consent and setup]\n2. [Experimental phase]\n3. [Measurement]\n4. [Debrief]\n\nConfounding variables controlled: [What is balanced or randomized]\n\nEnvironment: [Room setup, distractions minimized]\n\nData analysis: [Statistical tests for effect]",
  },
  {
    id: "software",
    name: "Software Benchmark",
    icon: "💻",
    description: "Test software performance, algorithms, or system behavior",
    titlePlaceholder: "e.g., Performance comparison of [algorithms/systems] on [benchmark]",
    claimTemplate: "Hypothesis: [Algorithm/System A] will [outperform/match/underperform] [Algorithm/System B] on [metric] by [expected percentage/magnitude].\n\nReasoning: [Theoretical or empirical basis for prediction]\n\nScenarios: This holds true for [typical case / worst case / average case]",
    methodTemplate: "Benchmark specification:\n- Input data: [Characteristics, size range]\n- Dataset source: [Where data comes from]\n- Scenarios: [Typical, edge cases]\n\nSystems/Algorithms tested:\n1. [Name & version/commit]\n2. [Name & version/commit]\n\nEnvironment:\n- Hardware: [CPU, RAM, Storage]\n- OS: [Operating system and version]\n- Dependencies: [Libraries, runtime versions]\n\nMetrics:\n- Primary: [Speed, memory, accuracy, etc.]\n- Secondary: [Other measurements]\n\nMethodology:\n- Warmup runs: [Number]\n- Measured runs: [Number]\n- Repetitions: [How many times entire test runs]\n- Timing method: [How measured]\n\nStatistics: [Mean, median, std dev, percentiles]\n\nCode & reproducibility: [Repository link, commands to run]",
  },
];

function loadHypotheses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHypotheses(items: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function NewPage() {
  const [title, setTitle] = useState("");
  const [claim, setClaim] = useState("");
  const [method, setMethod] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [media, setMedia] = useState<Array<{ type: "image" | "video"; data: string; name: string }>>([]);
  
  // Table state
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [colInput, setColInput] = useState("");
  const [rowInputs, setRowInputs] = useState<string[]>([]);
  
  // Chart state
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [chartLabel, setChartLabel] = useState("");
  const [chartDataKey, setChartDataKey] = useState("");
  const [chartData, setChartData] = useState<Array<Record<string, any>>>([]);
  const [chartRowInput, setChartRowInput] = useState("");

  // Article/Draft state
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [draft, setDraft] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [sourceInput, setSourceInput] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // Paper Linking state
  const [linkedPapers, setLinkedPapers] = useState<Array<{
    id: string;
    doi: string;
    title: string;
    authors: string[];
    year?: number;
    citationCount: number;
    openalex_id?: string;
    paperUrl?: string;
    addedAt: string;
  }>>([]);
  const [paperInput, setPaperInput] = useState("");
  const [isSearchingPaper, setIsSearchingPaper] = useState(false);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  function applyTemplate(templateId: string) {
    const template = EXPERIMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setTitle("");
    setClaim(template.claimTemplate);
    setMethod(template.methodTemplate);
  }

  function clearTemplate() {
    setSelectedTemplate(null);
    setTitle("");
    setClaim("");
    setMethod("");
  }

  function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    console.log("FILES UPLOADED:", files.length);

    files.forEach((file) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        console.log("File type not supported:", file.type);
        return;
      }

      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setMedia((prev) => [
          ...prev,
          {
            type: isImage ? "image" : "video",
            data: base64,
            name: file.name,
          },
        ]);
        console.log("Media added:", file.name);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    e.target.value = "";
  }

  function handleRemoveMedia(index: number) {
    console.log("REMOVE MEDIA:", index);
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddColumn() {
    if (colInput.trim()) {
      setTableColumns([...tableColumns, colInput]);
      setRowInputs([...rowInputs, ""]);
      setColInput("");
    }
  }

  function handleAddTableRow() {
    if (rowInputs.every((val) => val.trim())) {
      setTableRows([...tableRows, [...rowInputs]]);
      setRowInputs(tableColumns.map(() => ""));
    }
  }

  function handleAddChartRow() {
    try {
      const parsed = JSON.parse(chartRowInput);
      if (typeof parsed === "object") {
        setChartData([...chartData, parsed]);
        setChartRowInput("");
      }
    } catch {
      alert("Invalid JSON format");
    }
  }

  function handleAddSource() {
    if (sourceInput.trim()) {
      setSources([...sources, sourceInput]);
      setSourceInput("");
    }
  }

  function handleRemoveSource(index: number) {
    setSources(sources.filter((_, i) => i !== index));
  }

  async function handleSearchPaper() {
    if (!paperInput.trim()) return;
    
    setIsSearchingPaper(true);
    try {
      // Try DOI first
      let paperData = await searchOpenAlexByDOI(paperInput);
      
      // If not found, try title
      if (!paperData) {
        paperData = await searchOpenAlexByTitle(paperInput);
      }
      
      if (paperData) {
        const newPaper = extractPaperData(paperData);
        if (newPaper) {
          setLinkedPapers([...linkedPapers, newPaper]);
          setPaperInput("");
        } else {
          alert("Could not extract paper data from OpenAlex");
        }
      } else {
        alert("No paper found. Try using a DOI or exact title.");
      }
    } catch (error) {
      console.error("Error searching paper:", error);
      alert("Error searching for paper. Please check the DOI or title.");
    } finally {
      setIsSearchingPaper(false);
    }
  }

  function handleRemovePaper(index: number) {
    setLinkedPapers(linkedPapers.filter((_, i) => i !== index));
  }

  // OpenAlex API Integration
  async function searchOpenAlexByDOI(doi: string): Promise<any> {
    try {
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

  function extractPaperData(openalex_work: any): any {
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("SUBMIT CLICKED");

    if (!authorName.trim()) {
      alert("Please enter your name");
      return;
    }

    const hypothesis: any = {
      id: Date.now().toString(),
      title,
      claim,
      method,
      createdAt: new Date().toISOString(),
      forkCount: 0,
      upvotes: 0,
      downvotes: 0,
      media: media,
      comments: [],
      methodLocked: true,
      methodVersions: [
        {
          id: "v1",
          version: 1,
          content: method,
          lockedAt: new Date().toISOString(),
          lockedBy: authorName,
        },
      ],
      changeHistory: [
        {
          id: "1",
          author: authorName,
          action: "Created hypothesis (Method Locked)",
          timestamp: new Date().toISOString(),
        },
      ],
      isPrivate: false, // Default to public, user can toggle later
      owner: authorName, // Set owner to the current author
      privateInvitations: [],
      realWorldImpact: undefined, // No impact recorded at creation
      linkedPapers: linkedPapers.length > 0 ? linkedPapers : undefined, // Link papers if any added
    };

    if (tableColumns.length > 0) {
      hypothesis.dataTable = {
        columns: tableColumns,
        rows: tableRows,
      };
    }

    if (chartData.length > 0) {
      hypothesis.chartData = {
        type: chartType,
        label: chartLabel,
        dataKey: chartDataKey,
        data: chartData,
      };
    }

    // Add draft and article if provided
    if (draft.trim()) {
      hypothesis.draft = draft;
    }

    if (isPublished && conclusion.trim()) {
      hypothesis.article = {
        conclusion: conclusion,
        sources: sources,
        methods: method,
        publishedAt: new Date().toISOString(),
      };
    }

    console.log("New hypothesis:", hypothesis);

    // Save to localStorage
    const existing = loadHypotheses();
    const updated = [hypothesis, ...existing];
    saveHypotheses(updated);

    // Reset form and show success message
    setTitle("");
    setClaim("");
    setMethod("");
    setAuthorName("");
    setMedia([]);
    setTableColumns([]);
    setTableRows([]);
    setRowInputs([]);
    setChartData([]);
    setChartLabel("");
    setChartDataKey("");
    setDraft("");
    setConclusion("");
    setSources([]);
    setSourceInput("");
    setIsPublished(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <main className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20">
          <span className="text-2xl">✨</span>
          <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Create New Hypothesis</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          Propose Your Theory
        </h1>
        <p className="text-lg text-white/70">Publish your hypothesis, lock your method, and contribute to human knowledge</p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="animate-scale-in relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-emerald-500/20 border border-emerald-400/50">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/0 to-teal-600/0"></div>
          <div className="relative flex items-center gap-3">
            <span className="text-3xl">✓</span>
            <div>
              <div className="font-bold text-white">Hypothesis saved!</div>
              <a href="/explore" className="text-sm text-emerald-200 hover:text-emerald-100 underline">
                View it in Explore →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Private Sandbox Mode Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-md bg-white/10 dark:bg-gray-900/40 border border-white/20 dark:border-gray-700/40 hover:border-blue-400/40 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5"></div>
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔒</span>
            <span className="text-sm font-semibold text-white">Private Sandbox Mode</span>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="email"
              placeholder="Enter your email for private hypotheses"
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="flex-1 px-4 py-3 text-sm rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all"
            />
            {currentUser && (
              <button
                type="button"
                onClick={() => setCurrentUser("")}
                className="text-sm px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 transition-all border border-red-400/30 hover:border-red-400/50"
                title="Logout"
              >
                Logout
              </button>
            )}
          </div>
          {currentUser && (
            <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-sm text-blue-100">
              ✓ Logged in as: <strong>{currentUser}</strong>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Author Name */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/90">Your Name</label>
          <input
            name="authorName"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all"
            placeholder="Your name (for tracking contributions)"
            maxLength={50}
            required
          />
        </div>

        {/* Templates Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">📋 Experiment Templates</label>
            <p className="text-sm text-white/60">Choose a template for your research type:</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXPERIMENT_TEMPLATES.map((template, idx) => (
              <React.Fragment key={template.id}>
                {/* eslint-disable-next-line @next/next/no-inline-styles */}
                <button
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className={`animate-slide-up group relative overflow-hidden rounded-xl p-4 transition-all duration-300 text-left border-2 ${
                    idx === 0 ? '' : idx === 1 ? 'animation-delay-50' : idx === 2 ? 'animation-delay-100' : 'animation-delay-150'
                  } ${
                    selectedTemplate === template.id
                      ? "bg-blue-500/30 border-blue-400/50 shadow-lg shadow-blue-500/20"
                      : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10"
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5"></div>
                <div className="relative flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-200 transition-colors">{template.name}</div>
                    <div className="text-xs text-white/60 group-hover:text-white/70 transition-colors">{template.description}</div>
                  </div>
                </div>
              </button>
              </React.Fragment>
            ))}
          </div>
          {selectedTemplate && (
            <button
              type="button"
              onClick={clearTemplate}
              className="text-sm text-red-300 hover:text-red-200 font-medium transition-colors"
            >
              ✕ Clear Template
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/90">Title</label>
          <input
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all"
            placeholder="Short, clear title"
            required
          />
        </div>

        {/* Hypothesis Statement */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/90">Hypothesis Statement</label>
          <textarea
            name="claim"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all resize-none"
            rows={4}
            placeholder="If X, then Y, under these conditions..."
            required
          />
        </div>

        {/* Method Lock Info */}
        <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-md bg-purple-500/20 border border-purple-400/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-pink-600/0"></div>
          <div className="relative flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div className="text-sm text-purple-100">
              <strong>Method Lock:</strong> Your methodology will be timestamped and locked upon submission. Any future edits create new versions (like Git commits). This prevents retroactive result tweaking and maintains scientific integrity.
            </div>
          </div>
        </div>

        {/* Method / Conditions */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-white/90">Method / Conditions</label>
          <textarea
            name="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/20 transition-all resize-none"
            rows={4}
            placeholder="How this can be tested or repeated"
            required
          />
        </div>

        {/* Media Upload */}
        <div className="space-y-3">
          <label htmlFor="media-upload" className="block text-sm font-semibold text-white/90">
            📸 Media (Photos & Videos)
          </label>
          <div className="relative overflow-hidden rounded-lg backdrop-blur-md bg-white/5 border-2 border-dashed border-white/20 hover:border-blue-400/50 transition-all p-6">
            <input
              id="media-upload"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="w-full cursor-pointer opacity-0 absolute inset-0"
            />
            <div className="text-center pointer-events-none">
              <span className="text-3xl block mb-2">📤</span>
              <p className="text-sm text-white/70">Drag files here or click to upload images/videos</p>
            </div>
          </div>
        </div>

        {/* Attached Media Display */}
        {media.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-white/90">
              Attached Media ({media.length})
            </label>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {media.map((m, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-lg overflow-hidden bg-white/10 border border-white/20 hover:border-blue-400/50 transition-all hover:shadow-lg hover:shadow-blue-500/20"
                >
                  {m.type === "image" ? (
                    <img src={m.data} alt={m.name} className="w-full h-24 object-cover" />
                  ) : (
                    <video src={m.data} className="w-full h-24 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 rounded-full bg-red-500/80 hover:bg-red-600 text-white px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 text-xs text-white/80 truncate">
                    {m.type === "image" ? "🖼️" : "🎬"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table Section */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => setShowTableEditor(!showTableEditor)}
            className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-purple-600/50 group-hover:from-blue-600/70 group-hover:to-purple-600/70 transition-all"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span>{showTableEditor ? "✓" : "+"}</span>
              {showTableEditor ? "Hide Data Table" : "Add Data Table 📊"}
            </div>
          </button>

          {showTableEditor && (
            <div className="relative overflow-hidden rounded-xl p-6 backdrop-blur-md bg-white/5 border border-white/20">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Column Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={colInput}
                      onChange={(e) => setColInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddColumn()}
                      className="flex-1 px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm"
                      placeholder="e.g., Temperature"
                    />
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="px-4 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600/70 text-white text-sm font-medium transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {tableColumns.length > 0 && (
                  <div>
                    <div className="text-xs text-white/60 mb-3">Columns: {tableColumns.join(", ")}</div>
                    <div className="space-y-2">
                      {tableColumns.map((col, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={rowInputs[idx] || ""}
                          onChange={(e) => {
                            const newInputs = [...rowInputs];
                            newInputs[idx] = e.target.value;
                            setRowInputs(newInputs);
                          }}
                          className="w-full px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm"
                          placeholder={`Value for ${col}`}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={handleAddTableRow}
                        className="w-full px-4 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600/70 text-white text-sm font-medium transition-all"
                      >
                        Add Row
                      </button>
                    </div>
                  </div>
                )}

                {tableRows.length > 0 && (
                  <div className="text-xs text-blue-300">
                    ✓ {tableRows.length} row{tableRows.length !== 1 ? "s" : ""} added
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chart Section */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowChartEditor(!showChartEditor)}
            className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-pink-600/50 group-hover:from-purple-600/70 group-hover:to-pink-600/70 transition-all"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span>{showChartEditor ? "✓" : "+"}</span>
              {showChartEditor ? "Hide Chart" : "Add Chart 📈"}
            </div>
          </button>

          {showChartEditor && (
            <div className="relative overflow-hidden rounded-xl p-6 backdrop-blur-md bg-white/5 border border-white/20">
              <div className="space-y-4">
                <div>
                  <label htmlFor="chart-type" className="block text-sm font-semibold text-white/90 mb-2">Chart Type</label>
                  <select
                    id="chart-type"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as "bar" | "line" | "pie")}
                    className="w-full px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400/50 text-sm"
                  >
                    <option value="bar">📊 Bar Chart</option>
                    <option value="line">📈 Line Chart</option>
                    <option value="pie">🥧 Pie Chart</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Label</label>
                  <input
                    type="text"
                    value={chartLabel}
                    onChange={(e) => setChartLabel(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm"
                    placeholder="e.g., Temperature Over Time"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Data Key</label>
                  <input
                    type="text"
                    value={chartDataKey}
                    onChange={(e) => setChartDataKey(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm"
                    placeholder="e.g., value"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Add Data Point (JSON)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chartRowInput}
                      onChange={(e) => setChartRowInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddChartRow()}
                      className="flex-1 px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm font-mono"
                      placeholder='{"name": "Jan", "value": 100}'
                    />
                    <button
                      type="button"
                      onClick={handleAddChartRow}
                      className="px-4 py-2 rounded-lg bg-purple-600/50 hover:bg-purple-600/70 text-white text-sm font-medium transition-all"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="text-xs text-purple-300">
                    ✓ {chartData.length} data point{chartData.length !== 1 ? "s" : ""} added
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Article/Draft Section */}
        <div className="space-y-3 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => setShowArticleEditor(!showArticleEditor)}
            className="w-full group relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600/50 to-orange-600/50 group-hover:from-amber-600/70 group-hover:to-orange-600/70 transition-all"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span>{showArticleEditor ? "✓" : "+"}</span>
              {showArticleEditor ? "Hide Article/Draft" : "Add Article/Draft 📝"}
            </div>
          </button>

          {showArticleEditor && (
            <div className="relative overflow-hidden rounded-xl p-6 backdrop-blur-md bg-white/5 border border-white/20">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">Draft (Work in Progress)</label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm resize-none"
                    rows={4}
                    placeholder="Write your draft notes, observations, and analysis here..."
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-400/30">
                  <input
                    type="checkbox"
                    id="publish-article"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 accent-blue-400"
                  />
                  <label htmlFor="publish-article" className="text-sm text-blue-100">
                    📤 Publish as Final Article
                  </label>
                </div>

                {isPublished && (
                  <div className="relative overflow-hidden rounded-lg p-4 backdrop-blur-md bg-white/5 border border-white/20 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">Conclusion</label>
                      <textarea
                        value={conclusion}
                        onChange={(e) => setConclusion(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm resize-none"
                        rows={4}
                        placeholder="Summary of findings and conclusions..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">Sources & References</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={sourceInput}
                            onChange={(e) => setSourceInput(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleAddSource()}
                            className="flex-1 px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 text-sm"
                            placeholder="Add source (URL, citation, etc.)"
                          />
                          <button
                            type="button"
                            onClick={handleAddSource}
                            className="px-4 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600/70 text-white text-sm font-medium transition-all"
                          >
                            Add
                          </button>
                        </div>

                        {sources.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {sources.map((source, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center gap-2 p-2 rounded bg-white/5 border border-white/10 text-xs text-white/80"
                              >
                                <span className="truncate">{idx + 1}. {source}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSource(idx)}
                                  className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Linked Papers Section */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">🔗 Link Research Papers</label>
            <p className="text-xs text-white/60">Add papers from OpenAlex by DOI or title to support your hypothesis</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={paperInput}
              onChange={(e) => setPaperInput(e.target.value)}
              placeholder="Enter DOI (e.g., 10.1234/example) or paper title"
              className="flex-1 px-4 py-3 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-blue-400/50 transition-all text-sm"
              disabled={isSearchingPaper}
            />
            <button
              type="button"
              onClick={handleSearchPaper}
              disabled={!paperInput.trim() || isSearchingPaper}
              className="px-6 py-3 rounded-lg group relative overflow-hidden font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 to-cyan-600/50 group-hover:from-blue-600/70 group-hover:to-cyan-600/70 transition-all group-disabled:opacity-50"></div>
              <div className="relative">
                {isSearchingPaper ? "🔍 Searching..." : "Find Paper"}
              </div>
            </button>
          </div>

          {linkedPapers.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm text-white/80">Linked Papers ({linkedPapers.length})</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {linkedPapers.map((paper, idx) => (
                  <div
                    key={paper.id}
                    className="group relative overflow-hidden rounded-lg p-4 backdrop-blur-md bg-white/5 border border-white/20 hover:border-blue-400/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5"></div>
                    <div className="relative space-y-2">
                      <div className="flex gap-3 justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm mb-1 break-words group-hover:text-blue-200 transition-colors">
                            {paper.title}
                          </div>
                          {paper.authors.length > 0 && (
                            <div className="text-xs text-white/60 mb-1">
                              By: {paper.authors.slice(0, 2).join(", ")}{paper.authors.length > 2 ? " et al." : ""}
                            </div>
                          )}
                          <div className="flex gap-3 flex-wrap text-xs text-white/50">
                            {paper.year && <span>📅 {paper.year}</span>}
                            {paper.citationCount > 0 && <span>🔗 {paper.citationCount} citations</span>}
                            {paper.doi && <span className="font-mono text-blue-300">{paper.doi.split("/")[1]}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {paper.paperUrl && (
                            <a
                              href={paper.paperUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded bg-blue-600/50 hover:bg-blue-600/70 text-white text-xs font-medium transition-all"
                              title="Open paper"
                            >
                              Open
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePaper(idx)}
                            className="px-3 py-1 rounded bg-red-600/50 hover:bg-red-600/70 text-white text-xs font-medium transition-all"
                            title="Remove paper"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="border-t border-white/10 pt-6">
          <button
            type="submit"
            onClick={() => console.log("BUTTON CLICKED")}
            className="w-full group relative overflow-hidden rounded-lg px-6 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:from-blue-500 group-hover:via-purple-500 group-hover:to-pink-500 transition-all"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span>✓ Submit Hypothesis</span>
            </div>
          </button>
          <p className="text-xs text-white/60 text-center mt-3">
            Your method will be locked and timestamped upon submission
          </p>
        </div>
      </form>
    </main>
  );
}
