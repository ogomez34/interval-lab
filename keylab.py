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

from engine import (
    SHARPS, FLAT_EQ, TETRACHORDS, TETRACHORD_SCALES, CHORDS, CHORD_ALIASES,
    TUNINGS, MAJOR_SCALE_SEMIS, NATURAL_MINOR_SEMIS, FIFTHS_ORDER,
    mod12, note, parse_note, parse_key, semis_from_steps,
    scale_semis_from_tetrachords, steps_of_semis, step_letters, key_scale_semis,
    key_data, scale_data, chord_data, tetrachord_data,
)
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
    td = tetrachord_data(root_text, tetra_key)
    root = td['root']
    t = TETRACHORDS[tetra_key]
    semis = td['semis']
    notes = td['notes']
    top = semis[-1]

    out = [f"TETRACHORD — {td['name']} from {note(root)}", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append(f"Steps : {td['steps']}   (frets {' – '.join(str(s) for s in semis)})")
    out.append(f"Span  : {td['span']}. {td['feel']}.")

    # one-string ladder
    out.append('')
    out.append('LADDER (one string, frets from root):')
    out.append('    fret: ' + '  '.join(f'{s:>2}' for s in semis))
    out.append('    note: ' + '  '.join(f'{n:>2}' for n in notes))

    # every string-pair box: 1-2-3 on the low string, the top note on the next
    label_t, midis, names = TUNINGS[tuning_key]
    out.append('')
    out.append('ALL STRING-PAIR BOXES (1 2 3 on the low string, top on the next):')
    for si in range(len(midis) - 1):
        gap = midis[si + 1] - midis[si]
        top_on_next = top - gap
        if top_on_next < 0:
            continue
        raw = [0, semis[1], semis[2], top_on_next]
        shift = -min(raw)
        frets = [x + shift for x in raw]
        top_note = note(root + top)
        top_label = 'same fret' if top_on_next == 0 else f'+{top_on_next}'
        out.append(
            f"  {names[si]:>3}→{names[si + 1]:<3} : "
            f"low {frets[0]} {frets[1]} {frets[2]} {frets[3]}"
            f"   ·   top {top_note} on {names[si + 1]} at {top_label}"
        )

    # the movable two-box scale pattern (this tetrachord as the lower half)
    out.append('')
    out.append('TWO-BOX SCALE PATTERN (the memorisation shortcut):')
    out.append('  Learn ONE box. To build a scale, play the same box again +W frets up.')
    gap_low = midis[1] - midis[0]
    for name, lower, upper, gap, close, chord in TETRACHORD_SCALES:
        if lower != tetra_key:
            continue
        gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
        box2_same = [s + top + gap for s in semis]
        box2_next = [s + top + gap - gap_low for s in semis]
        close_label = f' + {step_letters([close])} close' if close else ''
        out.append(f"  {name:<28} : {TETRACHORDS[tetra_key]['name']} + {gap_label} + {TETRACHORDS[upper]['name']}{close_label}")
        out.append(f"      box 1 (lower): {' '.join(str(s) for s in semis)}   — start on any fret")
        out.append(f"      box 2 (upper): same shape at +{top + gap} frets  →  {' '.join(str(s) for s in box2_same)}")
        if min(box2_next) >= 0:
            out.append(f"      on the next string ({names[0]}→{names[1]}): upper box shifts by -{gap_low}  →  {' '.join(str(s) for s in box2_next)}")

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
    try:
        s = scale_data(root_text, scale_name)
    except ValueError as exc:
        return str(exc)
    root = s['root']
    name, lower, upper, gap, close, chord = s['recipe']
    pcs, notes, steps = s['pcs'], s['notes'], s['steps']
    gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))

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
    try:
        c = chord_data(root_text, chord_text)
    except ValueError as exc:
        return str(exc)
    root, ctype = c['root'], c['type']
    intervals, notes = c['intervals'], c['notes']

    out = [f"CHORD — {note(root)}{ctype}  (intervals {' – '.join(str(s) for s in intervals)})", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append('')

    # which tetrachord scale does it live in?
    if c['home'] is not None:
        name, lower, upper, gap, close, chord = c['home']['recipe']
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
    k = key_data(key_text)
    root, mode = k['root'], k['mode']
    pcs, notes = k['pcs'], k['notes']

    out = [f"KEY — {note(root)} {mode}", '=' * 52]
    out.append(f"Notes : {'  '.join(notes)}")
    out.append('')

    # 1) tetrachords first — the centre
    name, lower, upper, gap, close, chord = k['recipe']
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
    out.append('2) STEP RECIPE (walk it)')
    out.append(f"   {step_letters(k['steps'])}   — start on {note(root)} and walk it; you just derived the scale.")
    out.append('')

    # 3) stack fifths (minor keys derive from their relative major)
    fifths = [note(p) for p in k['fifths']]
    fifth_root = root + 3 if mode == 'minor' else root
    out.append('3) STACK FIFTHS (the circle)')
    out.append(f"   {' '.join(fifths)}" + (f"   (from relative major {note(fifth_root)})" if mode == 'minor' else ''))
    out.append('')

    # 4) chords of the key
    out.append('4) CHORDS OF THE KEY (1st + 3rd of each half)')
    for c in k['chords']:
        out.append(f"   {c['degree']:<2} {note(c['pc']):<3} {c['quality']}")
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
    png_path = None
    args = list(argv)
    if '--tuning' in args:
        i = args.index('--tuning')
        key = args[i + 1] if i + 1 < len(args) else 'standard'
        tuning_key = key if key in TUNINGS else 'standard'
        del args[i:i + 2]
    if '--png' in args:
        i = args.index('--png')
        png_path = args[i + 1] if i + 1 < len(args) else 'keylab.png'
        del args[i:i + 2]
    cmd = args[0].lower() if args else ''
    try:
        if png_path and cmd == 'key' and len(args) > 1:
            root, mode = parse_key(args[1])
            out = render_key_png(root, mode, tuning_key, png_path)
            print(f'Saved {out}')
        elif png_path and cmd == 'tetra' and len(args) > 2:
            out = render_tetra_png(parse_note(args[1]), args[2].lower(), tuning_key, png_path)
            print(f'Saved {out}')
        elif cmd == 'key' and len(args) > 1:
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


# ---------------------------------------------------------------- png

try:
    from PIL import Image, ImageDraw, ImageFont
    _FONT_PATH = '/System/Library/Fonts/Helvetica.ttc'
    def _font(size, bold=False):
        return ImageFont.truetype(_FONT_PATH, size)
    HAS_PIL = True
except Exception:  # noqa: BLE001
    HAS_PIL = False

COL = dict(bg='#FAFAF7', panel='#FFFFFF', ink='#1F2937', muted='#6B7280',
           root='#E05555', scale='#4E8A4E', accent='#E8B44A', line='#D1D5DB',
           dark='#1F2937', white='#FFFFFF')


def _chip(d, x, y, text, sub=None, fill=None, w=108, h=60, text_color=None, sub_color=None, radius=12):
    fill = fill or COL['panel']
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill, outline=COL['line'], width=1)
    size = 26 if sub is None else 22
    d.text((x + w / 2, y + h / 2 - (9 if sub else 0)), text, font=_font(size, bold=True),
           fill=text_color or COL['ink'], anchor='mm')
    if sub:
        d.text((x + w / 2, y + h / 2 + 15), sub, font=_font(14, bold=True), fill=sub_color or COL['muted'], anchor='mm')


