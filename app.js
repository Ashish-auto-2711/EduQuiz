/* ═══════════════════════════════════════════════════════════════
   EduQuiz — app.js  |  PRD-Compliant Full Application Logic
   v3.0 — Class → Subject → Chapter → Quiz  |  Fisher-Yates  |  Sound
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── 0. InsForge / Database Config ──────────────────────────── */
const DB_CONFIG = {
  baseUrl: 'https://c43du8wy.us-east.insforge.app',
  projectId: 'quiz_app',
  apiKey: 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351'
};

/* ─── 1. Constants / Helpers ──────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// Fisher-Yates shuffle — guaranteed uniform distribution
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Randomise correct answer position so correct != always option A
function randomiseOptionOrder(q) {
  const labels = ['A', 'B', 'C', 'D'];
  const options = [q.option_a, q.option_b, q.option_c, q.option_d];
  const correct = options[labels.indexOf(q.correct_option.toUpperCase())];

  // Create [{text, wasCorrect}] and shuffle
  const tagged = options.map((t, i) => ({ text: t, isCorrect: labels[i] === q.correct_option.toUpperCase() }));
  const shuffled = shuffle(tagged);

  return {
    ...q,
    _options: shuffled.map(o => o.text),
    _correctIndex: shuffled.findIndex(o => o.isCorrect)
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDeviceId() {
  let id = localStorage.getItem('eq_device_id');
  if (!id) { id = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem('eq_device_id', id); }
  return id;
}

/* ─── 2. State ────────────────────────────────────────────────── */
const state = {
  // Navigation
  currentScreen: 'home',
  navLevel: 'classes',      // 'classes' | 'subjects' | 'chapters'
  selectedClass: null,
  selectedSubject: null,

  // Quiz config
  quizConfig: {
    level: 'mixed',
    questionCount: 10,
    mode: 'practice',      // 'practice' | 'timed' | 'speed'
    timerMinutes: 10,
    shuffle: true,
    sound: true,
    negativeMarking: false,
  },

  // Active quiz
  activeChapter: null,
  allQuestions: [],         // raw from DB
  selectedQuestions: [],    // shuffled pool
  currentQIndex: 0,
  answers: {},              // { qIndex: chosenOptIndex }
  flagged: new Set(),
  quizStartTime: null,
  timerInterval: null,
  timerSecondsLeft: 0,
  timerTotal: 0,
  quizFinished: false,

  // Results
  lastResult: null,

  // UI
  soundEnabled: true,
  streak: 0,
  history: [],
  xp: 0,
};

/* ─── 3. Audio (Web Audio API) ────────────────────────────────── */
let audioCtx;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type = 'sine', dur = 0.15, gain = 0.3) {
  if (!state.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch {}
}

const sound = {
  click:    () => playTone(600, 'sine', 0.08, 0.15),
  correct:  () => { playTone(660, 'sine', 0.1, 0.25); setTimeout(() => playTone(880, 'sine', 0.15, 0.2), 110); },
  wrong:    () => playTone(220, 'sawtooth', 0.25, 0.18),
  submit:   () => { playTone(440, 'sine', 0.1, 0.2); setTimeout(() => playTone(550, 'sine', 0.12, 0.2), 100); setTimeout(() => playTone(660, 'sine', 0.18, 0.25), 220); },
  nav:      () => playTone(500, 'sine', 0.08, 0.1),
  celebrate:() => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.18, 0.2), i * 100)); },
  tick:     () => playTone(800, 'square', 0.05, 0.1),
};

/* ─── 4. Toast ────────────────────────────────────────────────── */
function showToast(msg, type = '', duration = 3000) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast${type ? ' ' + type : ''}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, duration);
}

/* ─── 5. Screen Navigation ────────────────────────────────────── */
function showScreen(name) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`${name}-screen`);
  if (el) el.classList.add('active');
  state.currentScreen = name;

  // Update nav active states
  $$('.bnav-item, .nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  if (name === 'home') renderHome();
  if (name === 'history') renderHistory();

  sound.nav();
}

/* ─── 6. Curriculum Data ──────────────────────────────────────── */
// The CURRICULUM object: Class → Subject → Chapter metadata
// Questions are fetched from InsForge DB at quiz-start
const CURRICULUM = {
  classes: [
    { id:'c1',  label:'Class 1',  emoji:'🌟', subjects:['Mathematics','English','EVS'] },
    { id:'c2',  label:'Class 2',  emoji:'🌈', subjects:['Mathematics','English','EVS'] },
    { id:'c3',  label:'Class 3',  emoji:'🎨', subjects:['Mathematics','English','EVS','Science'] },
    { id:'c4',  label:'Class 4',  emoji:'🔢', subjects:['Mathematics','English','EVS','Science'] },
    { id:'c5',  label:'Class 5',  emoji:'📐', subjects:['Mathematics','English','EVS','Science'] },
    { id:'c6',  label:'Class 6',  emoji:'🔬', subjects:['Mathematics','English','Science','Social Science','Hindi'] },
    { id:'c7',  label:'Class 7',  emoji:'⚗️',  subjects:['Mathematics','English','Science','Social Science','Hindi'] },
    { id:'c8',  label:'Class 8',  emoji:'📊', subjects:['Mathematics','English','Science','Social Science','Hindi'] },
    { id:'c9',  label:'Class 9',  emoji:'🧮', subjects:['Mathematics','English','Science','Social Science','Hindi'] },
    { id:'c10', label:'Class 10', emoji:'🏆', subjects:['Mathematics','English','Science','Social Science','Hindi'] },
    { id:'c11', label:'Class 11', emoji:'⚡', subjects:['Physics','Chemistry','Mathematics','Biology','English'] },
    { id:'c12', label:'Class 12', emoji:'🎓', subjects:['Physics','Chemistry','Mathematics','Biology','English'] },
  ]
};

const SUBJECT_ICONS = {
  'Mathematics': '🔢', 'English': '📚', 'EVS': '🌿', 'Science': '🔬',
  'Social Science': '🌍', 'Hindi': '🕉️', 'Physics': '⚡', 'Chemistry': '🧪',
  'Biology': '🌱',
};

// Chapters per subject (CBSE curriculum)
const CHAPTERS = {
  'Class 12': {
    'Chemistry': [
      'Solutions','Electrochemistry','Chemical Kinetics','d and f Block Elements',
      'Coordination Compounds','Haloalkanes and Haloarenes','Alcohols Phenols and Ethers',
      'Aldehydes Ketones and Carboxylic Acids','Amines','Biomolecules'
    ],
    'Physics': [
      'Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity',
      'Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction',
      'Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments',
      'Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei',
      'Semiconductor Electronics'
    ],
    'Biology': [
      'Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health',
      'Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution',
      'Human Health and Disease','Microbes in Human Welfare','Biotechnology Principles and Processes',
      'Biotechnology and its Applications','Organisms and Populations','Ecosystem',
      'Biodiversity and Conservation'
    ],
    'Mathematics': [
      'Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants',
      'Continuity and Differentiability','Application of Derivatives','Integrals',
      'Application of Integrals','Differential Equations','Vector Algebra',
      'Three Dimensional Geometry','Linear Programming','Probability'
    ],
  },
  'Class 11': {
    'Physics': [
      'Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane',
      'Laws of Motion','Work Energy and Power','System of Particles and Rotational Motion',
      'Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids',
      'Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves'
    ],
    'Chemistry': [
      'Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements',
      'Chemical Bonding and Molecular Structure','States of Matter','Thermodynamics',
      'Equilibrium','Redox Reactions','Hydrogen','The s Block Elements',
      'The p Block Elements','Organic Chemistry Some Basic Principles','Hydrocarbons',
      'Environmental Chemistry'
    ],
    'Mathematics': [
      'Sets','Relations and Functions','Trigonometric Functions','Mathematical Induction',
      'Complex Numbers','Linear Inequalities','Permutations and Combinations','Binomial Theorem',
      'Sequences and Series','Straight Lines','Conic Sections','3D Geometry','Statistics',
      'Probability'
    ],
    'Biology': [
      'The Living World','Biological Classification','Plant Kingdom','Animal Kingdom',
      'Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals',
      'Cell the Unit of Life','Biomolecules','Cell Cycle and Cell Division','Transport in Plants',
      'Mineral Nutrition','Photosynthesis','Respiration in Plants','Plant Growth and Development',
      'Digestion and Absorption','Breathing and Exchange of Gases','Body Fluids and Circulation',
      'Excretory Products','Locomotion and Movement','Neural Control','Chemical Coordination'
    ],
  },
  // Lower classes get generic chapters (fetched from DB)
};

function getChaptersForSubject(classLabel, subject) {
  if (CHAPTERS[classLabel] && CHAPTERS[classLabel][subject]) {
    return CHAPTERS[classLabel][subject].map((title, i) => ({
      id: `${classLabel}_${subject}_ch${i+1}`.replace(/\s+/g,'_').toLowerCase(),
      title,
      chapterNo: i + 1,
      classLabel,
      subject,
    }));
  }
  // Generic fallback
  return Array.from({length:5}, (_,i) => ({
    id: `${classLabel}_${subject}_ch${i+1}`.replace(/\s+/g,'_').toLowerCase(),
    title: `Chapter ${i+1}`,
    chapterNo: i + 1,
    classLabel,
    subject,
  }));
}

