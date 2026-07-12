// ==========================================
// EduQuiz — Premium Static SPA Javascript
// ==========================================

const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app/api/database/records';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

// Global State
let currentUser = null;
let currentQuiz = null;
let currentQuestions = [];
let quizAnswers = []; // user selected options
let quizBookmarks = new Set();
let quizTimer = null;
let quizTimeRemaining = 0;
let accuracyChart = null;

// Simulated categories for showcase if DB is empty
const BACKUP_CATEGORIES = [
  { id: 'sci', name: 'Science', class_grade: 12 },
  { id: 'math', name: 'Mathematics', class_grade: 12 },
  { id: 'gk', name: 'General Knowledge', class_grade: 10 },
  { id: 'code', name: 'Coding', class_grade: 11 },
];

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: 'Ketan Verma', avatar: '🥇', accuracy: '98%', points: 2850, badge: '🥇' },
  { rank: 2, name: 'Shreya Gupta', avatar: '🥈', accuracy: '95%', points: 2540, badge: '🥈' },
  { rank: 3, name: 'Arjun Malhotra', avatar: '🥉', accuracy: '92%', points: 2320, badge: '🥉' },
  { rank: 4, name: 'Priya Sharma', avatar: '🧑‍🎓', accuracy: '90%', points: 2150, badge: '' },
  { rank: 5, name: 'Rohan Mehta', avatar: '🧑‍🎓', accuracy: '88%', points: 1980, badge: '' }
];

const TRENDING_QUIZZES = [
  { category: 'Biology', difficulty: 'Hard', title: 'Human Reproduction & Splicing', attempts: 1850, accuracy: '84%' },
  { category: 'Chemistry', difficulty: 'Moderate', title: 'Electrochemistry Basics', attempts: 1420, accuracy: '89%' },
  { category: 'Physics', difficulty: 'NEET', title: 'Electric Charges & Flux Fields', attempts: 940, accuracy: '78%' },
  { category: 'Chemistry', difficulty: 'Easy', title: 'Solutions & Concentrations', attempts: 2100, accuracy: '93%' }
];

const FAQS = [
  { q: 'Is this quiz platform completely free?', a: 'Yes! You can register and attempt basic quizzes for free. Premium plans unlock unlimited daily revisions, multiplayer 1v1 rooms, and PDF scorecard downloads.' },
  { q: 'How is my weekly leaderboard rank determined?', a: 'Your weekly rank is calculated based on total XP earned. XP is awarded for correct answers, high accuracy, and fast puzzle submission times.' },
  { q: 'Can I bookmark questions to review later?', a: 'Absolutely! Inside the active quiz panel, click the bookmark icon on the top right. Bookmarked items will display in your user dashboard logs for quick revision.' },
  { q: 'Is there a daily streak reward?', a: 'Yes! Solving at least 1 quiz every 24 hours keeps your daily streak active. Streaks reward you with bonus coins, which can be spent to buy streak freezes.' }
];

const SIMULATOR_QUESTIONS = [
  {
    q: "Which of the following describes the electrical properties of cell membranes?",
    options: ["Passive dielectric", "Perfect conductor", "Active generator", "Semiconductor"],
    correct: 0,
    explanation: "Cell membranes act as passive dielectrics that insulate intracellular and extracellular conducting mediums."
  },
  {
    q: "The standard unit of magnetic flux density is defined as:",
    options: ["Weber", "Tesla", "Henry", "Gauss"],
    correct: 1,
    explanation: "Tesla is the SI unit of magnetic flux density (B), equal to one Weber per square meter."
  },
  {
    q: "Which functional group is characterized by a carbon-nitrogen triple bond?",
    options: ["Amide", "Amine", "Nitrile", "Nitro"],
    correct: 2,
    explanation: "Nitriles contain a -C≡N group with a carbon-nitrogen triple bond."
  }
];

let currentSimIndex = 0;
function runHeroSimulator() {
  const qEl = document.getElementById('sim-question');
  const optEl = document.getElementById('sim-options');
  if (!qEl || !optEl) return;

  const activeQ = SIMULATOR_QUESTIONS[currentSimIndex];
  qEl.innerText = activeQ.q;
  optEl.innerHTML = '';

  activeQ.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'sim-opt w-full text-left p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 transition-all flex items-center justify-between hover:border-indigo-300 hover:bg-indigo-50';
    btn.innerHTML = `<span>${opt}</span>`;
    optEl.appendChild(btn);
  });

  // Cycle simulation stages: select correct answer -> highlight green -> show explanation -> next question
  setTimeout(() => {
    const buttons = optEl.querySelectorAll('button');
    if (!buttons[activeQ.correct]) return;
    
    // Highlight correct option
    buttons[activeQ.correct].className = 'sim-opt correct w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between';
    buttons[activeQ.correct].innerHTML += '<span class="text-emerald-600 font-black">✓</span>';

    // Show mini explanation toast
    showToast('Correct Answer!', activeQ.explanation, '🧠');

    // Next card cycle
    setTimeout(() => {
      currentSimIndex = (currentSimIndex + 1) % SIMULATOR_QUESTIONS.length;
      runHeroSimulator();
    }, 4000);
  }, 2500);
}


// Helper to hash password using SHA-256 via Web Crypto API
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Database helper
async function dbRequest(endpoint, options = {}) {
  const headers = {
    'apikey': INSFORGE_KEY,
    'Authorization': `Bearer ${INSFORGE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  try {
    const resp = await fetch(`${INSFORGE_URL}/${endpoint}`, { ...options, headers });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error: ${text}`);
    }
    if (resp.status === 204) return null;
    return await resp.json();
  } catch (err) {
    console.error(`DB request failed on ${endpoint}:`, err);
    throw err;
  }
}

// Toast disabled — silent console log only
function showToast(title, desc, icon) {
  console.log(`[${icon || 'ℹ'}] ${title}: ${desc}`);
}