def _heading(d, x, y, text, color=COL['ink']):
    d.text((x, y), text, font=_font(30, bold=True), fill=color)
    return y + 46


def _center_chips(d, W, y, items, chip_w=108, gap=10, sub=True):
    """items = list of (text, sub, fill, text_color[, sub_color]). Returns new y."""
    total = len(items) * chip_w + (len(items) - 1) * gap
    x = (W - total) / 2
    for item in items:
        text, subtext, fill, tc = item[0], item[1], item[2], item[3]
        sc = item[4] if len(item) > 4 else None
        _chip(d, x, y, text, subtext if sub else None, fill=fill, w=chip_w, text_color=tc, sub_color=sc)
        x += chip_w + gap
    return y + 60 + 24


def _notes_chips(d, W, y, pcs, root_pc):
    items = []
    for pc in pcs:
        if pc == root_pc:
            items.append((note(pc), '1', COL['root'], COL['white'], COL['white']))
        else:
            items.append((note(pc), str((pc - root_pc) % 12 and [0,2,4,5,7,9,11].index((pc - root_pc) % 12) + 1 or 1), COL['panel'], COL['ink']))
    return _center_chips(d, W, y, items)


def _draw_fretboard(d, x, y, W, pcs, root_pc, tuning_key):
    label_t, midis, names = TUNINGS[tuning_key]
    cols = 13
    cell_w = (W - 150) / cols
    row_h = 52
    header_h = 36
    d.text((x, y + 4), 'FRETBOARD — ' + label_t, font=_font(24, bold=True), fill=COL['ink'])
    top = y + 50
    for f in range(cols):
        d.text((x + 150 + f * cell_w + cell_w / 2, top + header_h / 2), str(f), font=_font(15), fill=COL['muted'], anchor='mm')
    for r, si in enumerate(range(len(midis) - 1, -1, -1)):
        base = midis[si]
        row_y = top + header_h + r * row_h
        d.text((x + 60, row_y + row_h / 2), names[si], font=_font(20, bold=True), fill=COL['ink'], anchor='rm')
        for f in range(cols):
            cx = x + 150 + f * cell_w + cell_w / 2
            cy = row_y + row_h / 2
            d.line([(x + 150 + f * cell_w, row_y), (x + 150 + f * cell_w, row_y + row_h)], fill=COL['line'], width=1)
            pc = mod12(base + f)
            if pc in pcs:
                fill = COL['root'] if pc == root_pc else COL['scale']
                d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=fill, outline=COL['white'], width=2)
                d.text((cx, cy), note(pc), font=_font(13, bold=True), fill=COL['white'], anchor='mm')
            else:
                d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=COL['line'])
        d.line([(x + 150, row_y + row_h), (x + 150 + cols * cell_w, row_y + row_h)], fill=COL['line'], width=1)
    bottom = top + header_h + 6 * row_h
    return bottom + 30


