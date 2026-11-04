"""Golden tests for the Interval Lab engine.

Run:  python3 test_engine.py
No dependencies — plain asserts, exits non-zero on failure.
"""

from engine import (
    derive_key_by_fifths, derive_scale_by_tetrachords, derive_chord_from_tetrachords,
    derive_scale_from_chord, key_data, scale_data, chord_data, tetrachord_data,
    fretboard_positions,
    SHARPS, FLAT_EQ, TETRACHORDS, TETRACHORD_SCALES, CHORDS, CHORD_ALIASES,
    TUNINGS, MAJOR_SCALE_SEMIS, NATURAL_MINOR_SEMIS, FIFTHS_ORDER,
    mod12, note, parse_note, parse_key, semis_from_steps,
    scale_semis_from_tetrachords, steps_of_semis, step_letters, key_scale_semis,
)

PASS = 0


def check(name, condition):
    global PASS
    assert condition, f'FAIL: {name}'
    PASS += 1


# primitives
check('mod12 wraps', mod12(13) == 1 and mod12(-1) == 11)
check('note names', note(0) == 'C' and note(11) == 'B')
check('note flats', note(1, flats=True) == 'Db' and note(6, flats=True) == 'Gb')
check('parse sharps', parse_note('C#') == 1 and parse_note('Bb') == 10)
check('parse keys', parse_key('C') == (0, 'major') and parse_key('Am') == (9, 'minor'))
check('parse key long minor', parse_key('a minor') == (9, 'minor'))

# tetrachords
check('major tetrachord', TETRACHORDS['major']['semis'] == (0, 2, 4, 5))
check('minor tetrachord', TETRACHORDS['minor']['semis'] == (0, 2, 3, 5))
check('phrygian tetrachord', TETRACHORDS['phrygian']['semis'] == (0, 1, 3, 5))
check('harmonic tetrachord', TETRACHORDS['harmonic']['semis'] == (0, 1, 4, 5))
check('all true tetrachords span P4', all(TETRACHORDS[k]['semis'][-1] == 5 for k in ('major', 'minor', 'phrygian', 'harmonic')))

# scales from tetrachords
check('major scale semis', scale_semis_from_tetrachords(TETRACHORD_SCALES[0]) == [0, 2, 4, 5, 7, 9, 11, 12])
check('natural minor semis', scale_semis_from_tetrachords(TETRACHORD_SCALES[1]) == [0, 2, 3, 5, 7, 8, 10, 12])
check('lydian uses half-step gap', TETRACHORD_SCALES[5][3] == 1)
check('diminished closes with W', TETRACHORD_SCALES[7][4] == 2)
check('diminished scale', scale_semis_from_tetrachords(TETRACHORD_SCALES[7]) == [0, 1, 3, 4, 6, 7, 9, 10, 12])

# steps
check('major steps', steps_of_semis([0, 2, 4, 5, 7, 9, 11, 12]) == [2, 2, 1, 2, 2, 2, 1])
check('step letters', step_letters([2, 2, 1, 2, 2, 2, 1]) == 'W W H W W W H')
check('walk steps', semis_from_steps([2, 2, 1, 2, 2, 2, 1]) == [0, 2, 4, 5, 7, 9, 11, 12])

# key scales
check('C major key', key_scale_semis(0, 'major') == list(MAJOR_SCALE_SEMIS))
check('A minor key', key_scale_semis(9, 'minor') == list(NATURAL_MINOR_SEMIS))

# fifths chain
check('fifths order', FIFTHS_ORDER == (0, 7, 2, 9, 4, 11, 6))
check('C fifths', [note(0 + s) for s in FIFTHS_ORDER] == ['C', 'G', 'D', 'A', 'E', 'B', 'F#'])

# chords
check('maj7 intervals', CHORDS['maj7'] == (0, 4, 7, 11))
check('m7 intervals', CHORDS['min7'] == (0, 3, 7, 10))
check('chord aliases', CHORD_ALIASES['M7'] == 'maj7' and CHORD_ALIASES['o7'] == 'dim7')

# scale recipes map to their 7th chord
expected = {'Major (Ionian)': 'maj7', 'Natural minor (Aeolian)': 'm7', 'Dorian': 'm7',
            'Phrygian': 'm7', 'Mixolydian': '7', 'Lydian': 'maj7',
            'Harmonic minor': 'm(maj7)', 'Diminished (whole-half)': 'dim7'}
check('recipe chords', all(row[5] == expected[row[0]] for row in TETRACHORD_SCALES))

# tunings
check('standard tuning', TUNINGS['standard'][1] == [40, 45, 50, 55, 59, 64])
check('drop D retunes low string', TUNINGS['dropd'][1][0] == 38)

# concept + derivation functions
check('derive fifths C', derive_key_by_fifths(0) == [0, 7, 2, 9, 4, 11, 6])
check('derive fifths Am via relative C', derive_key_by_fifths(9, 'minor') == [0, 7, 2, 9, 4, 11, 6])
check('derive major from tetrachords', derive_scale_by_tetrachords('major', 'major', 2) == [0, 2, 4, 5, 7, 9, 11, 12])
check('derive diminished from tetrachords', derive_scale_by_tetrachords('diminished', 'diminished', 2, 2) == [0, 1, 3, 4, 6, 7, 9, 10, 12])
check('derive chord from scale', derive_chord_from_tetrachords([0, 2, 4, 5, 7, 9, 11, 12]) == [0, 4, 7, 11])
home = derive_scale_from_chord(0, 'maj7')
check('derive scale from chord', home['recipe'][0] == 'Major (Ionian)' and home['fill_semis'] == [2, 5, 9, 12])

kd = key_data('C')
check('key_data C notes', kd['notes'] == ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
check('key_data C chords', [c['quality'] for c in kd['chords']] == ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'])
check('key_data C fifths', kd['fifths'] == [0, 7, 2, 9, 4, 11, 6])
kam = key_data('Am')
check('key_data Am mode', kam['mode'] == 'minor' and kam['notes'] == ['A', 'B', 'C', 'D', 'E', 'F', 'G'])

sd = scale_data('C', 'dorian')
check('scale_data dorian', sd['chord_type'] == 'm7' and sd['steps'] == [2, 1, 2, 2, 2, 1, 2])
check('scale_data chord notes', sd['chord_notes'] == ['C', 'D#', 'G', 'A#'])

cd = chord_data('C', 'maj7')
check('chord_data maj7', cd['notes'] == ['C', 'E', 'G', 'B'] and cd['home'] is not None)
check('chord_data triad no home', chord_data('C', 'dim')['home'] is None)

td = tetrachord_data('C', 'major')
check('tetrachord_data', td['notes'] == ['C', 'D', 'E', 'F'] and len(td['builds']) == 3)

cells = fretboard_positions('standard')
check('fretboard cells', len(cells) == 78 and cells[0]['name'] == 'E4' and cells[0]['fret'] == 0)
check('fretboard pc', cells[0]['pc'] == 4)

print(f'All {PASS} engine tests passed.')