// SPA Hash Router
function handleRouting() {
  const hash = window.location.hash || '#home';
  const sections = document.querySelectorAll('.view-section');
  
  // Close mobile nav overlay on route change
  document.getElementById('mobile-menu-overlay').classList.add('hidden');

  sections.forEach(sec => {
    sec.classList.remove('active');
  });

  if (hash === '#home' || hash === '') {
    document.getElementById('home-view').classList.add('active');
    loadCategories(12); // default load class 12
    loadTrendingQuizzes();
    loadLeaderboardPreview();
  } else if (hash === '#login') {
    document.getElementById('login-view').classList.add('active');
  } else if (hash === '#signup') {
    document.getElementById('signup-view').classList.add('active');
  } else if (hash === '#forgot-password') {
    document.getElementById('forgot-password-view').classList.add('active');
  } else if (hash === '#dashboard') {
    if (!currentUser) {
      window.location.hash = '#login';
      showToast('Unauthorized', 'Please log in to view your dashboard.', '🔒');
      return;
    }
    document.getElementById('dashboard-view').classList.add('active');
    loadUserDashboard();
  } else if (hash === '#leaderboard') {
    document.getElementById('leaderboard-view').classList.add('active');
    loadFullLeaderboard();
  } else if (hash === '#quiz') {
    if (!currentQuestions.length) {
      window.location.hash = '#home';
      return;
    }
    document.getElementById('quiz-view').classList.add('active');
  } else if (hash === '#results') {
    document.getElementById('results-view').classList.add('active');
  } else if (hash === '#admin') {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      window.location.hash = '#home';
      showToast('Restricted', 'Access is restricted to admin roles only.', '🚫');
      return;
    }
    document.getElementById('admin-view').classList.add('active');
    loadAdminUsers();
  }

  // Update navbar layout
  updateNavbar();
}

// Initialize Auth Session
function initAuth() {
  const session = localStorage.getItem('userSession');
  if (session) {
    currentUser = JSON.parse(session);
    // Auto-onboard check
    if (!currentUser.username) {
      document.getElementById('onboard-modal').classList.remove('hidden');
    }
  }
}

// Update navbar elements
function updateNavbar() {
  const loggedOut = document.getElementById('logged-out-actions');
  const loggedIn = document.getElementById('logged-in-actions');
  const adminBadge = document.getElementById('nav-admin-badge');

  if (currentUser) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    document.getElementById('nav-profile-btn').innerText = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
    document.getElementById('nav-coins').innerText = currentUser.coins || 0;
    document.getElementById('nav-xp').innerText = `${currentUser.xp || 0} XP`;

    if (currentUser.role === 'SUPER_ADMIN') {
      adminBadge.classList.remove('hidden');
    } else {
      adminBadge.classList.add('hidden');
    }
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
    adminBadge.classList.add('hidden');
  }
}

