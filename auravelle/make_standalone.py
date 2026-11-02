#!/usr/bin/env python3
"""Write self-contained copies of every page to ./standalone/ — stylesheet, script and
images embedded, so a page renders correctly even as a lone file.
Run after build.py:   python3 build.py && python3 make_standalone.py"""
import base64, pathlib, re

SRC = pathlib.Path(__file__).parent
OUT = SRC / "standalone"
PAGES = [p.name for p in SRC.glob("*.html")]
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}
_cache = {}

def uri(rel):
    if rel not in _cache:
        p = SRC / rel
        _cache[rel] = f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()
    return _cache[rel]

def main():
    OUT.mkdir(exist_ok=True)
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "app.js").read_text(encoding="utf-8")
    # the cart drawer thumbnail is set from script
    js = js.replace('"assets/kojiba-pack-480.jpg"', '"%s"' % uri("assets/kojiba-pack-480.jpg"))
    for name in PAGES:
        h = (SRC / name).read_text(encoding="utf-8")
        h = re.sub(r"<source[^>]*>", "", h)                         # keep one src per image
        h = re.sub(r'\s(?:srcset|sizes)="[^"]*"', "", h)
        h = re.sub(r'<link rel="(?:manifest|apple-touch-icon)"[^>]*>\n?', "", h)  # PWA needs http(s)
        h = h.replace('<link rel="stylesheet" href="styles.css" />', "<style>\n" + css + "\n</style>")
        h = h.replace('<script src="app.js"></script>', "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")
        # product shots: use the larger, sharper file for the main view
        h = re.sub(r'(src=")assets/kojiba-scene-\d+\.jpg(")', r'\1assets/kojiba-scene-640.jpg\2', h)
        h = re.sub(r'(src=")assets/kojiba-pack-\d+\.jpg(")', r'\1assets/kojiba-pack-480.jpg\2', h)
        h = re.sub(r'(src|href)="(assets/[^"]+\.(?:png|jpg|webp))"',
                   lambda m: f'{m.group(1)}="{uri(m.group(2))}"', h)
        left = re.findall(r'(?:src|href)="(?!data:|#|tel:|mailto:|https?:)([^"]+)"', re.sub(r"<script\b.*?</script>", "", h, flags=re.S))
        left = [x for x in left if not x.split("#")[0].endswith(".html")]
        assert not left, (name, left)
        (OUT / name).write_text(h, encoding="utf-8")
        print(f"  {name:14} {len(h.encode())//1024:>4} KB")

if __name__ == "__main__":
    main()
