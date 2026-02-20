# Meta-Analysis Tool: Synthesizing Knowledge from Replications

## The Vision

**From Ideas to Synthesized Knowledge**

Instead of just hosting individual hypotheses, the platform now automatically generates scientific knowledge synthesis when an idea reaches 20+ verified replications. This transforms the platform from a repository into a **living meta-analysis engine**.

---

## How It Works

### The Replication Pipeline

1. **Original Hypothesis Posted** → Receives upvotes/downvotes/forks
2. **Researchers Fork to Verify** → Create independent replications
3. **Replication Results Submitted** → Outcome (confirmed/failed), effect size, conditions
4. **Meta-Analysis Auto-Triggers** → At 20+ replications, synthesized analysis appears
5. **Knowledge Published** → Summary statistics, confidence intervals, failure conditions

### Data Collection Per Replication

Each replication submission includes:
- **Researcher Name** - Who conducted the replication?
- **Outcome** - Did they confirm or fail to replicate?
- **Effect Size** (0-1 scale) - Strength of the effect found
- **Notes** - Special conditions, limitations, failure modes

---

## Generated Meta-Analysis Components

### 1. **Replication Summary**
```
Total Replications: 25
Successful: 22
Replication Rate: 88%
Strength of Evidence: Very Strong
```

**What it means:** Out of 25 independent research groups, 22 successfully replicated the finding. The 88% success rate exceeds the typical 80%+ threshold for robust science.

### 2. **Effect Size & Confidence Interval**
```
Mean Effect Size: 0.65 (Medium)
95% Confidence Interval: [0.52, 0.78]
```

**What it means:** 
- The average effect size is 0.65 (on 0-1 scale: negligible < 0.2 < small < 0.5 < medium < 0.8 < large)
- We're 95% confident the true effect is between 0.52 and 0.78
- Narrower intervals = more reliable estimates

### 3. **Consistency Analysis (Heterogeneity)**
```
Standard Deviation: 0.12
Variance: 0.014
Heterogeneity Index (I²): 32%
Status: Consistent results
```

**What it means:**
- I² measures how much results vary across replications
- I² < 25% = highly consistent (same effect everywhere)
- I² 25-75% = moderate heterogeneity (some variation)
- I² > 75% = high heterogeneity (results vary widely)
- **Important for science:** Moderate variation is normal; high variation suggests boundary conditions

### 4. **Failure Conditions**
```
⚠️ Conditions Where Hypothesis Fails:
• "Failed when humidity exceeds 80%"
• "Does not apply to adults over 65"
• "Requires pH between 6-8"
• "Fails with frozen samples"
```

**What it means:**
- Synthesized from failed replications' notes
- Shows the boundaries of the hypothesis
- More valuable than a single success/failure
- Enables predictive science: "When should we expect this to work?"

---

## Strength of Evidence Classifications

| Classification | Criteria | Scientific Status |
|---|---|---|
| **Very Strong** | 85%+ replication rate AND 0.6+ mean effect size | Ready for application; robust finding |
| **Strong** | 75%+ replication rate AND 0.5+ mean effect size | Supported by evidence; minor conditions |
| **Moderate** | 60%+ replication rate AND 0.3+ mean effect size | Promising but needs refinement |
| **Weak** | 40-60% replication rate | Contested; more research needed |
| **Very Weak** | <40% replication rate | Not supported; reconsider |

---

## Why This Matters

### The Problem It Solves

1. **Publication Bias Problem**
   - Traditional science: positive results published, failures hidden
   - This system: captures ALL replications (success AND failure)

2. **Replication Crisis Problem**
   - Many published findings fail to replicate
   - This shows **exactly** which ideas hold up and under what conditions

3. **Knowledge Fragmentation Problem**
   - Normally, replication results scattered across journals
   - This **synthesizes** them into actionable knowledge

4. **Boundary Conditions Hidden**
   - Papers rarely highlight what would break their findings
   - This surface failure modes automatically

### Example: Real-World Impact

**Hypothesis:** "Blue light reduces anxiety in humans"

**Old System:**
- Paper A: Blue light works ✓
- Paper B: Blue light doesn't work ✗
- Readers: Confused. Don't know what to believe.

**New System:**
- 23 replications collected
- Meta-analysis shows:
  - **88% replication rate** → Strong finding
  - **Effect size 0.65** → Medium-sized effect
  - **Heterogeneity low** → Consistent everywhere
  - **BUT:** Fails in blind studies (placebo effect!)
  - **AND:** Fails in shorter wavelengths (>480nm)

