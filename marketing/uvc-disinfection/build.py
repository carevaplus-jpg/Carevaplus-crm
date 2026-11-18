"""Inline assets and build both formats from one source:
   saas.src.html -> careva-uvc.html (16:9, 1920x1080) and careva-uvc-reel.html (9:16, 1080x1920)"""
import base64, re, pathlib
here = pathlib.Path(__file__).parent
mime = {'.png': 'image/png', '.woff2': 'font/woff2'}
src = re.sub(r'(assets/[\w.\-]+)', lambda m: 'data:%s;base64,%s' % (mime[pathlib.Path(m.group(1)).suffix], base64.b64encode((here / m.group(1)).read_bytes()).decode()), (here / 'saas.src.html').read_text())
assert "const FMT = 'wide';" in src
for name, fmt in (('careva-uvc.html', 'wide'), ('careva-uvc-reel.html', 'reel')):
    (here / name).write_text(src.replace("const FMT = 'wide';", f"const FMT = '{fmt}';"))
    print(name, round(len(src) / 1024), 'KB')
