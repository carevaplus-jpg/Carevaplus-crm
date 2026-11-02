#!/usr/bin/env python3
"""
Bundle the whole site into ONE self-contained HTML file.

Every page becomes a route inside a single document, navigated by hash
(#/services) with an animated transition. The stylesheet, the script and
both logos are embedded, so the file works anywhere — a desktop, an email
attachment, a USB stick — with nothing beside it.

    python3 build.py && python3 make_single.py

Output: careva-plus-website.html
"""

import base64
import pathlib
import re

SRC = pathlib.Path(__file__).parent
OUT = SRC / "careva-plus-website.html"

# route slug -> source page
ROUTES = [
    ("home",          "index.html"),
    ("services",      "services.html"),
    ("about",         "about.html"),
    ("how-it-works",  "how-it-works.html"),
    ("service-areas", "service-areas.html"),
    ("careers",       "careers.html"),
    ("faq",           "faq.html"),
    ("contact",       "contact.html"),
]
PAGE_TO_ROUTE = {page: slug for slug, page in ROUTES}


def data_uri(rel):
    return "data:image/png;base64," + base64.b64encode((SRC / rel).read_bytes()).decode()


def grab(html, tag):
    """Return the inner HTML of the first <tag ...> ... </tag>."""
    m = re.search(r"<%s[^>]*>(.*)</%s>" % (tag, tag), html, re.S)
    if not m:
        raise SystemExit("no <%s> found" % tag)
    return m.group(1)


def rewrite_links(html):
    """Point every page link at its hash route; keep tel/mailto/http as-is."""
    def repl(m):
        attr, href = m.group(1), m.group(2)
        page, _, frag = href.partition("#")
        slug = PAGE_TO_ROUTE.get(page)
        if slug is None:
            return m.group(0)
        target = "#/" + slug + ("/" + frag if frag else "")
        return '%s="%s"' % (attr, target)

    return re.sub(r'(href)="([a-z0-9\-]+\.html(?:#[A-Za-z0-9\-_]+)?)"', repl, html)


