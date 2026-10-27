import { CIRCLE_MAJOR, CIRCLE_MINOR, MAJOR_SCALE, NATURAL_MINOR_SCALE,
  scaleNotesFromPc, noteNameToPc, TUNINGS, octaveShiftPairs, INTERVAL_DETAILS } from '../music.js';
import { playChord, playMidi } from '../audio.js';
import { renderCircleOfFifths as renderCircleInto } from '../circle.js';
import { on } from '../events.js';
import { loadStats, getIntervalAccuracy } from '../storage.js';

export function refLink(anchor, label) {
  return `<a href="#" class="ref-link" data-ref-anchor="${anchor}">${label} →</a>`;
}

export function renderReference() {
  return `
    <p class="muted-intro">The whole system in one place, built on <b>the one idea: “1” is home — every note, scale, chord and key is just steps counted from it.</b> Sections <b>1–4</b> are the fretboard method — that's the core. Sections <b>5–9</b> support your playing. Read top to bottom, or jump with the menu.</p>
    <nav class="ref-toc" aria-label="Reference contents">
      <a href="#ref-numbers">1 · The number map</a>
      <a href="#ref-counting">2 · Counting steps</a>
      <a href="#ref-fret-dots">3 · Fretboard dots</a>
      <a href="#ref-octave-shapes">4 · Octave twins</a>
      <a href="#ref-octaves">5 · Octave numbers</a>
      <a href="#ref-chords">6 · Chords</a>
      <a href="#ref-nashville">7 · Nashville numbers</a>
      <a href="#ref-rhythm">8 · Rhythm</a>
      <a href="#ref-circle">9 · Circle of fifths</a>
      <a href="#ref-heatmap">Your interval heatmap</a>
      <a href="#ref-deeper-topics">Go deeper</a>
    </nav>

    <h2 id="ref-numbers">1 · The number map</h2>
    <p>Western music uses only 7 letter names — <b>A B C D E F G</b> — then they repeat. We give each one a number, because counting is faster than reciting letters.</p>
    <div class="map">
      <div>C<small>1 · Do</small></div>
      <div>D<small>2 · Re</small></div>
      <div>E<small>3 · Mi</small></div>
      <div>F<small>4 · Fa</small></div>
      <div>G<small>5 · Sol</small></div>
      <div>A<small>6 · La</small></div>
      <div>B<small>7 · Si</small></div>
    </div>
    <p>Wrap around: after 7 comes 1 again — after <b>Si</b> comes <b>Do</b> again. Before 1 comes 7.</p>
    <details class="ref-deeper">
      <summary>Why numbers? Why only 7 letters?</summary>
      <div class="ref-deeper-body">
        <p><b>Why numbers?</b> Numbers work in every key. In C major, 1 means C; in G major, 1 means G. The distances between notes stay the same — that's the Nashville way of thinking, and it's the trick that makes the fretboard learnable.</p>
        <p><b>Why only 7 letters?</b> Western music is built from 12 notes in total (the white <i>and</i> black piano keys), but only 7 of them get a plain letter name — the rest are named by adding a sharp (♯) or flat (♭) to a neighbour. This is called the <b>musical alphabet</b>, and it repeats forever: …F G A B C D E F G A…</p>
      </div>
    </details>

    <h2 id="ref-counting">2 · Counting steps (intervals)</h2>
    <p>One fret = one step. The whole fretboard is just the number map repeated over and over, so finding a note is always the same move: start on a note you know and count. From C, back 3 steps lands on A — no reciting, just counting.</p>
    <p>Try humming "Happy Birthday" — the first two notes are the same little gap every time. That gap is called an <b>interval</b>, and it's measured in <b>semitones</b> (one fret = one semitone).</p>
    <details class="ref-deeper">
      <summary>The full interval table</summary>
      <div class="ref-deeper-body">
        <table>
          <tr><th>Interval</th><th>Semitones</th><th>From C</th><th>Sounds like</th></tr>
          <tr><td>Unison</td><td>0</td><td>C</td><td>—</td></tr>
          <tr><td>Minor 2nd</td><td>1</td><td>C# / Db</td><td>Jaws theme</td></tr>
          <tr><td>Major 2nd</td><td>2</td><td>D</td><td>Happy Birthday</td></tr>
          <tr><td>Minor 3rd</td><td>3</td><td>D# / Eb</td><td>Smoke on the Water (riff)</td></tr>
          <tr><td>Major 3rd</td><td>4</td><td>E</td><td>When the Saints Go Marching In</td></tr>
          <tr><td>Perfect 4th</td><td>5</td><td>F</td><td>Here Comes the Bride</td></tr>
          <tr><td>Tritone</td><td>6</td><td>F# / Gb</td><td>The Simpsons theme</td></tr>
          <tr><td>Perfect 5th</td><td>7</td><td>G</td><td>Twinkle Twinkle Little Star</td></tr>
          <tr><td>Minor 6th</td><td>8</td><td>G# / Ab</td><td>The Entertainer (Scott Joplin)</td></tr>
          <tr><td>Major 6th</td><td>9</td><td>A</td><td>My Bonnie Lies Over the Ocean</td></tr>
          <tr><td>Minor 7th</td><td>10</td><td>A# / Bb</td><td>Somewhere (West Side Story)</td></tr>
          <tr><td>Major 7th</td><td>11</td><td>B</td><td>Take On Me (chorus)</td></tr>
          <tr><td>Octave</td><td>12</td><td>C</td><td>Somewhere Over the Rainbow</td></tr>
        </table>
      </div>
    </details>
    <p><b>Counting instead of guessing:</b> you don't have to recite the alphabet backwards to find a note — just count steps. If you're on C and go back 3 steps, you land on A. It's the same counting you already do with stairs or a clock, just with 7 letters instead of 12 numbers.</p>

    <h2 id="ref-fret-dots">3 · Fretboard landmarks — the dots</h2>
    <p>In standard tuning, your starting notes are the open strings: <b>E A D G B E</b>, thickest to thinnest. Every fret up adds one step, so any note on the neck is just a count away from a string you already know.</p>
    <p>You don't have to memorize the notes fret by fret. The dots on frets <b>3, 5, 7, 9 and 12</b> are checkpoints: learn the notes under them on your two lowest strings, and you're never more than a couple of frets from a note you already know.</p>
    <p>The stronger shortcut is the <b>octave twin</b> shape, next.</p>

    <h2 id="ref-octave-shapes">4 · The "octave twin" shape</h2>
    <p>Every note lives in more than one place on the neck. On the <b>🎸 Guitar</b> tab, the Octave twins board shows it: in standard tuning, the same note is usually <b>2 strings up + 2 frets up</b> — except crossing the <b>G→B</b> strings, where it's <b>3 frets</b>. Know one position and the shape finds the rest.</p>
    <div class="card">
      <svg viewBox="0 0 400 250" style="width:100%;max-width:420px;display:block;margin:4px auto;" aria-label="Diagram of the octave twin shape in standard tuning">
        <line x1="40" y1="20" x2="40" y2="230" stroke="var(--muted)" stroke-width="3"/>
        <line x1="40" y1="30" x2="360" y2="30" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="40" y1="68" x2="360" y2="68" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="40" y1="106" x2="360" y2="106" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="40" y1="144" x2="360" y2="144" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="40" y1="182" x2="360" y2="182" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="40" y1="220" x2="360" y2="220" stroke="var(--muted)" stroke-opacity="0.5"/>
        <line x1="130" y1="20" x2="130" y2="230" stroke="var(--muted)" stroke-opacity="0.35"/>
        <line x1="200" y1="20" x2="200" y2="230" stroke="var(--muted)" stroke-opacity="0.35"/>
        <line x1="270" y1="20" x2="270" y2="230" stroke="var(--muted)" stroke-opacity="0.35"/>
        <line x1="340" y1="20" x2="340" y2="230" stroke="var(--muted)" stroke-opacity="0.35"/>
        <text x="40" y="14" text-anchor="middle" font-size="11" fill="var(--muted)">open</text>
        <text x="130" y="14" text-anchor="middle" font-size="11" fill="var(--muted)">2</text>
        <text x="200" y="14" text-anchor="middle" font-size="11" fill="var(--muted)">3</text>
        <text x="270" y="14" text-anchor="middle" font-size="11" fill="var(--muted)">4</text>
        <text x="22" y="34" text-anchor="middle" font-size="11" fill="var(--muted)">E</text>
        <text x="22" y="72" text-anchor="middle" font-size="11" fill="var(--muted)">A</text>
        <text x="22" y="110" text-anchor="middle" font-size="11" fill="var(--muted)">D</text>
        <text x="22" y="148" text-anchor="middle" font-size="11" fill="var(--muted)">G</text>
        <text x="22" y="186" text-anchor="middle" font-size="11" fill="var(--muted)">B</text>
        <text x="22" y="224" text-anchor="middle" font-size="11" fill="var(--muted)">E</text>
        <line x1="40" y1="30" x2="200" y2="106" stroke="var(--root)" stroke-width="2.5" stroke-dasharray="5 4"/>
        <circle cx="40" cy="30" r="10" fill="var(--root)"/>
        <circle cx="200" cy="106" r="10" fill="var(--root)"/>
        <text x="130" y="56" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--root)">2 strings + 2 frets</text>
        <line x1="40" y1="106" x2="270" y2="182" stroke="var(--good)" stroke-width="2.5" stroke-dasharray="5 4"/>
        <circle cx="40" cy="106" r="10" fill="var(--good)"/>
        <circle cx="270" cy="182" r="10" fill="var(--good)"/>
        <text x="285" y="150" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--good)">2 strings +</text>
        <text x="285" y="164" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--good)">3 frets (G→B)</text>
      </svg>
    </div>
    <details class="ref-deeper">
      <summary>The maths & how other tunings change it</summary>
      <div class="ref-deeper-body">
        <p><b>The maths behind it:</b> an octave is always 12 semitones away. Standard tuning strings are a perfect 4th apart (5 semitones) — except G→B, a major 3rd (4 semitones). Jump 2 strings and 2 frets closes a 10-semitone gap (5+5) up to 12. Jump 2 strings across G→B and you've only covered 9 semitones (5+4), so you need 3 frets instead.</p>
        <p><b>Yes — it changes with the tuning.</b> The shape only depends on how far apart (in semitones) the strings 2 positions away are tuned, so any tuning that isn't "all perfect 4ths" reshapes it. The table below is generated straight from this app's own tunings:</p>
        <div id="octaveShiftTable"></div>
        <p style="color:var(--muted);font-size:13px;">Drop tunings only retune the lowest string, so only the pairs touching it change — notice the low-string pair collapses to <b>0 frets</b> (same fret, 2 strings up) because dropping a whole step makes that gap exactly an octave already! Open tunings (G, D) reshape almost every pair, since the whole string set is spaced differently.</p>
      </div>
    </details>

    <h2 id="ref-octaves">5 · Octave numbers (C2, C3, C4…)</h2>
    <p>Each letter repeats forever, higher and lower. The number just says which copy you mean — like floor numbers in a building.</p>
    <details class="ref-deeper">
      <summary>Octave numbers — the full rule</summary>
      <div class="ref-deeper-body">
        <p>This is called <b>scientific pitch notation</b>. The number tells you <i>which</i> C (or D, or G) you mean, since every letter repeats every 12 semitones.</p>
        <p><b>The rule:</b> go up 12 semitones (one octave) and the number goes up by 1. <b>C4</b> is "middle C" — the anchor note for the whole system.</p>
        <table class="octave-table">
          <tr><th>Notation</th><th>Name</th><th>Where it lives</th></tr>
          <tr><td>C0</td><td>Sub-contra octave</td><td>Extremely low — below most instruments</td></tr>
          <tr><td>C1</td><td>Contra octave</td><td>Bottom of a 5-string bass</td></tr>
          <tr><td>C2</td><td>Great octave</td><td>Low string of Drop C guitar, bass low E</td></tr>
          <tr><td>C3</td><td>Small octave</td><td>3rd string of Drop C guitar, cello low C</td></tr>
          <tr><td class="highlight-row">C4</td><td class="highlight-row">Middle C</td><td class="highlight-row">Piano middle, top string of Standard C guitar</td></tr>
          <tr><td>C5</td><td>Treble octave</td><td>High vocals, violin range</td></tr>
          <tr><td>C6</td><td>Soprano octave</td><td>Very high — top of most flutes</td></tr>
        </table>
      </div>
    </details>

    <details class="ref-deeper">
      <summary>Tuning the guitar — the 5-fret formula</summary>
      <div class="ref-deeper-body">
        <p>Why is standard tuning <b>E A D G B E</b>? Because of one simple rule: <b>the next string's open note is the current string played at fret 5</b> — 5 frets = a perfect 4th. The only exception is <b>3rd → 2nd</b> string, which is fret 4 (a major 3rd).</p>
        <table>
          <tr><th>String pair</th><th>Fret to match</th><th>Interval</th></tr>
          <tr><td>6th E → 5th A</td><td>5</td><td>Perfect 4th</td></tr>
          <tr><td>5th A → 4th D</td><td>5</td><td>Perfect 4th</td></tr>
          <tr><td>4th D → 3rd G</td><td>5</td><td>Perfect 4th</td></tr>
          <tr><td class="highlight-row">3rd G → 2nd B</td><td class="highlight-row">4</td><td class="highlight-row">Major 3rd</td></tr>
          <tr><td>2nd B → 1st E</td><td>5</td><td>Perfect 4th</td></tr>
        </table>
        <p>That's the trick players use to <b>tune by ear</b>: play the 5th fret of the low E and match the open A, then repeat up the strings (fret 4 across the B string).</p>
        <p>The same formula works in <b>any tuning</b>: the next open string is the current string at the fret equal to the gap between them. On the 🎸 Fretboard tab, the Tuning ⓘ shows the exact gaps for whichever tuning you pick.</p>
      </div>
    </details>

    <h2 id="ref-chords">6 · How chords are built</h2>
    <p>Every chord is the <b>root</b> note plus a set of intervals stacked on top. Try it yourself in the <b>🎵 Chord library</b> (Fretboard tab) — pick a chord type and the fretboard lights up every matching note, with each note's interval degree labelled.</p>
    <details class="ref-deeper">
      <summary>Chord recipes — the full list</summary>
      <div class="ref-deeper-body">
        <h3>Triads (3-note chords)</h3>
        <table>
          <tr><th>Chord</th><th>Intervals</th><th>From C</th><th>Sound</th></tr>
          <tr><td>Major</td><td>1 – 3 – 5</td><td>C – E – G</td><td>Happy, stable</td></tr>
          <tr><td>Minor</td><td>1 – ♭3 – 5</td><td>C – E♭ – G</td><td>Sad, serious</td></tr>
          <tr><td>Diminished</td><td>1 – ♭3 – ♭5</td><td>C – E♭ – G♭</td><td>Tense, unstable</td></tr>
          <tr><td>Augmented</td><td>1 – 3 – ♯5</td><td>C – E – G♯</td><td>Dreamlike, mysterious</td></tr>
          <tr><td>Sus2</td><td>1 – 2 – 5</td><td>C – D – G</td><td>Open, unresolved</td></tr>
          <tr><td>Sus4</td><td>1 – 4 – 5</td><td>C – F – G</td><td>Folk, anticipatory</td></tr>
          <tr><td>Power (5)</td><td>1 – 5</td><td>C – G</td><td>Neutral, works with anything</td></tr>
        </table>
        <h3>Seventh chords (4-note)</h3>
        <table>
          <tr><th>Chord</th><th>Intervals</th><th>From C</th><th>Sound</th></tr>
          <tr><td>Major 7</td><td>1 – 3 – 5 – 7</td><td>C – E – G – B</td><td>Jazzy, dreamy</td></tr>
          <tr><td>Minor 7</td><td>1 – ♭3 – 5 – ♭7</td><td>C – E♭ – G – B♭</td><td>Smooth, mellow</td></tr>
          <tr><td>Dominant 7</td><td>1 – 3 – 5 – ♭7</td><td>C – E – G – B♭</td><td>Bluesy, wants to resolve</td></tr>
          <tr><td>Minor 7♭5</td><td>1 – ♭3 – ♭5 – ♭7</td><td>C – E♭ – G♭ – B♭</td><td>Jazz, unstable</td></tr>
          <tr><td>Diminished 7</td><td>1 – ♭3 – ♭5 – ♭♭7</td><td>C – E♭ – G♭ – A</td><td>Extremely tense</td></tr>
        </table>
        <h3>Symbols you'll see</h3>
        <ul>
          <li><b>♭</b> flat (one semitone lower) · <b>♯</b> sharp (one semitone higher)</li>
          <li><b>Δ</b> / <b>maj</b> = major 7th · plain <b>7</b> = dominant 7th</li>
          <li><b>m</b> / <b>–</b> = minor · <b>dim</b> / <b>°</b> = diminished · <b>aug</b> / <b>+</b> = augmented</li>
        </ul>
      </div>
    </details>

    <h2 id="ref-nashville">7 · Numbers instead of chord names</h2>
    <p>This is the <b>Nashville Number System</b> — the same 1–7 map, used for chords. Songs are written as numbers so they work in any key. If you remember one thing, remember: <b>1 is home</b>.</p>
    <details class="ref-deeper">
      <summary>The full Nashville table</summary>
      <div class="ref-deeper-body">
        <p>Session musicians often write chords as <b>numbers</b> (the scale degree) instead of letters, so the same sheet works in any key.</p>
        <table class="nash-table">
          <tr><th>Number</th><th>Means</th><th>In C</th><th>In G</th><th>Chord quality</th></tr>
          <tr><td class="n1">1</td><td>Home / tonic</td><td>C</td><td>G</td><td>Major</td></tr>
          <tr><td>2</td><td>Second</td><td>D</td><td>A</td><td>Minor</td></tr>
          <tr><td>3</td><td>Third</td><td>E</td><td>B</td><td>Minor</td></tr>
          <tr><td>4</td><td>Fourth</td><td>F</td><td>C</td><td>Major</td></tr>
          <tr><td>5</td><td>Fifth</td><td>G</td><td>D</td><td>Major</td></tr>
          <tr><td>6</td><td>Sixth</td><td>A</td><td>E</td><td>Minor</td></tr>
          <tr><td>7</td><td>Seventh</td><td>B</td><td>F#</td><td>Diminished</td></tr>
        </table>
        <p><b>Notation rules:</b> plain number = major chord (<code>1</code> = C major). Dash = minor (<code>6–</code> = A minor). The chord built on <code>7</code> in a major key is diminished (<code>7°</code>). For chord symbols on a letter: <code>C7</code> = dominant 7th, <code>CΔ7</code> = major 7th.</p>
        <table>
          <tr><th>Numbers</th><th>In C</th><th>Where you hear it</th></tr>
          <tr><td>1 – 4 – 5</td><td>C – F – G</td><td>Blues, rock, folk</td></tr>
          <tr><td>1 – 5 – 6– – 4</td><td>C – G – Am – F</td><td>Modern pop</td></tr>
          <tr><td>2– – 5 – 1</td><td>Dm – G – C</td><td>Jazz turnaround</td></tr>
          <tr><td>6– – 4 – 1 – 5</td><td>Am – F – C – G</td><td>Pop / rock minor-feel</td></tr>
          <tr><td>1 – 6– – 4 – 5</td><td>C – Am – F – G</td><td>50s doo-wop</td></tr>
        </table>
      </div>
    </details>

    <h2 id="ref-rhythm">8 · How long to hold a note</h2>
    <p>This is just <b>how long</b> to hold each note. Use the <b>⏱️ Metronome</b> tab to hear it and practice staying in time.</p>
    <details class="ref-deeper">
      <summary>Note values & time signatures</summary>
      <div class="ref-deeper-body">
        <table>
          <tr><th>Name</th><th>Beats (in 4/4)</th><th>Symbol</th><th>How to count</th></tr>
          <tr><td>Whole note</td><td>4</td><td>𝅝</td><td>"1 – 2 – 3 – 4"</td></tr>
          <tr><td>Half note</td><td>2</td><td>𝅗𝅥</td><td>played on 1 and 3</td></tr>
          <tr><td>Quarter note</td><td>1</td><td>♩</td><td>one per beat</td></tr>
          <tr><td>Eighth note</td><td>0.5</td><td>♪</td><td>"1 and 2 and…"</td></tr>
          <tr><td>Sixteenth note</td><td>0.25</td><td>𝅘𝅥𝅯</td><td>"1 e and a…"</td></tr>
          <tr><td>Triplet</td><td>0.333</td><td>♪₃</td><td>3 in the space of 2</td></tr>
          <tr><td>Dotted half</td><td>3</td><td>𝅗𝅥.</td><td>half + half-of-half</td></tr>
          <tr><td>Dotted quarter</td><td>1.5</td><td>♩.</td><td>quarter + eighth</td></tr>
        </table>
        <p><b>The dot rule:</b> a dot adds half of the note's value. Dotted quarter = 1 + 0.5 = 1.5 beats.</p>
        <table>
          <tr><th>Signature</th><th>Means</th><th>Feel</th></tr>
          <tr><td>4/4</td><td>4 beats per bar</td><td>The default — rock, pop, most things</td></tr>
          <tr><td>3/4</td><td>3 beats per bar</td><td>Waltz</td></tr>
          <tr><td>6/8</td><td>6 eighth notes (2 groups of 3)</td><td>Rolling, jig-like</td></tr>
          <tr><td>2/4</td><td>2 beats per bar</td><td>March</td></tr>
          <tr><td>5/4</td><td>5 beats per bar</td><td>Odd time — Take Five</td></tr>
          <tr><td>7/8</td><td>7 eighth notes per bar</td><td>Odd time — progressive rock</td></tr>
        </table>
      </div>
    </details>

    <h2 id="ref-circle">9 · The Circle of Fifths</h2>
    <p>Tap a slice to hear it. Each step clockwise is up a 5th; each step back is up a 4th.</p>

    <div class="circle-wrap" id="circleWrap"></div>
    <p>This wheel arranges the keys so neighbouring keys share almost all of their notes.</p>
    <details class="ref-deeper">
      <summary>How to read the circle & what it's used for</summary>
      <div class="ref-deeper-body">
        <ul>
          <li><b>Outside ring</b> = major keys. <b>Inside ring</b> = relative minor keys.</li>
          <li><b>Clockwise</b> = up a 5th (C → G → D → A → …).</li>
          <li><b>Counterclockwise</b> = up a 4th (C → F → Bb → Eb → …).</li>
          <li><b>Neighbors</b> share almost all notes. <b>Directly across</b> = a tritone.</li>
        </ul>
        <table>
          <tr><th>Use case</th><th>How the circle helps</th></tr>
          <tr><td>Key signatures</td><td>Count sharps clockwise, flats counterclockwise.</td></tr>
          <tr><td>Chord progressions</td><td>Common moves: down a 5th (ii→V→I), up a 4th (I→IV).</td></tr>
          <tr><td>Transposing</td><td>Move the whole song N steps around the circle.</td></tr>
          <tr><td>Relative minor</td><td>Same slice, inner ring (C major → A minor).</td></tr>
          <tr><td>Finding the 5th</td><td>One step clockwise (C → G).</td></tr>
          <tr><td>Finding the 4th</td><td>One step counterclockwise (C → F).</td></tr>
        </table>
      </div>
    </details>

    <details class="ref-deeper" id="ref-deeper-topics">
      <summary>Go deeper: modes & solfège</summary>
      <div class="ref-deeper-body">
        <h2 id="ref-modes">Same notes, different mood: modes</h2>
        <p>Think of modes like different filters on the same photo — same picture (notes), different vibe.</p>
        <details class="ref-deeper">
          <summary>Modes — the full picture</summary>
          <div class="ref-deeper-body">
            <p>A mode is a scale built from a different starting note of the same parent scale — same 7 notes, different "home," different feeling.</p>
            <table>
              <tr><th>Mode</th><th>Built from</th><th>Character</th><th>Famous example</th></tr>
              <tr><td><b>Ionian</b></td><td>1st degree of major (same as major)</td><td>Bright, happy, resolved</td><td>Let It Be — The Beatles</td></tr>
              <tr><td><b>Dorian</b></td><td>2nd degree (minor with raised 6th)</td><td>Minor but hopeful, jazzy, folk</td><td>Scarborough Fair; So What — Miles Davis</td></tr>
              <tr><td><b>Phrygian</b></td><td>3rd degree (minor with flat 2nd)</td><td>Dark, Spanish, heavy metal</td><td>Wherever I May Roam — Metallica</td></tr>
              <tr><td><b>Lydian</b></td><td>4th degree (major with raised 4th)</td><td>Dreamy, floaty, cinematic</td><td>The Simpsons theme; Flying Theme — E.T.</td></tr>
              <tr><td><b>Mixolydian</b></td><td>5th degree (major with flat 7th)</td><td>Bluesy, rock 'n' roll</td><td>Sweet Home Alabama; Norwegian Wood</td></tr>
              <tr><td><b>Aeolian</b></td><td>6th degree (same as natural minor)</td><td>Sad, serious, melancholic</td><td>Losing My Religion — R.E.M.</td></tr>
              <tr><td><b>Locrian</b></td><td>7th degree (diminished flavour)</td><td>Unstable, tense, rarely a home</td><td>Army of Me — Björk (riff)</td></tr>
            </table>
            <p><b>Try it on the Fretboard tab:</b> root D + scale Dorian = D Dorian. Root A + scale Natural minor = A Aeolian.</p>
          </div>
        </details>

        <h2 id="ref-solfege">Do Re Mi… have you heard this before?</h2>
        <p>That's from "The Sound of Music"! It's just another way of singing our 7-number map.</p>
        <details class="ref-deeper">
          <summary>Solfège — fixed vs movable Do</summary>
          <div class="ref-deeper-body">
            <h3>Fixed Do</h3>
            <table>
              <tr><th>Syllable</th><th>Always means</th></tr>
              <tr><td>Do</td><td>C</td></tr><tr><td>Re</td><td>D</td></tr><tr><td>Mi</td><td>E</td></tr>
              <tr><td>Fa</td><td>F</td></tr><tr><td>Sol</td><td>G</td></tr><tr><td>La</td><td>A</td></tr><tr><td>Si</td><td>B</td></tr>
            </table>
            <h3>Movable Do</h3>
            <table>
              <tr><th>Syllable</th><th>Means</th><th>C major</th><th>G major</th></tr>
              <tr><td>Do</td><td>1 (home)</td><td>C</td><td>G</td></tr>
              <tr><td>Re</td><td>2</td><td>D</td><td>A</td></tr>
              <tr><td>Mi</td><td>3</td><td>E</td><td>B</td></tr>
              <tr><td>Fa</td><td>4</td><td>F</td><td>C</td></tr>
              <tr><td>Sol</td><td>5</td><td>G</td><td>D</td></tr>
              <tr><td>La</td><td>6</td><td>A</td><td>E</td></tr>
              <tr><td>Ti</td><td>7</td><td>B</td><td>F#</td></tr>
            </table>
          </div>
        </details>
      </div>
    </details>

    <h2 id="ref-heatmap">Your interval heatmap</h2>
    <p>Every question you answer in Ear or Practice feeds this map. <b>Green = you hear it. Red = it hears you.</b> Get each interval above 80% and the Learn path marks its stage ✓.</p>
    <div id="intervalHeatmap" class="heatmap"></div>
    <p id="heatmapStatus" style="color:var(--muted);font-size:13px;">Answer a few questions and come back.</p>

  `;
}

