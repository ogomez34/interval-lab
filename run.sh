#!/bin/bash
# Regenerate the tetrachord SVG diagrams in ../tetrachords/svg
# (needs: pip3 install --user svgwrite fretboard pyyaml)
TETRA_DIR="$(cd "$(dirname "$0")/../tetrachords" && pwd)"
cd "$TETRA_DIR" || exit 1
python3 -c "
import collections, collections.abc
for name in ('Mapping','MutableMapping','Sequence','Iterable','Hashable'):
    if not hasattr(collections, name):
        setattr(collections, name, getattr(collections.abc, name))
import sys
sys.path.insert(0, 'scales')
sys.argv = ['scales/diagrams.py']
exec(open('scales/diagrams.py').read())
"
echo "Done — $(ls svg | wc -l | tr -d ' ') SVGs in $TETRA_DIR/svg/"
