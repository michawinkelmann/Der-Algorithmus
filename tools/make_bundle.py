"""
Baut zwei file://-kompatible Bundles:
- data/data.bundle.js  → JSON-Daten als window.__DATA_* Variablen
- js/app.bundle.js     → Core: alle Module, die beim Start gebraucht werden
- js/app.lazy.bundle.js → Lazy: selten genutzte Module (Mini-Games,
                          Klassen-Vergleich, Wahlomat), die nur bei Bedarf
                          nachgeladen werden.
Beide JS-Bundles teilen sich denselben __M-Namespace über window.__M.
Das Lazy-Bundle setzt am Ende window.__lazyLoaded = true.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
JS_DIR = ROOT / "js"

CORE_ORDER = [
    "state.js",
    "algorithm.js",
    "warnings.js",
    "characters.js",
    "sound.js",
    "tts.js",
    "modals.js",
    "microreflect.js",
    "postreplies.js",
    "selfcheck.js",
    "sharecard.js",
    "glossary.js",
    "concepts.js",
    "push.js",
    "tutorial.js",
    "feed.js",
    "events.js",
    "sandbox.js",
    "wrapped.js",
    "dms.js",
    "places.js",
    "main.js",
]

LAZY_ORDER = [
    "minigame.js",
    "factcheck.js",
    "headline.js",
    "glossquiz.js",
    "classcompare.js",
    "wahlomat.js",
]


def build_data_bundle():
    parts = ["// Auto-generated. Do not edit.\n"]
    for f in sorted(DATA_DIR.glob("*.json")):
        key = "__DATA_" + f.stem.upper().replace("-", "_")
        with open(f, encoding="utf-8") as fp:
            data = json.load(fp)
        parts.append(f"window.{key} = {json.dumps(data, ensure_ascii=False)};\n")
    out = DATA_DIR / "data.bundle.js"
    out.write_text("".join(parts), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}  ({out.stat().st_size} bytes)")


# Match: import { A, B as C } from './x.js';
IMPORT_RE = re.compile(
    r"^\s*import\s*\{\s*([^}]+?)\s*\}\s*from\s*['\"][^'\"]+['\"]\s*;?\s*$",
    re.MULTILINE,
)
# Match exports like:
#   export function X
#   export const X =
#   export let X =
#   export async function X
EXPORT_DECL_RE = re.compile(
    r"^(\s*)export\s+((?:async\s+)?function|const|let|var|class)\s+(\w+)",
    re.MULTILINE,
)


def parse_imports(src: str):
    """Return list of (original_name, local_alias) pairs."""
    out = []
    for m in IMPORT_RE.finditer(src):
        for piece in m.group(1).split(","):
            piece = piece.strip()
            if not piece:
                continue
            if " as " in piece:
                orig, alias = [p.strip() for p in piece.split(" as ")]
            else:
                orig = alias = piece
            out.append((orig, alias))
    return out


def parse_exports(src: str):
    """Return list of exported names."""
    return [m.group(3) for m in EXPORT_DECL_RE.finditer(src)]


def strip_module_syntax(src: str) -> str:
    src = IMPORT_RE.sub("", src)
    src = EXPORT_DECL_RE.sub(r"\1\2 \3", src)
    return src


def build_one_bundle(order, out_name, finalize_marker=None):
    out_parts = [
        f"// Auto-generated bundle. Regenerate with: python tools/make_bundle.py\n",
        "(function(){\n",
        # Shared __M zwischen Core und Lazy: window.__M.
        "var __M = window.__M = window.__M || {};\n",
    ]
    for name in order:
        path = JS_DIR / name
        src = path.read_text(encoding="utf-8")
        imports = parse_imports(src)
        exports = parse_exports(src)
        stripped = strip_module_syntax(src)

        out_parts.append(f"\n// ===== {name} =====\n")
        out_parts.append("(function(){\n")
        # Pull imports from namespace under their local alias.
        for orig, alias in imports:
            out_parts.append(f"  var {alias} = __M.{orig};\n")
        out_parts.append(stripped)
        # Push exports back to namespace.
        for exp in exports:
            out_parts.append(f"\n  __M.{exp} = {exp};")
        out_parts.append("\n})();\n")
    if finalize_marker:
        out_parts.append(f"\nwindow.{finalize_marker} = true;\n")
    out_parts.append("\n})();\n")
    out = JS_DIR / out_name
    out.write_text("".join(out_parts), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}  ({out.stat().st_size} bytes)")


def build_app_bundle():
    build_one_bundle(CORE_ORDER, "app.bundle.js")
    build_one_bundle(LAZY_ORDER, "app.lazy.bundle.js", finalize_marker="__lazyLoaded")


if __name__ == "__main__":
    build_data_bundle()
    build_app_bundle()
    print("Done.")