def _save(d, img, path):
    img = img.crop((0, 0, img.width, max(1, d._last_y + 60)))
    img.save(path)
    return path


def render_key_png(root, mode, tuning_key, path):
    if not HAS_PIL:
        raise SystemExit('Pillow is required for PNG output: pip install pillow')
    W = 1420
    img = Image.new('RGB', (W, 2200), COL['bg'])
    d = ImageDraw.Draw(img)

    # title
    d.rectangle([0, 0, W, 110], fill=COL['dark'])
    d.text((W / 2, 55), f"KEY — {note(root)} {mode}", font=_font(46, bold=True), fill=COL['white'], anchor='mm')

    semis = key_scale_semis(root, mode)
    pcs = [mod12(root + s) for s in semis]
    y = 150

    # notes
    y = _heading(d, 60, y, 'THE KEY — 7 NOTES')
    y = _notes_chips(d, W, y, pcs, root)
    y += 26

    # 1) tetrachords
    y = _heading(d, 60, y, '1 · TETRACHORDS (the essence)')
    row = TETRACHORD_SCALES[0] if mode == 'major' else TETRACHORD_SCALES[1]
    name, lower, upper, gap, close, chord = row
    L, U = TETRACHORDS[lower], TETRACHORDS[upper]
    top_l = L['semis'][-1]
    start = top_l + gap
    gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
    lower_notes = [note(root + s) for s in L['semis']]
    upper_notes = [note(root + start + s) for s in U['semis']]
    # lower row
    items = [(n, str(i + 1), COL['root'] if i == 0 else COL['panel'], COL['white'] if i == 0 else COL['ink'], COL['white'] if i == 0 else None)
             for i, n in enumerate(lower_notes)]
    y = _center_chips(d, W, y, items)
    # gap badge
    gx = W / 2 - 40
    _chip(d, gx, y, '+ ' + gap_label, fill=COL['accent'], w=80, h=44, text_color=COL['ink'])
    y += 44 + 14
    # upper row
    items = [(n, str(i + 5), COL['panel'], COL['ink']) for i, n in enumerate(upper_notes)]
    y = _center_chips(d, W, y, items)
    d.text((W / 2, y), f"{' '.join(lower_notes)}  |  {gap_label}  |  {' '.join(upper_notes)}  =  {note(root)} {mode}",
           font=_font(22), fill=COL['muted'], anchor='mm')
    y += 60

    # 2) step recipe
    y = _heading(d, 60, y, '2 · STEP RECIPE — WALK IT')
    steps = steps_of_semis(semis + [12])
    items = [(step_letters([s]), None, COL['panel'] if s != 1 else COL['accent'], COL['ink']) for s in steps]
    y = _center_chips(d, W, y, items, chip_w=80, sub=False)
    d.text((W / 2, y), f"Start on {note(root)} and walk these steps — you just derived the scale.", font=_font(22), fill=COL['muted'], anchor='mm')
    y += 60

    # 3) fifths
    y = _heading(d, 60, y, '3 · STACK FIFTHS — THE CIRCLE (sharps in order)')
    fifth_root = root + 3 if mode == 'minor' else root
    fifths = [note(fifth_root + s) for s in FIFTHS_ORDER]
    items = [(n, str(i + 1), COL['root'] if i == 0 else COL['panel'], COL['white'] if i == 0 else COL['ink'], COL['white'] if i == 0 else None)
             for i, n in enumerate(fifths)]
    y = _center_chips(d, W, y, items)
    y += 30

    # 4) chords
    y = _heading(d, 60, y, '4 · CHORDS OF THE KEY — the 7th chord on each degree')
    qualities = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'] if mode == 'major' else ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7']
    items = [(note(root + s), q, COL['root'] if i == 0 else COL['panel'], COL['white'] if i == 0 else COL['ink'], COL['white'] if i == 0 else None)
             for i, (s, q) in enumerate(zip(semis, qualities))]
    y = _center_chips(d, W, y, items, chip_w=130, gap=8)
    y += 20

    # 5) fretboard
    y = _draw_fretboard(d, 60, y, W - 120, set(pcs), root, tuning_key)
    d._last_y = y

    _save(d, img, path)
    return path


