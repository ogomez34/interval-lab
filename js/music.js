export const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const FLAT_EQUIV = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
export const LETTER_TO_SEMI = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };

export const INTERVALS = [
  [1,'minor 2nd'], [2,'major 2nd'], [3,'minor 3rd'], [4,'major 3rd'],
  [5,'perfect 4th'], [6,'tritone'], [7,'perfect 5th'], [8,'minor 6th'],
  [9,'major 6th'], [10,'minor 7th'], [11,'major 7th']
];

// The full 13-step interval dictionary (unison through octave), used for
// labels, feedback and the theory tables. `short` is the chromatic degree
// label; `quality` groups it into the three classical families.
export const INTERVAL_DETAILS = {
  0:  { name: 'unison',      short: 'R',  quality: 'perfect',   sound: 'the same pitch — identity', song: '—' },
  1:  { name: 'minor 2nd',   short: '♭2', quality: 'dissonant', sound: 'tense, resolves down a step', song: 'Jaws theme' },
  2:  { name: 'major 2nd',   short: '2',  quality: 'dissonant', sound: 'bright step, wants to move', song: 'Happy Birthday' },
  3:  { name: 'minor 3rd',   short: '♭3', quality: 'imperfect', sound: 'sad colour, quite stable', song: 'Smoke on the Water (riff)' },
  4:  { name: 'major 3rd',   short: '3',  quality: 'imperfect', sound: 'happy colour, quite stable', song: 'When the Saints Go Marching In' },
  5:  { name: 'perfect 4th', short: '4',  quality: 'perfect',   sound: 'open, suspended', song: 'Here Comes the Bride' },
  6:  { name: 'tritone',     short: '♭5', quality: 'dissonant', sound: 'restless, wants to resolve', song: 'The Simpsons theme' },
  7:  { name: 'perfect 5th', short: '5',  quality: 'perfect',   sound: 'strong, supportive — the power chord', song: 'Twinkle Twinkle Little Star' },
  8:  { name: 'minor 6th',   short: '♭6', quality: 'imperfect', sound: 'dark, longing', song: 'The Entertainer (Scott Joplin)' },
  9:  { name: 'major 6th',   short: '6',  quality: 'imperfect', sound: 'warm, sweet', song: 'My Bonnie Lies Over the Ocean' },
  10: { name: 'minor 7th',   short: '♭7', quality: 'dissonant', sound: 'bluesy, easy tension', song: 'Somewhere (West Side Story)' },
  11: { name: 'major 7th',   short: '7',  quality: 'dissonant', sound: 'dreamy, sharp tension', song: 'Take On Me (chorus)' },
  12: { name: 'octave',      short: 'P8', quality: 'perfect',   sound: 'the same note, one register up', song: 'Somewhere Over the Rainbow' }
};
export function intervalDetail(semis) { return INTERVAL_DETAILS[mod12(semis)] || INTERVAL_DETAILS[0]; }
export function intervalName(semis) { return intervalDetail(semis).name; }
export function intervalShort(semis) { return intervalDetail(semis).short; }

// Quality short labels (U, m2, M2, m3, M3, P4, TT, P5, m6, M6, m7, M7, P8)
// — the "theory" spelling used in the dual label mode and chord degrees.
export const INTERVAL_QSHORT = {
  0:'R', 1:'m2', 2:'M2', 3:'m3', 4:'M3', 5:'P4', 6:'TT',
  7:'P5', 8:'m6', 9:'M6', 10:'m7', 11:'M7', 12:'P8'
};
export function intervalQShort(semis) { return INTERVAL_QSHORT[mod12(semis)] || 'R'; }

// Guided ear-training stages: each stage adds a family of intervals on top
// of the previous one. The octave bookends the path (identity -> identity).
export const EAR_STAGES = {
  stage1: { label: 'Stage 1 · Perfect pillars', semis: [7,5,12] },
  stage2: { label: 'Stage 2 · The colours', semis: [7,5,12,3,4] },
  stage3: { label: 'Stage 3 · Steps', semis: [7,5,12,3,4,2,1] },
  stage4: { label: 'Stage 4 · Wide colours', semis: [7,5,12,3,4,2,1,8,9,10,11] },
  stage5: { label: 'Stage 5 · Full chromatic', semis: [1,2,3,4,5,6,7,8,9,10,11,12] }
};

export const LEVELS = {
  1: { directions: [1], semis: [2,3,4] },
  2: { directions: [1,-1], semis: [2,3,4] },
  3: { directions: [1,-1], semis: [2,3,4,5,6,7,8,9,10,11] },
  4: { directions: [1,-1], semis: [1,2,3,4,5,6,7,8,9,10,11] }
};

