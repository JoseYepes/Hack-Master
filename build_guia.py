#!/usr/bin/env python3
"""Genera guia.js y guia/img/ a partir del Word de la Hackguía (secciones TAREAS,
Las Reglas de la Calle y PROCEDIMIENTOS).

Uso:  python3 build_guia.py "D:/Almacenamiento/ROL/HackMaster/HackreglamentoLocal.docx"

Necesita pandoc. Para las tablas incrustadas como EMF hace falta además LibreOffice
(soffice) y pdftoppm (Poppler); si faltan, esas imágenes se omiten con un aviso.
Pillow (pip install pillow) es opcional: recorta los márgenes en blanco de esas tablas.
"""
import json, os, re, shutil, subprocess, sys, tempfile, unicodedata

INICIO = 'TAREAS'          # primer título de nivel 1 que se incluye
FIN = 'EQUIPO'             # título de nivel 1 en el que se para (no se incluye)
NOMBRES = {'TAREAS': 'Tareas', 'PROCEDIMIENTOS': 'Procedimientos'}
AQUI = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(AQUI, 'guia', 'img')

def texto(html):
    t = re.sub(r'<[^>]+>', ' ', html)
    for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&#39;', "'"), ('\xa0', ' ')):
        t = t.replace(a, b)
    return re.sub(r'\s+', ' ', t).strip()

def slug(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'seccion'

def emf_a_png(src, dst):
    """EMF -> PDF (LibreOffice) -> PNG (pdftoppm) y recorte de márgenes."""
    soffice = shutil.which('soffice') or shutil.which('libreoffice')
    if not soffice or not shutil.which('pdftoppm'):
        return False
    with tempfile.TemporaryDirectory() as t:
        subprocess.run([soffice, '--headless', '--convert-to', 'pdf', '--outdir', t, src],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        pdf = os.path.join(t, os.path.splitext(os.path.basename(src))[0] + '.pdf')
        if not os.path.exists(pdf):
            return False
        base = os.path.join(t, 'p')
        subprocess.run(['pdftoppm', '-r', '130', '-png', '-f', '1', '-l', '1', '-singlefile', pdf, base], check=True)
        try:
            from PIL import Image, ImageChops
            im = Image.open(base + '.png').convert('RGB')
            caja = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).getbbox()
            if caja:
                m = 6
                im = im.crop((max(caja[0]-m, 0), max(caja[1]-m, 0), min(caja[2]+m, im.width), min(caja[3]+m, im.height)))
            im.save(dst, optimize=True)
        except ImportError:
            shutil.copy(base + '.png', dst)
    return True

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    docx = sys.argv[1]
    tmp = tempfile.mkdtemp()
    html = subprocess.run(['pandoc', docx, '-f', 'docx', '-t', 'html', '--wrap=none', '--extract-media', tmp],
                          check=True, capture_output=True, text=True, encoding='utf-8').stdout

    # --- recorte: desde el H1 INICIO hasta el H1 FIN ---
    h1 = [(m.start(), texto(m.group(0))) for m in re.finditer(r'<h1\b.*?</h1>', html, flags=re.S)]
    ini = next(p for p, t in h1 if t == INICIO)
    fin = next(p for p, t in h1 if t == FIN and p > ini)
    html = html[ini:fin]

    # --- limpieza ---
    # párrafos en negrita marcados como entrada de índice -> título de apartado
    html = re.sub(r'<p><span id="_Toc[^"]*" class="anchor"></span><strong>(.*?)</strong></p>', r'<h2>\1</h2>', html, flags=re.S)
    html = re.sub(r'<span id="[^"]*" class="anchor"></span>', '', html)
    html = re.sub(r'</?blockquote>', '', html)
    html = re.sub(r'<(p|li|h[3-6])\b[^>]*>(?:\s|<br\s*/?>|</?(?:strong|em|u|span)[^>]*>)*</\1>', '', html)
    html = re.sub(r'<ul>\s*</ul>', '', html)
    html = re.sub(r'<p>\s*-\s*', '<p class="gi">– ', html.replace('<p>\\-', '<p>-'))
    html = re.sub(r'<table\b[^>]*>', '<div class="tw"><table>', html).replace('</table>', '</table></div>')
    html = re.sub(r'<colgroup>.*?</colgroup>', '', html, flags=re.S)
    html = re.sub(r' (?:class|style)="(?:header|odd|even|[^"]*width[^"]*)"', '', html)

    # --- imágenes ---
    if os.path.isdir(IMG_DIR):
        shutil.rmtree(IMG_DIR)
    os.makedirs(IMG_DIR)
    def img(m):
        src = re.search(r'src="([^"]+)"', m.group(0)).group(1)
        nombre, ext = os.path.splitext(os.path.basename(src))
        if ext.lower() in ('.emf', '.wmf'):
            dst = nombre + '.png'
            try:
                ok = emf_a_png(src, os.path.join(IMG_DIR, dst))
            except Exception as e:
                ok = False; print('  error con', nombre, e, file=sys.stderr)
            if not ok:
                print('AVISO: no se pudo convertir', os.path.basename(src), '(falta LibreOffice/pdftoppm); se omite.', file=sys.stderr)
                return ''
        else:
            dst = nombre + ext.lower()
            shutil.copy(src, os.path.join(IMG_DIR, dst))
        return '<img src="guia/img/%s" alt="Tabla" loading="lazy">' % dst
    html = re.sub(r'<img\b[^>]*>', img, html)
    html = re.sub(r'<p>\s*</p>', '', html)

    # --- troceado: grupos (H1) y apartados (H2) ---
    grupos, usados = [], set()
    def uid(s):
        b = slug(s); u = b; n = 2
        while u in usados:
            u = '%s-%d' % (b, n); n += 1
        usados.add(u); return u
    for parte in re.split(r'(?=<h1\b)', html):
        m = re.match(r'<h1\b[^>]*>(.*?)</h1>', parte, flags=re.S)
        if not m or not texto(m.group(1)):
            if grupos and parte.strip():   # H1 vacío: su contenido sigue en el grupo anterior
                grupos[-1]['_resto'] += re.sub(r'^<h1\b[^>]*>.*?</h1>', '', parte, flags=re.S)
            continue
        t = texto(m.group(1))
        grupos.append({'id': uid(t), 't': NOMBRES.get(t, t), '_resto': parte[m.end():]})
    for g in grupos:
        trozos = re.split(r'(<h2\b[^>]*>.*?</h2>)', g.pop('_resto'), flags=re.S)
        g['intro'] = trozos[0].strip(); g['items'] = []
        for k in range(1, len(trozos), 2):
            t = texto(trozos[k]); cuerpo = trozos[k+1].strip()
            if not t:                       # título vacío: se une al apartado anterior
                if g['items']: g['items'][-1]['html'] += '\n' + cuerpo
                else: g['intro'] += '\n' + cuerpo
                continue
            g['items'].append({'id': uid(t), 't': t, 'html': cuerpo})
    with open(os.path.join(AQUI, 'guia.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.GUIA=' + json.dumps({'fuente': os.path.basename(docx), 'grupos': grupos}, ensure_ascii=False) + ';\n')
    shutil.rmtree(tmp, ignore_errors=True)
    for g in grupos:
        print('%s: %d apartados' % (g['t'], len(g['items'])), file=sys.stderr)
        for i in g['items']:
            print('   - %s (%d car.)' % (i['t'], len(i['html'])), file=sys.stderr)

if __name__ == '__main__':
    main()