def render_tetra_png(root, tetra_key, tuning_key, path):
    if not HAS_PIL:
        raise SystemExit('Pillow is required for PNG output: pip install pillow')
    W = 1420
    img = Image.new('RGB', (W, 2000), COL['bg'])
    d = ImageDraw.Draw(img)
    t = TETRACHORDS[tetra_key]
    semis = t['semis']
    notes = [note(root + s) for s in semis]

    d.rectangle([0, 0, W, 110], fill=COL['dark'])
    d.text((W / 2, 55), f"TETRACHORD — {t['name']} from {note(root)}", font=_font(46, bold=True), fill=COL['white'], anchor='mm')
    y = 150

    y = _heading(d, 60, y, f"{t['steps']}   ·   frets {' – '.join(str(s) for s in semis)}   ·   {t['span']}")
    items = [(n, str(i + 1), COL['root'] if i == 0 else COL['panel'], COL['white'] if i == 0 else COL['ink'], COL['white'] if i == 0 else None)
             for i, n in enumerate(notes)]
    y = _center_chips(d, W, y, items)
    y += 26

    # ladder
    y = _heading(d, 60, y, 'THE LADDER — ONE STRING')
    y = _center_chips(d, W, y, [(str(s), n, COL['root'] if i == 0 else COL['panel'], COL['white'] if i == 0 else COL['ink'], COL['white'] if i == 0 else None)
                                for i, (s, n) in enumerate(zip(semis, notes))])
    y += 20

    # string-pair boxes
    y = _heading(d, 60, y, 'THE BOX ON EVERY STRING PAIR')
    label_t, midis, names = TUNINGS[tuning_key]
    top = semis[-1]
    for si in range(len(midis) - 1):
        gap = midis[si + 1] - midis[si]
        top_on_next = top - gap
        if top_on_next < 0:
            continue
        raw = [0, semis[1], semis[2], top_on_next]
        shift = -min(raw)
        frets = [x + shift for x in raw]
        d.text((80, y), f"{names[si]} → {names[si+1]}", font=_font(24, bold=True), fill=COL['ink'])
        d.text((330, y), f"low: {'  '.join(str(f) for f in frets)}    ·    top {note(root + top)} on {names[si+1]} at {'same fret' if top_on_next == 0 else '+' + str(top_on_next)}",
               font=_font(22), fill=COL['muted'])
        y += 44
    y += 20

    # two-box scale pattern
    y = _heading(d, 60, y, 'THE TWO-BOX SCALE PATTERN — LEARN ONE BOX')
    gap_low = midis[1] - midis[0]
    for name, lower, upper, gap, close, chord in TETRACHORD_SCALES:
        if lower != tetra_key:
            continue
        gap_label = {1: 'H', 2: 'W'}.get(gap, str(gap))
        box2 = [s + top + gap for s in semis]
        d.text((80, y), f"{name}:  {t['name']} + {gap_label} + {TETRACHORDS[upper]['name']}",
               font=_font(26, bold=True), fill=COL['ink'])
        y += 40
        d.text((110, y), f"box 1: {' '.join(str(s) for s in semis)}      box 2 (same shape, +{top + gap} frets): {' '.join(str(s) for s in box2)}",
               font=_font(22), fill=COL['muted'])
        y += 46
    y += 30

    d._last_y = y
    _save(d, img, path)
    return path


if __name__ == '__main__':
    main(sys.argv[1:])