export const SCALES = {
  chromatic:     [0,1,2,3,4,5,6,7,8,9,10,11],
  minorPent:     [0,3,5,7,10],
  majorPent:     [0,2,4,7,9],
  naturalMinor:  [0,2,3,5,7,8,10],
  major:         [0,2,4,5,7,9,11],
  blues:         [0,3,5,6,7,10],
  dorian:        [0,2,3,5,7,9,10],
  phrygian:      [0,1,3,5,7,8,10],
  lydian:        [0,2,4,6,7,9,11],
  mixolydian:    [0,2,4,5,7,9,10],
  locrian:       [0,1,3,5,6,8,10],
  harmonicMinor: [0,2,3,5,7,8,11],
  melodicMinor:  [0,2,3,5,7,9,11]
};

export const INTERVAL_LABELS = {
  0:'1', 1:'b2', 2:'2', 3:'b3', 4:'3', 5:'4', 6:'b5', 7:'5', 8:'b6', 9:'6', 10:'b7', 11:'7'
};

export const MAJOR_SCALE = [0,2,4,5,7,9,11];
export const NATURAL_MINOR_SCALE = [0,2,3,5,7,8,10];

export const TUNINGS = {
  dropC: { label: 'Drop C', description: 'C2 – G2 – C3 – F3 – A3 – D4', strings: [
    { name: 'C2', midi: 36 }, { name: 'G2', midi: 43 }, { name: 'C3', midi: 48 },
    { name: 'F3', midi: 53 }, { name: 'A3', midi: 57 }, { name: 'D4', midi: 62 }
  ]},
  standardC: { label: 'Standard C', description: 'C2 – F2 – A#2 – D#3 – G3 – C4', strings: [
    { name: 'C2', midi: 36 }, { name: 'F2', midi: 41 }, { name: 'A#2', midi: 46 },
    { name: 'D#3', midi: 51 }, { name: 'G3', midi: 55 }, { name: 'C4', midi: 60 }
  ]},
  standardCsharp: { label: 'Standard C#', description: 'C#2 – F#2 – B2 – E3 – G#3 – C#4', strings: [
    { name: 'C#2', midi: 37 }, { name: 'F#2', midi: 42 }, { name: 'B2', midi: 47 },
    { name: 'E3', midi: 52 }, { name: 'G#3', midi: 56 }, { name: 'C#4', midi: 61 }
  ]},
  standardE: { label: 'Standard E', description: 'E2 – A2 – D3 – G3 – B3 – E4', strings: [
    { name: 'E2', midi: 40 }, { name: 'A2', midi: 45 }, { name: 'D3', midi: 50 },
    { name: 'G3', midi: 55 }, { name: 'B3', midi: 59 }, { name: 'E4', midi: 64 }
  ]},
  dropD: { label: 'Drop D', description: 'D2 – A2 – D3 – G3 – B3 – E4', strings: [
    { name: 'D2', midi: 38 }, { name: 'A2', midi: 45 }, { name: 'D3', midi: 50 },
    { name: 'G3', midi: 55 }, { name: 'B3', midi: 59 }, { name: 'E4', midi: 64 }
  ]},
  standardEb: { label: 'Eb Standard', description: 'D#2 – G#2 – C#3 – F#3 – A#3 – D#4', strings: [
    { name: 'D#2', midi: 39 }, { name: 'G#2', midi: 44 }, { name: 'C#3', midi: 49 },
    { name: 'F#3', midi: 54 }, { name: 'A#3', midi: 58 }, { name: 'D#4', midi: 63 }
  ]},
  standardD: { label: 'D Standard', description: 'D2 – G2 – C3 – F3 – A3 – D4', strings: [
    { name: 'D2', midi: 38 }, { name: 'G2', midi: 43 }, { name: 'C3', midi: 48 },
    { name: 'F3', midi: 53 }, { name: 'A3', midi: 57 }, { name: 'D4', midi: 62 }
  ]},
  openG: { label: 'Open G', description: 'D2 – G2 – D3 – G3 – B3 – D4', strings: [
    { name: 'D2', midi: 38 }, { name: 'G2', midi: 43 }, { name: 'D3', midi: 50 },
    { name: 'G3', midi: 55 }, { name: 'B3', midi: 59 }, { name: 'D4', midi: 62 }
  ]},
  openD: { label: 'Open D', description: 'D2 – A2 – D3 – F#3 – A3 – D4', strings: [
    { name: 'D2', midi: 38 }, { name: 'A2', midi: 45 }, { name: 'D3', midi: 50 },
    { name: 'F#3', midi: 54 }, { name: 'A3', midi: 57 }, { name: 'D4', midi: 62 }
  ]}
};

