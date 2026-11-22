/**
 * CBSE / NCERT syllabus map for Classes 8–12 (Science PCM & PCB).
 *
 * Sources & editions
 * - Class 8: new NCERT books (NCF-SE 2023) — Science "Curiosity", Maths "Ganita Prakash" Parts 1 & 2.
 * - Class 9: new NCERT books for 2026-27 — Science "Exploration", Maths "Ganita Manjari".
 *   Part 1 (8 chapters) is confirmed by multiple sources; Part 2 chapters are listed by a
 *   single source and flagged `provisional` — verify against ncert.nic.in before release.
 * - Classes 10–12: rationalised NCERT textbooks (2023-24 onward).
 *
 * Students can add their own subjects/chapters in-app (English, SST, Hindi, CS, …),
 * so this file only needs to hold the core science track.
 */

export type ClassLevel = 8 | 9 | 10 | 11 | 12;
export type Stream = 'PCM' | 'PCB';
export type SubjectKey = 'maths' | 'science' | 'physics' | 'chemistry' | 'biology' | 'custom';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  part?: string;
  provisional?: boolean;
}

export interface Subject {
  id: string;
  key: SubjectKey;
  classLevel: ClassLevel;
  name: string;
  book: string;
  color: string;
  glow: string;
  icon: string; // Ionicons name
  chapters: Chapter[];
  custom?: boolean;
}

export const SUBJECT_STYLE: Record<SubjectKey, { color: string; glow: string; icon: string }> = {
  maths: { color: '#A07CFF', glow: 'rgba(160,124,255,0.35)', icon: 'shapes-outline' },
  science: { color: '#3FE0B8', glow: 'rgba(63,224,184,0.32)', icon: 'flask-outline' },
  physics: { color: '#4F9BFF', glow: 'rgba(79,155,255,0.35)', icon: 'planet-outline' },
  chemistry: { color: '#FFB84D', glow: 'rgba(255,184,77,0.32)', icon: 'beaker-outline' },
  biology: { color: '#FF6B95', glow: 'rgba(255,107,149,0.32)', icon: 'leaf-outline' },
  custom: { color: '#8FA3C7', glow: 'rgba(143,163,199,0.3)', icon: 'book-outline' },
};

type Raw = { key: SubjectKey; name: string; book: string; chapters: (string | [string, string, boolean?])[] };

