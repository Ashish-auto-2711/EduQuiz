const INSFORGE_URL = 'https://c43du8wy.us-east.insforge.app';
const INSFORGE_KEY = 'anon_61ab7eb0294a9648862366b8f8304a46b8fc7bdb08db307e9ef9c1b014768351';

const SYLLABUS = {
  'Chemistry': [
    'Solutions',
    'Electrochemistry',
    'Chemical Kinetics',
    'd- and f-Block Elements',
    'Coordination Compounds',
    'Haloalkanes and Haloarenes',
    'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids',
    'Amines',
    'Biomolecules'
  ],
  'Physics': [
    'Electric Charges and Fields',
    'Electrostatic Potential and Capacitance',
    'Current Electricity',
    'Moving Charges and Magnetism',
    'Magnetism and Matter',
    'Electromagnetic Induction',
    'Alternating Current',
    'Electromagnetic Waves',
    'Ray Optics and Optical Instruments',
    'Wave Optics',
    'Dual Nature of Radiation and Matter',
    'Atoms',
    'Nuclei',
    'Semiconductor Electronics: Materials, Devices and Simple Circuits'
  ],
  'Biology': [
    'Sexual Reproduction in Flowering Plants',
    'Human Reproduction',
    'Reproductive Health',
    'Principles of Inheritance and Variation',
    'Molecular Basis of Inheritance',
    'Evolution',
    'Human Health and Disease',
    'Microbes in Human Welfare',
    'Biotechnology: Principles and Processes',
    'Biotechnology and Its Applications',
    'Organisms and Populations',
    'Ecosystem',
    'Biodiversity and Conservation'
  ]
};

