# Meta-Analysis Implementation Architecture

## System Overview

```
Hypothesis Platform
│
├─ CRUD Operations (Create, Read, Update, Delete)
│
├─ Voting System (upvotes, downvotes)
│  └─ Feeds into Badge calculation
│
├─ Fork System (verification/build/disprove)
│  ├─ Creates independent replica hypotheses
│  └─ Enables testing at scale
│
├─ Badge System (Popular, Reproducible, Controversial)
│  └─ Depends on: upvotes, downvotes, forkCount
│
├─ Prediction Mode (with Leaderboard)
│  └─ Tracks forecaster accuracy
│
└─ META-ANALYSIS TOOL ✨ NEW ✨
   ├─ Accepts: Replication submissions
   ├─ Processes: Statistical synthesis
   └─ Outputs: Knowledge summary at 20+ replications
```

## Data Type Hierarchy

```
Hypothesis
├─ Basic: id, title, claim, method, createdAt
├─ Engagement: upvotes, downvotes, forkCount, comments
├─ Testing: media, dataTable, chartData
├─ Collaboration: parentId, forkReason, collaborators
├─ Publishing: draft, article, methodLocked, methodVersions
├─ Predictions: predictions[], actualResult
│
└─ NEW: Meta-Analysis Data
   ├─ replications: ReplicationResult[]
   │  └─ [id, forkId, researcher, outcomeConfirmed, effectSize, notes, createdAt]
   │
   └─ metaAnalysis: MetaAnalysis (calculated when replications.length >= 20)
      ├─ totalReplications, successfulReplications, replicationRate
      ├─ meanEffectSize
      ├─ confidenceInterval {lower, upper, confidence}
      ├─ varianceAnalysis {standardDeviation, variance, heterogeneityIndex}
      ├─ failureConditions[]
      ├─ strengthOfEvidence
      └─ lastUpdated
```

## Type Definitions

### ReplicationResult
```typescript
type ReplicationResult = {
  id: string;                    // Unique ID for this replication
  forkId: string;                // Reference to fork hypothesis
  researcher: string;            // Name of replicating researcher
  outcomeConfirmed: boolean;     // true = confirmed, false = failed
  effectSize?: number;           // 0-1 scale (normalized)
  sampleSize?: number;           // Optional: sample size
  pValue?: number;               // Optional: statistical p-value
  notes?: string;                // Boundary conditions, limitations
  createdAt: string;             // ISO timestamp
};
```

### MetaAnalysis
```typescript
type MetaAnalysis = {
  // Counts and rates
  totalReplications: number;
  successfulReplications: number;
  replicationRate: number;       // 0-100%

  // Effect size
  meanEffectSize: number;        // 0-1 scale

  // Confidence interval
  confidenceInterval: {
    lower: number;               // Lower bound
    upper: number;               // Upper bound
    confidence: number;          // 95 (for 95% CI)
  };

  // Variance analysis
  varianceAnalysis: {
    standardDeviation: number;   // SD of effect sizes
    variance: number;            // SD²
    heterogeneityIndex: number;  // I² (0-100%)
  };

  // Failure modes
  failureConditions: string[];   // Top 5 failure modes

  // Overall assessment
  strengthOfEvidence: 
    | "very-weak"
    | "weak"
    | "moderate"
    | "strong"
    | "very-strong";

  // Metadata
  lastUpdated: string;           // ISO timestamp
};
```

## Function Architecture

### Core Calculation Functions

```
calculateMetaAnalysis(replications)
├─ Input: ReplicationResult[]
├─ Processing:
│  ├─ Count successes/failures
│  ├─ Calculate replication rate
│  ├─ Extract effect sizes
│  ├─ Calculate mean, SD, variance
│  ├─ Compute 95% confidence interval
│  ├─ Calculate heterogeneity index (I²)
│  ├─ Extract failure conditions
│  └─ Classify strength of evidence
└─ Output: MetaAnalysis
```

### Update/Trigger Function

```
updateMetaAnalysisIfNeeded(hypothesis)
├─ Check: hypothesis.replications.length >= 20?
├─ If YES:
│  ├─ Call calculateMetaAnalysis(hypothesis.replications)
│  ├─ Set hypothesis.metaAnalysis = result
│  └─ Return updated hypothesis
└─ If NO:
   └─ Return hypothesis unchanged
```