// Load Categories
async function loadCategories(grade) {
  const container = document.getElementById('categories-grid');
  container.innerHTML = '<div class="col-span-full text-center text-xs text-slate-500 py-8">Loading subjects...</div>';

  try {
    // Filter by grade suffix in name since live DB has no class_grade column
    const allSubjects = await dbRequest('subjects?limit=100');
    // Filter by matching grade in subject name or show all if grade is 12 (default)
    const subjects = grade === 12
      ? allSubjects.filter(s => !s.name.includes('Class 9') && !s.name.includes('Class 10') && !s.name.includes('Class 11'))
      : allSubjects.filter(s => s.name.includes(`Class ${grade}`));

    container.innerHTML = '';

    if (!subjects.length) {
      container.innerHTML = '<div class="col-span-full text-center text-xs text-slate-500 py-8">No subjects found for this grade.</div>';
      return;
    }

    // Colors mapping list
    const colors = [
      'from-blue-600 to-indigo-600',
      'from-purple-600 to-pink-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600'
    ];

    subjects.forEach((sub, idx) => {
      const color = colors[idx % colors.length];
      const card = document.createElement('div');
      card.className = 'card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all';
      card.innerHTML = `
        <div>
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-all shadow-md">
            📚
          </div>
          <h3 class="text-base font-bold text-slate-800">${sub.name}</h3>
          <p class="text-slate-400 text-xs mt-1.5">View practice chapters</p>
        </div>
        <div class="mt-8 flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:text-indigo-700">
          Browse Chapters <span class="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      `;
      card.onclick = () => loadChaptersModal(sub);
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<div class="col-span-full text-center text-xs text-red-400 py-8">Error loading subjects.</div>';
  }
}

// Render Chapters list inside a bottom sheet modal
async function loadChaptersModal(subject) {
  try {
    const chapters = await dbRequest(`chapters?subject_id=eq.${subject.id}`);
    
    // Create popup dialog dynamically
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
    
    const content = document.createElement('div');
    content.className = 'w-full max-w-lg glass-card p-8 rounded-2xl shadow-2xl relative space-y-6';
    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h3 class="text-xl font-bold text-white">${subject.name}</h3>
          <p class="text-slate-500 text-xs mt-0.5">Select a chapter to practice</p>
        </div>
        <button id="close-chap-popup" class="p-1 text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="max-h-[300px] overflow-y-auto space-y-2 pr-2" id="chapters-list-container">
        Loading chapters...
      </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    document.getElementById('close-chap-popup').onclick = () => overlay.remove();

    const listContainer = content.querySelector('#chapters-list-container');
    listContainer.innerHTML = '';

    if (!chapters.length) {
      listContainer.innerHTML = '<p class="text-xs text-slate-500 py-4 text-center">No chapters found.</p>';
      return;
    }

    chapters.forEach(chap => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/80 text-sm font-semibold text-slate-200 transition-all flex items-center justify-between group';
      btn.innerHTML = `
        <span>${chap.name}</span>
        <span class="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
      `;
      btn.onclick = () => {
        overlay.remove();
        launchQuizConfig(chap);
      };
      listContainer.appendChild(btn);
    });

  } catch (err) {
    showToast('Error', 'Failed to retrieve chapters for this subject.', '⚠️');
  }
}

// Config Sheet Logic
async function launchQuizConfig(chapter) {
  try {
    const quizzes = await dbRequest(`quizzes?chapter_id=eq.${chapter.id}`);
    if (!quizzes.length) {
      showToast('No Quiz Available', 'There are no active quiz tests for this chapter yet.', 'ℹ️');
      return;
    }
    const quiz = quizzes[0];
    const questions = await dbRequest(`questions?quiz_id=eq.${quiz.id}`);

    // Create a configuration modal
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
    
    const content = document.createElement('div');
    content.className = 'w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl space-y-6 border border-slate-200';
    content.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Configure Quiz</h3>
          <p class="text-slate-500 text-xs mt-0.5">${chapter.name} · ${questions.length} questions available</p>
        </div>
        <button id="close-cfg-popup" class="p-1 text-slate-400 hover:text-slate-700">✕</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty filter</label>
          <div class="flex flex-wrap gap-2">
            <button class="diff-chip active px-3 py-1.5 rounded-lg border border-indigo-500 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase" data-diff="mixed">Mixed</button>
            <button class="diff-chip px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs uppercase" data-diff="easy">Easy</button>
            <button class="diff-chip px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs uppercase" data-diff="moderate">Moderate</button>
            <button class="diff-chip px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs uppercase" data-diff="hard">Hard</button>
            <button class="diff-chip px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-bold text-xs uppercase" data-diff="neet">NEET</button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Number of Questions</label>
          <div class="flex gap-2">
            <input type="number" id="cfg-count" value="10" min="1" max="100" class="w-20 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 text-xs font-bold text-center">
            <button class="cnt-pill px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 font-bold text-xs" data-val="5">5</button>
            <button class="cnt-pill px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 font-bold text-xs" data-val="10">10</button>
            <button class="cnt-pill px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 font-bold text-xs" data-val="50">50</button>
            <button class="cnt-pill px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 font-bold text-xs" data-val="100">100</button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mode</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="border-2 border-indigo-500 bg-indigo-50 p-3 rounded-xl flex flex-col text-left cursor-pointer transition-all" id="mode-card-practice">
              <input type="radio" name="cfg-mode" value="practice" checked class="hidden">
              <span class="text-xs font-bold text-indigo-700">Practice Mode</span>
              <span class="text-[9px] text-indigo-400 leading-none mt-1">No timer, relax</span>
            </label>
            <label class="border border-slate-200 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl flex flex-col text-left cursor-pointer transition-all" id="mode-card-timed">
              <input type="radio" name="cfg-mode" value="timed" class="hidden">
              <span class="text-xs font-bold text-slate-700">Timed Mode</span>
              <span class="text-[9px] text-slate-400 leading-none mt-1">Countdown timer</span>
            </label>
          </div>
        </div>
      </div>

      <button id="start-quiz-btn" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest">Start Quiz</button>
    `;

    document.body.appendChild(overlay);

    document.getElementById('close-cfg-popup').onclick = () => overlay.remove();

    // Toggle logic for diff chips
    const chips = content.querySelectorAll('.diff-chip');
    let selectedDiff = 'mixed';
    chips.forEach(c => {
      c.onclick = () => {
        chips.forEach(x => x.classList.remove('active', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700'));
        chips.forEach(x => x.classList.add('border-slate-200', 'bg-slate-50', 'text-slate-500'));
        
        c.classList.add('active', 'border-indigo-500', 'bg-indigo-50', 'text-indigo-700');
        c.classList.remove('border-slate-200', 'bg-slate-50', 'text-slate-500');
        selectedDiff = c.getAttribute('data-diff');
      };
    });

    // Count stepper pills
    const inputCount = content.querySelector('#cfg-count');
    const pills = content.querySelectorAll('.cnt-pill');
    pills.forEach(p => {
      p.onclick = () => {
        inputCount.value = p.getAttribute('data-val');
      };
    });

    // Mode selects
    const modePractice = content.querySelector('#mode-card-practice');
    const modeTimed = content.querySelector('#mode-card-timed');
    const modeInputs = content.querySelectorAll('input[name="cfg-mode"]');

    modeInputs.forEach(i => {
      i.onchange = () => {
        if (i.value === 'practice') {
          modePractice.className = 'border-2 border-indigo-500 bg-indigo-50 p-3 rounded-xl flex flex-col text-left cursor-pointer';
          modeTimed.className = 'border border-slate-200 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl flex flex-col text-left cursor-pointer';
        } else {
          modeTimed.className = 'border-2 border-indigo-500 bg-indigo-50 p-3 rounded-xl flex flex-col text-left cursor-pointer';
          modePractice.className = 'border border-slate-200 bg-slate-50 hover:bg-slate-100 p-3 rounded-xl flex flex-col text-left cursor-pointer';
        }
      };
    });

    // Start action
    content.querySelector('#start-quiz-btn').onclick = () => {
      overlay.remove();
      setupQuizSession(quiz, questions, selectedDiff, parseInt(inputCount.value), content.querySelector('input[name="cfg-mode"]:checked').value);
    };

  } catch (err) {
    showToast('Error', 'Failed to retrieve quiz configurations.', '⚠️');
  }
}

// Setup Active Quiz Session
function setupQuizSession(quiz, allQuestions, diff, count, mode) {
  let filtered = [...allQuestions];
  if (diff !== 'mixed') {
    filtered = allQuestions.filter(q => q.difficulty === diff);
  }

  if (!filtered.length) {
    showToast('Empty Quiz', `No questions available matching the "${diff}" difficulty level.`, 'ℹ️');
    return;
  }

  // Shuffle and limit
  filtered = filtered.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, filtered.length));

  currentQuiz = quiz;
  currentQuestions = filtered;
  quizAnswers = new Array(filtered.length).fill(null);
  quizBookmarks.clear();

  // Route to quiz page
  window.location.hash = '#quiz';
  renderQuestion(0);

  // Configure timer
  const timerBox = document.getElementById('quiz-timer-box');
  if (mode === 'timed') {
    timerBox.classList.remove('hidden');
    timerBox.classList.add('flex');
    quizTimeRemaining = filtered.length * 60; // 1 min per question
    updateTimerText();
    
    clearInterval(quizTimer);
    quizTimer = setInterval(() => {
      quizTimeRemaining--;
      updateTimerText();
      if (quizTimeRemaining <= 0) {
        clearInterval(quizTimer);
        submitQuizAnswers();
      }
    }, 1000);
  } else {
    timerBox.classList.add('hidden');
    clearInterval(quizTimer);
  }
}

function updateTimerText() {
  const m = Math.floor(quizTimeRemaining / 60);
  const s = quizTimeRemaining % 60;
  document.getElementById('quiz-timer-text').innerText = `${m}:${s.toString().padStart(2, '0')}`;
}

// Render active gameplay question
let currentQuestionIndex = 0;
function renderQuestion(idx) {
  currentQuestionIndex = idx;
  const q = currentQuestions[idx];
  
  // Progress Bar
  const progPct = ((idx + 1) / currentQuestions.length) * 100;
  document.getElementById('quiz-progress-bar').style.width = `${progPct}%`;
  document.getElementById('quiz-question-number').innerText = `Question ${idx + 1}/${currentQuestions.length}`;
  document.getElementById('quiz-difficulty-badge').innerText = q.difficulty;

  // Question Text
  document.getElementById('quiz-question-text').innerText = q.question;

  // Options
  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';

  const opts = [
    { label: 'A', text: q.option_a },
    { label: 'B', text: q.option_b },
    { label: 'C', text: q.option_c },
    { label: 'D', text: q.option_d }
  ];

  opts.forEach(opt => {
    const isSelected = quizAnswers[idx] === opt.label;
    const btn = document.createElement('button');
    btn.className = `w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
      isSelected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 text-slate-700'
    }`;
    btn.innerHTML = `
      <span>Option ${opt.label}: ${opt.text}</span>
      ${isSelected ? '<span class="text-indigo-600 font-black">✓</span>' : ''}
    `;
    btn.onclick = () => {
      quizAnswers[idx] = opt.label;
      renderQuestion(idx);
    };
    container.appendChild(btn);
  });

  // Buttons logic
  const prevBtn = document.getElementById('quiz-prev-btn');
  const nextBtn = document.getElementById('quiz-next-btn');

  if (idx > 0) {
    prevBtn.classList.remove('hidden');
  } else {
    prevBtn.classList.add('hidden');
  }

  if (idx === currentQuestions.length - 1) {
    nextBtn.innerText = 'Submit Quiz';
  } else {
    nextBtn.innerText = 'Next Question';
  }

  // Bookmark styling
  const bookBtn = document.getElementById('quiz-bookmark-btn');
  if (quizBookmarks.has(q.id)) {
    bookBtn.className = 'p-2 rounded-lg border border-indigo-400 bg-indigo-50 text-indigo-600';
  } else {
    bookBtn.className = 'p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors';
  }
}

// Bookmark toggler
document.getElementById('quiz-bookmark-btn').onclick = () => {
  const qId = currentQuestions[currentQuestionIndex].id;
  if (quizBookmarks.has(qId)) {
    quizBookmarks.delete(qId);
  } else {
    quizBookmarks.add(qId);
  }
  renderQuestion(currentQuestionIndex);
};

// Next/Submit navigation
document.getElementById('quiz-next-btn').onclick = () => {
  if (currentQuestionIndex === currentQuestions.length - 1) {
    submitQuizAnswers();
  } else {
    renderQuestion(currentQuestionIndex + 1);
  }
};

document.getElementById('quiz-prev-btn').onclick = () => {
  if (currentQuestionIndex > 0) {
    renderQuestion(currentQuestionIndex - 1);
  }
};

// Abort Popup logic
document.getElementById('quiz-abort-btn').onclick = () => {
  if (confirm('Discard changes and abort the current quiz attempt? Your score will not be saved.')) {
    clearInterval(quizTimer);
    window.location.hash = '#home';
  }
};

// Submit Quiz and calculate scores
async function submitQuizAnswers() {
  clearInterval(quizTimer);
  let correctCount = 0;
  const detailedReviews = [];

  currentQuestions.forEach((q, idx) => {
    const selected = quizAnswers[idx];
    const isCorrect = selected === q.correct_option;
    if (isCorrect) correctCount++;

    detailedReviews.push({
      question: q.question,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      correct: q.correct_option,
      selected: selected || 'None',
      isCorrect
    });
  });

  const accuracy = Math.round((correctCount / currentQuestions.length) * 100);
  const timeTaken = 300; // Simulated time spent
  const xpEarned = correctCount * 10 + (accuracy === 100 ? 50 : 0);
  const coinsEarned = correctCount * 2;

  // Render results
  document.getElementById('res-score').innerText = `${correctCount}/${currentQuestions.length}`;
  document.getElementById('res-accuracy').innerText = `${accuracy}%`;
  document.getElementById('res-time').innerText = `${timeTaken}s`;
  document.getElementById('res-xp').innerText = `+${xpEarned} XP`;

  // Render Reviews List
  const reviewsContainer = document.getElementById('results-reviews-container');
  reviewsContainer.innerHTML = '';
  detailedReviews.forEach((rev, idx) => {
    const div = document.createElement('div');
    div.className = 'py-5 first:pt-0';
    div.innerHTML = `
      <div class="flex items-center gap-2 mb-2">
        <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
          rev.isCorrect ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
        }">${idx + 1}</span>
        <h4 class="font-bold text-sm text-slate-800">${rev.question}</h4>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs pl-7">
        <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600">Your Answer: <span class="font-bold ${rev.isCorrect ? 'text-emerald-600' : 'text-red-600'}">${rev.selected}</span></div>
        <div class="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">Correct Answer: <span class="font-bold">${rev.correct}</span></div>
      </div>
    `;
    reviewsContainer.appendChild(div);
  });

  // Save to DB if logged in
  if (currentUser) {
    try {
      // 1. Save attempt record
      await dbRequest('quiz_attempts', {
        method: 'POST',
        body: JSON.stringify([{
          user_id: currentUser.id,
          quiz_id: currentQuiz.id,
          score: correctCount,
          accuracy: accuracy,
          time_taken: timeTaken,
          answers: detailedReviews
        }])
      });

      // 2. Update user XP/Coins
      const updatedUser = await dbRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          xp: (currentUser.xp || 0) + xpEarned,
          coins: (currentUser.coins || 0) + coinsEarned,
          streak: (currentUser.streak || 0) + 1,
        })
      });

      // Fetch refreshed user details
      const refreshedList = await dbRequest(`users?id=eq.${currentUser.id}`);
      if (refreshedList.length > 0) {
        currentUser = refreshedList[0];
        localStorage.setItem('userSession', JSON.stringify(currentUser));
        updateNavbar();
      }

      showToast('Score Saved!', `Gained +${xpEarned} XP & +${coinsEarned} Coins.`, '🏆');

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      showToast('Error saving score', 'The server could not record the attempt.', '⚠️');
    }
  } else {
    showToast('Guest Score', 'Register an account to preserve scorecards on the leaderboards!', '🔒');
  }

  // Redirect
  window.location.hash = '#results';
}

// User Dashboard View Loader
async function loadUserDashboard() {
  document.getElementById('dashboard-welcome').innerText = `Hello, ${currentUser.name || 'User'}!`;
  document.getElementById('stat-quizzes').innerText = '0';
  document.getElementById('stat-accuracy').innerText = '0%';
  document.getElementById('stat-streak').innerText = currentUser.streak || 0;
  document.getElementById('stat-xp').innerText = currentUser.xp || 0;
  document.getElementById('stat-rank').innerText = '#--';

  const tbody = document.getElementById('attempts-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-slate-500">Retrieving activity history...</td></tr>';

  try {
    // 1. Get attempts history
    const attempts = await dbRequest(`quiz_attempts?user_id=eq.${currentUser.id}&order=created_at.desc&limit=10`);
    tbody.innerHTML = '';

    if (!attempts.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-slate-500">No recent quizzes completed yet.</td></tr>';
    } else {
      document.getElementById('stat-quizzes').innerText = attempts.length;
      const avgAcc = Math.round(attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.reduce((acc, curr) => acc + (curr.answers ? curr.answers.length : 10), 0) * 100);
      document.getElementById('stat-accuracy').innerText = `${avgAcc || 0}%`;

      attempts.forEach(att => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 transition-colors';
        row.innerHTML = `
          <td class="p-4 font-bold text-slate-800">Practice Quiz</td>
          <td class="p-4 text-indigo-600 font-semibold">${att.accuracy}%</td>
          <td class="p-4 text-slate-600">${att.score} Correct</td>
          <td class="p-4 text-slate-500">${att.time_taken}s</td>
          <td class="p-4 text-slate-500">${new Date(att.created_at).toLocaleDateString()}</td>
          <td class="p-4"><button class="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-600 font-bold hover:bg-indigo-100 transition-all">Retry</button></td>
        `;
        tbody.appendChild(row);
      });
    }

    // 2. Render Accuracy Chart
    const ctx = document.getElementById('accuracyChart').getContext('2d');
    if (accuracyChart) {
      accuracyChart.destroy();
    }

    const labels = attempts.map(a => new Date(a.created_at).toLocaleDateString()).reverse();
    const dataAcc = attempts.map(a => a.accuracy).reverse();

    accuracyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Day 1', 'Day 2', 'Day 3'],
        datasets: [{
          label: 'Quiz Accuracy %',
          data: dataAcc.length ? dataAcc : [0, 0, 0],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });

  } catch (err) {
    console.error('Error loading dashboard analytics:', err);
  }
}

// Load Leaderboard list
async function loadFullLeaderboard() {
  const container = document.getElementById('full-leaderboard-list');
  container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500">Loading top ranks...</div>';

  try {
    const users = await dbRequest('users?order=xp.desc&limit=50');
    container.innerHTML = '';

    if (!users.length) {
      container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500">No leaderboard logs recorded.</div>';
      return;
    }

    users.forEach((u, idx) => {
      const isTop3 = idx < 3;
      const badge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-5 hover:bg-indigo-50 transition-colors';
      div.innerHTML = `
        <div class="flex items-center gap-4">
          <span class="w-6 text-center text-sm font-extrabold ${idx < 3 ? 'text-lg' : 'text-slate-400'}">${badge ? badge : idx + 1}</span>
          <span class="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700">${(u.name || u.username || 'U')[0].toUpperCase()}</span>
          <div>
            <p class="text-sm font-bold text-slate-800">${u.name || u.username}</p>
            <p class="text-[10px] text-slate-400">Level: ${u.level || 'Bronze'}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-indigo-600">${u.xp || 0} XP</span>
        </div>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    container.innerHTML = '<div class="p-8 text-center text-xs text-red-400">Failed to retrieve leaderboards.</div>';
  }
}

