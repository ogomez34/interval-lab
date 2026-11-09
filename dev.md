# Dev quick reference

Local run / rebuild / push commands for Interval Lab and Notes Maker.

## Serve the apps (no-cache server — avoids stale Safari module caches)

```bash
# Interval Lab  →  http://localhost:8001
python3 /tmp/serve_nocache.py 8001 ~/GuitarSoundBox/learn-app/interval-lab

# Notes Maker   →  http://localhost:8000
python3 /tmp/serve_nocache.py 8000 ~/GuitarSoundBox/learn-app/notes-maker-main
```

- From an iPhone on the same Wi-Fi: `http://192.168.1.176:8001` (or `:8000`)
- If `/tmp/serve_nocache.py` is missing, recreate it: a `SimpleHTTPRequestHandler` subclass
  that sends `Cache-Control: no-store, must-revalidate`.

## Rebuild the poster PDF

After editing `poster.html`, run from the interval-lab folder:

```bash
cd ~/GuitarSoundBox/learn-app/interval-lab
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --headless=new --disable-gpu \
  --no-pdf-header-footer --print-to-pdf="poster.pdf" \
  --virtual-time-budget=3000 "file://$PWD/poster.html"
```

The poster is 3 A4 pages (12 distances · fretboard shapes · Standard E / Drop C maps).
Print `poster.pdf` at 100% on A4, no scaling, no margins.

## Regenerate the tetrachord SVG diagrams

```bash
~/GuitarSoundBox/learn-app/interval-lab/run.sh
```

(needs `pip3 install --user svgwrite fretboard pyyaml`; writes into `../tetrachords/svg/`)

## Check JS syntax

No build step — just syntax-check what you changed:

```bash
node --check js/tabs/posters.js
```

## Commit & push

Both repos have GitHub auth configured, so plain `git push` works:

```bash
cd ~/GuitarSoundBox/learn-app/interval-lab   # or notes-maker-main
git add -A && git commit -m "..." && git push
```

- Interval Lab: `github.com/ogomez34/interval-lab`
- Notes Maker: `github.com/ogomez34/notes-maker`
- Tetrachords: local checkout of upstream `htuch/tetrachords` (pull-only; generated
  SVGs are rebuilt with `run.sh` above)