export function initReference() {
  renderCircleOfFifths();
  renderOctaveShiftTable();
  renderHeatmap();
  // Circle slice colours depend on the theme; labels depend on the notation.
  on('theme-change', renderCircleOfFifths);
  on('note-names-change', renderCircleOfFifths);
  // Re-read stats whenever the Reference tab is opened.
  on('tab-visible', (tab) => { if (tab === 'ref') renderHeatmap(); });
}

function renderHeatmap() {
  const el = document.getElementById('intervalHeatmap');
  if (!el) return;
  const stats = loadStats();
  const cells = [];
  let answeredAny = false;
  for (let s = 1; s <= 11; s++) {
    const d = INTERVAL_DETAILS[s];
    let best = null;
    ['up', 'down'].forEach(dir => {
      const acc = getIntervalAccuracy(stats, `${dir}:${s}`);
      if (acc !== null && (best === null || acc > best)) best = acc;
    });
    if (best !== null) answeredAny = true;
    const level = best === null ? 0 : Math.round(best * 100);
    cells.push(`
      <div class="heat-cell" style="--heat:${level};" title="${d.name} — ${best === null ? 'not tried' : Math.round(best * 100) + '%'}">
        <span class="heat-label">${d.short}</span>
        <span class="heat-pct">${best === null ? '—' : Math.round(best * 100) + '%'}</span>
      </div>
    `);
  }
  el.innerHTML = cells.join('');
  const status = document.getElementById('heatmapStatus');
  if (status) {
    status.textContent = answeredAny
      ? 'Green = you hear it. Red = it hears you. Octaves and unisons are always green — they are the same note.'
      : 'Answer a few questions in Ear or Practice and this map fills in.';
  }
}