// Mock landing pages preview elements
function loadLeaderboardPreview() {
  const container = document.getElementById('landing-leaderboard-list');
  container.innerHTML = '';
  
  LEADERBOARD_PREVIEW.forEach(u => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-5 hover:bg-indigo-50 transition-colors';
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="w-6 text-center ${u.badge ? 'text-lg' : 'text-sm font-extrabold text-slate-400'}">${u.badge ? u.badge : u.rank}</span>
        <span class="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm font-bold text-indigo-700">${u.name[0]}</span>
        <div>
          <p class="text-sm font-bold text-slate-800">${u.name}</p>
          <p class="text-[10px] text-slate-400">Avg Accuracy: ${u.accuracy}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-sm font-black text-indigo-600">${u.points} XP</span>
      </div>
    `;
    container.appendChild(div);
  });
}

function loadTrendingQuizzes() {
  const container = document.getElementById('trending-quizzes-container');
  container.innerHTML = '';

  TRENDING_QUIZZES.forEach(q => {
    const card = document.createElement('div');
    card.className = 'card p-6 rounded-2xl flex flex-col justify-between transition-all';
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-600 uppercase tracking-wider">${q.category}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            q.difficulty === 'Hard' ? 'bg-red-50 text-red-600 border border-red-200' :
            q.difficulty === 'NEET' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
            q.difficulty === 'Moderate' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
            'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }">${q.difficulty}</span>
        </div>
        <h3 class="font-bold text-slate-800 leading-normal line-clamp-2 min-h-[44px]">${q.title}</h3>
        <div class="flex items-center justify-between text-slate-400 text-xs mt-6">
          <span>${q.attempts} plays</span>
          <span>Accuracy: ${q.accuracy}</span>
        </div>
      </div>
      <div class="mt-6 pt-4 border-t border-slate-100">
        <button class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-sm shadow-indigo-100">Play Now</button>
      </div>
    `;
    card.querySelector('button').onclick = () => {
      showToast('Quick Start', 'Choose this category from the showcase selection list to start.', '📚');
    };
    container.appendChild(card);
  });
}

