/**
 * Starter content: high-yield NCERT flashcards and board-style MCQs.
 * Seeded into a student's library on first run for the classes they study.
 * Every item is keyed to a chapter id from `syllabus.ts`.
 */

export interface SeedCard {
  chapterId: string;
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  chapterId: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

const c = (chapterId: string, front: string, back: string): SeedCard => ({ chapterId, front, back });

export const SEED_CARDS: SeedCard[] = [
  // ── Class 8 ──
  c('c8-maths-1', 'Which digits can a perfect square never end in?', '2, 3, 7 or 8.'),
  c('c8-maths-1', 'Sum of the first n odd numbers', 'n²  (1 + 3 + 5 + … + (2n − 1) = n²)'),
  c('c8-maths-9', 'Baudhayana–Pythagoras theorem', 'In a right triangle, (hypotenuse)² = (base)² + (height)², i.e. c² = a² + b².'),
  c('c8-maths-9', 'Smallest Pythagorean triple', '3, 4, 5  (9 + 16 = 25)'),

  // ── Class 9 ──
  c('c9-science-4', 'Speed vs velocity', 'Speed is a scalar (distance/time). Velocity is a vector (displacement/time) — it has direction.'),
  c('c9-science-4', 'Why is uniform circular motion accelerated?', 'Speed is constant but direction keeps changing, so velocity changes → acceleration.'),

  // ── Class 10 Science ──
  c('c10-science-1', 'Balanced chemical equation', 'Equal number of atoms of each element on both sides — follows the law of conservation of mass.'),
  c('c10-science-1', 'Combination reaction (example)', 'CaO + H₂O → Ca(OH)₂ — quicklime + water gives slaked lime; strongly exothermic.'),
  c('c10-science-1', 'Thermal decomposition (example)', 'CaCO₃ →(heat) CaO + CO₂'),
  c('c10-science-1', 'Displacement reaction (example)', 'Fe + CuSO₄ → FeSO₄ + Cu — the more reactive metal displaces the less reactive one.'),
  c('c10-science-1', 'Oxidation & reduction (O/H view)', 'Oxidation: gain of oxygen or loss of hydrogen.\nReduction: loss of oxygen or gain of hydrogen.'),
  c('c10-science-1', 'Rancidity — what & how to prevent', 'Oxidation of fats/oils that spoils smell and taste. Prevent with antioxidants, nitrogen flushing, airtight containers, refrigeration.'),
  c('c10-science-2', 'pH scale', '0–14 at 25 °C: below 7 acidic, 7 neutral, above 7 basic. One pH unit = 10× change in [H⁺].'),
  c('c10-science-2', 'Acid + metal →', 'Salt + hydrogen gas, e.g. Zn + H₂SO₄ → ZnSO₄ + H₂'),
  c('c10-science-2', 'Neutralisation', 'Acid + base → salt + water, e.g. NaOH + HCl → NaCl + H₂O'),
  c('c10-science-2', 'Plaster of Paris', 'CaSO₄·½H₂O — sets into gypsum (CaSO₄·2H₂O) when mixed with water.'),
  c('c10-science-2', 'Baking soda on heating', '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂'),
  c('c10-science-2', 'Washing soda formula', 'Na₂CO₃·10H₂O'),
  c('c10-science-9', 'Mirror formula', '1/v + 1/u = 1/f   (New Cartesian sign convention)'),
  c('c10-science-9', 'Lens formula', '1/v − 1/u = 1/f'),
  c('c10-science-9', 'Magnification (mirror)', 'm = h′/h = −v/u'),
  c('c10-science-9', 'Power of a lens', 'P = 1/f (f in metres), unit dioptre (D). Convex lens +, concave lens −.'),
  c('c10-science-9', 'Refractive index', 'n = c/v ;  Snell’s law: sin i / sin r = constant'),
  c('c10-science-9', 'Focal length & radius of curvature', 'f = R/2 for spherical mirrors.'),
  c('c10-science-11', "Ohm's law", 'V = IR (at constant temperature).'),
  c('c10-science-11', 'Resistance of a conductor', 'R = ρL/A — ∝ length, ∝ 1/area; ρ depends on material & temperature.'),
  c('c10-science-11', 'Resistors in series', 'R = R₁ + R₂ + R₃ … — same current through each.'),
  c('c10-science-11', 'Resistors in parallel', '1/R = 1/R₁ + 1/R₂ + 1/R₃ … — same voltage across each.'),
  c('c10-science-11', 'Electric power', 'P = VI = I²R = V²/R (watt). 1 kWh = 3.6 × 10⁶ J.'),
  c('c10-science-11', "Joule's law of heating", 'H = I²Rt'),

  // ── Class 10 Maths ──
  c('c10-maths-2', 'Sum & product of roots of ax² + bx + c', 'α + β = −b/a ;  αβ = c/a'),
  c('c10-maths-4', 'Quadratic formula', 'x = [−b ± √(b² − 4ac)] / 2a'),
  c('c10-maths-4', 'Discriminant D = b² − 4ac', 'D > 0: two distinct real roots\nD = 0: two equal real roots\nD < 0: no real roots'),
  c('c10-maths-5', 'nth term of an AP', 'aₙ = a + (n − 1)d'),
  c('c10-maths-5', 'Sum of n terms of an AP', 'Sₙ = n/2 [2a + (n − 1)d] = n/2 (a + l)'),
  c('c10-maths-8', 'Pythagorean trig identities', 'sin²θ + cos²θ = 1\n1 + tan²θ = sec²θ\n1 + cot²θ = cosec²θ'),
  c('c10-maths-8', 'sin, cos, tan of 30°, 45°, 60°', 'sin: 1/2, 1/√2, √3/2\ncos: √3/2, 1/√2, 1/2\ntan: 1/√3, 1, √3'),
  c('c10-maths-12', 'Sphere', 'Surface area = 4πr² ;  Volume = (4/3)πr³'),
  c('c10-maths-12', 'Cone', 'CSA = πrl, l = √(r² + h²) ;  Volume = (1/3)πr²h'),
  c('c10-maths-12', 'Cylinder', 'CSA = 2πrh ;  TSA = 2πr(r + h) ;  Volume = πr²h'),
  c('c10-maths-13', 'Empirical relation', '3 Median = Mode + 2 Mean'),
  c('c10-maths-13', 'Mode of grouped data', 'Mode = l + [(f₁ − f₀) / (2f₁ − f₀ − f₂)] × h'),
  c('c10-maths-14', 'Complementary events', 'P(E) + P(not E) = 1, and 0 ≤ P(E) ≤ 1'),

  // ── Class 11 ──
  c('c11-physics-2', 'Equations of motion (constant a)', 'v = u + at\ns = ut + ½at²\nv² = u² + 2as'),
  c('c11-physics-2', 'Slope / area of a v–t graph', 'Slope = acceleration ;  area under curve = displacement'),
  c('c11-physics-4', "Newton's second law", 'F = dp/dt = ma (for constant mass)'),
  c('c11-physics-4', 'Impulse', 'J = FΔt = Δp (change in momentum)'),
  c('c11-physics-4', 'Limiting friction', 'fₛ(max) = μₛN, and generally μₖ < μₛ'),
  c('c11-physics-5', 'Work–energy theorem', 'Net work done = change in kinetic energy (W = ΔK)'),
  c('c11-physics-5', 'Power', 'P = dW/dt = F · v'),
  c('c11-physics-5', 'Elastic vs inelastic collision', 'Elastic: momentum and KE conserved. Inelastic: only momentum conserved.'),
  c('c11-physics-7', 'Acceleration due to gravity at surface', 'g = GM/R² ;  G = 6.67 × 10⁻¹¹ N m² kg⁻²'),
  c('c11-physics-7', 'Escape velocity', 'vₑ = √(2GM/R) = √(2gR) ≈ 11.2 km/s for Earth'),
  c('c11-physics-7', "Kepler's third law", 'T² ∝ r³ (r = semi-major axis)'),
  c('c11-chemistry-1', 'Avogadro constant', 'Nₐ = 6.022 × 10²³ mol⁻¹'),
  c('c11-chemistry-1', 'Molarity vs molality', 'Molarity (M) = mol solute / L solution\nMolality (m) = mol solute / kg solvent'),
  c('c11-chemistry-2', 'de Broglie wavelength', 'λ = h / mv'),
  c('c11-chemistry-2', 'Heisenberg uncertainty principle', 'Δx · Δp ≥ h / 4π'),
  c('c11-chemistry-2', 'Quantum numbers', 'n = 1, 2, 3…\nl = 0 to n − 1\nmₗ = −l to +l\nmₛ = +½ or −½'),
  c('c11-maths-6', 'Permutations & combinations', 'ⁿPᵣ = n!/(n − r)!\nⁿCᵣ = n!/[r!(n − r)!]'),
  c('c11-maths-8', 'GP: nth term & sum', 'aₙ = arⁿ⁻¹ ;  Sₙ = a(rⁿ − 1)/(r − 1), r ≠ 1'),
  c('c11-maths-8', 'Infinite GP sum', 'S∞ = a/(1 − r), for |r| < 1'),
  c('c11-maths-12', 'Standard limit', 'lim (x→0) sin x / x = 1'),
  c('c11-maths-12', 'Power rule', 'd/dx (xⁿ) = nxⁿ⁻¹'),
  c('c11-maths-12', 'Product & quotient rules', '(uv)′ = u′v + uv′\n(u/v)′ = (u′v − uv′)/v²'),
  c('c11-biology-8', 'Cell theory', 'Schleiden & Schwann; Virchow added “Omnis cellula-e cellula” — all cells arise from pre-existing cells.'),
  c('c11-biology-8', 'Ribosome types', 'Prokaryotes: 70S (50S + 30S)\nEukaryotes: 80S (60S + 40S)'),
  c('c11-biology-8', 'Mitochondria', 'Double-membrane; site of aerobic respiration; has its own circular DNA and 70S ribosomes.'),
  c('c11-biology-10', 'Phases of mitosis', 'Prophase → Metaphase → Anaphase → Telophase (then cytokinesis)'),
  c('c11-biology-10', 'Where does crossing over occur?', 'Pachytene of prophase I of meiosis.'),

  // ── Class 12 ──
  c('c12-physics-1', "Coulomb's law", 'F = k q₁q₂ / r²,  k = 1/4πε₀ ≈ 9 × 10⁹ N m² C⁻²'),
  c('c12-physics-1', "Gauss's law", 'Φ = q_enclosed / ε₀'),
  c('c12-physics-1', 'Electric dipole moment', 'p = q × 2a (directed from −q to +q), unit C m'),
  c('c12-physics-3', 'Current & drift velocity', 'I = neAv_d'),
  c('c12-physics-3', "Kirchhoff's rules", 'Junction rule → conservation of charge\nLoop rule → conservation of energy'),
  c('c12-physics-3', 'Balanced Wheatstone bridge', 'P/Q = R/S'),
  c('c12-physics-9', "Lens maker's formula", '1/f = (n − 1)(1/R₁ − 1/R₂)'),
  c('c12-physics-9', 'Critical angle', 'sin C = 1/n (denser → rarer)'),
  c('c12-physics-9', 'Prism formula', 'n = sin[(A + D_m)/2] / sin(A/2)'),
  c('c12-physics-11', "Einstein's photoelectric equation", 'K_max = hν − φ₀ = eV₀'),
  c('c12-physics-11', 'Threshold frequency', 'ν₀ = φ₀ / h — no emission below ν₀, whatever the intensity.'),
  c('c12-chemistry-1', "Raoult's law", 'pᵢ = xᵢ pᵢ°'),
  c('c12-chemistry-1', 'Colligative properties', 'ΔT_b = K_b·m ;  ΔT_f = K_f·m ;  π = CRT'),
  c('c12-chemistry-2', 'Nernst equation (298 K)', 'E_cell = E°_cell − (0.059/n) log Q'),
  c('c12-chemistry-2', 'Gibbs energy & EMF', 'ΔG° = −nFE°_cell ;  F ≈ 96500 C mol⁻¹'),
  c('c12-chemistry-3', 'First-order integrated rate law', 'k = (2.303/t) log([R]₀/[R])'),
  c('c12-chemistry-3', 'Half-lives', 'First order: t½ = 0.693/k\nZero order: t½ = [R]₀/2k'),
  c('c12-chemistry-3', 'Arrhenius equation', 'k = A e^(−Eₐ/RT)'),
  c('c12-maths-4', 'Inverse of a matrix', 'A⁻¹ = adj A / |A|, exists only if |A| ≠ 0'),
  c('c12-maths-4', 'Determinant of kA (n × n)', '|kA| = kⁿ|A|'),
  c('c12-maths-5', 'Derivatives of inverse trig', 'd/dx sin⁻¹x = 1/√(1 − x²)\nd/dx tan⁻¹x = 1/(1 + x²)'),
  c('c12-maths-5', 'Chain rule', 'd/dx f(g(x)) = f′(g(x)) · g′(x)'),
  c('c12-maths-7', 'Power rule of integration', '∫xⁿ dx = xⁿ⁺¹/(n + 1) + C, n ≠ −1'),
  c('c12-maths-7', 'Integration by parts', '∫u v dx = u∫v dx − ∫(u′ ∫v dx) dx  (ILATE order for u)'),
  c('c12-maths-7', '∫eˣ[f(x) + f′(x)] dx', 'eˣ f(x) + C'),
  c('c12-biology-4', 'Mendelian ratios', 'Monohybrid F₂: 3:1 (phenotype), 1:2:1 (genotype)\nDihybrid F₂: 9:3:3:1'),
  c('c12-biology-4', 'ABO blood groups show…', 'Codominance (Iᴬ and Iᴮ) and multiple allelism (three alleles).'),
  c('c12-biology-5', "Chargaff's rule", 'A = T and G ≡ C, so purines = pyrimidines.'),
  c('c12-biology-5', 'Central dogma', 'DNA → (transcription) → RNA → (translation) → Protein'),
  c('c12-biology-5', 'Start & stop codons', 'Start: AUG (methionine)\nStop: UAA, UAG, UGA'),
  c('c12-biology-5', 'Proof of semi-conservative replication', 'Meselson & Stahl (1958), using ¹⁵N-labelled E. coli.'),
];

type Q = [string, string[], number, string];
const bank: Record<string, Q[]> = {
  'c8-maths-1': [
    ['Which of these can never be the last digit of a perfect square?', ['1', '4', '7', '9'], 2, 'Squares end only in 0, 1, 4, 5, 6 or 9.'],
    ['Sum of the first 10 odd numbers is', ['50', '100', '110', '55'], 1, 'Sum of first n odd numbers = n² = 100.'],
    ['Cube root of 2744 is', ['12', '14', '16', '18'], 1, '14³ = 2744.'],
  ],
  'c8-maths-9': [
    ['Legs of a right triangle are 6 cm and 8 cm. The hypotenuse is', ['10 cm', '12 cm', '14 cm', '9 cm'], 0, '√(36 + 64) = √100 = 10.'],
    ['Which is a Pythagorean triple?', ['(4, 5, 6)', '(5, 12, 13)', '(6, 7, 8)', '(2, 3, 4)'], 1, '25 + 144 = 169 = 13².'],
  ],
  'c9-science-4': [
    ['A body in uniform circular motion has', ['Constant velocity', 'Changing velocity (it is accelerated)', 'Zero acceleration', 'No speed'], 1, 'Direction changes continuously, so velocity changes.'],
    ['Displacement of a body can be', ['Only positive', 'Positive, negative or zero', 'Never zero', 'Always more than distance'], 1, 'Displacement is a vector; it is zero after a round trip.'],
  ],
  'c10-science-1': [
    ['Which is a decomposition reaction?', ['2H₂ + O₂ → 2H₂O', 'CaCO₃ → CaO + CO₂', 'Fe + CuSO₄ → FeSO₄ + Cu', 'NaOH + HCl → NaCl + H₂O'], 1, 'One reactant breaks into two simpler products.'],
    ['Iron nails dipped in copper sulphate solution turn the solution', ['Colourless', 'Blue to light green', 'Colourless to blue', 'Green to blue'], 1, 'Pale green FeSO₄ forms as iron displaces copper.'],
    ['In 2Mg + O₂ → 2MgO, magnesium is', ['Reduced', 'Oxidised', 'Neither', 'A catalyst'], 1, 'Magnesium gains oxygen → oxidation.'],
    ['Na₂SO₄ + BaCl₂ → BaSO₄ + 2NaCl is a', ['Combination reaction', 'Double displacement reaction', 'Decomposition reaction', 'Combustion reaction'], 1, 'Ions are exchanged and a white BaSO₄ precipitate forms.'],
  ],
  'c10-science-2': [
    ['pH of a neutral solution at 25 °C is', ['0', '7', '14', '1'], 1, 'Neutral water has [H⁺] = 10⁻⁷ M.'],
    ['Gas evolved when zinc reacts with dilute HCl', ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Chlorine'], 2, 'Metal + acid → salt + H₂.'],
    ['Chemical formula of washing soda', ['Na₂CO₃·10H₂O', 'NaHCO₃', 'CaOCl₂', 'CaSO₄·½H₂O'], 0, 'NaHCO₃ is baking soda; CaOCl₂ is bleaching powder.'],
    ['Tooth decay starts when the pH in the mouth falls below about', ['5.5', '7.5', '8.5', '9.0'], 0, 'Enamel (calcium hydroxyapatite) corrodes below pH 5.5.'],
  ],
  'c10-science-9': [
    ['Power of a convex lens of focal length 50 cm', ['+0.5 D', '+2 D', '−2 D', '+50 D'], 1, 'P = 1/f = 1/0.5 m = +2 D.'],
    ['Mirror used as a rear-view mirror in vehicles', ['Plane', 'Concave', 'Convex', 'Cylindrical'], 2, 'Convex mirrors give an erect, diminished, wider view.'],
    ['Speed of light in a medium is 2 × 10⁸ m/s. Its refractive index is', ['1.33', '1.5', '2.0', '0.67'], 1, 'n = c/v = 3/2 = 1.5.'],
    ['A concave mirror forms a real, inverted, same-size image when the object is at', ['Focus', 'Centre of curvature', 'Between F and P', 'Infinity'], 1, 'Object at C → image at C, same size.'],
  ],
  'c10-science-11': [
    ['Three 6 Ω resistors in parallel give', ['18 Ω', '2 Ω', '3 Ω', '6 Ω'], 1, '1/R = 3/6 → R = 2 Ω.'],
    ['SI unit of resistivity', ['Ω', 'Ω m', 'Ω/m', 'S'], 1, 'ρ = RA/L → Ω·m²/m = Ω m.'],
    ['1 kWh equals', ['3.6 × 10⁶ J', '3.6 × 10³ J', '1000 J', '3600 J'], 0, '1000 W × 3600 s = 3.6 × 10⁶ J.'],
    ['If a wire’s length is doubled (same material and area), its resistance', ['Halves', 'Stays the same', 'Doubles', 'Becomes four times'], 2, 'R ∝ L.'],
  ],
  'c10-maths-4': [
    ['Nature of roots of 2x² − 4x + 3 = 0', ['Two distinct real roots', 'Two equal real roots', 'No real roots', 'Cannot be determined'], 2, 'D = 16 − 24 = −8 < 0.'],
    ['For k > 0, x² + kx + 9 = 0 has equal roots when k =', ['3', '6', '9', '36'], 1, 'D = k² − 36 = 0 → k = 6.'],
    ['Roots of x² − 5x + 6 = 0', ['2 and 3', '−2 and −3', '1 and 6', '−1 and 6'], 0, '(x − 2)(x − 3) = 0.'],
  ],
  'c10-maths-5': [
    ['10th term of the AP 2, 7, 12, …', ['47', '52', '45', '50'], 0, 'a + 9d = 2 + 45 = 47.'],
    ['Sum of the first 20 natural numbers', ['200', '210', '220', '190'], 1, 'n(n + 1)/2 = 20 × 21/2 = 210.'],
    ['Common difference of 3, 1, −1, −3, …', ['2', '−2', '4', '−4'], 1, '1 − 3 = −2.'],
  ],
  'c10-maths-8': [
    ['sin 30° + cos 60° =', ['1/2', '1', '√3/2', '0'], 1, '1/2 + 1/2 = 1.'],
    ['If tan θ = 1 for an acute angle θ, θ =', ['30°', '45°', '60°', '90°'], 1, 'tan 45° = 1.'],
    ['sec²θ − tan²θ =', ['0', '1', '−1', '2'], 1, 'From 1 + tan²θ = sec²θ.'],
    ['From 30 m away, the angle of elevation of a tower’s top is 45°. Its height is', ['15 m', '30 m', '30√3 m', '10√3 m'], 1, 'tan 45° = h/30 → h = 30 m.'],
  ],
  'c10-maths-14': [
    ['Probability of a prime number on a fair die', ['1/3', '1/2', '2/3', '1/6'], 1, 'Primes: 2, 3, 5 → 3/6.'],
    ['If P(E) = 0.05, then P(not E) =', ['0.05', '0.5', '0.95', '1'], 2, '1 − 0.05 = 0.95.'],
    ['Probability of drawing a king from a 52-card deck', ['1/13', '1/52', '4/13', '1/4'], 0, '4/52 = 1/13.'],
  ],
  'c11-physics-2': [
    ['A car starts from rest at 2 m/s² for 5 s. Distance covered:', ['10 m', '25 m', '50 m', '100 m'], 1, 's = ½at² = ½ × 2 × 25 = 25 m.'],
    ['The slope of a velocity–time graph gives', ['Displacement', 'Acceleration', 'Speed', 'Momentum'], 1, 'a = dv/dt.'],
    ['Area under a velocity–time graph gives', ['Acceleration', 'Displacement', 'Force', 'Power'], 1, '∫v dt = displacement.'],
  ],
  'c11-physics-4': [
    ["Newton's first law is also called the law of", ['Inertia', 'Momentum', 'Action–reaction', 'Gravitation'], 0, 'A body resists change in its state of motion.'],
    ['A 10 N force acts on a 2 kg body. Its acceleration is', ['20 m/s²', '5 m/s²', '0.2 m/s²', '12 m/s²'], 1, 'a = F/m = 5 m/s².'],
    ['Impulse is equal to the change in', ['Velocity', 'Kinetic energy', 'Momentum', 'Acceleration'], 2, 'J = Δp.'],
  ],
  'c11-physics-5': [
    ['KE of a 2 kg body moving at 3 m/s', ['6 J', '9 J', '18 J', '3 J'], 1, '½ × 2 × 9 = 9 J.'],
    ['In a perfectly elastic collision, what is conserved?', ['Only momentum', 'Only kinetic energy', 'Both momentum and kinetic energy', 'Neither'], 2, 'Elastic collisions conserve both.'],
    ['SI unit of power', ['Joule', 'Watt', 'Newton', 'Pascal'], 1, '1 W = 1 J/s.'],
  ],
  'c11-physics-7': [
    ['Escape velocity from Earth is about', ['7.9 km/s', '11.2 km/s', '9.8 km/s', '3 × 10⁵ km/s'], 1, 'vₑ = √(2gR) ≈ 11.2 km/s. 7.9 km/s is orbital velocity near the surface.'],
    ["Kepler's third law: T² is proportional to", ['r', 'r²', 'r³', '1/r'], 2, 'Law of periods.'],
    ['Acceleration due to gravity at the centre of the Earth', ['9.8 m/s²', 'Zero', 'Infinite', '4.9 m/s²'], 1, 'g(d) = g(1 − d/R) → 0 at d = R.'],
  ],
  'c11-chemistry-1': [
    ['Moles in 36 g of water (M = 18 g/mol)', ['1', '2', '18', '0.5'], 1, '36/18 = 2 mol.'],
    ['Avogadro constant is', ['6.022 × 10²³ mol⁻¹', '6.022 × 10²² mol⁻¹', '3.011 × 10²³ mol⁻¹', '1.6 × 10⁻¹⁹ mol⁻¹'], 0, 'Number of particles in one mole.'],
    ['Molality is moles of solute per', ['Litre of solution', 'Kilogram of solvent', 'Kilogram of solution', 'Litre of solvent'], 1, 'Temperature-independent, unlike molarity.'],
  ],
  'c11-chemistry-2': [
    ['For n = 3, the possible values of l are', ['0, 1, 2', '1, 2, 3', '0, 1, 2, 3', 'Only 3'], 0, 'l = 0 to n − 1.'],
    ['Maximum electrons in a shell with principal quantum number n', ['n²', '2n²', '2n', 'n + 1'], 1, 'Each of n² orbitals holds 2 electrons.'],
    ['Which orbital is spherically symmetric?', ['s', 'p', 'd', 'f'], 0, 's orbitals have l = 0.'],
  ],
  'c11-maths-6': [
    ['⁵C₂ =', ['10', '20', '5', '60'], 0, '5!/(2!·3!) = 10.'],
    ['Number of arrangements of the letters of CAT', ['3', '6', '9', '27'], 1, '3! = 6.'],
  ],
  'c11-maths-8': [
    ['Sum to infinity of 1 + 1/2 + 1/4 + …', ['1', '2', '3/2', 'Infinite'], 1, 'a/(1 − r) = 1/(1/2) = 2.'],
    ['5th term of the GP 3, 6, 12, …', ['24', '48', '96', '36'], 1, '3 × 2⁴ = 48.'],
    ['Geometric mean of 4 and 16', ['10', '8', '6', '12'], 1, '√(4 × 16) = 8.'],
  ],
  'c11-maths-12': [
    ['lim (x→0) sin x / x =', ['0', '1', '∞', 'Does not exist'], 1, 'Standard limit.'],
    ['d/dx (x³) =', ['x²', '3x²', '3x³', 'x⁴/4'], 1, 'Power rule.'],
    ['d/dx (sin x) =', ['cos x', '−cos x', '−sin x', 'tan x'], 0, 'Standard derivative.'],
  ],
  'c11-biology-8': [
    ['“Omnis cellula-e cellula” was proposed by', ['Schleiden', 'Schwann', 'Rudolf Virchow', 'Robert Hooke'], 2, 'Virchow, 1855.'],
    ['Ribosomes of prokaryotes are of type', ['80S', '70S', '60S', '40S'], 1, '70S = 50S + 30S.'],
    ['The organelle called the “suicidal bag” is the', ['Mitochondrion', 'Lysosome', 'Golgi body', 'Ribosome'], 1, 'Its hydrolytic enzymes can digest the cell.'],
  ],
  'c11-biology-10': [
    ['Crossing over occurs during', ['Leptotene', 'Zygotene', 'Pachytene', 'Diakinesis'], 2, 'Recombination nodules form in pachytene.'],
    ['Chromosomes align at the cell’s equator during', ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'], 1, 'They form the metaphase plate.'],
  ],
  'c12-physics-1': [
    ['If the distance between two charges is doubled, the force becomes', ['Double', 'Half', 'One-fourth', 'Four times'], 2, 'F ∝ 1/r².'],
    ['Electric flux through a closed surface enclosing charge q', ['qε₀', 'q/ε₀', 'ε₀/q', 'Zero'], 1, "Gauss's law."],
    ['SI unit of electric dipole moment', ['C/m', 'C m', 'N/C', 'V/m'], 1, 'p = q × 2a.'],
  ],
  'c12-physics-3': [
    ["Kirchhoff's junction rule is based on conservation of", ['Energy', 'Charge', 'Momentum', 'Mass'], 1, 'Charge cannot accumulate at a junction.'],
    ['Condition for a balanced Wheatstone bridge', ['P/Q = R/S', 'P + Q = R + S', 'PR = QS', 'P − Q = R − S'], 0, 'No current through the galvanometer.'],
  ],
  'c12-physics-9': [
    ['Critical angle for glass (n = 1.5): sin C =', ['1.5', '2/3', '1/3', '3/4'], 1, 'sin C = 1/n.'],
    ['Thin lenses of +2 D and −1 D in contact have net power', ['+3 D', '+1 D', '−1 D', '+2 D'], 1, 'P = P₁ + P₂.'],
  ],
  'c12-physics-11': [
    ['Maximum KE of photoelectrons depends on', ['Intensity of light', 'Frequency of light', 'Time of exposure', 'Area of the plate'], 1, 'K_max = hν − φ₀; intensity changes only the number of electrons.'],
    ['de Broglie wavelength of a particle with momentum p', ['hp', 'h/p', 'p/h', 'hc/p'], 1, 'λ = h/p.'],
    ['5 eV photons hit a metal of work function 3 eV. Max KE =', ['8 eV', '2 eV', '15 eV', '0.6 eV'], 1, '5 − 3 = 2 eV.'],
  ],
  'c12-chemistry-1': [
    ['Osmotic pressure is given by', ['π = CRT', 'π = RT/C', 'π = C/RT', 'π = nR/T'], 0, 'van’t Hoff equation for dilute solutions.'],
    ['Colligative properties depend on', ['Nature of the solute', 'Number of solute particles', 'Colour of the solution', 'Molar mass of the solvent only'], 1, 'They depend on the count of particles, not their identity.'],
    ['van’t Hoff factor of NaCl (complete dissociation)', ['1', '2', '3', '0.5'], 1, 'NaCl → Na⁺ + Cl⁻.'],
  ],
  'c12-chemistry-2': [
    ['Relation between ΔG° and E°cell', ['ΔG° = nFE°', 'ΔG° = −nFE°', 'ΔG° = −nE°/F', 'ΔG° = −RT/nF'], 1, 'A positive E° means a spontaneous reaction (ΔG° < 0).'],
    ['1 Faraday is approximately', ['96500 C mol⁻¹', '9650 C mol⁻¹', '6.022 × 10²³ C', '1.6 × 10⁻¹⁹ C'], 0, 'Charge on one mole of electrons.'],
    ['In a galvanic cell, oxidation takes place at the', ['Anode', 'Cathode', 'Salt bridge', 'Both electrodes'], 0, 'An Ox, Red Cat.'],
  ],
  'c12-chemistry-3': [
    ['Half-life of a first-order reaction', ['0.693/k', '[R]₀/2k', 'k/0.693', '1/(k[R]₀)'], 0, 'Independent of initial concentration.'],
    ['Unit of the rate constant of a zero-order reaction', ['s⁻¹', 'mol L⁻¹ s⁻¹', 'L mol⁻¹ s⁻¹', 'L² mol⁻² s⁻¹'], 1, 'Rate = k for zero order.'],
    ['A first-order reaction has k = 0.693 min⁻¹. Its t½ is', ['0.5 min', '1 min', '2 min', '0.693 min'], 1, 't½ = 0.693/0.693 = 1 min.'],
  ],
  'c12-maths-4': [
    ['A is 3 × 3 with |A| = 2. Then |3A| =', ['6', '18', '54', '8'], 2, '|kA| = kⁿ|A| = 27 × 2.'],
    ['A square matrix A is invertible if and only if', ['|A| = 0', '|A| ≠ 0', 'A is symmetric', 'A is diagonal'], 1, 'A⁻¹ = adj A/|A|.'],
  ],
  'c12-maths-5': [
    ['d/dx (sin⁻¹ x) =', ['1/√(1 − x²)', '−1/√(1 − x²)', '1/(1 + x²)', '√(1 − x²)'], 0, 'Valid for −1 < x < 1.'],
    ['d/dx (e²ˣ) =', ['e²ˣ', '2e²ˣ', 'e²ˣ/2', '2xe²ˣ'], 1, 'Chain rule.'],
    ['f(x) = |x| at x = 0 is', ['Continuous and differentiable', 'Continuous but not differentiable', 'Differentiable but not continuous', 'Neither'], 1, 'Left derivative −1 ≠ right derivative +1.'],
  ],
  'c12-maths-7': [
    ['∫ 1/x dx =', ['−1/x² + C', 'log|x| + C', '1/x² + C', 'eˣ + C'], 1, 'Standard integral.'],
    ['∫₀¹ x dx =', ['1', '1/2', '0', '2'], 1, '[x²/2]₀¹ = 1/2.'],
    ['∫ eˣ dx =', ['eˣ + C', 'xeˣ + C', 'eˣ⁺¹/(x + 1) + C', 'log x + C'], 0, 'eˣ is its own derivative.'],
  ],
  'c12-biology-4': [
    ['Phenotypic ratio of Mendel’s dihybrid F₂', ['3:1', '1:2:1', '9:3:3:1', '1:1:1:1'], 2, 'Independent assortment of two genes.'],
    ['ABO blood groups show', ['Only incomplete dominance', 'Codominance and multiple allelism', 'Polygenic inheritance', 'Sex-linked inheritance'], 1, 'Iᴬ, Iᴮ codominant; three alleles in the population.'],
    ['Genotypic ratio of a monohybrid F₂', ['3:1', '1:2:1', '9:3:3:1', '1:1'], 1, 'TT : Tt : tt.'],
  ],
  'c12-biology-5': [
    ['The start codon is', ['UAA', 'AUG', 'UGA', 'UAG'], 1, 'AUG codes for methionine.'],
    ['Semi-conservative DNA replication was proved by', ['Watson and Crick', 'Meselson and Stahl', 'Hershey and Chase', 'Griffith'], 1, '¹⁵N/¹⁴N density-gradient experiment.'],
    ['In the lac operon, the inducer is', ['Glucose', 'Lactose', 'Galactose', 'The repressor protein'], 1, 'Lactose inactivates the repressor.'],
  ],
};

export const QUESTION_BANK: QuizQuestion[] = Object.entries(bank).flatMap(([chapterId, qs]) =>
  qs.map(([q, options, answer, explain], i) => ({ id: `${chapterId}-q${i + 1}`, chapterId, q, options, answer, explain })),
);

export function questionsForChapter(chapterId: string) {
  return QUESTION_BANK.filter((q) => q.chapterId === chapterId);
}

export const STUDY_QUOTES = [
  { text: 'Arise, awake, and stop not till the goal is reached.', by: 'Swami Vivekananda' },
  { text: 'Dream is not that which you see while sleeping, it is something that does not let you sleep.', by: 'A. P. J. Abdul Kalam' },
  { text: 'Live as if you were to die tomorrow. Learn as if you were to live forever.', by: 'Mahatma Gandhi' },
  { text: 'The expert in anything was once a beginner.', by: 'Helen Hayes' },
  { text: 'Small daily improvements are the key to staggering long-term results.', by: 'Robin Sharma' },
  { text: 'Excellence is a continuous process and not an accident.', by: 'A. P. J. Abdul Kalam' },
  { text: 'It always seems impossible until it is done.', by: 'Nelson Mandela' },
];