const RAW: Record<ClassLevel, Raw[]> = {
  8: [
    {
      key: 'science',
      name: 'Science',
      book: 'Curiosity',
      chapters: [
        'Exploring the Investigative World of Science',
        'The Invisible Living World: Beyond Our Naked Eye',
        'Health: The Ultimate Treasure',
        'Electricity: Magnetic and Heating Effects',
        'Exploring Forces',
        'Pressure, Winds, Storms, and Cyclones',
        'Particulate Nature of Matter',
        'Nature of Matter: Elements, Compounds, and Mixtures',
        'The Amazing World of Solutes, Solvents, and Solutions',
        'Light: Mirrors and Lenses',
        'Keeping Time with the Skies',
        'How Nature Works in Harmony',
        'Our Home: Earth, a Unique Life-Sustaining Planet',
      ],
    },
    {
      key: 'maths',
      name: 'Mathematics',
      book: 'Ganita Prakash',
      chapters: [
        ['A Square and A Cube', 'Part 1'],
        ['Power Play', 'Part 1'],
        ['A Story of Numbers', 'Part 1'],
        ['Quadrilaterals', 'Part 1'],
        ['Number Play', 'Part 1'],
        ['We Distribute, Yet Things Multiply', 'Part 1'],
        ['Proportional Reasoning-1', 'Part 1'],
        ['Fractions in Disguise', 'Part 2'],
        ['The Baudhayana-Pythagoras Theorem', 'Part 2'],
        ['Proportional Reasoning-2', 'Part 2'],
        ['Exploring Some Geometric Themes', 'Part 2'],
        ['Tales by Dots and Lines', 'Part 2'],
        ['Algebra Play', 'Part 2'],
        ['Area', 'Part 2'],
      ],
    },
  ],
  9: [
    {
      key: 'science',
      name: 'Science',
      book: 'Exploration',
      chapters: [
        'Exploration: Entering the World of Secondary Science',
        'Cell: The Building Block of Life',
        'Tissues in Action',
        'Describing Motion Around Us',
        'Exploring Mixtures and their Separation',
        'How Forces Affect Motion',
        'Work, Energy, and Simple Machines',
        'Journey Inside the Atom',
        'Atomic Foundations of Matter',
        'Sound Waves: Characteristics and Applications',
        'Reproduction: How Life Continues',
        'Patterns in Life: Diversity and Classification',
        'Earth as a System: Energy, Matter, and Life',
      ],
    },
    {
      key: 'maths',
      name: 'Mathematics',
      book: 'Ganita Manjari',
      chapters: [
        ['Orienting Yourself: The Use of Coordinates', 'Part 1'],
        ['Introduction to Linear Polynomials', 'Part 1'],
        ['The World of Numbers', 'Part 1'],
        ['Exploring Algebraic Identities', 'Part 1'],
        ["I'm Up and Down, and Round and Round", 'Part 1'],
        ['Measuring Space: Perimeter and Area', 'Part 1'],
        ['The Mathematics of Maybe: Introduction to Probability', 'Part 1'],
        ['Predicting What Comes Next: Exploring Sequences and Progressions', 'Part 1'],
        ['Propositions and their Converses', 'Part 2', true],
        ['How Quantities Combine: Understanding Data', 'Part 2', true],
        ['The World of Algorithms', 'Part 2', true],
        ['Quadrilaterals', 'Part 2', true],
        ['Two Variables, One Line', 'Part 2', true],
        ['Math of Space: Surface Area and Volume', 'Part 2', true],
      ],
    },
  ],
  10: [
    {
      key: 'science',
      name: 'Science',
      book: 'Science (NCERT)',
      chapters: [
        'Chemical Reactions and Equations',
        'Acids, Bases and Salts',
        'Metals and Non-metals',
        'Carbon and its Compounds',
        'Life Processes',
        'Control and Coordination',
        'How do Organisms Reproduce?',
        'Heredity',
        'Light – Reflection and Refraction',
        'The Human Eye and the Colourful World',
        'Electricity',
        'Magnetic Effects of Electric Current',
        'Our Environment',
      ],
    },
    {
      key: 'maths',
      name: 'Mathematics',
      book: 'Mathematics (NCERT)',
      chapters: [
        'Real Numbers',
        'Polynomials',
        'Pair of Linear Equations in Two Variables',
        'Quadratic Equations',
        'Arithmetic Progressions',
        'Triangles',
        'Coordinate Geometry',
        'Introduction to Trigonometry',
        'Some Applications of Trigonometry',
        'Circles',
        'Areas Related to Circles',
        'Surface Areas and Volumes',
        'Statistics',
        'Probability',
      ],
    },
  ],
  11: [
    {
      key: 'physics',
      name: 'Physics',
      book: 'Physics Part I & II',
      chapters: [
        ['Units and Measurements', 'Part I'],
        ['Motion in a Straight Line', 'Part I'],
        ['Motion in a Plane', 'Part I'],
        ['Laws of Motion', 'Part I'],
        ['Work, Energy and Power', 'Part I'],
        ['System of Particles and Rotational Motion', 'Part I'],
        ['Gravitation', 'Part I'],
        ['Mechanical Properties of Solids', 'Part II'],
        ['Mechanical Properties of Fluids', 'Part II'],
        ['Thermal Properties of Matter', 'Part II'],
        ['Thermodynamics', 'Part II'],
        ['Kinetic Theory', 'Part II'],
        ['Oscillations', 'Part II'],
        ['Waves', 'Part II'],
      ],
    },
    {
      key: 'chemistry',
      name: 'Chemistry',
      book: 'Chemistry Part I & II',
      chapters: [
        ['Some Basic Concepts of Chemistry', 'Part I'],
        ['Structure of Atom', 'Part I'],
        ['Classification of Elements and Periodicity in Properties', 'Part I'],
        ['Chemical Bonding and Molecular Structure', 'Part I'],
        ['Thermodynamics', 'Part I'],
        ['Equilibrium', 'Part I'],
        ['Redox Reactions', 'Part II'],
        ['Organic Chemistry – Some Basic Principles and Techniques', 'Part II'],
        ['Hydrocarbons', 'Part II'],
      ],
    },
    {
      key: 'maths',
      name: 'Mathematics',
      book: 'Mathematics (NCERT)',
      chapters: [
        'Sets',
        'Relations and Functions',
        'Trigonometric Functions',
        'Complex Numbers and Quadratic Equations',
        'Linear Inequalities',
        'Permutations and Combinations',
        'Binomial Theorem',
        'Sequences and Series',
        'Straight Lines',
        'Conic Sections',
        'Introduction to Three Dimensional Geometry',
        'Limits and Derivatives',
        'Statistics',
        'Probability',
      ],
    },
    {
      key: 'biology',
      name: 'Biology',
      book: 'Biology (NCERT)',
      chapters: [
        'The Living World',
        'Biological Classification',
        'Plant Kingdom',
        'Animal Kingdom',
        'Morphology of Flowering Plants',
        'Anatomy of Flowering Plants',
        'Structural Organisation in Animals',
        'Cell: The Unit of Life',
        'Biomolecules',
        'Cell Cycle and Cell Division',
        'Photosynthesis in Higher Plants',
        'Respiration in Plants',
        'Plant Growth and Development',
        'Breathing and Exchange of Gases',
        'Body Fluids and Circulation',
        'Excretory Products and their Elimination',
        'Locomotion and Movement',
        'Neural Control and Coordination',
        'Chemical Coordination and Integration',
      ],
    },
  ],
  12: [
    {
      key: 'physics',
      name: 'Physics',
      book: 'Physics Part I & II',
      chapters: [
        ['Electric Charges and Fields', 'Part I'],
        ['Electrostatic Potential and Capacitance', 'Part I'],
        ['Current Electricity', 'Part I'],
        ['Moving Charges and Magnetism', 'Part I'],
        ['Magnetism and Matter', 'Part I'],
        ['Electromagnetic Induction', 'Part I'],
        ['Alternating Current', 'Part I'],
        ['Electromagnetic Waves', 'Part I'],
        ['Ray Optics and Optical Instruments', 'Part II'],
        ['Wave Optics', 'Part II'],
        ['Dual Nature of Radiation and Matter', 'Part II'],
        ['Atoms', 'Part II'],
        ['Nuclei', 'Part II'],
        ['Semiconductor Electronics: Materials, Devices and Simple Circuits', 'Part II'],
      ],
    },
    {
      key: 'chemistry',
      name: 'Chemistry',
      book: 'Chemistry Part I & II',
      chapters: [
        ['Solutions', 'Part I'],
        ['Electrochemistry', 'Part I'],
        ['Chemical Kinetics', 'Part I'],
        ['The d- and f-Block Elements', 'Part I'],
        ['Coordination Compounds', 'Part I'],
        ['Haloalkanes and Haloarenes', 'Part II'],
        ['Alcohols, Phenols and Ethers', 'Part II'],
        ['Aldehydes, Ketones and Carboxylic Acids', 'Part II'],
        ['Amines', 'Part II'],
        ['Biomolecules', 'Part II'],
      ],
    },
    {
      key: 'maths',
      name: 'Mathematics',
      book: 'Mathematics Part I & II',
      chapters: [
        ['Relations and Functions', 'Part I'],
        ['Inverse Trigonometric Functions', 'Part I'],
        ['Matrices', 'Part I'],
        ['Determinants', 'Part I'],
        ['Continuity and Differentiability', 'Part I'],
        ['Application of Derivatives', 'Part I'],
        ['Integrals', 'Part II'],
        ['Application of Integrals', 'Part II'],
        ['Differential Equations', 'Part II'],
        ['Vector Algebra', 'Part II'],
        ['Three Dimensional Geometry', 'Part II'],
        ['Linear Programming', 'Part II'],
        ['Probability', 'Part II'],
      ],
    },
    {
      key: 'biology',
      name: 'Biology',
      book: 'Biology (NCERT)',
      chapters: [
        'Sexual Reproduction in Flowering Plants',
        'Human Reproduction',
        'Reproductive Health',
        'Principles of Inheritance and Variation',
        'Molecular Basis of Inheritance',
        'Evolution',
        'Human Health and Disease',
        'Microbes in Human Welfare',
        'Biotechnology: Principles and Processes',
        'Biotechnology and its Applications',
        'Organisms and Populations',
        'Ecosystem',
        'Biodiversity and Conservation',
      ],
    },
  ],
};