// Setup simulated FAQ Accordion list
function loadFaqAccordion() {
  const container = document.getElementById('faq-accordion-group');
  container.innerHTML = '';

  FAQS.forEach((faq, idx) => {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-xl overflow-hidden border border-slate-200 transition-all';
    div.innerHTML = `
      <button class="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-700 hover:text-indigo-600 transition-all">
        <span>${faq.q}</span>
        <span class="text-slate-400 font-bold">+</span>
      </button>
      <div class="faq-content hidden px-5 pb-5 pt-1 text-sm text-slate-500 leading-relaxed border-t border-slate-100 bg-slate-50">
        ${faq.a}
      </div>
    `;
    const btn = div.querySelector('button');
    const content = div.querySelector('.faq-content');
    btn.onclick = () => {
      const isOpen = !content.classList.contains('hidden');
      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('#faq-accordion-group span.font-bold').forEach(s => s.innerText = '+');
      
      if (!isOpen) {
        content.classList.remove('hidden');
        btn.querySelector('span.font-bold').innerText = '−';
      }
    };
    container.appendChild(div);
  });
}

// User Dashboard edit profiles modal popup
document.getElementById('dashboard-edit-profile').onclick = () => {
  const subjects = ['Chemistry', 'Physics', 'Biology', 'Mathematics'];
  const favs = currentUser.favorite_subjects || [];
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="w-full max-w-md glass-card p-8 rounded-2xl shadow-2xl space-y-6">
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 class="text-lg font-bold text-white">Edit Profile Details</h3>
        <button id="close-profile-popup" class="p-1 text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Profile Name</label>
          <input type="text" id="edit-name" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm" value="${currentUser.name || ''}">
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bio Details</label>
          <textarea id="edit-bio" rows="3" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm">${currentUser.bio || ''}</textarea>
        </div>
      </div>
      <button id="save-profile-btn" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md">Save Changes</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-profile-popup').onclick = () => overlay.remove();

  overlay.querySelector('#save-profile-btn').onclick = async () => {
    const name = overlay.querySelector('#edit-name').value;
    const bio = overlay.querySelector('#edit-bio').value;

    try {
      await dbRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, bio })
      });

      currentUser.name = name;
      currentUser.bio = bio;
      localStorage.setItem('userSession', JSON.stringify(currentUser));
      overlay.remove();
      showToast('Profile Updated', 'Your profile details have been saved successfully.', '✓');
      loadUserDashboard();
    } catch (err) {
      showToast('Error', 'Failed to update profile settings.', '⚠️');
    }
  };
};

