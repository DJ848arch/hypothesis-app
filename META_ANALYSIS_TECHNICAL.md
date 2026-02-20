# Meta-Analysis Tool - Implementation Summary

## ✨ What You Now Have

A **live meta-analysis engine** that automatically synthesizes knowledge from replications.

### The Auto-Trigger

When a hypothesis reaches **20+ verified replications**, the system automatically generates:

1. **Replication Summary** - Success rates and trends
2. **Effect Size Analysis** - Mean effect and confidence intervals  
3. **Variance & Consistency** - How consistent are the results across replications?
4. **Failure Conditions** - Where does the hypothesis break?
5. **Strength Classification** - Very Weak / Weak / Moderate / Strong / Very Strong

---

## Technical Architecture

### New Data Types

```typescript
type ReplicationResult = {
  id: string;
  forkId: string;              // Which fork hypothesis this came from
  researcher: string;           // Who did the replication
  outcomeConfirmed: boolean;    // Success or failure
  effectSize?: number;          // 0-1 scale (0 = no effect, 1 = very strong)
  sampleSize?: number;          // (Optional) sample size
  pValue?: number;              // (Optional) p-value
  notes?: string;               // Conditions, limitations, failure modes
  createdAt: string;
};

type MetaAnalysis = {
  totalReplications: number;
  successfulReplications: number;
  replicationRate: number;                    // 0-100%
  meanEffectSize: number;                     // Average effect across replications
  confidenceInterval: {
    lower: number;                           // Lower bound of 95% CI
    upper: number;                           // Upper bound of 95% CI
    confidence: number;                      // 95
  };
  varianceAnalysis: {
    standardDeviation: number;               // How spread out are results?
    variance: number;                        // Squared SD
    heterogeneityIndex: number;              // I² statistic (0-100%)
  };
  failureConditions: string[];               // Top failure modes
  strengthOfEvidence: "very-weak" | "weak" | "moderate" | "strong" | "very-strong";
  lastUpdated: string;
};
```

### Key Functions

**`calculateMetaAnalysis(replications: ReplicationResult[]): MetaAnalysis`**
- Computes all statistics from replication data
- Returns complete meta-analysis object

**`updateMetaAnalysisIfNeeded(hypothesis: Hypothesis): Hypothesis`**
- Checks if hypothesis has 20+ replications
- Auto-generates meta-analysis if threshold met
- Returns updated hypothesis

**`submitReplicationResult(...): MetaAnalysis | undefined`**
- Submits a single replication
- Updates parent hypothesis's replication array
- Triggers meta-analysis calculation if threshold reached
- Returns the generated meta-analysis (or undefined if <20)

---

## UI Components

### Replication Submission Form
Located on each hypothesis card (for parent hypotheses with forks):

```
📝 Report Replication Result
├─ Researcher Name (required)
├─ Outcome (radio: Confirmed / Failed)
├─ Effect Size (slider: 0-1)
├─ Notes (textarea)
└─ [Submit Replication] [Cancel]
```

Appears as a collapsible form, only visible if:
- Not yet showing meta-analysis (< 20 replications)
- This is a parent hypothesis (not a fork)
- Has at least 1 fork

### Meta-Analysis Display
When 20+ replications exist, displays automatically with:

**Visual Layout:**
```
🔬 Synthesized Meta-Analysis [23 replications]
Auto-generated knowledge synthesis from independent verifications

📊 Replication Summary          📈 Effect Size
├─ Total: 25                    ├─ Mean: 0.65
├─ Successful: 22               └─ 95% CI: [0.52, 0.78]
├─ Rate: 88%
└─ Strength: Very Strong

📊 Consistency Across Replications
├─ SD: 0.12
├─ Variance: 0.014
└─ I²: 32% (Consistent)

⚠️ Conditions Where Hypothesis Fails
├─ "Failed when humidity exceeds 80%"
├─ "Does not apply to adults over 65"
└─ ... more conditions

Last updated: 2026-02-15 10:30:00
```

**Color-Coded Strength Classification:**
- Very Strong: Green background
- Strong: Lime background
- Moderate: Yellow background
- Weak: Orange background
- Very Weak: Red background

---

## The Calculation Methods

### Replication Rate
```
Rate = (successful_count / total_count) × 100
```

### Mean Effect Size
```
mean_ES = Σ(all_effect_sizes) / count
```

### 95% Confidence Interval
```
SE = SD / √n
margin = 1.96 × SE
CI = [mean - margin, mean + margin]
Capped at [0, 1] for effect sizes
```

### Heterogeneity Index (I²)
```
Simplified: I² = (SD / mean) × 100
Capped at 0-100%

Interpretation:
- I² < 25% = Low (consistent results)
- I² 25-75% = Moderate (some variation)
- I² > 75% = High (inconsistent results)
```

### Strength of Evidence
```
if replication_rate >= 85% AND mean_ES >= 0.6:
  strength = "very-strong"
else if replication_rate >= 75% AND mean_ES >= 0.5:
  strength = "strong"
else if replication_rate >= 60% AND mean_ES >= 0.3:
  strength = "moderate"
else if replication_rate >= 40%:
  strength = "weak"
else:
  strength = "very-weak"
```

### Failure Conditions Synthesis
- Extract from replication entries where `outcomeConfirmed = false`
- Collect all `notes` fields
- Deduplicate
- Take top 5 most common
- Display with warning styling