// We will use the same detailed concept vocabulary to ensure high quality
const SYLLABUS_METADATA = {
  // --- CHEMISTRY CHAPTERS ---
  'Solutions': {
    concepts: [
      { name: 'Molarity', eq: 'M = Moles of Solute / Liters of Solution', unit: 'mol/L', app: 'Volumetric chemical analysis', fact: 'Decreases with increase in temperature due to expansion' },
      { name: 'Molality', eq: 'm = Moles of Solute / kg of Solvent', unit: 'mol/kg', app: 'Determining boiling point elevation', fact: 'Independent of temperature as mass is constant' },
      { name: 'Henry\'s Law', eq: 'p = KH * x', unit: 'atm or bar', app: 'Carbonated beverages and deep-sea diving scuba cylinders', fact: 'KH increases with temperature, decreasing gas solubility' },
      { name: 'Raoult\'s Law', eq: 'p_total = pA* xA + pB* xB', unit: 'atm', app: 'Fractional distillation of binary mixtures', fact: 'Applies to ideal solutions with similar A-A, B-B, and A-B forces' },
      { name: 'Positive Deviation', eq: 'p_total > pA* xA + pB* xB', unit: 'None', app: 'Ethanol and Acetone mixture distillation', fact: 'Mixing is endothermic (dH > 0) and volume increases (dV > 0)' },
      { name: 'Negative Deviation', eq: 'p_total < pA* xA + pB* xB', unit: 'None', app: 'Phenol and Aniline mixture interactions', fact: 'Hydrogen bonding forms between components, releasing heat (dH < 0)' },
      { name: 'Minimum Boiling Azeotrope', eq: 'p_max > p_ideal', unit: 'None', app: 'Ethanol-Water constant boiling mixture', fact: 'Shows large positive deviation from Raoult\'s Law' },
      { name: 'Maximum Boiling Azeotrope', eq: 'p_min < p_ideal', unit: 'None', app: 'Nitric acid-Water constant boiling mixture', fact: 'Shows large negative deviation from Raoult\'s Law' },
      { name: 'Osmotic Pressure', eq: 'pi = i * C * R * T', unit: 'atm or bar', app: 'Desalination of water via reverse osmosis', fact: 'Ideal for determining macromolecule molar masses' },
      { name: 'van \'t Hoff Factor', eq: 'i = Normal molar mass / Abnormal molar mass', unit: 'Dimensionless', app: 'Calculating degree of dissociation or association', fact: 'i > 1 for electrolytes, i < 1 for dimerizing solutes' },
      { name: 'Ebullioscopic Constant', eq: 'Kb = R * M * Tb^2 / (1000 * dH_vap)', unit: 'K kg mol^-1', app: 'Calculating elevation in boiling point', fact: 'Depends only on the properties of the solvent' },
      { name: 'Cryoscopic Constant', eq: 'Kf = R * M * Tf^2 / (1000 * dH_fus)', unit: 'K kg mol^-1', app: 'Calculating depression of freezing point', fact: 'Depends only on properties of the solvent' },
      { name: 'Isotonic Solutions', eq: 'pi_1 = pi_2', unit: 'None', app: 'Intravenous fluid drip concentration safety', fact: 'No net osmosis occurs across a semi-permeable membrane' },
      { name: 'Reverse Osmosis', eq: 'Applied Pressure > pi', unit: 'None', app: 'Water purification and desalination', fact: 'Solvent flows from concentrated solution to pure solvent' },
      { name: 'Relative Lowering of Vapor Pressure', eq: '(p* - p) / p* = i * x_solute', unit: 'Dimensionless', app: 'Determining non-volatile solute molecular weights', fact: 'Depends only on mole fraction of solute particles' }
    ]
  },
  'Electrochemistry': {
    concepts: [
      { name: 'Daniel Cell', eq: 'Zn(s) + Cu^2+(aq) -> Zn^2+(aq) + Cu(s)', unit: 'Volt', app: 'Chemical battery prototype', fact: 'Gibbs Free Energy is negative, spontaneous current' },
      { name: 'Salt Bridge', eq: 'K+ and Cl- ion flow', unit: 'None', app: 'Maintaining electrical neutrality in half cells', fact: 'Contains inert electrolyte in agar-agar gel' },
      { name: 'Standard Hydrogen Electrode', eq: 'E* = 0.00 V', unit: 'Volt', app: 'Reference electrode for redox potentials', fact: 'Standard conditions: 1 bar H2 gas, 1 M H+ ions' },
      { name: 'Nernst Equation', eq: 'E = E* - (0.0591/n) * log(Q)', unit: 'Volt', app: 'Calculating cell EMF under non-standard conditions', fact: 'E_cell decreases as concentration of products increases' },
      { name: 'Kohlrausch\'s Law', eq: 'L_inf = v_+ * L_+ + v_- * L_-', unit: 'S cm^2 mol^-1', app: 'Calculating limiting conductivity of weak electrolytes', fact: 'Based on independent migration of ions at infinite dilution' },
      { name: 'Faraday\'s First Law', eq: 'w = z * Q = z * I * t', unit: 'grams', app: 'Industrial electroplating control', fact: 'Mass deposited is proportional to charge passed' },
      { name: 'Faraday\'s Second Law', eq: 'w1 / w2 = E1 / E2', unit: 'Dimensionless', app: 'Sequential electrolysis analysis', fact: 'Masses deposited are in the ratio of chemical equivalents' },
      { name: 'Specific Conductance', eq: 'kappa = 1 / rho = G * (l/A)', unit: 'S cm^-1', app: 'Conductivity', fact: 'Decreases with dilution because ions per unit volume decrease' },
      { name: 'Molar Conductivity', eq: 'L_m = kappa * 1000 / M', unit: 'S cm^2 mol^-1', app: 'Determining degree of dissociation', fact: 'Increases with dilution for both strong and weak electrolytes' },
      { name: 'Lead Storage Battery', eq: 'Pb + PbO2 + 2H2SO4 <-> 2PbSO4 + 2H2O', unit: '2.0 V per cell', app: 'Automobile starters', fact: 'Secondary cell that acts as galvanic during discharge, electrolytic during charge' },
      { name: 'Fuel Cell', eq: '2H2 + O2 -> 2H2O', unit: '1.23 V', app: 'Apollo space program power generation', fact: 'Highly efficient, eco-friendly water byproduct' },
      { name: 'Dry Cell', eq: 'Zn + 2MnO2 + 2NH4+ -> Zn^2+ + Mn2O3 + 2NH3 + H2O', unit: '1.5 V', app: 'Flashlights and remote controls', fact: 'Primary cell that cannot be recharged once exhausted' },
      { name: 'Corrosion', eq: 'Fe_2O_3 * xH_2O formation', unit: 'None', app: 'Rusting of iron infrastructure', fact: 'Anodic reaction: Fe -> Fe2+ + 2e; Cathodic reaction: O2 + 4H+ + 4e -> 2H2O' }
    ]
  },
  'Chemical Kinetics': {
    concepts: [
      { name: 'Rate Constant', eq: 'Rate = k * [A]^x * [B]^y', unit: 'Variable based on order', app: 'Predicting reaction speeds', fact: 'Depends only on temperature and catalyst presence' },
      { name: 'Zero-Order Reaction', eq: '[A]_t = -kt + [A]_0', unit: 'mol L^-1 s^-1', app: 'Decomposition of ammonia on hot platinum catalyst', fact: 'Rate is independent of reactant concentration' },
      { name: 'First-Order Reaction', eq: 'k = (2.303/t) * log([A]_0 / [A]_t)', unit: 's^-1', app: 'Radioactive decay processes', fact: 'Half-life is constant and independent of initial concentration' },
      { name: 'Arrhenius Equation', eq: 'k = A * e^(-Ea / RT)', unit: 'Variable', app: 'Calculating activation energy', fact: 'Plot of ln k vs 1/T yields a straight line with slope -Ea/R' },
      { name: 'Activation Energy', eq: 'Ea = Energy Barrier', unit: 'kJ/mol', app: 'Industrial catalyst optimization', fact: 'Catalyst lowers Ea by providing an alternate reaction pathway' },
      { name: 'Molecularity', eq: 'Number of colliding reactant molecules', unit: 'Integer', app: 'Understanding elementary reaction mechanisms', fact: 'Cannot be zero, fractional, or negative, unlike reaction order' },
      { name: 'Half-Life of Zero-Order', eq: 't_half = [A]_0 / (2k)', unit: 'Second', app: 'Determining zero-order rate constants', fact: 'Directly proportional to initial reactant concentration' }
    ]
  },
  'd- and f-Block Elements': {
    concepts: [
      { name: 'Lanthanoid Contraction', eq: 'Gradual size decrease in 4f series', unit: 'None', app: 'Separation of lanthanoid ions', fact: 'Poor shielding effect of 4f electrons causes atomic radius shrinkage' },
      { name: 'Interstitial Compounds', eq: 'H, C, N trapped in metal lattice', unit: 'None', app: 'Hard alloy steel manufacturing', fact: 'Formed by d-block metals; are chemically inert and very hard' },
      { name: 'Transition Metal Catalysis', eq: 'Variable oxidation states', unit: 'None', app: 'Haber process (Fe) and Contact process (V2O5)', fact: 'Provide large surface area and variable oxidation states for reactions' },
      { name: 'Alloy Formation', eq: 'Atomic radii within 15% rule', unit: 'None', app: 'Stainless steel and brass production', fact: 'Transition metals form alloys due to similar atomic sizes in lattice' }
    ]
  },
  'Coordination Compounds': {
    concepts: [
      { name: 'Crystal Field Splitting', eq: 't_2g and e_g orbital energy gap', unit: 'cm^-1', app: 'Predicting colors of complex ions', fact: 'Strong field ligands cause greater splitting than weak field ligands' },
      { name: 'Spectrochemical Series', eq: 'I- < Cl- < F- < H2O < NH3 < CN- < CO', unit: 'None', app: 'Determining high-spin vs low-spin states', fact: 'Ligands arranged in order of increasing crystal field splitting' },
      { name: 'Chelation Effect', eq: 'Ring structure formation by polydentate ligands', unit: 'None', app: 'Heavy metal poisoning treatment (EDTA)', fact: 'Chelate complexes are significantly more stable than monodentate equivalents' }
    ]
  },
  'Haloalkanes and Haloarenes': {
    concepts: [
      { name: 'SN1 Mechanism', eq: 'Rate = k * [Alkyl Halide]', unit: 'First order kinetics', app: 'Synthesis of tertiary alcohols', fact: 'Proceeds via carbocation intermediate, leads to racemization' },
      { name: 'SN2 Mechanism', eq: 'Rate = k * [Alkyl Halide] * [Nucleophile]', unit: 'Second order kinetics', app: 'Primary carbon nucleophilic substitution', fact: 'Single-step transition state, leads to Walden inversion of configuration' },
      { name: 'Finkelstein Reaction', eq: 'R-Cl + NaI -acetone-> R-I + NaCl', unit: 'None', app: 'Synthesis of alkyl iodides', fact: 'Dry acetone facilitates precipitation of NaCl according to Le Chatelier' }
    ]
  },
  'Alcohols, Phenols and Ethers': {
    concepts: [
      { name: 'Hydroboration-Oxidation', eq: 'R-CH=CH2 -> R-CH2-CH2-OH', unit: 'None', app: 'Anti-Markovnikov hydration of alkenes', fact: 'Yields primary alcohols with no carbocation rearrangement' },
      { name: 'Kolbe\'s Reaction', eq: 'Phenol + NaOH + CO2 -> Salicylic Acid', unit: 'None', app: 'Aspirin synthesis precursor', fact: 'Electrophilic substitution by weak electrophile CO2' }
    ]
  },
  'Aldehydes, Ketones and Carboxylic Acids': {
    concepts: [
      { name: 'Aldol Condensation', eq: 'Alpha-hydrogen carbonyl dimer', unit: 'None', app: 'Carbon-carbon bond formation', fact: 'Requires aldehydes/ketones containing at least one alpha-hydrogen' },
      { name: 'Cannizzaro Reaction', eq: 'HCHO + NaOH -> CH3OH + HCOONa', unit: 'None', app: 'Formaldehyde disproportionation', fact: 'Aldehydes with no alpha-hydrogens undergo self-redox' }
    ]
  },
  'Amines': {
    concepts: [
      { name: 'Hoffmann Bromamide Degradation', eq: 'R-CONH2 + Br2 + 4NaOH -> R-NH2 + Na2CO3 + 2NaBr', unit: 'None', app: 'Synthesis of primary amines with one less carbon', fact: 'Proceeds via alkyl isocyanate intermediate rearrangement' }
    ]
  },
  'Biomolecules': {
    concepts: [
      { name: 'Peptide Bond', eq: '-CO-NH- linkage', unit: 'None', app: 'Protein polypeptide chain formation', fact: 'Condensation product of amino acid amino and carboxyl groups' },
      { name: 'Denaturation of Proteins', eq: 'Secondary/tertiary structure disruption', unit: 'None', app: 'Egg albumin boiling changes', fact: 'Affects hydrogen bonds; primary amino acid sequence remains intact' }
    ]
  },

  // --- PHYSICS CHAPTERS ---
  'Electric Charges and Fields': {
    concepts: [
      { name: 'Coulomb\'s Law', eq: 'F = 1/(4*pi*eps0) * (q1*q2)/r^2', unit: 'Newton', app: 'Calculating electrostatic force', fact: 'Force is central, conservative, and obeys inverse square law' },
      { name: 'Quantization of Charge', eq: 'q = +/- n * e', unit: 'Coulomb', app: 'Millikan oil drop experiment verification', fact: 'Charge can only exist in integral multiples of basic unit e' },
      { name: 'Gauss\'s Law', eq: 'Flux = enclosed Q / eps0', unit: 'N m^2 C^-1', app: 'Finding electric fields of symmetric conductors', fact: 'Independent of the shape and size of the enclosing surface' },
      { name: 'Electric Dipole Moment', eq: 'p = q * 2a', unit: 'Coulomb-meter', app: 'Molecular polarity analysis', fact: 'Direction is from negative charge to positive charge' }
    ]
  },
  'Electrostatic Potential and Capacitance': {
    concepts: [
      { name: 'Parallel Plate Capacitor', eq: 'C = eps0 * A / d', unit: 'Farad', app: 'Filter circuits and memory storage cells', fact: 'Dielectric slab insertion increases capacitance by factor K' }
    ]
  },
  'Current Electricity': {
    concepts: [
      { name: 'Ohm\'s Law', eq: 'V = I * R', unit: 'Volt', app: 'Circuit design limits', fact: 'Resistance depends on dimensions, material, and temperature' },
      { name: 'Drift Velocity', eq: 'vd = (e * E * tau) / m', unit: 'm/s', app: 'Understanding electrical conduction', fact: 'Average velocity electron gains due to an applied electric field' }
    ]
  },
  'Moving Charges and Magnetism': {
    concepts: [
      { name: 'Biot-Savart Law', eq: 'dB = (mu0/4*pi) * (I * dl x r) / r^3', unit: 'Tesla', app: 'Calculating magnetic fields of complex wire configurations', fact: 'Analogue to Coulomb\'s law in electrostatics' },
      { name: 'Ampere\'s Circuital Law', eq: 'Line integral B.dl = mu0 * I', unit: 'Tesla-meter', app: 'Solenoid and toroid field calculations', fact: 'Only holds for steady currents' }
    ]
  },
  'Magnetism and Matter': {
    concepts: [
      { name: 'Ferromagnetism', eq: 'Domino spin alignment', unit: 'None', app: 'Permanent magnets and transformer cores', fact: 'Becomes paramagnetic above the Curie temperature' }
    ]
  },
  'Electromagnetic Induction': {
    concepts: [
      { name: 'Faraday\'s Law of EMI', eq: 'e = -dPhi / dt', unit: 'Volt', app: 'Electric generators and induction stoves', fact: 'Negative sign represents Lenz\'s law of conservation of energy' }
    ]
  },
  'Alternating Current': {
    concepts: [
      { name: 'Resonance in LCR Circuit', eq: 'omega_0 = 1 / sqrt(L * C)', unit: 'rad/s', app: 'Radio and TV tuning circuits', fact: 'Impedance is minimum, current is maximum, power factor is 1' }
    ]
  },
  'Electromagnetic Waves': {
    concepts: [
      { name: 'Displacement Current', eq: 'Id = eps0 * dPhi_E / dt', unit: 'Ampere', app: 'Maxwell\'s equation consistency', fact: 'Produced by time-varying electric fields inside capacitor plates' }
    ]
  },
  'Ray Optics and Optical Instruments': {
    concepts: [
      { name: 'Total Internal Reflection', eq: 'sin(ic) = 1 / n', unit: 'None', app: 'Fiber optic cables and mirage formation', fact: 'Light must travel from denser to rarer medium with angle > critical angle' }
    ]
  },
  'Wave Optics': {
    concepts: [
      { name: 'Brewster\'s Law', eq: 'n = tan(ip)', unit: 'None', app: 'Polarizing sunglasses', fact: 'Reflected light is completely polarized when angle is ip' }
    ]
  },
  'Dual Nature of Radiation and Matter': {
    concepts: [
      { name: 'de Broglie Wavelength', eq: 'lambda = h / p = h / (m * v)', unit: 'Meter', app: 'Electron microscope resolution', fact: 'Wavelength associated with any moving mass particle' }
    ]
  },
  'Atoms': {
    concepts: [
      { name: 'Bohr\'s Quantization Condition', eq: 'm * v * r = n * h / (2 * pi)', unit: 'kg m^2 s^-1', app: 'Bohr model of hydrogen atom', fact: 'Electrons revolve only in non-radiating stationary orbits' }
    ]
  },
  'Nuclei': {
    concepts: [
      { name: 'Nuclear Binding Energy', eq: 'BE = dM * c^2', unit: 'MeV', app: 'Nuclear fission and fusion reactors', fact: 'Mass defect represents converted binding energy holding nucleons' }
    ]
  },
  'Semiconductor Electronics: Materials, Devices and Simple Circuits': {
    concepts: [
      { name: 'P-N Junction Diode', eq: 'Depletion region potential barrier', unit: 'Volt', app: 'Rectifiers (AC to DC conversion)', fact: 'Conducts current easily under forward bias, blocks in reverse bias' }
    ]
  },

  // --- BIOLOGY CHAPTERS ---
  'Sexual Reproduction in Flowering Plants': {
    concepts: [
      { name: 'Double Fertilization', eq: 'Syngamy + Triple Fusion', unit: 'None', app: 'Seed and endosperm development', fact: 'Unique feature of angiosperms leading to diploid zygote and triploid endosperm' },
      { name: 'Apomixis', eq: 'Asexual seed formation', unit: 'None', app: 'Hybrid seed industry optimization', fact: 'Development of seeds without fertilization; mimics sexual reproduction' }
    ]
  },
  'Human Reproduction': {
    concepts: [
      { name: 'Spermatogenesis', eq: 'LH and FSH regulation', unit: 'None', app: 'Fertility analysis studies', fact: 'Starts at puberty, continues throughout life in seminiferous tubules' }
    ]
  },
  'Reproductive Health': {
    concepts: [
      { name: 'Amniocentesis', eq: 'Amniotic fluid karyotyping', unit: 'None', app: 'Detecting chromosomal genetic disorders', fact: 'Banned in India for sex determination to prevent female foeticide' }
    ]
  },
  'Principles of Inheritance and Variation': {
    concepts: [
      { name: 'Codominance', eq: 'Both alleles express fully', unit: 'None', app: 'ABO blood grouping analysis', fact: 'Heterozygous individual shows traits of both homozygotes' }
    ]
  },
  'Molecular Basis of Inheritance': {
    concepts: [
      { name: 'Semi-Conservative Replication', eq: 'Meselson-Stahl experiment', unit: 'None', app: 'DNA duplication synthesis accuracy', fact: 'Each daughter DNA molecule retains one parental strand' }
    ]
  },
  'Evolution': {
    concepts: [
      { name: 'Homologous Organs', eq: 'Divergent evolution pattern', unit: 'None', app: 'Tracing evolutionary lineages', fact: 'Similar anatomical structure, modified for different functions' }
    ]
  },
  'Human Health and Disease': {
    concepts: [
      { name: 'Humoral Immunity', eq: 'B-lymphocyte antibody production', unit: 'None', app: 'Vaccination and immunization', fact: 'Antigen-specific response occurring in body fluids (humors)' }
    ]
  },
  'Microbes in Human Welfare': {
    concepts: [
      { name: 'Methanogens', eq: 'Anaerobic cellulose digestion', unit: 'None', app: 'Biogas (Gobar gas) production plants', fact: 'Archaebacteria found in rumen of cattle and marshy areas' }
    ]
  },
  'Biotechnology: Principles and Processes': {
    concepts: [
      { name: 'Restriction Enzymes', eq: 'Palindromic sequence cleavage', unit: 'None', app: 'Recombinant DNA construction', fact: 'Molecular scissors that cut DNA at specific nucleotide sites' }
    ]
  },
  'Biotechnology and Its Applications': {
    concepts: [
      { name: 'Bt Cotton', eq: 'Cry1Ac toxin gene insertion', unit: 'None', app: 'Pest-resistant crop farming', fact: 'Insects digest inactive protoxin, which becomes active in alkaline gut' }
    ]
  },
  'Organisms and Populations': {
    concepts: [
      { name: 'Mutualism', eq: '+/+ symbiotic interaction', unit: 'None', app: 'Lichen (Alga-Fungus) and mycorrhiza studies', fact: 'Both interacting species benefit obligatorily' }
    ]
  },
  'Ecosystem': {
    concepts: [
      { name: 'Lindeman\'s 10% Law', eq: 'Energy transfer rule', unit: 'None', app: 'Food chain trophic level modeling', fact: 'Only 10% of energy is transferred to the next trophic level' }
    ]
  },
  'Biodiversity and Conservation': {
    concepts: [
      { name: 'Endemism', eq: 'Species restricted to one area', unit: 'None', app: 'Identifying biodiversity hotspots', fact: 'High concentration of species found nowhere else globally' }
    ]
  }
};

