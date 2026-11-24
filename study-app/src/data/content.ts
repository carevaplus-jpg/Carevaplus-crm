/**
 * Starter content: high-yield NCERT flashcards and exam-style MCQs for Classes 8 and 9.
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
  // ══ Class 8 · Science (Curiosity) ══
  c('c8-science-1', 'Steps of the scientific method', 'Observe → ask a question → form a hypothesis → test it with an experiment → analyse results → draw a conclusion.'),
  c('c8-science-1', 'What is a hypothesis?', 'A testable explanation or prediction that an experiment can support or reject.'),
  c('c8-science-1', 'Why keep a “control” in an experiment?', 'Change only one variable at a time and compare with a control, so you know that variable caused the result.'),
  c('c8-science-2', 'Main groups of microorganisms', 'Bacteria, fungi, protozoa, algae, and viruses (viruses reproduce only inside living host cells).'),
  c('c8-science-2', 'Which microbe turns milk into curd?', 'Lactobacillus, a bacterium.'),
  c('c8-science-2', 'Why does dough rise when yeast is added?', 'Yeast ferments sugar and releases carbon dioxide gas, which makes the dough rise.'),
  c('c8-science-2', 'Who discovered penicillin, and when?', 'Alexander Fleming, in 1928, from the mould Penicillium.'),
  c('c8-science-3', 'Communicable vs non-communicable disease', 'Communicable diseases spread from person to person through microbes (e.g. TB, flu). Non-communicable ones do not spread (e.g. diabetes).'),
  c('c8-science-3', 'How does a vaccine protect us?', 'It trains the immune system with a harmless form of a microbe, so the body fights the real infection quickly later.'),
  c('c8-science-3', 'Do antibiotics work against viruses?', 'No. Antibiotics act on bacteria. They do not cure viral infections like the common cold.'),
  c('c8-science-4', 'Magnetic effect of current', 'A wire carrying electric current produces a magnetic field around it (Ørsted’s discovery).'),
  c('c8-science-4', 'What is an electromagnet?', 'A coil of wire around an iron core that becomes a magnet only while current flows.'),
  c('c8-science-4', 'Heating effect of current: uses', 'Electric heaters, irons, kettles, toasters and the fuse wire in circuits.'),
  c('c8-science-4', 'How does a fuse protect a circuit?', 'Its thin wire has a low melting point and melts when too much current flows, breaking the circuit.'),
  c('c8-science-5', 'What is a force?', 'A push or a pull. It can change an object’s speed, direction or shape. SI unit: newton (N).'),
  c('c8-science-5', 'Contact vs non-contact forces', 'Contact: muscular force, friction. Non-contact: magnetic, electrostatic and gravitational forces.'),
  c('c8-science-5', 'Friction', 'A force that opposes motion between surfaces in contact. It causes wear and heat, but also lets us walk and hold things.'),
  c('c8-science-6', 'Pressure', 'Pressure = Force ÷ Area. SI unit: pascal (Pa) = N/m². The same force on a smaller area gives more pressure.'),
  c('c8-science-6', 'Which way does wind blow?', 'From a region of high air pressure to a region of low air pressure.'),
  c('c8-science-6', 'Liquid pressure and depth', 'Pressure in a liquid increases with depth, which is why dam walls are thicker at the bottom.'),
  c('c8-science-6', 'What is a cyclone?', 'A large, rotating storm system around a centre of very low pressure (the eye), with strong winds and heavy rain.'),
  c('c8-science-7', 'Particle nature of matter', 'All matter is made of tiny particles that have spaces between them, attract each other and are always moving.'),
  c('c8-science-7', 'Diffusion', 'The spreading and mixing of particles of one substance into another, faster in gases than in liquids.'),
  c('c8-science-7', 'Solids, liquids and gases', 'Solid: fixed shape and volume. Liquid: fixed volume, no fixed shape. Gas: neither fixed shape nor volume.'),
  c('c8-science-8', 'Element', 'A pure substance made of only one kind of atom, e.g. oxygen, iron, carbon.'),
  c('c8-science-8', 'Compound', 'Two or more elements chemically combined in a fixed ratio, with new properties, e.g. water (H₂O).'),
  c('c8-science-8', 'Mixture', 'Substances mixed in any ratio, each keeping its own properties, e.g. air, salt water. Can be separated physically.'),
  c('c8-science-9', 'Solute, solvent, solution', 'The solute (e.g. sugar) dissolves in the solvent (e.g. water) to form a uniform solution.'),
  c('c8-science-9', 'Saturated solution', 'A solution that cannot dissolve any more solute at that temperature.'),
  c('c8-science-9', 'Effect of temperature on solubility', 'For most solids, solubility increases as temperature rises.'),
  c('c8-science-10', 'Laws of reflection', '1. Angle of incidence = angle of reflection.\n2. Incident ray, reflected ray and normal lie in the same plane.'),
  c('c8-science-10', 'Image in a plane mirror', 'Virtual, erect, same size, as far behind the mirror as the object is in front, and laterally inverted.'),
  c('c8-science-10', 'Convex vs concave lens', 'A convex lens converges light (can form real images). A concave lens diverges light (always virtual, smaller images).'),
  c('c8-science-11', 'Why do we have day and night?', 'Because the Earth rotates on its axis, once in about 24 hours.'),
  c('c8-science-11', 'Moon phase cycle', 'New Moon to New Moon takes about 29.5 days. The Moon shines by reflected sunlight.'),
  c('c8-science-11', 'Why do we have leap years?', 'The Earth takes about 365¼ days to orbit the Sun, so an extra day is added every 4 years.'),
  c('c8-science-12', 'Food chain roles', 'Producers (plants) → consumers (herbivores, carnivores) → decomposers (bacteria, fungi) recycle nutrients.'),
  c('c8-science-12', 'Interdependence in nature', 'Living things depend on each other and on non-living factors. Removing one species can affect the whole ecosystem.'),
  c('c8-science-13', 'What makes Earth suitable for life?', 'Liquid water, a suitable temperature range, an oxygen-containing atmosphere and an ozone layer that blocks harmful UV rays.'),
  c('c8-science-13', 'Role of the ozone layer', 'It absorbs most of the Sun’s harmful ultraviolet (UV) radiation.'),

  // ══ Class 8 · Maths (Ganita Prakash) ══
  c('c8-maths-1', 'Which digits can a perfect square never end in?', '2, 3, 7 or 8.'),
  c('c8-maths-1', 'Sum of the first n odd numbers', 'n²  (1 + 3 + 5 + … + (2n − 1) = n²)'),
  c('c8-maths-1', 'Finding a cube root by prime factorisation', 'Group equal prime factors in threes and take one from each group, e.g. 216 = (2×2×2)(3×3×3) → ∛216 = 2×3 = 6.'),
  c('c8-maths-1', 'Why is 1729 famous?', 'It is the smallest number that is a sum of two cubes in two ways: 1³ + 12³ = 9³ + 10³ (the Hardy–Ramanujan number).'),
  c('c8-maths-2', 'Laws of exponents', 'aᵐ × aⁿ = aᵐ⁺ⁿ\naᵐ ÷ aⁿ = aᵐ⁻ⁿ\n(aᵐ)ⁿ = aᵐⁿ\na⁰ = 1 (a ≠ 0)'),
  c('c8-maths-2', 'Negative exponent', 'a⁻ⁿ = 1/aⁿ, e.g. 2⁻³ = 1/8.'),
  c('c8-maths-2', 'Scientific notation', 'Write a number as a × 10ⁿ with 1 ≤ a < 10, e.g. 3,40,000 = 3.4 × 10⁵.'),
  c('c8-maths-3', 'What makes the Indian place-value system powerful?', 'Ten digits including zero, where a digit’s value depends on its place, so any number can be written compactly.'),
  c('c8-maths-3', 'Why do Roman numerals make arithmetic hard?', 'They have no zero and no place value, so column addition and multiplication don’t work.'),
  c('c8-maths-4', 'Angle sum of a quadrilateral', '360°'),
  c('c8-maths-4', 'Properties of a parallelogram', 'Opposite sides are equal and parallel, opposite angles are equal, and the diagonals bisect each other.'),
  c('c8-maths-4', 'Rectangle vs rhombus diagonals', 'Rectangle: diagonals are equal. Rhombus: diagonals bisect each other at right angles. Square: both.'),
  c('c8-maths-5', 'Divisibility by 3 and 9', 'A number is divisible by 3 (or 9) if the sum of its digits is divisible by 3 (or 9).'),
  c('c8-maths-5', 'Divisibility by 11', 'Find the difference between the sums of alternate digits. If it is 0 or a multiple of 11, the number is divisible by 11.'),
  c('c8-maths-5', 'Parity rules', 'Even + even = even, odd + odd = even, even + odd = odd. Odd × odd = odd.'),
  c('c8-maths-6', 'Distributive property', 'a(b + c) = ab + ac'),
  c('c8-maths-6', 'Expanding brackets', '(a + b)(c + d) = ac + ad + bc + bd'),
  c('c8-maths-6', 'Key identities', '(a + b)² = a² + 2ab + b²\n(a − b)² = a² − 2ab + b²\n(a + b)(a − b) = a² − b²'),
  c('c8-maths-7', 'When are four numbers in proportion?', 'a : b = c : d when a × d = b × c (product of extremes = product of means).'),
  c('c8-maths-7', 'Direct proportion', 'y increases as x increases with y/x constant, e.g. cost of pens and number of pens.'),
  c('c8-maths-8', 'What does percent mean?', 'Per hundred. 35% = 35/100 = 0.35.'),
  c('c8-maths-8', 'Percentage increase', '(Increase ÷ original value) × 100'),
  c('c8-maths-9', 'Baudhayana–Pythagoras theorem', 'In a right triangle, (hypotenuse)² = (base)² + (height)², i.e. c² = a² + b².'),
  c('c8-maths-9', 'Smallest Pythagorean triple', '3, 4, 5  (9 + 16 = 25)'),
  c('c8-maths-10', 'Inverse proportion', 'As x increases, y decreases with x × y constant, e.g. more workers → fewer days to finish a job.'),
  c('c8-maths-11', "Euler's formula for polyhedra", 'Faces + Vertices − Edges = 2, e.g. a cube: 6 + 8 − 12 = 2.'),
  c('c8-maths-13', 'Solving a linear equation', 'Do the same operation on both sides (transpose terms) until the variable is alone, e.g. 3x + 5 = 20 → 3x = 15 → x = 5.'),
  c('c8-maths-14', 'Area formulas', 'Parallelogram = base × height\nTriangle = ½ × base × height\nTrapezium = ½ × (sum of parallel sides) × height\nRhombus = ½ × d₁ × d₂'),

  // ══ Class 9 · Science (Exploration) ══
  c('c9-science-1', 'SI base units', 'Length: metre (m) · Mass: kilogram (kg) · Time: second (s) · Temperature: kelvin (K) · Current: ampere (A) · Amount: mole (mol) · Luminous intensity: candela (cd)'),
  c('c9-science-2', 'Cell theory', 'All living things are made of cells. The cell is the basic unit of life, and new cells come from existing cells.'),
  c('c9-science-2', 'Plant cell vs animal cell', 'Plant cells have a cell wall, chloroplasts and a large central vacuole. Animal cells lack a cell wall and chloroplasts.'),
  c('c9-science-2', 'Powerhouse of the cell', 'Mitochondria, the site of cellular respiration that releases energy as ATP.'),
  c('c9-science-2', 'Prokaryotic vs eukaryotic cells', 'Prokaryotic (e.g. bacteria): no nuclear membrane or membrane-bound organelles. Eukaryotic: a true nucleus and membrane-bound organelles.'),
  c('c9-science-3', 'Xylem vs phloem', 'Xylem carries water and minerals up from the roots. Phloem carries food (sugars) made in leaves to other parts.'),
  c('c9-science-3', 'Meristematic tissue', 'Plant tissue whose cells keep dividing, found at root and shoot tips (growth regions).'),
  c('c9-science-3', 'Four types of animal tissue', 'Epithelial, connective (e.g. blood, bone), muscular and nervous.'),
  c('c9-science-4', 'Distance vs displacement', 'Distance is the total path length (a scalar). Displacement is the shortest straight-line change in position, with direction (a vector).'),
  c('c9-science-4', 'Acceleration', 'a = (v − u) / t, the rate of change of velocity. SI unit m/s².'),
  c('c9-science-4', 'Equations of motion (constant a)', 'v = u + at\ns = ut + ½at²\nv² = u² + 2as'),
  c('c9-science-4', 'Why is uniform circular motion accelerated?', 'Speed is constant but direction keeps changing, so velocity changes → acceleration.'),
  c('c9-science-5', 'Separation techniques', 'Filtration (insoluble solid) · Evaporation (dissolved solid) · Distillation (liquids with different boiling points) · Chromatography (dyes in ink) · Centrifugation (cream from milk) · Sublimation (camphor, iodine, ammonium chloride)'),
  c('c9-science-5', 'Separating funnel', 'Separates immiscible liquids such as oil and water; the denser liquid drains out first.'),
  c('c9-science-6', "Newton's first law", 'A body stays at rest or in uniform motion unless an unbalanced force acts on it (law of inertia).'),
  c('c9-science-6', "Newton's second law", 'F = ma. The force is proportional to the rate of change of momentum.'),
  c('c9-science-6', "Newton's third law", 'Every action has an equal and opposite reaction, acting on different bodies.'),
  c('c9-science-6', 'Momentum', 'p = m × v (a vector). SI unit kg m/s.'),
  c('c9-science-7', 'Work', 'W = F × s (force × displacement in the direction of the force). SI unit joule (J).'),
  c('c9-science-7', 'Kinetic and potential energy', 'KE = ½mv²\nPE (height h) = mgh'),
  c('c9-science-7', 'Power', 'P = W / t. SI unit watt (W) = 1 J/s.'),
  c('c9-science-7', 'Mechanical advantage of a lever', 'MA = load ÷ effort. A lever multiplies force when the effort arm is longer than the load arm.'),
  c('c9-science-8', 'Discoverers of subatomic particles', 'Electron: J. J. Thomson · Nucleus: Rutherford (gold-foil experiment) · Neutron: James Chadwick'),
  c('c9-science-8', 'Atomic number vs mass number', 'Atomic number (Z) = number of protons. Mass number (A) = protons + neutrons.'),
  c('c9-science-8', 'Isotopes', 'Atoms of the same element with the same Z but different mass numbers, e.g. ¹²C and ¹⁴C.'),
  c('c9-science-8', 'Electron shells (K, L, M)', 'Maximum electrons per shell = 2n². For the first 20 elements, fill K = 2, L = 8, M = 8.'),
  c('c9-science-9', 'Law of conservation of mass', 'Mass is neither created nor destroyed in a chemical reaction (Lavoisier).'),
  c('c9-science-9', 'Law of constant proportions', 'A compound always contains the same elements in the same fixed ratio by mass (Proust).'),
  c('c9-science-9', 'Molecule vs ion', 'A molecule is a group of bonded atoms (e.g. O₂, H₂O). An ion is a charged atom or group (e.g. Na⁺, Cl⁻, SO₄²⁻).'),
  c('c9-science-10', 'Nature of sound waves', 'Longitudinal mechanical waves of compressions and rarefactions. They need a medium and cannot travel through vacuum.'),
  c('c9-science-10', 'Wave equation', 'v = f × λ (speed = frequency × wavelength)'),
  c('c9-science-10', 'Range of human hearing', 'About 20 Hz to 20,000 Hz. Above 20 kHz is ultrasound, used in sonography and SONAR.'),
  c('c9-science-10', 'Minimum distance for a distinct echo', 'About 17.2 m, since the sensation of sound lasts ~0.1 s in our brain.'),
  c('c9-science-11', 'Asexual reproduction examples', 'Binary fission (Amoeba), budding (Hydra, yeast), fragmentation (Spirogyra), spore formation (Rhizopus), vegetative propagation (potato, Bryophyllum).'),
  c('c9-science-11', 'Fertilisation', 'Fusion of male and female gametes to form a zygote, which develops into a new organism.'),
  c('c9-science-12', 'Hierarchy of classification', 'Kingdom → Phylum → Class → Order → Family → Genus → Species'),
  c('c9-science-12', 'Binomial nomenclature', 'Genus + species, e.g. Homo sapiens. Introduced by Carolus Linnaeus.'),
  c('c9-science-12', "Whittaker's five kingdoms", 'Monera, Protista, Fungi, Plantae, Animalia'),
  c('c9-science-13', 'Carbon cycle (core idea)', 'Plants take in CO₂ for photosynthesis. Respiration, decomposition and burning fuels return CO₂ to the air.'),
  c('c9-science-13', 'Nitrogen fixation', 'Converting atmospheric N₂ into usable compounds, by bacteria (e.g. Rhizobium in legume root nodules) and lightning.'),
  c('c9-science-13', 'Greenhouse effect', 'Gases like CO₂ and methane trap heat in the atmosphere. More of them causes global warming.'),

  // ══ Class 9 · Maths (Ganita Manjari) ══
  c('c9-maths-1', 'Signs in the four quadrants', 'I (+, +) · II (−, +) · III (−, −) · IV (+, −)'),
  c('c9-maths-1', 'Abscissa and ordinate', 'In point (x, y): x is the abscissa (distance from the y-axis), y is the ordinate (distance from the x-axis). The origin is (0, 0).'),
  c('c9-maths-2', 'Linear polynomial', 'A polynomial of degree 1: ax + b, with a ≠ 0. Its graph is a straight line.'),
  c('c9-maths-2', 'Zero of ax + b', 'x = −b/a (the value where the polynomial equals 0).'),
  c('c9-maths-3', 'Rational vs irrational', 'Rational: p/q with integers p, q and q ≠ 0; decimals terminate or repeat. Irrational: non-terminating, non-repeating, e.g. √2, π.'),
  c('c9-maths-3', 'Real numbers', 'All rational and irrational numbers together. Every real number is a point on the number line.'),
  c('c9-maths-4', 'Cube identities', '(a + b)³ = a³ + b³ + 3ab(a + b)\n(a − b)³ = a³ − b³ − 3ab(a − b)'),
  c('c9-maths-4', 'a³ + b³ + c³ − 3abc', '= (a + b + c)(a² + b² + c² − ab − bc − ca). If a + b + c = 0, then a³ + b³ + c³ = 3abc.'),
  c('c9-maths-4', '(x + a)(x + b)', 'x² + (a + b)x + ab'),
  c('c9-maths-6', "Heron's formula", 'Area = √[s(s − a)(s − b)(s − c)], where s = (a + b + c)/2'),
  c('c9-maths-6', 'Circle', 'Circumference = 2πr ;  Area = πr²'),
  c('c9-maths-7', 'Probability of an event', 'P(E) = favourable outcomes ÷ total outcomes, and 0 ≤ P(E) ≤ 1.'),
  c('c9-maths-8', 'nth term of an arithmetic progression', 'aₙ = a + (n − 1)d, where d is the common difference.'),
  c('c9-maths-9', 'Converse of a statement', 'The converse of “If P, then Q” is “If Q, then P”. A true statement can have a false converse.'),
  c('c9-maths-10', 'Mean, median, mode', 'Mean = sum ÷ count · Median = middle value of ordered data · Mode = most frequent value'),
  c('c9-maths-11', 'What is an algorithm?', 'A finite, step-by-step procedure that solves a problem, e.g. Euclid’s method for the HCF.'),
  c('c9-maths-12', 'Mid-point theorem', 'The segment joining the mid-points of two sides of a triangle is parallel to the third side and half its length.'),
  c('c9-maths-13', 'Linear equation in two variables', 'ax + by + c = 0 has infinitely many solutions. Its graph is a straight line.'),
  c('c9-maths-14', 'Sphere, cylinder, cone', 'Sphere: SA 4πr², V (4/3)πr³\nCylinder: CSA 2πrh, V πr²h\nCone: CSA πrl, V (1/3)πr²h'),
];

type Q = [string, string[], number, string];
const bank: Record<string, Q[]> = {
  'c8-science-2': [
    ['Which microorganism is used to make curd from milk?', ['Yeast', 'Lactobacillus', 'Penicillium', 'Amoeba'], 1, 'Lactobacillus bacteria convert milk into curd.'],
    ['Bread dough rises because yeast releases', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2, 'Fermentation by yeast produces CO₂.'],
    ['Penicillin was discovered by', ['Louis Pasteur', 'Edward Jenner', 'Alexander Fleming', 'Robert Koch'], 2, 'Fleming discovered it in 1928.'],
  ],
  'c8-science-3': [
    ['Which of these is a non-communicable disease?', ['Tuberculosis', 'Common cold', 'Diabetes', 'Chickenpox'], 2, 'Diabetes does not spread from person to person.'],
    ['Antibiotics are effective against', ['Viruses', 'Bacteria', 'All microbes', 'Allergies'], 1, 'Antibiotics act on bacteria, not viruses.'],
  ],
  'c8-science-4': [
    ['A fuse wire should have a', ['High melting point', 'Low melting point', 'Very low resistance and high melting point', 'Magnetic core'], 1, 'It must melt quickly when excess current flows.'],
    ['An electromagnet is a magnet only when', ['It is heated', 'Current flows through its coil', 'It is cooled', 'It is hammered'], 1, 'Its magnetism depends on the current.'],
  ],
  'c8-science-5': [
    ['SI unit of force is', ['Joule', 'Newton', 'Pascal', 'Watt'], 1, 'Named after Isaac Newton.'],
    ['Which is a non-contact force?', ['Friction', 'Muscular force', 'Magnetic force', 'Tension in a rope you pull'], 2, 'Magnets act without touching.'],
  ],
  'c8-science-6': [
    ['A force of 100 N acts on an area of 2 m². The pressure is', ['200 Pa', '50 Pa', '102 Pa', '98 Pa'], 1, 'P = F/A = 100/2 = 50 Pa.'],
    ['Wind blows from', ['Low pressure to high pressure', 'High pressure to low pressure', 'Cold to hot always', 'Sea to land always'], 1, 'Air moves towards lower pressure.'],
    ['Dam walls are thicker at the bottom because', ['Water is colder there', 'Liquid pressure increases with depth', 'Fish live there', 'It looks better'], 1, 'Deeper water exerts more pressure.'],
  ],
  'c8-science-8': [
    ['Which of these is a compound?', ['Air', 'Oxygen', 'Water', 'Brass'], 2, 'Water is H₂O, with H and O combined in a fixed ratio.'],
    ['Components of a mixture', ['Combine in a fixed ratio', 'Lose their properties', 'Keep their own properties', 'Cannot be separated'], 2, 'Mixtures can be separated by physical methods.'],
  ],
  'c8-science-9': [
    ['In salt water, the solvent is', ['Salt', 'Water', 'Both', 'Neither'], 1, 'Salt (solute) dissolves in water (solvent).'],
    ['A solution that cannot dissolve more solute at a given temperature is', ['Dilute', 'Unsaturated', 'Saturated', 'Concentrated only'], 2, 'It has reached its solubility limit.'],
  ],
  'c8-science-10': [
    ['If the angle of incidence is 35°, the angle of reflection is', ['55°', '35°', '70°', '90°'], 1, 'Angle of incidence = angle of reflection.'],
    ['The image formed by a plane mirror is', ['Real and inverted', 'Virtual and erect', 'Real and erect', 'Virtual and enlarged'], 1, 'It is also laterally inverted and the same size.'],
  ],
  'c8-science-11': [
    ['Day and night are caused by', ['Earth’s revolution', 'Earth’s rotation', 'The Moon’s rotation', 'The Sun’s motion around Earth'], 1, 'One rotation takes about 24 hours.'],
    ['A leap year has', ['364 days', '365 days', '366 days', '360 days'], 2, 'An extra day (29 February) makes up for the ¼ day each year.'],
  ],
  'c8-science-12': [
    ['In a food chain, plants are', ['Decomposers', 'Producers', 'Carnivores', 'Scavengers'], 1, 'They make food by photosynthesis.'],
  ],
  'c8-maths-1': [
    ['Which of these can never be the last digit of a perfect square?', ['1', '4', '7', '9'], 2, 'Squares end only in 0, 1, 4, 5, 6 or 9.'],
    ['Sum of the first 10 odd numbers is', ['50', '100', '110', '55'], 1, 'Sum of first n odd numbers = n² = 100.'],
    ['Cube root of 2744 is', ['12', '14', '16', '18'], 1, '14³ = 2744.'],
  ],
  'c8-maths-2': [
    ['2³ × 2⁴ =', ['2⁷', '2¹²', '4⁷', '2¹'], 0, 'Add exponents for the same base.'],
    ['5⁰ =', ['0', '5', '1', 'Not defined'], 2, 'Any non-zero number to the power 0 is 1.'],
    ['0.00045 in scientific notation is', ['4.5 × 10⁻⁴', '45 × 10⁻⁵', '4.5 × 10⁴', '0.45 × 10⁻³'], 0, 'Move the decimal 4 places right → 10⁻⁴.'],
  ],
  'c8-maths-4': [
    ['Three angles of a quadrilateral are 80°, 95° and 105°. The fourth is', ['80°', '90°', '100°', '75°'], 0, '360 − 280 = 80°.'],
    ['Diagonals of a rhombus', ['Are always equal', 'Bisect each other at right angles', 'Never intersect', 'Are parallel'], 1, 'Perpendicular bisectors of each other.'],
  ],
  'c8-maths-5': [
    ['Which number is divisible by 9?', ['1234', '4518', '2020', '5555'], 1, '4 + 5 + 1 + 8 = 18, which is divisible by 9.'],
    ['The sum of two odd numbers is always', ['Odd', 'Even', 'Prime', 'A multiple of 4'], 1, 'Odd + odd = even.'],
  ],
  'c8-maths-6': [
    ['(x + 3)² =', ['x² + 9', 'x² + 6x + 9', 'x² + 3x + 9', 'x² + 6x + 6'], 1, '(a + b)² = a² + 2ab + b².'],
    ['102 × 98 is easiest as', ['(100 + 2)(100 − 2) = 10000 − 4', '100 × 100', '102 × 100 − 2', '98²'], 0, '(a + b)(a − b) = a² − b² = 9996.'],
  ],
  'c8-maths-7': [
    ['If 5 pens cost ₹60, then 8 pens cost', ['₹90', '₹96', '₹100', '₹84'], 1, 'Unit price ₹12 × 8 = ₹96.'],
  ],
  'c8-maths-8': [
    ['3/4 as a percentage is', ['34%', '75%', '43%', '70%'], 1, '3/4 × 100 = 75%.'],
    ['A price rises from ₹200 to ₹250. The percentage increase is', ['20%', '25%', '50%', '125%'], 1, '50/200 × 100 = 25%.'],
  ],
  'c8-maths-9': [
    ['Legs of a right triangle are 6 cm and 8 cm. The hypotenuse is', ['10 cm', '12 cm', '14 cm', '9 cm'], 0, '√(36 + 64) = √100 = 10.'],
    ['Which is a Pythagorean triple?', ['(4, 5, 6)', '(5, 12, 13)', '(6, 7, 8)', '(2, 3, 4)'], 1, '25 + 144 = 169 = 13².'],
  ],
  'c8-maths-10': [
    ['6 workers finish a job in 10 days. 12 workers (same rate) take', ['20 days', '5 days', '10 days', '15 days'], 1, 'Inverse proportion: 6 × 10 = 12 × 5.'],
  ],
  'c8-maths-11': [
    ['A cube has how many edges?', ['6', '8', '12', '10'], 2, 'F + V − E = 2 → 6 + 8 − E = 2 → E = 12.'],
  ],
  'c8-maths-13': [
    ['Solve: 3x + 5 = 20', ['x = 3', 'x = 5', 'x = 15', 'x = 25/3'], 1, '3x = 15 → x = 5.'],
  ],
  'c8-maths-14': [
    ['Area of a trapezium with parallel sides 6 cm and 10 cm and height 4 cm', ['32 cm²', '64 cm²', '40 cm²', '24 cm²'], 0, '½ × 16 × 4 = 32 cm².'],
    ['Area of a rhombus with diagonals 8 cm and 6 cm', ['48 cm²', '24 cm²', '14 cm²', '28 cm²'], 1, '½ × 8 × 6 = 24 cm².'],
  ],
  'c9-science-2': [
    ['Which is found in plant cells but not in animal cells?', ['Nucleus', 'Cell wall', 'Mitochondria', 'Cell membrane'], 1, 'Plant cells also have chloroplasts and a large vacuole.'],
    ['The powerhouse of the cell is the', ['Ribosome', 'Golgi body', 'Mitochondrion', 'Lysosome'], 2, 'It releases energy by respiration.'],
    ['Bacteria are', ['Eukaryotic', 'Prokaryotic', 'Multicellular plants', 'Viruses'], 1, 'They lack a membrane-bound nucleus.'],
  ],
  'c9-science-3': [
    ['Xylem transports', ['Food', 'Water and minerals', 'Hormones only', 'Oxygen'], 1, 'Phloem transports food.'],
    ['Blood is a type of', ['Epithelial tissue', 'Connective tissue', 'Muscular tissue', 'Nervous tissue'], 1, 'Fluid connective tissue with plasma and cells.'],
  ],
  'c9-science-4': [
    ['A car goes from 10 m/s to 30 m/s in 5 s. Its acceleration is', ['2 m/s²', '4 m/s²', '6 m/s²', '8 m/s²'], 1, '(30 − 10)/5 = 4 m/s².'],
    ['A body in uniform circular motion has', ['Constant velocity', 'Changing velocity (it is accelerated)', 'Zero acceleration', 'No speed'], 1, 'Direction changes continuously, so velocity changes.'],
    ['After a full round trip, displacement is', ['Equal to distance', 'Zero', 'Twice the distance', 'Negative'], 1, 'You end where you started.'],
  ],
  'c9-science-5': [
    ['Cream is separated from milk by', ['Filtration', 'Centrifugation', 'Sublimation', 'Distillation'], 1, 'Spinning separates the lighter cream.'],
    ['Different dyes in black ink are separated by', ['Chromatography', 'Evaporation', 'Sieving', 'Magnetic separation'], 0, 'Dyes travel at different speeds on paper.'],
    ['Which substance sublimes?', ['Common salt', 'Sugar', 'Camphor', 'Sand'], 2, 'It changes directly from solid to vapour.'],
  ],
  'c9-science-6': [
    ['A 2 kg body accelerates at 3 m/s². The force is', ['1.5 N', '5 N', '6 N', '9 N'], 2, 'F = ma = 2 × 3 = 6 N.'],
    ['Momentum of a 4 kg ball moving at 5 m/s', ['9 kg m/s', '20 kg m/s', '1.25 kg m/s', '100 kg m/s'], 1, 'p = mv = 20 kg m/s.'],
    ['When a gun fires, it recoils because of Newton’s', ['First law', 'Second law', 'Third law', 'Law of gravitation'], 2, 'Action on the bullet, reaction on the gun.'],
  ],
  'c9-science-7': [
    ['Work done when a 10 N force moves a box 5 m along the force', ['2 J', '15 J', '50 J', '0 J'], 2, 'W = F × s = 50 J.'],
    ['KE of a 2 kg body moving at 3 m/s', ['6 J', '9 J', '18 J', '3 J'], 1, '½ × 2 × 9 = 9 J.'],
    ['SI unit of power', ['Joule', 'Watt', 'Newton', 'Pascal'], 1, '1 W = 1 J/s.'],
  ],
  'c9-science-8': [
    ['The neutron was discovered by', ['J. J. Thomson', 'Rutherford', 'James Chadwick', 'Niels Bohr'], 2, 'Chadwick, 1932.'],
    ['An atom has 11 protons and 12 neutrons. Its mass number is', ['11', '12', '23', '1'], 2, 'A = protons + neutrons.'],
    ['Maximum electrons in the L shell (n = 2)', ['2', '8', '18', '32'], 1, '2n² = 8.'],
  ],
  'c9-science-9': [
    ['The law of constant proportions was given by', ['Lavoisier', 'Proust', 'Dalton', 'Avogadro'], 1, 'Joseph Proust.'],
    ['Which is an ion?', ['O₂', 'H₂O', 'Na⁺', 'He'], 2, 'It carries an electric charge.'],
  ],
  'c9-science-10': [
    ['Sound cannot travel through', ['Water', 'Steel', 'Air', 'Vacuum'], 3, 'Sound needs a material medium.'],
    ['A wave has frequency 500 Hz and wavelength 0.68 m. Its speed is', ['340 m/s', '500 m/s', '735 m/s', '0.0014 m/s'], 0, 'v = fλ = 500 × 0.68.'],
    ['Ultrasound has frequency', ['Below 20 Hz', 'Between 20 Hz and 20 kHz', 'Above 20 kHz', 'Exactly 1 kHz'], 2, 'Above the range of human hearing.'],
  ],
  'c9-science-11': [
    ['Hydra reproduces asexually by', ['Binary fission', 'Budding', 'Spore formation', 'Fragmentation'], 1, 'A bud grows and detaches.'],
    ['The fusion of gametes forms a', ['Spore', 'Zygote', 'Bud', 'Seed coat'], 1, 'Fertilisation produces a zygote.'],
  ],
  'c9-science-12': [
    ['Binomial nomenclature was introduced by', ['Darwin', 'Linnaeus', 'Whittaker', 'Mendel'], 1, 'Carolus Linnaeus.'],
    ['Which is NOT one of Whittaker’s five kingdoms?', ['Monera', 'Fungi', 'Virus', 'Protista'], 2, 'Viruses are not placed in the five kingdoms.'],
  ],
  'c9-science-13': [
    ['Nitrogen is fixed in legume roots by', ['Yeast', 'Rhizobium', 'Penicillium', 'Algae'], 1, 'Rhizobium lives in root nodules.'],
  ],
  'c9-maths-1': [
    ['The point (−3, 4) lies in quadrant', ['I', 'II', 'III', 'IV'], 1, 'x negative, y positive.'],
    ['The point (0, −5) lies', ['In quadrant IV', 'On the x-axis', 'On the y-axis', 'At the origin'], 2, 'x = 0 means it lies on the y-axis.'],
  ],
  'c9-maths-2': [
    ['The zero of 2x − 6 is', ['−3', '3', '6', '−6'], 1, '2x − 6 = 0 → x = 3.'],
  ],
  'c9-maths-3': [
    ['Which is irrational?', ['0.75', '√16', '√2', '22/7'], 2, '√2 is non-terminating and non-repeating.'],
    ['0.333… (recurring) equals', ['3/10', '1/3', '33/100', '3/100'], 1, 'Repeating decimals are rational: 1/3.'],
  ],
  'c9-maths-4': [
    ['(x + 2)(x + 5) =', ['x² + 7x + 10', 'x² + 10x + 7', 'x² + 7x + 7', 'x² + 10'], 0, 'x² + (a + b)x + ab.'],
    ['If a + b + c = 0, then a³ + b³ + c³ =', ['0', 'abc', '3abc', 'a + b + c'], 2, 'From a³ + b³ + c³ − 3abc = (a + b + c)(…).'],
  ],
  'c9-maths-6': [
    ['Area of a triangle with sides 3, 4, 5 cm (Heron)', ['6 cm²', '12 cm²', '7.5 cm²', '10 cm²'], 0, 's = 6, √(6·3·2·1) = 6.'],
  ],
  'c9-maths-7': [
    ['Probability of getting a head when a fair coin is tossed', ['0', '1/4', '1/2', '1'], 2, 'One favourable outcome out of two.'],
    ['P(E) can never be', ['0', '0.5', '1', '1.2'], 3, '0 ≤ P(E) ≤ 1.'],
  ],
  'c9-maths-8': [
    ['10th term of the AP 2, 7, 12, …', ['47', '52', '45', '50'], 0, 'a + 9d = 2 + 45 = 47.'],
  ],
  'c9-maths-10': [
    ['Median of 3, 7, 9, 2, 5', ['5', '7', '9', '3'], 0, 'Ordered: 2, 3, 5, 7, 9 → the middle value is 5.'],
    ['Mode of 2, 4, 4, 6, 4, 8', ['2', '4', '6', '8'], 1, '4 occurs most often.'],
  ],
  'c9-maths-13': [
    ['How many solutions does 2x + 3y = 6 have?', ['None', 'Exactly one', 'Exactly two', 'Infinitely many'], 3, 'Every point on its line is a solution.'],
  ],
  'c9-maths-14': [
    ['Volume of a cylinder with r = 7 cm, h = 10 cm (π = 22/7)', ['1540 cm³', '440 cm³', '154 cm³', '2200 cm³'], 0, '22/7 × 49 × 10 = 1540 cm³.'],
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