/* ─── 7. InsForge DB Calls ────────────────────────────────────── */
async function fetchQuestionsFromDB(classLabel, subject, chapter) {
  try {
    const url = new URL(`${DB_CONFIG.baseUrl}/tables/questions/records`);
    url.searchParams.set('filter[class][eq]', classLabel);
    url.searchParams.set('filter[subject][eq]', subject);
    url.searchParams.set('filter[chapter][eq]', chapter);
    url.searchParams.set('limit', '500');

    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': DB_CONFIG.apiKey, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`DB error ${res.status}`);
    const data = await res.json();
    return data.records || data.list || data || [];
  } catch (err) {
    console.warn('InsForge fetch failed, using cached data:', err.message);
    return getCachedQuestions(classLabel, subject, chapter);
  }
}

async function saveAttemptToDB(attempt) {
  try {
    await fetch(`${DB_CONFIG.baseUrl}/tables/quiz_attempts/records`, {
      method: 'POST',
      headers: { 'x-api-key': DB_CONFIG.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt)
    });
  } catch (err) {
    console.warn('Could not save attempt to DB:', err.message);
  }
}

/* ─── 8. Local Data Cache (sample questions) ──────────────────── */
function getCachedQuestions(classLabel, subject, chapter) {
  // Return sample questions from localStorage cache or built-in samples
  const key = `eq_qcache_${classLabel}_${subject}_${chapter}`.replace(/\s+/g,'_').toLowerCase();
  const cached = localStorage.getItem(key);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return generateSampleQuestions(classLabel, subject, chapter);
}

function generateSampleQuestions(classLabel, subject, chapter) {
  // Built-in fallback questions for the core Class 12 chapters
  const banks = {
    'solutions': [
      { question:'The molarity of a solution is defined as:', option_a:'Moles of solute per litre of solution', option_b:'Moles of solute per kg of solvent', option_c:'Mass of solute per litre of solution', option_d:'Moles of solvent per litre of solution', correct_option:'A', difficulty:'easy', explanation:'Molarity = moles of solute / volume of solution in litres.' },
      { question:'Henry\'s law states that at constant temperature the solubility of a gas in a liquid is:', option_a:'Inversely proportional to pressure', option_b:'Directly proportional to partial pressure', option_c:'Independent of pressure', option_d:'Directly proportional to temperature', correct_option:'B', difficulty:'easy', explanation:'Henry\'s law: p = KH × x, where p is partial pressure and x is mole fraction of gas.' },
      { question:'Which colligative property is used to determine the molecular mass of a polymer?', option_a:'Boiling point elevation', option_b:'Freezing point depression', option_c:'Osmotic pressure', option_d:'Vapour pressure lowering', correct_option:'C', difficulty:'moderate', explanation:'Osmotic pressure is the most sensitive colligative property and is used for high molecular mass solutes like polymers.' },
      { question:'Raoult\'s law is applicable to:', option_a:'Ideal solutions only', option_b:'Non-ideal solutions only', option_c:'Electrolyte solutions', option_d:'All solutions', correct_option:'A', difficulty:'easy', explanation:'Raoult\'s law holds for ideal solutions where solute-solvent interactions equal solute-solute and solvent-solvent interactions.' },
      { question:'An ideal solution is formed when the solvent and solute have:', option_a:'Different intermolecular forces', option_b:'Similar intermolecular forces', option_c:'No intermolecular forces', option_d:'Strong dipole interactions', correct_option:'B', difficulty:'easy', explanation:'Ideal solutions form when A-B interactions ≈ A-A and B-B interactions, so ΔHmix = 0.' },
      { question:'van\'t Hoff factor (i) for KCl in dilute aqueous solution is approximately:', option_a:'1', option_b:'2', option_c:'3', option_d:'0.5', correct_option:'B', difficulty:'moderate', explanation:'KCl dissociates into K⁺ and Cl⁻, so i ≈ 2 in dilute solution.' },
      { question:'Which of the following is NOT a colligative property?', option_a:'Osmotic pressure', option_b:'Boiling point elevation', option_c:'Optical rotation', option_d:'Freezing point depression', correct_option:'C', difficulty:'easy', explanation:'Optical rotation depends on the nature of the solute, not just particle count. Colligative properties depend only on number of particles.' },
      { question:'The phenomenon of osmosis involves the movement of:', option_a:'Solute from high to low concentration', option_b:'Solvent from high to low concentration region', option_c:'Solvent from low to high solute concentration', option_d:'Both solute and solvent', correct_option:'C', difficulty:'moderate', explanation:'In osmosis, solvent moves from dilute (low solute) to concentrated (high solute) region through a semipermeable membrane.' },
      { question:'Depression in freezing point is a _________ property.', option_a:'Additive', option_b:'Colligative', option_c:'Constitutive', option_d:'Specific', correct_option:'B', difficulty:'easy', explanation:'Depression in freezing point depends on the number of solute particles, making it a colligative property.' },
      { question:'Azeotrope is a mixture that:', option_a:'Boils at a fixed temperature with constant composition', option_b:'Has different vapour and liquid compositions', option_c:'Cannot be distilled', option_d:'Shows negative deviation only', correct_option:'A', difficulty:'moderate', explanation:'An azeotrope (constant boiling mixture) has the same composition in liquid and vapour phases at a fixed temperature.' },
      { question:'Which of the following has maximum boiling point elevation for same molal concentration?', option_a:'Glucose', option_b:'NaCl', option_c:'BaCl₂', option_d:'AlCl₃', correct_option:'D', difficulty:'hard', explanation:'AlCl₃ gives 4 ions (Al³⁺ + 3Cl⁻), so i=4, highest van\'t Hoff factor → maximum ΔTb.' },
      { question:'Reverse osmosis is used in:', option_a:'Blood filtration', option_b:'Water desalination', option_c:'Beer brewing', option_d:'Drug delivery', correct_option:'B', difficulty:'moderate', explanation:'In reverse osmosis, pressure exceeding osmotic pressure is applied to push water through a semipermeable membrane, removing dissolved salts.' },
      { question:'If a solute undergoes dimerisation in solution, van\'t Hoff factor i is:', option_a:'Greater than 1', option_b:'Equal to 1', option_c:'Less than 1', option_d:'Zero', correct_option:'C', difficulty:'hard', explanation:'Dimerisation reduces the number of particles, so i < 1.' },
      { question:'Normality of a solution is defined as:', option_a:'Moles of solute per litre', option_b:'Gram equivalents of solute per litre', option_c:'Moles of solute per kg of solvent', option_d:'Grams of solute per 100 mL', correct_option:'B', difficulty:'easy', explanation:'Normality (N) = gram equivalents of solute / volume of solution in litres.' },
      { question:'A 1 molal aqueous solution contains 1 mole of solute per:', option_a:'Litre of solution', option_b:'Litre of water', option_c:'Kilogram of solvent', option_d:'100 g of solvent', correct_option:'C', difficulty:'easy', explanation:'Molality = moles of solute / mass of solvent in kg. It is temperature-independent.' },
    ],
    'electrochemistry': [
      { question:'The standard hydrogen electrode has a reduction potential of:', option_a:'1.0 V', option_b:'0.5 V', option_c:'0 V', option_d:'-1.0 V', correct_option:'C', difficulty:'easy', explanation:'By convention, the SHE is the reference electrode with E° = 0.00 V.' },
      { question:'Faraday\'s first law of electrolysis states:', option_a:'Amount deposited is proportional to current only', option_b:'Amount deposited is proportional to charge passed', option_c:'Amount deposited is inversely proportional to time', option_d:'Equivalent weight has no role', correct_option:'B', difficulty:'easy', explanation:'First law: mass deposited (m) = Z × Q, where Z is electrochemical equivalent and Q is charge.' },
      { question:'In a galvanic cell, oxidation occurs at the:', option_a:'Cathode', option_b:'Anode', option_c:'Salt bridge', option_d:'Both electrodes', correct_option:'B', difficulty:'easy', explanation:'Anode = oxidation; Cathode = reduction. (Remember: OILRIG or An-Ox, Red-Cat)' },
      { question:'The EMF of a cell is maximum when:', option_a:'Current is maximum', option_b:'No current flows (open circuit)', option_c:'Resistance is minimum', option_d:'Salt bridge is absent', correct_option:'B', difficulty:'moderate', explanation:'EMF is measured under open circuit conditions when no current flows, so there is no internal voltage drop.' },
      { question:'Kohlrausch law deals with:', option_a:'Molar conductivity at infinite dilution', option_b:'Viscosity of electrolytes', option_c:'Electrochemical equivalent', option_d:'Faraday constant', correct_option:'A', difficulty:'moderate', explanation:'Kohlrausch\'s law states that molar conductivity at infinite dilution is the sum of individual ionic conductances.' },
      { question:'Which of the following is a secondary battery?', option_a:'Daniel cell', option_b:'Dry cell (Leclanché)', option_c:'Lead storage battery', option_d:'Mercury cell', correct_option:'C', difficulty:'easy', explanation:'Lead storage battery is secondary (rechargeable). Primary cells (Daniel, Leclanché) cannot be recharged.' },
      { question:'The Nernst equation relates cell EMF to:', option_a:'Temperature and pressure', option_b:'Concentration of ions and standard EMF', option_c:'Only standard EMF', option_d:'Current and resistance', correct_option:'B', difficulty:'moderate', explanation:'Nernst equation: E = E° - (RT/nF)ln Q, relating EMF to standard EMF and ionic concentrations.' },
      { question:'One Faraday is equal to:', option_a:'6.022 × 10²³ coulombs', option_b:'96500 coulombs', option_c:'9650 coulombs', option_d:'1 ampere per second', correct_option:'B', difficulty:'easy', explanation:'1 Faraday = 96485 C ≈ 96500 C = charge of 1 mole of electrons.' },
      { question:'The conductivity of a solution depends on:', option_a:'Nature and concentration of ions', option_b:'Size of the container', option_c:'Only temperature', option_d:'Colour of the solution', correct_option:'A', difficulty:'easy', explanation:'Conductivity depends on number of ions, their charge, mobility, and temperature.' },
      { question:'In electrolysis of aqueous NaCl, the gas evolved at cathode is:', option_a:'Cl₂', option_b:'O₂', option_c:'H₂', option_d:'Na vapour', correct_option:'C', difficulty:'easy', explanation:'At cathode, water is reduced: 2H₂O + 2e⁻ → H₂ + 2OH⁻. H₂ gas is evolved.' },
      { question:'Which electrode is inert and does not participate in the reaction?', option_a:'Copper', option_b:'Zinc', option_c:'Platinum', option_d:'Iron', correct_option:'C', difficulty:'easy', explanation:'Platinum (and graphite) are inert electrodes used where no electrode material should dissolve.' },
      { question:'Cell with standard EMF 1.10 V is the:', option_a:'Mercury cell', option_b:'Daniel cell (Zn-Cu)', option_c:'Fuel cell', option_d:'Lead storage battery', correct_option:'B', difficulty:'moderate', explanation:'The Daniel cell (Zn|ZnSO₄||CuSO₄|Cu) has E°cell = E°Cu - E°Zn = 0.34 - (-0.76) = 1.10 V.' },
      { question:'Specific conductance (κ) has SI units of:', option_a:'Ω cm', option_b:'S cm⁻¹', option_c:'S m', option_d:'Ω⁻¹', correct_option:'B', difficulty:'moderate', explanation:'κ = conductance × (l/A). Units: S·cm⁻¹ or S·m⁻¹.' },
      { question:'In fuel cell, hydrogen and oxygen combine to produce:', option_a:'Heat only', option_b:'Electricity and water', option_c:'H₂O₂', option_d:'Only water vapour', correct_option:'B', difficulty:'moderate', explanation:'In a H₂-O₂ fuel cell: H₂ + ½O₂ → H₂O; this produces electrical energy directly.' },
      { question:'Corrosion of iron is essentially an _______ process.', option_a:'Physical', option_b:'Electrochemical', option_c:'Thermal', option_d:'Photochemical', correct_option:'B', difficulty:'easy', explanation:'Rusting (corrosion of iron) is an electrochemical process involving oxidation at anodic areas and reduction at cathodic areas.' },
    ],
    'electric charges and fields': [
      { question:'The SI unit of electric charge is:', option_a:'Ampere', option_b:'Coulomb', option_c:'Volt', option_d:'Farad', correct_option:'B', difficulty:'easy', explanation:'The SI unit of electric charge is Coulomb (C). One Coulomb = charge of 6.24 × 10¹⁸ electrons.' },
      { question:'Coulomb\'s law gives the force between two point charges. The force is:', option_a:'Always attractive', option_b:'Always repulsive', option_c:'Attractive for unlike and repulsive for like charges', option_d:'Depends on medium only', correct_option:'C', difficulty:'easy', explanation:'Like charges repel, unlike charges attract. F = kq₁q₂/r².' },
      { question:'The electric field inside a conductor in electrostatic equilibrium is:', option_a:'Maximum at centre', option_b:'Equal to external field', option_c:'Zero', option_d:'Depends on shape', correct_option:'C', difficulty:'easy', explanation:'Free charges rearrange to cancel internal field, so E = 0 inside a conductor in electrostatic equilibrium.' },
      { question:'Electric flux through a closed surface enclosing charge Q is:', option_a:'Q/ε₀', option_b:'Qε₀', option_c:'Q²/ε₀', option_d:'ε₀/Q', correct_option:'A', difficulty:'easy', explanation:'Gauss\'s Law: Φ = Q_enc / ε₀.' },
      { question:'A dipole in a uniform electric field experiences:', option_a:'A net force and a torque', option_b:'Only a net force', option_c:'Only a torque', option_d:'Neither force nor torque', correct_option:'C', difficulty:'moderate', explanation:'In a uniform field, the forces on +q and -q are equal and opposite (net force = 0), but they create a torque τ = p × E.' },
      { question:'The electric field due to a uniformly charged infinite plane sheet is:', option_a:'σ/ε₀', option_b:'σ/2ε₀', option_c:'2σ/ε₀', option_d:'σ²/ε₀', correct_option:'B', difficulty:'moderate', explanation:'Using Gauss\'s law for an infinite sheet: E = σ/(2ε₀), independent of distance.' },
      { question:'Quantisation of charge means:', option_a:'Charge is always positive', option_b:'Charge exists in multiples of e', option_c:'Charge can be fractional', option_d:'Charge is conserved', correct_option:'B', difficulty:'easy', explanation:'Charge quantisation: q = ne where n is an integer and e = 1.6 × 10⁻¹⁹ C (elementary charge).' },
      { question:'The number of field lines originating from a positive charge of 2μC (ε₀ = 8.85×10⁻¹²) is proportional to:', option_a:'2 × 10⁻⁶ / ε₀', option_b:'ε₀ × 2 × 10⁻⁶', option_c:'2 × 10⁻⁶ × ε₀²', option_d:'Cannot be determined', correct_option:'A', difficulty:'hard', explanation:'Total flux = q/ε₀; the number of field lines is proportional to charge/ε₀.' },
      { question:'An electric dipole consists of:', option_a:'Two same charges separated by distance', option_b:'Two equal and opposite charges separated by distance', option_c:'Single positive charge', option_d:'Multiple charges', correct_option:'B', difficulty:'easy', explanation:'An electric dipole is a pair of equal and opposite charges (+q and -q) separated by a small distance d.' },
      { question:'SI unit of electric field intensity is:', option_a:'N/C or V/m', option_b:'N·C', option_c:'V·m', option_d:'J/C', correct_option:'A', difficulty:'easy', explanation:'Electric field E = F/q, so units are N/C. Since V = J/C and J = N·m, we get V/m = N/C.' },
    ]
  };

  const key = chapter.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,'');
  const bankKey = Object.keys(banks).find(k => key.includes(k.replace(/\s+/g,'_')));
  if (bankKey) return banks[bankKey];

  // No dummy fallback — return empty array so the UI shows a proper message
  console.warn(`No local questions found for: ${classLabel} > ${subject} > ${chapter}`);
  return [];
}