// Signup execution
document.getElementById('signup-form').onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  if (password.length < 6) {
    showToast('Failed to Register', 'Password must be at least 6 characters.', '🔒');
    return;
  }

  try {
    const hash = await hashPassword(password);
    
    // Check if user exists
    const checkUser = await dbRequest(`users?email=eq.${encodeURIComponent(email)}`);
    if (checkUser.length > 0) {
      showToast('Failed to Register', 'Email address is already in use.', '⚠️');
      return;
    }

    const newUser = await dbRequest('users', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify([{
        name,
        email,
        password_hash: hash,
        role: 'USER',
        coins: 100, // starting coins
        favorite_subjects: []
      }])
    });

    showToast('Registered!', 'Account created successfully! Directing to Login.', '🎉');
    window.location.hash = '#login';
  } catch (err) {
    showToast('Error', 'Failed to process signup request.', '⚠️');
  }
};

// Login execution
document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const hash = await hashPassword(password);
    const users = await dbRequest(`users?email=eq.${encodeURIComponent(email)}`);
    
    if (!users.length || users[0].password_hash !== hash) {
      showToast('Failed to Sign In', 'Incorrect email address or password.', '⚠️');
      return;
    }

    currentUser = users[0];
    localStorage.setItem('userSession', JSON.stringify(currentUser));
    
    showToast('Welcome!', `Logged in successfully as ${currentUser.name}.`, '✓');

    if (!currentUser.username) {
      document.getElementById('onboard-modal').classList.remove('hidden');
    } else {
      window.location.hash = '#dashboard';
    }
  } catch (err) {
    showToast('Error', 'Failed to sign in. Verify network connectivity.', '⚠️');
  }
};

