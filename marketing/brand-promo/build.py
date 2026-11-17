"""Inline fonts and images into one self-contained page: promo.src.html -> careva-promo.html"""
import base64, re, pathlib
here = pathlib.Path(__file__).parent
src = (here / 'promo.src.html').read_text()
mime = {'.png': 'image/png', '.woff2': 'font/woff2'}
def data(m):
    f = here / m.group(1)
    return 'data:%s;base64,%s' % (mime[f.suffix], base64.b64encode(f.read_bytes()).decode())
out = re.sub(r'(assets/[\w.\-]+)', data, src)
(here / 'careva-promo.html').write_text(out)
print('careva-promo.html', round(len(out) / 1024), 'KB')