/* ─── 9. Home / Navigation Rendering ─────────────────────────── */
function renderHome() {
  updateStreakUI();
  updateRecentSection();
  updateStatsStrip();
  setupScrollReveal();

  // Reset to class view if not navigated
  if (state.navLevel === 'classes') {
    showView('classes');
  }
}

function showView(level) {
  state.navLevel = level;
  const views = ['view-classes','view-subjects','view-chapters','view-search'];
  views.forEach(v => document.getElementById(v)?.classList.add('hidden'));

  if (level === 'classes')  { renderClassGrid(); document.getElementById('view-classes').classList.remove('hidden'); }
  if (level === 'subjects') { renderSubjectGrid(); document.getElementById('view-subjects').classList.remove('hidden'); }
  if (level === 'chapters') { renderChapterList(); document.getElementById('view-chapters').classList.remove('hidden'); }
  if (level === 'search')   { document.getElementById('view-search').classList.remove('hidden'); }

  updateBreadcrumb();
  renderClassChips();
}

function renderClassChips() {
  const row = document.getElementById('class-chip-row');
  if (!row) return;
  row.innerHTML = CURRICULUM.classes.map(c =>
    `<button class="class-chip${state.selectedClass?.id === c.id ? ' active' : ''}" data-class-id="${c.id}">${c.label}</button>`
  ).join('');
  row.querySelectorAll('.class-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const cls = CURRICULUM.classes.find(c => c.id === btn.dataset.classId);
      selectClass(cls);
      document.getElementById('view-classes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderClassGrid() {
  const grid = document.getElementById('class-grid');
  if (!grid) return;

  const GRADIENTS = [
    ['#6C5CE7','#A29BFE'], ['#00D2A0','#00B386'], ['#FF6B6B','#FF5252'],
    ['#FFB020','#FF9900'], ['#4D9DE0','#2980B9'], ['#fd79a8','#e84393'],
    ['#6C5CE7','#fd79a8'], ['#00D2A0','#4D9DE0'], ['#FFB020','#FF6B6B'],
    ['#A29BFE','#6C5CE7'], ['#00B386','#00D2A0'], ['#e84393','#6C5CE7'],
  ];

  grid.innerHTML = CURRICULUM.classes.map((cls, i) => {
    const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
    const subCount = cls.subjects.length;
    const history = state.history.filter(h => h.classLabel === cls.label);
    const pct = history.length ? Math.round(Math.min(history.length / (subCount * 2), 1) * 100) : 0;
    const circ = 2 * Math.PI * 14; // r=14 → for 32px ring → adjust

    return `
    <div class="class-card" role="listitem" tabindex="0" data-class-id="${cls.id}" aria-label="${cls.label}">
      <div class="cc-pattern" aria-hidden="true">${cls.emoji}</div>
      <div class="cc-ring" title="${pct}% attempted" aria-label="${pct}% chapters attempted">
        <svg viewBox="0 0 36 36"><circle class="cc-ring-bg" cx="18" cy="18" r="14"/><circle class="cc-ring-fill" cx="18" cy="18" r="14" stroke-dasharray="${circ}" stroke-dashoffset="${circ - (circ * pct / 100)}"/></svg>
      </div>
      <div class="cc-number" style="background:linear-gradient(135deg,${c1},${c2});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${i+1}</div>
      <div class="cc-label">${cls.label}</div>
      <div class="cc-sub">${subCount} subjects</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.class-card').forEach(card => {
    const handler = () => {
      const cls = CURRICULUM.classes.find(c => c.id === card.dataset.classId);
      selectClass(cls);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') handler(); });

    // Cursor-glow effect
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
    });
  });
}

function selectClass(cls) {
  state.selectedClass = cls;
  state.selectedSubject = null;
  sound.click();
  showView('subjects');
}

function renderSubjectGrid() {
  const grid = document.getElementById('subject-grid');
  const title = document.getElementById('subject-grid-title');
  if (!grid || !state.selectedClass) return;
  title.textContent = `${state.selectedClass.label} — Choose Subject`;

  const subjectColors = [
    'linear-gradient(135deg,#6C5CE7,#A29BFE)', 'linear-gradient(135deg,#00D2A0,#00B386)',
    'linear-gradient(135deg,#FF6B6B,#FF5252)', 'linear-gradient(135deg,#FFB020,#FF9900)',
    'linear-gradient(135deg,#4D9DE0,#2980B9)', 'linear-gradient(135deg,#fd79a8,#e84393)',
  ];

  grid.innerHTML = state.selectedClass.subjects.map((subj, i) => {
    const icon = SUBJECT_ICONS[subj] || '📖';
    const chapters = getChaptersForSubject(state.selectedClass.label, subj);
    return `
    <div class="subject-card" role="listitem" tabindex="0" data-subject="${subj}" style="border-top:3px solid ${subjectColors[i % subjectColors.length].includes('#6C') ? '#6C5CE7' : '#00D2A0'};">
      <div class="sc-icon">${icon}</div>
      <div class="sc-name">${subj}</div>
      <div class="sc-meta">${chapters.length} chapters</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.subject-card').forEach(card => {
    const handler = () => {
      state.selectedSubject = card.dataset.subject;
      sound.click();
      showView('chapters');
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') handler(); });
  });
}

function renderChapterList(filter = '') {
  const list = document.getElementById('chapter-list');
  const title = document.getElementById('chapter-list-title');
  if (!list || !state.selectedClass || !state.selectedSubject) return;
  title.textContent = `${state.selectedSubject} — ${state.selectedClass.label}`;

  let chapters = getChaptersForSubject(state.selectedClass.label, state.selectedSubject);
  if (filter) chapters = chapters.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()));

  if (!chapters.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No chapters match</h3><p>Try a different filter.</p></div>`;
    return;
  }

  const subjectIcon = SUBJECT_ICONS[state.selectedSubject] || '📖';

  list.innerHTML = chapters.map(ch => {
    const bestKey = `best_${ch.id}`;
    const best = localStorage.getItem(bestKey);
    const bestChip = best ? `<span class="best-score-chip">Best: ${best}%</span>` : '';
    return `
    <div class="chapter-item" role="listitem" tabindex="0" data-chapter-id="${ch.id}" data-chapter-title="${ch.title}">
      <div class="chi-num">${ch.chapterNo}</div>
      <div class="chi-body">
        <div class="chi-title">${ch.title}</div>
        <div class="chi-meta">
          <span>${state.selectedClass.label}</span>
          <span>100+ Qs</span>
          <span class="diff-pill mixed">Mixed</span>
        </div>
      </div>
      <div class="chi-actions">
        ${bestChip}
        <button class="btn-primary btn-sm" aria-label="Start ${ch.title}">Start →</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.chapter-item').forEach(item => {
    const startBtn = item.querySelector('.btn-primary');
    const handler = () => {
      const chapter = chapters.find(c => c.id === item.dataset.chapterId);
      openConfigSheet(chapter, subjectIcon);
    };
    startBtn.addEventListener('click', e => { e.stopPropagation(); handler(); });
    item.addEventListener('click', handler);
    item.addEventListener('keydown', e => { if (e.key==='Enter') handler(); });
  });
}

