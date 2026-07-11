# PRD: EduQuiz — Class 1–12 Multi-Subject Quiz Platform

**Type:** Static frontend (HTML/CSS/JS) + InsForge (backend-as-a-service) for result storage
**Target device priority:** Mobile-first (360px–430px primary breakpoint), scales up to tablet/desktop
**Theme:** Premium Light UI, soft pastel palette, glassmorphism + neumorphism accents

---

## 1. Product Summary

A static, content-heavy educational quiz platform covering **Class 1 to Class 12**, all major subjects, all chapters (100+ quizzes total). Users pick Class → Subject → Chapter → take a quiz → submit → see a detailed result screen (score, accuracy, time taken, correct/wrong breakdown, review mode). Every attempt is stored in **InsForge (PostgreSQL DB)** so users can see history, leaderboard, and progress — while the site itself stays 100% static (HTML/CSS/JS, no custom backend server, no build step required).

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Structure | Semantic HTML5 | SEO + accessibility |
| Styling | CSS3 (custom properties/variables, Grid + Flexbox) | No framework dependency, full design control |
| Interactivity | Vanilla JS (ES6+, modules) | Static-hosting friendly, fast load |
| Quiz data | **1 master JSON file** (`data/quiz-data.json`) | Single source of truth, easy to maintain/update |
| Backend / persistence | **InsForge** (`@insforge/sdk`) — Postgres DB + Auth + REST API | Stores quiz attempts, user history, leaderboard without a custom server |
| Icons | Inline SVG / Lucide icon set | Crisp at all sizes, themeable via `currentColor` |
| Fonts | Google Fonts (self-hosted/preloaded) — e.g. **Poppins/Sora** (headings) + **Inter** (body) | Premium, highly legible on mobile |
| Hosting | Any static host (Netlify/Vercel/GitHub Pages) | No server needed |

---

## 3. InsForge Integration (Backend Layer)

Even though the site is static, InsForge gives it real persistence.

### 3.1 Setup
```html
<script type="module">
  import { createClient } from 'https://esm.sh/@insforge/sdk';
  const insforge = createClient({
    baseUrl: 'YOUR_INSFORGE_PROJECT_URL',
    anonKey: 'YOUR_ANON_KEY'
  });
</script>
```

### 3.2 Auth (lightweight)
- Guest mode allowed (attempt saved with a generated `device_id` in localStorage as fallback key)
- Optional Email/Google sign-in via InsForge Auth so history syncs across devices
- `insforge.auth.signUp()`, `insforge.auth.signInWithOAuth({provider:'google'})`

### 3.3 Database Schema (tables InsForge auto-exposes as REST)

**`users`** (InsForge built-in auth table — id, email, name, avatar)

**`quiz_attempts`**
| column | type | notes |
|---|---|---|
| id | uuid, PK | auto |
| user_id | uuid, FK → users (nullable for guest) | |
| device_id | text | fallback identity for guests |
| class | text | e.g. "Class 6" |
| subject | text | e.g. "Science" |
| chapter | text | e.g. "Light — Reflection & Refraction" |
| quiz_id | text | maps to JSON quiz id |
| total_questions | int | |
| correct_count | int | |
| wrong_count | int | |
| skipped_count | int | |
| score_percent | numeric | |
| time_taken_seconds | int | |
| answers_json | jsonb | per-question selected option + correctness, for review mode |
| created_at | timestamptz | default now() |

**`leaderboard_view`** (optional materialized view) — top scores per chapter/class, computed from `quiz_attempts`.

### 3.4 Key API calls
```js
// Save attempt
await insforge.database.from('quiz_attempts').insert({ ...attemptPayload });

// Fetch user's history
const { data } = await insforge.database.from('quiz_attempts')
  .select('*').eq('user_id', currentUserId).order('created_at', {ascending:false});

// Leaderboard for a chapter
const { data } = await insforge.database.from('quiz_attempts')
  .select('*').eq('quiz_id', quizId).order('score_percent', {ascending:false}).limit(10);
```

---

## 4. Content Data Model (`quiz-data.json`)

Single master JSON, structured hierarchically. Keep it **flat-indexed** for fast filtering on mobile (avoid deep nested loops in JS).