### Submission Function

```
submitReplicationResult(parentId, forkId, researcher, outcomeConfirmed, effectSize, notes)
├─ Create ReplicationResult object
├─ Add to hypothesis.replications array
├─ Call updateMetaAnalysisIfNeeded()
├─ Save to localStorage
├─ Update UI state
└─ Return updated metaAnalysis (or undefined if <20)
```

## Statistical Calculations

### 1. Replication Rate
```
Rate = (successful_count / total_count) × 100
```

### 2. Mean Effect Size
```
mean_ES = Σ(all_effect_sizes) / N
```

### 3. Standard Deviation
```
SD = √[Σ(ES - mean_ES)² / N]
```

### 4. Confidence Interval (95%)
```
SE = SD / √N                    // Standard Error
margin = 1.96 × SE              // 95% margin (z-score)
CI_lower = mean_ES - margin     // Capped at 0
CI_upper = mean_ES + margin     // Capped at 1
```

### 5. Heterogeneity Index (I²)
```
I² = (SD / mean_ES) × 100       // Simplified version
Capped at [0, 100]
Interpretation:
├─ 0-25%:   Low heterogeneity (consistent)
├─ 25-75%:  Moderate heterogeneity
└─ 75-100%: High heterogeneity (inconsistent)
```

### 6. Strength of Evidence
```
if (rate >= 85% AND mean_ES >= 0.6):
  strength = "very-strong"
else if (rate >= 75% AND mean_ES >= 0.5):
  strength = "strong"
else if (rate >= 60% AND mean_ES >= 0.3):
  strength = "moderate"
else if (rate >= 40%):
  strength = "weak"
else:
  strength = "very-weak"
```

### 7. Failure Condition Extraction
```
For each replication where outcomeConfirmed = false:
  ├─ Extract notes field
  ├─ Deduplicate
  └─ Take top 5 by frequency
Output: failureConditions[]
```

## UI Component Architecture

### Replication Submission Form
**Location:** On parent hypothesis cards (when <20 replications)  
**Visibility:** Conditional based on:
- `!replicationHypoId || replicationHypoId !== h.id`
- `h.forkCount > 0` (must have forks)
- `h.parentId === undefined` (must be parent, not fork)

**Fields:**
```
├─ Researcher Name (text input, required)
├─ Outcome (radio: Confirmed/Failed)
├─ Effect Size (range 0-1, default 0.5)
├─ Notes (textarea, optional)
├─ [Submit] [Cancel] buttons
└─ Auto-clear on successful submission
```

**Styling:**
- White background with dashed border
- Accessible form labels
- Real-time effect size slider feedback
- Aria-labels for accessibility

### Meta-Analysis Display
**Location:** On hypothesis cards (when >=20 replications)  
**Visibility:** Conditional on `hypothesis.metaAnalysis !== undefined`

**Layout:**
```
Header (with replication count badge)
├─ Section 1: Replication Summary (2x2 grid)
│  ├─ Total Replications
│  ├─ Successful Count
│  ├─ Replication Rate
│  └─ Strength Classification (color-coded)
│
├─ Section 2: Effect Size (2x2 grid)
│  ├─ Mean Effect Size (large display)
│  └─ 95% Confidence Interval (boxed)
│
├─ Section 3: Consistency (3-column grid)
│  ├─ Standard Deviation
│  ├─ Variance
│  └─ Heterogeneity Index (I²) with interpretation
│
├─ Section 4: Failure Conditions (conditional)
│  └─ Red-boxed warning with bullet list
│
└─ Footer: Last updated timestamp
```

**Color Scheme:**
- Very Strong: Green (bg-green-100)
- Strong: Lime (bg-lime-100)
- Moderate: Yellow (bg-yellow-100)
- Weak: Orange (bg-orange-100)
- Very Weak: Red (bg-red-100)

## State Management

### UI State Variables (New)
```typescript
// Replication submission form state
const [replicationHypoId, setReplicationHypoId] = useState<string | null>(null);
const [replicationResearcher, setReplicationResearcher] = useState("");
const [replicationOutcomeConfirmed, setReplicationOutcomeConfirmed] = useState(true);
const [replicationEffectSize, setReplicationEffectSize] = useState(0.5);
const [replicationNotes, setReplicationNotes] = useState("");
```