function updateBreadcrumb() {
  const wrap = document.getElementById('breadcrumb-wrap');
  const nav  = document.getElementById('breadcrumb-nav');
  if (!wrap || !nav) return;

  const crumbs = [{ label: 'Home', action: () => { state.selectedClass=null; state.selectedSubject=null; showView('classes'); } }];
  if (state.selectedClass) crumbs.push({ label: state.selectedClass.label, action: () => { state.selectedSubject=null; showView('subjects'); } });
  if (state.selectedSubject) crumbs.push({ label: state.selectedSubject, action: null });

  if (crumbs.length <= 1) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  nav.innerHTML = crumbs.map((c, i) => {
    const isLast = i === crumbs.length - 1;
    return `<span class="bc-item">
      ${i > 0 ? '<span class="bc-sep">›</span>' : ''}
      ${isLast || !c.action
        ? `<span style="color:var(--text-primary);font-weight:700;">${c.label}</span>`
        : `<button>${c.label}</button>`}
    </span>`;
  }).join('');

  nav.querySelectorAll('button').forEach((btn, i) => {
    btn.addEventListener('click', crumbs[i].action);
  });
}

/* ─── 10. Config Sheet ────────────────────────────────────────── */
let _configChapter = null;

function openConfigSheet(chapter, subjectIcon = '📚') {
  _configChapter = chapter;
  state.activeChapter = chapter;

  // Update sheet UI
  document.getElementById('config-subject-icon').textContent = subjectIcon;
  document.getElementById('config-title').textContent = chapter.title;
  document.getElementById('config-chapter-sub').innerHTML = `${chapter.classLabel} · ${state.selectedSubject || ''} · <span id="cfg-avail">Loading…</span>`;

  // Reset to defaults
  setConfigLevel('mixed');
  document.getElementById('cfg-q-count').value = 10;
  setConfigMode('practice');
  document.getElementById('cfg-shuffle').checked = true;
  document.getElementById('cfg-sound').checked = state.soundEnabled;
  document.getElementById('cfg-negative').checked = false;
  document.getElementById('cfg-q-warn').classList.add('hidden');

  openSheet('config');

  // Async: fetch question count
  fetchQuestionsFromDB(chapter.classLabel, state.selectedSubject || '', chapter.title).then(qs => {
    const avail = qs.length;
    const el = document.getElementById('cfg-avail');
    if (el) el.textContent = `${avail} questions available`;
    document.getElementById('cfg-q-count').max = avail || 100;

    // Update "All" pill
    document.querySelectorAll('.stepper-pill[data-n="all"]').forEach(p => {
      p.setAttribute('data-n-val', avail);
    });

    state.allQuestions = qs;
  });
}