function renderOctaveShiftTable() {
  const el = document.getElementById('octaveShiftTable');
  if (!el) return;
  const keys = Object.keys(TUNINGS);
  const maxPairs = Math.max(...keys.map(k => octaveShiftPairs(TUNINGS[k]).length));

  let html = '<table class="octave-table"><tr><th>Tuning</th>';
  for (let i = 0; i < maxPairs; i++) html += `<th>String pair ${i + 1}</th>`;
  html += '</tr>';

  keys.forEach(k => {
    const t = TUNINGS[k];
    const pairs = octaveShiftPairs(t);
    html += `<tr><td><b>${t.label}</b></td>`;
    pairs.forEach(p => {
      const standard = p.fretShift === 2;
      html += `<td${standard ? '' : ' class="highlight-row"'}>${p.lowString} → ${p.highString}: <b>${p.fretShift}</b> fret${p.fretShift === 1 ? '' : 's'}</td>`;
    });
    html += '</tr>';
  });

  html += '</table>';
  el.innerHTML = html;
}

export function renderCircleOfFifths() {
  renderCircleInto(document.getElementById('circleWrap'), {
    onSliceClick: showCircleInfo,
    centerTop: 'Click a key',
    centerBottom: 'to see its notes'
  });
}

function showCircleInfo(index) {
  const major = CIRCLE_MAJOR[index];
  const minor = CIRCLE_MINOR[index];
  const majorRootPc = noteNameToPc(major);
  const minorRootPc = noteNameToPc(minor.replace('m',''));

  const majorNotes = scaleNotesFromPc(majorRootPc, MAJOR_SCALE);
  const minorNotes = scaleNotesFromPc(minorRootPc, NATURAL_MINOR_SCALE);

  const infoCard = document.createElement('div');
  infoCard.className = 'card';
  infoCard.style.marginTop = '16px';
  infoCard.innerHTML = `
    <p style="margin:0 0 6px 0;"><b>${major} major</b> — notes: ${majorNotes.join(' · ')}</p>
    <p style="margin:0 0 6px 0;color:var(--muted);font-size:13px;">Relative minor: <b>${minor}</b> — same notes, different home.</p>
    <p style="margin:0;color:var(--muted);font-size:13px;">Relative minor notes: ${minorNotes.join(' · ')}</p>
  `;

  const existing = document.getElementById('circleInfo');
  if (existing) existing.remove();
  infoCard.id = 'circleInfo';
  document.getElementById('circleWrap').after(infoCard);

  playChord([majorRootPc + 60, majorRootPc + 64, majorRootPc + 67], 1.6);
  setTimeout(() => {
    majorNotes.forEach((_, i) => {
      setTimeout(() => playMidi(majorRootPc + 60 + MAJOR_SCALE[i], 0.35), i * 250);
    });
  }, 1700);
}