export const CHORD_TYPES = {
  'Major':       [0,4,7],
  'Minor':       [0,3,7],
  'Diminished':  [0,3,6],
  'Augmented':   [0,4,8],
  'Sus2':        [0,2,7],
  'Sus4':        [0,5,7],
  'Major 7':     [0,4,7,11],
  'Minor 7':     [0,3,7,10],
  'Dominant 7':  [0,4,7,10],
  'Minor 7b5':   [0,3,6,10],
  'Dim 7':       [0,3,6,9],
  'Major 6':     [0,4,7,9],
  'Minor 6':     [0,3,7,9],
  'Add 9':       [0,4,7,14],
  'Power (5)':   [0,7],
  'Octave':      [0,12]
};

export const CIRCLE_MAJOR = ['C','G','D','A','E','B','F#','Db','Ab','Eb','Bb','F'];
export const CIRCLE_MINOR = ['Am','Em','Bm','F#m','C#m','G#m','D#m','Bbm','Fm','Cm','Gm','Dm'];
// The same circle in fixed-Do solfège (same slice order).
export const CIRCLE_MAJOR_SOLFEGE = ['Do','Sol','Re','La','Mi','Si','Fa#','Re♭','La♭','Mi♭','Si♭','Fa'];
export const CIRCLE_MINOR_SOLFEGE = ['La m','Mi m','Si m','Fa# m','Do# m','Sol# m','Re# m','Si♭ m','Fa m','Do m','Sol m','Re m'];

export const CIRCLE_THEME_COLORS = {
  dark:     ['#c98a3a','#4a7fb8','#4a9e5a','#8a5ab8','#c05a5a','#3aa0a0','#b8a83a','#c05a9a','#7aa83a','#c0783a','#3a9ac0','#9a5ac0'],
  light:    ['#999999','#888888','#777777','#888888','#999999','#888888','#777777','#888888','#999999','#888888','#777777','#888888'],
  colorful: ['#ff00aa','#00ffff','#00ff88','#aa00ff','#ff0055','#00aaff','#ffee00','#ff00ff','#88ff00','#ff6600','#00ffcc','#ff0088']
};

// Helpers
export const $ = id => document.getElementById(id);
export function randomChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
export function mod12(n) { return ((n % 12) + 12) % 12; }
export function pcName(pc) { return NOTES[mod12(pc)]; }
export function rootNameToPc(name) {
  return mod12(LETTER_TO_SEMI[name[0]] + (name.length > 1 ? 1 : 0));
}
// Like rootNameToPc but also understands flat spellings (Db, Eb, Gb, Ab, Bb).
export function noteNameToPc(name) {
  if (!name) return 0;
  const flatToPc = { Db: 1, Eb: 3, Gb: 6, Ab: 8, Bb: 10 };
  if (flatToPc[name] !== undefined) return flatToPc[name];
  return rootNameToPc(name);
}
// Format a pitch class using a spelling preference ('sharps' | 'flats' | 'both').
export function formatPcWithPref(pc, pref) {
  const natural = pcName(pc);
  const flat = FLAT_EQUIV[natural];
  if (!flat) return natural;
  if (pref === 'sharps') return natural;
  if (pref === 'flats') return flat;
  return `${natural} / ${flat}`;
}
// Fixed-Do solfège spellings (Do always = C). Mirrors the letter names above.
export const SOLFEGE_SHARP = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
export const SOLFEGE_FLAT_EQUIV = { 'Do#':'Re♭', 'Re#':'Mi♭', 'Fa#':'Sol♭', 'Sol#':'La♭', 'La#':'Si♭' };
// Format a pitch class in letters or fixed-Do solfège, honouring the
// accidental preference.
export function formatNoteName(pc, pref = 'both', notation = 'letters') {
  if (notation !== 'solfege') return formatPcWithPref(pc, pref);
  const natural = SOLFEGE_SHARP[mod12(pc)];
  const flat = SOLFEGE_FLAT_EQUIV[natural];
  if (!flat) return natural;
  if (pref === 'sharps') return natural;
  if (pref === 'flats') return flat;
  return `${natural} / ${flat}`;
}
export function scaleNotesFromPc(rootPc, intervals) {
  return intervals.map(i => NOTES[mod12(rootPc + i)]);
}
// For a tuning, work out the "octave twin" shape between every pair of strings
// that are 2 apart: if you're on fret F of the lower string, fretShift tells you
// how many frets higher (same direction) the exact same note lives 2 strings up.
// fretShift = 12 - (semitone gap between the two strings), since the octave is
// always exactly 12 semitones away.
export function octaveShiftPairs(tuning) {
  const strings = tuning.strings;
  const pairs = [];
  for (let i = 0; i + 2 < strings.length; i++) {
    const gap = strings[i + 2].midi - strings[i].midi;
    pairs.push({
      lowString: strings[i].name,
      highString: strings[i + 2].name,
      gapSemis: gap,
      fretShift: 12 - gap
    });
  }
  return pairs;
}
export function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
export function describeArc(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const p1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, startAngle);
  const p4 = polarToCartesian(cx, cy, rInner, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    'M', p1.x, p1.y,
    'A', rOuter, rOuter, 0, largeArc, 0, p2.x, p2.y,
    'L', p3.x, p3.y,
    'A', rInner, rInner, 0, largeArc, 1, p4.x, p4.y,
    'Z'
  ].join(' ');
}