function build(level: ClassLevel, raw: Raw): Subject {
  const id = `c${level}-${raw.key}`;
  const style = SUBJECT_STYLE[raw.key];
  return {
    id,
    key: raw.key,
    classLevel: level,
    name: raw.name,
    book: raw.book,
    ...style,
    chapters: raw.chapters.map((c, i) => {
      const [title, part, provisional] = typeof c === 'string' ? [c, undefined, false] : c;
      return { id: `${id}-${i + 1}`, number: i + 1, title, part, provisional: !!provisional };
    }),
  };
}

export const SYLLABUS: Subject[] = (Object.keys(RAW) as unknown as string[]).flatMap((k) => {
  const level = Number(k) as ClassLevel;
  return RAW[level].map((r) => build(level, r));
});

export const CLASS_LEVELS: ClassLevel[] = [8, 9, 10, 11, 12];

export function isSenior(level: ClassLevel) {
  return level >= 11;
}

/** Core NCERT subjects for a student's class + stream. */
export function coreSubjectsFor(level: ClassLevel, stream?: Stream): Subject[] {
  return SYLLABUS.filter((s) => {
    if (s.classLevel !== level) return false;
    if (!isSenior(level)) return true;
    if (s.key === 'physics' || s.key === 'chemistry') return true;
    if (stream === 'PCB') return s.key === 'biology';
    return s.key === 'maths';
  });
}

/** Optional extra NCERT subject (e.g. Maths for PCB → PCMB). */
export function optionalSubjectsFor(level: ClassLevel, stream?: Stream): Subject[] {
  if (!isSenior(level)) return [];
  return SYLLABUS.filter(
    (s) => s.classLevel === level && (stream === 'PCB' ? s.key === 'maths' : s.key === 'biology'),
  );
}

export function findSubject(id: string): Subject | undefined {
  return SYLLABUS.find((s) => s.id === id);
}

export function findChapterGlobal(chapterId: string): { subject: Subject; chapter: Chapter } | undefined {
  for (const subject of SYLLABUS) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (chapter) return { subject, chapter };
  }
  return undefined;
}