```json
{
  "classes": [
    {
      "id": "class-6",
      "label": "Class 6",
      "subjects": [
        {
          "id": "science",
          "label": "Science",
          "icon": "flask",
          "chapters": [
            {
              "id": "c6-sci-ch1",
              "title": "Food: Where Does It Come From?",
              "chapterNo": 1,
              "totalQuestions": 15,
              "difficulty": "easy",
              "estMinutes": 10,
              "quizId": "quiz_c6_sci_001",
              "questions": [
                {
                  "id": "q1",
                  "type": "single",
                  "question": "Which of these is a herbivore?",
                  "options": ["Lion", "Cow", "Tiger", "Eagle"],
                  "correctIndex": 1,
                  "explanation": "Cows eat only plants, making them herbivores."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Notes:**
- `explanation` field powers the "Review Answers" screen — always include it.
- Support `type: "single" | "multiple" | "trueFalse"` for variety.
- Precompute a lightweight **index file** (`data/index.json`) with just class/subject/chapter metadata (no questions) — loaded first for instant navigation; full questions for a chapter are lazy-fetched/sliced from the master JSON only when quiz starts (keeps initial load fast on mobile).

---

## 5. Information Architecture / Screens

1. **Splash/Home** — Hero, tagline, search bar ("Search chapter/subject"), CTA "Start Quiz", stats strip (e.g. "12 Classes · 60+ Subjects · 500+ Quizzes")
2. **Class Selection** — Grid of 12 cards (Class 1–12), premium card design, progress ring showing % chapters attempted
3. **Subject Selection** — Grid/list of subjects for chosen class, subject icon + chapter count
4. **Chapter List** — List of chapters with: chapter no., title, question count, est. time, difficulty badge, best-score chip (from InsForge if attempted before), "Start" button
5. **Quiz Screen** — One question at a time (mobile-first), progress bar, timer (optional per-question or total), option cards (tap to select), Next/Skip, question counter "Q 4/15"
6. **Submit Confirmation Sheet** — Bottom sheet: "X answered, Y skipped — Submit?"
7. **Result Screen** — Animated score circle (e.g. 12/15 · 80%), grade badge, time taken, correct/wrong/skipped breakdown chart, CTA: "Review Answers", "Retry Quiz", "Next Chapter", "Share Result"
8. **Review Answers Screen** — Each question with user's answer vs correct answer + explanation, color-coded
9. **Profile/History** (InsForge-powered) — Past attempts list, filter by class/subject, streak, overall accuracy trend (mini sparkline chart)
10. **Leaderboard** (optional, InsForge-powered) — Top scorers per chapter/class
11. **Search Results** — Global search across classes/subjects/chapters

---

## 6. Design System — Premium Light Theme

### 6.1 Color Palette (light, soft, premium)
```css
:root {
  --bg-base: #FAFAFC;
  --bg-surface: #FFFFFF;
  --bg-soft: #F3F1FB;          /* soft lavender tint */
  --primary: #6C5CE7;           /* premium indigo/violet */
  --primary-light: #A29BFE;
  --accent-mint: #00D2A0;       /* success/correct */
  --accent-coral: #FF6B6B;      /* wrong/alert */
  --accent-amber: #FFB020;      /* medium difficulty / streak */
  --text-primary: #1A1A2E;
  --text-secondary: #6B6B85;
  --border-soft: #ECEBF5;
  --shadow-soft: 0 8px 24px rgba(108, 92, 231, 0.08);
  --shadow-card: 0 2px 8px rgba(20, 20, 43, 0.05);
  --gradient-hero: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
}
```

### 6.2 Typography
- Headings: **Sora** or **Poppins**, 600–700 weight
- Body: **Inter**, 400–500 weight
- Fluid type scale via `clamp()`: e.g. `font-size: clamp(1.4rem, 4vw, 2rem)` for H1

### 6.3 Advanced UI Patterns to Include
- **Glassmorphism** nav bar (sticky, `backdrop-filter: blur(16px)`, translucent white)
- **Card elevation system** — soft shadows, hover/tap lift (`transform: translateY(-2px)`)
- **Skeleton loaders** while JSON data / InsForge data loads
- **Progress rings/circles** (SVG-based, animated stroke-dashoffset) for class completion & result score
- **Micro-interactions**: option card tap ripple, correct answer pulse-green, wrong answer shake-red
- **Bottom sheet modals** for mobile (submit confirm, filters) — swipe-to-dismiss
- **Sticky progress bar** at top during quiz (fills as user progresses)
- **Confetti animation** (canvas or CSS) on high score (>80%) at result screen
- **Dark-on-light contrast badges** for difficulty (Easy/Medium/Hard) with soft pastel backgrounds
- **Empty states** with friendly illustrations (no history yet, search no results)
- **Toast notifications** (non-blocking) for save-success/offline/error states
- **Floating Action Button** (mobile) — jump back to "Continue where you left off"
- **Segmented tab control** for switching Home/History/Leaderboard on mobile bottom nav

### 6.4 Mobile-First Layout Rules
- Base styles written for 375px width; use `min-width` media queries to scale up (`480px`, `768px`, `1024px`, `1280px`)
- Bottom navigation bar (fixed) for mobile: Home / Classes / History / Profile
- Thumb-zone optimization: primary CTAs within bottom 60% of screen
- Min tap target: 44×44px
- Single-column quiz question layout, full-width option cards (min-height 56px, stacked)
- Safe-area padding for notch devices (`env(safe-area-inset-*)`)

---

## 7. Core Features Checklist

- [ ] Class (1–12) → Subject → Chapter drill-down navigation
- [ ] 100+ chapter-quizzes, single JSON data source
- [ ] Instant client-side search (class/subject/chapter/keyword)
- [ ] Quiz engine: single question view, progress bar, skip, timer
- [ ] Auto-save in-progress attempt to localStorage (resume on reload)
- [ ] Result screen: score %, accuracy, time, breakdown chart
- [ ] Answer review mode with explanations
- [ ] Attempt history synced to InsForge (per user/device)
- [ ] Best-score badge shown on chapter cards
- [ ] Retry quiz / shuffle questions on retry
- [ ] Share result (Web Share API, fallback copy-to-clipboard image via canvas)
- [ ] Leaderboard per chapter (optional, InsForge)
- [ ] Offline-friendly (Service Worker caches JSON + shell — PWA-ready)
- [ ] Dark-mode toggle (optional, secondary priority — light is default/primary)
- [ ] Accessibility: keyboard nav, ARIA labels, color-contrast AA compliant

---

## 8. Suggested Folder Structure

```
/
├── index.html
├── class.html
├── subject.html
├── chapter.html
├── quiz.html
├── result.html
├── history.html
├── /css
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   └── pages.css
├── /js
│   ├── insforge-client.js
│   ├── data-loader.js
│   ├── quiz-engine.js
│   ├── result-render.js
│   ├── history.js
│   └── ui-utils.js
├── /data
│   ├── index.json          (lightweight nav metadata)
│   └── quiz-data.json      (full question bank)
├── /assets
│   ├── /icons
│   ├── /fonts
│   └── /illustrations
└── sw.js (service worker, optional PWA)
```

---

## 9. Performance & SEO

- Lazy-load `quiz-data.json` chapter-slice only when quiz starts (don't parse full 100+ quiz JSON on home load)
- Preload fonts, use `font-display: swap`
- Compress/minify JSON, CSS, JS for production
- Semantic HTML + meta tags per page (title, description) for SEO on class/subject/chapter pages
- Lighthouse target: 90+ on Performance, Accessibility, SEO (mobile)

---

## 10. Build Milestones (suggested order)

1. Design system + component library (buttons, cards, badges) in isolation
2. Home + Class + Subject + Chapter navigation (static, JSON-driven)
3. Quiz engine (question render, answer selection, progress, submit)
4. Result screen + review mode
5. InsForge integration (save attempt, fetch history, leaderboard)
6. Auth (guest + optional sign-in)
7. Polish: animations, empty states, PWA/offline, accessibility pass

# PRD: EduQuiz — Class 1–12 Multi-Subject Quiz Platform

**Type:** Static frontend (HTML/CSS/JS) + InsForge (backend-as-a-service) for result storage
**Target device priority:** Mobile-first (360px–430px primary breakpoint), scales up to tablet/desktop
**Theme:** Premium Light UI, soft pastel palette, glassmorphism + neumorphism accents

---

## 1. Product Summary

A static, content-heavy educational quiz platform covering **Class 1 to Class 12**, all major subjects, all chapters (100+ quizzes total). Users pick Class → Subject → Chapter → take a quiz → submit → see a detailed result screen (score, accuracy, time taken, correct/wrong breakdown, review mode). Every attempt is stored in **InsForge (PostgreSQL DB)** so users can see history, leaderboard, and progress — while the site itself stays 100% static (HTML/CSS/JS, no custom backend server, no build step required).

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Structure | Semantic HTML5 | SEO + accessibility |
| Styling | CSS3 (custom properties/variables, Grid + Flexbox) | No framework dependency, full design control |
| Interactivity | Vanilla JS (ES6+, modules) | Static-hosting friendly, fast load |
| Quiz data | **1 master JSON file** (`data/quiz-data.json`) | Single source of truth, easy to maintain/update |
| Backend / persistence | **InsForge** (`@insforge/sdk`) — Postgres DB + Auth + REST API | Stores quiz attempts, user history, leaderboard without a custom server |
| Icons | Inline SVG / Lucide icon set | Crisp at all sizes, themeable via `currentColor` |
| Fonts | Google Fonts (self-hosted/preloaded) — e.g. **Poppins/Sora** (headings) + **Inter** (body) | Premium, highly legible on mobile |
| Hosting | Any static host (Netlify/Vercel/GitHub Pages) | No server needed |

---

## 3. InsForge Integration (Backend Layer)

Even though the site is static, InsForge gives it real persistence.

### 3.1 Setup
```html
<script type="module">
  import { createClient } from 'https://esm.sh/@insforge/sdk';
  const insforge = createClient({
    baseUrl: 'YOUR_INSFORGE_PROJECT_URL',
    anonKey: 'YOUR_ANON_KEY'
  });