function setConfigLevel(level) {
  document.querySelectorAll('#cfg-level-group .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
  state.quizConfig.level = level;
}

function setConfigMode(mode) {
  document.querySelectorAll('.time-mode-card').forEach(card => {
    card.classList.toggle('active', card.dataset.mode === mode);
  });
  state.quizConfig.mode = mode;
  const timerRow = document.getElementById('cfg-timer-row');
  if (timerRow) timerRow.classList.toggle('hidden', mode !== 'timed');
}

function openSheet(name) {
  document.getElementById(`${name}-sheet`).classList.add('open');
  document.getElementById(`${name}-overlay`).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSheet(name) {
  document.getElementById(`${name}-sheet`).classList.remove('open');
  document.getElementById(`${name}-overlay`).classList.remove('open');
  document.body.style.overflow = '';
}

/* ─── 11. Quiz Engine ─────────────────────────────────────────── */
async function launchQuiz() {
  closeSheet('config');

  const cfg = state.quizConfig;

  // Collect config from UI
  cfg.level         = document.querySelector('#cfg-level-group .seg-btn.active')?.dataset.level || 'mixed';
  cfg.questionCount = parseInt(document.getElementById('cfg-q-count').value) || 10;
  cfg.mode          = document.querySelector('.time-mode-card.active')?.dataset.mode || 'practice';
  cfg.timerMinutes  = parseFloat(document.getElementById('cfg-timer-min')?.value) || 10;
  cfg.shuffle       = document.getElementById('cfg-shuffle').checked;
  cfg.sound         = document.getElementById('cfg-sound').checked;
  cfg.negativeMarking = document.getElementById('cfg-negative').checked;

  state.soundEnabled = cfg.sound;

  // Filter by difficulty
  let pool = state.allQuestions.length ? [...state.allQuestions] : await fetchQuestionsFromDB(
    state.activeChapter.classLabel, state.selectedSubject || '', state.activeChapter.title
  );

  if (cfg.level !== 'mixed') {
    pool = pool.filter(q => (q.difficulty || '').toLowerCase() === cfg.level);
    if (!pool.length) {
      showToast(`No ${cfg.level} questions found. Using all difficulties.`, 'warning');
      pool = [...state.allQuestions];
    }
  }

  // Shuffle pool
  if (cfg.shuffle) pool = shuffle(pool);

  // Cap to requested count
  pool = pool.slice(0, Math.min(cfg.questionCount, pool.length));

  if (!pool.length) {
    showToast('No questions found for this chapter. Import some first!', 'error');
    return;
  }

  // Randomise option order for each question (fix A-bias)
  state.selectedQuestions = pool.map(q => randomiseOptionOrder(q));
  state.currentQIndex = 0;
  state.answers = {};
  state.flagged = new Set();
  state.quizStartTime = Date.now();
  state.quizFinished = false;

  clearInterval(state.timerInterval);

  // Build dot tracker
  renderDotTracker();

  // Show quiz screen
  showScreen('quiz');
  renderQuestion(0);
  startTimerIfNeeded();

  sound.submit();
}

function startTimerIfNeeded() {
  const cfg = state.quizConfig;
  const timerBadge = document.getElementById('q-timer-badge');

  if (cfg.mode === 'practice') {
    timerBadge.classList.add('hidden');
    return;
  }

  timerBadge.classList.remove('hidden');

  if (cfg.mode === 'timed') {
    state.timerSecondsLeft = Math.round(cfg.timerMinutes * 60);
    state.timerTotal       = state.timerSecondsLeft;
  } else {
    // Speed mode: 30s per question
    state.timerSecondsLeft = 30;
    state.timerTotal       = 30;
  }

  updateTimerUI();
  state.timerInterval = setInterval(() => {
    state.timerSecondsLeft--;
    updateTimerUI();

    if (state.timerSecondsLeft <= 10) sound.tick();

    if (cfg.mode === 'speed' && state.timerSecondsLeft <= 0) {
      // Auto advance
      clearInterval(state.timerInterval);
      autoAdvanceOrSubmit();
    } else if (cfg.mode === 'timed' && state.timerSecondsLeft <= 0) {
      clearInterval(state.timerInterval);
      submitQuiz();
    }
  }, 1000);
}

function updateTimerUI() {
  const text = document.getElementById('q-timer-text');
  const fill = document.getElementById('ring-fill');

  if (text) text.textContent = formatTime(Math.max(0, state.timerSecondsLeft));

  if (fill) {
    const pct = state.timerSecondsLeft / state.timerTotal;
    const r   = 15.9;
    const circ = 2 * Math.PI * r;
    fill.style.strokeDasharray  = circ;
    fill.style.strokeDashoffset = circ * (1 - pct);
    fill.style.stroke = pct > 0.5 ? '#6C5CE7' : pct > 0.25 ? '#FFB020' : '#FF6B6B';
  }
}

function autoAdvanceOrSubmit() {
  if (state.currentQIndex < state.selectedQuestions.length - 1) {
    goToQuestion(state.currentQIndex + 1);
    state.timerSecondsLeft = 30;
    state.timerTotal = 30;
    updateTimerUI();
    state.timerInterval = setInterval(() => {
      state.timerSecondsLeft--;
      updateTimerUI();
      if (state.timerSecondsLeft <= 0) { clearInterval(state.timerInterval); autoAdvanceOrSubmit(); }
      if (state.timerSecondsLeft <= 10) sound.tick();
    }, 1000);
  } else {
    submitQuiz();
  }
}

function renderQuestion(index) {
  const q = state.selectedQuestions[index];
  if (!q) return;

  const total = state.selectedQuestions.length;
  const pct = ((index + 1) / total) * 100;

  // Update sticky bar
  document.getElementById('q-counter').innerHTML = `Q <strong>${index+1}</strong>/${total}`;
  document.getElementById('q-prog-bar').style.width = `${pct}%`;

  // Difficulty badge
  const diff = (q.difficulty || 'easy').toLowerCase();
  const badge = document.getElementById('q-diff-badge');
  badge.textContent = q.difficulty || 'Easy';
  badge.className = `diff-badge ${diff}`;

  // Question text
  document.getElementById('q-text').textContent = q.question || q.question_text || '';

  // Options
  const stack = document.getElementById('options-stack');
  const letters = ['A','B','C','D'];
  const opts = q._options || [q.option_a, q.option_b, q.option_c, q.option_d];

  stack.innerHTML = opts.map((opt, i) => `
    <button class="option-btn${state.answers[index] === i ? ' selected' : ''}" data-index="${i}" aria-pressed="${state.answers[index] === i}">
      <span class="option-letter">${letters[i]}</span>
      <span>${opt || ''}</span>
    </button>
  `).join('');

  // Attach option listeners
  stack.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => selectOption(parseInt(btn.dataset.index), btn, e));
  });

  // Nav buttons
  document.getElementById('btn-q-prev').disabled = index === 0;
  const isLast = index === total - 1;
  document.getElementById('btn-q-next').classList.toggle('hidden', isLast);
  document.getElementById('btn-q-submit').classList.toggle('hidden', !isLast);

  // Flag button state
  document.getElementById('btn-q-flag').classList.toggle('flagged', state.flagged.has(index));

  // Dot tracker
  updateDotTracker(index);
}

