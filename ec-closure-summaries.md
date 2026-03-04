# EC Closure Summaries — Session 2026-03-04

---

## EC-030: Wrong-Answer Flash Too Harsh

**Status:** CLOSED — Fixed
**Commit:** `4ce6304`
**Files Changed:** `web/src/pages/Quiz.tsx`

**Problem:** Incorrect answer selection triggered an abrupt red flash that was jarring and anxiety-inducing, undermining the calm learning environment.

**Solution:**
- Replaced instant red flash with a gentle 500ms CSS transition (`transition-colors duration-500 ease-in-out`)
- Subdued incorrect styling: `border-red-500/60 bg-red-500/5` with muted text `text-red-300/80`
- Added check/cross result icons inside the radio dot for clear visual feedback
- Added `motion-reduce:transition-none` to respect `prefers-reduced-motion` accessibility preference

**Impact:** Incorrect answers now feel instructive rather than punitive, aligning with spaced-repetition best practices for low-anxiety feedback loops.

---

## EC-028 / EC-009: Mobile Navigation Missing

**Status:** CLOSED — Fixed
**Commit:** `4ce6304`
**Files Changed:** `web/src/components/MobileNav.tsx` (new), `web/src/App.tsx`, `web/index.html`

**Problem:** Mobile users had no persistent navigation. The sidebar was desktop-only, leaving mobile users stranded after landing on a page.

**Solution:**
- Created `MobileNav` bottom tab bar with 5 icons: Dashboard, Quiz, Stats, Plans, Settings
- Active tab highlighted with brand color and scale animation
- Hidden on desktop (`md:hidden`), shown only on mobile
- Added `viewport-fit=cover` meta tag for iPhone notch/safe-area support
- Added `pb-20` bottom padding on main content to prevent nav overlap

**Impact:** Mobile users now have full app navigation matching native app UX patterns. Critical for the 60%+ mobile user base.

---

## EC-130: Friction Event Logging

**Status:** CLOSED — Fixed
**Commit:** `4ce6304`
**Files Changed:** `web/src/services/FrictionEventService.ts` (new), `firestore.rules`

**Problem:** No visibility into user friction points — slow loads, quiz abandonment, paywall hits, and validation errors were invisible to the team.

**Solution:**
- Created `FrictionEventService` with fire-and-forget Firestore writes
- Event types: `slow_load`, `quiz_abandon`, `paywall_hit`, `validation_error`, `error_boundary`
- Session-level dedup prevents noise (same event type only logged once per session)
- Metadata includes `page`, `duration`, `detail`, and `sessionId`
- Firestore rules added for `friction_events` collection (user-scoped write, no read)

**Impact:** Product team can now query friction hotspots and prioritize UX fixes with real data instead of guesswork.

---

## EC-111: Conversion Intent Tracking

**Status:** CLOSED — Fixed
**Commit:** `4ce6304`
**Files Changed:** `web/src/services/ConversionIntentService.ts` (new), `web/src/components/SubscriptionUpsellModal.tsx`, `web/src/pages/Pricing.tsx`, `firestore.rules`

**Problem:** No tracking of conversion-intent signals — couldn't tell which users were close to converting or what triggered purchase consideration.

**Solution:**
- Created `ConversionIntentService` tracking three signal types:
  - `pricing_view` — user visited Pricing page
  - `upsell_interaction` — user opened upsell modal (with trigger source)
  - `daily_limit_hit` — user hit the free-tier question cap
- Session-level dedup per signal type
- Wired into `SubscriptionUpsellModal` (on open) and `Pricing` page (on mount)
- Firestore rules added for `conversion_intent` collection

**Impact:** Enables conversion funnel analysis and targeted re-engagement for high-intent free users.

---

## EC-109: Usage Heatmap on Stats Page

**Status:** CLOSED — Fixed
**Commit:** `29ee25f`
**Files Changed:** `web/src/components/analytics/UsageHeatmap.tsx` (new), `web/src/pages/Stats.tsx`

**Problem:** Users had no visual representation of their study consistency over time. Daily streaks were invisible.

**Solution:**
- Built `UsageHeatmap` component showing a 365-day GitHub-style contribution grid
- Color intensity scales from slate (0 questions) through emerald shades (1–2, 3–5, 6–9, 10+)
- Tooltip on hover shows exact date and question count
- Day-of-week labels and month labels for orientation
- Data sourced from existing `questionMetrics` via `getQuestionHistory()`
- Placed at top of Stats page for immediate visibility

**Impact:** Creates a visual accountability loop — users can see gaps in their study pattern and are motivated to maintain streaks, driving daily engagement.

---

## EC-119: Drag-and-Drop Matching Questions

**Status:** CLOSED — Fixed
**Commit:** `d64cde2`
**Files Changed:** `web/src/components/MatchingQuestion.tsx` (new), `web/src/pages/Quiz.tsx`

**Problem:** All questions were multiple-choice. Real PMP exams include matching/drag-and-drop formats. Users weren't being prepared for these question types.

**Solution:**
- Created `MatchingQuestion` component with dual interaction modes:
  - **Desktop:** HTML5 native drag-and-drop to reorder definitions
  - **Mobile:** Tap-to-swap — tap one item, tap another to exchange positions
- Left column shows numbered terms (fixed), right column shows shuffled definitions (moveable)
- Visual feedback: drag-over highlight, tap selection highlight, grip handles
- After submit: green check for correct matches, red X for wrong, plus "Correct matches" summary
- `Question` interface extended with `type: 'matching'` and `matchPairs: {term, definition}[]`
- `shuffleMatchPairs()` utility: Fisher-Yates shuffle with correct-order mapping
- Scoring: all-or-nothing (all pairs must be correct)
- Automatic first-exposure subtype injection via existing generic system
- Submit button changes to "Check Matches" for matching questions

**Firestore schema for matching questions:**
```json
{
  "type": "matching",
  "stem": "Match each process group to its description:",
  "matchPairs": [
    { "term": "Initiating", "definition": "Defining a new project or phase" },
    { "term": "Planning", "definition": "Establishing scope and objectives" }
  ],
  "options": [],
  "correctAnswer": 0,
  "explanation": "..."
}
```

**Impact:** Users now encounter realistic PMP exam formats during practice, improving exam readiness and reducing surprise on test day.

---

*Generated: 2026-03-04 | Branch: `claude/fix-ec-issues-GNteq`*