// Database API helper
async function request(path, options = {}) {
  const headers = {
    'apikey': INSFORGE_KEY,
    'Authorization': `Bearer ${INSFORGE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(`${INSFORGE_URL}/api/database/records/${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`InsForge Request Failed: ${response.statusText} - ${errText}`);
  }
  if (response.status === 204) return null;
  return await response.json();
}

// Generate the 100 questions for each chapter
function generateSyllabusQuestions(subject, chapter) {
  const questions = [];
  const meta = SYLLABUS_METADATA[chapter] || { concepts: [] };
  const concepts = meta.concepts;
  
  const defaultConcepts = [
    { name: 'Core Concept A', eq: 'X = Y + Z', unit: 'SI units', app: 'Theoretical research', fact: 'Obeys general physical laws' },
    { name: 'Core Concept B', eq: 'A = B / C', unit: 'Derived units', app: 'Applied engineering', fact: 'Temperature dependent' },
    { name: 'Core Concept C', eq: 'F = m * a', unit: 'Standard units', app: 'Practical systems', fact: 'Conserves energy and mass' }
  ];
  
  const pool = concepts.length > 0 ? concepts : defaultConcepts;
  const difficultyStems = ['easy', 'moderate', 'hard', 'neet'];
  
  difficultyStems.forEach(diff => {
    for (let i = 1; i <= 25; i++) {
      const concept = pool[(i - 1) % pool.length];
      
      let stem = '';
      let optA = '', optB = '', optC = '', optD = '';
      
      if (diff === 'easy') {
        stem = "What is the primary definition or significance of " + concept.name + "?";
        optA = concept.name + " describes " + concept.fact.toLowerCase();
        optB = concept.name + " is a measure of unrelated heat variables";
        optC = concept.name + " is only used in industrial standard pressure calculations";
        optD = concept.name + " is the inverse multiplier of gravitational constants";
      } else if (diff === 'moderate') {
        stem = "Which of the following represents the correct formula or equation associated with " + concept.name + "?";
        optA = "Equation: " + concept.eq;
        optB = "Equation: " + concept.name + " = (Constant) * 0.5";
        optC = "Equation: " + concept.name + " = Mass / Volume";
        optD = "Equation: " + concept.name + " = Force * Distance";
      } else if (diff === 'hard') {
        stem = "In relation to " + concept.name + ", which thermodynamic or molecular fact is correct?";
        optA = concept.fact;
        optB = "It remains completely unchanged under all experimental conditions";
        optC = "It is always zero at standard ambient temperatures";
        optD = "It is directly proportional to the molecular weight of the solvent";
      } else { // neet
        stem = "[NEET Level] In medical entrance exams, which of the following is the correct application or physiological fact about " + concept.name + "?";
        optA = "Application: " + concept.app + " (Mechanism: " + concept.fact.toLowerCase() + ")";
        optB = "Application: Simple industrial titration validation";
        optC = "Application: Routine laboratory heating experiments";
        optD = "Application: Estimating the specific gravity of minerals";
      }
      
      // Fisher-Yates shuffle — truly random correct answer position
      const optionsArray = [
        { text: optA, isCorrect: true },
        { text: optB, isCorrect: false },
        { text: optC, isCorrect: false },
        { text: optD, isCorrect: false }
      ];
      
      // Fisher-Yates (Knuth) shuffle
      for (let k = optionsArray.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [optionsArray[k], optionsArray[j]] = [optionsArray[j], optionsArray[k]];
      }
      
      const letters = ['A', 'B', 'C', 'D'];
      const correctLetter = letters[optionsArray.findIndex(o => o.isCorrect)];
      
      questions.push({
        difficulty: diff,
        question: stem,
        option_a: optionsArray[0].text,
        option_b: optionsArray[1].text,
        option_c: optionsArray[2].text,
        option_d: optionsArray[3].text,
        correct_option: correctLetter
      });
    }
  });
  
  return questions;
}