### Data Persistence
```
localStorage["hypotheses_v1"]
└─ Hypothesis[]
   ├─ ... existing fields ...
   ├─ replications?: ReplicationResult[]
   └─ metaAnalysis?: MetaAnalysis
```

## Workflow Diagrams

### Submitting a Replication

```
User clicks "📝 Report Replication Result"
    ↓
Form appears on page
    ↓
User fills out:
├─ Researcher name
├─ Outcome (radio)
├─ Effect size (slider)
└─ Notes (textarea)
    ↓
User clicks [Submit Replication]
    ↓
submitReplicationResult() called with form data
    ├─ Create ReplicationResult object
    ├─ Add to hypothesis.replications
    ├─ updateMetaAnalysisIfNeeded()
    │  └─ If replications >= 20: calculateMetaAnalysis()
    ├─ Save to localStorage
    ├─ setItems(updated) → re-render
    └─ Clear form state
    ↓
If >= 20 replications:
    └─ Meta-analysis appears on card
Else:
    └─ Form clears, ready for next submission
```

### Reading a Meta-Analysis

```
User opens hypothesis
    ↓
Page renders hypothesis card
    ↓
Check: hypothesis.metaAnalysis exists?
    ├─ YES:
    │  └─ Render MetaAnalysisDisplay component
    │     ├─ Show replication summary
    │     ├─ Show effect size + CI
    │     ├─ Show variance analysis
    │     ├─ Show failure conditions
    │     └─ Show last updated time
    │
    └─ NO (< 20 replications):
       └─ Render ReplicationSubmissionForm
          └─ Collect data for next replication
```

## Performance Considerations

### Calculation Timing
- **Trigger:** Only when `replications.length >= 20`
- **Frequency:** Once per submission when threshold crossed
- **Cost:** O(n) where n = number of replications (typically 20-100)
- **Optimization:** Calculations done synchronously (fast, < 1ms)

### Rendering
- **Conditional rendering:** Only displays when metaAnalysis exists
- **No re-renders:** Memoized through useMemo on sorted hypotheses
- **DOM size:** Minimal impact (one section per hypothesis card)

### Storage
- **Size:** metaAnalysis object ~1-2KB per hypothesis
- **Compatibility:** Fits within localStorage limits
- **Scaling:** No external API needed (all client-side)

## Integration Points

### With Badge System
- Badges depend on: upvotes, downvotes, forkCount
- Meta-analysis depends on: replications
- No conflict (independent systems)

### With Prediction Mode
- Predictions are on same hypothesis
- Meta-analysis is independent feature
- Both can coexist on same card

### With Voting System
- Upvotes/downvotes don't affect meta-analysis
- Meta-analysis purely driven by replications
- Separate but parallel reputation system

### With Fork System
- Forks reference parent via parentId
- Replications reference fork via forkId
- Creates clear parent→fork→replication chain

## Future Enhancements

### Level 1: Weighted Meta-Analysis
- Weight replications by researcher accuracy score
- Use PredictorProfile to weight submissions
- High-accuracy researchers' data valued more

### Level 2: Temporal Analysis
- Track effect size over time
- Show if hypothesis improves through refinement
- Temporal trends in success rate

### Level 3: Subgroup Analysis
- Effect size by population demographic
- Effect size by methodology
- Geographic variation in outcomes

### Level 4: Interactive Visualization
- Scatter plot of individual effect sizes
- Distribution histogram
- Forest plot of CI ranges
- Funnel plot (effect vs precision)

### Level 5: ML-Powered Insights
- Auto-identify critical moderators
- Predict failure conditions from text
- Suggest follow-up experiments

## Summary

The meta-analysis tool is:
- **Self-contained:** Separate from other systems
- **Auto-triggered:** At 20+ replications threshold
- **Computationally efficient:** O(n) calculations, <1ms
- **Storage-friendly:** ~1-2KB per hypothesis
- **User-friendly:** Clear summaries, visual hierarchy
- **Extensible:** Foundation for future enhancements

**Impact:** Transforms platform from idea repository to knowledge synthesis engine.
