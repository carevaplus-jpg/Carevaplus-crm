#!/usr/bin/env python3
"""
Build self-contained copies of every page into ./standalone/

Each output page has the stylesheet, the script and both logos embedded
inside it, so a page renders correctly even if it is the only file in a
folder. Use this for emailing, USB sticks or opening straight off the
desktop. For real hosting, serve the normal pages instead — they share
one cached stylesheet and logo rather than repeating them per page.

    python3 make_standalone.py
"""

import base64, pathlib, re

SRC = pathlib.Path(__file__).parent
OUT = SRC / "standalone"
# Only the generated site pages — not the single-file bundle, which is already
# self-contained and would match this glob.
BUNDLE = "careva-plus-website.html"
PAGES = sorted(p.name for p in SRC.glob("*.html") if p.name != BUNDLE)


def data_uri(rel):
    return "data:image/png;base64," + base64.b64encode((SRC / rel).read_bytes()).decode()


def main():
    OUT.mkdir(exist_ok=True)
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "script.js").read_text(encoding="utf-8")

    logo = data_uri("assets/careva-logo.png")
    logo_light = data_uri("assets/careva-logo-light.png")
    favicon = data_uri("assets/favicon.png")

    # Each logo is embedded ONCE per page, as a custom property, then drawn as a
    # background. Repeating the base64 per <img> would multiply the page size.
    css_inline = css.replace(
        ":root {",
        ':root {\n  --logo: url("%s");\n  --logo-light: url("%s");' % (logo, logo_light),
        1,
    ) + """

/* ---- standalone build: logos embedded as backgrounds ---- */
.brand-logo, .footer-logo, .preloader-logo {
  background-repeat: no-repeat; background-size: contain; aspect-ratio: 600 / 210;
}
.brand-logo     { background-image: var(--logo); background-position: left center; }
.preloader-logo { background-image: var(--logo); background-position: center;
                  width: min(300px, 62vw); display: block; margin: 0 auto 26px;
                  animation: logoIn 1s var(--ease-out) both; }
.footer-logo    { background-image: var(--logo-light); background-position: left center; }
"""

    label = 'role="img" aria-label="Careva+ Home Health Care"'
    for name in PAGES:
        html = (SRC / name).read_text(encoding="utf-8")

        html, n1 = re.subn(r'<img class="brand-logo"[^>]*>',
                           f'<span class="brand-logo" {label}></span>', html)
        html, n2 = re.subn(r'<img class="footer-logo"[^>]*>',
                           f'<span class="footer-logo" {label}></span>', html)
        html, n3 = re.subn(r'<img src="assets/careva-logo\.png"[^>]*>',
                           f'<span class="preloader-logo" {label}></span>', html)
        html, n4 = re.subn(r'<link rel="icon"[^>]*>',
                           f'<link rel="icon" type="image/png" href="{favicon}" />', html)
        assert (n1, n2, n3, n4) == (1, 1, 1, 1), (name, n1, n2, n3, n4)

        html = html.replace('<link rel="stylesheet" href="styles.css" />',
                            "<style>\n" + css_inline + "\n</style>")
        html = html.replace('<script src="script.js"></script>',
                            "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>")

        # Nothing may still point at a sibling file — only links to other pages
        # (optionally with a #fragment) are allowed to remain.
        markup = re.sub(r"<script\b.*?</script>", "", html, flags=re.S)
        leftover = re.findall(r'(?:src|href)="(?!data:|#|tel:|mailto:|https?:)([^"]+)"', markup)
        external = [x for x in leftover if not x.split("#")[0].endswith(".html")]
        assert not external, (name, external)

        (OUT / name).write_text(html, encoding="utf-8")
        print(f"  {name:22} {len(html.encode()) // 1024:>4} KB")


if __name__ == "__main__":
    print("writing", OUT)
    main()