// Mock google login
document.getElementById('google-login-btn').onclick = async () => {
  try {
    const randomId = Math.floor(Math.random() * 1000);
    const email = `google_user_${randomId}@gmail.com`;
    
    let userList = await dbRequest(`users?email=eq.${email}`);
    let user;

    if (userList.length > 0) {
      user = userList[0];
    } else {
      const resp = await dbRequest('users', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{
          name: `Google User ${randomId}`,
          email: email,
          avatar: '🧑‍💻',
          role: 'USER',
          coins: 150
        }])
      });
      user = resp[0];
    }

    currentUser = user;
    localStorage.setItem('userSession', JSON.stringify(currentUser));
    showToast('Logged in!', 'Google mock login completed successfully.', '✓');
    
    if (!currentUser.username) {
      document.getElementById('onboard-modal').classList.remove('hidden');
    } else {
      window.location.hash = '#dashboard';
    }
  } catch (err) {
    showToast('Error', 'Google auth failed.', '⚠️');
  }
};

// Onboarding submission
document.getElementById('onboard-form').onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById('onboard-username').value;
  const level = document.querySelector('input[name="onboard-level"]:checked').value;

  try {
    const check = await dbRequest(`users?username=eq.${encodeURIComponent(username)}`);
    if (check.length > 0) {
      showToast('Taken', 'This username is already claimed.', '⚠️');
      return;
    }

    await dbRequest(`users?id=eq.${currentUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        username: username,
        skill_level: level
      })
    });

    currentUser.username = username;
    currentUser.skill_level = level;
    localStorage.setItem('userSession', JSON.stringify(currentUser));
    
    document.getElementById('onboard-modal').classList.add('hidden');
    showToast('Setup Completed!', 'Welcome to the dashboard.', '✨');
    window.location.hash = '#dashboard';
  } catch (err) {
    showToast('Error', 'Failed to save onboarding settings.', '⚠️');
  }
};

// Admin Tab actions
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-slate-500">Retrieving users...</td></tr>';
  
  try {
    const users = await dbRequest('users?limit=100');
    tbody.innerHTML = '';
    
    users.forEach(u => {
      const row = document.createElement('tr');
      row.className = 'border-b border-slate-900/50 hover:bg-slate-900/10';
      row.innerHTML = `
        <td class="p-4 font-bold text-slate-200">${u.name || 'No Name'}</td>
        <td class="p-4 text-slate-400">${u.email}</td>
        <td class="p-4 text-indigo-400 font-bold">${u.xp || 0}</td>
        <td class="p-4"><span class="px-2 py-0.5 rounded text-[10px] font-bold border border-white/5 bg-slate-900/60">${u.role || 'USER'}</span></td>
        <td class="p-4 text-slate-500">${u.is_premium ? 'Yes' : 'No'}</td>
        <td class="p-4 flex gap-2">
          <button class="ban-btn px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold border border-red-500/20">Ban</button>
          <button class="upgrade-btn px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/20">Toggle Premium</button>
        </td>
      `;

      row.querySelector('.upgrade-btn').onclick = async () => {
        try {
          await dbRequest(`users?id=eq.${u.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ is_premium: !u.is_premium })
          });
          showToast('Updated', 'Premium status updated successfully.', '✓');
          loadAdminUsers();
        } catch (err) {
          showToast('Error', 'Failed to toggle premium.', '⚠️');
        }
      };

      row.querySelector('.ban-btn').onclick = async () => {
        if (confirm(`Ban user ${u.email}?`)) {
          try {
            await dbRequest(`users?id=eq.${u.id}`, { method: 'DELETE' });
            showToast('Banned', 'User account deleted.', '✓');
            loadAdminUsers();
          } catch (err) {
            showToast('Error', 'Failed to ban user.', '⚠️');
          }
        }
      };

      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-400">Failed to load users list.</td></tr>';
  }
}

// Admin Add Custom Quiz popup
document.getElementById('admin-add-quiz-btn').onclick = () => {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="w-full max-w-md glass-card p-8 rounded-2xl shadow-2xl space-y-6">
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 class="text-lg font-bold text-white">Create Practice Quiz</h3>
        <button id="close-add-quiz" class="p-1 text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Subject Name</label>
          <input type="text" id="quiz-sub-name" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm" placeholder="e.g. Chemistry (Class 12)">
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Chapter Name</label>
          <input type="text" id="quiz-chap-name" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm" placeholder="e.g. Solutions">
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Quiz Title</label>
          <input type="text" id="quiz-title" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm" placeholder="e.g. Practice Test 1">
        </div>
      </div>
      <button id="submit-quiz-btn" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md">Create Quiz</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('close-add-quiz').onclick = () => overlay.remove();

  overlay.querySelector('#submit-quiz-btn').onclick = async () => {
    const subName = overlay.querySelector('#quiz-sub-name').value;
    const chapName = overlay.querySelector('#quiz-chap-name').value;
    const qTitle = overlay.querySelector('#quiz-title').value;

    try {
      // 1. Get or create Subject
      let subList = await dbRequest(`subjects?name=eq.${encodeURIComponent(subName)}`);
      let subId = subList.length > 0 ? subList[0].id : null;
      if (!subId) {
        const subResp = await dbRequest('subjects', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ name: subName, class_grade: 12 }])
        });
        subId = subResp[0].id;
      }

      // 2. Get or create Chapter
      let chapList = await dbRequest(`chapters?subject_id=eq.${subId}&name=eq.${encodeURIComponent(chapName)}`);
      let chapId = chapList.length > 0 ? chapList[0].id : null;
      if (!chapId) {
        const chapResp = await dbRequest('chapters', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ subject_id: subId, name: chapName }])
        });
        chapId = chapResp[0].id;
      }

      // 3. Create Quiz
      await dbRequest('quizzes', {
        method: 'POST',
        body: JSON.stringify([{ chapter_id: chapId, name: qTitle }])
      });

      overlay.remove();
      showToast('Success', 'Quiz created successfully! Now you can import questions.', '✓');
    } catch (err) {
      showToast('Error', 'Failed to create quiz structure.', '⚠️');
    }
  };
};

