/**
 * CBSE / NCERT syllabus map for Classes 8 and 9.
 *
 * Sources & editions
 * - Class 8: new NCERT books (NCF-SE 2023) — Science "Curiosity", Maths "Ganita Prakash" Parts 1 & 2.
 * - Class 9: new NCERT books for 2026-27 — Science "Exploration", Maths "Ganita Manjari".
 *   Part 1 (8 chapters) is confirmed by multiple sources; Part 2 chapters are listed by a
 *   single source and flagged `provisional` — verify against ncert.nic.in before release.
 *
 * Students can add their own subjects/chapters in-app (English, SST, Hindi, Sanskrit, …),
 * so this file only needs to hold the core Science + Maths track.
 */

export type ClassLevel = 8 | 9;
export type SubjectKey = 'maths' | 'science' | 'custom';

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

export const CLASS_LEVELS: ClassLevel[] = [8, 9];

/** Core NCERT subjects for a student's class. */
export function coreSubjectsFor(level: ClassLevel): Subject[] {
  return SYLLABUS.filter((s) => s.classLevel === level);
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
