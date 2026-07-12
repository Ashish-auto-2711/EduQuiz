import { createClient } from 'https://esm.sh/@insforge/sdk@1.4.4';

const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app/api/database/records';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

const insforge = createClient({
  baseUrl: 'https://c43du8wy.us-east.insforge.app',
  anonKey: INSFORGE_KEY
});

// Admin emails — these always get SUPER_ADMIN role
const ADMIN_EMAILS = ['ak0002711@gmail.com'];

// Token state
let accessToken = null;

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
    'Authorization': accessToken ? `Bearer ${accessToken}` : `Bearer ${INSFORGE_KEY}`,
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
  } else if (hash.startsWith('#categories')) {
    document.getElementById('categories-view').classList.add('active');
    loadCategoriesView();
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
    if (window.adminRefreshContent) {
      window.adminRefreshContent();
    }
  }

  // Update navbar layout
  updateNavbar();
}

// Initialize Auth Session
async function initAuth() {
  try {
    // Check URL parameters for reset password redirect from InsForge
    const params = new URLSearchParams(window.location.search);
    if (params.get('insforge_status') === 'ready' && params.get('insforge_type') === 'reset_password') {
      const token = params.get('token');
      const email = params.get('email');
      openResetPasswordModal(token, email);
    }

    const { data, error } = await insforge.auth.getCurrentUser();
    if (data && data.user) {
      const authUser = data.user;
      accessToken = data.accessToken || null;
      
      // Fetch public profile
      const users = await dbRequest(`users?id=eq.${authUser.id}`);
      if (users && users.length > 0) {
        currentUser = users[0];
        if (ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
          currentUser.role = 'SUPER_ADMIN';
        }
      } else {
        // Create public profile if it doesn't exist
        const isAdmin = ADMIN_EMAILS.includes(authUser.email.toLowerCase());
        const name = authUser.name || authUser.email.split('@')[0];
        const resp = await dbRequest('users', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{
            id: authUser.id,
            name: name,
            email: authUser.email,
            role: isAdmin ? 'SUPER_ADMIN' : 'USER',
            coins: isAdmin ? 9999 : 100,
            favorite_subjects: []
          }])
        });
        currentUser = resp[0];
      }
      
      localStorage.setItem('userSession', JSON.stringify(currentUser));
      if (!currentUser.username) {
        document.getElementById('onboard-modal').classList.remove('hidden');
      }
    } else {
      currentUser = null;
      accessToken = null;
      localStorage.removeItem('userSession');
    }
  } catch (err) {
    console.error('Session restoration failed:', err);
    currentUser = null;
    accessToken = null;
  }
  updateNavbar();
}

// Update navbar elements
function updateNavbar() {
  const loggedOut = document.getElementById('logged-out-actions');
  const loggedIn = document.getElementById('logged-in-actions');
  const adminBadge = document.getElementById('nav-admin-badge');

  if (currentUser) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    
    const profileInitial = document.getElementById('nav-profile-initial');
    const profileImg = document.getElementById('nav-profile-img');
    if (profileInitial && profileImg) {
      profileInitial.innerText = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
      if (currentUser.avatar) {
        profileImg.src = currentUser.avatar;
        profileImg.classList.remove('hidden');
        profileInitial.classList.add('hidden');
      } else {
        profileImg.classList.add('hidden');
        profileInitial.classList.remove('hidden');
      }
    }

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

// Render the dedicated Categories view page
async function loadCategoriesView() {
  // Parse query params to see if a class was pre-selected (e.g. #categories?class=12)
  const hash = window.location.hash;
  const match = hash.match(/\?class=([a-zA-Z0-9_-]+)/);
  const preSelectedClass = match ? (isNaN(match[1]) ? match[1] : parseInt(match[1])) : null;

  // Render or highlight active class
  if (preSelectedClass !== null) {
    selectClassForBrowse(preSelectedClass);
  } else {
    // If no preselected class, hide subjects and chapters showcase
    document.getElementById('browse-subjects-section').classList.add('hidden');
    document.getElementById('browse-chapters-section').classList.add('hidden');
    
    // Reset all class card styling
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'JEE', 'NEET', 'Govt', 'GK'].forEach(g => {
      const card = document.getElementById(`class-browse-${g}`);
      if (card) {
        card.className = 'card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all border-slate-200';
      }
    });
  }
}