**Result:** Researchers immediately know the boundary conditions and can optimize.

---

## Technical Implementation

### Calculation Methods

**Replication Rate**
```
success_rate = (successful_replications / total_replications) × 100
```

**Mean Effect Size**
```
mean_ES = Σ(effect_sizes) / count
```

**95% Confidence Interval**
```
SE = SD / √n
margin = 1.96 × SE
CI = [mean - margin, mean + margin]
```

**Heterogeneity Index (I²)**
```
Simplified measure of variation:
I² = (SD / mean) × 100 (capped at 100%)

Interpretation:
- 0-25% = low heterogeneity (consistent)
- 25-75% = moderate heterogeneity
- 75-100% = high heterogeneity (inconsistent)
```

**Strength of Evidence**
- Combines replication rate + effect size
- 85%+ rate & 0.6+ effect = "Very Strong"
- <40% rate = "Very Weak"

### Storage & Persistence

Replications stored in localStorage alongside hypothesis:
```typescript
hypothesis.replications = [
  {
    id: "12345",
    forkId: "fork-id",
    researcher: "Dr. Smith",
    outcomeConfirmed: true,
    effectSize: 0.65,
    notes: "Confirmed in population of 500",
    createdAt: "2026-02-15T10:30:00Z"
  },
  // ... more replications
]

// Auto-generates when 20+ replications exist
hypothesis.metaAnalysis = { /* calculated */ }
```

---

## How to Use as a Researcher

### Submitting a Replication Result

1. On the hypothesis you replicated, click **"📝 Report Replication Result"**
2. Enter your information:
   - **Researcher Name:** Your name or team
   - **Outcome:** Did you confirm or fail to replicate?
   - **Effect Size:** Use the 0-1 slider (0.5 = medium)
   - **Notes:** Any special conditions or failure modes you found
3. Click **"Submit Replication"**

### Interpreting Results

When meta-analysis appears:
- **High replication rate + high effect size** = Very robust finding
- **High replication rate + low effect size** = Real but weak effect
- **Low replication rate** = Either:
  - Finding is weak/false, OR
  - Boundary conditions not yet discovered
- **High heterogeneity** = Look at failure conditions to find boundaries

---

## Data Quality Features

### Why Effect Sizes Matter
- Some studies might show 85%+ success but tiny effect sizes
- This matters: a 0.1 effect is less practically useful than 0.8
- Meta-analysis shows BOTH rates AND magnitude

### Why Failure Conditions Matter
- Traditional replication asks: "Does it work?"
- This system asks: "When does it work?"
- Failure conditions are data, not problems

### Quality Assurance
- Multiple independent researchers submitting
- Both successes and failures captured
- Variance naturally emerges from honest reporting
- Impossible to game the system with single submissions

---

## The Philosophy

This feature embodies the scientific ideals stated upfront:

✅ **"We want both sides of arguments"**
- Not just: does hypothesis work?
- But: when does it work AND when doesn't it?

✅ **"Prevent groupthink"**
- Failed replications elevated alongside successes
- Boundary conditions highlighted

✅ **"Generate synthesized knowledge"**
- Raw replications → Statistical summary
- Individual findings → Meta-analysis
- Ideas → Testable knowledge

---

## Future Enhancements

Potential additions as platform scales:

1. **Weighted Meta-Analysis**
   - Higher weight to replications from high-accuracy forecasters
   - Lower weight to unreliable replicators

2. **Temporal Analysis**
   - How does effect size change over time?
   - Does refinement improve the hypothesis?

3. **Subgroup Analysis**
   - Effect size by population type
   - Effect size by methodology
   - Effect size by geographic region

4. **Publication Integration**
   - Auto-link to PubMed/arXiv replications
   - Citation tracking
   - Cross-platform synthesis

5. **ML-Powered Insight**
   - Auto-identify critical failure conditions
   - Predict which hypotheses will fail based on patterns
   - Suggest follow-up experiments

---

## Summary

The Meta-Analysis Tool transforms hypothesis platforms from **idea repositories** into **knowledge synthesis engines**. 

At scale, this becomes invaluable:
- Pre-publication vetting (don't waste time replicating failed ideas)
- Faster scientific progress (learn from failures immediately)
- Better decision-making (know when findings apply)
- Transparent science (all replications visible)

**The goal:** Make it easy for the next researcher to build on accurate, well-tested foundations — and avoid false starts based on findings that don't replicate.