function selectOption(optIndex, btn, e) {
  if (state.quizFinished) return;
  sound.click();

  // Ripple effect
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const r = btn.getBoundingClientRect();
  const size = Math.max(r.width, r.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${(e.clientX - r.left) - size/2}px;top:${(e.clientY - r.top) - size/2}px;`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  state.answers[state.currentQIndex] = optIndex;

  // NEVER reveal correct/wrong during the quiz — only mark as selected
  // Results are shown ONLY on the final results screen
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  updateDotTracker(state.currentQIndex);
  saveInProgress();
}

function renderDotTracker() {
  const tracker = document.getElementById('dot-tracker');
  if (!tracker) return;
  const total = state.selectedQuestions.length;
  tracker.innerHTML = Array.from({length:total}, (_,i) =>
    `<button class="q-dot" data-qi="${i}" aria-label="Question ${i+1}" title="Q${i+1}"></button>`
  ).join('');
  tracker.querySelectorAll('.q-dot').forEach(dot => {
    dot.addEventListener('click', () => goToQuestion(parseInt(dot.dataset.qi)));
  });
}

function updateDotTracker(current) {
  document.querySelectorAll('.q-dot').forEach((dot, i) => {
    dot.classList.remove('current','answered','flagged','wrong');
    if (i === current) { dot.classList.add('current'); return; }
    if (state.flagged.has(i)) { dot.classList.add('flagged'); return; }
    if (state.answers[i] !== undefined) { dot.classList.add('answered'); }
  });
}

function goToQuestion(index) {
  if (index < 0 || index >= state.selectedQuestions.length) return;

  // Animate card out
  const card = document.getElementById('quiz-card');
  if (card) {
    card.classList.add('cardOut');
    setTimeout(() => {
      card.classList.remove('cardOut');
      state.currentQIndex = index;
      renderQuestion(index);
    }, 220);
  } else {
    state.currentQIndex = index;
    renderQuestion(index);
  }
}

function flagCurrentQuestion() {
  const i = state.currentQIndex;
  if (state.flagged.has(i)) state.flagged.delete(i);
  else state.flagged.add(i);
  document.getElementById('btn-q-flag').classList.toggle('flagged', state.flagged.has(i));
  updateDotTracker(i);
  showToast(state.flagged.has(i) ? '🚩 Flagged for review' : 'Flag removed', '');
}

/* ─── 12. Submit ──────────────────────────────────────────────── */
function openSubmitSheet() {
  const answered = Object.keys(state.answers).length;
  const total    = state.selectedQuestions.length;
  document.getElementById('ss-answered').textContent = answered;
  document.getElementById('ss-skipped').textContent  = total - answered;
  document.getElementById('ss-flagged').textContent  = state.flagged.size;
  openSheet('submit');
}

function submitQuiz() {
  closeSheet('submit');
  clearInterval(state.timerInterval);
  state.quizFinished = true;

  const timeTaken = Math.floor((Date.now() - state.quizStartTime) / 1000);
  const questions = state.selectedQuestions;
  const cfg       = state.quizConfig;

  let correct = 0, wrong = 0, skipped = 0;
  let marks = 0;
  const diffStats = {};

  questions.forEach((q, i) => {
    const chosenIndex = state.answers[i];
    const correctIndex = q._correctIndex ?? ['A','B','C','D'].indexOf((q.correct_option||'A').toUpperCase());
    const diff = (q.difficulty || 'easy').toLowerCase();

    if (!diffStats[diff]) diffStats[diff] = { correct: 0, total: 0 };
    diffStats[diff].total++;

    if (chosenIndex === undefined) {
      skipped++;
    } else if (chosenIndex === correctIndex) {
      correct++;
      marks += (q.marks || 1);
      diffStats[diff].correct++;
    } else {
      wrong++;
      if (cfg.negativeMarking) marks -= 0.25;
    }
  });

  const totalMarks  = questions.reduce((s,q) => s + (q.marks || 1), 0);
  const pct         = Math.round((correct / questions.length) * 100);
  const grade       = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
  const gradeLabel  = pct >= 90 ? '🎉 Excellent!' : pct >= 75 ? '🌟 Great Job!' : pct >= 60 ? '👍 Good Work' : pct >= 40 ? '📖 Keep Going' : '💪 Needs Practice';

  state.lastResult = {
    questions, correct, wrong, skipped,
    timeTaken, pct, grade, gradeLabel, marks, totalMarks,
    diffStats,
    quizId: state.activeChapter?.id,
    chapterTitle: state.activeChapter?.title,
    classLabel: state.activeChapter?.classLabel,
    subject: state.selectedSubject,
    timestamp: Date.now(),
  };

  // XP
  state.xp += correct * 10 + (pct >= 80 ? 50 : 0);
  localStorage.setItem('eq_xp', state.xp);

  // Save to history
  saveToHistory(state.lastResult);

  // Save best score per chapter
  const bestKey = `best_${state.activeChapter?.id}`;
  const prev = parseInt(localStorage.getItem(bestKey) || '0');
  if (pct > prev) localStorage.setItem(bestKey, pct);

  // Clear in-progress
  localStorage.removeItem(`eq_progress_${state.activeChapter?.id}`);

  // Save to DB
  saveAttemptToDB({
    device_id:            getDeviceId(),
    class:                state.activeChapter?.classLabel,
    subject:              state.selectedSubject,
    chapter:              state.activeChapter?.title,
    quiz_id:              state.activeChapter?.id,
    total_questions:      questions.length,
    correct_count:        correct,
    wrong_count:          wrong,
    skipped_count:        skipped,
    score_percent:        pct,
    time_taken_seconds:   timeTaken,
    marks_obtained:       marks,
    marks_total:          totalMarks,
    grade,
    difficulty_selected:  cfg.level,
    time_mode:            cfg.mode,
    shuffle_enabled:      cfg.shuffle,
  });

  sound.submit();
  if (pct >= 80) { sound.celebrate(); setTimeout(fireConfetti, 500); }

  showResults();
}

/* ─── 13. Results Screen ──────────────────────────────────────── */
function showResults() {
  showScreen('results');
  const r = state.lastResult;

  // Score ring
  const ring    = document.getElementById('ring-score');
  const r_val   = 58;
  const circ    = 2 * Math.PI * r_val;
  ring.style.strokeDasharray  = circ;
  ring.style.strokeDashoffset = circ;
  setTimeout(() => {
    ring.style.strokeDashoffset = circ - (circ * r.pct / 100);
  }, 200);

  // Count-up animation for score
  animateCounter(document.getElementById('res-score'), 0, r.correct, 800);

  document.getElementById('res-of').textContent       = `/${r.questions.length}`;
  document.getElementById('res-grade').textContent     = r.gradeLabel;
  document.getElementById('res-pct').textContent       = `${r.pct}% Accuracy`;
  document.getElementById('res-marks').textContent     = `${r.marks.toFixed(1)} / ${r.totalMarks}`;

  // Stat cards
  document.getElementById('rs-total').textContent   = r.questions.length;
  document.getElementById('rs-correct').textContent = r.correct;
  document.getElementById('rs-wrong').textContent   = r.wrong;
  document.getElementById('rs-time').textContent    = formatTime(r.timeTaken);

  // Difficulty breakdown bars
  renderDiffBreakdown(r.diffStats);

  // Review list
  renderReviewList(r.questions);
}

function animateCounter(el, from, to, duration) {
  if (!el) return;
  const start = performance.now();
  const update = (ts) => {
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * easeOut(progress));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function renderDiffBreakdown(stats) {
  const container = document.getElementById('res-diff-bars');
  if (!container) return;

  const diffs = [
    { key:'easy',     label:'Easy',   color:'#00D2A0' },
    { key:'moderate', label:'Medium', color:'#FFB020' },
    { key:'hard',     label:'Hard',   color:'#FF6B6B' },
    { key:'neet',     label:'NEET',   color:'#6C5CE7' },
  ];

  container.innerHTML = diffs.map(d => {
    const s   = stats[d.key] || { correct:0, total:0 };
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    if (!s.total) return '';
    return `
    <div class="diff-bar-row">
      <span class="diff-bar-label">${d.label}</span>
      <div class="diff-bar-track"><div class="diff-bar-fill" style="width:0%;background:${d.color};" data-pct="${pct}"></div></div>
      <span class="diff-bar-pct" style="color:${d.color};">${pct}%</span>
    </div>`;
  }).join('');

  // Animate fill
  setTimeout(() => {
    container.querySelectorAll('.diff-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 100);
}

function renderReviewList(questions, wrongOnly = false) {
  const container = document.getElementById('review-list');
  if (!container) return;

  const filtered = wrongOnly
    ? questions.filter((_, i) => {
        const chosen  = state.answers[i];
        const correct = questions[i]._correctIndex ?? ['A','B','C','D'].indexOf((questions[i].correct_option||'A').toUpperCase());
        return chosen !== correct;
      })
    : questions;

  container.innerHTML = filtered.map((q, i) => {
    const orig = questions.indexOf(q);
    const chosenIndex  = state.answers[orig];
    const correctIndex = q._correctIndex ?? ['A','B','C','D'].indexOf((q.correct_option||'A').toUpperCase());
    const letters      = ['A','B','C','D'];
    const opts         = q._options || [q.option_a, q.option_b, q.option_c, q.option_d];

    let status = 'skipped';
    if (chosenIndex !== undefined) status = chosenIndex === correctIndex ? 'correct' : 'wrong';

    const userAns    = chosenIndex !== undefined ? `${letters[chosenIndex]}. ${opts[chosenIndex]}` : 'Skipped';
    const correctAns = `${letters[correctIndex]}. ${opts[correctIndex]}`;

    return `
    <div class="review-item ${status}">
      <div class="review-header" role="button" tabindex="0" aria-expanded="false">
        <div class="review-status-dot"></div>
        <div class="review-q-text">Q${orig+1}: ${q.question || q.question_text || ''}</div>
        <span class="review-toggle">▼</span>
      </div>
      <div class="review-body">
        <div class="review-ans-row">
          ${status !== 'correct' ? `<div class="review-ans user">Your: ${userAns}</div>` : ''}
          <div class="review-ans correct-ans">✓ ${correctAns}</div>
        </div>
        <div class="review-explanation">${q.explanation || 'No explanation provided.'}</div>
      </div>
    </div>`;
  }).join('');

  // Toggle expand/collapse
  container.querySelectorAll('.review-header').forEach(hdr => {
    const handler = () => {
      const item = hdr.closest('.review-item');
      const expanded = item.classList.toggle('expanded');
      hdr.setAttribute('aria-expanded', expanded);
      hdr.querySelector('.review-toggle').textContent = expanded ? '▲' : '▼';
    };
    hdr.addEventListener('click', handler);
    hdr.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') handler(); });
  });
}

/* ─── 14. History Screen ──────────────────────────────────────── */
function saveToHistory(result) {
  state.history.unshift({
    chapterTitle: result.chapterTitle,
    classLabel:   result.classLabel,
    subject:      result.subject,
    pct:          result.pct,
    correct:      result.correct,
    total:        result.questions.length,
    time:         result.timeTaken,
    grade:        result.grade,
    timestamp:    result.timestamp,
  });
  state.history = state.history.slice(0, 50);
  localStorage.setItem('eq_history', JSON.stringify(state.history));
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('eq_history');
    state.history = saved ? JSON.parse(saved) : [];
  } catch { state.history = []; }
}

function renderHistory() {
  const list    = document.getElementById('history-list');
  const empty   = document.getElementById('history-empty');
  const canvas  = document.getElementById('sparkline-canvas');

  if (!list) return;
  list.innerHTML = '';

  if (!state.history.length) {
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  // Sparkline
  if (canvas && state.history.length > 1) {
    drawSparkline(canvas, state.history.slice(0,20).map(h => h.pct).reverse());
  }

  state.history.forEach(h => {
    const color = h.pct >= 80 ? 'var(--accent-mint)' : h.pct >= 60 ? 'var(--accent-amber)' : 'var(--accent-coral)';
    const div   = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="score-pct" style="color:${color};">${h.pct}%</div>
      <div class="hi-info">
        <div class="hi-name">${h.chapterTitle || 'Quiz'}</div>
        <div class="hi-meta">${h.classLabel || ''} · ${h.subject || ''} · ${h.correct}/${h.total} correct · ${formatTime(h.time)}</div>
      </div>
      <div style="font-size:.78rem;color:var(--text-muted);">${h.grade}</div>
    `;
    list.appendChild(div);
  });
}

function drawSparkline(canvas, data) {
  const ctx  = canvas.getContext('2d');
  const W    = canvas.offsetWidth || 300;
  const H    = canvas.height;
  canvas.width = W;
  ctx.clearRect(0, 0, W, H);

  const min = 0, max = 100;
  const pts = data.map((v, i) => [i * (W / (data.length - 1)), H - ((v - min) / (max - min)) * H]);

  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  pts.slice(1).forEach(p => ctx.lineTo(...p));

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#6C5CE7');
  grad.addColorStop(1, '#A29BFE');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Fill
  ctx.lineTo(pts[pts.length-1][0], H);
  ctx.lineTo(pts[0][0], H);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
  fillGrad.addColorStop(0, 'rgba(108,92,231,.18)');
  fillGrad.addColorStop(1, 'rgba(108,92,231,0)');
  ctx.fillStyle = fillGrad;
  ctx.fill();
}

/* ─── 15. In-Progress Save/Resume ────────────────────────────── */
function saveInProgress() {
  if (!state.activeChapter) return;
  const key = `eq_progress_${state.activeChapter.id}`;
  localStorage.setItem(key, JSON.stringify({
    answers:   state.answers,
    flagged:   [...state.flagged],
    qIndex:    state.currentQIndex,
    startTime: state.quizStartTime,
    questions: state.selectedQuestions,
    config:    state.quizConfig,
    chapter:   state.activeChapter,
    subject:   state.selectedSubject,
    class:     state.selectedClass,
  }));
}

function tryResumeSaved() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('eq_progress_'));
  if (!keys.length) return;
  const saved = JSON.parse(localStorage.getItem(keys[0]) || 'null');
  if (!saved) return;

  // Show continue card
  const card = document.getElementById('continue-card');
  const name = document.getElementById('continue-chapter-name');
  const meta = document.getElementById('continue-meta');
  const prog = document.getElementById('continue-progress');
  if (card) {
    name.textContent = `${saved.chapter?.title || 'Quiz'} — ${saved.subject || ''}`;
    const pct = (Object.keys(saved.answers).length / saved.questions.length) * 100;
    prog.style.width = `${pct}%`;
    meta.textContent = `${Object.keys(saved.answers).length}/${saved.questions.length} answered`;
    card.classList.remove('hidden');

    document.getElementById('btn-resume').addEventListener('click', () => {
      state.selectedQuestions = saved.questions;
      state.answers    = saved.answers;
      state.flagged    = new Set(saved.flagged);
      state.currentQIndex = saved.qIndex;
      state.quizStartTime = saved.startTime;
      state.activeChapter = saved.chapter;
      state.selectedSubject = saved.subject;
      state.selectedClass = saved.class;
      state.quizConfig  = saved.config;

      renderDotTracker();
      showScreen('quiz');
      renderQuestion(state.currentQIndex);
      startTimerIfNeeded();
      card.classList.add('hidden');
      localStorage.removeItem(keys[0]);
    });
  }
}

