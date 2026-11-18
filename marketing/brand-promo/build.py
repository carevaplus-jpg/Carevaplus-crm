"""Inline fonts and images into one self-contained page.
   python3 build.py                     -> promo.src.html -> careva-promo.html  (16:9)
   python3 build.py reel                -> reel.src.html  -> careva-reel.html   (9:16)"""
import base64, re, sys, pathlib
here = pathlib.Path(__file__).parent
src, out = ('reel.src.html', 'careva-reel.html') if sys.argv[1:] == ['reel'] else ('promo.src.html', 'careva-promo.html')
mime = {'.png': 'image/png', '.woff2': 'font/woff2'}
def data(m):
    f = here / m.group(1)
    return 'data:%s;base64,%s' % (mime[f.suffix], base64.b64encode(f.read_bytes()).decode())
html = re.sub(r'(assets/[\w.\-]+)', data, (here / src).read_text())
(here / out).write_text(html)
print(out, round(len(html) / 1024), 'KB')