// ---- Chord shape definitions ----
// Each shape: {
//   name: string,
//   description: string,
//   frets: [6 numbers], // -1 = muted, 0 = open, N = fret N
//   fingers: [6 numbers or nulls], // 1-4 (or null for open/mute)
//   barres: [{ fret: N, fromString: 0, toString: 5 }] // optional
// }
// Strings are ordered low → high (index 0 = lowest string)
// In standard tuning this is E A D G B E. In other tunings, note the descriptions
// still work finger-wise but the note names change — we label them by shape family.

export const CHORD_SHAPES = {
  power: [
    {
      name: 'Power chord (E-shape)',
      description: 'Root + 5th + octave. Two fingers, or one-finger barre in drop tunings.',
      frets:   [0, 2, 2, -1, -1, -1],
      fingers: [null, 1, 3, null, null, null],
      barres: []
    },
    {
      name: 'Power chord (A-shape)',
      description: 'Root + 5th. Higher-string version.',
      frets:   [-1, 0, 2, 2, -1, -1],
      fingers: [null, null, 1, 3, null, null],
      barres: []
    },
    {
      name: 'Drop-tuned power (1 finger)',
      description: 'In Drop C/D/etc — low two strings at the same fret make a power chord with one finger.',
      frets:   [0, 0, -1, -1, -1, -1],
      fingers: [1, 1, null, null, null, null],
      barres: []
    }
  ],
  barre: [
    {
      name: 'E-shape major',
      description: 'Classic barre. Root on lowest string.',
      frets:   [0, 2, 2, 1, 0, 0],
      fingers: [1, 3, 4, 2, 1, 1],
      barres: [{ fret: 0, fromString: 0, toString: 5 }]
    },
    {
      name: 'E-shape minor',
      description: 'Same shape with the 3rd flattened.',
      frets:   [0, 2, 2, 0, 0, 0],
      fingers: [1, 3, 4, 1, 1, 1],
      barres: [{ fret: 0, fromString: 0, toString: 5 }]
    },
    {
      name: 'A-shape major',
      description: 'Root on the A string. 5-string barre.',
      frets:   [-1, 0, 2, 2, 2, 0],
      fingers: [null, 1, 2, 3, 4, 1],
      barres: [{ fret: 0, fromString: 1, toString: 5 }]
    },
    {
      name: 'A-shape minor',
      description: 'Minor with the 3rd flattened.',
      frets:   [-1, 0, 2, 2, 1, 0],
      fingers: [null, 1, 2, 3, 1, 1],
      barres: [{ fret: 0, fromString: 1, toString: 5 }]
    }
  ],
  open: [
    {
      name: 'Em (open)',
      description: 'E minor — one of the first chords.',
      frets:   [0, 2, 2, 0, 0, 0],
      fingers: [null, 2, 3, null, null, null],
      barres: []
    },
    {
      name: 'Am (open)',
      description: 'A minor shape. In Drop C, this becomes A minor at a lower octave.',
      frets:   [-1, 0, 2, 2, 1, 0],
      fingers: [null, null, 2, 3, 1, null],
      barres: []
    },
    {
      name: 'E5 (open)',
      description: 'Low E + B + high E. Massive open power chord.',
      frets:   [0, 2, 2, 0, 0, 0],
      fingers: [null, 1, 2, null, null, null],
      barres: []
    }
  ]
};