/* ─── 16. Streak & XP ────────────────────────────────────────── */
function updateStreakUI() {
  const today = new Date().toDateString();
  const lastDay = localStorage.getItem('eq_last_quiz_day');
  const streak  = parseInt(localStorage.getItem('eq_streak') || '0');

  if (lastDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    state.streak = (lastDay === yesterday) ? streak + 1 : 1;
    localStorage.setItem('eq_streak', state.streak);
    localStorage.setItem('eq_last_quiz_day', today);
  } else {
    state.streak = streak;
  }

  const badge = document.getElementById('streak-num');
  if (badge) badge.textContent = state.streak;
}

/* ─── 17. Daily Challenge ─────────────────────────────────────── */
function setupDailyChallenge() {
  const title  = document.getElementById('daily-title');
  const meta   = document.getElementById('daily-meta');

  // Pick a daily chapter based on day-of-year seed
  const dayIndex = Math.floor(Date.now() / 86400000) % 40;
  const chapters = getChaptersForSubject('Class 12', 'Chemistry');
  const daily    = chapters[dayIndex % chapters.length];

  if (title) title.textContent = daily ? `${daily.title} — Class 12 Chemistry` : 'Mystery Chapter';

  // Countdown to midnight
  const midnight = new Date(); midnight.setHours(24,0,0,0);
  const updateCountdown = () => {
    const diff = Math.max(0, midnight - Date.now());
    const h    = Math.floor(diff / 3600000);
    const m    = Math.floor((diff % 3600000) / 60000);
    const el   = document.getElementById('daily-countdown');
    if (el) el.textContent = `${h}h ${m}m`;
  };
  updateCountdown();
  setInterval(updateCountdown, 60000);

  const btn = document.getElementById('btn-daily');
  if (btn && daily) {
    btn.addEventListener('click', () => {
      state.selectedClass   = CURRICULUM.classes.find(c => c.label === 'Class 12');
      state.selectedSubject = 'Chemistry';
      openConfigSheet(daily, '🧪');
    });
  }
}

/* ─── 18. Stats Strip ─────────────────────────────────────────── */
function updateStatsStrip() { /* Stats shown in hero section */}

/* ─── 19. Animated Stat Counters (Hero) ───────────────────────── */
function initHeroCounters() {
  const targets = document.querySelectorAll('.hsi-num[data-target]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.target);
      animateCounter(el, 0, end, 1200);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  targets.forEach(t => observer.observe(t));
}

/* ─── 20. Scroll Reveal ───────────────────────────────────────── */
function setupScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal-section').forEach(s => observer.observe(s));
}

/* ─── 21. Global Search ───────────────────────────────────────── */
function handleSearch(query) {
  query = query.trim();
  const clearBtn = document.getElementById('btn-search-clear');
  if (clearBtn) clearBtn.classList.toggle('hidden', !query);

  if (!query) {
    document.getElementById('view-search').classList.add('hidden');
    if (state.navLevel === 'search') showView('classes');
    return;
  }

  showView('search');
  document.getElementById('search-title').textContent = `Results for "${query}"`;

  const results = [];
  CURRICULUM.classes.forEach(cls => {
    cls.subjects.forEach(subj => {
      const chapters = getChaptersForSubject(cls.label, subj);
      chapters.forEach(ch => {
        const match = ch.title.toLowerCase().includes(query.toLowerCase()) ||
                      subj.toLowerCase().includes(query.toLowerCase()) ||
                      cls.label.toLowerCase().includes(query.toLowerCase());
        if (match) results.push({ ...ch, classLabel: cls.label, cls, subject: subj });
      });
    });
  });

  const list  = document.getElementById('search-results-list');
  const empty = document.getElementById('search-empty');

  if (!results.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = results.slice(0,30).map(r => `
    <div class="chapter-item" data-ch-title="${r.title}" data-class="${r.classLabel}" data-subject="${r.subject}">
      <div class="chi-num">${r.chapterNo}</div>
      <div class="chi-body">
        <div class="chi-title">${r.title}</div>
        <div class="chi-meta"><span>${r.classLabel}</span><span>${r.subject}</span></div>
      </div>
      <div class="chi-actions">
        <button class="btn-primary btn-sm">Start →</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.chapter-item').forEach(item => {
    item.querySelector('.btn-primary').addEventListener('click', () => {
      const cls  = CURRICULUM.classes.find(c => c.label === item.dataset.class);
      state.selectedClass   = cls;
      state.selectedSubject = item.dataset.subject;
      const chapters = getChaptersForSubject(item.dataset.class, item.dataset.subject);
      const chapter  = chapters.find(c => c.title === item.dataset.chTitle);
      if (chapter) openConfigSheet(chapter, SUBJECT_ICONS[item.dataset.subject] || '📖');
    });
  });
}

/* ─── 22. CSV Import ──────────────────────────────────────────── */
function initImportHandlers() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processCSV(file);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) processCSV(fileInput.files[0]); });

  const btn = document.getElementById('btn-do-import');
  if (btn) btn.addEventListener('click', () => fileInput.click());
}

function processCSV(file) {
  if (!file.name.endsWith('.csv')) { showToast('Please upload a .csv file', 'error'); return; }

  const loader = document.getElementById('import-loader');
  const alert  = document.getElementById('import-alert');
  if (loader) { loader.classList.remove('hidden'); loader.style.display = 'flex'; }
  if (alert)  alert.classList.add('hidden');

  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = async (e) => {
    try {
      const rows   = e.target.result.trim().split('\n');
      const header = rows[0].split(',').map(h => h.trim().toLowerCase());
      const reqCols = ['question','option_a','option_b','option_c','option_d','correct_option','difficulty'];

      const missing = reqCols.filter(c => !header.includes(c));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`);

      const questions = rows.slice(1).filter(r => r.trim()).map(row => {
        const cols = parseCSVRow(row);
        const obj  = {};
        header.forEach((h, i) => obj[h] = (cols[i] || '').trim());
        return obj;
      });

      const subject  = document.getElementById('imp-subject')?.value || 'General';
      const chapter  = document.getElementById('imp-chapter')?.value || 'Chapter 1';
      const quizName = document.getElementById('imp-quiz-name')?.value || `${subject} Quiz`;
      const classVal = 'Class 12';

      let saved = 0;
      document.getElementById('import-loader-text').textContent = `Importing ${questions.length} questions…`;

      for (const q of questions) {
        const shuffled = randomiseOptionOrder(q);
        await fetch(`${DB_CONFIG.baseUrl}/tables/questions/records`, {
          method: 'POST',
          headers: { 'x-api-key': DB_CONFIG.apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...q,
            subject, chapter, class: classVal, quiz_name: quizName,
            option_a: shuffled._options[0], option_b: shuffled._options[1],
            option_c: shuffled._options[2], option_d: shuffled._options[3],
            correct_option: ['A','B','C','D'][shuffled._correctIndex],
          })
        }).catch(() => {});
        saved++;
        document.getElementById('import-loader-text').textContent = `Imported ${saved}/${questions.length}…`;
      }

      // Also cache locally
      const cacheKey = `eq_qcache_${classVal}_${subject}_${chapter}`.replace(/\s+/g,'_').toLowerCase();
      const existing = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(cacheKey, JSON.stringify([...existing, ...questions]));

      showToast(`✅ ${saved} questions imported!`, 'success');
    } catch (err) {
      showImportAlert(err.message);
    } finally {
      if (loader) { loader.classList.add('hidden'); loader.style.display = 'none'; }
    }
  };
}

function parseCSVRow(row) {
  const result = []; let current = ''; let inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function showImportAlert(msg) {
  const alert = document.getElementById('import-alert');
  if (alert) { alert.textContent = `⚠️ ${msg}`; alert.classList.remove('hidden'); }
}

/* ─── 23. Confetti ────────────────────────────────────────────── */
function fireConfetti() {
  const canvas  = document.getElementById('confetti-canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({length:120}, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height - canvas.height,
    w:    (Math.random() * 8) + 4,
    h:    (Math.random() * 4) + 2,
    color:['#6C5CE7','#A29BFE','#00D2A0','#FFB020','#FF6B6B','#fd79a8','#fff'][Math.floor(Math.random()*7)],
    angle:Math.random() * 360,
    rotSpeed:(Math.random() - 0.5) * 6,
    vy:  (Math.random() * 3) + 2,
    vx:  (Math.random() - 0.5) * 2,
  }));

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.angle += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.angle * Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 180) requestAnimationFrame(animate);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  };
  requestAnimationFrame(animate);
}

/* ─── 24. Recent Results ──────────────────────────────────────── */
function updateRecentSection() {
  const section = document.getElementById('recent-section');
  const list    = document.getElementById('recent-list');
  if (!section || !list || !state.history.length) { section?.classList.add('hidden'); return; }

  section.classList.remove('hidden');
  list.innerHTML = state.history.slice(0,3).map(h => `
    <div class="recent-item">
      <div class="ri-score">${h.pct}%</div>
      <div class="ri-info">
        <div class="ri-name">${h.chapterTitle || 'Quiz'}</div>
        <div class="ri-meta">${h.classLabel || ''} · ${h.subject || ''} · ${h.correct}/${h.total}</div>
      </div>
      <span class="ri-retry">${h.grade}</span>
    </div>
  `).join('');
}