// Admin tab controllers
const adminTabs = document.querySelectorAll('.admin-tab-btn');
adminTabs.forEach(tab => {
  tab.onclick = () => {
    adminTabs.forEach(t => {
      t.classList.remove('active', 'text-indigo-400', 'border-b-2', 'border-indigo-500');
      t.classList.add('text-slate-400');
    });
    tab.classList.add('active', 'text-indigo-400', 'border-b-2', 'border-indigo-500');
    tab.classList.remove('text-slate-400');

    document.querySelectorAll('.admin-content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`admin-tab-${tab.getAttribute('data-tab')}`).classList.remove('hidden');
  };
});

// Admin Bulk Import Logic
document.getElementById('admin-import-submit-btn').onclick = async () => {
  const jsonText = document.getElementById('admin-import-textarea').value;
  const subName = document.getElementById('admin-import-subject').value;
  const chapName = document.getElementById('admin-import-chapter').value;

  if (!jsonText || !subName || !chapName) {
    showToast('Missing Details', 'Fill all fields before import.', '⚠️');
    return;
  }

  try {
    const questions = JSON.parse(jsonText);
    
    // 1. Subject
    let subList = await dbRequest(`subjects?name=eq.${encodeURIComponent(subName)}`);
    let subId = subList.length > 0 ? subList[0].id : null;
    if (!subId) {
      const subResp = await dbRequest('subjects', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ name: subName, class_grade: 12 }])
      });
      subId = subResp[0].id;
    }

    // 2. Chapter
    let chapList = await dbRequest(`chapters?subject_id=eq.${subId}&name=eq.${encodeURIComponent(chapName)}`);
    let chapId = chapList.length > 0 ? chapList[0].id : null;
    if (!chapId) {
      const chapResp = await dbRequest('chapters', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ subject_id: subId, name: chapName }])
      });
      chapId = chapResp[0].id;
    }

    // 3. Quiz
    let quizList = await dbRequest(`quizzes?chapter_id=eq.${chapId}`);
    let quizId = quizList.length > 0 ? quizList[0].id : null;
    if (!quizId) {
      const quizResp = await dbRequest('quizzes', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ chapter_id: chapId, name: `${chapName} Practice Test` }])
      });
      quizId = quizResp[0].id;
    }

    // 4. Map and insert questions
    const mapped = questions.map(q => ({
      quiz_id: quizId,
      question: q.question,
      option_a: q.option_a || q.optionA,
      option_b: q.option_b || q.optionB,
      option_c: q.option_c || q.optionC,
      option_d: q.option_d || q.optionD,
      correct_option: q.correct_option || q.correctOption,
      difficulty: q.difficulty || 'easy'
    }));

    await dbRequest('questions', {
      method: 'POST',
      body: JSON.stringify(mapped)
    });

    showToast('Import Complete!', `Successfully seeded ${mapped.length} questions.`, '✓');
    document.getElementById('admin-import-textarea').value = '';
  } catch (err) {
    showToast('Error', 'Invalid JSON input or schema mismatch.', '⚠️');
  }
};

// Admin Publish Ad Banner
document.getElementById('admin-ad-submit-btn').onclick = async () => {
  const zone = document.getElementById('admin-ad-zone').value;
  const image = document.getElementById('admin-ad-image').value;
  const url = document.getElementById('admin-ad-url').value;

  if (!image || !url) {
    showToast('Error', 'Ad image URL and click URL are required.', '⚠️');
    return;
  }

  try {
    await dbRequest('ad_placements', {
      method: 'POST',
      body: JSON.stringify([{
        type: 'BANNER',
        image_url: image,
        click_url: url,
        zones: [zone],
        is_active: true,
        frequency: 3
      }])
    });

    showToast('Ad Published', 'Ad placement saved in database.', '✓');
    document.getElementById('admin-ad-image').value = '';
    document.getElementById('admin-ad-url').value = '';
  } catch (err) {
    showToast('Error', 'Failed to publish ad.', '⚠️');
  }
};

// Grade Filter Category chips
const filterBtns = document.querySelectorAll('.grade-filter-btn');
filterBtns.forEach(btn => {
  btn.onclick = () => {
    filterBtns.forEach(x => {
      x.className = 'grade-filter-btn px-5 py-2.5 rounded-xl border border-white/5 bg-slate-900/30 text-slate-400 font-bold text-xs uppercase';
    });
    btn.className = 'grade-filter-btn px-5 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-white font-bold text-xs uppercase';
    loadCategories(parseInt(btn.getAttribute('data-grade')));
  };
});

// Category/Trending Filters click
const trendFilters = document.querySelectorAll('.trending-filter');
trendFilters.forEach(f => {
  f.onclick = () => {
    trendFilters.forEach(x => {
      x.className = 'trending-filter px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white';
    });
    f.className = 'trending-filter active px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-lg';
    loadTrendingQuizzes(); // reload list
  };
});

// Mobile navbar overlay toggle
document.getElementById('mobile-menu-btn').onclick = () => {
  const overlay = document.getElementById('mobile-menu-overlay');
  overlay.classList.toggle('hidden');
  
  // Fill mobile menu auth actions dynamically
  const authDiv = document.getElementById('mobile-menu-auth');
  if (currentUser) {
    authDiv.innerHTML = `
      <a href="#dashboard" class="text-lg font-bold text-indigo-400">Dashboard</a>
      <button id="mobile-logout-btn" class="w-full text-left text-lg font-bold text-red-400">Sign Out</button>
    `;
    authDiv.querySelector('#mobile-logout-btn').onclick = () => {
      currentUser = null;
      localStorage.removeItem('userSession');
      updateNavbar();
      window.location.hash = '#home';
    };
  } else {
    authDiv.innerHTML = `
      <a href="#login" class="text-lg font-bold text-slate-350 hover:text-white">Login</a>
      <a href="#signup" class="text-lg font-bold text-white bg-indigo-600 py-2.5 text-center rounded-xl">Sign Up</a>
    `;
  }
};

// Initial setup
window.onhashchange = handleRouting;
window.onload = () => {
  initAuth();
  handleRouting();
  loadFaqAccordion();
  runHeroSimulator();
  
  // Initialize Lucide Icons
  lucide.createIcons();
};