</script>
```

### 3.2 Auth (lightweight)
- Guest mode allowed (attempt saved with a generated `device_id` in localStorage as fallback key)
- Optional Email/Google sign-in via InsForge Auth so history syncs across devices
- `insforge.auth.signUp()`, `insforge.auth.signInWithOAuth({provider:'google'})`

### 3.3 Database Schema (tables InsForge auto-exposes as REST)

**`users`** (InsForge built-in auth table — id, email, name, avatar)

**`quiz_attempts`**
| column | type | notes |
|---|---|---|
| id | uuid, PK | auto |
| user_id | uuid, FK → users (nullable for guest) | |
| device_id | text | fallback identity for guests |
| class | text | e.g. "Class 6" |
| subject | text | e.g. "Science" |
| chapter | text | e.g. "Light — Reflection & Refraction" |
| quiz_id | text | maps to JSON quiz id |
| total_questions | int | |
| correct_count | int | |
| wrong_count | int | |
| skipped_count | int | |
| score_percent | numeric | |
| time_taken_seconds | int | |
| answers_json | jsonb | per-question selected option + correctness, for review mode |
| created_at | timestamptz | default now() |

**`leaderboard_view`** (optional materialized view) — top scores per chapter/class, computed from `quiz_attempts`.

### 3.4 Key API calls
```js
// Save attempt
await insforge.database.from('quiz_attempts').insert({ ...attemptPayload });

