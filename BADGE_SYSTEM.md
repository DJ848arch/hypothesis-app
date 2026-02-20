# "Controversial but Replicable" Badge System

## Philosophy
This feature prevents groupthink by surfacing high-quality contested ideas alongside popular consensus. It implements a three-category badge system that separates ideas by evidence quality and community engagement.

## Badge Categories

### 🔥 Popular
**What it means:** Widely accepted and well-received ideas  
**Criteria:**
- 5+ net upvotes (upvotes - downvotes ≥ 5), OR
- 3+ upvotes with 70%+ positive sentiment (upvote ratio)

**Why:** Consensus ideas that the community believes in

### ✓ Reproducible  
**What it means:** Ideas being actively tested by independent researchers  
**Criteria:**
- 3+ forks (independent verification attempts)

**Why:** High-quality ideas that others find worth investigating. "Reproducible" doesn't mean "proven true" — it means the hypothesis is rigorous enough that others are motivated to test it.

### ⚡ Controversial but Replicable
**What it means:** Contested ideas WITH rigorous investigation  
**Criteria:**
- 2+ downvotes (evidence of disagreement), AND
- 3+ forks (evidence of serious testing)

**Why:** This is the KEY feature. It prevents the platform from becoming a groupthink echo chamber by:
1. **Surfacing dissent:** Shows ideas that the community actively disagrees with
2. **Requiring rigor:** Only flagged if people are actually testing them (3+ forks)
3. **Supporting scientific philosophy:** "Both sides of arguments" — shows that good science involves healthy debate

**Real-world example:**
- A hypothesis might be controversial (only 1 upvote, 4 downvotes)
- But if 5 independent researchers fork it to verify/disprove, it gets the badge
- This signals: "This is hotly debated, but worth taking seriously"

## Implementation Details

### Type Definition
```typescript
type HypothesisBadge = "popular" | "reproducible" | "controversial";
```

### Badge Calculation
The `calculateBadges(hypothesis)` function evaluates upvotes, downvotes, and fork count to assign 0-3 badges per hypothesis.

### Filter UI
Users can filter the explore page by badge category:
- **All Ideas** - Show all hypotheses
- **🔥 Popular** - Only consensus ideas
- **✓ Reproducible** - Only ideas being tested
- **⚡ Controversial but Replicable** - Only contested & tested ideas

### Badge Display
Badges appear on hypothesis cards with color-coded styling:
- 🔥 Popular: Orange badge
- ✓ Reproducible: Green badge
- ⚡ Controversial: Purple badge

## Storage & Persistence
Badges are calculated on-the-fly from hypothesis properties (upvotes, downvotes, forkCount) and stored in localStorage. No additional storage required.

## How to Use

### As a Reader
1. Go to `/explore`
2. Click a badge filter button to view different categories
3. Read the descriptions to understand what each badge means
4. Use to find:
   - Popular consensus (🔥)
   - Rigorous science (✓)
   - Healthy debate (⚡)

### As a Contributor
1. Upvote ideas you agree with → helps them become 🔥 Popular
2. Downvote ideas you disagree with → contributes to ⚡ Controversial
3. Fork ideas to verify/test → contributes to ✓ Reproducible and ⚡ Controversial
4. Publish replications → strengthens hypothesis credibility

## Why This Design?

This system aligns with the core philosophy of scientific integrity:
- **Promotes diversity of thought:** Controversial ideas don't get buried
- **Rewards rigor:** Only replicated ideas survive long-term
- **Prevents groupthink:** Easy to see which ideas have disagreement
- **Facilitates healthy debate:** "Both sides of arguments" are visible
- **Transparent criteria:** Users understand why ideas are badged

The "Controversial but Replicable" badge is especially important because it distinguishes between:
- Crackpot ideas (controversial, but nobody bothers testing) ❌
- Legitimate scientific debate (controversial, AND people are testing) ✅