/* ─── 25. Navbar Scroll Effect ────────────────────────────────── */
function initNavbarScroll() {
  const navbar = document.getElementById('app-navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

/* ─── 26. Event Bindings ──────────────────────────────────────── */
function bindEvents() {
  // ── Bottom nav ──
  document.querySelectorAll('.bnav-item, .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (!screen) return;
      if (screen === 'quiz' && !state.selectedQuestions.length) {
        showToast('Start a quiz first!', ''); return;
      }
      showScreen(screen);
    });
  });

  // ── Logo / home ──
  document.getElementById('logo-btn')?.addEventListener('click', () => {
    state.selectedClass = null; state.selectedSubject = null;
    showView('classes');
    showScreen('home');
  });

  // ── Hero CTAs ──
  document.getElementById('btn-start-learning')?.addEventListener('click', () => {
    document.getElementById('view-classes')?.scrollIntoView({ behavior:'smooth' });
  });
  document.getElementById('btn-explore-subjects')?.addEventListener('click', () => {
    document.getElementById('view-classes')?.scrollIntoView({ behavior:'smooth' });
  });

  // ── Search ──
  const search = document.getElementById('global-search');
  if (search) {
    let debounce;
    search.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => handleSearch(search.value), 250);
    });
  }
  document.getElementById('btn-search-clear')?.addEventListener('click', () => {
    const s = document.getElementById('global-search');
    if (s) { s.value = ''; handleSearch(''); s.focus(); }
  });

  // ── Chapter filter ──
  document.getElementById('chapter-filter')?.addEventListener('input', e => {
    renderChapterList(e.target.value);
  });

  // ── Config sheet buttons ──
  document.querySelectorAll('#cfg-level-group .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setConfigLevel(btn.dataset.level));
  });
  document.querySelectorAll('.time-mode-card').forEach(card => {
    card.addEventListener('click', () => setConfigMode(card.dataset.mode));
  });

  // Stepper
  document.getElementById('cfg-q-minus')?.addEventListener('click', () => {
    const inp = document.getElementById('cfg-q-count');
    inp.value = Math.max(1, parseInt(inp.value) - 1);
    validateQCount();
  });
  document.getElementById('cfg-q-plus')?.addEventListener('click', () => {
    const inp = document.getElementById('cfg-q-count');
    inp.value = parseInt(inp.value) + 1;
    validateQCount();
  });
  document.getElementById('cfg-q-count')?.addEventListener('input', validateQCount);

  // Quick pills
  document.querySelectorAll('.stepper-pill[data-n]').forEach(pill => {
    pill.addEventListener('click', () => {
      const inp = document.getElementById('cfg-q-count');
      const n   = pill.dataset.n;
      if (n === 'all') {
        inp.value = pill.dataset.nVal || state.allQuestions.length || 100;
      } else {
        inp.value = parseInt(n);
      }
      document.querySelectorAll('.stepper-pill[data-n]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      validateQCount();
    });
  });

  // Timer minute pills
  document.querySelectorAll('.stepper-pill[data-mins]').forEach(pill => {
    pill.addEventListener('click', () => {
      const inp = document.getElementById('cfg-timer-min');
      if (inp) inp.value = parseInt(pill.dataset.mins);
      document.querySelectorAll('.stepper-pill[data-mins]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  document.getElementById('btn-launch-quiz')?.addEventListener('click', launchQuiz);
  document.getElementById('btn-close-config')?.addEventListener('click', () => closeSheet('config'));
  document.getElementById('config-overlay')?.addEventListener('click', () => closeSheet('config'));

  // ── Quiz screen ──
  document.getElementById('btn-q-prev')?.addEventListener('click', () => goToQuestion(state.currentQIndex - 1));
  document.getElementById('btn-q-next')?.addEventListener('click', () => goToQuestion(state.currentQIndex + 1));
  document.getElementById('btn-q-flag')?.addEventListener('click', flagCurrentQuestion);
  document.getElementById('btn-q-submit')?.addEventListener('click', openSubmitSheet);
  document.getElementById('btn-quiz-back')?.addEventListener('click', () => {
    if (confirm('Exit quiz? Progress will be saved.')) { saveInProgress(); showScreen('home'); }
  });

  // Submit sheet
  document.getElementById('btn-confirm-submit')?.addEventListener('click', submitQuiz);
  document.getElementById('btn-cancel-submit')?.addEventListener('click', () => closeSheet('submit'));
  document.getElementById('submit-overlay')?.addEventListener('click', () => closeSheet('submit'));

  // ── Results ──
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    const chap = state.lastResult?.quizId ? state.activeChapter : null;
    if (chap) openConfigSheet(chap, SUBJECT_ICONS[state.selectedSubject || ''] || '📖');
  });
  document.getElementById('btn-wrong-only')?.addEventListener('click', () => {
    renderReviewList(state.lastResult?.questions || [], true);
    showToast('Showing wrong answers only', '');
  });
  document.getElementById('btn-share-result')?.addEventListener('click', shareResult);
  document.getElementById('btn-result-home')?.addEventListener('click', () => {
    state.selectedClass = null; state.selectedSubject = null;
    showView('classes');
    showScreen('home');
  });
  document.getElementById('btn-toggle-all')?.addEventListener('click', () => {
    const items = document.querySelectorAll('.review-item');
    const allExpanded = [...items].every(i => i.classList.contains('expanded'));
    items.forEach(i => {
      i.classList.toggle('expanded', !allExpanded);
      const toggle = i.querySelector('.review-toggle');
      const hdr    = i.querySelector('.review-header');
      if (toggle) toggle.textContent = !allExpanded ? '▲' : '▼';
      if (hdr)    hdr.setAttribute('aria-expanded', !allExpanded);
    });
    document.getElementById('btn-toggle-all').textContent = allExpanded ? 'Expand All' : 'Collapse All';
  });

  // ── History ──
  document.getElementById('btn-hist-home')?.addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-clear-recent')?.addEventListener('click', () => {
    state.history = []; localStorage.removeItem('eq_history');
    updateRecentSection();
    showToast('History cleared', '');
  });

  // ── Sound toggle ──
  document.getElementById('btn-sound')?.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    document.getElementById('snd-on').classList.toggle('hidden', !state.soundEnabled);
    document.getElementById('snd-off').classList.toggle('hidden', state.soundEnabled);
    showToast(state.soundEnabled ? '🔊 Sound on' : '🔇 Sound off', '');
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    if (state.currentScreen !== 'quiz' || state.quizFinished) return;
    if (['1','a','A'].includes(e.key)) document.querySelector('.option-btn[data-index="0"]')?.click();
    if (['2','b','B'].includes(e.key)) document.querySelector('.option-btn[data-index="1"]')?.click();
    if (['3','c','C'].includes(e.key)) document.querySelector('.option-btn[data-index="2"]')?.click();
    if (['4','d','D'].includes(e.key)) document.querySelector('.option-btn[data-index="3"]')?.click();
    if (e.key === 'ArrowRight') document.getElementById('btn-q-next')?.click();
    if (e.key === 'ArrowLeft') document.getElementById('btn-q-prev')?.click();
    if (e.key === 'f') flagCurrentQuestion();
  });

  // Swipe support on quiz card
  initSwipeGestures();
}

/* ─── 27. Share Result ────────────────────────────────────────── */
async function shareResult() {
  const r = state.lastResult;
  if (!r) return;
  const text = `🎓 EduQuiz Result\n📘 ${r.chapterTitle}\nScore: ${r.correct}/${r.questions.length} (${r.pct}%)\nGrade: ${r.grade}\nTime: ${formatTime(r.timeTaken)}\n\nTry it at EduQuiz!`;
  if (navigator.share) {
    try { await navigator.share({ title:'EduQuiz Result', text }); return; } catch {}
  }
  navigator.clipboard.writeText(text).then(() => showToast('Result copied!', 'success'));
}

/* ─── 28. Swipe Gestures ──────────────────────────────────────── */
function initSwipeGestures() {
  const wrap = document.getElementById('quiz-card-wrap');
  if (!wrap) return;
  let startX = 0;
  wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive:true });
  wrap.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) document.getElementById('btn-q-next')?.click();
    else         document.getElementById('btn-q-prev')?.click();
  }, { passive:true });
}

/* ─── 29. Validate Q count ────────────────────────────────────── */
function validateQCount() {
  const inp  = document.getElementById('cfg-q-count');
  const warn = document.getElementById('cfg-q-warn');
  const avail = state.allQuestions.length || 100;
  const val  = parseInt(inp.value);
  if (val > avail && warn) warn.classList.remove('hidden');
  else if (warn)            warn.classList.add('hidden');
}

/* ─── 30. Init ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted state
  loadHistory();
  state.xp = parseInt(localStorage.getItem('eq_xp') || '0');
  state.soundEnabled = localStorage.getItem('eq_sound') !== 'false';
  document.getElementById('snd-on').classList.toggle('hidden', !state.soundEnabled);
  document.getElementById('snd-off').classList.toggle('hidden', state.soundEnabled);

  // Bind all events
  bindEvents();

  // Init features
  initNavbarScroll();
  initHeroCounters();
  setupScrollReveal();
  setupDailyChallenge();
  renderClassChips();
  updateStreakUI();

  // Show home & render class grid
  showScreen('home');
  renderClassGrid();

  // Try to resume saved in-progress
  tryResumeSaved();

  console.log('✅ EduQuiz loaded — PRD v3.0');
});

/* ─── 31. Sound persist ───────────────────────────────────────── */
window.addEventListener('beforeunload', () => {
  localStorage.setItem('eq_sound', state.soundEnabled);
});