---

## Data Flow

### Submitting a Replication

```
User fills form
    ↓
[Submit Replication] button clicked
    ↓
submitReplicationResult(parentId, forkId, researcher, outcome, effectSize, notes)
    ↓
Create ReplicationResult object
    ↓
Add to parent hypothesis.replications array
    ↓
Save to localStorage
    ↓
Check: replications.length >= 20?
    ├─ YES: calculateMetaAnalysis() → store in hypothesis.metaAnalysis
    └─ NO: do nothing
    ↓
Save updated hypotheses
    ↓
Update UI state with new items
    ↓
Form clears, meta-analysis appears (if triggered)
```

### Reading a Meta-Analysis

```
User views hypothesis card
    ↓
Check: hypothesis.metaAnalysis exists?
    ├─ YES: Render meta-analysis display
    └─ NO: Render "Report Replication Result" button
    ↓
Display:
├─ Replication summary (counts, rates)
├─ Effect size with CI
├─ Consistency metrics
├─ Failure conditions
└─ Last updated timestamp
```

---

## Storage Consideration

Entire meta-analysis is calculated on-the-fly from replications. No separate storage needed:
- Hypothesis → replications array (persistent)
- metaAnalysis → calculated when needed (computed)
- No risk of sync issues

All stored in localStorage under `hypotheses_v1` key, compatible with existing persistence.

---

## Example: From Creation to Meta-Analysis

### Day 1: Hypothesis Posted
```
Title: "Blue light reduces anxiety"
Forks: 0
Status: Active discussion
```

### Days 2-30: Research Community Tests It
```
Researcher 1 forks: "Replicating blue light study"
Researcher 2 forks: "Blue light + placebo controls"
Researcher 3 forks: "Testing in different demographics"
... continues ...
Forks reach: 25
```

### Day 31: 20+ Replications Submitted
```
Replication 1: Confirmed, effect 0.7, "Works with 60min/day exposure"
Replication 2: Confirmed, effect 0.65, "Effect fades after week 3 if discontinued"
...
Replication 20: Failed, effect 0.0, "No effect in blind studies"
Replication 21: Confirmed, effect 0.72, "Strong effect, < 480nm wavelength preferred"
Replication 22: Confirmed, effect 0.68, "Effect stronger in winter, minimal in summer"
Replication 23: Failed, effect 0.05, "Placebo effect in unblinded groups"
```

### Automatically Generated Meta-Analysis Appears
```
🔬 Synthesized Meta-Analysis
23 replications

📊 Summary: 88% success rate, 0.65 mean effect, Very Strong evidence
📈 Effect: 0.65 [0.52, 0.78] — Meaningful medium-large effect
📊 Consistency: I² = 32% — Consistent across studies
⚠️ Fails when:
  ├─ Blinded protocol (placebo component)
  ├─ < 480nm wavelength
  └─ In summer vs winter variability

Result: "Hypothesis confirmed with boundary conditions. Ready for clinical application."
```

---

## Advantages Over Traditional Science

| Aspect | Traditional | This System |
|--------|-----------|-----------|
| **Replication tracking** | Scattered across journals | Centralized, auto-synthesized |
| **Failed replications** | Unpublished/hidden | Visible and analyzed |
| **Boundary conditions** | Rarely explicitly studied | Auto-extracted from failures |
| **Timeline** | 5-10 years to meta-analysis | Real-time as replications come in |
| **Accessibility** | Expert review needed | Statistical summary transparent |
| **Discovery** | Hypothesis-focused | Hypothesis + conditions-focused |
| **Next research** | Uncertain about applicability | Clear map of where it works |

---

## Future Extensions

### Phase 2: Weighted Meta-Analysis
- Weight replications by researcher accuracy (using predictor profiles)
- High-accuracy researchers' results weighted more heavily
- Quickly identifies and downweights problematic submissions

### Phase 3: Temporal Meta-Analysis
- Effect size trends over time
- Does hypothesis improve through refinement?
- Publication date analysis

### Phase 4: Subgroup Analysis
- Effect size by population (age, gender, demographics)
- Effect size by methodology (RCT vs observational)
- Effect size by geography

### Phase 5: ML-Powered Insights
- Auto-identify critical moderators from notes
- Predict failure conditions from hypothesis text
- Suggest optimal follow-up experiments

---

## The Big Picture

**Before this feature:**
- Hypothesis platform = idea repository
- Value = organization + voting + search

**After this feature:**
- Hypothesis platform = **knowledge synthesis engine**
- Value = organization + voting + search + **automatic meta-analysis**

**Impact:**
- Researchers know which hypotheses to build on (strong evidence)
- Researchers know which to avoid (very weak evidence)
- Researchers know where to improve (boundary conditions)
- Science progresses faster with less wasted effort

**The transformation:** From "What ideas exist?" to "What do we actually know?"

---

## Summary

✅ **Type system extended** with ReplicationResult and MetaAnalysis  
✅ **Auto-trigger at 20+ replications** calculates synthesis automatically  
✅ **Effect size + CI** shows magnitude and uncertainty  
✅ **Variance analysis** reveals consistency across studies  
✅ **Failure conditions synthesis** identifies boundary cases  
✅ **Strength classification** enables decision-making  
✅ **UI components** for submission and display  
✅ **Storage compatible** with existing localStorage system  

**Ready for researchers to start submitting replications and generating synthesized knowledge.**
