#!/usr/bin/env python3
"""KeyLab — derive keys, scales and chords from tetrachords (terminal).

The same knowledge as the Interval Lab web app, distilled into a Python
program. Tetrachords sit at the centre: everything is derived from two
little ladders and the gap between them.

Usage:
    python3 keylab.py key C          full derivation sheet for a key
    python3 keylab.py tetra C major  one tetrachord: ladder, box, scales it builds
    python3 keylab.py scale C minor  a scale derived from its tetrachord recipe
    python3 keylab.py chord C maj7   a chord: tones, tetrachord home, fretboard
    python3 keylab.py                interactive prompt
"""

import sys

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

# ---------------------------------------------------------------- fretboard

def fretboard(pcs=None, root_pc=0, tuning_key='standard', label='notes'):
    """ASCII fretboard. pcs = set of pitch classes to mark; root marked specially."""
    label_t, midis, names = TUNINGS[tuning_key]
    pcs = pcs or set()
    semis = [0, 2, 4, 5, 7, 9, 11]
    header = '      ' + ' '.join(f'{f:>3}' for f in range(13))
    lines = [f'{label_t} — {label} ({names[0]}…{names[-1]})', header]
    # high string first
    for si in range(len(midis) - 1, -1, -1):
        base = midis[si]
        row = f'{names[si]:>4} |'
        for f in range(13):
            pc = mod12(base + f)
            if pc in pcs:
                if label == 'intervals':
                    d = (pc - root_pc) % 12
                    if d == 0:
                        cell = '[1]'
                    else:
                        degree = semis.index(d) + 1 if d in semis else None
                        cell = f' {degree:>2} ' if degree is not None else '  · '
                else:
                    cell = f'[{note(pc)}]' if pc == root_pc else f' {note(pc):>2}·'
                row += cell
            else:
                row += '  · '
        lines.append(row)
    return '\n'.join(lines)

# ---------------------------------------------------------------- sheets