// Seeder execution loop
async function seedAll() {
  console.log('Starting Class 12 Syllabus Database Seeder...');
  
  for (const subjectName of Object.keys(SYLLABUS)) {
    console.log(`Processing Subject: ${subjectName}`);
    
    // 1. Get or create subject
    let subjectId;
    const existingSubject = await request(`subjects?name=eq.${encodeURIComponent(subjectName)}`);
    if (existingSubject && existingSubject.length > 0) {
      subjectId = existingSubject[0].id;
    } else {
      const subRows = await request('subjects', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ name: subjectName }])
      });
      subjectId = subRows[0].id;
    }
    
    for (const chapterName of SYLLABUS[subjectName]) {
      console.log(`  Seeding Chapter: ${chapterName}`);
      
      // 2. Get or create chapter
      let chapterId;
      const existingChap = await request(`chapters?subject_id=eq.${subjectId}&name=eq.${encodeURIComponent(chapterName)}`);
      if (existingChap && existingChap.length > 0) {
        chapterId = existingChap[0].id;
      } else {
        const chapRows = await request('chapters', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify([{ subject_id: subjectId, name: chapterName }])
        });
        chapterId = chapRows[0].id;
      }
      
      // 3. Recreate quiz to avoid duplicates
      const quizName = `${chapterName} Practice Test`;
      const existingQuiz = await request(`quizzes?chapter_id=eq.${chapterId}&name=eq.${encodeURIComponent(quizName)}`);
      if (existingQuiz && existingQuiz.length > 0) {
        // Delete old quiz (cascades and deletes questions!)
        await request(`quizzes?id=eq.${existingQuiz[0].id}`, { method: 'DELETE' });
      }
      
      // Create fresh quiz
      const quizRows = await request('quizzes', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify([{ chapter_id: chapterId, name: quizName }])
      });
      const quizId = quizRows[0].id;
      
      // 4. Generate questions list
      const questionsList = generateSyllabusQuestions(subjectName, chapterName).map(q => ({
        quiz_id: quizId,
        ...q
      }));
      
      // 5. Upload questions in batches of 50
      console.log(`    Uploading ${questionsList.length} questions in batches...`);
      for (let i = 0; i < questionsList.length; i += 50) {
        const batch = questionsList.slice(i, i + 50);
        await request('questions', {
          method: 'POST',
          body: JSON.stringify(batch)
        });
      }
      console.log(`    Successfully seeded: ${chapterName}`);
    }
  }
  
  console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
}

seedAll().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
