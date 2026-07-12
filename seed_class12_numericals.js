// Seed numericals quizzes for Class 12 chapters (Chemistry + Physics)
const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

async function request(path, options = {}) {
  const headers = {
    'apikey': INSFORGE_KEY,
    'Authorization': `Bearer ${INSFORGE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const resp = await fetch(`${INSFORGE_URL}/api/database/records/${path}`, { ...options, headers });
  if (!resp.ok) { const t = await resp.text(); throw new Error(`DB Error [${resp.status}]: ${t}`); }
  if (resp.status === 204) return null;
  return resp.json();
}

// Class 12 subjects that need numericals
const NUMERICALS_DATA = {
  'Chemistry': {
    chapters: ['Solutions', 'Electrochemistry', 'Chemical Kinetics'],
    templates: [
      { q: 'Calculate the molarity of a solution containing 4g of NaOH (MM=40) in 250 mL of solution.', ans: '0.4 M', w1: '0.8 M', w2: '1.6 M', w3: '0.1 M' },
      { q: 'Using Faraday\'s law, what mass of copper (MM=63.5) is deposited when 2A flows for 30 min? (F=96500 C)', ans: '1.188 g', w1: '2.376 g', w2: '0.594 g', w3: '3.175 g' },
      { q: 'The rate constant of a first-order reaction is 0.693 min⁻¹. What is the half-life?', ans: '1 minute', w1: '0.5 minutes', w2: '2 minutes', w3: '0.693 minutes' },
      { q: 'For a cell Zn|Zn²⁺||Cu²⁺|Cu, E°cell = 1.10V. Calculate ΔG° (n=2, F=96500 C/mol)', ans: '-212300 J/mol', w1: '+212300 J/mol', w2: '-106150 J/mol', w3: '-424600 J/mol' },
      { q: 'What is the boiling point elevation of 2m glucose solution? (Kb = 0.52 K kg/mol)', ans: '1.04°C', w1: '0.52°C', w2: '2.08°C', w3: '0.26°C' },
      { q: 'Calculate depression in freezing point for 10g of glucose (MM=180) in 100g water. Kf=1.86 K kg/mol', ans: '1.033 K', w1: '0.516 K', w2: '2.067 K', w3: '0.186 K' },
      { q: 'The molar conductivity of 0.001 M NaCl is 123.7 S cm² mol⁻¹. Calculate conductivity.', ans: '1.237 × 10⁻⁴ S cm⁻¹', w1: '1.237 × 10⁻³ S cm⁻¹', w2: '1.237 × 10⁻² S cm⁻¹', w3: '1.237 × 10⁻⁵ S cm⁻¹' },
      { q: 'If rate = k[A]²[B] and [A] doubles keeping [B] constant, the rate becomes:', ans: '4 times the original rate', w1: '2 times the original rate', w2: '8 times the original rate', w3: 'Same as original rate' },
      { q: 'Henry\'s law constant for CO₂ is 1.67 × 10⁸ Pa at 298K. Find mole fraction when p(CO₂) = 2.5 × 10⁵ Pa', ans: '1.5 × 10⁻³', w1: '1.5 × 10⁻²', w2: '6.68 × 10⁻⁴', w3: '4.175 × 10⁻² ' },
      { q: 'Activation energy of a reaction is 75 kJ/mol. If rate doubles at 300K, find the higher temperature.', ans: '≈ 308.5 K', w1: '350 K', w2: '290 K', w3: '320 K' },
      { q: 'A fuel cell uses 200 g of H₂ (MM=2). How many moles of electrons are transferred? (n=2 per H₂)', ans: '200 mol', w1: '100 mol', w2: '400 mol', w3: '2 mol' },
      { q: 'Osmotic pressure of 0.1 M glucose solution at 27°C is: (R=0.0821 L atm/mol K)', ans: '2.46 atm', w1: '0.246 atm', w2: '24.6 atm', w3: '1.23 atm' },
      { q: 'A 0.01 M weak acid has degree of dissociation 0.1. Calculate van\'t Hoff factor i.', ans: '1.1', w1: '0.9', w2: '1.5', w3: '2.0' },
      { q: 'Time for 75% completion of first-order reaction if t₁/₂ = 10 min:', ans: '20 minutes', w1: '15 minutes', w2: '25 minutes', w3: '30 minutes' },
      { q: 'Current 0.5 A is passed for 30 minutes. Calculate charge passed in coulombs.', ans: '900 C', w1: '1800 C', w2: '450 C', w3: '60 C' },
      { q: 'Equivalent conductance at infinite dilution of HCl is 426.2 S cm² eq⁻¹. What does this imply?', ans: 'HCl is a strong electrolyte with maximum ionic mobility', w1: 'HCl is a weak electrolyte', w2: 'HCl does not conduct electricity', w3: 'HCl has low degree of dissociation' },
      { q: 'For a zero-order reaction, [A] decreases from 0.8 M to 0.2 M in 40 s. Find k.', ans: '0.015 mol L⁻¹ s⁻¹', w1: '0.03 mol L⁻¹ s⁻¹', w2: '0.0075 mol L⁻¹ s⁻¹', w3: '0.6 mol L⁻¹ s⁻¹' },
      { q: 'Mass of silver deposited (MM=108) in 1 hour at 0.5 A current: (F = 96500 C)', ans: '2.01 g', w1: '4.02 g', w2: '1.005 g', w3: '54 g' },
      { q: 'Calculate the EMF of cell using Nernst equation: E°= 1.1V, n=2, Q=10⁻² at 25°C', ans: '1.159 V', w1: '1.041 V', w2: '1.1 V', w3: '0.941 V' },
      { q: 'Molecular mass of polymer from osmotic pressure 1.5 × 10⁻³ atm in 200 mL at 300K (2g dissolved):', ans: '~1.64 × 10⁵ g/mol', w1: '~8.2 × 10³ g/mol', w2: '~3.28 × 10⁵ g/mol', w3: '~1.64 × 10³ g/mol' }
    ]
  },
  'Physics': {
    chapters: ['Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity',
               'Moving Charges and Magnetism', 'Electromagnetic Induction', 'Alternating Current',
               'Ray Optics and Optical Instruments', 'Atoms', 'Nuclei'],
    templates: [
      { q: 'Two charges of +2μC and -3μC are 30 cm apart. Find the electrostatic force. (k=9×10⁹ N m²/C²)', ans: '0.6 N (attractive)', w1: '0.6 N (repulsive)', w2: '6 N', w3: '0.06 N' },
      { q: 'A capacitor of 4 μF is connected to 100V. Find the charge stored.', ans: '4 × 10⁻⁴ C', w1: '4 × 10⁻² C', w2: '4 × 10⁻⁶ C', w3: '400 C' },
      { q: 'A wire of resistance 5 Ω carries 2 A for 10 minutes. Find heat generated.', ans: '12000 J', w1: '6000 J', w2: '100 J', w3: '200 J' },
      { q: 'A proton moves at 10⁶ m/s perpendicular to a 0.5 T field. Find the radius of its path. (m=1.67×10⁻²⁷ kg, q=1.6×10⁻¹⁹ C)', ans: '≈ 0.0209 m', w1: '0.209 m', w2: '0.00209 m', w3: '2.09 m' },
      { q: 'A 100-turn coil has area 0.01 m². B changes from 0 to 1 T in 0.1 s. Find induced EMF.', ans: '10 V', w1: '1 V', w2: '100 V', w3: '0.1 V' },
      { q: 'In an AC circuit, V=220V (rms), f=50Hz. Write equation for instantaneous voltage.', ans: 'V = 311 sin(314t) V', w1: 'V = 220 sin(50t) V', w2: 'V = 220 sin(314t) V', w3: 'V = 311 sin(100t) V' },
      { q: 'Focal length of a concave mirror is 15 cm. Where is image of object 45 cm in front?', ans: '-22.5 cm (real, inverted)', w1: '22.5 cm (virtual)', w2: '-45 cm', w3: '-90 cm' },
      { q: 'In Bohr model, radius of first orbit of hydrogen is 0.529 Å. Radius of third orbit is:', ans: '4.761 Å', w1: '1.587 Å', w2: '9 Å', w3: '0.588 Å' },
      { q: 'Calculate the energy released in fission of ²³⁵U if mass defect is 0.2u. (1u = 931 MeV)', ans: '186.2 MeV', w1: '0.2 MeV', w2: '931 MeV', w3: '93.1 MeV' },
      { q: 'Resistance of a wire doubles. If voltage remains same, current becomes:', ans: 'Half the original', w1: 'Double the original', w2: 'Same as original', w3: 'Four times original' },
      { q: 'Three resistors of 2Ω, 3Ω, 6Ω are in parallel. Find the equivalent resistance.', ans: '1 Ω', w1: '11 Ω', w2: '0.5 Ω', w3: '3.67 Ω' },
      { q: 'A transformer has 200 primary and 4000 secondary turns. Input is 220V. Find output voltage.', ans: '4400 V', w1: '11 V', w2: '440 V', w3: '44000 V' },
      { q: 'A lens forms an image at 20 cm for object at 60 cm. Find focal length.', ans: '15 cm', w1: '30 cm', w2: '20 cm', w3: '12 cm' },
      { q: 'De Broglie wavelength of electron at 100V: (m=9.1×10⁻³¹, h=6.63×10⁻³⁴, e=1.6×10⁻¹⁹)', ans: '1.23 Å', w1: '12.3 Å', w2: '0.123 Å', w3: '123 Å' },
      { q: 'Half-life of ⁴⁰K is 1.3×10⁹ years. Find decay constant.', ans: '5.33 × 10⁻¹⁰ yr⁻¹', w1: '1.3 × 10⁹ yr⁻¹', w2: '2.665 × 10⁻¹⁰ yr⁻¹', w3: '1.0 × 10⁻⁹ yr⁻¹' },
      { q: 'Power of an AC circuit: V_rms = 220V, I_rms = 2A, cos φ = 0.8. Find power.', ans: '352 W', w1: '440 W', w2: '280 W', w3: '176 W' },
      { q: 'Electric field between plates of capacitor is 1000 V/m and distance is 2 mm. Potential difference:', ans: '2 V', w1: '0.5 V', w2: '200 V', w3: '500 V' },
      { q: 'Magnetic field at center of circular loop of radius 10 cm carrying 2 A: (μ₀ = 4π×10⁻⁷)', ans: '1.257 × 10⁻⁵ T', w1: '1.257 × 10⁻⁴ T', w2: '6.28 × 10⁻⁶ T', w3: '4π × 10⁻⁷ T' },
      { q: 'Refractive index of glass is 1.5. Speed of light in glass is:', ans: '2 × 10⁸ m/s', w1: '3 × 10⁸ m/s', w2: '1.5 × 10⁸ m/s', w3: '4.5 × 10⁸ m/s' },
      { q: 'Ground state energy of hydrogen is -13.6 eV. Energy of photon emitted for n=3 to n=1:', ans: '12.09 eV', w1: '13.6 eV', w2: '1.51 eV', w3: '10.2 eV' }
    ]
  }
};

function generateNumericalQuestionsForClass12(subject, templates) {
  const questions = [];
  const difficulties = ['easy','easy','easy','easy','easy',
                        'moderate','moderate','moderate','moderate','moderate','moderate',
                        'hard','hard','hard','hard','hard',
                        'neet','neet','neet','neet'];
  
  const prefix = subject === 'Chemistry' 
    ? '[Class 12 Chem Numerical]' 
    : '[Class 12 Physics Numerical]';

  difficulties.forEach((diff, i) => {
    const tmpl = templates[i % templates.length];
    const opts = [
      { text: tmpl.ans, correct: true },
      { text: tmpl.w1, correct: false },
      { text: tmpl.w2, correct: false },
      { text: tmpl.w3, correct: false }
    ].sort(() => Math.random() - 0.5);
    const correctLetter = ['A','B','C','D'][opts.findIndex(o => o.correct)];
    questions.push({
      difficulty: diff,
      question: `${prefix} [${diff.toUpperCase()}] ${tmpl.q}`,
      option_a: opts[0].text, option_b: opts[1].text,
      option_c: opts[2].text, option_d: opts[3].text,
      correct_option: correctLetter
    });
  });

  // Fill to 100
  while (questions.length < 100) {
    const tmpl = templates[Math.floor(Math.random() * templates.length)];
    const diff = ['easy','moderate','hard','neet'][Math.floor(Math.random() * 4)];
    const opts = [
      { text: tmpl.ans, correct: true },
      { text: tmpl.w1, correct: false },
      { text: tmpl.w2, correct: false },
      { text: tmpl.w3, correct: false }
    ].sort(() => Math.random() - 0.5);
    const correctLetter = ['A','B','C','D'][opts.findIndex(o => o.correct)];
    questions.push({
      difficulty: diff,
      question: `${prefix} [Variant ${questions.length}] ${tmpl.q}`,
      option_a: opts[0].text, option_b: opts[1].text,
      option_c: opts[2].text, option_d: opts[3].text,
      correct_option: correctLetter
    });
  }
  return questions.slice(0, 100);
}

async function seedClass12Numericals() {
  console.log('Seeding Class 12 Numericals Quizzes...\n');

  for (const [subjectName, data] of Object.entries(NUMERICALS_DATA)) {
    console.log(`Processing: ${subjectName}`);

    const existingSub = await request(`subjects?name=eq.${encodeURIComponent(subjectName)}`);
    if (!existingSub || existingSub.length === 0) {
      console.log(`  Subject "${subjectName}" not found in DB, skipping.`);
      continue;
    }
    const subjectId = existingSub[0].id;

    for (const chapterName of data.chapters) {
      const existingChap = await request(`chapters?subject_id=eq.${subjectId}&name=eq.${encodeURIComponent(chapterName)}`);
      if (!existingChap || existingChap.length === 0) {
        console.log(`  Chapter "${chapterName}" not found, skipping.`);
        continue;
      }
      const chapterId = existingChap[0].id;

      const numQuizName = `${chapterName} — Numericals`;
      const existing = await request(`quizzes?chapter_id=eq.${chapterId}&name=eq.${encodeURIComponent(numQuizName)}`);
      if (existing && existing.length > 0) {
        console.log(`  [SKIP] ${numQuizName} already exists`);
        continue;
      }

      const quizRows = await request('quizzes', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ chapter_id: chapterId, name: numQuizName }])
      });
      const quizId = quizRows[0].id;

      const questions = generateNumericalQuestionsForClass12(subjectName, data.templates)
        .map(q => ({ quiz_id: quizId, ...q }));

      for (let i = 0; i < questions.length; i += 50) {
        await request('questions', {
          method: 'POST',
          body: JSON.stringify(questions.slice(i, i + 50))
        });
      }
      console.log(`  ✓ ${numQuizName}: ${questions.length} questions`);
    }
  }
  console.log('\n✅ Class 12 Numericals seeding DONE!');
}

seedClass12Numericals().catch(e => { console.error(e); process.exit(1); });