def sheet_tetra(root_text, tetra_key, tuning_key='standard'):
    root = parse_note(root_text)
    t = TETRACHORDS[tetra_key]
    semis = t['semis']
    notes = [note(root + s) for s in semis]
    top = semis[-1]

    out = [f"TETRACHORD — {t['name']} from {note(root)}", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append(f"Steps : {t['steps']}   (frets {' – '.join(str(s) for s in semis)})")
    out.append(f"Span  : {t['span']}. {t['feel']}.")

    # one-string ladder
    out.append('')
    out.append('LADDER (one string, frets from root):')
    out.append('    fret: ' + '  '.join(f'{s:>2}' for s in semis))
    out.append('    note: ' + '  '.join(f'{n:>2}' for n in notes))

    # box on the two lowest strings
    label_t, midis, names = TUNINGS[tuning_key]
    gap_low = midis[1] - midis[0]
    top_on_next = top - gap_low
    out.append('')
    out.append(f'BOX (two lowest strings, {names[0]} and {names[1]}):')
    out.append(f'  {names[0]}: ' + '  '.join(f'{s:>2}' if i == 0 else f'{s:>2}' for i, s in enumerate(semis)) + '   ← 1 2 3')
    if top_on_next >= 0:
        out.append(f'  {names[1]}: ' + '  ' * (len(semis) - 1) + f'{top_on_next:>2}' + '   ← the 4th note (top)')
        out.append(f'  Top note = {note(root + top)} on {names[1]} at fret {top_on_next} ({("same fret" if top_on_next == 0 else "+" + str(top_on_next))}).')
    else:
        out.append(f'  (top note stays on the starting string in this tuning)')
    out.append('  Slide the whole box anywhere — the shape never changes.')

    # scales it builds
    out.append('')
    out.append('SCALES IT BUILDS (lower + gap + upper = scale):')
    for name, lower, upper, gap, close, chord in TETRACHORD_SCALES:
        if lower == tetra_key or upper == tetra_key:
            side = 'lower' if lower == tetra_key else 'upper'
            gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
            close_label = f' + {step_letters([close])} close' if close else ''
            out.append(f"  {name:<28} as {side}  →  {TETRACHORDS[lower]['name']} + {gap_label}{close_label} + {TETRACHORDS[upper]['name']}")

    return '\n'.join(out)

def sheet_scale(root_text, scale_name, tuning_key='standard'):
    root = parse_note(root_text)
    row = None
    for r in TETRACHORD_SCALES:
        if r[0].lower().startswith(scale_name.lower()):
            row = r
            break
    if row is None:
        return f"Unknown scale '{scale_name}'. Known: " + ', '.join(r[0] for r in TETRACHORD_SCALES)

    name, lower, upper, gap, close, chord = row
    semis = scale_semis_from_tetrachords(row)
    pcs = [mod12(root + s) for s in semis if s < 12]
    notes = [note(root + s) for s in semis]
    steps = steps_of_semis(semis)
    gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
    close_label = f' + {step_letters([close])} close' if close else ''

    out = [f"SCALE — {name} in {note(root)}", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append(f"Steps : {step_letters(steps)}")
    out.append('')
    out.append('TETRACHORD RECIPE (the centre):')
    L, U = TETRACHORDS[lower], TETRACHORDS[upper]
    top_l = L['semis'][-1]
    start = top_l + gap
    lower_notes = [note(root + s) for s in L['semis']]
    upper_notes = [note(root + start + s) for s in U['semis']]
    out.append(f"  {L['name']:<10} {' '.join(lower_notes):<16} ({L['steps']})")
    out.append(f"  {'+ ' + gap_label:<10} {'(gap)':<16}")
    out.append(f"  {U['name']:<10} {' '.join(upper_notes):<16} ({U['steps']})")
    out.append('')
    chord_tones = [lower_notes[0], lower_notes[2], upper_notes[0], upper_notes[2]]
    out.append(f"CHORD INSIDE (1st + 3rd of each half): {note(root)}{chord}  =  {' · '.join(chord_tones)}")
    out.append('')
    out.append(fretboard(set(pcs), root, tuning_key, 'notes'))
    return '\n'.join(out)

def sheet_chord(root_text, chord_text, tuning_key='standard'):
    root = parse_note(root_text)
    ctype = CHORD_ALIASES.get(chord_text.strip(), chord_text.strip().lower())
    if ctype not in CHORDS:
        return f"Unknown chord '{chord_text}'. Known: " + ', '.join(sorted(set(CHORDS)))
    intervals = CHORDS[ctype]
    notes = [note(root + s) for s in intervals]

    out = [f"CHORD — {note(root)}{ctype}  (intervals {' – '.join(str(s) for s in intervals)})", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append('')

    # which tetrachord scale does it live in?
    found = None
    for r in TETRACHORD_SCALES:
        if r[5] == ctype:
            found = r
            break
    if found:
        name, lower, upper, gap, close, chord = found
        L, U = TETRACHORDS[lower], TETRACHORDS[upper]
        top_l = L['semis'][-1]
        start = top_l + gap
        # find a root where this chord is the I chord
        semis = scale_semis_from_tetrachords(found)
        gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
        out.append('IT LIVES IN (derive it backwards):')
        out.append(f"  {name}:  {TETRACHORDS[lower]['name']} + {gap_label} + {TETRACHORDS[upper]['name']}")
        if len(notes) >= 4:
            out.append(f"  chord tones = 1st + 3rd of each half →  {notes[0]} · {notes[1]}  +  {notes[2]} · {notes[3]}")
        else:
            out.append(f"  chord tones = {' · '.join(notes)}")
    else:
        out.append('(not a standard tetrachord-scale 7th — try maj7, m7, 7, m7b5, dim7, m(maj7))')

    out.append('')
    out.append(fretboard(set(mod12(root + s) for s in intervals), root, tuning_key, 'notes'))
    return '\n'.join(out)

def sheet_key(key_text, tuning_key='standard'):
    root, mode = parse_key(key_text)
    semis = key_scale_semis(root, mode)
    pcs = [mod12(root + s) for s in semis]
    notes = [note(pc) for pc in pcs]

    out = [f"KEY — {note(root)} {mode}", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append('')

    # 1) tetrachords first — the centre
    if mode == 'major':
        row = TETRACHORD_SCALES[0]   # Major (Ionian)
    else:
        row = TETRACHORD_SCALES[1]   # Natural minor
    name, lower, upper, gap, close, chord = row
    L, U = TETRACHORDS[lower], TETRACHORDS[upper]
    top_l = L['semis'][-1]
    start = top_l + gap
    gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
    lower_notes = [note(root + s) for s in L['semis']]
    upper_notes = [note(root + start + s) for s in U['semis']]
    out.append('1) TETRACHORDS (the essence)')
    out.append(f"   Lower: {L['name']:<9} {' '.join(lower_notes):<16} ({L['steps']})")
    out.append(f"   Gap:   {gap_label}")
    out.append(f"   Upper: {U['name']:<9} {' '.join(upper_notes):<16} ({U['steps']})")
    out.append(f"   {' '.join(lower_notes)} | {gap_label} | {' '.join(upper_notes)}  =  {note(root)} {mode}")
    out.append('')

    # 2) step recipe
    steps = steps_of_semis(semis + [12])
    out.append('2) STEP RECIPE (walk it)')
    out.append(f"   {step_letters(steps)}   — start on {note(root)} and walk it; you just derived the scale.")
    out.append('')

    # 3) stack fifths (minor keys derive from their relative major)
    fifth_root = root + 3 if mode == 'minor' else root
    fifths = [note(fifth_root + s) for s in FIFTHS_ORDER]
    out.append('3) STACK FIFTHS (the circle)')
    out.append(f"   {' '.join(fifths)}" + (f"   (from relative major {note(fifth_root)})" if mode == 'minor' else ''))
    out.append('')

    # 4) chords of the key
    if mode == 'major':
        qualities = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5']
    else:
        qualities = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7']
    out.append('4) CHORDS OF THE KEY (1st + 3rd of each half)')
    for i, (s, q) in enumerate(zip(semis, qualities), 1):
        out.append(f"   {i:<2} {note(root + s):<3} {q}")
    out.append('')

    # 5) fretboard
    out.append('5) FRETBOARD (notes)')
    out.append(fretboard(set(pcs), root, tuning_key, 'notes'))
    out.append('')
    out.append('   (intervals)')
    out.append(fretboard(set(pcs), root, tuning_key, 'intervals'))
    return '\n'.join(out)

# ---------------------------------------------------------------- repl

def repl(tuning_key='standard'):
    print('KeyLab — derive keys, scales and chords from tetrachords.')
    print('Commands: key C | key Am | tetra C major | scale C dorian | chord C maj7 | tuning dropd | quit')
    while True:
        try:
            raw = input('keylab> ').strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if not raw:
            continue
        parts = raw.split()
        cmd = parts[0].lower()
        try:
            if cmd == 'quit' or cmd == 'exit':
                return
            elif cmd == 'tuning':
                key = parts[1].lower() if len(parts) > 1 else 'standard'
                if key not in TUNINGS:
                    print('Tunings: ' + ', '.join(TUNINGS))
                    continue
                tuning_key = key
                print(f'Tuning → {TUNINGS[tuning_key][0]}')
            elif cmd == 'key' and len(parts) > 1:
                print(sheet_key(parts[1], tuning_key))
            elif cmd == 'tetra' and len(parts) > 2:
                print(sheet_tetra(parts[1], parts[2].lower(), tuning_key))
            elif cmd == 'scale' and len(parts) > 2:
                print(sheet_scale(parts[1], parts[2], tuning_key))
            elif cmd == 'chord' and len(parts) > 2:
                print(sheet_chord(parts[1], ' '.join(parts[2:]), tuning_key))
            else:
                print('Commands: key C | key Am | tetra C major | scale C dorian | chord C maj7 | tuning dropd | quit')
        except Exception as exc:  # noqa: BLE001
            print(f'Error: {exc}')
        print()

# ---------------------------------------------------------------- main

def main(argv):
    if not argv:
        repl()
        return
    tuning_key = 'standard'
    args = list(argv)
    if '--tuning' in args:
        i = args.index('--tuning')
        key = args[i + 1] if i + 1 < len(args) else 'standard'
        tuning_key = key if key in TUNINGS else 'standard'
        del args[i:i + 2]
    cmd = args[0].lower() if args else ''
    try:
        if cmd == 'key' and len(args) > 1:
            print(sheet_key(args[1], tuning_key))
        elif cmd == 'tetra' and len(args) > 2:
            print(sheet_tetra(args[1], args[2].lower(), tuning_key))
        elif cmd == 'scale' and len(args) > 2:
            print(sheet_scale(args[1], args[2], tuning_key))
        elif cmd == 'chord' and len(args) > 2:
            print(sheet_chord(args[1], ' '.join(args[2:]), tuning_key))
        else:
            print(__doc__)
    except Exception as exc:  # noqa: BLE001
        print(f'Error: {exc}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main(sys.argv[1:])