def main():
    pages = {}
    for slug, page in ROUTES:
        raw = (SRC / page).read_text(encoding="utf-8")
        title = re.search(r"<title>(.*?)</title>", raw, re.S).group(1).strip()
        pages[slug] = {"title": title, "main": rewrite_links(grab(raw, "main"))}

    base = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = (SRC / "script.js").read_text(encoding="utf-8")

    logo, logo_light = data_uri("assets/careva-logo.png"), data_uri("assets/careva-logo-light.png")
    favicon = data_uri("assets/favicon.png")

    # Each logo embedded once, drawn as a background: repeating the base64 per
    # <img> across eight routes would bloat the file many times over.
    css = css.replace(
        ":root {",
        ':root {\n  --logo: url("%s");\n  --logo-light: url("%s");' % (logo, logo_light),
        1,
    ) + """

/* ---- single-file build: logos embedded as backgrounds ---- */
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
    header = rewrite_links(
        re.search(r"<header class=\"site-header\".*?</header>", base, re.S).group(0))
    footer = rewrite_links(
        re.search(r"<footer class=\"site-footer\".*?</footer>", base, re.S).group(0))
    fabs = re.search(r"<div class=\"fab-stack\">.*?</div>\s*</div>", base, re.S)
    fabs = fabs.group(0) if fabs else re.search(
        r"<div class=\"fab-stack\">.*?\n</div>", base, re.S).group(0)

    for frag_name, frag in (("header", header), ("footer", footer)):
        pass
    header = re.sub(r'<picture class="brand-pic">.*?</picture>',
                    f'<span class="brand-logo" {label}></span>', header, flags=re.S)
    footer = re.sub(r'<picture class="footer-pic">.*?</picture>',
                    f'<span class="footer-logo" {label}></span>', footer, flags=re.S)

    routes_html = "\n".join(
        '<section class="route" id="route-%s" data-title="%s">\n%s\n</section>'
        % (slug, pages[slug]["title"].replace('"', "&quot;"), pages[slug]["main"])
        for slug, _ in ROUTES
    )

    config = re.search(r"window\.CAREVA_CONFIG = \{.*?\};", base, re.S).group(0)

    router = """
  /* ============================================================
     Single-file router — each page is a route, swapped with an
     animated transition. The browser's back and forward buttons,
     deep links and in-page anchors all keep working.
     ============================================================ */
  (function () {
    var routes = document.querySelectorAll(".route");
    if (!routes.length) return;

    var bar = document.querySelector(".route-bar");
    var nav = document.getElementById("nav");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ids = {};
    routes.forEach(function (r) { ids[r.id.replace("route-", "")] = r; });
    var current = null;

    function isRouteHash(hash) {
      return /^#\\//.test(hash || "");
    }

    function parse() {
      // Only "#/slug" is navigation. "#main" (the skip link) and any other
      // plain anchor belongs to the browser, not to the router.
      if (!isRouteHash(location.hash)) return null;
      var bits = location.hash.replace(/^#\\//, "").split("/").filter(Boolean);
      var slug = bits[0] && ids[bits[0]] ? bits[0] : "home";
      return { slug: slug, anchor: bits[1] || "" };
    }

    function markNav(slug) {
      if (!nav) return;
      nav.querySelectorAll('a[href^="#/"]').forEach(function (a) {
        var target = a.getAttribute("href").replace(/^#\\//, "").split("/")[0] || "home";
        a.classList.toggle("active", target === slug);
        if (target === slug) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }

    function reveal(scope) {
      // re-arm scroll animations for the freshly shown route
      scope.querySelectorAll(".reveal").forEach(function (el) { el.classList.remove("visible"); });
      if (window.CarevaReveal) window.CarevaReveal(scope);
    }

    function show(slug, anchor, animate) {
      var next = ids[slug];
      if (!next) return;

      var finish = function () {
        if (current && current !== next) {
          current.classList.remove("is-active", "is-leaving");
        }
        next.classList.add("is-active");
        current = next;

        document.title = next.getAttribute("data-title") || document.title;
        markNav(slug);
        reveal(next);

        var target = anchor && next.querySelector("#" + CSS.escape(anchor));
        if (target) target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: "instant" });
      };

      if (!animate || reduced || !current || current === next) return finish();

      if (bar) {
        bar.classList.remove("is-busy");
        void bar.offsetWidth;
        bar.classList.add("is-busy");
      }
      current.classList.add("is-leaving");
      setTimeout(finish, 220);
    }

    window.addEventListener("hashchange", function () {
      var r = parse();
      if (r) show(r.slug, r.anchor, true);     // ignore plain anchors
    });

    // Clicking a link to the route already on screen fires no hashchange, so
    // scroll to its target here instead of leaving the click dead.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (!a) return;
      var href = a.getAttribute("href");
      if (href !== location.hash) return;      // hashchange will handle it
      var bits = href.replace(/^#\\//, "").split("/").filter(Boolean);
      if (!bits[0] || !ids[bits[0]]) return;
      e.preventDefault();
      show(bits[0], bits[1] || "", false);
    });

    var first = parse();
    show(first ? first.slug : "home", first ? first.anchor : "", false);
  })();
"""

    # expose the reveal observer so the router can re-arm it per route
    js = js.replace(
        '''  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(''',
        '''  var io = null;
  if ("IntersectionObserver" in window && !reduced) {
    io = new IntersectionObserver(''')
    js = js.replace(
        """    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }""",
        """    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* Re-arm reveals and counters for content shown later (router routes). */
  window.CarevaReveal = function (scope) {
    var els = (scope || document).querySelectorAll(".reveal");
    if (!io) {
      els.forEach(function (el) { el.classList.add("visible"); });
    } else {
      els.forEach(function (el) { io.observe(el); });
    }
    (scope || document).querySelectorAll("[data-count]").forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      runCounter(el);
    });
  };""")

    html = f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{pages['home']['title']}</title>
<meta name="description" content="Careva+ provides trained nurses, care attendants and physiotherapists at home across Salem. 24/7 helpline, verified staff, free assessment." />
<meta name="theme-color" content="#06234f" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="icon" type="image/png" href="{favicon}" />
<style>
{css}
</style>
</head>
<body>

<div class="preloader" id="preloader">
  <div class="preloader-inner">
    <span class="preloader-logo" {label}></span>
    <div class="loader-track"><span class="loader-bar"></span></div>
  </div>
</div>

<div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>
<div class="route-bar" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>

{header}

<main id="main" tabindex="-1">
{routes_html}
</main>

{footer}

{fabs}

<script>
{config}
</script>
<script>
{js}
{router}
</script>
</body>
</html>
"""

    # Check only the markup — script bodies legitimately build URLs from strings.
    markup = re.sub(r"<script\b.*?</script>", "", html, flags=re.S)
    leftover = re.findall(r'(?:src|href)="(?!data:|#|tel:|mailto:|https?:)([^"]+)"', markup)
    if leftover:
        raise SystemExit("unresolved external references: %s" % sorted(set(leftover)))

    OUT.write_text(html, encoding="utf-8")
    print("wrote %s  (%d KB, %d routes)" % (OUT.name, len(html.encode()) // 1024, len(ROUTES)))


if __name__ == "__main__":
    main()