// Global functions exposed to window since they are referenced in HTML onclick attributes
window.selectClassForBrowse = async function(grade) {
  // Highlight chosen class card
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'JEE', 'NEET', 'Govt', 'GK'].forEach(g => {
    const card = document.getElementById(`class-browse-${g}`);
    if (!card) return;
    if (g === grade) {
      card.className = 'card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer border-2 border-indigo-600 bg-indigo-50/30 hover:shadow-md transition-all';
    } else {
      card.className = 'card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all border-slate-200';
    }
  });

  const subjectsTitle = document.getElementById('browse-subjects-title');
  const subjectsGrid = document.getElementById('browse-subjects-grid');
  const subjectsSection = document.getElementById('browse-subjects-section');
  const chaptersSection = document.getElementById('browse-chapters-section');

  // Hide chapters list first when switching class
  chaptersSection.classList.add('hidden');

  subjectsTitle.innerText = `Subjects in ${typeof grade === 'number' ? 'Class ' + grade : grade}`;
  subjectsGrid.innerHTML = '<div class="col-span-full text-center text-xs text-slate-500 py-8">Loading subjects...</div>';
  subjectsSection.classList.remove('hidden');
  
  // Smooth scroll to subjects
  setTimeout(() => {
    subjectsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);

  try {
    let subjects = [];
    if (grade === 1 || grade === 2) {
      subjects = [
        { id: `mock-sub-${grade}-math`, name: `Mathematics (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-eng`, name: `English Grammar (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-evs`, name: `Environmental Studies (Class ${grade})`, isMock: true }
      ];
    } else if (grade >= 3 && grade <= 5) {
      subjects = [
        { id: `mock-sub-${grade}-math`, name: `Mathematics (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-sci`, name: `General Science (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-ss`, name: `Social Studies (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-eng`, name: `English Grammar (Class ${grade})`, isMock: true }
      ];
    } else if (grade >= 6 && grade <= 8) {
      subjects = [
        { id: `mock-sub-${grade}-math`, name: `Mathematics (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-sci`, name: `Science (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-ss`, name: `Social Science (Class ${grade})`, isMock: true },
        { id: `mock-sub-${grade}-eng`, name: `English (Class ${grade})`, isMock: true }
      ];
    } else if (grade === 'Govt') {
      subjects = [
        { id: 'mock-sub-govt-apt', name: 'Quantitative Aptitude (Govt)', isMock: true },
        { id: 'mock-sub-govt-reason', name: 'Logical Reasoning (Govt)', isMock: true },
        { id: 'mock-sub-govt-gk', name: 'General Awareness (Govt)', isMock: true }
      ];
    } else if (grade === 'GK') {
      subjects = [
        { id: 'mock-sub-gk-hist', name: 'World History (GK)', isMock: true },
        { id: 'mock-sub-gk-geo', name: 'Geography & Places (GK)', isMock: true },
        { id: 'mock-sub-gk-curr', name: 'Current Affairs (GK)', isMock: true }
      ];
    } else {
      // Fetch Class 9, 10, 11, 12 or JEE, NEET from database
      const allSubjects = await dbRequest('subjects?limit=100');
      if (grade === 'JEE') {
        subjects = allSubjects.filter(s => (s.name.includes('Class 11') || s.name.includes('Class 12')) && (s.name.includes('Physics') || s.name.includes('Chemistry') || s.name.includes('Mathematics')));
        if (!subjects.length) {
          subjects = [
            { id: 'mock-sub-jee-math', name: 'JEE Mathematics (JEE)', isMock: true },
            { id: 'mock-sub-jee-phys', name: 'JEE Physics (JEE)', isMock: true },
            { id: 'mock-sub-jee-chem', name: 'JEE Chemistry (JEE)', isMock: true }
          ];
        }
      } else if (grade === 'NEET') {
        subjects = allSubjects.filter(s => (s.name.includes('Class 11') || s.name.includes('Class 12')) && (s.name.includes('Physics') || s.name.includes('Chemistry') || s.name.includes('Biology')));
        if (!subjects.length) {
          subjects = [
            { id: 'mock-sub-neet-bio', name: 'NEET Biology (NEET)', isMock: true },
            { id: 'mock-sub-neet-phys', name: 'NEET Physics (NEET)', isMock: true },
            { id: 'mock-sub-neet-chem', name: 'NEET Chemistry (NEET)', isMock: true }
          ];
        }
      } else {
        subjects = allSubjects.filter(s => s.name.includes(`Class ${grade}`));
        if (!subjects.length) {
          // Fallback mock subjects for these classes
          subjects = [
            { id: `mock-sub-${grade}-math`, name: `Mathematics (Class ${grade})`, isMock: true },
            { id: `mock-sub-${grade}-phys`, name: `Physics (Class ${grade})`, isMock: true },
            { id: `mock-sub-${grade}-chem`, name: `Chemistry (Class ${grade})`, isMock: true },
            { id: `mock-sub-${grade}-bio`, name: `Biology (Class ${grade})`, isMock: true }
          ];
        }
      }
    }

    subjectsGrid.innerHTML = '';
    
    if (!subjects.length) {
      subjectsGrid.innerHTML = '<div class="col-span-full text-center text-xs text-slate-500 py-8 font-semibold">No subjects available for Class ' + grade + ' yet. Seeder is running in background...</div>';
      return;
    }

    const colors = [
      'from-blue-600 to-indigo-600',
      'from-purple-600 to-pink-600',
      'from-emerald-600 to-teal-600',
      'from-amber-600 to-orange-600'
    ];

    subjects.forEach((sub, idx) => {
      const color = colors[idx % colors.length];
      const nameWithoutClass = sub.name.split(' (Class')[0].split(' (JEE')[0].split(' (NEET')[0].split(' (Govt')[0].split(' (GK')[0];
      
      const card = document.createElement('div');
      card.className = 'card p-6 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all border border-slate-200 hover:border-indigo-300 hover:shadow-md';
      card.innerHTML = `
        <div>
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-6 group-hover:scale-105 transition-all shadow-md">
            📚
          </div>
          <h3 class="text-base font-bold text-slate-800">${nameWithoutClass}</h3>
          <p class="text-slate-400 text-xs mt-1.5">View practice chapters</p>
        </div>
        <div class="mt-8 flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:text-indigo-700">
          Browse Chapters <span class="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      `;
      card.onclick = () => selectSubjectForBrowse(sub, grade);
      subjectsGrid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    subjectsGrid.innerHTML = '<div class="col-span-full text-center text-xs text-red-500 py-8">Failed to load subjects.</div>';
  }
};

window.selectSubjectForBrowse = async function(subject, grade) {
  const chaptersTitle = document.getElementById('browse-chapters-title');
  const chaptersGrid = document.getElementById('browse-chapters-grid');
  const chaptersSection = document.getElementById('browse-chapters-section');

  const cleanSubjectName = subject.name.split(' (Class')[0].split(' (JEE')[0].split(' (NEET')[0].split(' (Govt')[0].split(' (GK')[0];
  chaptersTitle.innerText = `${cleanSubjectName} (${grade}) Chapters`;
  chaptersGrid.innerHTML = '<div class="col-span-full text-center text-xs text-slate-500 py-8">Loading chapters...</div>';
  chaptersSection.classList.remove('hidden');

  // Smooth scroll to chapters
  setTimeout(() => {
    chaptersSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);

  try {
    let chapters = [];
    if (subject.isMock) {
      const subId = subject.id;
      if (subId.endsWith('-math')) {
        chapters = [
          { id: subId + '-chap-1', name: 'Foundational Numbers & Logic', subject_id: subId, isMock: true },
          { id: subId + '-chap-2', name: 'Basic Operations & Arithmetic', subject_id: subId, isMock: true },
          { id: subId + '-chap-3', name: 'Practice Test Problems', subject_id: subId, isMock: true }
        ];
      } else if (subId.endsWith('-sci') || subId.endsWith('-evs') || subId.endsWith('-phys') || subId.endsWith('-chem') || subId.endsWith('-bio')) {
        chapters = [
          { id: subId + '-chap-1', name: 'Introduction to Core Concepts', subject_id: subId, isMock: true },
          { id: subId + '-chap-2', name: 'Experimental Observation Exercises', subject_id: subId, isMock: true },
          { id: subId + '-chap-3', name: 'High-Yield Board Questions', subject_id: subId, isMock: true }
        ];
      } else if (subId.endsWith('-ss') || subId.endsWith('-social')) {
        chapters = [
          { id: subId + '-chap-1', name: 'Historical Overview & Timeline', subject_id: subId, isMock: true },
          { id: subId + '-chap-2', name: 'Geography & Local Environments', subject_id: subId, isMock: true }
        ];
      } else if (subId.endsWith('-eng')) {
        chapters = [
          { id: subId + '-chap-1', name: 'Nouns, Verbs & Grammar Rules', subject_id: subId, isMock: true },
          { id: subId + '-chap-2', name: 'Reading Comprehension Drills', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('govt-apt')) {
        chapters = [
          { id: 'mock-chap-17', name: 'Percentage & Average', subject_id: subId, isMock: true },
          { id: 'mock-chap-18', name: 'Time and Work', subject_id: subId, isMock: true },
          { id: 'mock-chap-19', name: 'Profit and Loss', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('govt-reason')) {
        chapters = [
          { id: 'mock-chap-20', name: 'Number Series & Coding', subject_id: subId, isMock: true },
          { id: 'mock-chap-21', name: 'Blood Relations', subject_id: subId, isMock: true },
          { id: 'mock-chap-22', name: 'Syllogisms', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('govt-gk')) {
        chapters = [
          { id: 'mock-chap-23', name: 'Indian Constitution', subject_id: subId, isMock: true },
          { id: 'mock-chap-24', name: 'Economic Sectors', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('gk-hist')) {
        chapters = [
          { id: 'mock-chap-25', name: 'Ancient Civilizations', subject_id: subId, isMock: true },
          { id: 'mock-chap-26', name: 'World War Battles', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('gk-geo')) {
        chapters = [
          { id: 'mock-chap-27', name: 'Continents & Oceans', subject_id: subId, isMock: true },
          { id: 'mock-chap-28', name: 'Famous Capitals & Flags', subject_id: subId, isMock: true }
        ];
      } else if (subId.includes('gk-curr')) {
        chapters = [
          { id: 'mock-chap-29', name: 'Global News & Awards', subject_id: subId, isMock: true },
          { id: 'mock-chap-30', name: 'Science & Tech Updates', subject_id: subId, isMock: true }
        ];
      } else {
        chapters = [
          { id: `mock-chap-sub-${subId}-1`, name: 'Foundational Concept Chapter 1', subject_id: subId, isMock: true },
          { id: `mock-chap-sub-${subId}-2`, name: 'Advanced Revision Chapter 2', subject_id: subId, isMock: true }
        ];
      }
    } else {
      chapters = await dbRequest(`chapters?subject_id=eq.${subject.id}&order=name.asc&limit=100`);
      if (!chapters.length) {
        // Fallback for real subject if no chapters found yet
        chapters = [
          { id: `mock-chap-sub-${subject.id}-1`, name: 'Mock Chapter: Introduction & Overview', subject_id: subject.id, isMock: true },
          { id: `mock-chap-sub-${subject.id}-2`, name: 'Mock Chapter: Core Practice Exercises', subject_id: subject.id, isMock: true }
        ];
      }
    }
    chaptersGrid.innerHTML = '';

    chapters.forEach(chap => {
      const card = document.createElement('div');
      card.className = 'card p-4 rounded-xl flex items-center justify-between group cursor-pointer transition-all border border-slate-200 hover:border-indigo-300';
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">📖</span>
          <div>
            <h4 class="font-bold text-sm text-slate-850 group-hover:text-indigo-600 transition-colors">${chap.name}</h4>
            <p class="text-[10px] text-slate-400 mt-0.5">Click to configure test parameters</p>
          </div>
        </div>
        <span class="text-indigo-500 font-bold text-xs group-hover:translate-x-1 transition-transform">Configure →</span>
      `;
      card.onclick = () => launchQuizConfig(chap);
      chaptersGrid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    chaptersGrid.innerHTML = '<div class="col-span-full text-center text-xs text-red-500 py-8">Failed to load chapters.</div>';
  }
};

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
    let quizzes = [];
    let questions = [];

    if (chapter.isMock) {
      quizzes = [{ id: 'mock-quiz', name: chapter.name }];
      questions = [
        { id: 'mock-q1', question: `Which of the following is correct regarding "${chapter.name}"?`, option_a: 'Option A (Recommended Correct)', option_b: 'Option B', option_c: 'Option C', option_d: 'Option D', correct_option: 'A', difficulty: 'easy' },
        { id: 'mock-q2', question: `What is the primary objective of "${chapter.name}" study?`, option_a: 'To memorize facts', option_b: 'To test conceptual and application clarity', option_c: 'To bypass RLS', option_d: 'None of the above', correct_option: 'B', difficulty: 'moderate' },
        { id: 'mock-q3', question: `Identify the main equation/theory related to "${chapter.name}".`, option_a: 'Option X', option_b: 'Option Y', option_c: 'Theory Z (Proven)', option_d: 'Theory W', correct_option: 'C', difficulty: 'hard' }
      ];
    } else {
      quizzes = await dbRequest(`quizzes?chapter_id=eq.${chapter.id}`);
      if (!quizzes.length) {
        // Fallback mock questions so it never fails or blocks the user!
        quizzes = [{ id: `mock-quiz-${chapter.id}`, name: chapter.name }];
        questions = [
          { id: 'mock-q1', question: `Which of the following is correct regarding "${chapter.name}"?`, option_a: 'Option A (Recommended Correct)', option_b: 'Option B', option_c: 'Option C', option_d: 'Option D', correct_option: 'A', difficulty: 'easy' },
          { id: 'mock-q2', question: `What is the primary objective of "${chapter.name}" study?`, option_a: 'To memorize facts', option_b: 'To test conceptual and application clarity', option_c: 'To bypass RLS', option_d: 'None of the above', correct_option: 'B', difficulty: 'moderate' },
          { id: 'mock-q3', question: `Identify the main equation/theory related to "${chapter.name}".`, option_a: 'Option X', option_b: 'Option Y', option_c: 'Theory Z (Proven)', option_d: 'Theory W', correct_option: 'C', difficulty: 'hard' }
        ];
      } else {
        questions = await dbRequest(`questions?quiz_id=eq.${quizzes[0].id}`);
        if (!questions.length) {
          questions = [
            { id: 'mock-q1', question: `Which of the following is correct regarding "${chapter.name}"?`, option_a: 'Option A (Recommended Correct)', option_b: 'Option B', option_c: 'Option C', option_d: 'Option D', correct_option: 'A', difficulty: 'easy' }
          ];
        }
      }
    }

    const quiz = quizzes[0];

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

    overlay.appendChild(content);
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
  
  const dashInitial = document.getElementById('dashboard-avatar-initial');
  const dashImg = document.getElementById('dashboard-avatar-img');
  if (dashInitial && dashImg) {
    dashInitial.innerText = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
    if (currentUser.avatar) {
      dashImg.src = currentUser.avatar;
      dashImg.classList.remove('hidden');
      dashInitial.classList.add('hidden');
    } else {
      dashImg.classList.add('hidden');
      dashInitial.classList.remove('hidden');
    }
  }

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

  // Reset and hide podium items initially
  const p1 = document.getElementById('podium-rank-1');
  const p2 = document.getElementById('podium-rank-2');
  const p3 = document.getElementById('podium-rank-3');
  const b1 = document.getElementById('podium-bar-1');
  const b2 = document.getElementById('podium-bar-2');
  const b3 = document.getElementById('podium-bar-3');

  if (p1) p1.classList.add('hidden');
  if (p2) p2.classList.add('hidden');
  if (p3) p3.classList.add('hidden');
  if (b1) b1.style.height = '0px';
  if (b2) b2.style.height = '0px';
  if (b3) b3.style.height = '0px';

  try {
    const users = await dbRequest('users?order=xp.desc&limit=100');
    container.innerHTML = '';

    if (!users.length) {
      container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500">No leaderboard logs recorded yet. Be the first to take a quiz!</div>';
      return;
    }

    const setPodiumAvatar = (elementId, avatar) => {
      const el = document.getElementById(elementId);
      if (!el) return;
      if (avatar && avatar.length > 5) {
        el.innerHTML = `<img src="${avatar}" class="w-full h-full object-cover rounded-full">`;
      } else {
        el.innerHTML = avatar || '🧑‍🎓';
      }
    };

    // Populate Podium 1st, 2nd, 3rd
    if (users[0] && p1 && b1) {
      const u = users[0];
      document.getElementById('podium-name-1').innerText = u.name || u.username || 'Student';
      document.getElementById('podium-score-1').innerText = `${u.xp || 0} ⭐`;
      setPodiumAvatar('podium-avatar-1', u.avatar);
      p1.classList.remove('hidden');
      setTimeout(() => {
        b1.style.height = '150px';
      }, 50);
    }
    
    if (users[1] && p2 && b2) {
      const u = users[1];
      document.getElementById('podium-name-2').innerText = u.name || u.username || 'Student';
      document.getElementById('podium-score-2').innerText = `${u.xp || 0} ⭐`;
      setPodiumAvatar('podium-avatar-2', u.avatar);
      p2.classList.remove('hidden');
      setTimeout(() => {
        b2.style.height = '110px';
      }, 100);
    }

    if (users[2] && p3 && b3) {
      const u = users[2];
      document.getElementById('podium-name-3').innerText = u.name || u.username || 'Student';
      document.getElementById('podium-score-3').innerText = `${u.xp || 0} ⭐`;
      setPodiumAvatar('podium-avatar-3', u.avatar);
      p3.classList.remove('hidden');
      setTimeout(() => {
        b3.style.height = '80px';
      }, 150);
    }

    // Render list for rank 4 and below
    const restUsers = users.slice(3);
    if (restUsers.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-xs text-slate-400 italic">No other users registered. Invite your friends!</div>';
      return;
    }

    restUsers.forEach((u, idx) => {
      const rank = idx + 4;
      const avatarHtml = u.avatar && u.avatar.length > 5
        ? `<img src="${u.avatar}" class="w-full h-full object-cover rounded-full">`
        : u.avatar || '🧑‍🎓';
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-4 hover:bg-slate-50 transition-colors';
      div.innerHTML = `
        <div class="flex items-center gap-4">
          <span class="w-6 text-center text-xs font-extrabold text-slate-400">#${rank}</span>
          <span class="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 overflow-hidden">${avatarHtml}</span>
          <div>
            <p class="text-sm font-bold text-slate-800">${u.name || u.username}</p>
            <p class="text-[10px] text-slate-400">Level: ${u.level || 'Bronze'}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-slate-700">${u.xp || 0} ⭐</span>
        </div>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
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
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
  
  let selectedAvatar = currentUser.avatar || '';
  const emojis = ['🧑‍🎓', '🦊', '🦁', '🐯', '🐼', '🐨', '🦄', '🚀', '🩺', '🧪'];
  
  // Create beautiful emoji chips HTML
  let emojiHtml = '';
  emojis.forEach(emo => {
    const isActive = (selectedAvatar === emo) || (!selectedAvatar && emo === '🧑‍🎓');
    const activeClass = isActive ? 'border-indigo-500 bg-indigo-900/40 scale-110 text-xl shadow-md' : 'border-white/5 bg-slate-900/60 hover:border-indigo-400 hover:bg-slate-900/80 text-lg';
    emojiHtml += `<button type="button" class="avatar-chip w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${activeClass}" data-avatar="${emo}">${emo}</button>`;
  });

  const previewHtml = selectedAvatar && selectedAvatar.length > 5 
    ? `<img id="edit-avatar-preview-img" src="${selectedAvatar}" class="w-14 h-14 rounded-full object-cover border-2 border-indigo-500">`
    : `<span id="edit-avatar-preview-text" class="w-14 h-14 rounded-full bg-indigo-900/50 text-white border-2 border-indigo-500 flex items-center justify-center text-2xl font-black">${selectedAvatar || '🧑‍🎓'}</span>`;

  overlay.innerHTML = `
    <div class="w-full max-w-md glass-card p-8 rounded-2xl shadow-2xl space-y-6 text-left">
      <div class="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 class="text-lg font-bold text-white">Edit Profile Details</h3>
        <button id="close-profile-popup" class="p-1 text-slate-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-4">
        <!-- Avatar Section -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Profile Avatar</label>
          <div class="flex items-center gap-4 mb-4">
            <div id="edit-avatar-preview-container" class="shrink-0 flex items-center justify-center">
              ${previewHtml}
            </div>
            <div class="space-y-1.5">
              <button type="button" id="trigger-avatar-upload" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20">Upload Custom Image</button>
              <input type="file" id="edit-avatar-upload" class="hidden" accept="image/*">
              <p class="text-[10px] text-slate-500">Supports PNG, JPG, or WEBP up to 2MB.</p>
            </div>
          </div>
          
          <div class="grid grid-cols-5 gap-2 mt-2">
            ${emojiHtml}
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Profile Name</label>
          <input type="text" id="edit-name" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm focus:border-indigo-500 focus:outline-none" value="${currentUser.name || ''}">
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bio Details</label>
          <textarea id="edit-bio" rows="3" class="block w-full px-4 py-3 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm focus:border-indigo-500 focus:outline-none">${currentUser.bio || ''}</textarea>
        </div>
      </div>
      <button id="save-profile-btn" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-md transition-all">Save Changes</button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('close-profile-popup').onclick = () => overlay.remove();

  // Emoji chips interactive selection
  const chips = overlay.querySelectorAll('.avatar-chip');
  chips.forEach(c => {
    c.onclick = () => {
      chips.forEach(x => {
        x.className = 'avatar-chip w-10 h-10 rounded-xl border flex items-center justify-center transition-all border-white/5 bg-slate-900/60 hover:border-indigo-400 hover:bg-slate-900/80 text-lg';
      });
      c.className = 'avatar-chip w-10 h-10 rounded-xl border flex items-center justify-center transition-all border-indigo-500 bg-indigo-900/40 scale-110 text-xl shadow-md';
      selectedAvatar = c.getAttribute('data-avatar');
      
      // Update preview to show selected emoji
      document.getElementById('edit-avatar-preview-container').innerHTML = `
        <span id="edit-avatar-preview-text" class="w-14 h-14 rounded-full bg-indigo-900/50 text-white border-2 border-indigo-500 flex items-center justify-center text-2xl font-black">${selectedAvatar}</span>
      `;
    };
  });

  // Custom Image File upload reader
  const fileInput = overlay.querySelector('#edit-avatar-upload');
  overlay.querySelector('#trigger-avatar-upload').onclick = () => fileInput.click();
  
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('File Too Large', 'Please select an image smaller than 2MB.', '⚠️');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      selectedAvatar = reader.result; // base64 representation
      
      // Update preview to show custom image
      document.getElementById('edit-avatar-preview-container').innerHTML = `
        <img id="edit-avatar-preview-img" src="${selectedAvatar}" class="w-14 h-14 rounded-full object-cover border-2 border-indigo-500">
      `;
      // Deselect emoji chips
      chips.forEach(x => {
        x.className = 'avatar-chip w-10 h-10 rounded-xl border flex items-center justify-center transition-all border-white/5 bg-slate-900/60 hover:border-indigo-400 hover:bg-slate-900/80 text-lg';
      });
    };
    reader.readAsDataURL(file);
  };

  overlay.querySelector('#save-profile-btn').onclick = async () => {
    const name = overlay.querySelector('#edit-name').value;
    const bio = overlay.querySelector('#edit-bio').value;

    try {
      await dbRequest(`users?id=eq.${currentUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, bio, avatar: selectedAvatar })
      });

      currentUser.name = name;
      currentUser.bio = bio;
      currentUser.avatar = selectedAvatar;
      localStorage.setItem('userSession', JSON.stringify(currentUser));
      overlay.remove();
      showToast('Profile Updated', 'Your profile details have been saved successfully.', '✓');
      updateNavbar();
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
    alert('Password must be at least 6 characters.');
    return;
  }

  try {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name
    });

    if (error) {
      alert(`Registration failed: ${error.message}`);
      return;
    }

    const authUser = data.user;
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    // Create record in public.users table linked to authUser.id
    await dbRequest('users', {
      method: 'POST',
      body: JSON.stringify([{
        id: authUser.id,
        name,
        email,
        role: isAdmin ? 'SUPER_ADMIN' : 'USER',
        coins: isAdmin ? 9999 : 100,
        favorite_subjects: []
      }])
    });

    alert('Registration successful! Please login.');
    window.location.hash = '#login';
  } catch (err) {
    console.error('Signup error:', err);
    alert('Registration failed. Please try again.');
  }
};

// Login execution
document.getElementById('login-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(`Login failed: ${error.message || 'Incorrect email or password'}`);
      return;
    }

    const authUser = data.user;
    accessToken = data.accessToken;
    
    // Fetch details from users table
    const users = await dbRequest(`users?id=eq.${authUser.id}`);
    if (users && users.length > 0) {
      currentUser = users[0];
      if (ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
        currentUser.role = 'SUPER_ADMIN';
      }
    } else {
      // Fallback: create public profile if missing
      const isAdmin = ADMIN_EMAILS.includes(authUser.email.toLowerCase());
      const name = authUser.name || authUser.email.split('@')[0];
      const resp = await dbRequest('users', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{
          id: authUser.id,
          name: name,
          email: authUser.email,
          role: isAdmin ? 'SUPER_ADMIN' : 'USER',
          coins: isAdmin ? 9999 : 100,
          favorite_subjects: []
        }])
      });
      currentUser = resp[0];
    }

    localStorage.setItem('userSession', JSON.stringify(currentUser));
    updateNavbar();

    if (!currentUser.username) {
      document.getElementById('onboard-modal').classList.remove('hidden');
    } else {
      window.location.hash = currentUser.role === 'SUPER_ADMIN' ? '#admin' : '#dashboard';
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('An error occurred during login. Please try again.');
  }
};

// Real Google OAuth redirect via InsForge Auth
document.getElementById('google-login-btn').onclick = async () => {
  try {
    const { data, error } = await insforge.auth.signInWithOAuth('google', {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) {
      alert(`Google Sign-In failed: ${error.message}`);
    }
  } catch (err) {
    console.error('Google OAuth init error:', err);
  }
};

// Forgot Password execution
document.getElementById('forgot-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value;

  try {
    const { error } = await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      alert(`Error sending reset link: ${error.message}`);
    } else {
      alert('Password reset instructions have been sent to your email.');
      window.location.hash = '#login';
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    alert('Failed to send reset email.');
  }
};

// Dynamic reset password modal popup
function openResetPasswordModal(token, email) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl p-8 shadow-2xl w-full max-w-md space-y-6 border border-slate-200">
      <div class="text-center">
        <h3 class="font-bold text-slate-900 text-lg">Create New Password</h3>
        <p class="text-slate-500 text-xs mt-1">Please enter your new password below.</p>
      </div>
      <form id="reset-password-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Password</label>
          <input type="password" id="reset-new-password" required minlength="6" class="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Minimum 6 characters">
        </div>
        <button type="submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-100">Reset Password</button>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#reset-password-form').onsubmit = async (e) => {
    e.preventDefault();
    const newPassword = overlay.querySelector('#reset-new-password').value;
    try {
      const { error } = await insforge.auth.resetPassword({
        newPassword,
        otp: token
      });
      if (error) {
        alert(`Failed to reset password: ${error.message}`);
      } else {
        alert('Password has been reset successfully! Please sign in with your new password.');
        overlay.remove();
        // Clean URL parameter search queries
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.hash = '#login';
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred. Please try again.');
    }
  };
}

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
      t.className = 'admin-tab-btn pb-3 px-4 text-sm font-semibold text-slate-400 border-b-2 border-transparent hover:text-slate-700';
    });
    tab.className = 'admin-tab-btn pb-3 px-4 text-sm font-bold text-indigo-600 border-b-2 border-indigo-600';

    document.querySelectorAll('.admin-panel').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const activePanel = document.getElementById(`admin-tab-${tab.getAttribute('data-tab')}`);
    if (activePanel) {
      activePanel.classList.add('active');
      activePanel.classList.remove('hidden');
    }
  };
});

// Admin Content Manager Handlers
window.adminRefreshContent = async function() {
  const subContainer = document.getElementById('admin-subjects-list');
  const chapContainer = document.getElementById('admin-chapters-list');
  if (!subContainer) return;

  subContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">Loading subjects...</div>';
  chapContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">Select a subject on the left to view and manage its chapters.</div>';

  try {
    const subjects = await dbRequest('subjects?order=name.asc&limit=100');
    subContainer.innerHTML = '';

    if (!subjects.length) {
      subContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">No subjects found.</div>';
      return;
    }

    subjects.forEach(sub => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 border-b border-slate-100/50 hover:bg-slate-55 transition-colors cursor-pointer';
      div.innerHTML = `
        <span class="text-xs font-bold text-slate-700 truncate max-w-[150px]">${sub.name}</span>
        <div class="flex items-center gap-2">
          <button class="view-chaps-btn px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-all">Chapters</button>
          <button class="delete-sub-btn px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all">Delete</button>
        </div>
      `;

      // Click event for viewing chapters
      div.querySelector('.view-chaps-btn').onclick = (e) => {
        e.stopPropagation();
        adminLoadChapters(sub);
      };
      
      // Click event for deleting subject
      div.querySelector('.delete-sub-btn').onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Delete subject "${sub.name}" and all its chapters/quizzes?`)) {
          try {
            await dbRequest(`subjects?id=eq.${sub.id}`, { method: 'DELETE' });
            showToast('Deleted', 'Subject successfully removed.', '✓');
            window.adminRefreshContent();
          } catch (err) {
            showToast('Error', 'Failed to delete subject.', '⚠️');
          }
        }
      };

      subContainer.appendChild(div);
    });
  } catch (err) {
    subContainer.innerHTML = '<div class="text-xs text-red-500 py-4 text-center">Error loading subjects.</div>';
  }
};

async function adminLoadChapters(subject) {
  const chapContainer = document.getElementById('admin-chapters-list');
  if (!chapContainer) return;

  chapContainer.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Loading chapters for ${subject.name}...</div>`;

  try {
    const chapters = await dbRequest(`chapters?subject_id=eq.${subject.id}&order=name.asc&limit=100`);
    chapContainer.innerHTML = '';

    if (!chapters.length) {
      chapContainer.innerHTML = '<div class="text-xs text-slate-500 py-4 text-center">No chapters found for this subject.</div>';
      return;
    }

    chapters.forEach(chap => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 border-b border-slate-100/50 hover:bg-slate-55 transition-colors';
      div.innerHTML = `
        <span class="text-xs font-bold text-slate-700 truncate max-w-[150px]">${chap.name}</span>
        <button class="delete-chap-btn px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all">Delete</button>
      `;

      // Click event for deleting chapter
      div.querySelector('.delete-chap-btn').onclick = async () => {
        if (confirm(`Delete chapter "${chap.name}"?`)) {
          try {
            await dbRequest(`chapters?id=eq.${chap.id}`, { method: 'DELETE' });
            showToast('Deleted', 'Chapter successfully removed.', '✓');
            adminLoadChapters(subject);
          } catch (err) {
            showToast('Error', 'Failed to delete chapter.', '⚠️');
          }
        }
      };

      chapContainer.appendChild(div);
    });
  } catch (err) {
    chapContainer.innerHTML = '<div class="text-xs text-red-500 py-4 text-center">Error loading chapters.</div>';
  }
}

// Bind refresh button in content manager
const refreshBtn = document.getElementById('admin-refresh-content-btn');
if (refreshBtn) {
  refreshBtn.onclick = () => window.adminRefreshContent();
}

// System Database Seeder Handlers
const CURRICULUM_SEED_DATA = [
  {
    subject: "Biology (Class 11)",
    chapter: "The Living World",
    quiz: "Basic Taxonomy and Classification",
    questions: [
      { question: "Who is known as the Father of Taxonomy?", option_a: "Aristotle", option_b: "Carl Linnaeus", option_c: "Gregor Mendel", option_d: "Charles Darwin", correct_option: "B", difficulty: "easy" },
      { question: "The basic unit of biological classification is:", option_a: "Genus", option_b: "Family", option_c: "Species", option_d: "Kingdom", correct_option: "C", difficulty: "easy" },
      { question: "Which of the following is a defining characteristic of living organisms?", option_a: "Growth", option_b: "Ability to make sound", option_c: "Response to external stimuli", option_d: "Locomotion", correct_option: "C", difficulty: "moderate" }
    ]
  },
  {
    subject: "Chemistry (Class 12)",
    chapter: "Solutions",
    quiz: "Raoult's Law and Colligative Properties",
    questions: [
      { question: "Which of the following is a colligative property?", option_a: "Osmotic pressure", option_b: "Surface tension", option_c: "Viscosity", option_d: "Refractive index", correct_option: "A", difficulty: "easy" },
      { question: "Colligative properties of a solution depend on:", option_a: "Nature of solute particles", option_b: "Number of solute particles", option_c: "Nature of solvent", option_d: "None of the above", correct_option: "B", difficulty: "moderate" },
      { question: "An ideal solution is one which obeys:", option_a: "Henry's Law", option_b: "Raoult's Law", option_c: "Boyle's Law", option_d: "Charles's Law", correct_option: "B", difficulty: "easy" }
    ]
  },
  {
    subject: "Physics (Class 11)",
    chapter: "Units and Measurements",
    quiz: "Dimensional Analysis and Errors",
    questions: [
      { question: "What is the SI unit of magnetic flux density?", option_a: "Weber", option_b: "Tesla", option_c: "Gauss", option_d: "Henry", correct_option: "B", difficulty: "easy" },
      { question: "The dimensions of Planck's constant are same as that of:", option_a: "Linear momentum", option_b: "Angular momentum", option_c: "Work", option_d: "Power", correct_option: "B", difficulty: "hard" }
    ]
  },
  {
    subject: "Mathematics (Class 12)",
    chapter: "Matrices",
    quiz: "Types of Matrices & Determinants",
    questions: [
      { question: "If a matrix is both symmetric and skew-symmetric, then it is a:", option_a: "Diagonal matrix", option_b: "Zero matrix", option_c: "Identity matrix", option_d: "Scalar matrix", correct_option: "B", difficulty: "moderate" }
    ]
  }
];

async function adminSeedCurriculum() {
  showToast('Seeding Database', 'Importing curriculum practice quizzes, please wait...', 'ℹ️');
  
  try {
    for (const batch of CURRICULUM_SEED_DATA) {
      // 1. Get or create Subject
      let subList = await dbRequest(`subjects?name=eq.${encodeURIComponent(batch.subject)}`);
      let subId = subList.length > 0 ? subList[0].id : null;
      if (!subId) {
        const subResp = await dbRequest('subjects', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ name: batch.subject }])
        });
        subId = subResp[0].id;
      }

      // 2. Get or create Chapter
      let chapList = await dbRequest(`chapters?subject_id=eq.${subId}&name=eq.${encodeURIComponent(batch.chapter)}`);
      let chapId = chapList.length > 0 ? chapList[0].id : null;
      if (!chapId) {
        const chapResp = await dbRequest('chapters', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ subject_id: subId, name: batch.chapter }])
        });
        chapId = chapResp[0].id;
      }

      // 3. Get or create Quiz
      let quizList = await dbRequest(`quizzes?chapter_id=eq.${chapId}&name=eq.${encodeURIComponent(batch.quiz)}`);
      let quizId = quizList.length > 0 ? quizList[0].id : null;
      if (!quizId) {
        const quizResp = await dbRequest('quizzes', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ chapter_id: chapId, name: batch.quiz }])
        });
        quizId = quizResp[0].id;
      }

      // 4. Create Questions
      const questionsPayload = batch.questions.map(q => ({
        quiz_id: quizId,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        difficulty: q.difficulty || 'mixed'
      }));

      await dbRequest('questions', {
        method: 'POST',
        body: JSON.stringify(questionsPayload)
      });
    }

    showToast('Seeding Complete', 'Successfully seeded curriculum practice quizzes.', '✓');
    if (window.adminRefreshContent) {
      window.adminRefreshContent();
    }
  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to seed curriculum data.', '⚠️');
  }
}

