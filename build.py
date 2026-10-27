#!/usr/bin/env python3
"""
Single-file build script.

Reads index.html and inlines all <link rel="stylesheet"> and
<script type="module"> references into a single HTML file.

Usage:
    python3 build.py

Output:
    notes-maker.html (in the current directory)
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read_file(path):
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full):
        print(f"WARN: missing file {path}", file=sys.stderr)
        return None
    with open(full, 'r', encoding='utf-8') as f:
        return f.read()

def inline_css(html):
    """Replace <link rel='stylesheet' href='...'> with <style>...</style>."""
    pattern = re.compile(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']([^"\']+)["\']\s*/?>')
    def repl(match):
        href = match.group(1)
        content = read_file(href)
        if content is None:
            return match.group(0)
        return f"<style>\n/* ---- {href} ---- */\n{content}\n</style>"
    return pattern.sub(repl, html)

def inline_js(html):
    """
    Replace <script type='module' src='...'> with a bundled <script type='module'>.

    Because our JS uses `import`/`export`, and a single-file build can't easily
    do real module bundling without a tool, we take a simpler approach:
    we concatenate the modules in dependency order and strip import/export
    statements. This works because our modules have a known, acyclic layout
    and don't rely on live bindings.
    """
    # Order matters: dependencies before dependents.
    JS_ORDER = [
        'js/music.js',
        'js/audio.js',
        'js/storage.js',
        'js/theme.js',
        'js/tabs/learn.js',
        'js/tabs/reference.js',
        'js/tabs/practice.js',
        'js/tabs/ear.js',
        'js/tabs/guitar.js',
        'js/tabs/chords.js',
        'js/presets.js',
        'js/main.js',
    ]

    bundled = []
    for path in JS_ORDER:
        content = read_file(path)
        if content is None:
            print(f"WARN: skipping missing {path}", file=sys.stderr)
            continue
        stripped = strip_module_syntax(content)
        bundled.append(f"// ============ {path} ============\n{stripped}")

    bundle = "\n\n".join(bundled)

    # Replace the single module script tag with the bundle
    pattern = re.compile(
        r'<script\s+type=["\']module["\']\s+src=["\'][^"\']+["\']\s*></script>'
    )
    return pattern.sub(lambda m: f'<script type="module">\n{bundle}\n</script>', html)

def strip_module_syntax(js):
    """
    Remove import/export keywords so modules can be concatenated.

    This is a naive but reliable transform for our specific codebase, which
    uses only named imports/exports and no default exports or dynamic imports.
    """
    # Remove import lines: `import { a, b } from '...';` (possibly multi-line)
    js = re.sub(r'^import\s+.*?from\s+["\'][^"\']+["\']\s*;?\s*$', '', js, flags=re.MULTILINE | re.DOTALL)
    js = re.sub(r'^import\s+["\'][^"\']+["\']\s*;?\s*$', '', js, flags=re.MULTILINE)

    # Remove `export ` prefix from declarations
    js = re.sub(r'^export\s+(async\s+)?function\b', r'\1function', js, flags=re.MULTILINE)
    js = re.sub(r'^export\s+(const|let|var)\b', r'\1', js, flags=re.MULTILINE)
    js = re.sub(r'^export\s+class\b', 'class', js, flags=re.MULTILINE)

    # Remove standalone `export { a, b };` lines
    js = re.sub(r'^export\s*\{[^}]*\}\s*;?\s*$', '', js, flags=re.MULTILINE)

    return js

def main():
    index = read_file('index.html')
    if index is None:
        print("ERROR: index.html not found.", file=sys.stderr)
        sys.exit(1)

    print("Inlining CSS…")
    out = inline_css(index)
    print("Inlining JS…")
    out = inline_js(out)

    out_path = os.path.join(ROOT, 'notes-maker.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)

    size_kb = os.path.getsize(out_path) / 1024
    print(f"✓ Built notes-maker.html ({size_kb:.1f} KB)")
    print("  Double-click it or open it in any browser — no server needed.")

if __name__ == '__main__':
    main()