// Fetch user's history
const { data } = await insforge.database.from('quiz_attempts')
  .select('*').eq('user_id', currentUserId).order('created_at', {ascending:false});

// Leaderboard for a chapter
const { data } = await insforge.database.from('quiz_attempts')
  .select('*').eq('quiz_id', quizId).order('score_percent', {ascending:false}).limit(10);
```

---

## 4. Content Data Model (`quiz-data.json`)

Single master JSON, structured hierarchically. Keep it **flat-indexed** for fast filtering on mobile (avoid deep nested loops in JS).

```json
{
  "classes": [
    {
      "id": "class-6",
      "label": "Class 6",
      "subjects": [
        {
          "id": "science",
          "label": "Science",
          "icon": "flask",
          "chapters": [
            {
              "id": "c6-sci-ch1",
              "title": "Food: Where Does It Come From?",
              "chapterNo": 1,
              "totalQuestions": 15,
              "difficulty": "easy",
              "estMinutes": 10,
              "quizId": "quiz_c6_sci_001",
              "questions": [
                {
                  "id": "q1",
                  "type": "single",
                  "question": "Which of these is a herbivore?",
                  "options": ["Lion", "Cow", "Tiger", "Eagle"],
                  "correctIndex": 1,
                  "explanation": "Cows eat only plants, making them herbivores."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Notes:**
- `explanation` field powers the "Review Answers" screen — always include it.
- Support `type: "single" | "multiple" | "trueFalse"` for variety.
- Precompute a lightweight **index file** (`data/index.json`) with just class/subject/chapter metadata (no questions) — loaded first for instant navigation; full questions for a chapter are lazy-fetched/sliced from the master JSON only when quiz starts (keeps initial load fast on mobile).

---

## 5. Information Architecture / Screens

1. **Splash/Home** — Hero, tagline, search bar ("Search chapter/subject"), CTA "Start Quiz", stats strip (e.g. "12 Classes · 60+ Subjects · 500+ Quizzes")
2. **Class Selection** — Grid of 12 cards (Class 1–12), premium card design, progress ring showing % chapters attempted
3. **Subject Selection** — Grid/list of subjects for chosen class, subject icon + chapter count
4. **Chapter List** — List of chapters with: chapter no., title, question count, est. time, difficulty badge, best-score chip (from InsForge if attempted before), "Start" button
5. **Quiz Screen** — One question at a time (mobile-first), progress bar, timer (optional per-question or total), option cards (tap to select), Next/Skip, question counter "Q 4/15"
6. **Submit Confirmation Sheet** — Bottom sheet: "X answered, Y skipped — Submit?"
7. **Result Screen** — Animated score circle (e.g. 12/15 · 80%), grade badge, time taken, correct/wrong/skipped breakdown chart, CTA: "Review Answers", "Retry Quiz", "Next Chapter", "Share Result"
8. **Review Answers Screen** — Each question with user's answer vs correct answer + explanation, color-coded
9. **Profile/History** (InsForge-powered) — Past attempts list, filter by class/subject, streak, overall accuracy trend (mini sparkline chart)
10. **Leaderboard** (optional, InsForge-powered) — Top scorers per chapter/class
11. **Search Results** — Global search across classes/subjects/chapters

---

## 6. Design System — Premium Light Theme

### 6.1 Color Palette (light, soft, premium)
```css
:root {
  --bg-base: #FAFAFC;
  --bg-surface: #FFFFFF;
  --bg-soft: #F3F1FB;          /* soft lavender tint */
  --primary: #6C5CE7;           /* premium indigo/violet */
  --primary-light: #A29BFE;
  --accent-mint: #00D2A0;       /* success/correct */
  --accent-coral: #FF6B6B;      /* wrong/alert */
  --accent-amber: #FFB020;      /* medium difficulty / streak */
  --text-primary: #1A1A2E;
  --text-secondary: #6B6B85;
  --border-soft: #ECEBF5;
  --shadow-soft: 0 8px 24px rgba(108, 92, 231, 0.08);
  --shadow-card: 0 2px 8px rgba(20, 20, 43, 0.05);
  --gradient-hero: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
}
```

### 6.2 Typography
- Headings: **Sora** or **Poppins**, 600–700 weight
- Body: **Inter**, 400–500 weight
- Fluid type scale via `clamp()`: e.g. `font-size: clamp(1.4rem, 4vw, 2rem)` for H1

### 6.3 Advanced UI Patterns to Include
- **Glassmorphism** nav bar (sticky, `backdrop-filter: blur(16px)`, translucent white)
- **Card elevation system** — soft shadows, hover/tap lift (`transform: translateY(-2px)`)
- **Skeleton loaders** while JSON data / InsForge data loads
- **Progress rings/circles** (SVG-based, animated stroke-dashoffset) for class completion & result score
- **Micro-interactions**: option card tap ripple, correct answer pulse-green, wrong answer shake-red
- **Bottom sheet modals** for mobile (submit confirm, filters) — swipe-to-dismiss
- **Sticky progress bar** at top during quiz (fills as user progresses)
- **Confetti animation** (canvas or CSS) on high score (>80%) at result screen
- **Dark-on-light contrast badges** for difficulty (Easy/Medium/Hard) with soft pastel backgrounds
- **Empty states** with friendly illustrations (no history yet, search no results)
- **Toast notifications** (non-blocking) for save-success/offline/error states
- **Floating Action Button** (mobile) — jump back to "Continue where you left off"
- **Segmented tab control** for switching Home/History/Leaderboard on mobile bottom nav

### 6.4 Mobile-First Layout Rules
- Base styles written for 375px width; use `min-width` media queries to scale up (`480px`, `768px`, `1024px`, `1280px`)
- Bottom navigation bar (fixed) for mobile: Home / Classes / History / Profile
- Thumb-zone optimization: primary CTAs within bottom 60% of screen
- Min tap target: 44×44px
- Single-column quiz question layout, full-width option cards (min-height 56px, stacked)
- Safe-area padding for notch devices (`env(safe-area-inset-*)`)

---

## 7. Core Features Checklist

- [ ] Class (1–12) → Subject → Chapter drill-down navigation
- [ ] 100+ chapter-quizzes, single JSON data source
- [ ] Instant client-side search (class/subject/chapter/keyword)
- [ ] Quiz engine: single question view, progress bar, skip, timer
- [ ] Auto-save in-progress attempt to localStorage (resume on reload)
- [ ] Result screen: score %, accuracy, time, breakdown chart
- [ ] Answer review mode with explanations
- [ ] Attempt history synced to InsForge (per user/device)
- [ ] Best-score badge shown on chapter cards
- [ ] Retry quiz / shuffle questions on retry
- [ ] Share result (Web Share API, fallback copy-to-clipboard image via canvas)
- [ ] Leaderboard per chapter (optional, InsForge)
- [ ] Offline-friendly (Service Worker caches JSON + shell — PWA-ready)
- [ ] Dark-mode toggle (optional, secondary priority — light is default/primary)
- [ ] Accessibility: keyboard nav, ARIA labels, color-contrast AA compliant

---

## 8. Suggested Folder Structure

```
/
├── index.html
├── class.html
├── subject.html
├── chapter.html
├── quiz.html
├── result.html
├── history.html
├── /css
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   └── pages.css
├── /js
│   ├── insforge-client.js
│   ├── data-loader.js
│   ├── quiz-engine.js
│   ├── result-render.js
│   ├── history.js
│   └── ui-utils.js
├── /data
│   ├── index.json          (lightweight nav metadata)
│   └── quiz-data.json      (full question bank)
├── /assets
│   ├── /icons
│   ├── /fonts
│   └── /illustrations
└── sw.js (service worker, optional PWA)
```

---

## 9. Performance & SEO

- Lazy-load `quiz-data.json` chapter-slice only when quiz starts (don't parse full 100+ quiz JSON on home load)
- Preload fonts, use `font-display: swap`
- Compress/minify JSON, CSS, JS for production
- Semantic HTML + meta tags per page (title, description) for SEO on class/subject/chapter pages
- Lighthouse target: 90+ on Performance, Accessibility, SEO (mobile)

---

## 10. Build Milestones (suggested order)

1. Design system + component library (buttons, cards, badges) in isolation
2. Home + Class + Subject + Chapter navigation (static, JSON-driven)
3. Quiz engine (question render, answer selection, progress, submit)
4. Result screen + review mode
5. InsForge integration (save attempt, fetch history, leaderboard)
6. Auth (guest + optional sign-in)
7. Polish: animations, empty states, PWA/offline, accessibility pass

---

---

## 11. Pre-Quiz Setup Screen (Custom Time / Level / Options)

Before quiz starts, show a **"Configure Your Quiz"** premium bottom-sheet/modal (not directly jumping into questions). This is what separates a ₹10,000-premium feel from a basic quiz app.

### 11.1 Screen: `quiz-setup.html` (or modal on chapter page)
Shown right after user taps "Start" on a chapter.

**Card layout (mobile-first, vertical stack):**

1. **Chapter summary header** — chapter title, total questions available, subject icon, small illustration
2. **Difficulty / Level selector** — segmented pill control: `Easy` · `Medium` · `Hard` · `Mixed` (filters question pool by `difficulty` field in JSON; "Mixed" = random blend)
3. **Number of Questions slider/stepper** — e.g. 5 / 10 / 15 / All (dynamically capped to available questions in that chapter)
4. **Time Mode selector** — 3 cards:
   - **Practice Mode** (no timer, explanations shown instantly after each answer)
   - **Timed Mode** — custom time picker (slider: 5/10/15/20/30 min) — countdown timer visible during quiz
   - **Speed Mode** — fixed 15–30 sec per question, auto-advances (adrenaline/exam-simulation feel)
5. **Sound toggle** — on/off switch (persists via localStorage)
6. **Question order** — toggle: Sequential / Shuffled
7. **Big premium CTA button** — "Start Quiz →" with gradient background + subtle glow/pulse animation

### 11.2 Data flow
- Selected config (level, question count, time mode, duration, shuffle) is passed into `quiz-engine.js` as a `quizConfig` object
- `quiz-engine.js` filters/slices the chapter's question array based on `quizConfig.level` and `quizConfig.questionCount`, shuffles if needed
- Config + results both saved to InsForge `quiz_attempts` row (add columns below)

### 11.3 Additional InsForge columns (extends `quiz_attempts` table from Section 3.3)
| column | type | notes |
|---|---|---|
| difficulty_selected | text | Easy/Medium/Hard/Mixed |
| time_mode | text | practice / timed / speed |
| time_limit_seconds | int | null for practice mode |
| question_count_selected | int | |
| shuffle_enabled | bool | |
| marks_obtained | numeric | see marking scheme below |
| marks_total | numeric | |
| grade | text | e.g. "A+", "A", "B", computed from % |

---

## 12. Marking Scheme / Percentage & Marks System

- Each question has a **mark value** (default 1, but support `marks` field per question in JSON for weighted questions — e.g. harder chapters could weight 2 marks)
- **Negative marking** — optional toggle per quiz (e.g. -0.25 for wrong answer) — configurable in pre-quiz setup as an "Exam Mode" advanced option
- Result screen shows:
  - **Marks Obtained / Total Marks** (e.g. "38 / 50")
  - **Percentage** (large animated counter, counts up from 0 to final % on load — e.g. `76%`)
  - **Grade badge** — computed via bands (≥90% A+, ≥75% A, ≥60% B, ≥40% C, <40% "Needs Practice") with color-coded chip
  - **Percentile / rank comparison** (optional, InsForge-powered) — "You scored better than 82% of students who attempted this chapter"

---

## 13. Sound Effects System

Small, tasteful, non-intrusive audio layer — huge premium-feel multiplier at near-zero cost.

### 13.1 Sound events to include
| Event | Sound |
|---|---|
| Option select (tap) | soft "click" |
| Correct answer (Practice Mode instant feedback) | short pleasant "ding"/chime |
| Wrong answer | soft low "buzz" (not harsh) |
| Timer last 10 seconds | subtle ticking |
| Quiz submit | "whoosh" transition sound |
| Result reveal (score counting up) | rising chime synced to counter animation |
| High score (>80%) | celebratory jingle + confetti |
| Navigation/page transition | very subtle swipe sound |
| Streak/achievement unlock | sparkle sound |

### 13.2 Implementation
- Use lightweight `Web Audio API` or simple `<audio>` elements pre-loaded (`preload="auto"`), all sounds under ~50KB each (use `.mp3`/`.ogg`, free sources like Mixkit/Pixabay — royalty-free)
- Global `soundManager.js` module: `playSound('correct')`, respects the sound on/off toggle from setup screen (persisted in localStorage)
- Mute icon always accessible in top nav during quiz

---

## 14. Additional Premium Features (Beyond Base PRD)

- **Streak system** — daily quiz streak counter (like Duolingo), shown on home page ("🔥 5-day streak")
- **XP / Level system** — user earns XP per correct answer, levels up (Bronze → Silver → Gold → Platinum learner badges), stored in InsForge `user_stats` table
- **Achievements/Badges** — e.g. "Perfect Score", "Speed Demon" (finished under time), "Chapter Master" (100% on 5 chapters), shown as unlockable badge grid on profile
- **Daily Challenge card** — one featured random quiz on home page, refreshes every 24h, bonus XP
- **Bookmark/Favorite chapters** — star icon to save chapters for quick access
- **Wrong-answers-only retry** — after a quiz, option to "Practice only what you got wrong"
- **Countdown ring timer visual** — circular SVG ring depletes around the question card in Timed/Speed mode (not just a text timer)
- **Animated question transitions** — slide-left/slide-right card swap between questions (like Tinder-card feel), swipe gesture support on mobile
- **Haptic feedback** — `navigator.vibrate()` on correct/wrong (mobile only, subtle)
- **Personalized home dashboard** (for returning users) — "Continue where you left off" card, weakest-subject suggestion ("You scored low in Class 8 Maths — Ch.3, retry?"), recent activity feed
- **Print/Download result as image** — canvas-generated shareable result card (for social sharing / WhatsApp)
- **Parent/Teacher view (optional)** — read-only shareable link showing a student's attempt history via InsForge row-level access

---

## 15. Home Page — Premium "$10,000 Web App" Layout Spec

The home page is the single biggest trust/premium signal. Structure it like a polished SaaS landing page, not a plain list.

### 15.1 Section-by-section layout (top to bottom, mobile-first)

1. **Sticky glass navbar** — logo/wordmark left, search icon + profile avatar right; scroll-shrink effect (navbar height reduces slightly on scroll)
2. **Hero section**
   - Gradient background (soft violet mesh/blob shapes, animated slowly with CSS)
   - Bold headline: e.g. "Master Every Subject, One Quiz at a Time"
   - Subheadline (1 line, muted text)
   - Primary CTA: "Start Learning" (scrolls to class grid) + Secondary ghost CTA: "Explore Subjects"
   - Animated stat counters row: `12 Classes` · `60+ Subjects` · `500+ Quizzes` · `10,000+ Questions` (count-up on scroll-into-view)
3. **Continue Learning card** (returning users only) — horizontal card, chapter thumbnail, progress bar, "Resume" button
4. **Quick Class Picker** — horizontally scrollable chip row (Class 1…12) for fast jump, sticky-scroll snap on mobile
5. **Daily Challenge banner** — eye-catching gradient card, countdown ("Refreshes in 6h 22m"), bonus XP tag
6. **Browse by Class** — main grid (2 columns mobile, up to 4–6 on desktop), each card: class number in large type, subject-count subtitle, subtle icon pattern background, tap-scale animation
7. **Popular/Trending Chapters** — horizontal scroll carousel, "🔥 Trending" label, based on most-attempted (InsForge aggregate query)
8. **Why EduQuiz** (trust section) — 3–4 feature highlight cards with icons: "Instant Results", "Detailed Explanations", "Track Your Progress", "100% Free"
9. **Testimonials/Stats strip** (optional, social proof) — subtle carousel
10. **Footer** — links, subject index (SEO-friendly sitemap of links), social icons, "Made with ❤️" line

### 15.2 Premium micro-details that sell the "$10k" feel
- Consistent **8px spacing grid** throughout (no arbitrary margins)
- Soft **blob/mesh gradient background shapes** (SVG, low-opacity, positioned absolute) instead of flat color hero
- **Scroll-reveal animations** (fade+slide-up, `IntersectionObserver`-based) on each home section — staggered children
- **Cursor-aware hover glow** on cards (desktop only — radial gradient follows mouse via `mousemove`)
- Consistent **elevation hierarchy**: flat surfaces → soft-shadow cards → strong-shadow modals (3-tier depth system)
- **Custom-designed empty/loading states**, never a generic spinner — use branded skeleton shimmer matching card shapes
- **Number formatting polish** — animated count-up, comma separators (10,000+ not 10000)
- Consistent **icon set** (one style only — either all outline or all filled, never mixed) sized on an 4px/8px grid

---

## 16. Updated Feature Checklist (Additions)

- [ ] Pre-quiz setup screen: level, question count, time mode, custom timer, shuffle, sound toggle
- [ ] Practice / Timed / Speed quiz modes
- [ ] Marks + percentage + grade band system (with optional negative marking)
- [ ] Full sound effects layer with global mute
- [ ] Streak, XP, levels, achievement badges
- [ ] Daily challenge card
- [ ] Bookmarked chapters
- [ ] Wrong-answers-only retry mode
- [ ] Circular countdown ring timer during quiz
- [ ] Swipeable question card transitions + haptic feedback
- [ ] Personalized "Continue Learning" + weak-area suggestions on home
- [ ] Shareable result image (canvas export)
- [ ] Premium landing-page-style home (hero, stats, trending, testimonials, footer sitemap)
- [ ] Scroll-reveal + cursor-glow micro-interactions on desktop

---

*End of PRD — ready to hand to an AI coding agent or developer to scaffold the project.*