async function adminClearDatabase() {
  if (!confirm('Are you absolutely sure you want to clear the entire database? This will permanently delete all subjects, chapters, quizzes, and questions.')) {
    return;
  }
  
  showToast('Clearing Database', 'Deleting all records, please wait...', 'ℹ️');
  try {
    const subjects = await dbRequest('subjects');
    for (const sub of subjects) {
      await dbRequest(`subjects?id=eq.${sub.id}`, { method: 'DELETE' });
    }
    
    // Also delete any dangling items just in case RLS or constraints prevented full cascade
    const chapters = await dbRequest('chapters');
    for (const chap of chapters) {
      await dbRequest(`chapters?id=eq.${chap.id}`, { method: 'DELETE' });
    }

    showToast('Success', 'Database cleared successfully.', '✓');
    if (window.adminRefreshContent) {
      window.adminRefreshContent();
    }
  } catch (err) {
    console.error(err);
    showToast('Error', 'Failed to clear database.', '⚠️');
  }
}

// Bind buttons on system seeder tab
const seedBtn = document.getElementById('admin-seed-curriculum-btn');
if (seedBtn) seedBtn.onclick = () => adminSeedCurriculum();

const clearBtn = document.getElementById('admin-clear-database-btn');
if (clearBtn) clearBtn.onclick = () => adminClearDatabase();

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
      <a href="#dashboard" class="block text-center py-2.5 text-base font-semibold text-slate-700 hover:text-indigo-600 transition-colors">Dashboard</a>
      <button id="mobile-logout-btn" class="w-full text-center py-2.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold rounded-xl text-sm transition-all mt-2">Sign Out</button>
    `;
    authDiv.querySelector('#mobile-logout-btn').onclick = async () => {
      try {
        await insforge.auth.signOut();
      } catch (e) {
        console.error(e);
      }
      currentUser = null;
      accessToken = null;
      localStorage.removeItem('userSession');
      updateNavbar();
      window.location.hash = '#home';
    };
  } else {
    authDiv.innerHTML = `
      <a href="#login" class="block text-center py-2.5 text-base font-semibold text-slate-700 hover:text-indigo-600 transition-colors">Login</a>
      <a href="#signup" class="block text-center py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all">Sign Up</a>
    `;
  }
};

// Desktop dashboard logout action
const dashLogoutBtn = document.getElementById('dashboard-logout-btn');
if (dashLogoutBtn) {
  dashLogoutBtn.onclick = async () => {
    try {
      await insforge.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    currentUser = null;
    accessToken = null;
    localStorage.removeItem('userSession');
    updateNavbar();
    window.location.hash = '#home';
  };
}

// Quick Stats Count-up Animations
function animateStats() {
  const statsElements = [
    { id: 'stat-users', target: 50, suffix: 'K+' },
    { id: 'stat-quizzes', target: 120, suffix: 'K+' },
    { id: 'stat-questions', target: 1.5, suffix: 'M+', decimal: true },
    { id: 'stat-chapters', target: 100, suffix: '+' }
  ];

  statsElements.forEach(stat => {
    const el = document.getElementById(stat.id);
    if (!el) return;

    let start = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    function updateCount(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentVal = start + easedProgress * (stat.target - start);

      if (stat.decimal) {
        el.innerText = currentVal.toFixed(1) + stat.suffix;
      } else {
        el.innerText = Math.floor(currentVal) + stat.suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    }
    requestAnimationFrame(updateCount);
  });
}

function setupStatsObserver() {
  const statsSection = document.getElementById('stats-bar-section');
  if (!statsSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStats();
        observer.unobserve(statsSection);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(statsSection);
}

// Initial setup
window.onhashchange = handleRouting;
window.onload = async () => {
  await initAuth();
  handleRouting();
  loadFaqAccordion();
  runHeroSimulator();
  setupStatsObserver();
  
  // Initialize Lucide Icons
  lucide.createIcons();
};

