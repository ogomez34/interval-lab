"""Interval Lab engine — pure music-theory logic, no UI.

Single source of truth for the web app (music.js mirrors these tables)
and for the keylab CLI / PNG frontends. Every function returns data;
nothing here prints or draws.
"""

# ---------------------------------------------------------------- core data

SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLAT_EQ = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'}

TETRACHORDS = {
    'major':     dict(name='Major',     semis=(0, 2, 4, 5), steps='W W H',  span='a perfect 4th', feel='bright, stable — the bottom half of the major scale'),
    'minor':     dict(name='Minor',     semis=(0, 2, 3, 5), steps='W H W',  span='a perfect 4th', feel='darker, smooth — Dorian and natural minor both use it'),
    'phrygian':  dict(name='Phrygian',  semis=(0, 1, 3, 5), steps='H W W',  span='a perfect 4th', feel='tense, Spanish — the top half of natural minor'),
    'harmonic':  dict(name='Harmonic',  semis=(0, 1, 4, 5), steps='H A2 H', span='a perfect 4th', feel='exotic, Middle-Eastern — top half of harmonic minor'),
    'lydian':    dict(name='Lydian',    semis=(0, 2, 4, 6), steps='W W W',  span='a tritone (not a perfect 4th)', feel='bright, floating — bottom half of Lydian'),
    'diminished': dict(name='Diminished', semis=(0, 1, 3, 4), steps='H W H', span='a major 3rd (not a perfect 4th)', feel='symmetrical, tense — building block of the diminished scale'),
}

# scale = lower tetrachord + gap + upper tetrachord (+ close, if any)
TETRACHORD_SCALES = [
    ('Major (Ionian)',            'major',      'major',      2, 0, 'maj7'),
    ('Natural minor (Aeolian)',   'minor',      'phrygian',   2, 0, 'm7'),
    ('Dorian',                    'minor',      'minor',      2, 0, 'm7'),
    ('Phrygian',                  'phrygian',   'phrygian',   2, 0, 'm7'),
    ('Mixolydian',                'major',      'minor',      2, 0, '7'),
    ('Lydian',                    'lydian',     'major',      1, 0, 'maj7'),
    ('Harmonic minor',            'minor',      'harmonic',   2, 0, 'm(maj7)'),
    ('Diminished (whole-half)',   'diminished', 'diminished', 2, 2, 'dim7'),
]

CHORDS = {
    'maj':   (0, 4, 7),        'min':  (0, 3, 7),
    'dim':   (0, 3, 6),        'aug':  (0, 4, 8),
    'sus2':  (0, 2, 7),        'sus4': (0, 5, 7),
    '5':     (0, 7),
    'maj7':  (0, 4, 7, 11),    'min7': (0, 3, 7, 10),
    '7':     (0, 4, 7, 10),    'm7b5': (0, 3, 6, 10),
    'dim7':  (0, 3, 6, 9),     'm(maj7)': (0, 3, 7, 11),
}

CHORD_ALIASES = {
    'major': 'maj', 'maj': 'maj', 'M': 'maj', '': 'maj',
    'minor': 'min', 'min': 'min', 'm': 'min', '-': 'min',
    'diminished': 'dim', 'dim': 'dim', 'o': 'dim',
    'augmented': 'aug', 'aug': 'aug', '+': 'aug',
    'sus2': 'sus2', 'sus4': 'sus4', '5': '5', 'power': '5',
    'maj7': 'maj7', 'maj7': 'maj7', 'M7': 'maj7', 'Δ': 'maj7',
    'min7': 'min7', 'm7': 'min7', '-7': 'min7',
    '7': '7', 'dom7': '7', 'dominant7': '7',
    'm7b5': 'm7b5', 'halfdim': 'm7b5', 'ø': 'm7b5',
    'dim7': 'dim7', 'o7': 'dim7', '°7': 'dim7',
    'mmaj7': 'm(maj7)', 'm(maj7)': 'm(maj7)', 'mMaj7': 'm(maj7)', 'mΔ': 'm(maj7)',
}

TUNINGS = {
    'standard': ('Standard E', [40, 45, 50, 55, 59, 64], ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
    'dropd':    ('Drop D',     [38, 45, 50, 55, 59, 64], ['D2', 'A2', 'D3', 'G3', 'B3', 'E4']),
    'opend':    ('Open D',     [38, 45, 50, 54, 57, 62], ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4']),
    'openg':    ('Open G',     [38, 43, 50, 55, 59, 62], ['D2', 'G2', 'D3', 'G3', 'B3', 'D4']),
}

MAJOR_SCALE_SEMIS = (0, 2, 4, 5, 7, 9, 11)
NATURAL_MINOR_SEMIS = (0, 2, 3, 5, 7, 8, 10)
FIFTHS_ORDER = (0, 7, 2, 9, 4, 11, 6)  # stack perfect 5ths

# ---------------------------------------------------------------- helpers

def mod12(n):
    return n % 12

def note(pc, flats=False):
    pc = mod12(pc)
    name = SHARPS[pc]
    if flats and name in FLAT_EQ:
        return FLAT_EQ[name]
    return name

def parse_note(text):
    """'C', 'C#', 'Db', 'bb' -> pitch class."""
    text = text.strip()
    if not text:
        raise ValueError('empty note name')
    letter = text[0].upper()
    base = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[letter]
    rest = text[1:].lower()
    for ch in rest:
        if ch == '#' or ch == 's':
            base += 1
        elif ch == 'b' or ch == 'f':
            base -= 1
    return mod12(base)

def parse_key(text):
    """'C' -> (root_pc, 'major'); 'Am' -> (9, 'minor')."""
    text = text.strip()
    if not text:
        raise ValueError('empty key')
    if text[0].islower() or (len(text) > 1 and text[1:] in ('m', 'min', 'minor')):
        # minor: 'am', 'amin', 'a minor'
        if text[1:].lower() in ('m', 'min', 'minor'):
            root = parse_note(text[0])
        else:
            root = parse_note(text[:-1] if text.endswith('m') else text)
        return root, 'minor'
    return parse_note(text), 'major'

def semis_from_steps(steps):
    out = [0]
    for s in steps:
        out.append(out[-1] + s)
    return out

def scale_semis_from_tetrachords(row):
    name, lower, upper, gap, close, chord = row
    L = TETRACHORDS[lower]['semis']
    U = TETRACHORDS[upper]['semis']
    topL = L[-1]
    start = topL + gap
    semis = list(L) + [start + s for s in U]
    if close > 0:
        semis.append(12)
    return semis

def steps_of_semis(semis):
    return [semis[i + 1] - semis[i] for i in range(len(semis) - 1)]

def step_letters(steps):
    return ' '.join({1: 'H', 2: 'W', 3: 'A2'}.get(s, str(s)) for s in steps)

def key_scale_semis(root, mode):
    return list(MAJOR_SCALE_SEMIS if mode == 'major' else NATURAL_MINOR_SEMIS)

